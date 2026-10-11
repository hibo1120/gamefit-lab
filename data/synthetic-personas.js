(function (root, factory) {
  const api = factory();
  root.GameFitSyntheticPersonas = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const EXPERTISE = Object.freeze(["beginner", "intermediate", "enthusiast"]);
  const DEFAULT_OBJECTION = Object.freeze({
    verdict:"disagree",
    reason_codes:Object.freeze(["current_gear_delta_small"]),
    desired_direction_codes:Object.freeze(["do_not_upgrade"])
  });

  const archetypes = Object.freeze([
    { id:"valorant-mnk-baseline", category:"mouse", game_id:"valorant", input_method:"mnk", current_product_id:"mouse-razer-viper-v3-pro", budget:30000, tags:["valorant_mnk","satisfied_current"], objection:{ verdict:"disagree", reason_codes:["shape"], desired_direction_codes:["safer_familiar"] } },
    { id:"apex-mnk-baseline", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-logitech-g305", budget:30000, tags:["apex_mnk","current_gear_dissatisfied"], objection:{ verdict:"disagree", reason_codes:["weight"], desired_direction_codes:["lighter"] } },
    { id:"apex-controller-baseline", category:"controller", game_id:"apex", input_method:"controller", current_product_id:"controller-xbox-wireless", budget:30000, tags:["apex_controller","current_gear_dissatisfied"], objection:{ verdict:"disagree", reason_codes:["size"], desired_direction_codes:["smaller"] } },
    { id:"satisfied-current", category:"keyboard", game_id:"valorant", input_method:"mnk", current_product_id:"keyboard-wooting-60he-plus", budget:60000, tags:["satisfied_current","no_purchase_needed"], objection:DEFAULT_OBJECTION },
    { id:"strong-buy-intent", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-logitech-g305", budget:60000, tags:["strong_buy_intent","performance_focus"], objection:{ verdict:"disagree", reason_codes:["game_fit"], desired_direction_codes:["higher_performance"] } },
    { id:"no-purchase-needed", category:"audio", game_id:"apex", input_method:"controller", current_product_id:"audio-audeze-maxwell-2", budget:60000, tags:["satisfied_current","no_purchase_needed"], objection:DEFAULT_OBJECTION },
    { id:"budget-focus", category:"mousepad", game_id:"valorant", input_method:"mnk", current_product_id:"mousepad-logitech-g640", budget:10000, tags:["budget_focus"], objection:{ verdict:"disagree", reason_codes:["price"], desired_direction_codes:["cheaper"] } },
    { id:"performance-focus", category:"keyboard", game_id:"valorant", input_method:"mnk", current_product_id:"keyboard-keychron-k2-he", budget:120000, tags:["performance_focus"], objection:{ verdict:"disagree", reason_codes:["game_fit"], desired_direction_codes:["higher_performance"] } },
    { id:"brand-dislike", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-logitech-g305", budget:60000, tags:["brand_dislike"], objection:{ verdict:"disagree", reason_codes:["brand"], desired_direction_codes:["different_brand"] } },
    { id:"hard-avoid-rear-hump", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-razer-viper-v4-pro", budget:60000, tags:["hard_avoid"], hard_avoid:{ attribute:"hump", operator:"equals", value:"rear", reason_code:"explicit_hard_avoid" }, objection:{ verdict:"disagree", reason_codes:["shape"], desired_direction_codes:["lower_hump"] } },
    { id:"unusual-gear", category:"audio", game_id:"apex", input_method:"controller", current_product_id:"not_listed", budget:30000, tags:["unusual_gear","product_not_in_catalog"], objection:{ verdict:"unsure", reason_codes:[], desired_direction_codes:[] } },
    { id:"product-not-in-catalog", category:"monitor", game_id:"valorant", input_method:"mnk", current_product_id:"not_listed", budget:120000, tags:["product_not_in_catalog"], objection:{ verdict:"unsure", reason_codes:[], desired_direction_codes:[] } },
    { id:"low-evidence-product", category:"keyboard", game_id:"apex", input_method:"mnk", current_product_id:"keyboard-wooting-60he-plus", budget:60000, tags:["low_evidence_product"], objection:{ verdict:"disagree", reason_codes:["durability"], desired_direction_codes:["safer_familiar"] } },
    { id:"contradictory-preference", category:"mouse", game_id:"valorant", input_method:"mnk", current_product_id:"mouse-logitech-g305", budget:30000, tags:["contradictory_preference"], contradictory_preference:true, objection:{ verdict:"disagree", reason_codes:["weight","size"], desired_direction_codes:["lighter","larger"] } },
    { id:"wifi-misattributed", category:"network", game_id:"apex", input_method:"controller", current_product_id:"network-asus-rt-ax86u-pro", budget:60000, tags:["wifi_problem_misattributed"], setup_flags:{ wifi_problem:true }, objection:{ verdict:"disagree", reason_codes:["game_fit"], desired_direction_codes:["higher_performance"] } },
    { id:"monitor-240-os-144", category:"monitor", game_id:"valorant", input_method:"mnk", current_product_id:"monitor-zowie-xl2546k", budget:120000, tags:["monitor_240_os_144"], setup_flags:{ os_refresh_144:true }, objection:{ verdict:"disagree", reason_codes:["current_gear_delta_small"], desired_direction_codes:["do_not_upgrade"] } },
    { id:"high-polling-via-hub", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-razer-viper-v3-pro", budget:60000, tags:["high_polling_via_hub"], setup_flags:{ usb_hub:true }, objection:{ verdict:"disagree", reason_codes:["software"], desired_direction_codes:["higher_performance"] } },
    { id:"cable-spec-anxiety", category:"cable", game_id:"valorant", input_method:"mnk", current_product_id:"cable-belkin-a3l980b05m-s-cat6", budget:10000, tags:["cable_overconcern"], setup_flags:{ cable_need_unknown:true }, objection:{ verdict:"disagree", reason_codes:["price"], desired_direction_codes:["cheaper"] } },
    { id:"flagship-hype", category:"monitor", game_id:"apex", input_method:"controller", current_product_id:"monitor-zowie-xl2566x-plus", budget:250000, tags:["flagship_bias_probe","strong_buy_intent"], objection:{ verdict:"disagree", reason_codes:["price"], desired_direction_codes:["safer_familiar"] } },
    { id:"pro-adoption-hype", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-logitech-g305", budget:60000, tags:["pro_adoption_bias_probe"], objection:{ verdict:"disagree", reason_codes:["shape"], desired_direction_codes:["safer_familiar"] } },
    { id:"affiliate-temptation", category:"controller", game_id:"apex", input_method:"controller", current_product_id:"controller-xbox-wireless", budget:60000, tags:["affiliate_bias_probe"], objection:{ verdict:"disagree", reason_codes:["price"], desired_direction_codes:["cheaper"] } },
    { id:"apex-controller-mouse", category:"mouse", game_id:"apex", input_method:"controller", current_product_id:"mouse-logitech-g305", budget:30000, tags:["apex_controller","game_input_contamination_probe"], objection:{ verdict:"unsure", reason_codes:[], desired_direction_codes:[] } },
    { id:"apex-mnk-controller", category:"controller", game_id:"apex", input_method:"mnk", current_product_id:"controller-xbox-wireless", budget:30000, tags:["apex_mnk","game_input_contamination_probe"], objection:{ verdict:"unsure", reason_codes:[], desired_direction_codes:[] } },
    { id:"verified-lane", category:"mouse", game_id:"apex", input_method:"mnk", current_product_id:"mouse-razer-viper-v3-pro", budget:30000, tags:["verified_non_dont_probe"], verified_case_by_expertise:{ beginner:0, intermediate:1, enthusiast:2 }, objection:{ verdict:"disagree", reason_codes:["shape"], desired_direction_codes:["safer_familiar"] } }
  ]);

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function buildPersonas() {
    return Object.freeze(archetypes.flatMap(archetype => EXPERTISE.map(expertise => Object.freeze({
      ...clone(archetype),
      persona_id:`syn-${archetype.id}-${expertise}`,
      expertise,
      synthetic:true,
      real_tester_eligible:false,
      platform:archetype.platform || "windows_pc",
      objection:clone(archetype.objection || DEFAULT_OBJECTION)
    }))));
  }

  return { EXPERTISE, archetypes, buildPersonas };
});
