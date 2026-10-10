(function (root, factory) {
  const fixtures = root.GameFitPersonalGearFixtures || (typeof module === "object" && module.exports ? require("./personal-gear-fixtures.js") : null);
  const delta = root.GameFitCurrentGearDelta || (typeof module === "object" && module.exports ? require("../current-gear-delta.js") : null);
  const compatibility = root.GameFitCompatibility || (typeof module === "object" && module.exports ? require("../compatibility-engine.js") : null);
  const preferences = root.GameFitPreferences || (typeof module === "object" && module.exports ? require("../preference-engine.js") : null);
  const briefs = root.GameFitDecisionBriefEngine || (typeof module === "object" && module.exports ? require("../decision-brief-engine.js") : null);
  const api = factory(fixtures,delta,compatibility,preferences,briefs);
  root.GameFitRecommendationPairs = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (fixtures,delta,compatibility,preferences,briefs) {
  "use strict";

  function product(id) { return fixtures.products.find(item => item.product_id === id); }
  function exactGameFitness(gameId) {
    return {
      score:0.5,
      verified:true,
      assessment_type:"game_input_rules",
      source_ids:["mouse-razer-viper-v4-pro-official-1","mouse-razer-viper-v4-pro-independent_lab-4"],
      game_profile_id:gameId + "_mnk",
      rule_id:"mouse-" + gameId + "-mnk-attribute-fit-v1",
      derivation:"attribute_evidence_rule_v1",
      calibration_status:"provisional_no_outcomes",
      note:"A conservative exact-context attribute rule; no empirical game-fit uplift or pro-adoption claim is made."
    };
  }
  function candidateFor(gameId, profile) {
    const current = product("mouse-razer-viper-v3-pro");
    const base = product("mouse-razer-viper-v4-pro");
    const desiredDirections = preferences.attributePreferencesFor(profile,"mouse",{
      game_id:gameId,
      input_method:"mnk"
    }).map(item => item.direction_code).filter(Boolean);
    const assessment = delta.compareProducts(current,base,{ desired_direction_codes:desiredDirections });
    const compatibilityAssessment = compatibility.evaluateUsbCompatibility({
      high_polling_device:true, host_high_polling_support:true,
      device_connector:"usb_a", host_connector:"usb_a", verified_adapter:false
    });
    return {
      ...base,
      input_methods:["mnk"],
      direction_codes:[...desiredDirections],
      current_gear_delta_assessment:assessment,
      game_fitness:{ [gameId + "_mnk"]:exactGameFitness(gameId) },
      compatibility_assessment:compatibilityAssessment,
      compatibility_status:compatibilityAssessment.status,
      compatible:compatibilityAssessment.status === "compatible"
    };
  }
  function baseInput(gameId,profile,candidate) {
    return {
      case_version:1,
      game_id:gameId,
      input_method:"mnk",
      platform:"windows_pc",
      region:"US",
      currency:"USD",
      profile,
      current_gear:product("mouse-razer-viper-v3-pro"),
      budget:200,
      as_of:fixtures.CHECKED_DATE,
      fix_before_buy:[],
      setup_assessment:{ assessment_type:"observed_setup_checks", status:"evaluated", checks:[
        { code:"test_mouse_direct_usb", result:"pass" },
        { code:"verify_actual_usb_polling", result:"pass" }
      ] },
      candidates:[candidate],
      decision_brief_id:"usb-polling",
      decision_brief:briefs.buildResearchDigest("usb-polling")
    };
  }
  function buildCases() {
    let familiarProfile = preferences.createProfile();
    familiarProfile = preferences.recordAttributePreference(familiarProfile,{
      category:"mouse", attribute:"weight", sentiment:"neutral", direction_code:"lighter",
      game_id:"valorant", input_method:"mnk", source:"explicit"
    });
    const familiar = baseInput("valorant",familiarProfile,candidateFor("valorant",familiarProfile));

    let betterProfile = preferences.createProfile();
    betterProfile = preferences.recordAttributePreference(betterProfile,{
      category:"mouse", attribute:"weight", sentiment:"like", direction_code:"lighter",
      game_id:"apex", input_method:"mnk", source:"explicit"
    });
    const better = baseInput("apex",betterProfile,candidateFor("apex",betterProfile));

    let avoidProfile = preferences.createProfile();
    avoidProfile = preferences.addHardAvoid(avoidProfile,{
      category:"mouse", attribute:"weight", operator:"lte", value:50,
      game_id:"apex", input_method:"mnk", reason_code:"ultralight_control_loss"
    });
    const avoid = baseInput("apex",avoidProfile,candidateFor("apex",avoidProfile));
    return Object.freeze([
      Object.freeze({ id:"valorant-mnk-familiar", expected_action:"SAFE / FAMILIAR", input:familiar }),
      Object.freeze({ id:"apex-mnk-better-fit", expected_action:"BETTER_FIT", input:better }),
      Object.freeze({ id:"apex-mnk-hard-avoid", expected_action:"AVOID", input:avoid })
    ]);
  }
  return { buildCases };
});
