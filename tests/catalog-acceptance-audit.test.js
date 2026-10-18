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
  assert.equal(lineage.overlap_products,7);
  assert.equal(lineage.pure_catalog_increment,62);
  assert.equal(lineage.fixture_only_not_in_catalog,41);
  assert.equal(lineage.local_ui_distinct_products,110);
  assert.equal(lineage.overlap_ids.length,7);
});

test("comparison audit separates stored claims, comparable peers, UI, engine, and recommendation", () => {
  const report = audit.buildReport();
  assert.equal(report.comparison_summary.products_with_declared_scopes,31);
  assert.equal(report.comparison_summary.declared_scopes,107);
  assert.equal(report.comparison_summary.a_claim_backed_scopes,107);
  assert.equal(report.comparison_summary.b_scopes_with_comparable_peer,67);
  assert.equal(report.comparison_summary.c_locally_visible_scopes,107);
  assert.equal(report.comparison_summary.d_existing_engine_fixture_overlap,4);
  assert.equal(report.comparison_summary.e_personal_recommendation_eligible,0);
  assert.ok(report.comparison_products.every(item => item.scopes.every(scope => scope.a_claim_backed && scope.c_local_ui_visible)));
  assert.ok(report.comparison_products.some(item => item.scopes.some(scope => scope.b_same_unit_condition_peer_ids.length === 0)));
  assert.ok(report.comparison_products.some(item => item.scopes.some(scope => scope.b_same_unit_condition_peer_ids.length > 0)));
});
