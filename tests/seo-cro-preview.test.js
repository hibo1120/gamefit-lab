const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

test("SEO/CRO preview builder is isolated and fail-closed", () => {
  const script = fs.readFileSync(path.join(projectRoot, "scripts", "build-seo-cro-preview.js"), "utf8");

  assert.match(script, /\.seo-cro-preview-dist/);
  assert.match(script, /Live landing no longer matches/);
  assert.match(script, /EXPECTED_LIVE_LANDING_SHA256/);
  assert.match(script, /EXPECTED_THEME_SHA256/);
  assert.match(script, /GameFit SEO\/CRO Preview/);
  assert.match(script, /noindex,nofollow,noarchive/);
  assert.match(script, /Disallow: \//);
  assert.match(script, /gamefit_seo_cro_preview_events/);
  assert.match(script, /GameFitAnalytics\.beforeSend/);
  assert.match(script, /\["guides", "en", "data", "updates"\]/);
  assert.match(script, /deviceUpdatesSection/);
  assert.match(script, /最新Gear Updates/);
  assert.match(script, /preview-manifest\.json/);
  assert.match(script, /content_source/);
  assert.match(script, /builder_checkout/);
  assert.match(script, /script_sha256/);
  assert.match(script, /Japanese document language/);
  assert.match(script, /404\.html/);
  assert.match(script, /ページが見つかりません/);
  assert.match(script, /settings-notebook/);
  assert.match(script, /removeExactlyOnce/);
  assert.doesNotMatch(script, /["']preview-dist["']/);
  assert.doesNotMatch(script, /personal-gear/);
});
