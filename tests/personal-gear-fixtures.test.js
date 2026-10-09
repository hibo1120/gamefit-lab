const assert = require("node:assert/strict");
const test = require("node:test");
const fixtures = require("../data/personal-gear-fixtures.js");
const evidence = require("../evidence-engine.js");

test("real-product pilot has six role-diverse products in every priority category", () => {
  const requiredRoles = ["staple","current_flagship","value","hidden_gem_candidate","new_low_evidence","legacy"];
  for (const category of ["mouse","keyboard","monitor","mousepad","audio"]) {
    assert.equal(fixtures.byCategory[category].length, 6, category);
    assert.deepEqual(fixtures.byCategory[category].map(item => item.fixture_role).sort(), [...requiredRoles].sort(), category);
  }
  const expansionRoles = ["staple","current_flagship","value","niche","new_low_evidence","legacy"];
  for (const category of ["controller","network","cable"]) {
    assert.equal(fixtures.byCategory[category].length,6,category);
    assert.deepEqual(fixtures.byCategory[category].map(item => item.fixture_role).sort(),[...expansionRoles].sort(),category);
  }
});

test("fixture evidence is traceable, rights-conservative and strictly valid", () => {
  assert.deepEqual(fixtures.validateFixtures(), []);
  for (const product of fixtures.products) {
    assert.equal(product.fixture_only, true);
    for (const record of product.evidence) {
      assert.equal(evidence.validateFixtureEvidenceRecord(record).length, 0, record.evidence_id);
      assert.match(record.source_url, /^https:\/\//);
      assert.equal(record.checked_date, fixtures.CHECKED_DATE);
      assert.equal(record.rights_use_note.includes("do not copy"), true);
      for (const prohibited of evidence.PROHIBITED_COPY_FIELDS) assert.equal(record[prohibited], undefined);
    }
  }
});

test("pilot preserves official, lab, specialist, community and game-specific adoption evidence separately", () => {
  const records = fixtures.products.flatMap(item => item.evidence);
  for (const sourceType of ["official", "independent_lab", "specialist_review", "community", "esports_database"]) {
    assert.equal(records.some(item => item.source_type === sourceType), true, sourceType);
  }
  for (const evidenceType of ["spec", "measurement", "subjective", "adoption"]) {
    assert.equal(records.some(item => item.evidence_type === evidenceType), true, evidenceType);
  }
  const adoption = records.find(item => item.evidence_type === "adoption");
  assert.equal(adoption.game_id, "apex");
  assert.equal(adoption.input_method, "mnk");
  assert.equal(adoption.time_window, "2026-10");
  assert.equal(adoption.sample_size, 87);
  const zero = fixtures.products.find(item => item.product_id === "mousepad-artisan-zero");
  assert.equal(zero.attribute_evidence.humidity_resistance.consensus, "mixed");
  assert.equal(zero.attribute_evidence.humidity_resistance.confidence, "Low");
  assert.equal(zero.attributes.humidity_resistance, undefined);
});

test("requested named products exist without filling unknown attributes", () => {
  const names = new Set(fixtures.products.map(item => item.product_name));
  for (const name of ["Razer Viper V4 Pro","Logitech G PRO X2 SUPERSTRIKE","Logitech G PRO X3 SUPERSTRIKE","MCHOSE L7 Pro","Wooting 60HE+","Wooting 80HE","ARTISAN NINJA FX ZERO"]) {
    assert.equal(names.has(name), true, name);
  }
  const lowEvidenceMonitor = fixtures.products.find(item => item.product_id === "monitor-sony-inzone-m10s-ii");
  assert.equal(lowEvidenceMonitor.attributes.refresh_rate.normalized_value,540);
  assert.equal(lowEvidenceMonitor.attributes.response_time,undefined);
  assert.notEqual(lowEvidenceMonitor.evidence_grade,"A");
});

test("attribute evidence never inherits the product grade without a matching claim", () => {
  const product = fixtures.products.find(item => item.product_id === "audio-audeze-maxwell-2");
  assert.equal(product.attribute_evidence.weight.confidence, "High");
  assert.equal(product.attribute_evidence.imaging, undefined);
});

test("product evidence grade is computed from its ledger rather than a fixture declaration", () => {
  for (const product of fixtures.products) {
    assert.equal(product.evidence_grade,evidence.gradeFromEvidence(product.evidence,product),product.product_id);
  }
});
