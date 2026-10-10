(function (root, factory) {
  const api = factory();
  root.GameFitGameDNA = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const DIMENSIONS = Object.freeze([
    "flicking","micro_correction","precise_tracking","reactive_tracking","target_switching",
    "vertical_movement","recoil_control","movement_precision","key_input_demand",
    "visual_clarity","audio_positioning"
  ]);

  const gameProfiles = Object.freeze({
    valorant_mnk: Object.freeze({
      game_id:"valorant", input_method:"mnk",
      traits:Object.freeze({
        flicking:"high", micro_correction:"high", precise_tracking:"medium", reactive_tracking:"low",
        target_switching:"medium", vertical_movement:"low", recoil_control:"medium", movement_precision:"high",
        key_input_demand:"high", visual_clarity:"high", audio_positioning:"high"
      }),
      notes:"Rifle/Operator and role preferences may shift weighting; this is a baseline, not a universal truth."
    }),
    apex_mnk: Object.freeze({
      game_id:"apex", input_method:"mnk",
      traits:Object.freeze({
        flicking:"medium", micro_correction:"medium", precise_tracking:"high", reactive_tracking:"high",
        target_switching:"high", vertical_movement:"high", recoil_control:"high", movement_precision:"medium",
        key_input_demand:"medium", visual_clarity:"high", audio_positioning:"high"
      }),
      notes:"Weapon range and movement style matter; SMG-heavy play can increase tracking importance."
    }),
    apex_controller: Object.freeze({
      game_id:"apex", input_method:"controller",
      traits:Object.freeze({
        flicking:"medium", micro_correction:"medium", precise_tracking:"high", reactive_tracking:"high",
        target_switching:"high", vertical_movement:"high", recoil_control:"high", movement_precision:"medium",
        key_input_demand:"low", visual_clarity:"high", audio_positioning:"high"
      }),
      notes:"Controller recommendations must not inherit mouse/keyboard-specific logic."
    }),
    cs2_mnk: Object.freeze({
      game_id:"cs2", input_method:"mnk",
      traits:Object.freeze({
        flicking:"high", micro_correction:"high", precise_tracking:"medium", reactive_tracking:"low",
        target_switching:"medium", vertical_movement:"low", recoil_control:"high", movement_precision:"high",
        key_input_demand:"high", visual_clarity:"high", audio_positioning:"high"
      }),
      notes:"Weapon role can materially change the balance between flicking and recoil control."
    }),
    overwatch2_mnk: Object.freeze({
      game_id:"overwatch2", input_method:"mnk",
      traits:Object.freeze({
        flicking:"medium", micro_correction:"medium", precise_tracking:"high", reactive_tracking:"high",
        target_switching:"high", vertical_movement:"high", recoil_control:"medium", movement_precision:"medium",
        key_input_demand:"medium", visual_clarity:"high", audio_positioning:"medium"
      }),
      notes:"Hero-specific overrides are required for high-confidence recommendations."
    }),
    fortnite_mnk: Object.freeze({
      game_id:"fortnite", input_method:"mnk",
      traits:Object.freeze({
        flicking:"high", micro_correction:"medium", precise_tracking:"medium", reactive_tracking:"medium",
        target_switching:"high", vertical_movement:"high", recoil_control:"medium", movement_precision:"high",
        key_input_demand:"high", visual_clarity:"high", audio_positioning:"medium"
      }),
      notes:"Build/edit style can increase keyboard/input requirements."
    })
  });

  function get(gameId, inputMethod="mnk") {
    const key = gameId + "_" + inputMethod;
    return gameProfiles[key] || null;
  }

  function validateProfile(profile) {
    const errors = [];
    if (!profile?.game_id) errors.push("game_id is required");
    if (!profile?.input_method) errors.push("input_method is required");
    for (const key of Object.keys(profile?.traits || {})) {
      if (!DIMENSIONS.includes(key)) errors.push("unknown trait: " + key);
      if (!["low","medium","high"].includes(profile.traits[key])) errors.push("invalid level for " + key);
    }
    return errors;
  }

  return { DIMENSIONS, gameProfiles, get, validateProfile };
});
