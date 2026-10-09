const assert = require("node:assert/strict");
const test = require("node:test");
const prefs = require("../preference-engine.js");
const engine = require("../personal-gear-engine.js");
const evidence = require("../evidence-engine.js");
const feedback = require("../feedback-engine.js");
const fixtures = require("../data/adversarial-fixtures.js");

function baseCandidate(overrides={}) {
  return {
    product_id:"candidate", category:"mouse", evidence_grade:"A", current_gear_delta:0.3,
    game_fitness:{ apex_mnk:{ score:0.8, evidence_grade:"B" } }, value_score:0.6,
    compatible:true, compatibility_status:"compatible", attributes:{ weight:{ normalized_value:55, normalized_unit:"g" } },
    attribute_evidence:{ weight:{ grade:"B", confidence:"High" } }, ...overrides
  };
}

function recommend(profile,candidates,extra={}) {
  return engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile, current_gear:{ category:"mouse" }, candidates, ...extra
  });
}

test("adversarial fixture catalog covers every requested failure mode", () => {
  const ids = new Set(fixtures.cases.map(item => item.id));
  for (const id of ["shape-close-but-disliked","flagship-small-delta","pro-adoption-poor-fit","affiliate-low-fit","non-affiliate-best","new-product-grade-d","contradictory-community","performance-high-compatibility-ng","monitor-240-os-144","apex-controller-mouse"]) {
    assert.equal(ids.has(id),true,id);
  }
});

test("missing hard-avoid attributes stop purchase advice and normalized types cannot bypass a match", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(),{ category:"mouse", attribute:"weight", value:"80 g" });
  const missing = recommend(profile,[baseCandidate({ attributes:{} })]).recommendations[0];
  assert.equal(missing.regret_shield.requires_clarification,true);
  assert.equal(missing.upgrade_match,"DONT_UPGRADE");

  const matched = recommend(profile,[baseCandidate({ attributes:{ weight:{ raw_value:"0.08 kg", normalized_value:80, normalized_unit:"g" } } })]).recommendations[0];
  assert.equal(matched.regret_shield.confidence,"High");
  assert.equal(matched.upgrade_match,"AVOID");

  const nonCanonicalObject = recommend(profile,[baseCandidate({ attributes:{ weight:{ raw_value:"0.08 kg", normalized_value:0.08, normalized_unit:"kg" } } })]).recommendations[0];
  assert.equal(nonCanonicalObject.regret_shield.confidence,"High");
  assert.equal(nonCanonicalObject.upgrade_match,"AVOID");

  for (const invalidWeight of ["nonsense", { normalized_value:0.17637, normalized_unit:"lb" }]) {
    const invalid = recommend(profile,[baseCandidate({ attributes:{ weight:invalidWeight } })]).recommendations[0];
    assert.equal(invalid.regret_shield.requires_clarification,true);
    assert.equal(invalid.regret_shield.coverage.known,0);
    assert.ok(invalid.regret_shield.data_gaps.includes("hard_avoid_attribute_missing:weight"));
    assert.equal(invalid.upgrade_match,"DONT_UPGRADE");
  }
});

test("source-free exact game fitness cannot become High confidence", () => {
  const result = recommend(prefs.createProfile(),[baseCandidate({ game_fitness:{ apex_mnk:1 } })]).recommendations[0];
  assert.notEqual(result.confidence,"High");
  assert.ok(result.data_gaps.includes("game_fitness_evidence_missing"));
});

test("popularity, adoption and affiliate fields cannot change score or order", () => {
  const plain = baseCandidate({ product_id:"plain", affiliate:false, popularity:1, pro_adoption:0 });
  const promoted = baseCandidate({ product_id:"promoted", affiliate:true, commission_rate:90, merchant_priority:999, popularity:999999, pro_adoption:9999 });
  const result = recommend(prefs.createProfile(),[plain,promoted]);
  const a = result.recommendations.find(item => item.product_id === "plain");
  const b = result.recommendations.find(item => item.product_id === "promoted");
  assert.equal(a.recommendation_score,b.recommendation_score);
  assert.equal(a.upgrade_match,b.upgrade_match);
});

test("compatibility and input separation override performance", () => {
  const incompatible = recommend(prefs.createProfile(),[baseCandidate({ compatible:false })]).recommendations[0];
  assert.equal(incompatible.upgrade_match,"AVOID");
  const controller = engine.recommendUpgrades({
    game_id:"apex", input_method:"controller", profile:prefs.createProfile(), current_gear:{ category:"controller" },
    candidates:[baseCandidate({ game_fitness:{ apex_controller:{ score:1, evidence_grade:"A" } } })]
  }).recommendations[0];
  assert.equal(controller.upgrade_match,"AVOID");
});

test("Fix Before Buy wins over a tempting monitor", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile:prefs.createProfile(), current_gear:{ category:"monitor" },
    fix_before_buy:[{ code:"os_refresh_is_144_on_240_panel", priority:100 }],
    candidates:[{
      product_id:"monitor-flagship", category:"monitor", evidence_grade:"A", current_gear_delta:0.5,
      game_fitness:{ apex_mnk:{ score:1, evidence_grade:"A" } }, value_score:1,
      compatible:true, compatibility_status:"compatible", attributes:{ refresh_rate:{ normalized_value:480, normalized_unit:"hz" } }
    }]
  });
  assert.equal(result.decision,"DONT_UPGRADE");
  assert.deepEqual(result.reason_codes,["fix_before_buy"]);
});

test("calibration fixture explicitly shows high-confidence errors and low-confidence successes", () => {
  assert.equal(fixtures.calibration.has_real_outcomes,false);
  const assessment = feedback.confidenceCalibration(fixtures.calibration.samples);
  assert.equal(assessment.sample_size,4);
  assert.equal(assessment.brier_score,0.375);
  assert.equal(assessment.calibration_gap,0.05);
});

test("duplicate origins, stance-free claims and product grade cannot fake attribute confidence", () => {
  const claims = [
    { evidence_type:"subjective", source_id:"mirror-1", source_origin_id:"one-post", independent:true },
    { evidence_type:"subjective", source_id:"mirror-2", source_origin_id:"one-post", independent:true },
    { evidence_type:"subjective", source_id:"mirror-3", source_origin_id:"one-post", independent:true }
  ];
  assert.equal(evidence.normalizeSubjectiveConsensus(claims),"anecdotal");
  assert.equal(evidence.buildAttributeAssessment([],"shape",{ evidence_grade:"A" }).confidence,"Low");
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", source_id:"implicit-1", stance:"positive" },
    { evidence_type:"subjective", source_id:"implicit-2", stance:"positive" },
    { evidence_type:"subjective", source_id:"implicit-3", stance:"positive" }
  ]),"anecdotal");
});
