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
  assert.equal(registry.sources.length, 53);
  assert.equal(catalog.products.length, 69);
  assert.equal(catalog.claims.length, 113);
  assert.equal(catalog.claimHolds.length, 2);
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
  for (const item of catalog.products) assert.deepEqual(catalog.validateComparisonScopes(item),[],item.product_id);
  assert.equal(catalog.find("capture-elgato-4k-x").comparison_ready_scopes.includes("capture_resolution"),false);
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
  assert.equal(adapter.selectionProductId(original.product_id),original.product_id);
  assert.equal(adapter.selectionProductId(model35k.product_id),model35k.product_id);
});

test("explicit canonical identity resolves the Logitech headset without fuzzy-merging variants", () => {
  assert.deepEqual(adapter.validateCanonicalIdentities(),[]);
  assert.equal(adapter.canonicalIdentities.length,1);
  const legacyId = "audio-logitech-pro-x2";
  const canonicalId = "audio-logitech-pro-x-2-lightspeed";
  assert.equal(adapter.canonicalProductId(legacyId),canonicalId);
  assert.equal(adapter.selectionProductId(canonicalId),legacyId);
  assert.strictEqual(adapter.find(legacyId),adapter.find(canonicalId));
  assert.equal(adapter.isRecommendationProfiled(legacyId),true);
  assert.equal(adapter.isRecommendationProfiled(canonicalId),true);
  assert.equal(adapter.optionsForCategory("audio","PRO X 2 LIGHTSPEED").length,1);
  const details = adapter.detailsFor(canonicalId);
  assert.equal(details.product_id,legacyId);
  assert.equal(details.canonical_product_id,canonicalId);
  assert.deepEqual(details.legacy_product_ids,[legacyId]);
  assert.equal(details.fixture_recommendation_profiled,true);
  assert.equal(details.recommendation_eligible,false);
  assert.ok(details.claims.some(item => item.field === "driver_size"));

  assert.notStrictEqual(adapter.find("mouse-razer-basilisk-v3-pro"),adapter.find("mouse-razer-basilisk-v3-pro-35k"));
  assert.deepEqual(adapter.optionsForCategory("keyboard","Wooting 80HE").map(item => item.product_id).sort(),["keyboard-wooting-80he","keyboard-wooting-80he-plus"]);
  assert.deepEqual(adapter.optionsForCategory("audio","PRO X").map(item => item.product_id).filter(id => id.includes("pro-x")).sort(),[
    "audio-logitech-pro-x-se","audio-logitech-pro-x-wired","audio-logitech-pro-x-wireless","audio-logitech-pro-x2"
  ]);
});

test("numeric DPI claims reject product-name arithmetic and keep conflicted G502 fields on HOLD", () => {
  const inferred = {
    ...catalog.claims.find(item => item.product_id === "mouse-razer-basilisk-v3-pro" && item.field === "sensor_dpi"),
    claim_id:"negative-g502-name-inference", product_id:"mouse-logitech-g502-x-plus", field:"max_dpi", value:25000,
    source_id:"logitech_g502_x_plus", source_locator:"Description: HERO 25K Optical Sensor"
  };
  assert.ok(catalog.validateClaim(inferred).includes("numeric DPI must not be derived from a product or sensor name"));
  assert.deepEqual(catalog.validateClaim(catalog.claims.find(item => item.product_id === "mouse-razer-basilisk-v3-pro-35k" && item.field === "sensor_dpi")),[]);
  const g502 = catalog.find("mouse-logitech-g502-x-plus");
  assert.deepEqual(g502.specs_verified_fields,["connection_modes"]);
  assert.deepEqual(g502.comparison_ready_scopes,["connection_modes"]);
  assert.equal(catalog.claimsFor(g502.product_id).some(item => ["sensor_dpi","max_dpi","sensor_name"].includes(item.field)),false);
  assert.deepEqual(catalog.holdsFor(g502.product_id).map(item => item.field).sort(),["max_dpi","sensor_name"]);
  assert.ok(catalog.holdsFor(g502.product_id).every(item => item.conditions.retail_sku === "910-006160" && item.conditions.firmware_applicability === "not stated"));
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
  assert.equal(adapter.realProducts.length, 61);
  assert.equal(adapter.products.length, 109);
  assert.ok(catalog.products.every(item => adapter.find(item.product_id)),"all 69 catalog identities are selectable, including seven fixture-backed identities");
  assert.ok(adapter.optionsForCategory("mouse","Basilisk").length >= 5);
  assert.deepEqual(adapter.optionsForCategory("mouse","RZ01-04620").map(item => item.product_id), ["mouse-razer-basilisk-v3-pro"]);
  assert.equal(adapter.isRecommendationProfiled("mouse-razer-basilisk-v3-pro"), false);
  assert.equal(adapter.isRecommendationProfiled(fixtures.byCategory.mouse[0].product_id), true);
  assert.match(adapter.statusText("mouse-razer-basilisk-v3-pro"), /推薦条件は未確認/);
  const fixtureOnly = adapter.find("mouse-razer-viper-v4-pro");
  assert.equal(fixtureOnly.identity_verified,false);
  assert.deepEqual(fixtureOnly.specs_verified_fields,[]);
  assert.deepEqual(fixtureOnly.comparison_ready_scopes,[]);
  assert.equal(fixtureOnly.recommendation_eligible,false);
  assert.equal(fixtureOnly.fixture_recommendation_profiled,true);
  assert.match(adapter.statusText(fixtureOnly.product_id),/公式確認済み69件には含めません/);
  const details = adapter.detailsFor("mouse-razer-basilisk-v3-pro");
  assert.equal(details.catalog_identity_verified,true);
  assert.ok(details.claims.some(item => item.field === "sensor_dpi"));
  assert.ok(details.comparison_ready_scopes.includes("sensor_dpi"));
  assert.deepEqual(details.claim_holds,[]);
  assert.equal(details.recommendation_eligible,false);
  const g502Details = adapter.detailsFor("mouse-logitech-g502-x-plus");
  assert.deepEqual(adapter.optionsForCategory("mouse","910-006160").map(item => item.product_id),["mouse-logitech-g502-x-plus"]);
  assert.equal(g502Details.claims.some(item => item.field === "sensor_dpi"),false);
  assert.deepEqual(g502Details.comparison_ready_scopes,["connection_modes"]);
  assert.deepEqual(g502Details.claim_holds.map(item => item.field).sort(),["max_dpi","sensor_name"]);
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
