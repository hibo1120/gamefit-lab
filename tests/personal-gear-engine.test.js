const assert = require("node:assert/strict");
const test = require("node:test");
const prefs = require("../preference-engine.js");
const engine = require("../personal-gear-engine.js");

test("Regret Shield blocks a verified hard avoid with explicit confidence", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(), {
    category:"mouse", attribute:"hump", value:"rear_high", game_id:"apex", input_method:"mnk"
  });
  const result = engine.evaluateRegretShield({
    product_id:"mouse-risk", category:"mouse", evidence_grade:"A", attributes:{ hump:"rear_high" }
  }, profile, { game_id:"apex", input_method:"mnk" });
  assert.equal(result.risk_level, "high");
  assert.equal(result.confidence, "High");
  assert.equal(result.should_block, true);
  assert.equal(result.matches[0].match_type, "hard_avoid");
});

test("Regret Shield does not assert safety or danger when data is missing", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(), {
    category:"mouse", attribute:"hump", value:"rear_high"
  });
  const result = engine.evaluateRegretShield({
    product_id:"mouse-unknown", category:"mouse", evidence_grade:"D", attributes:{}
  }, profile, { game_id:"apex", input_method:"mnk" });
  assert.equal(result.risk_level, "unknown");
  assert.equal(result.confidence, "Low");
  assert.equal(result.conclusion, "insufficient_data");
  assert.equal(result.should_block, false);
});

test("a direction code means desired direction even when the recorded value was disliked", () => {
  const profile = prefs.recordAttributePreference(prefs.createProfile(), {
    category:"mouse", attribute:"hump", sentiment:"dislike", value:"rear_high",
    direction_code:"lower_center_hump", game_id:"apex", input_method:"mnk"
  });
  const desired = engine.calculatePreferenceFit({
    category:"mouse", attributes:{ hump:"center_low" }, direction_codes:["lower_center_hump"]
  }, profile, { game_id:"apex", input_method:"mnk" });
  const repeated = engine.calculatePreferenceFit({
    category:"mouse", attributes:{ hump:"rear_high" }, direction_codes:[]
  }, profile, { game_id:"apex", input_method:"mnk" });
  assert.equal(desired.score, 1);
  assert.equal(repeated.score, 0);
});

test("an exact hard avoid remains a conservative AVOID even with weak source confidence", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(), {
    category:"mouse", attribute:"hump", value:"rear_high"
  });
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile,
    current_gear:{ category:"mouse", performance_score:0.4 },
    candidates:[{
      product_id:"weakly-sourced-risk", category:"mouse", evidence_grade:"D",
      current_gear_delta:0.3, game_fitness:{ apex_mnk:0.9 }, value_score:0.9,
      attributes:{ hump:"rear_high" }
    }]
  });
  assert.equal(result.recommendations[0].regret_shield.confidence, "Low");
  assert.equal(result.recommendations[0].upgrade_match, "AVOID");
});

test("Upgrade Match exposes all six required decision classes", () => {
  const base = {
    compatible:true,
    components:{ current_gear_delta:0.2, preference_fit:0.6, value:0.5 },
    regret_shield:{ risk_level:"low", should_block:false },
    familiar_score:0.2
  };
  assert.equal(engine.classifyUpgradeMatch({ ...base, familiar_score:0.8 }), "SAFE / FAMILIAR");
  assert.equal(engine.classifyUpgradeMatch({ ...base, components:{ ...base.components, preference_fit:0.8 } }), "BETTER_FIT");
  assert.equal(engine.classifyUpgradeMatch({ ...base, components:{ ...base.components, value:0.8 } }), "VALUE_ALTERNATIVE");
  assert.equal(engine.classifyUpgradeMatch(base), "EXPLORE");
  assert.equal(engine.classifyUpgradeMatch({ ...base, regret_shield:{ risk_level:"high", should_block:true } }), "AVOID");
  assert.equal(engine.classifyUpgradeMatch({ ...base, components:{ ...base.components, current_gear_delta:0.03 } }), "DONT_UPGRADE");
});

test("recommendations require an exact game and input profile", () => {
  const input = { profile:prefs.createProfile(), current_gear:{ performance_score:0.5 }, candidates:[] };
  assert.equal(engine.recommendUpgrades({ ...input, game_id:"valorant", input_method:"controller" }).status, "insufficient_context");
  assert.equal(engine.recommendUpgrades({ ...input, game_id:"unknown", input_method:"mnk" }).status, "insufficient_context");
  assert.equal(engine.recommendUpgrades({ ...input, game_id:"apex", input_method:"controller" }).game_context.input_method, "controller");
});

test("input-dependent categories cannot cross MnK and controller contexts", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"controller", profile:prefs.createProfile(),
    current_gear:{ category:"controller", performance_score:0.4 },
    candidates:[{
      product_id:"mouse-only", category:"mouse", evidence_grade:"A", current_gear_delta:0.4,
      performance_traits:{ precise_tracking:1, reactive_tracking:1, target_switching:1, vertical_movement:1, recoil_control:1 },
      value_score:0.9, attributes:{ weight:55 }
    }]
  });
  assert.equal(result.recommendations[0].compatible, false);
  assert.equal(result.recommendations[0].upgrade_match, "AVOID");
});

test("ranking uses exact Apex context and ignores affiliate economics", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex",
    input_method:"mnk",
    profile:prefs.createProfile(),
    current_gear:{ category:"mouse", performance_score:0.5 },
    budget:20000,
    fix_before_buy:[],
    candidates:[
      {
        product_id:"best-fit-no-affiliate", category:"mouse", evidence_grade:"A", current_gear_delta:0.3,
        game_fitness:{ apex_mnk:{ score:0.95, evidence_grade:"B" }, valorant_mnk:{ score:0.1, evidence_grade:"B" } }, price:10000,
        similarity_to_current:0.5, attributes:{ weight:55 }, affiliate:false, commission_rate:0,
        compatible:true, compatibility_status:"compatible"
      },
      {
        product_id:"paid-but-worse", category:"mouse", evidence_grade:"A", current_gear_delta:0.2,
        game_fitness:{ apex_mnk:{ score:0.55, evidence_grade:"B" }, valorant_mnk:{ score:1, evidence_grade:"B" } }, price:14000,
        similarity_to_current:0.5, attributes:{ weight:58 }, affiliate:true, commission_rate:30,
        compatible:true, compatibility_status:"compatible"
      }
    ]
  });
  assert.equal(result.status, "ok");
  assert.equal(result.recommendations[0].product_id, "best-fit-no-affiliate");
  assert.equal(result.recommendations[0].upgrade_match, "VALUE_ALTERNATIVE");
});

test("high-priority Fix Before Buy keeps purchase decision at DONT_UPGRADE", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile:prefs.createProfile(),
    current_gear:{ category:"monitor", performance_score:0.4 },
    fix_before_buy:[{ code:"set_os_refresh_rate", priority:100 }],
    candidates:[{
      product_id:"monitor-a", category:"monitor", evidence_grade:"A", current_gear_delta:0.4,
      game_fitness:{ apex_mnk:0.9 }, value_score:0.9, attributes:{ refresh_rate:240 }
    }]
  });
  assert.equal(result.decision, "DONT_UPGRADE");
  assert.deepEqual(result.reason_codes, ["fix_before_buy"]);
});

test("evidence grade D cannot become purchase advice from self-reported fit scores", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile:prefs.createProfile(),
    current_gear:{ category:"monitor", performance_score:0 },
    candidates:[{
      product_id:"unsupported-monitor", category:"monitor", evidence_grade:"D", current_gear_delta:1,
      game_fitness:{ apex_mnk:1 }, value_score:1, attributes:{ refresh_rate:500 }
    }]
  });
  assert.equal(result.recommendations[0].confidence, "Low");
  assert.equal(result.recommendations[0].upgrade_match, "DONT_UPGRADE");
  assert.equal(result.recommendations[0].components.compatibility, null);
  assert.equal(result.decision, "DONT_UPGRADE");
});

test("missing current-gear delta stays Low confidence and stops purchase advice", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"mnk", profile:prefs.createProfile(), current_gear:{ category:"mouse" },
    candidates:[{
      product_id:"real-product-without-comparable-delta", category:"mouse", evidence_grade:"B",
      game_fitness:{ apex_mnk:{ score:0.95, evidence_grade:"B" } }, value_score:0.9,
      compatible:true, attributes:{ weight:55 }, attribute_evidence:{ weight:{ confidence:"High" } }
    }]
  }).recommendations[0];
  assert.equal(result.confidence,"Low");
  assert.equal(result.upgrade_match,"DONT_UPGRADE");
  assert.ok(result.data_gaps.includes("current_gear_delta_missing"));
});

test("input incompatibility is reflected in both decision and score component", () => {
  const result = engine.recommendUpgrades({
    game_id:"apex", input_method:"controller", profile:prefs.createProfile(),
    current_gear:{ category:"controller", performance_score:0.4 },
    candidates:[{
      product_id:"mouse-only-2", category:"mouse", evidence_grade:"A", current_gear_delta:0.5,
      game_fitness:{ apex_controller:1 }, value_score:1, attributes:{ weight:50 }
    }]
  });
  assert.equal(result.recommendations[0].components.compatibility, 0);
  assert.equal(result.recommendations[0].upgrade_match, "AVOID");
});
