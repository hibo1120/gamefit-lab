(function (root, factory) {
  const api = factory();
  root.GameFitConversionFunnelFixtures = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  let sequence = 0;
  const event = (journeyId, name, properties = {}) => Object.freeze({
    name,
    properties: Object.freeze({ journey_id: journeyId, category:"mouse", game_id:"apex", input_method:"mnk", source:"private_fixture", content_id:"pgi-private-v1", entry_offer:"diagnosis", campaign:"pgi-validation-v1", cohort:"internal", locale:"ja", traffic_class:"tester", sequence, elapsed_ms:sequence++ * 1000, ...properties })
  });
  const fullPath = (id, decision) => [
    event(id,"landing_viewed"), event(id,"demand_qualified",{ shopping_state:"actively_shopping", purchase_window:"within_90_days", problem_state:"specific_problem" }),
    event(id,"my_setup_started"), event(id,"gear_taste_completed",{ attributes_count:4 }),
    event(id,"next_upgrade_reached"), event(id,"decision_viewed",{ decision, affiliate_eligible:decision !== "DONT_UPGRADE", top_candidate_id:"fixture-candidate" }),
    event(id,"regret_shield_viewed",{ risk_level:"low", confidence_label:"Low" })
  ];
  const review = overrides => ({ flow_completed:true, reason_understood:true, intended_judgment:"compare_more", assistance_level:"none", severe_error:false, privacy_incident:false, game_input_contamination:false, hard_avoid_violation:false, compatibility_major_violation:false, affiliate_rank_influence:false, ux_issue_codes:["none"], ...(overrides||{}) });
  const events = Object.freeze([
    ...fullPath("accepted-fit","BETTER_FIT"),
    event("accepted-fit","recommendation_feedback",{ verdict:"agree" }),
    event("accepted-fit","purchase_route_intent",{ destination_type:"marketplace", commercial_relationship:"affiliate", merchant_id:"fixture-store" }),
    event("accepted-fit","session_review_completed",review()),
    ...fullPath("no-upgrade-win","DONT_UPGRADE"),
    event("no-upgrade-win","why_not_opened"),
    event("no-upgrade-win","dont_upgrade_response",{ accepted:true }),
    event("no-upgrade-win","save_return_intent",{ intent:"return" }),
    event("no-upgrade-win","session_review_completed",review({ intended_judgment:"keep_current" })),
    ...fullPath("corrected-win","SAFE / FAMILIAR"),
    event("corrected-win","why_not_opened"),
    event("corrected-win","recommendation_feedback",{ verdict:"disagree" }),
    event("corrected-win","rerank_requested",{ reason_count:2, direction_count:1, reason_codes:["shape","weight"], desired_direction_codes:["lighter"] }),
    event("corrected-win","rerank_completed",{ rerank_success:true, confidence_change:"unchanged" }),
    event("corrected-win","save_return_intent",{ intent:"save" }),
    event("corrected-win","session_review_completed",review()),
    event("dropoff","landing_viewed"), event("dropoff","my_setup_started")
  ]);
  return { version:1, events, external_sending_enabled:false, purchase_required:false };
});
