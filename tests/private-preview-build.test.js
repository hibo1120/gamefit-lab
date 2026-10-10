const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  STATIC_FILES,
  buildPreview
} = require("../scripts/build-private-preview.js");

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).replaceAll(path.sep, "/"));
  }
  return out.sort();
}

test("private preview build exposes only the explicit allowlist", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gamefit-preview-"));
  try {
    buildPreview(temp);
    const actual = walk(temp);
    const expected = [...new Set([
      ...STATIC_FILES,
      "private/personal-gear.html",
      "_headers",
      "_redirects",
      "robots.txt"
    ])].sort();
    assert.deepEqual(actual, expected);
    for (const forbidden of [
      "private/validation-console.html",
      "private/validation-console.js",
      "docs",
      "tests",
      "scripts",
      ".git",
      ".env"
    ]) {
      assert.equal(actual.some(file => file === forbidden || file.startsWith(forbidden + "/")), false, forbidden);
    }
    assert.equal(actual.includes("index.html"), false, "preview root must not become a public landing page");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("generated tester page omits facilitator UI and all local dependencies exist", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gamefit-preview-"));
  try {
    buildPreview(temp);
    const html = fs.readFileSync(path.join(temp, "private", "personal-gear.html"), "utf8");
    for (const forbidden of [
      'id="export-validation"',
      'id="delete-validation"',
      'id="validation-report-status"',
      'id="schema-version"',
      'class="method-note operator-only"',
      "運営者向けの注意"
    ]) assert.equal(html.includes(forbidden), false, forbidden);

    assert.match(html, /id="export-session"/);
    assert.match(html, /noindex,nofollow,noarchive/);

    const refs = [
      ...html.matchAll(/<script\s+src="([^"]+)"/g),
      ...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)
    ].map(match => match[1]);

    for (const ref of refs) {
      assert.equal(ref.startsWith("."), true, ref);
      const resolved = path.resolve(path.join(temp, "private"), ref);
      assert.equal(resolved.startsWith(path.resolve(temp) + path.sep), true, ref);
      assert.equal(fs.existsSync(resolved), true, ref);
    }

    const headers = fs.readFileSync(path.join(temp, "_headers"), "utf8");
    assert.match(headers, /^\/\*/m);
    assert.match(headers, /X-Robots-Tag: noindex, nofollow, noarchive/);
    assert.match(headers, /Cache-Control: no-store/);
    assert.match(headers, /connect-src 'none'/);
    assert.match(headers, /frame-ancestors 'none'/);

    const robots = fs.readFileSync(path.join(temp, "robots.txt"), "utf8");
    assert.match(robots, /Disallow: \/$/m);

    const redirects = fs.readFileSync(path.join(temp, "_redirects"), "utf8");
    assert.match(redirects, /\/private\/validation-console\.html \/404\.html 302/);
    assert.match(redirects, /\/private\/validation-console \/404\.html 302/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
