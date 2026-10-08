const assert = require("node:assert/strict");
const test = require("node:test");

const affiliate = require("../affiliate.js");
const merchants = require("../data/merchants.js");
const engine = require("../diagnosis-engine.js");

const diagnosis = engine.diagnoseInputs({
  game: "valorant", currentFps: "240", targetFps: "240", monitorHz: "60",
  ram: "16", storage: "nvme", budget: "50000", device: "desktop", stream: "no"
});

test("disabled merchants produce no Affiliate CTA", () => {
  assert.deepEqual(affiliate.modelsForResult(diagnosis), []);
});

test("enabled merchant with an https URL produces the correct link model", () => {
  const enabled = {
    merchant_id: "approved_test_store",
    merchant_name: "Approved Test Store",
    enabled: true,
    affiliate_url: "https://example.test/monitor?affiliate=test",
    categories: ["monitor"],
    destination_type: "product_page",
    disclosure_label: "広告・テスト",
    priority: 10,
    notes: "test only"
  };
  const [model] = affiliate.modelsForResult(diagnosis, { sourcePage: "diagnose" }, [enabled]);
  assert.equal(model.href, enabled.affiliate_url);
  assert.equal(model.rel, "sponsored nofollow noopener");
  assert.deepEqual(model.tracking, {
    merchant: "approved_test_store",
    category: "monitor",
    destinationType: "product_page",
    game: "valorant",
    topRecommendation: "monitor",
    sourcePage: "diagnose",
    budgetBand: "50000"
  });
});

test("missing URL, non-https URL, disabled state, and category mismatch stay hidden", () => {
  const base = {
    merchant_id: "test", merchant_name: "Test", enabled: true,
    affiliate_url: "https://example.test/", categories: ["monitor"],
    destination_type: "product_page", disclosure_label: "広告", priority: 1, notes: ""
  };
  assert.equal(affiliate.buildLinkModel({ ...base, enabled: false }, "monitor"), null);
  assert.equal(affiliate.buildLinkModel({ ...base, affiliate_url: "" }, "monitor"), null);
  assert.equal(affiliate.buildLinkModel({ ...base, affiliate_url: "http://example.test" }, "monitor"), null);
  assert.equal(affiliate.buildLinkModel(base, "ram"), null);
  assert.equal(merchants.isRenderable(base), true);
});

test("regional catalog never crosses JP and US merchant destinations", () => {
  const catalog = [
    {
      merchant_id: "jp_store", merchant_name: "JP", region: "JP", currency: "JPY", enabled: true,
      affiliate_url: "https://jp.example.test/", categories: ["monitor"], destination_type: "product_page",
      disclosure_label: "広告", priority: 10, notes: ""
    },
    {
      merchant_id: "us_store", merchant_name: "US", region: "US", currency: "USD", enabled: true,
      affiliate_url: "https://us.example.test/", categories: ["monitor"], destination_type: "product_page",
      disclosure_label: "Affiliate link", priority: 10, notes: ""
    }
  ];
  assert.equal(affiliate.modelsForResult(diagnosis, { region: "JP" }, catalog)[0].tracking.merchant, "jp_store");
  assert.equal(affiliate.modelsForResult(diagnosis, { region: "US", language: "en" }, catalog)[0].tracking.merchant, "us_store");
  assert.match(affiliate.modelsForResult(diagnosis, { region: "US", language: "en" }, catalog)[0].label, /Browse options/);
});
