const assert = require("node:assert/strict");
const test = require("node:test");

const games = require("../data/games.js");
const merchants = require("../data/merchants.js");
const products = require("../data/products.js");

test("the four initial games load with official and GameFit fields separated", () => {
  assert.deepEqual(games.list().map(game => game.id), ["valorant", "apex", "fortnite", "mhwilds"]);
  for (const game of games.list()) {
    for (const field of [
      "id", "display_name", "official_requirement_source", "official_minimum",
      "official_recommended", "game_type", "performance_characteristics",
      "ram_requirement", "storage_requirement", "competitive_high_fps", "notes"
    ]) {
      assert.notEqual(game[field], undefined, `${game.id}: ${field}`);
    }
    assert.match(game.official_requirement_source, /^https:\/\//);
    assert.equal(typeof game.storage_requirement.gamefit_policy, "string");
  }
});

test("all unapproved merchants are disabled and have no affiliate URL", () => {
  assert.deepEqual(merchants.merchants.map(item => item.merchant_id), [
    "mouse_computer", "razer", "amazon", "rakuten",
    "razer_us", "lenovo_us", "newegg_us", "amazon_us"
  ]);
  for (const merchant of merchants.merchants) {
    assert.equal(merchant.enabled, false, merchant.merchant_id);
    assert.equal(merchant.affiliate_url, "", merchant.merchant_id);
    assert.equal(merchants.isRenderable(merchant), false, merchant.merchant_id);
    assert.ok(["JP", "US"].includes(merchant.region), merchant.merchant_id);
    assert.ok(["JPY", "USD"].includes(merchant.currency), merchant.merchant_id);
  }
});

test("future product schema validates category and safe publication state", () => {
  assert.ok(products.PRODUCT_SCHEMA.required.includes("merchant_id"));
  assert.ok(products.PRODUCT_SCHEMA.required.includes("region"));
  assert.ok(products.PRODUCT_SCHEMA.required.includes("currency"));
  assert.deepEqual(products.products, []);
  assert.deepEqual(products.validateProduct({
    product_id: "sample-monitor",
    product_name: "Sample Monitor",
    category: "monitor",
    merchant_id: "sample",
    region: "US",
    currency: "USD",
    enabled: false,
    destination_url: ""
  }), []);
  assert.deepEqual(products.validateProduct({
    product_id: "sample",
    product_name: "Sample",
    category: "invalid",
    merchant_id: "sample",
    region: "JP",
    currency: "JPY",
    enabled: true,
    destination_url: ""
  }), ["category is invalid", "enabled products require an https destination_url"]);
});
