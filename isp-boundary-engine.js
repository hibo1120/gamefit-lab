(function (root, factory) {
  const api = factory();
  root.GameFitIspBoundary = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function evaluate(input = {}) {
    const freeChecks = ["wired_direct_tested","local_fix_checks_complete","router_firmware_checked","os_network_settings_checked"];
    const missingFreeChecks = freeChecks.filter(key => input[key] !== true);
    if (input.connection_type !== "wired_direct" || Number(input.sample_windows || 0) < 3 || Number(input.sample_days || 0) < 2 || missingFreeChecks.length) {
      return Object.freeze({
        status:"FIX_BEFORE_BUY", can_recommend_isp:false, affiliate_eligible:false,
        missing_checks:[...(input.connection_type === "wired_direct" ? [] : ["wired_direct_measurement"]), ...(Number(input.sample_windows || 0) >= 3 ? [] : ["three_measurement_windows"]), ...(Number(input.sample_days || 0) >= 2 ? [] : ["two_measurement_days"]), ...missingFreeChecks],
        reason:"Local setup and repeated wired measurements must be checked before attributing the problem to a line or ISP."
      });
    }
    const officialChecks = ["official_area_eligibility_checked","building_type_checked","installation_terms_checked","contract_terms_checked"];
    const missingOfficial = officialChecks.filter(key => input[key] !== true);
    if (missingOfficial.length) {
      return Object.freeze({ status:"OFFICIAL_CHECK_REQUIRED", can_recommend_isp:false, affiliate_eligible:false, missing_checks:missingOfficial, reason:"Availability, building, installation, and contract conditions require official verification." });
    }
    if (input.persistent_issue_observed !== true) {
      return Object.freeze({ status:"DONT_UPGRADE", can_recommend_isp:false, affiliate_eligible:false, missing_checks:[], reason:"Repeated measurements do not establish a persistent problem." });
    }
    return Object.freeze({
      status:"HUMAN_OFFICIAL_REVIEW_REQUIRED", can_recommend_isp:false, affiliate_eligible:false, missing_checks:[],
      reason:"Measurements justify escalation, not an automatic provider switch. Cancellation, campaign, IPv6, construction, and provider terms require human and official review."
    });
  }
  return { evaluate };
});
