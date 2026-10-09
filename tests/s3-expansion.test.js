const assert = require("node:assert/strict");
const test = require("node:test");
const delta = require("../current-gear-delta.js");
const compatibility = require("../compatibility-engine.js");
const briefs = require("../decision-brief-engine.js");
const briefData = require("../data/decision-briefs.js");
const lifecycle = require("../catalog-lifecycle.js");
const feedback = require("../feedback-engine.js");
const gear = require("../personal-gear-engine.js");
const prefs = require("../preference-engine.js");
const fixtures = require("../data/personal-gear-fixtures.js");
const evidence = require("../evidence-engine.js");
const fix = require("../fix-before-buy.js");
const normalization = require("../normalization-engine.js");
const storage = require("../storage-engine.js");

function measured(category, attributes, grades={}, methods={}) {
  return {
    category, attributes:Object.fromEntries(Object.entries(attributes).map(([key,value]) => [key,{ normalized_value:value }])),
    attribute_evidence:Object.fromEntries(Object.keys(attributes).map(key => [key,{ grade:grades[key] || "B", methodology_families:methods[key] || ["shared_method"] }]))
  };
}

function safeCandidate(overrides={}) {
  return {
    product_id:"safe-mouse", category:"mouse", evidence_grade:"A", lifecycle_state:"available",
    current_gear_delta:0.35, game_fitness:{ apex_mnk:{ score:0.85, evidence_grade:"B" } },
    compatible:true, compatibility_status:"compatible",
    compatibility_assessment:{ assessment_type:"rule_evaluation", status:"compatible", issues:[], unknowns:[], evaluated_fields:["device_connector","host_connector"] },
    price:100, value_score:1, attributes:{ weight:55 }, similarity_to_current:0.4, ...overrides
  };
}

function recommend(candidate, extra={}) {
  return gear.recommendUpgrades({ game_id:"apex", input_method:"mnk", profile:prefs.createProfile(),
    current_gear:{ category:candidate.category }, budget:200, fix_before_buy:[],
    setup_assessment:{ status:"evaluated", checks:["verify_actual_usb_polling"] }, candidates:[candidate], ...extra });
}

test("current gear delta compares only evidence-supported category attributes", () => {
  const current = measured("mouse",{ shape:"symmetrical", length:125, width:63, weight:80 });
  const candidate = measured("mouse",{ shape:"ergonomic", length:120, width:60, weight:55 });
  const result = delta.compareProducts(current,candidate);
  assert.equal(result.status,"partial");
  assert.equal(result.delta_band,"meaningful_change");
  assert.equal(result.high_confidence_eligible,false);
  assert.ok(result.compared_attributes.some(item => item.attribute === "weight"));
});

test("current gear delta runs on real mouse and monitor fixture pairs", () => {
  const pair = (from,to) => delta.compareProducts(fixtures.products.find(item => item.product_id === from),fixtures.products.find(item => item.product_id === to));
  const mouse = pair("mouse-razer-viper-v4-pro","mouse-mchose-l7-pro");
  assert.ok(["known","partial"].includes(mouse.status));
  assert.ok(mouse.compared_attributes.some(item => item.attribute === "weight"));
  const keyboard = pair("keyboard-wooting-60he-plus","keyboard-razer-huntsman-v3-pro-mini-8khz");
  assert.ok(["known","partial"].includes(keyboard.status));
  assert.ok(keyboard.compared_attributes.some(item => item.attribute === "rapid_trigger"));
  const monitor = pair("monitor-zowie-xl2566x-plus","monitor-zowie-xl2586x-plus");
  assert.ok(["known","partial"].includes(monitor.status));
  assert.ok(monitor.compared_attributes.some(item => item.attribute === "refresh_rate"));
});

test("low evidence and incompatible measurement methods are excluded from delta", () => {
  const current = measured("network",{ latency:10, jitter:3 },{ latency:"B", jitter:"D" },{ latency:["lab_a"], jitter:["lab"] });
  const candidate = measured("network",{ latency:8, jitter:1 },{ latency:"B", jitter:"B" },{ latency:["lab_b"], jitter:["lab"] });
  const result = delta.compareProducts(current,candidate);
  assert.equal(result.status,"unknown");
  assert.ok(result.excluded_attributes.some(item => item.reason === "methodology_not_comparable"));
  assert.ok(result.excluded_attributes.some(item => item.reason === "evidence_below_C"));
});

test("larger cable bandwidth is a capacity difference, not an automatic improvement", () => {
  const current = measured("cable",{ connector:"displayport", standard:"dp_1_4", certified_bandwidth:32.4, certification:"vesa" });
  const candidate = measured("cable",{ connector:"displayport", standard:"dp_2_1", certified_bandwidth:80, certification:"vesa_dp80" });
  const result = delta.compareProducts(current,candidate);
  assert.equal(result.compared_attributes.find(item => item.attribute === "certified_bandwidth").objective_direction,null);
});

test("display compatibility fails closed on missing signal-chain facts", () => {
  const unknown = compatibility.evaluateDisplayCompatibility({ gpu_connector:"displayport" });
  assert.equal(unknown.status,"unknown");
  assert.ok(unknown.unknowns.includes("target_mode_bandwidth_missing"));
  const bad = compatibility.evaluateDisplayCompatibility({ gpu_connector:"displayport", monitor_connector:"displayport", cable_connector:"displayport", required_bandwidth_gbps:40, cable_certified_bandwidth_gbps:32.4 });
  assert.equal(bad.status,"incompatible");
});

test("USB, audio and network compatibility never infer missing support", () => {
  assert.equal(compatibility.evaluateUsbCompatibility({ high_polling_device:true }).status,"unknown");
  assert.equal(compatibility.evaluateAudioCompatibility({ requires_dac:true, dac_available:false, audio_connector:"usb", source_connector:"usb" }).status,"incompatible");
  assert.equal(compatibility.evaluateNetworkCompatibility({ connection_type:"wifi" }).status,"unknown");
});

test("network throughput alone does not assert gaming stability", () => {
  const fastOnly = compatibility.evaluateNetwork({ connection_type:"wifi", throughput_mbps:900 });
  assert.deepEqual(fastOnly,[]);
  const unstable = compatibility.evaluateNetwork({ connection_type:"wifi", throughput_mbps:900, jitter_ms:30, packet_loss_pct:1 });
  assert.ok(unstable.some(item => item.code === "high_jitter_before_upgrade"));
  assert.ok(unstable.some(item => item.code === "packet_loss_before_upgrade"));
  const incomplete = compatibility.evaluateNetworkCompatibility({ connection_type:"wifi", client_bands:["5ghz"], router_bands:["5ghz"], throughput_mbps:900 });
  assert.equal(incomplete.status,"unknown");
  assert.ok(incomplete.unknowns.includes("jitter_not_measured"));
  const jitterOnly = compatibility.evaluateNetworkCompatibility({ connection_type:"wifi", client_bands:["5ghz"], router_bands:["5ghz"], jitter_ms:30, packet_loss_pct:0, bufferbloat_method:"latency_under_load", bufferbloat_result:"pass" });
  assert.equal(jitterOnly.status,"unknown");
  for (const invalid of [
    { packet_loss_pct:"n/a", jitter_ms:"n/a" },
    { packet_loss_pct:-1, jitter_ms:-1 },
    { packet_loss_pct:"", jitter_ms:"" },
    { packet_loss_pct:"   ", jitter_ms:"   " },
    { packet_loss_pct:false, jitter_ms:true }
  ]) {
    const assessment = compatibility.evaluateNetworkCompatibility({ connection_type:"wifi", client_bands:["5ghz"], router_bands:["5ghz"], bufferbloat_method:"latency_under_load", bufferbloat_result:"pass", ...invalid });
    assert.equal(assessment.status,"unknown");
    assert.ok(assessment.unknowns.some(item => item.endsWith("_invalid")));
    const candidate = safeCandidate({
      product_id:"network-invalid", category:"network", input_methods:["mnk"],
      compatibility_assessment:assessment, compatibility_status:assessment.status, compatible:undefined
    });
    assert.equal(recommend(candidate).recommendations[0].upgrade_match,"DONT_UPGRADE");
  }
  const bogusMethod = compatibility.evaluateNetworkCompatibility({ connection_type:"wifi", client_bands:["5ghz"], router_bands:["5ghz"], packet_loss_pct:0, jitter_ms:1, bufferbloat_method:"anything", bufferbloat_result:"pass" });
  assert.equal(bogusMethod.status,"unknown");
  assert.ok(bogusMethod.unknowns.includes("bufferbloat_method_missing_or_invalid"));
});

test("all eight Decision Briefs keep structured original guidance and source detail", () => {
  assert.equal(briefData.briefs.length,8);
  for (const item of briefData.briefs) {
    assert.deepEqual(briefs.validateBrief(item),[]);
    const digest = briefs.buildResearchDigest(item.id);
    assert.ok(digest.evidence.length >= 1);
    assert.match(digest.presentation_rule,/decision brief first/i);
  }
});

test("catalog lifecycle promotion requires evidence while demand only orders enrichment", () => {
  const product = { product_id:"x", catalog_state:"profiled" };
  assert.equal(lifecycle.nextState(product,{ attribute_evidence_count:3, adversarial_fixture_passed:true }),"evaluated");
  assert.equal(lifecycle.nextState({ ...product, catalog_state:"evaluated" },{ independent_methodology_count:1, compatibility_checked:true }),"evaluated");
  const queue = lifecycle.enqueueDemand([{ product_id:"a", type:"search" },{ product_id:"b", type:"ownership" },{ product_id:"a", type:"compare" }]);
  assert.equal(queue[0].product_id,"a");
});

test("feedback explanation exposes personal preference and ranking changes without global mutation", () => {
  const item = feedback.recommendationFeedback({ product_id:"a", game_id:"apex", input_method:"mnk", verdict:"disagree", reason_codes:["weight"], desired_direction_codes:["lighter"] });
  const recommendations = [
    { product_id:"a", game_id:"apex", input_method:"mnk", recommendation_score:80, direction_codes:[] },
    { product_id:"b", game_id:"apex", input_method:"mnk", recommendation_score:75, direction_codes:["lighter"] }
  ];
  const learned = feedback.applyPersonalLearningWithExplanation(prefs.createProfile(),item,recommendations);
  assert.equal(learned.explanation.global_model_changed,false);
  assert.ok(learned.explanation.preference_updates.length >= 2);
  assert.equal(learned.recommendations[0].product_id,"b");
});

test("recommendation safety gate treats omitted compatibility and setup assessment as DONT_UPGRADE", () => {
  const missingCompatibility = recommend(safeCandidate({ compatible:undefined, compatibility_status:undefined, compatibility_assessment:undefined }));
  assert.equal(missingCompatibility.recommendations[0].upgrade_match,"DONT_UPGRADE");
  const missingSetup = recommend(safeCandidate(),{ fix_before_buy:[], setup_assessment:undefined });
  assert.equal(missingSetup.recommendations[0].upgrade_match,"DONT_UPGRADE");
});

test("hard budget cap cannot be overridden by value_score", () => {
  const result = recommend(safeCandidate({ price:1000, value_score:1 }));
  assert.equal(result.recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.ok(result.recommendations[0].data_gaps.includes("budget_exceeded"));
});

test("source-free game fit, non-buyable lifecycle and unverified cable need stay DONT_UPGRADE", () => {
  assert.equal(recommend(safeCandidate({ game_fitness:{ apex_mnk:1 } })).recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.equal(recommend(safeCandidate({ lifecycle_state:"preorder" })).recommendations[0].upgrade_match,"DONT_UPGRADE");
  const cable = safeCandidate({ product_id:"cable", category:"cable", verified_need:true, input_methods:["mnk"] });
  assert.equal(recommend(cable).recommendations[0].upgrade_match,"DONT_UPGRADE");
});

test("tie ordering is deterministic and independent of affiliate/feed permutation", () => {
  const a = safeCandidate({ product_id:"a", affiliate:true });
  const b = safeCandidate({ product_id:"b", affiliate:false });
  const input = { game_id:"apex", input_method:"mnk", profile:prefs.createProfile(), current_gear:{ category:"mouse" }, budget:200, fix_before_buy:[], setup_assessment:{ status:"evaluated", checks:["verify_actual_usb_polling"] } };
  const first = gear.recommendUpgrades({ ...input, candidates:[b,a] }).recommendations.map(item => item.product_id);
  const second = gear.recommendUpgrades({ ...input, candidates:[a,b] }).recommendations.map(item => item.product_id);
  assert.deepEqual(first,second);
  assert.deepEqual(first,["a","b"]);
});

test("Regret Shield blocks hard avoids across monitor keyboard audio and controller", () => {
  const cases = [
    ["monitor","panel","oled"], ["keyboard","layout","60_percent"],
    ["audio","fit","over_ear_closed_back"], ["controller","layout","asymmetric"]
  ];
  for (const [category,attribute,value] of cases) {
    const profile = prefs.addHardAvoid(prefs.createProfile(),{ category, attribute, value });
    const result = gear.evaluateRegretShield({ category, evidence_grade:"B", attributes:{ [attribute]:value }, attribute_evidence:{ [attribute]:{ grade:"B", confidence:"High" } } },profile,{});
    assert.equal(result.should_block,true,category);
    assert.equal(result.risk_level,"high",category);
  }
});

test("unknown hard-avoid evidence is clarification, never a safe recommendation", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(),{ category:"audio", attribute:"fit", value:"over_ear_closed_back" });
  const result = gear.evaluateRegretShield({ category:"audio", attributes:{}, attribute_evidence:{} },profile,{});
  assert.equal(result.risk_level,"unknown");
  assert.equal(result.requires_clarification,true);
});

test("hard avoid cannot be cleared by low or conflicting attribute evidence", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(),{ category:"mouse", attribute:"weight", value:"80 g" });
  for (const attributeEvidence of [{ grade:"D", confidence:"Low" },{ grade:"B", confidence:"High", conflict:true }]) {
    const candidate = safeCandidate({ attributes:{ weight:55 }, attribute_evidence:{ weight:attributeEvidence } });
    const result = recommend(candidate,{ profile });
    assert.equal(result.recommendations[0].upgrade_match,"DONT_UPGRADE");
    assert.equal(result.recommendations[0].regret_shield.requires_clarification,true);
  }
});

test("buyability is allowlisted and cable need requires evidence-backed assessment", () => {
  for (const lifecycleState of [undefined,"legacy","discontinued","eol","unavailable_us"]) {
    assert.equal(recommend(safeCandidate({ lifecycle_state:lifecycleState })).recommendations[0].upgrade_match,"DONT_UPGRADE");
  }
  const cable = safeCandidate({
    product_id:"cable", category:"cable", input_methods:["mnk"], variant_scope:"exact", variant_id:"cable-exact-1m",
    compatibility_assessment:{ assessment_type:"rule_evaluation", status:"compatible", issues:[], unknowns:[], evaluated_fields:["cable_connector"], variant_id:"cable-exact-1m" },
    need_assessment:{ status:"verified", reason_code:"required_connector_missing", evidence:[{ source:"setup", fact:"required connector is absent" }], variant_id:"cable-exact-1m" }
  });
  assert.notEqual(recommend(cable).recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.equal(recommend({ ...cable, variant_scope:"family" }).recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.equal(recommend({ ...cable, variant_scope:undefined }).recommendations[0].upgrade_match,"DONT_UPGRADE");
  assert.equal(recommend({ ...cable, variant_id:undefined }).recommendations[0].upgrade_match,"DONT_UPGRADE");
});

test("compatibility and setup self-assertions without structured assessments stay DONT_UPGRADE", () => {
  const selfAsserted = safeCandidate({ compatibility_assessment:null, compatible:true, compatibility_status:"compatible" });
  assert.equal(recommend(selfAsserted).recommendations[0].upgrade_match,"DONT_UPGRADE");
  const emptySetup = recommend(safeCandidate(),{ setup_assessment:{ status:"evaluated", checks:[] }, fix_before_buy:[] });
  assert.equal(emptySetup.recommendations[0].upgrade_match,"DONT_UPGRADE");
  const bogusSetup = recommend(safeCandidate(),{ setup_assessment:{ status:"evaluated", checks:["bogus"] }, fix_before_buy:[] });
  assert.equal(bogusSetup.recommendations[0].upgrade_match,"DONT_UPGRADE");
  const bogusCompatibility = safeCandidate({ compatibility_assessment:{ assessment_type:"rule_evaluation", status:"compatible", issues:[], unknowns:[], evaluated_fields:["bogus"] } });
  assert.equal(recommend(bogusCompatibility).recommendations[0].upgrade_match,"DONT_UPGRADE");
});

test("Fix Before Buy covers display USB audio network and OS before products", () => {
  const rows = fix.suggestions({ display_target_mode:true, display_link_verified:false, high_polling_device:true, actual_polling_verified:false,
    audio_issue:true, audio_output_settings_checked:false, direct_audio_path_tested:false, online_game:true, connection_type:"wifi", wired_tested:false,
    bufferbloat_tested:false, performance_issue:true, os_power_mode_checked:false });
  for (const code of ["verify_display_signal_chain","verify_actual_usb_polling","check_audio_output_settings","compare_temporary_wired_test","check_os_power_and_background_load"]) {
    assert.ok(rows.some(item => item.code === code),code);
  }
  assert.ok(rows.every(item => ["free","free_or_low"].includes(item.cost_level)));
});

test("data-rate and power normalization preserve dimensions and reject unknown units", () => {
  assert.equal(normalization.normalizeAttribute("network","wired_lan_speed","10 Gbps").normalized_value,10000);
  assert.equal(normalization.normalizeAttribute("network","wired_lan_speed","10000 Mbps").normalized_value,10000);
  assert.equal(normalization.normalizeAttribute("cable","power_delivery","240 W").normalized_value,240);
  assert.throws(() => normalization.normalizeAttribute("network","wired_lan_speed","10 bananas"),/unknown/);
});

test("high confidence remains locked until evidence and real outcome gates all pass", () => {
  const locked = gear.highConfidenceGate({ critical_attribute_grades:["A","B"], game_fit_grade:"B", delta_verified:true, compatibility_verified:true,
    critical_data_gaps:[], affiliate_permutation_passed:true, adversarial_pass_rate:1, decided_feedback_count:29, purchase_outcome_count:10,
    calibration_gap:0.1, brier_score:0.15, regret_rate:0.1, severe_error_count:0 });
  assert.equal(locked.eligible,false);
  const open = gear.highConfidenceGate({ critical_attribute_grades:["A","B"], game_fit_grade:"B", delta_verified:true, compatibility_verified:true,
    critical_data_gaps:[], affiliate_permutation_passed:true, adversarial_pass_rate:1, decided_feedback_count:30, purchase_outcome_count:10,
    calibration_gap:0.1, brier_score:0.15, regret_rate:0.1, severe_error_count:0 });
  assert.equal(open.eligible,true);
  assert.equal(open.provisional,true);
});

test("new fixture categories leave measured network quality unknown instead of inventing it", () => {
  for (const category of ["controller","network","cable"]) assert.equal(fixtures.byCategory[category].length,6);
  for (const product of fixtures.byCategory.network) {
    for (const field of ["latency","jitter","packet_loss","bufferbloat","firmware_stability"]) assert.equal(product.attributes[field],undefined,`${product.product_id}:${field}`);
  }
});

test("future evidence is invalid and stale or same-publisher mirrors cannot manufacture grade A", () => {
  const base = { evidence_id:"future", source_id:"x", source_origin_id:"x", product_id:"p", evidence_type:"measurement", summary:"Short fact.", source_url:"https://same.example/a", retrieved_at:"2999-01-01", checked_date:"2999-01-01", raw_fact:"Short fact.", normalized_fact:{ attribute:"weight", value:50, unit:"g" }, locale:"en", methodology_family:"lab", rights_use_note:"No copied content.", commercial_relationship:"none", independent:true, source_type:"independent_lab" };
  assert.ok(evidence.validateFixtureEvidenceRecord(base).includes("checked_date cannot be in the future"));
  const mirrors = ["a","b","c"].map((id,index) => ({ ...base, evidence_id:id, source_id:id, source_origin_id:id, source_url:`https://same.example/${id}`, checked_date:"2018-01-01", retrieved_at:"2018-01-01", evidence_type:index < 2 ? "measurement" : "subjective", stance:"good", long_term:true }));
  assert.notEqual(evidence.gradeFromEvidence(mirrors,{ lifecycle_state:"mature" }),"A");
});

test("local storage rejects undeclared and sensitive personal fields", () => {
  const state = storage.createState();
  state.profile.email = "person@example.test";
  assert.ok(storage.validateState(state).some(error => error.includes("email")));
  const other = storage.createState();
  other.setup.free_text = "private note";
  assert.ok(storage.validateState(other).some(error => error.includes("free_text")));
  const nested = storage.createState();
  nested.profile.product_feedback.push({ product_id:"x", contact:"private", serial_number:"ABC123" });
  const nestedErrors = storage.validateState(nested);
  assert.ok(nestedErrors.some(error => error.includes("contact")));
  assert.ok(nestedErrors.some(error => error.includes("serial_number")));
  const variants = storage.createState();
  variants.profile.product_feedback.push({ product_id:"x", contact_info:"private", serialNo:"ABC123", note:"copied detail" });
  assert.ok(storage.validateState(variants).some(error => error.includes("contact_info")));
  assert.ok(storage.validateState(variants).some(error => error.includes("serialNo")));
  assert.ok(storage.validateState(variants).some(error => error.includes("note")));
});

test("local retention removes timestamped records older than 365 days", () => {
  const state = storage.createState();
  state.feedback.push({ verdict:"agree", created_at:"2025-01-01T00:00:00.000Z" });
  state.feedback.push({ verdict:"unsure", created_at:"2026-10-01T00:00:00.000Z" });
  state.profile.product_feedback.push({ product_id:"old", created_at:"2025-01-01T00:00:00.000Z" });
  state.profile.product_feedback.push({ product_id:"new", created_at:"2026-10-01T00:00:00.000Z" });
  const next = storage.pruneExpiredRecords(state,"2026-10-09T00:00:00.000Z");
  assert.deepEqual(next.feedback.map(item => item.verdict),["unsure"]);
  assert.deepEqual(next.profile.product_feedback.map(item => item.product_id),["new"]);
});

test("same corporate domain subdomains cannot manufacture independent consensus", () => {
  const rows = ["reviews.example.com","labs.example.com","community.example.com"].map((host,index) => ({
    evidence_id:`mirror-${index}`, source_id:`mirror-${index}`, source_origin_id:`mirror-${index}`, product_id:"p",
    evidence_type:"subjective", stance:"good", summary:"GameFit normalized observation.", source_url:`https://${host}/item`,
    retrieved_at:"2026-10-09", checked_date:"2026-10-09", independent:true
  }));
  assert.equal(evidence.normalizeSubjectiveConsensus(rows),"anecdotal");
  assert.equal(evidence.normalizeSubjectiveConsensus(rows.map((item,index) => ({ ...item, publisher_id:`self-${index}` }))),"anecdotal");
});
