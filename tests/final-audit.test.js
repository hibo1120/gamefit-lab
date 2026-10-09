const assert = require("node:assert/strict");
const test = require("node:test");

const gear = require("../personal-gear-engine.js");
const pairs = require("../data/recommendation-pairs.js");
const compatibility = require("../compatibility-engine.js");
const delta = require("../current-gear-delta.js");
const evidence = require("../evidence-engine.js");
const feedback = require("../feedback-engine.js");
const priceTiming = require("../price-timing-engine.js");
const storage = require("../storage-engine.js");

function clone(value) { return JSON.parse(JSON.stringify(value)); }

test("candidate-owned high-priority free fixes cannot be bypassed by an empty request list", () => {
  const fixture = clone(pairs.buildCases()[0].input);
  fixture.fix_before_buy = [];
  fixture.candidates[0].fix_before_buy = [{ code:"verify_actual_usb_polling", priority:100 }];
  const result = gear.recommendUpgrades(fixture);
  assert.equal(result.decision,"DONT_UPGRADE");
  assert.equal(result.recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.deepEqual(result.reason_codes,["fix_before_buy"]);
});

test("game-fit source IDs require current validated exact-SKU evidence", () => {
  const fixture = clone(pairs.buildCases()[0].input);
  const candidate = fixture.candidates[0];
  const fitness = candidate.game_fitness.valorant_mnk;
  candidate.evidence = [
    { evidence_id:fitness.source_ids[0], product_id:candidate.product_id, product_variant_id:candidate.variant_id, evidence_type:"spec", normalized_fact:{ attribute:"weight", value:49 } },
    { evidence_id:fitness.source_ids[1], product_id:candidate.product_id, product_variant_id:candidate.variant_id, evidence_type:"spec", normalized_fact:{ attribute:"shape", value:"symmetrical" } }
  ];
  const result = gear.recommendUpgrades(fixture).recommendations[0];
  assert.equal(result.decision_readiness.checks.exact_game_input_profile,false);
  assert.equal(result.upgrade_match,"DONT_UPGRADE");
});

test("invalid calendar dates and malformed HTTPS URLs never create known fresh prices", () => {
  const base = { product_id:"p", variant_id:"v", current_price:100, currency:"JPY", region:"JP", availability:"in_stock", lifecycle_phase:"mature", historical_context_available:false };
  const options = { product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-02-28" };
  assert.equal(priceTiming.assess({ ...base, checked_at:"2026-02-30", source_url:"https://example.test/p" },options).status,"unknown");
  assert.equal(priceTiming.assess({ ...base, checked_at:"2026-02-28", source_url:"https://" },options).status,"unknown");
});

test("price history must match exact product variant region currency and distinct past dates", () => {
  const snapshot = { product_id:"p", variant_id:"v", current_price:80, currency:"JPY", region:"JP", checked_at:"2026-10-10", availability:"in_stock", lifecycle_phase:"mature", historical_context_available:true, source_url:"https://example.test/p",
    history:["2026-08-01","2026-09-01","2026-10-01"].map((checked_at,index) => ({ product_id:"p", variant_id:"v", region:"JP", currency:"JPY", checked_at, price:100-index*5 })) };
  const options = { product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10" };
  assert.equal(priceTiming.assess(snapshot,options).historical_context_available,true);
  assert.equal(priceTiming.assess({ ...snapshot, history:[...snapshot.history.slice(0,2),{ ...snapshot.history[2], variant_id:"other" }] },options).deal_score,null);
  assert.equal(priceTiming.assess({ ...snapshot, history:[...snapshot.history.slice(0,2),{ ...snapshot.history[2], checked_at:"2027-01-01" }] },options).deal_score,null);
});

test("explicit unsupported high polling and malformed Wi-Fi bands fail closed", () => {
  assert.equal(compatibility.evaluateUsbCompatibility({ high_polling_device:true, host_high_polling_support:false, device_connector:"usb_a", host_connector:"usb_a" }).status,"incompatible");
  const network = compatibility.evaluateNetworkCompatibility({ connection_type:"wifi", packet_loss_pct:0, jitter_ms:1, bufferbloat_method:"waveform", bufferbloat_result:"pass", client_bands:"5ghz", router_bands:["5ghz"] });
  assert.equal(network.status,"unknown");
  assert.ok(network.unknowns.includes("wifi_band_support_unknown"));
});

test("methodology-sensitive deltas require an identified shared method", () => {
  const product = (value, methods) => ({ category:"network", attributes:{ latency:{ normalized_value:value } }, attribute_evidence:{ latency:{ grade:"B", methodology_families:methods } } });
  const result = delta.compareProducts(product(10,[]),product(8,["shared"]));
  assert.equal(result.status,"unknown");
  assert.equal(result.excluded_attributes.find(item => item.attribute === "latency").reason,"methodology_not_comparable");
});

test("unverified attribute measurements cannot manufacture a strong grade", () => {
  const row = { evidence_id:"m", source_id:"m", source_origin_id:"m", product_id:"p", product_variant_id:"v", evidence_type:"measurement", source_type:"independent_lab", summary:"GameFit-authored fact.", source_url:"https://example.test/m", retrieved_at:"2026-10-09", checked_date:"2026-10-09", raw_fact:"GameFit-authored fact.", normalized_fact:{ attribute:"weight", value:50, unit:"g" }, attribute:"weight", locale:"en-US", methodology_family:"unknown_user_scale", rights_use_note:"No copied content.", commercial_relationship:"none", independent:true, measurement_verification:"user_submitted" };
  const assessment = evidence.buildAttributeAssessment([row],"weight",{ variant_id:"v", lifecycle_state:"mature" });
  assert.equal(assessment.grade,"D");
});

test("global learning rejects Sybil-like IDs and unverified outcomes", () => {
  const target = { scope:"global_candidate", product_id:"p", game_id:"apex", input_method:"mnk", verification_method:"moderated_research", created_at:"2026-10-01T00:00:00.000Z" };
  const rows = ["u1","u2","u3"].map(user_key => ({ ...target, type:"recommendation_feedback", user_key, verdict:"agree" }));
  rows.push({ ...target, type:"post_purchase_outcome", user_key:"u1", satisfaction:5, still_using:true });
  rows.push({ ...target, type:"post_purchase_outcome", user_key:"u2", satisfaction:5, still_using:true });
  assert.equal(feedback.globalLearningAssessment(rows).eligible,false);
  assert.equal(feedback.globalLearningAssessment(rows).reason,"independence_or_outcome_unverified");
});

test("global learning chooses the latest timestamp rather than the last array position", () => {
  const target = { scope:"global_candidate", product_id:"p", game_id:"apex", input_method:"mnk", independence_verified:true, verification_method:"moderated_research" };
  const rows = ["u1","u2","u3"].flatMap(user_key => [
    { ...target, type:"recommendation_feedback", user_key, verdict:"disagree", created_at:"2026-10-02T00:00:00.000Z" },
    { ...target, type:"recommendation_feedback", user_key, verdict:"agree", created_at:"2025-10-02T00:00:00.000Z" }
  ]);
  rows.push({ ...target, type:"post_purchase_outcome", user_key:"u1", satisfaction:5, still_using:true, outcome_verified:true, evaluated_at:"2026-10-03T00:00:00.000Z" });
  rows.push({ ...target, type:"post_purchase_outcome", user_key:"u2", satisfaction:5, still_using:true, outcome_verified:true, evaluated_at:"2026-10-03T00:00:00.000Z" });
  const assessment = feedback.globalLearningAssessment(rows);
  assert.equal(assessment.eligible,false);
  assert.equal(assessment.direction,"mixed");
});

test("calibration accepts only numeric probabilities and keeps synthetic samples out of the high gate", () => {
  const report = feedback.confidenceCalibration([
    { predicted_probability:null, success:false }, { predicted_probability:"0.9", success:true },
    { predicted_probability:false, success:false }, { predicted_probability:0.9, success:true }
  ]);
  assert.equal(report.sample_size,1);
  assert.equal(gear.highConfidenceGate({
    critical_attribute_grades:["A","B"], game_fit_grade:"B", delta_verified:true, compatibility_verified:true,
    critical_data_gaps:[], affiliate_permutation_passed:true, adversarial_pass_rate:1, decided_feedback_count:30,
    purchase_outcome_count:10, independent_decided_users:30, calibration_sample_size:30, holdout_sample_size:10,
    same_category_game_input:true, outcome_verification_passed:true, calibration_gap:0.1, brier_score:0.1,
    regret_rate:0.1, severe_error_count:0, real_outcomes_only:false
  }).eligible,false);
  const nullMetrics = gear.highConfidenceGate({
    critical_attribute_grades:["A"], game_fit_grade:"A", delta_verified:true, compatibility_verified:true,
    critical_data_gaps:[], affiliate_permutation_passed:true, adversarial_pass_rate:1, decided_feedback_count:30,
    purchase_outcome_count:10, independent_decided_users:30, calibration_sample_size:30, holdout_sample_size:10,
    same_category_game_input:true, outcome_verification_passed:true, real_outcomes_only:true,
    calibration_gap:null, brier_score:null, regret_rate:null, severe_error_count:0
  });
  assert.equal(nullMetrics.eligible,false);
});

test("local storage rejects nested shape drift, future profile versions, and undated event rows", () => {
  const malformed = storage.createState();
  malformed.setup = "mouse";
  malformed.profile.product_feedback = {};
  malformed.feedback = [{ verdict:"agree" }];
  const errors = storage.validateState(malformed);
  assert.ok(errors.includes("setup must be an object"));
  assert.ok(errors.includes("profile.product_feedback must be an array"));
  assert.ok(errors.includes("feedback record type is invalid"));
  const future = storage.load({ getItem:() => JSON.stringify({ ...storage.createState(), profile:{ ...storage.createState().profile, version:99 } }) });
  assert.equal(future.status,"future_schema");
  const pruned = storage.pruneExpiredRecords({ ...storage.createState(), feedback:[{ type:"recommendation_feedback", verdict:"agree" }] },"2026-10-10T00:00:00.000Z");
  assert.equal(pruned.feedback.length,0);
});

test("budget fit alone never labels a candidate as a verified value alternative", () => {
  const base = { compatible:true, compatibility_status:"compatible", evidence_grade:"B", decision_readiness:{ eligible:true }, safety_gate:{}, data_gaps:[], components:{ current_gear_delta:0.2, preference_fit:0.6, value:1, evidence:0.8 }, regret_shield:{ risk_level:"low", should_block:false, requires_clarification:false }, familiar_score:0.2 };
  assert.equal(gear.classifyUpgradeMatch(base),"EXPLORE");
  assert.equal(gear.classifyUpgradeMatch({ ...base, value_alternative_verified:true }),"VALUE_ALTERNATIVE");
});
