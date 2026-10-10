(function (root, factory) {
  const api = factory();
  root.GameFitPriority = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const DEFAULT_WEIGHTS = Object.freeze({
    improvement_impact:0.35,
    game_fit:0.20,
    current_gear_delta:0.15,
    price_efficiency:0.15,
    evidence_strength:0.10,
    risk_compatibility:0.05
  });

  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function scoreCategory(input, weights=DEFAULT_WEIGHTS) {
    const parts = {
      improvement_impact:clamp01(input.improvement_impact),
      game_fit:clamp01(input.game_fit),
      current_gear_delta:clamp01(input.current_gear_delta),
      price_efficiency:clamp01(input.price_efficiency),
      evidence_strength:clamp01(input.evidence_strength),
      risk_compatibility:clamp01(input.risk_compatibility)
    };
    const score = Object.entries(weights).reduce((sum,[key,weight]) => sum + parts[key] * weight, 0);
    return Math.round(score * 100);
  }

  function rankCategories(items, weights=DEFAULT_WEIGHTS) {
    return [...items]
      .map(item => ({ ...item, priority_score:scoreCategory(item, weights) }))
      .sort((a,b)=>b.priority_score-a.priority_score);
  }

  function shouldKeepCurrent(topScore, threshold=35) {
    return Number(topScore || 0) < threshold;
  }

  return { DEFAULT_WEIGHTS, scoreCategory, rankCategories, shouldKeepCurrent };
});
