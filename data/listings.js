(function (root, factory) {
  const api = factory();
  root.GameFitListings = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function validateListing(listing) {
    const errors = [];
    for (const key of ["listing_id","product_id","variant_id","merchant_id","region","currency","checked_at","price_amount"]) {
      if (listing?.[key] === undefined || listing?.[key] === "") errors.push(key + " is required");
    }
    if (listing?.destination_url && !/^https:\/\//i.test(listing.destination_url)) errors.push("destination_url must use https");
    if (!listing?.destination_url) errors.push("destination_url is required");
    if (typeof listing?.price_amount !== "number" || !Number.isFinite(listing.price_amount) || listing.price_amount < 0) {
      errors.push("price_amount must be a non-negative number");
    }
    return errors;
  }

  function chooseCheapest(listings, context = {}) {
    const requiredContext = ["product_id","variant_id","region","currency","as_of","max_age_days","approved_domains"];
    if (requiredContext.some(key => context[key] === undefined || context[key] === null)) return null;
    if (!Array.isArray(context.approved_domains) || context.approved_domains.length === 0) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(context.as_of) || !Number.isFinite(Number(context.max_age_days)) || Number(context.max_age_days) < 0) return null;
    const approvedDomains = new Set(context.approved_domains || []);
    const asOf = context.as_of ? new Date(context.as_of + "T00:00:00Z") : null;
    return [...(listings || [])]
      .filter(item => validateListing(item).length === 0)
      .filter(item => item.in_stock === true && typeof item.price_amount === "number" && Number.isFinite(item.price_amount))
      .filter(item => item.product_id === context.product_id)
      .filter(item => item.variant_id === context.variant_id)
      .filter(item => item.region === context.region)
      .filter(item => item.currency === context.currency)
      .filter(item => {
        try { return approvedDomains.has(new URL(item.destination_url).hostname); } catch (_) { return false; }
      })
      .filter(item => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checked_at || "")) return false;
        const checked = new Date(item.checked_at + "T00:00:00Z");
        const ageDays = (asOf - checked) / 86400000;
        return ageDays >= 0 && ageDays <= Number(context.max_age_days);
      })
      .sort((a,b)=>Number(a.price_amount)-Number(b.price_amount) ||
        String(a.listing_id || a.merchant_id || "").localeCompare(String(b.listing_id || b.merchant_id || "")))[0] || null;
  }

  function recommendationRankMustIgnoreMonetization(productScores) {
    return [...productScores].sort((a,b)=>Number(b.recommendation_score)-Number(a.recommendation_score) ||
      String(a.product_id || a.id || "").localeCompare(String(b.product_id || b.id || "")));
  }

  return { validateListing, chooseCheapest, recommendationRankMustIgnoreMonetization };
});
