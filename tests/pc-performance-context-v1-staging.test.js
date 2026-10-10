const assert=require("node:assert/strict");
const test=require("node:test");
const pc=require("../data/pc-performance-context-v1.staging.js");
const fs=require("node:fs");
const path=require("node:path");

test("baseline requires only current game and core PC parts",()=>{
  assert.deepEqual(pc.validateBaseline({game_id:"valorant",cpu_id:"cpu-a",gpu_id:"gpu-a",ram_gb:16}),[]);
  assert.ok(pc.validateBaseline({game_id:"valorant",gpu_id:"gpu-a",ram_gb:16}).some(x=>x.includes("cpu_id")));
});

test("performance target is deferred until upgrade/performance intent needs it",()=>{
  const baseline={game_id:"valorant",cpu_id:"cpu-a",gpu_id:"gpu-a",ram_gb:16};
  assert.equal(pc.nextQuestion({baseline,intent:"can_run"}).state,"REQUIREMENTS_CHECK");
  assert.equal(pc.nextQuestion({baseline,intent:"upgrade"}).state,"TARGET_NEEDED");
});

test("target requires resolution fps and preset",()=>{
  assert.deepEqual(pc.validateTarget({resolution:"1440p",target_fps:144,graphics_preset:"high"}),[]);
  assert.ok(pc.validateTarget({resolution:"8k",target_fps:144,graphics_preset:"high"}).length>0);
});

test("upgrade gate requires free checks and verified limiter before replacement",()=>{
  const baseline={game_id:"valorant",cpu_id:"cpu-a",gpu_id:"gpu-a",ram_gb:16};
  const target={resolution:"1440p",target_fps:144,graphics_preset:"high"};
  assert.equal(pc.upgradeGate({baseline,intent:"upgrade",target,target_met:false}).state,"FREE_CHECK_FIRST");
  assert.equal(pc.upgradeGate({baseline,intent:"upgrade",target,target_met:false,free_checks_completed:true}).state,"VERIFY_LIMITER");
  assert.equal(pc.upgradeGate({
    baseline,intent:"upgrade",target,target_met:false,free_checks_completed:true,
    limiter_assessment:{status:"verified"},compatibility_verified:true
  }).eligible,true);
});

test("meeting the target is a valid no-upgrade outcome",()=>{
  const baseline={game_id:"cs2",cpu_id:"cpu-a",gpu_id:"gpu-a",ram_gb:16};
  const target={resolution:"1080p",target_fps:240,graphics_preset:"competitive_custom"};
  assert.equal(pc.nextQuestion({baseline,intent:"upgrade",target,target_met:true}).state,"TARGET_MET");
  assert.equal(pc.upgradeGate({baseline,intent:"upgrade",target,target_met:true}).eligible,false);
});

test("false precision fields are explicitly rejected by policy",()=>{
  assert.deepEqual(pc.prohibitFalsePrecision({bottleneck_percentage:27,exact_fps_guarantee:300}).sort(),["bottleneck_percentage","exact_fps_guarantee"].sort());
  assert.deepEqual(pc.prohibitFalsePrecision({estimated_fps_range:[180,220]}),[]);
});

test("market signals distinguish traffic reach from feature usage and catalog scale",()=>{
  assert.equal(pc.marketSignals.pcpartpicker.signal_type,"domain_reach");
  assert.equal(pc.marketSignals.system_requirements_lab.signal_type,"feature_usage_claim");
  assert.equal(pc.marketSignals.canirun_gg.signal_type,"catalog_scale");
  assert.ok(pc.marketSignals.system_requirements_lab.current_examples.valorant_last_30d>20000);
});

test("PC staging remains isolated from peripheral engine and Private Validation",()=>{
  const root=path.join(__dirname,"..");
  for(const file of [
    path.join(root,"personal-gear-engine.js"),
    path.join(root,"data","game-dna.js"),
    path.join(root,"private","personal-gear.js"),
    path.join(root,"scripts","build-private-preview.js")
  ]){
    assert.equal(fs.readFileSync(file,"utf8").includes("pc-performance-context-v1.staging"),false,file);
  }
});
