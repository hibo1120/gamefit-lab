const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

test("production landing declares Japanese without preview-only controls", () => {
  const landing = fs.readFileSync(path.join(projectRoot, "index.md"), "utf8");

  assert.match(landing, /^---\r?\nlang: ja\r?\n---\r?\n/);
  assert.match(landing, /最新Gear Updates/);
  assert.match(landing, /Gear Updates・診断の閲覧/);
  assert.doesNotMatch(landing, /noindex|nofollow|GameFit SEO\/CRO Preview|gamefit_seo_cro_preview_events/);
});

test("production files keep indexing and real analytics boundaries", () => {
  const robots = fs.readFileSync(path.join(projectRoot, "robots.txt"), "utf8");
  const posthog = fs.readFileSync(path.join(projectRoot, "posthog-init.js"), "utf8");

  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
  assert.match(posthog, /productionOrigin/);
  assert.match(posthog, /qaMode/);
  assert.match(posthog, /autocapture: false/);
  assert.match(posthog, /disable_session_recording: true/);
  assert.doesNotMatch(posthog, /gamefit_seo_cro_preview_events/);
});
