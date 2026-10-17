const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function parseSiteConfig(config) {
  const lang = config.match(/^lang:\s*([^\s#]+)\s*$/m)?.[1];
  const excludeBlock = config.match(/^exclude:\s*\r?\n((?:\s+-\s+[^\r\n]+\r?\n?)*)/m)?.[1] || "";
  const exclude = excludeBlock
    .split(/\r?\n/)
    .map((line) => line.match(/^\s+-\s+(.+?)\s*$/)?.[1])
    .filter(Boolean);

  return { lang, exclude };
}

function listHtmlFiles(root) {
  const files = [];
  const pending = [root];

  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      if (entry.isFile() && entry.name.endsWith(".html")) files.push(absolute);
    }
  }

  return files;
}

test("production landing declares Japanese without preview-only controls", () => {
  const landing = read("index.md");

  assert.match(landing, /^---\r?\nlang: ja\r?\n---\r?\n/);
  assert.match(landing, /最新Gear Updates/);
  assert.match(landing, /Gear Updates・診断の閲覧/);
  assert.doesNotMatch(landing, /noindex|nofollow|GameFit SEO\/CRO Preview|gamefit_seo_cro_preview_events/);
});

test("Primer 0.6.0 receives Japanese from the site configuration", () => {
  const config = parseSiteConfig(read("_config.yml"));

  // Primer 0.6.0's default layout reads site.lang, not page.lang:
  // <html lang="{{ site.lang | default: "en-US" }}">
  assert.equal(config.lang, "ja");
  assert.equal(config.lang || "en-US", "ja");
});

test("production excludes operational sources while retaining Jekyll defaults and site assets", () => {
  const config = parseSiteConfig(read("_config.yml"));
  const jekyll310Defaults = [
    "Gemfile",
    "Gemfile.lock",
    "node_modules",
    "vendor/bundle/",
    "vendor/cache/",
    "vendor/gems/",
    "vendor/ruby/",
  ];
  const operationalSources = ["README.md", "growth", "scripts", "tests"];
  const requiredSitePaths = [
    "data",
    "en",
    "guides",
    "updates",
    "robots.txt",
    "sitemap.xml",
    "analytics.js",
    "device-updates.js",
    "guide.css",
    "updates.css",
  ];

  for (const excluded of [...jekyll310Defaults, ...operationalSources]) {
    assert.ok(config.exclude.includes(excluded), `${excluded} must remain excluded`);
  }
  for (const required of requiredSitePaths) {
    assert.ok(!config.exclude.includes(required), `${required} must remain publishable`);
    assert.ok(fs.existsSync(path.join(projectRoot, required)), `${required} must exist`);
  }
});

test("English static pages keep explicit English language declarations", () => {
  const pages = listHtmlFiles(path.join(projectRoot, "en"));

  assert.ok(pages.length > 0);
  for (const page of pages) {
    assert.match(fs.readFileSync(page, "utf8"), /<html\s+lang="en"(?:\s|>)/i, path.relative(projectRoot, page));
  }
});

test("production files keep indexing and real analytics boundaries", () => {
  const robots = read("robots.txt");
  const posthog = read("posthog-init.js");

  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
  assert.match(posthog, /productionOrigin/);
  assert.match(posthog, /qaMode/);
  assert.match(posthog, /autocapture: false/);
  assert.match(posthog, /disable_session_recording: true/);
  assert.doesNotMatch(posthog, /gamefit_seo_cro_preview_events/);
});
