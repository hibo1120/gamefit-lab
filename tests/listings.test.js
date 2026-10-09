const assert = require("node:assert/strict");
const test = require("node:test");
const listings = require("../data/listings.js");

test("cheapest valid in-stock listing wins regardless of affiliate status", () => {
  const context = { product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["a.example","b.example","c.example"] };
  const chosen = listings.chooseCheapest([
    { listing_id:"a", product_id:"p", variant_id:"v", merchant_id:"m1", region:"JP", currency:"JPY", checked_at:"2026-10-10", destination_url:"https://a.example/p", price_amount:19800, in_stock:true, affiliate:true },
    { listing_id:"b", product_id:"p", variant_id:"v", merchant_id:"m2", region:"JP", currency:"JPY", checked_at:"2026-10-10", destination_url:"https://b.example/p", price_amount:17800, in_stock:true, affiliate:false },
    { listing_id:"c", product_id:"p", variant_id:"v", merchant_id:"m3", region:"JP", currency:"JPY", checked_at:"2026-10-10", destination_url:"https://c.example/p", price_amount:16000, in_stock:false, affiliate:true }
  ],context);
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

test("equal price and score ordering is deterministic across affiliate permutations", () => {
  const context = { product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["a.example","b.example"] };
  const affiliate = { listing_id:"b", product_id:"p", variant_id:"v", merchant_id:"m1", region:"JP", currency:"JPY", checked_at:"2026-10-10", destination_url:"https://b.example/p", price_amount:100, in_stock:true, affiliate:true };
  const neutral = { listing_id:"a", product_id:"p", variant_id:"v", merchant_id:"m2", region:"JP", currency:"JPY", checked_at:"2026-10-10", destination_url:"https://a.example/p", price_amount:100, in_stock:true, affiliate:false };
  assert.equal(listings.chooseCheapest([affiliate,neutral],context).listing_id,"a");
  assert.equal(listings.chooseCheapest([neutral,affiliate],context).listing_id,"a");
  const scoredA = { id:"b", recommendation_score:80, affiliate:true };
  const scoredB = { id:"a", recommendation_score:80, affiliate:false };
  assert.deepEqual(listings.recommendationRankMustIgnoreMonetization([scoredA,scoredB]).map(item => item.id),["a","b"]);
  assert.deepEqual(listings.recommendationRankMustIgnoreMonetization([scoredB,scoredA]).map(item => item.id),["a","b"]);
});
