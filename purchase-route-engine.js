(function (root, factory) {
  const listingEngine = root.GameFitListings || (typeof module === "object" && module.exports ? require("./data/listings.js") : null);
  const api = factory(listingEngine);
  root.GameFitPurchaseRoutes = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (listingEngine) {
  "use strict";
  if (!listingEngine) throw new Error("GameFitListings must be loaded before purchase-route-engine.js");
  function buildRoutes({ product_id, listings = [], merchants = [], affiliate_programs = [] }) {
    const merchantById = new Map(merchants.map(item => [item.merchant_id,item]));
    const programByMerchant = new Map(affiliate_programs.map(item => [item.merchant_id,item]));
    return listings.filter(item => item.product_id === product_id).map(listing => {
      const merchant = merchantById.get(listing.merchant_id) || null;
      const program = programByMerchant.get(listing.merchant_id) || null;
      return Object.freeze({
        product_id,
        listing:Object.freeze({ ...listing }),
        merchant:merchant ? Object.freeze({ ...merchant }) : null,
        affiliate_program:program ? Object.freeze({ ...program }) : null,
        affiliate_enabled:Boolean(program?.status === "approved" && /^https:\/\//i.test(program?.tracking_url || ""))
      });
    });
  }
  function selectRoute(routes, context) {
    const eligible = (routes || []).filter(route => route.merchant && route.merchant.enabled !== false);
    const chosen = listingEngine.chooseCheapest(eligible.map(route => route.listing),context);
    return chosen ? eligible.find(route => route.listing.listing_id === chosen.listing_id) || null : null;
  }
  return { buildRoutes, selectRoute, ranking_inputs:Object.freeze(["in_stock","price_amount","listing_id"]) };
});
