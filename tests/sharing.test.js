const assert = require("node:assert/strict");
const test = require("node:test");

const sharingModule = require("../sharing.js");

test("X share uses the official web intent with a category-specific message and tracked URL", () => {
  const shareUrl = new URL(sharingModule.buildXShareUrl({
    topRecommendation: "monitor",
    hardware: "SECRET RTX FREE TEXT",
    ranked: [{ key: "monitor" }]
  }));

  assert.equal(shareUrl.origin, "https://x.com");
  assert.equal(shareUrl.pathname, "/intent/post");
  assert.match(shareUrl.searchParams.get("text"), /PCの買い替えよりモニター優先/);
  assert.equal(shareUrl.searchParams.get("text").includes("SECRET"), false);

  const diagnosisUrl = new URL(shareUrl.searchParams.get("url"));
  assert.equal(diagnosisUrl.origin, "https://hibo1120.github.io");
  assert.equal(diagnosisUrl.pathname, "/gamefit-lab/diagnose.html");
  assert.equal(diagnosisUrl.searchParams.get("utm_source"), "x");
  assert.equal(diagnosisUrl.searchParams.get("utm_medium"), "social");
  assert.equal(diagnosisUrl.searchParams.get("utm_campaign"), "gamefit_growth_v1");
  assert.equal(diagnosisUrl.searchParams.get("utm_content"), "result_share");
});

test("all recommendation categories produce a safe share sentence without free input", () => {
  for (const category of Object.keys(sharingModule.RESULT_PHRASES)) {
    const text = sharingModule.buildShareText({
      topRecommendation: category,
      game: { id: "valorant" },
      hardware: "Ryzen SECRET / GeForce SECRET",
      customer_name: "PRIVATE"
    });
    assert.match(text, /GameFit診断では/);
    assert.equal(text.includes("SECRET"), false);
    assert.equal(text.includes("PRIVATE"), false);
  }
});

test("copy link writes a canonical diagnosis URL with referral UTM", async () => {
  const writes = [];
  const sharing = sharingModule.createSharing({
    navigator: { clipboard: { writeText(value) { writes.push(value); return Promise.resolve(); } } }
  });

  const copied = await sharing.copyDiagnosisUrl();
  assert.deepEqual(writes, [copied]);
  const url = new URL(copied);
  assert.equal(url.searchParams.get("utm_source"), "direct_share");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "gamefit_growth_v1");
  assert.equal(url.searchParams.get("utm_content"), "result_copy");
});
