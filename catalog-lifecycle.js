(function (root, factory) {
  const api = factory();
  root.GameFitCatalogLifecycle = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const STATES = Object.freeze(["catalog", "profiled", "evaluated", "verified", "legacy", "discontinued"]);
  const SIGNAL_POINTS = Object.freeze({ ownership:5, compare:4, watch:3, search:2 });

  function nextState(product, evidence={}) {
    const state = product?.catalog_state || "catalog";
    if (evidence.discontinued_confirmed) return "discontinued";
    if (evidence.legacy_confirmed) return "legacy";
    if (state === "catalog" && evidence.official_claim_count >= 2) return "profiled";
    if (state === "profiled" && evidence.attribute_evidence_count >= 3 && evidence.adversarial_fixture_passed) return "evaluated";
    if (state === "evaluated" && evidence.independent_methodology_count >= 2 && evidence.compatibility_checked && evidence.duplicate_sources_removed) return "verified";
    if (["verified", "evaluated"].includes(state) && evidence.stale_critical_claim) return "profiled";
    return state;
  }

  function enqueueDemand(events) {
    const grouped = new Map();
    for (const event of events || []) {
      if (!event?.product_id || !Object.prototype.hasOwnProperty.call(SIGNAL_POINTS, event.type)) continue;
      const current = grouped.get(event.product_id) || { product_id:event.product_id, score:0, signals:{ search:0, ownership:0, compare:0, watch:0 } };
      current.signals[event.type] += 1;
      current.score += SIGNAL_POINTS[event.type];
      grouped.set(event.product_id, current);
    }
    return [...grouped.values()].sort((a,b) => b.score - a.score || a.product_id.localeCompare(b.product_id));
  }

  function promotionDecision(product, evidence, demandEvents) {
    const queue = enqueueDemand(demandEvents);
    return {
      product_id:product.product_id,
      from:product.catalog_state || "catalog",
      to:nextState(product, evidence),
      demand_priority:queue.find(item => item.product_id === product.product_id)?.score || 0,
      rule:"Enrich on demand; lifecycle promotion requires evidence, not popularity alone."
    };
  }

  return { STATES, SIGNAL_POINTS, nextState, enqueueDemand, promotionDecision };
});
