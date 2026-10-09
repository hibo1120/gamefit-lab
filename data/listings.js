(function (root, factory) {
  const api = factory();
  root.GameFitListings = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function validateListing(listing) {
    const errors = [];
    for (const key of ["listing_id","product_id","merchant_id","region","currency"]) {
      if (listing?.[key] === undefined || listing?.[key] === "") errors.push(key + " is required");
    }
    if (listing?.destination_url && !/^https:\/\//i.test(listing.destination_url)) errors.push("destination_url must use https");
    if (listing?.price_amount != null && (!Number.isFinite(Number(listing.price_amount)) || Number(listing.price_amount) < 0)) {
      errors.push("price_amount must be a non-negative number");
    }
    return errors;
  }

  function chooseCheapest(listings) {
    return [...(listings || [])]
      .filter(item => item.in_stock !== false && Number.isFinite(Number(item.price_amount)))
      .sort((a,b)=>Number(a.price_amount)-Number(b.price_amount))[0] || null;
  }

  function recommendationRankMustIgnoreMonetization(productScores) {
    return [...productScores].sort((a,b)=>Number(b.recommendation_score)-Number(a.recommendation_score));
  }

  return { validateListing, chooseCheapest, recommendationRankMustIgnoreMonetization };
});
