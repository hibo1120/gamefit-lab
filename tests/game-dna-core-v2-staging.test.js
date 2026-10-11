const assert=require("node:assert/strict");
const test=require("node:test");
const core=require("../data/game-dna-core-v2.staging.js");
const legacy=require("../data/game-dna.js");
const engine=require("../personal-gear-engine.js");
const prefs=require("../preference-engine.js");

test("staging Game DNA core keeps exact Game/Input profiles",()=>{
  assert.equal(core.get("valorant","mnk").game_id,"valorant");
  assert.equal(core.get("apex","controller").input_method,"controller");
  assert.equal(core.get("valorant","controller"),null);
  assert.equal(core.get("unknown","mnk"),null);
});

test("all staging profiles are context-only and valid",()=>{
  for(const profile of Object.values(core.profiles)){
    assert.deepEqual(core.validateProfile(profile),[]);
    assert.equal(profile.ranking_mode,"context_only");
    assert.equal(profile.adoption_ranking_effect,"none");
    assert.deepEqual(profile.game_specific_attribute_weights,{});
  }
});

test("category relevance comes from input method rather than game label",()=>{
  assert.deepEqual(core.get("valorant","mnk").allowed_categories,core.get("cs2","mnk").allowed_categories);
  assert.deepEqual(core.get("valorant","mnk").allowed_categories,core.get("apex","mnk").allowed_categories);
  assert.ok(core.get("apex","controller").allowed_categories.includes("controller"));
  assert.equal(core.get("apex","controller").allowed_categories.includes("mouse"),false);
  assert.equal(core.get("apex","controller").allowed_categories.includes("keyboard"),false);
});

test("legacy motor dimensions are explicitly held from game-specific ranking",()=>{
  assert.equal(core.legacyAudit.status,"hold_for_game_specific_ranking");
  for(const dimension of legacy.DIMENSIONS) assert.ok(core.LEGACY_MOTOR_DIMENSIONS.includes(dimension),dimension);
  const payload={ game_id:"valorant",flicking:"high",nested:{performance_traits:{precise_tracking:1}} };
  const errors=core.findProhibitedFields(payload);
  assert.ok(errors.some(error=>error.includes("flicking")));
  assert.ok(errors.some(error=>error.includes("performance_traits")));
});

test("generic FPS facts remain reference-only and personal-fit aware",()=>{
  const mouse=core.genericCategoryFacts.mouse;
  assert.equal(mouse.scope,"generic_fps_not_game_specific");
  assert.equal(mouse.ranking_effect,"none");
  assert.ok(mouse.relevant_attributes.includes("click_latency"));
  assert.ok(mouse.relevant_attributes.includes("shape"));
  assert.ok(mouse.personal_fit_required_for.includes("shape"));
});

test("Pro adoption sources are never ranking evidence",()=>{
  for(const id of ["prosettings-valorant-mouse-2026","prosettings-cs2-mouse-2026","prosettings-apex-mouse-2026"]){
    assert.equal(core.sourceRegistry[id].source_type,"esports_adoption");
    assert.match(core.sourceRegistry[id].use_note,/Never performance or Personal Fit proof/);
  }
});

test("game-specific peripheral ranking promotion is fail-closed",()=>{
  const result=core.canPromoteGameSpecificRanking({synthetic:true});
  assert.equal(result.eligible,false);
  assert.equal(result.status,"HOLD");
  assert.match(result.required_next,/real outcomes/);
});

test("staging module is not imported by current recommendation engine or Private Game DNA",()=>{
  const engineSource=require("node:fs").readFileSync(require("node:path").join(__dirname,"..","personal-gear-engine.js"),"utf8");
  const legacySource=require("node:fs").readFileSync(require("node:path").join(__dirname,"..","data","game-dna.js"),"utf8");
  assert.equal(engineSource.includes("game-dna-core-v2.staging"),false);
  assert.equal(legacySource.includes("game-dna-core-v2.staging"),false);
});

test("existing recommendation remains governed by current engine during staging",()=>{
  const input={
    game_id:"apex",
    input_method:"controller",
    profile:prefs.createProfile(),
    current_gear:{category:"controller",performance_score:0.4},
    candidates:[]
  };
  const result=engine.recommendUpgrades(input);
  assert.equal(result.game_context.input_method,"controller");
});
