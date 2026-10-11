(function (root, factory) {
  const api = factory();
  root.GameFitDecisionReadiness = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const BUYABLE = new Set(["available","mature","discounting"]);
  function evaluate(input={}) {
    const candidate = input.candidate || {};
    const scored = input.scored || {};
    const delta = candidate.current_gear_delta_assessment || scored.current_gear_delta_assessment || {};
    const compatibility = candidate.compatibility_assessment || scored.compatibility_assessment || {};
    const regret = scored.regret_shield || {};
    const price = input.price_assessment || {};
    const relevantGrades = input.relevant_attribute_grades || [];
    const checks = {
      exact_game_input_profile:input.exact_game_input_profile === true,
      exact_sku_variant:candidate.variant_scope === "exact" && Boolean(candidate.variant_id),
      buyable_lifecycle:BUYABLE.has(candidate.lifecycle_state),
      comparable_current_delta:delta.assessment_type === "evidence_delta" && ["known","partial"].includes(delta.status) && delta.confidence !== "Low" && Number(delta?.coverage?.critical_compared || 0) >= 2 && Number.isFinite(Number(delta.model_score)),
      supported_positive_delta:Number(delta.benefit_count || 0) >= 1 && Number(delta.regression_count || 0) === 0 && ["limited_change","meaningful_change"].includes(delta.delta_band),
      known_safe_compatibility:compatibility.assessment_type === "rule_evaluation" && compatibility.status === "compatible" && Array.isArray(compatibility.unknowns) && compatibility.unknowns.length === 0,
      hard_avoid_clear:regret.should_block !== true && regret.requires_clarification !== true,
      relevant_attribute_evidence:relevantGrades.length >= 2 && relevantGrades.every(grade => ["A","B","C"].includes(grade)),
      product_evidence_not_d:["A","B","C"].includes(candidate.evidence_grade),
      affiliate_not_used:input.affiliate_used_in_ranking !== true,
      setup_checked:input.setup_assessment_valid === true && input.high_priority_fix !== true,
      price_context_safe:price.status === "known" && price.price_fresh === true
    };
    const failed = Object.entries(checks).filter(([,passed])=>!passed).map(([code])=>code);
    return {
      eligible:failed.length === 0,
      decision:failed.length ? "DONT_UPGRADE_OR_CLARIFY" : "NON_DONT_ALLOWED",
      confidence_cap:"Medium",
      checks,
      failed_checks:failed,
      policy:"Unknown values are excluded, never converted to zero. Affiliate status is not an input."
    };
  }
  return { evaluate };
});
