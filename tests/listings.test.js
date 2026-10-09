const assert = require("node:assert/strict");
const test = require("node:test");
const listings = require("../data/listings.js");

test("cheapest valid in-stock listing wins regardless of affiliate status", () => {
  const chosen = listings.chooseCheapest([
    { price_amount:19800, in_stock:true, affiliate:true },
    { price_amount:17800, in_stock:true, affiliate:false },
    { price_amount:16000, in_stock:false, affiliate:true }
  ]);
  assert.equal(chosen.price_amount, 17800);
  assert.equal(chosen.affiliate, false);
});

test("recommendation ranking ignores monetization", () => {
  const ranked = listings.recommendationRankMustIgnoreMonetization([
    { id:"affiliate", recommendation_score:70, commission_rate:20 },
    { id:"best_fit", recommendation_score:95, commission_rate:0 }
  ]);
  assert.equal(ranked[0].id, "best_fit");
});