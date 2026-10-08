(function (root, factory) {
  const sharing = factory(root);

  root.GameFitSharing = sharing;

  if (typeof module === "object" && module.exports) {
    module.exports = sharing;
  }
})(typeof window !== "undefined" ? window : globalThis, function createSharing(root) {
  "use strict";

  const DIAGNOSIS_URL = "https://hibo1120.github.io/gamefit-lab/diagnose.html";
  const CAMPAIGN = "gamefit_growth_v1";
  const RESULT_PHRASES = Object.freeze({
    keep: "今は何も買わず現状維持",
    monitor: "PC買替よりモニター優先",
    ram: "まずRAMを見直す",
    storage: "まずストレージを見直す",
    cpu_gpu: "CPU / GPU改善を優先",
    pc_replacement: "PC買替を比較",
    device: "入力デバイスを見直す"
  });

  function recommendationKey(result) {
    const key = result?.topRecommendation || result?.ranked?.[0]?.key;
    return Object.hasOwn(RESULT_PHRASES, key) ? key : "keep";
  }

  function buildDiagnosisUrl(channel) {
    const isCopy = channel === "copy";
    const url = new URL(DIAGNOSIS_URL);
    url.searchParams.set("utm_source", isCopy ? "direct_share" : "x");
    url.searchParams.set("utm_medium", isCopy ? "referral" : "social");
    url.searchParams.set("utm_campaign", CAMPAIGN);
    url.searchParams.set("utm_content", isCopy ? "result_copy" : "result_share");
    url.searchParams.set("source", isCopy ? "result_copy" : "result_share");
    return url.toString();
  }

  function buildShareText(result) {
    return `GameFit診断では「${RESULT_PHRASES[recommendationKey(result)]}」でした。\n今のゲーミング環境に次の予算をどこへ使うべきか無料診断👇`;
  }

  function buildXShareUrl(result) {
    const intent = new URL("https://x.com/intent/post");
    intent.searchParams.set("text", buildShareText(result));
    intent.searchParams.set("url", buildDiagnosisUrl("x"));
    return intent.toString();
  }

  async function copyDiagnosisUrl() {
    const url = buildDiagnosisUrl("copy");
    if (root.navigator?.clipboard?.writeText) {
      await root.navigator.clipboard.writeText(url);
      return url;
    }

    const document = root.document;
    if (!document?.body || typeof document.execCommand !== "function") {
      throw new Error("clipboard_unavailable");
    }

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

  return {
    CAMPAIGN,
    DIAGNOSIS_URL,
    RESULT_PHRASES,
    buildDiagnosisUrl,
    buildShareText,
    buildXShareUrl,
    copyDiagnosisUrl,
    recommendationKey,
    createSharing
  };
});
