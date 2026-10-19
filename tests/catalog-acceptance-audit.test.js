const assert = require("node:assert/strict");
const test = require("node:test");

const audit = require("../scripts/audit-catalog-acceptance.js");

test("fixture lineage keeps old fixture, catalog increment, overlap, and UI distinct", () => {
  const lineage = audit.fixtureLineage();
  assert.equal(lineage.checked_date,"2026-10-09");
  assert.equal(lineage.fixture_products,48);
  assert.equal(lineage.fixture_only_flagged,48);
  assert.equal(lineage.fixture_evidence_rows,144);
  assert.equal(lineage.catalog_products,69);
  assert.equal(lineage.raw_distinct_product_ids,110);
  assert.equal(lineage.overlap_products,7);
  assert.equal(lineage.pure_catalog_increment,62);
  assert.equal(lineage.fixture_only_not_in_catalog,41);
  assert.equal(lineage.explicit_canonical_identity_mappings,1);
  assert.equal(lineage.legacy_id_aliases,1);
  assert.equal(lineage.canonical_catalog_increment,61);
  assert.equal(lineage.fixture_only_not_in_canonical_catalog,40);
  assert.equal(lineage.catalog_base_models,66);
  assert.equal(lineage.catalog_variants,3);
  assert.equal(lineage.combined_canonical_identities,109);
  assert.equal(lineage.local_ui_distinct_products,109);
  assert.equal(lineage.overlap_ids.length,7);
});

test("identity audit isolates the approved duplicate and preserves named counterexamples", () => {
  const identity = audit.identityAudit();
  assert.equal(identity.explicit_mappings.length,1);
  const headset = identity.same_name_distinct_id_candidates.find(item => item.product_ids.includes("audio-logitech-pro-x2"));
  assert.deepEqual(headset.product_ids,["audio-logitech-pro-x-2-lightspeed","audio-logitech-pro-x2"]);
  assert.deepEqual(headset.shared_resource_urls,["https://www.logitechg.com/en-us/shop/p/pro-x-2-wireless-headset"]);
  assert.ok(identity.protected_distinct_counterexamples.some(ids => ids.includes("mouse-razer-basilisk-v3-pro-35k")));
  assert.ok(identity.protected_distinct_counterexamples.some(ids => ids.includes("keyboard-wooting-80he")));
});

test("comparison audit separates stored claims, comparable peers, UI, engine, and recommendation", () => {
  const report = audit.buildReport();
  assert.equal(report.comparison_summary.products_with_declared_scopes,31);
  assert.equal(report.comparison_summary.declared_scopes,106);
  assert.equal(report.comparison_summary.a_claim_backed_scopes,106);
  assert.equal(report.comparison_summary.b_scopes_with_comparable_peer,66);
  assert.equal(report.comparison_summary.c_locally_visible_scopes,106);
  assert.equal(report.comparison_summary.d_existing_engine_fixture_overlap,5);
  assert.equal(report.comparison_summary.e_personal_recommendation_eligible,0);
  assert.ok(report.comparison_products.every(item => item.scopes.every(scope => scope.a_claim_backed && scope.c_local_ui_visible)));
  assert.ok(report.comparison_products.some(item => item.scopes.some(scope => scope.b_same_unit_condition_peer_ids.length === 0)));
  assert.ok(report.comparison_products.some(item => item.scopes.some(scope => scope.b_same_unit_condition_peer_ids.length > 0)));
});
