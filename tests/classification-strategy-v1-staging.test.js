const assert=require("node:assert/strict");
const test=require("node:test");
const strategy=require("../data/classification-strategy-v1.staging.js");
const fs=require("node:fs");
const path=require("node:path");

test("all traffic signals explicitly separate domain reach from feature usage",()=>{
  for(const signal of Object.values(strategy.trafficSignals)){
    assert.deepEqual(strategy.validateTrafficSignal(signal),[]);
    assert.equal(signal.estimated,true);
    assert.ok(["domain_not_feature","no_reliable_public_estimate_found"].includes(signal.estimate_scope));
  }
});

test("all classification records validate",()=>{
  for(const item of Object.values(strategy.classifications)){
    assert.deepEqual(strategy.validateClassification(item),[]);
  }
});

test("large-market classifications remain core but are not called differentiation",()=>{
  assert.equal(strategy.classifications.product_category.surface,"core_input");
  assert.equal(strategy.classifications.product_category.market_signal,"very_high");
  assert.equal(strategy.classifications.product_category.differentiation,"low");
  assert.equal(strategy.classifications.compatibility.status,"GO");
});

test("budget and physical fit are deferred rather than removed",()=>{
  assert.equal(strategy.classifications.budget.surface,"deferred_input");
  assert.equal(strategy.classifications.hand_grip_physical_fit.surface,"deferred_input");
  assert.equal(strategy.marketAbsenceDecision(strategy.classifications.hand_grip_physical_fit).delete,false);
});

test("Pro adoption remains reference-only despite high demand",()=>{
  const item=strategy.classifications.pro_adoption;
  assert.equal(item.market_signal,"very_high");
  assert.equal(item.surface,"reference_only");
  assert.notEqual(item.status,"GO");
});

test("Role weapon and style stay preserved without entering main flow",()=>{
  const item=strategy.classifications.role_weapon_style;
  assert.equal(item.market_signal,"low");
  assert.equal(item.surface,"research_only");
  assert.equal(item.status,"HOLD");
  const decision=strategy.marketAbsenceDecision(item);
  assert.equal(decision.delete,false);
  assert.match(decision.reason,/preserve/);
});

test("GameFit differentiation layer is preserved even without dominant incumbent proof",()=>{
  for(const id of ["current_gear_delta","fix_before_buy","dont_upgrade"]){
    const item=strategy.classifications[id];
    assert.equal(item.differentiation,"high");
    assert.equal(item.surface,"result_core");
    assert.equal(strategy.marketAbsenceDecision(item).delete,false);
  }
});

test("PC performance context is separate from peripheral game weighting",()=>{
  assert.equal(strategy.classifications.pc_performance_target.surface,"pc_context");
  assert.equal(strategy.classifications.game_specific_peripheral_weights.surface,"research_only");
  assert.equal(strategy.classifications.game_specific_peripheral_weights.status,"HOLD");
});

test("strategy buckets expose a low-friction surface plan",()=>{
  const buckets=strategy.strategyBuckets();
  assert.ok(buckets.core.includes("product_category"));
  assert.ok(buckets.core.includes("exact_game_input"));
  assert.ok(buckets.deferred.includes("budget"));
  assert.ok(buckets.reference.includes("pro_adoption"));
  assert.ok(buckets.differentiation.includes("current_gear_delta"));
  assert.ok(buckets.research.includes("role_weapon_style"));
});

test("staging strategy is not imported by current Private Validation or recommendation engine",()=>{
  const root=path.join(__dirname,"..");
  for(const file of [
    path.join(root,"private","personal-gear.html"),
    path.join(root,"private","personal-gear.js"),
    path.join(root,"personal-gear-engine.js"),
    path.join(root,"scripts","build-private-preview.js")
  ]){
    assert.equal(fs.readFileSync(file,"utf8").includes("classification-strategy-v1.staging"),false,file);
  }
});
