const assert = require("node:assert/strict");
const test = require("node:test");

const validation = require("../validation-engine.js");
const store = require("../private-validation-store.js");
const blind = require("../blind-comparison-engine.js");

class MemoryStorage {
  constructor() { this.map=new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index]||null; }
  getItem(key) { return this.map.has(key)?this.map.get(key):null; }
  setItem(key,value) { this.map.set(key,String(value)); }
  removeItem(key) { this.map.delete(key); }
}

function common(id,sequence,extra={}) {
  return { journey_id:id,category:"mouse",game_id:"apex",input_method:"mnk",source:"private_tester",content_id:"private-validation-v1",entry_offer:"diagnosis",campaign:"pgi-n10-2026-10",cohort:"n10",locale:"ja",traffic_class:"tester",build_id:"fixed-build",sequence,elapsed_ms:sequence*1000,...extra };
}
function profile(id,sequence) {
  return { name:"tester_profile_recorded",properties:common(id,sequence,{ expertise:"intermediate",purchase_contexts:["actively_deciding"],independence_confirmed:true,developer_or_contributor:false,answer_aware:false,consent_confirmed:true,data_origin:"observed_participant" }) };
}
function review(id,sequence,extra={}) {
  return { name:"session_review_completed",properties:common(id,sequence,{ flow_completed:true,reason_understood:true,intended_judgment:"compare_more",assistance_level:"none",severe_error:false,privacy_incident:false,game_input_contamination:false,hard_avoid_violation:false,compatibility_major_violation:false,affiliate_rank_influence:false,ux_issue_codes:["none"],...extra }) };
}
function fullJourney(id,index=0) {
  return [
    { name:"landing_viewed",properties:common(id,0) },profile(id,1),
    { name:"my_setup_started",properties:common(id,2) },
    { name:"gear_taste_completed",properties:common(id,3,{ attributes_count:1 }) },
    { name:"next_upgrade_reached",properties:common(id,4) },
    { name:"decision_viewed",properties:common(id,5,{ decision:"DONT_UPGRADE",affiliate_eligible:false,top_candidate_id:"candidate" }) },
    { name:"regret_shield_viewed",properties:common(id,6,{ risk_level:"low",confidence_label:"Low" }) },
    review(id,7,{ reason_understood:index<7 })
  ];
}

test("10-person gate requires the ordered core flow and cannot pass on self-reported completion alone", () => {
  const hollow=Array.from({ length:10 },(_,index)=>{
    const id=`hollow-${index}`;
    return [{ name:"landing_viewed",properties:common(id,0) },profile(id,1),review(id,2)];
  }).flat();
  const result=validation.evaluateCohortGate(hollow,10);
  assert.equal(result.status,"INCONCLUSIVE");
  assert.equal(result.report.counts.flow_completed,0);
});

test("confirmed incidents stop before invalid event data can hide them", () => {
  const event={ name:"safety_incident_recorded",properties:{ confirmed:true,incident_type:"privacy_leak" } };
  assert.equal(validation.evaluateCohortGate([event],10).status,"STOP");
});

test("synthetic or internal journeys cannot pass the independent 10-person gate", () => {
  const events=Array.from({ length:10 },(_,index)=>fullJourney(`fixture-${index}`,index).map(event=>({ ...event,properties:{ ...event.properties,source:"private_fixture" } }))).flat();
  assert.equal(validation.evaluateCohortGate(events,10).status,"INCONCLUSIVE");
});

test("a fixed observed cohort passes only with seven unassisted flows and seven understood reasons", () => {
  const events=Array.from({ length:10 },(_,index)=>fullJourney(`real-${index}`,index)).flat();
  assert.equal(validation.evaluateCohortGate(events,10).status,"PASS");
  const assisted=events.map(event=>event.name==="session_review_completed"&&Number(event.properties.journey_id.split("-")[1])<4?{ ...event,properties:{ ...event.properties,assistance_level:"substantive" } }:event);
  assert.equal(validation.evaluateCohortGate(assisted,10).status,"INCONCLUSIVE");
});

test("CLARIFY coverage gaps do not inflate recommendation acceptance", () => {
  const id="coverage-gap";
  const events=[
    { name:"landing_viewed",properties:common(id,0) },profile(id,1),
    { name:"my_setup_started",properties:common(id,2) },{ name:"gear_taste_completed",properties:common(id,3,{ attributes_count:0 }) },
    { name:"next_upgrade_reached",properties:common(id,4) },{ name:"decision_viewed",properties:common(id,5,{ decision:"CLARIFY",affiliate_eligible:false,top_candidate_id:"none" }) },
    { name:"regret_shield_viewed",properties:common(id,6,{ risk_level:"unknown",confidence_label:"Low" }) },
    { name:"recommendation_feedback",properties:common(id,7,{ verdict:"agree" }) },review(id,8)
  ];
  const result=validation.computeMetrics(events);
  assert.equal(result.metrics.recommendation_acceptance_rate.denominator,0);
  assert.equal(result.metrics.coverage_gap_rate.rate,1);
});

test("private validation storage protects identity/context fields and awaits facilitator review", () => {
  const storage=new MemoryStorage();
  store.startTester(storage,{ tester_id:"t01",expertise:"beginner",purchase_contexts:["no_purchase_may_be_best"],independence_confirmed:true,developer_or_contributor:false,answer_aware:false,consent_confirmed:true },"2026-10-10T00:00:00.000Z");
  store.capture(storage,"my_setup_started",{ journey_id:"t02",source:"private_fixture",cohort:"internal",build_id:"attack",sequence:99,elapsed_ms:99,category:"mouse",game_id:"unknown",input_method:"unknown" },"2026-10-10T00:00:01.000Z");
  let state=store.load(storage).state;
  const event=state.events.at(-1);
  assert.equal(event.properties.journey_id,"t01");
  assert.equal(event.properties.source,"private_tester");
  assert.equal(event.properties.cohort,"n10");
  assert.equal(event.properties.build_id,"pgi-n10-preflight-v1");
  store.submitTesterReview(storage,{ category:"mouse",game_id:"apex",input_method:"mnk",self_reported_reason_understood:true,intended_judgment:"keep_current",ux_issue_codes:["none"] },"2026-10-10T00:01:00.000Z");
  state=store.load(storage).state;
  assert.equal(store.report(state).finalized,0);
  assert.equal(store.report(state).awaiting_review,1);
});

test("a confirmed STOP locks the cohort against replacement testers", () => {
  const storage=new MemoryStorage();
  store.startTester(storage,{ tester_id:"t01",expertise:"intermediate",purchase_contexts:["actively_deciding"],independence_confirmed:true,developer_or_contributor:false,answer_aware:false,consent_confirmed:true },"2026-10-10T00:00:00.000Z");
  store.stopTester(storage,"hard_avoid_violation","2026-10-10T00:01:00.000Z");
  assert.throws(()=>store.startTester(storage,{ tester_id:"t02",expertise:"intermediate",purchase_contexts:["actively_deciding"],independence_confirmed:true,developer_or_contributor:false,answer_aware:false,consent_confirmed:true },"2026-10-10T00:02:00.000Z"),/locked after a confirmed STOP/);
});

function answers() {
  const shared={ case_id:"mouse-case",input_hash:"a".repeat(64),source_budget_version:"frozen-v1",decision:"keep",summary:"現在の条件では維持を検討します。",reasons:["差が小さいためです。"],caution:"未確認項目があります。",next_action:"設定を確認します。" };
  return [
    { ...shared,method:"gamefit" },
    { ...shared,method:"simple_heuristic" },
    { ...shared,method:"generic_ai",provenance:{ model:"model-v1",checked_date:"2026-10-10",prompt_version:"blind-v1",output_hash:"b".repeat(64),memory_disabled:true,first_valid_response:true,web_state:"off" } }
  ];
}

test("blind comparison fixes common inputs, balanced order, and tester-bound reveal", () => {
  const one=blind.createPacket({ case_id:"mouse-case",tester_id:"t01",answers:answers(),as_of:"2026-10-10" });
  const two=blind.createPacket({ case_id:"mouse-case",tester_id:"t02",answers:answers(),as_of:"2026-10-10" });
  assert.notDeepEqual(one.operator_key.mapping,two.operator_key.mapping);
  const ratings=Object.fromEntries(["A","B","C"].map(label=>[label,{ agreement:4,clarity:4,personal_fit:4,avoids_unnecessary_purchase:4 }]));
  const assessment=blind.lockAssessment("t01",one.tester_packet,ratings,["A","B","C"],"2026-10-10T00:00:00.000Z");
  assert.throws(()=>blind.reveal(assessment,two.operator_key),/does not match/);
  assert.equal(blind.reveal(assessment,one.operator_key).scores.gamefit.rank,1);
  const mismatched=answers(); mismatched[1]={ ...mismatched[1],input_hash:"c".repeat(64) };
  assert.throws(()=>blind.createPacket({ case_id:"mouse-case",tester_id:"t01",answers:mismatched,as_of:"2026-10-10" }),/same input/);
});
