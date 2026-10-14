const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

test("SEO/CRO preview builder is isolated and fail-closed", () => {
  const script = fs.readFileSync(path.join(projectRoot, "scripts", "build-seo-cro-preview.js"), "utf8");

  assert.match(script, /\.seo-cro-preview-dist/);
  assert.match(script, /Live landing no longer matches/);
  assert.match(script, /GameFit SEO\/CRO Preview/);
  assert.match(script, /noindex,nofollow,noarchive/);
  assert.match(script, /Disallow: \//);
  assert.match(script, /gamefit_seo_cro_preview_events/);
  assert.match(script, /GameFitAnalytics\.beforeSend/);
  assert.match(script, /\["guides", "en", "data"\]/);
  assert.doesNotMatch(script, /["']preview-dist["']/);
  assert.doesNotMatch(script, /personal-gear/);
});
