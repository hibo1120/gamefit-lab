(function (root, factory) {
  const api = factory();
  root.GameFitFeedback = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERDICTS = Object.freeze(["agree","disagree","unsure"]);
  const OUTCOMES = Object.freeze(["great","good","neutral","poor","bad"]);

  function recommendationFeedback(input) {
    if (!VERDICTS.includes(input.verdict)) throw new Error("invalid verdict");
    return {
      type:"recommendation_feedback",
      product_id:input.product_id || null,
      game_id:input.game_id || null,
      verdict:input.verdict,
      reason_codes:[...new Set(input.reason_codes || [])],
      desired_direction_codes:[...new Set(input.desired_direction_codes || [])],
      scope:"personal",
      created_at:input.created_at || null
    };
  }

  function postPurchaseOutcome(input) {
    if (!OUTCOMES.includes(input.outcome)) throw new Error("invalid outcome");
    return {
      type:"post_purchase_outcome",
      product_id:input.product_id,
      prior_product_id:input.prior_product_id || null,
      game_id:input.game_id || null,
      outcome:input.outcome,
      still_using:input.still_using === true,
      returned_to_previous:input.returned_to_previous === true,
      sold_or_replaced:input.sold_or_replaced === true,
      reason_codes:[...new Set(input.reason_codes || [])],
      created_at:input.created_at || null
    };
  }

  function globalLearningEligible(records, minIndependent=3) {
    const valid = records.filter(item => item && item.scope !== "blocked");
    const uniqueUsers = new Set(valid.map(item => item.user_key).filter(Boolean));
    return uniqueUsers.size >= minIndependent;
  }

  return { VERDICTS, OUTCOMES, recommendationFeedback, postPurchaseOutcome, globalLearningEligible };
});
