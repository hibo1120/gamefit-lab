(function (root, factory) {
  const api = factory();
  root.GameFitPriceTiming = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const PHASES = Object.freeze(["launch","mature","discounting","eol"]);
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const parsed = Date.parse(value + "T00:00:00Z");
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0,10) === value;
  }
  function validHttpsUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && Boolean(parsed.hostname);
    } catch (_) {
      return false;
    }
  }
  function comparableHistory(snapshot, asOf) {
    if (snapshot?.historical_context_available !== true || !Array.isArray(snapshot.history)) return [];
    const asOfMs = Date.parse(asOf + "T00:00:00Z");
    const seenDates = new Set();
    return snapshot.history.filter(item => {
      if (!item || item.product_id !== snapshot.product_id || item.variant_id !== snapshot.variant_id ||
          item.region !== snapshot.region || item.currency !== snapshot.currency ||
          typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0 ||
          !validDate(item.checked_at)) return false;
      const dateMs = Date.parse(item.checked_at + "T00:00:00Z");
      if (!Number.isFinite(dateMs) || dateMs > asOfMs || seenDates.has(item.checked_at)) return false;
      seenDates.add(item.checked_at);
      return true;
    });
  }
  function assess(snapshot, options={}) {
    const asOf = options.as_of || new Date().toISOString().slice(0,10);
    const errors = [];
    if (typeof snapshot?.current_price !== "number" || !Number.isFinite(snapshot.current_price) || snapshot.current_price < 0) errors.push("current_price_missing");
    if (!snapshot?.currency) errors.push("currency_missing");
    if (!snapshot?.region) errors.push("region_missing");
    if (!snapshot?.product_id) errors.push("product_id_missing");
    else if (snapshot.product_id !== options.product_id) errors.push("product_id_mismatch");
    if (!snapshot?.variant_id) errors.push("variant_id_missing");
    else if (snapshot.variant_id !== options.variant_id) errors.push("variant_id_mismatch");
    if (!options.region) errors.push("evaluation_region_missing");
    else if (snapshot?.region !== options.region) errors.push("region_mismatch");
    if (!options.currency) errors.push("evaluation_currency_missing");
    else if (snapshot?.currency !== options.currency) errors.push("currency_mismatch");
    if (snapshot?.availability !== "in_stock") errors.push("availability_not_in_stock");
    if (!validHttpsUrl(snapshot?.source_url)) errors.push("listing_source_missing_or_invalid");
    if (!validDate(snapshot?.checked_at)) errors.push("price_checked_at_missing_or_invalid");
    if (!PHASES.includes(snapshot?.lifecycle_phase)) errors.push("lifecycle_phase_invalid");
    const age = validDate(snapshot?.checked_at) && validDate(asOf) ? Math.floor((Date.parse(asOf + "T00:00:00Z") - Date.parse(snapshot.checked_at + "T00:00:00Z")) / 86400000) : null;
    const fresh = Number.isFinite(age) && age >= 0 && age <= Number(options.fresh_days || 30);
    const history = comparableHistory(snapshot, asOf);
    const historical = history.length >= 3 && history.length === snapshot?.history?.length;
    return {
      status:errors.length ? "unknown" : "known",
      errors,
      current_price:typeof snapshot?.current_price === "number" ? snapshot.current_price : null,
      currency:snapshot?.currency || null,
      region:snapshot?.region || null,
      product_id:snapshot?.product_id || null,
      variant_id:snapshot?.variant_id || null,
      checked_at:snapshot?.checked_at || null,
      price_fresh:fresh,
      price_age_days:age,
      lifecycle_phase:snapshot?.lifecycle_phase || null,
      historical_context_available:historical,
      deal_score:historical ? calculateDealScore(snapshot, history) : null,
      buy_timing:historical ? "history_supported" : "unknown",
      caveat:historical ? null : "A fresh price is not proof of a deal; no Deal Score is generated without comparable price history."
    };
  }

  function calculateDealScore(snapshot, history=snapshot?.history || []) {
    const prices = history.map(item => item.price);
    if (prices.length < 3) return null;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    if (high === low) return 0.5;
    const score = (high - Number(snapshot.current_price)) / (high - low);
    return Number(Math.max(0, Math.min(1, score)).toFixed(4));
  }

  return { PHASES, assess };
});
