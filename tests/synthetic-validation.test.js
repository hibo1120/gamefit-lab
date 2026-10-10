const assert = require("node:assert/strict");
const test = require("node:test");
const personas = require("../data/synthetic-personas.js");
const synthetic = require("../synthetic-validation-engine.js");

const REQUIRED_TAGS = [
  "valorant_mnk","apex_mnk","apex_controller","satisfied_current","strong_buy_intent","no_purchase_needed",
  "budget_focus","performance_focus","brand_dislike","hard_avoid","unusual_gear","product_not_in_catalog",
  "low_evidence_product","contradictory_preference","wifi_problem_misattributed","monitor_240_os_144",
  "high_polling_via_hub","cable_overconcern","flagship_bias_probe","pro_adoption_bias_probe","affiliate_bias_probe",
  "game_input_contamination_probe","verified_non_dont_probe"
];

const suite=synthetic.runSuite(personas.buildPersonas());

test("72 synthetic personas cover the required adversarial population without counting as real testers",()=>{
  assert.equal(suite.summary.synthetic_personas,72);
  assert.equal(suite.summary.real_tester_count,0);
  assert.deepEqual(suite.summary.counts.expertise,{ beginner:24,intermediate:24,enthusiast:24 });
  for (const tag of REQUIRED_TAGS) assert.ok(suite.summary.covered_tags.includes(tag),tag);
  assert.match(suite.summary.disclosure,/excluded from the independent 10-person Gate/);
});

test("every persona completes the full self-play trace",()=>{
  const expected=["input","recommendation","explanation","user_objection","why_not","rerank","final_decision"];
  for (const row of suite.results) {
    assert.deepEqual(row.flow,expected,row.persona_id);
    assert.equal(row.synthetic,true,row.persona_id);
    assert.equal(row.real_tester_eligible,false,row.persona_id);
    assert.equal(row.why_not.opened,true,row.persona_id);
    assert.ok(row.why_not.reasons.length>0,row.persona_id);
    assert.ok(row.final_decision.label,row.persona_id);
  }
});

test("synthetic safety checks fail closed with no contamination or unsafe purchase advice",()=>{
  assert.equal(suite.summary.status,"PASS");
  assert.deepEqual(suite.summary.failures,[]);
  for (const row of suite.results) {
    for (const [check,passed] of Object.entries(row.checks)) assert.equal(passed,true,`${row.persona_id}:${check}`);
  }
  assert.ok((suite.summary.counts.top_matches["SAFE / FAMILIAR"]||0)>0);
  assert.ok((suite.summary.counts.top_matches.BETTER_FIT||0)>0);
  assert.ok((suite.summary.counts.top_matches.AVOID||0)>0);
  assert.ok((suite.summary.counts.decisions.DONT_UPGRADE||0)>0);
  assert.ok((suite.summary.counts.decisions.CLARIFY||0)>0);
});

test("affiliate, flagship, pro adoption and price cannot manufacture a better rank",()=>{
  assert.deepEqual(suite.summary.metamorphic_checks,{
    affiliate_flagship_pro_invariant:true,
    high_price_not_a_positive_signal:true,
    all_high_confidence_locked_without_outcomes:true
  });
});

test("user-facing synthetic explanations never expose internal workflow labels",()=>{
  for (const row of suite.results) {
    const visible=JSON.stringify({ explanation:row.explanation,why_not:row.why_not,final_decision:row.final_decision.label });
    for (const token of synthetic.FORBIDDEN_UI_TOKENS) assert.equal(visible.includes(token),false,`${row.persona_id}:${token}`);
  }
});
