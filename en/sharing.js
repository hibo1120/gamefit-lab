(function (root, factory) {
  const sharing = factory(root);
  root.GameFitGlobalSharing = sharing;
  if (typeof module === "object" && module.exports) module.exports = sharing;
})(typeof window !== "undefined" ? window : globalThis, function createGlobalSharing(root) {
  "use strict";
  const DIAGNOSIS_URL = "https://hibo1120.github.io/gamefit-lab/en/diagnose.html";
  const CAMPAIGN = "gamefit_global_test";

  function diagnosisUrl(channel) {
    const copy = channel === "copy";
    const url = new URL(DIAGNOSIS_URL);
    url.searchParams.set("utm_source", copy ? "direct_share" : "x");
    url.searchParams.set("utm_medium", copy ? "referral" : "social");
    url.searchParams.set("utm_campaign", CAMPAIGN);
    url.searchParams.set("utm_content", copy ? "en_result_copy" : "en_result_share");
    url.searchParams.set("source", copy ? "en_result_copy" : "en_result_share");
    return url.toString();
  }

  function shareText(result) {
    const title = result?.ranked?.[0]?.title || "review my current setup";
    return `GameFit says my best next step is “${title}.” I checked where my next gaming budget could make the biggest difference:`;
  }

  function xShareUrl(result) {
    const url = new URL("https://x.com/intent/post");
    url.searchParams.set("text", shareText(result));
    url.searchParams.set("url", diagnosisUrl("x"));
    return url.toString();
  }

  async function copyDiagnosisUrl() {
    const url = diagnosisUrl("copy");
    if (root.navigator?.clipboard?.writeText) {
      await root.navigator.clipboard.writeText(url);
      return url;
    }
    const document = root.document;
    if (!document?.body || typeof document.execCommand !== "function") throw new Error("clipboard_unavailable");
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("copy_failed");
    return url;
  }

  return { CAMPAIGN, DIAGNOSIS_URL, copyDiagnosisUrl, diagnosisUrl, shareText, xShareUrl, createGlobalSharing };
});
