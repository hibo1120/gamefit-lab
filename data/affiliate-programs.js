(function (root, factory) {
  const api = factory();
  root.GameFitAffiliatePrograms = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const programs = Object.freeze([
    Object.freeze({ affiliate_program_id:"amazon_jp_associates", merchant_id:"amazon", region:"JP", status:"not_approved", tracking_url:"", commission_rate:null, commission_checked_at:null, recommendation_rank_input:false }),
    Object.freeze({ affiliate_program_id:"rakuten_affiliate", merchant_id:"rakuten", region:"JP", status:"not_approved", tracking_url:"", commission_rate:null, commission_checked_at:null, recommendation_rank_input:false }),
    Object.freeze({ affiliate_program_id:"razer_jp_program", merchant_id:"razer", region:"JP", status:"not_approved", tracking_url:"", commission_rate:null, commission_checked_at:null, recommendation_rank_input:false })
  ]);
  function findForMerchant(merchantId, catalog = programs) {
    return catalog.find(program => program.merchant_id === merchantId && program.status === "approved") || null;
  }
  return { programs, findForMerchant };
});
