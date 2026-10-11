(function(root,factory){
  const api=factory();
  root.GameFitGameDnaCoreV2Staging=api;
  if(typeof module==="object"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const CHECKED_AT="2026-10-11";
  const POLICY_VERSION="gamefit-game-context-core-v2-staging";

  const INPUT_CATEGORY_MAP=Object.freeze({
    mnk:Object.freeze(["mouse","keyboard","mousepad","monitor","audio","network","cable"]),
    controller:Object.freeze(["controller","monitor","audio","network","cable"])
  });

  const LEGACY_MOTOR_DIMENSIONS=Object.freeze([
    "flicking","micro_correction","precise_tracking","reactive_tracking","target_switching",
    "vertical_movement","recoil_control","movement_precision","key_input_demand",
    "visual_clarity","audio_positioning"
  ]);

  const PROHIBITED_GAME_RANKING_FIELDS=Object.freeze([
    ...LEGACY_MOTOR_DIMENSIONS,
    "game_specific_weight","game_specific_weights","attribute_weights","ranking_weight",
    "performance_score","game_fit_score","game_fitness","performance_traits",
    "role_weight","weapon_weight","style_weight","adoption_weight","pro_usage_weight"
  ]);

  const sourceRegistry=Object.freeze({
    "rtings-fps-mouse-2026":Object.freeze({
      source_id:"rtings-fps-mouse-2026",
      source_type:"independent_lab_editorial",
      source_url:"https://www.rtings.com/mouse/reviews/best/fps",
      checked_at:CHECKED_AT,
      claim_scope:"generic_fps_mouse_attributes",
      use_note:"Reference-only normalized facts: low latency and weight are relevant to FPS mice; shape remains personal-fit dependent. No game-specific weighting is inferred."
    }),
    "prosettings-valorant-mouse-2026":Object.freeze({
      source_id:"prosettings-valorant-mouse-2026",
      source_type:"esports_adoption",
      source_url:"https://prosettings.net/guides/valorant-mouse/",
      checked_at:CHECKED_AT,
      claim_scope:"valorant_mouse_adoption",
      use_note:"Adoption/reference signal only. Never performance or Personal Fit proof."
    }),
    "prosettings-cs2-mouse-2026":Object.freeze({
      source_id:"prosettings-cs2-mouse-2026",
      source_type:"esports_adoption",
      source_url:"https://prosettings.net/guides/cs2-mouse/",
      checked_at:CHECKED_AT,
      claim_scope:"cs2_mouse_adoption",
      use_note:"Adoption/reference signal only. Never performance or Personal Fit proof."
    }),
    "prosettings-apex-mouse-2026":Object.freeze({
      source_id:"prosettings-apex-mouse-2026",
      source_type:"esports_adoption",
      source_url:"https://prosettings.net/guides/apex-legends-mouse/",
      checked_at:CHECKED_AT,
      claim_scope:"apex_mouse_adoption",
      use_note:"Adoption/reference signal only. Never performance or Personal Fit proof."
    }),
    "ea-apex-input-2026":Object.freeze({
      source_id:"ea-apex-input-2026",
      source_type:"official_game_publisher",
      source_url:"https://www.ea.com/games/apex-legends/about/pc-system-requirements",
      checked_at:CHECKED_AT,
      claim_scope:"apex_pc_input_support",
      use_note:"Official context fact only: Apex PC supports configurable mouse and controller input."
    })
  });

  const genericCategoryFacts=Object.freeze({
    mouse:Object.freeze({
      scope:"generic_fps_not_game_specific",
      ranking_effect:"none",
      evidence_status:"reference_only",
      relevant_attributes:Object.freeze(["click_latency","sensor_latency","weight","shape"]),
      personal_fit_required_for:Object.freeze(["shape","weight"]),
      source_ids:Object.freeze(["rtings-fps-mouse-2026"])
    })
  });

  function profile(game_id,input_method,extra={}){
    const allowed=INPUT_CATEGORY_MAP[input_method];
    if(!allowed) throw new Error("unsupported input method");
    return Object.freeze({
      policy_version:POLICY_VERSION,
      game_id,
      input_method,
      context_mode:"exact_game_input",
      ranking_mode:"context_only",
      game_specific_attribute_weights:Object.freeze({}),
      adoption_ranking_effect:"none",
      allowed_categories:Object.freeze([...allowed]),
      separate_pc_performance_layer:true,
      evidence_status:"staging_unvalidated_for_game_specific_ranking",
      checked_at:CHECKED_AT,
      ...extra
    });
  }

  const profiles=Object.freeze({
    valorant_mnk:profile("valorant","mnk",{ source_ids:Object.freeze(["prosettings-valorant-mouse-2026"]) }),
    apex_mnk:profile("apex","mnk",{ source_ids:Object.freeze(["prosettings-apex-mouse-2026","ea-apex-input-2026"]) }),
    apex_controller:profile("apex","controller",{ source_ids:Object.freeze(["ea-apex-input-2026"]) }),
    cs2_mnk:profile("cs2","mnk",{ source_ids:Object.freeze(["prosettings-cs2-mouse-2026"]) }),
    overwatch2_mnk:profile("overwatch2","mnk",{ source_ids:Object.freeze([]) }),
    fortnite_mnk:profile("fortnite","mnk",{ source_ids:Object.freeze([]) })
  });

  const legacyAudit=Object.freeze({
    dimensions:LEGACY_MOTOR_DIMENSIONS,
    status:"hold_for_game_specific_ranking",
    reason_codes:Object.freeze([
      "independent_game_specific_attribute_weight_evidence_insufficient",
      "pro_adoption_not_personal_fit",
      "same_high_end_fps_products_span_multiple_games",
      "personal_preference_and_current_gear_delta_should_dominate_until_outcomes"
    ]),
    allowed_use:"internal_hypothesis_only"
  });

  function get(gameId,inputMethod){
    return profiles[String(gameId||"")+"_"+String(inputMethod||"")]||null;
  }

  function findProhibitedFields(value,path="$",seen=new Set()){
    if(!value||typeof value!=="object") return [];
    if(seen.has(value)) return [path+" contains a cycle"];
    seen.add(value);
    const errors=[];
    for(const [key,nested] of Object.entries(value)){
      const next=Array.isArray(value)?path+"["+key+"]":path+"."+key;
      if(PROHIBITED_GAME_RANKING_FIELDS.includes(key)) errors.push(next+" is prohibited in context-only Game DNA");
      errors.push(...findProhibitedFields(nested,next,seen));
    }
    seen.delete(value);
    return errors;
  }

  function validateProfile(value){
    const errors=[];
    if(!value?.game_id) errors.push("game_id is required");
    if(!value?.input_method) errors.push("input_method is required");
    if(value?.context_mode!=="exact_game_input") errors.push("context_mode must be exact_game_input");
    if(value?.ranking_mode!=="context_only") errors.push("ranking_mode must be context_only");
    if(value?.adoption_ranking_effect!=="none") errors.push("adoption_ranking_effect must be none");
    if(!value?.game_specific_attribute_weights || Object.keys(value.game_specific_attribute_weights).length!==0) errors.push("game_specific_attribute_weights must be empty");
    const expected=INPUT_CATEGORY_MAP[value?.input_method];
    if(!expected) errors.push("unsupported input_method");
    if(!Array.isArray(value?.allowed_categories) || !expected || value.allowed_categories.join("|")!==expected.join("|")) errors.push("allowed_categories must be input-derived");
    if(value?.separate_pc_performance_layer!==true) errors.push("PC performance must remain a separate layer");
    errors.push(...findProhibitedFields(value));
    return [...new Set(errors)];
  }

  function canPromoteGameSpecificRanking(evidence){
    return Object.freeze({
      eligible:false,
      status:"HOLD",
      reason:"No current GameFit real-outcome evidence demonstrates that game-specific peripheral attribute weights improve decisions beyond exact Game/Input isolation, Personal Preference, Current Gear Delta, Compatibility, and Evidence.",
      required_next:"Pre-register a separate validation using real outcomes before defining any game-specific ranking weight.",
      evidence_present:Boolean(evidence)
    });
  }

  return {
    CHECKED_AT,
    POLICY_VERSION,
    INPUT_CATEGORY_MAP,
    LEGACY_MOTOR_DIMENSIONS,
    PROHIBITED_GAME_RANKING_FIELDS,
    sourceRegistry,
    genericCategoryFacts,
    profiles,
    legacyAudit,
    get,
    findProhibitedFields,
    validateProfile,
    canPromoteGameSpecificRanking
  };
});
