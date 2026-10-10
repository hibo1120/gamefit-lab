(function (root, factory) {
  const api = factory();
  root.GameFitAdversarialFixtures = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const cases = Object.freeze([
    Object.freeze({ id:"shape-close-but-disliked", risk:"hard_avoid_bypass", expected:{ upgrade_match:"AVOID" }, note:"Candidate looks familiar but repeats an explicitly disliked shape." }),
    Object.freeze({ id:"flagship-small-delta", risk:"popular_product_bias", expected:{ upgrade_match:"DONT_UPGRADE" }, note:"A flagship is not an upgrade when verified current-gear delta is negligible." }),
    Object.freeze({ id:"pro-adoption-poor-fit", risk:"popular_product_bias", expected:{ rank_change_from_adoption:false }, note:"Pro adoption is not personal fit proof." }),
    Object.freeze({ id:"affiliate-low-fit", risk:"affiliate_bias", expected:{ rank_change_from_affiliate:false }, note:"Commission and listing state are excluded." }),
    Object.freeze({ id:"non-affiliate-best", risk:"affiliate_bias", expected:{ first_product_id:"best-fit-no-affiliate" }, note:"The best fit remains first without a merchant destination." }),
    Object.freeze({ id:"new-product-grade-d", risk:"low_confidence_overclaim", expected:{ confidence:"Low", upgrade_match:"DONT_UPGRADE" }, note:"New and unsupported products are not purchase advice." }),
    Object.freeze({ id:"contradictory-community", risk:"fake_consensus", expected:{ consensus:"mixed", confidence:"Low" }, note:"Contradictory subjective claims are retained." }),
    Object.freeze({ id:"performance-high-compatibility-ng", risk:"incompatible_recommendation", expected:{ upgrade_match:"AVOID" }, note:"Performance cannot override incompatibility." }),
    Object.freeze({ id:"monitor-240-os-144", risk:"fix_before_buy", expected:{ decision:"DONT_UPGRADE", reason_code:"fix_before_buy" }, note:"OS refresh configuration is fixed before buying." }),
    Object.freeze({ id:"apex-controller-mouse", risk:"cross_game_input", expected:{ upgrade_match:"AVOID" }, note:"Mouse candidates never enter the controller recommendation space." }),
    Object.freeze({ id:"missing-hard-avoid-attribute", risk:"hard_avoid_bypass", expected:{ upgrade_match:"DONT_UPGRADE" }, note:"Ask for the missing attribute instead of assuming safety." }),
    Object.freeze({ id:"normalized-hard-avoid-type", risk:"raw_normalized_mismatch", expected:{ upgrade_match:"AVOID" }, note:"80, 80 g, and 0.08 kg compare as the same weight." })
  ]);

  const calibration = Object.freeze({
    status:"provisional_fixture_only",
    has_real_outcomes:false,
    disclosure:"These labels exercise calibration failure modes and are not evidence of real-world accuracy.",
    samples:Object.freeze([
      Object.freeze({ id:"high-confidence-wrong", predicted_probability:0.9, success:false, synthetic:true }),
      Object.freeze({ id:"high-confidence-correct", predicted_probability:0.9, success:true, synthetic:true }),
      Object.freeze({ id:"low-confidence-correct", predicted_probability:0.2, success:true, synthetic:true }),
      Object.freeze({ id:"low-confidence-wrong", predicted_probability:0.2, success:false, synthetic:true })
    ])
  });

  return { cases, calibration };
});
