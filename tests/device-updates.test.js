const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const updates = require("../data/device-updates.json");
const { validateUpdates } = require("../scripts/generate-device-updates.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("Device Radar data validates and generated files are current", () => {
  assert.equal(validateUpdates(clone(updates)).length, 1);
  const result = spawnSync(process.execPath, ["scripts/generate-device-updates.js", "--check"], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("schema rejects missing sources or facts, duplicate slugs, and invalid states", () => {
  const cases = [
    update => { update[0].official_url = ""; },
    update => { update[0].official_facts = []; },
    update => { update.push(clone(update[0])); update[1].id = "another-id"; },
    update => { update[0].decision_state = "BUY_NOW"; },
    update => { update[0].evidence_state = "reviewed"; }
  ];

  for (const mutate of cases) {
    const candidate = clone(updates);
    mutate(candidate);
    assert.throws(() => validateUpdates(candidate), /Device update validation failed/);
  }
});

test("independent evidence labels require matching independent sources", () => {
  const oneSourceMissing = clone(updates);
  oneSourceMissing[0].evidence_state = "independent_test_available";
  assert.throws(() => validateUpdates(oneSourceMissing), /requires an independent source/);

  const manufacturerAsIndependent = clone(updates);
  manufacturerAsIndependent[0].evidence_state = "independent_test_available";
  manufacturerAsIndependent[0].independent_sources = [{ label: "Not independent", url: "https://www.razer.com/review" }];
  assert.throws(() => validateUpdates(manufacturerAsIndependent), /must not use a manufacturer host/);

  const duplicateIndependentHost = clone(updates);
  duplicateIndependentHost[0].evidence_state = "multiple_independent_sources";
  duplicateIndependentHost[0].independent_sources = [
    { label: "Independent test A", url: "https://example.test/test-a" },
    { label: "Independent test B", url: "https://example.test/test-b" }
  ];
  assert.throws(() => validateUpdates(duplicateIndependentHost), /requires multiple independent source hosts/);
});

test("Update index and detail pages have unique SEO metadata and no copied image dependency", () => {
  const pages = ["updates/index.html", ...updates.map(update => `updates/${update.slug}.html`)];
  const titles = new Set();
  const descriptions = new Set();

  for (const file of pages) {
    const html = read(file);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    assert.match(html, /<html lang="ja">/i, file);
    assert.ok(title, `${file}: title missing`);
    assert.ok(description, `${file}: description missing`);
    assert.equal(titles.has(title), false, `${file}: duplicate title`);
    assert.equal(descriptions.has(description), false, `${file}: duplicate description`);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, /<link rel="canonical" href="https:\/\/hibo1120\.github\.io\/gamefit-lab\/updates\//i, file);
    for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
      assert.match(html, new RegExp(`<meta property="${property}"`), `${file}: ${property} missing`);
    }
    assert.match(html, /<meta name="twitter:card" content="summary">/i, file);
    assert.doesNotMatch(html, /<img\b|background-image\s*:|url\(\s*["']?https?:/i, `${file}: external image dependency`);
    assert.doesNotMatch(html, /amazon|rakuten|affiliate_clicked/i, `${file}: affiliate destination or tracking found`);
  }
});

test("detail pages disclose evidence limits, one diagnosis CTA, and official-only sources", () => {
  for (const update of updates) {
    const html = read(`updates/${update.slug}.html`);
    assert.match(html, /何が変わった？/);
    assert.match(html, /誰に関係する？/);
    assert.match(html, /今すぐ買い替える必要は？/);
    assert.match(html, /GameFit判断/);
    assert.match(html, /プロ選手の採用例も、性能証明や個人への適合証明として扱っていません/);
    assert.equal((html.match(/class="diagnosis-cta"/g) || []).length, update.diagnosis_cta ? 1 : 0);
    assert.match(html, /data-content-type="device_update"/);
    assert.match(html, /utm_campaign=device_radar_v0_1/);

    const externalUrls = [...html.matchAll(/href="(https:[^"]+)"/gi)].map(match => new URL(match[1]));
    assert.ok(externalUrls.length >= 1);
    for (const url of externalUrls) assert.ok(["www.razer.com", "hibo1120.github.io"].includes(url.hostname), `unexpected source ${url.hostname}`);
  }
});

test("landing and sitemap expose no more than three data-backed Update routes", () => {
  const landing = read("index.md");
  const sitemap = read("sitemap.xml");
  const block = landing.match(/<!-- DEVICE_UPDATES_START -->([\s\S]*?)<!-- DEVICE_UPDATES_END -->/)?.[1] || "";
  assert.ok(updates.length <= 3);
  assert.equal((block.match(/^### \[/gm) || []).length, updates.length);
  assert.match(block, /新しい＝買い替えるべき、ではありません/);

  for (const update of updates) {
    assert.match(block, new RegExp(`\\.\\/updates\\/${update.slug}\\.html`));
    assert.match(sitemap, new RegExp(`https://hibo1120\\.github\\.io/gamefit-lab/updates/${update.slug}\\.html`));
  }
  assert.match(sitemap, /https:\/\/hibo1120\.github\.io\/gamefit-lab\/updates\/<\/loc>/);
});

test("Update routes and every local asset resolve to files while a missing route stays absent", () => {
  const files = ["updates/index.html", ...updates.map(update => `updates/${update.slug}.html`)];
  for (const file of files) {
    const absolute = path.join(projectRoot, file);
    assert.equal(fs.existsSync(absolute), true, file);
    const html = read(file);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
      const value = match[1].replaceAll("&amp;", "&");
      if (value.startsWith("data:") || value.startsWith("#") || /^https?:/i.test(value)) continue;
      const pathname = value.split("?", 1)[0];
      const resolved = path.resolve(path.dirname(absolute), pathname);
      const localPath = pathname.endsWith("/")
        ? (resolved === projectRoot ? path.join(projectRoot, "index.md") : path.join(resolved, "index.html"))
        : resolved;
      assert.equal(fs.existsSync(localPath), true, `${file}: ${value}`);
    }
  }
  assert.equal(fs.existsSync(path.join(projectRoot, "updates", "not-found.html")), false);
});
