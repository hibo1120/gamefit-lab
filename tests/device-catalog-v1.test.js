const assert = require("node:assert/strict");
const test = require("node:test");

const registry = require("../data/catalog-source-registry-v1.js");
const catalog = require("../data/device-catalog-v1.js");
const fixtures = require("../data/personal-gear-fixtures.js");
const adapter = require("../data/catalog-ui-adapter-v1.js");
const ledger = require("../data/catalog-research-ledger-v1.js");

test("source registry and catalog validate with explicit provenance", () => {
  assert.deepEqual(registry.validateRegistry(), []);
  assert.deepEqual(catalog.validateCatalog(), []);
  assert.deepEqual(ledger.validateLedger(), []);
  assert.equal(registry.sources.length, 50);
  assert.equal(catalog.products.length, 69);
  assert.equal(catalog.claims.length, 114);
  for (const claim of catalog.claims) assert.ok(registry.find(claim.source_id), claim.claim_id);
});

test("expansion is independent of the 48-product fixture and spans broad categories", () => {
  const summary = catalog.summarize();
  assert.equal(fixtures.products.length, 48);
  assert.equal(summary.identity_verified, 69);
  assert.equal(summary.base_models, 66);
  assert.equal(summary.variants, 3);
  assert.equal(summary.aliases, 158);
  assert.equal(Object.keys(summary.category_counts).length, 13);
  for (const category of ["cpu","gpu","storage","monitor","mouse","keyboard","mousepad","audio","controller","mic","network","power","capture_card"]) {
    assert.ok(summary.category_counts[category] > 0, category);
  }
  assert.ok(Object.keys(summary.manufacturer_counts).length >= 15);
});

test("identity, specifications, comparison scope, and recommendation state remain separate", () => {
  assert.ok(catalog.products.every(item => item.identity_verified === true));
  assert.ok(catalog.products.some(item => item.specs_verified_fields.length === 0));
  assert.ok(catalog.products.some(item => item.specs_verified_fields.length > 0));
  assert.ok(catalog.products.some(item => item.comparison_ready_scopes.length === 0));
  assert.equal(catalog.products.some(item => item.recommendation_eligible), false);
  assert.equal(catalog.products.some(item => item.public_ui_connected), false);
  assert.equal(catalog.summarize().recommendation_eligible, 0);
  assert.equal(catalog.summarize().live_deployed, 0);
});

test("Basilisk identities and aliases search without substituting the 35K model", () => {
  const original = catalog.find("mouse-razer-basilisk-v3-pro");
  const model35k = catalog.find("mouse-razer-basilisk-v3-pro-35k");
  assert.equal(original.manufacturer_model_id, "RZ01-04620");
  assert.equal(model35k.manufacturer_model_id, "RZ01-0524");
  assert.notEqual(original.product_id, model35k.product_id);
  assert.deepEqual(catalog.search("RZ01-04620").map(item => item.product_id), [original.product_id]);
  assert.deepEqual(catalog.search("RZ01-0524").map(item => item.product_id), [model35k.product_id]);
  assert.ok(catalog.search("Basilisk",{ category:"mouse" }).length >= 5);
  assert.ok(catalog.search("バジリスク",{ category:"mouse" }).length >= 5);
});

test("catalog import is idempotent and unsafe display input fails validation", () => {
  assert.equal(catalog.importProducts(catalog.products,catalog.products).length, catalog.products.length);
  const unsafe = { ...catalog.products[0], product_name:"<img src=x>" };
  assert.ok(catalog.validateProduct(unsafe).includes("display text is unsafe"));
  const invalidId = { ...catalog.products[0], product_id:"__proto__" };
  assert.ok(catalog.validateProduct(invalidId).some(error => error.includes("product_id")));
});

test("local selection adapter exposes real products without granting recommendation eligibility", () => {
  assert.equal(adapter.fixtureProducts.length, 48);
  assert.equal(adapter.realProducts.length, 62);
  assert.equal(adapter.products.length, 110);
  assert.ok(catalog.products.every(item => adapter.find(item.product_id)),"all 69 catalog identities are selectable, including seven fixture-backed identities");
  assert.ok(adapter.optionsForCategory("mouse","Basilisk").length >= 5);
  assert.deepEqual(adapter.optionsForCategory("mouse","RZ01-04620").map(item => item.product_id), ["mouse-razer-basilisk-v3-pro"]);
  assert.equal(adapter.isRecommendationProfiled("mouse-razer-basilisk-v3-pro"), false);
  assert.equal(adapter.isRecommendationProfiled(fixtures.byCategory.mouse[0].product_id), true);
  assert.match(adapter.statusText("mouse-razer-basilisk-v3-pro"), /推薦条件は未確認/);
});

test("owner-reported gear mapping keeps exact, ambiguous, and unresolved states distinct", () => {
  const exact = ledger.owner_gear_mapping.find(item => item.reported_key === "reported_mouse_razer_basilisk_v3_pro");
  const xbox = ledger.owner_gear_mapping.find(item => item.reported_key === "reported_controller_xbox_official_unspecified");
  assert.equal(exact.status, "exact_match");
  assert.equal(exact.product_id, "mouse-razer-basilisk-v3-pro");
  assert.deepEqual(exact.excluded_product_ids,["mouse-razer-basilisk-v3-pro-35k"]);
  assert.equal(xbox.status, "family_ambiguous");
  assert.equal(xbox.candidate_product_ids.length, 3);
  assert.ok(ledger.owner_gear_mapping.filter(item => item.status === "unresolved").length >= 2);
  assert.ok(ledger.hold.every(item => item.status === "HOLD"));
});
