(function (root, factory) {
  const api = factory();
  root.GameFitPrivateTesterSpec = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const privacyNotice = "入力はこのブラウザのlocalStorageだけに保存され、外部送信しません。共有端末では他の利用者に見られる可能性があります。Exportで確認し、終了時はDelete allを実行できます。";
  const scenarios = Object.freeze([
    Object.freeze({
      id:"no-purchase-needed", test_scenario:"現機材との差が小さい、または無料設定確認が残るケース",
      expected_action:"DONT_UPGRADEを確認し、先にFix Before Buyを実行する",
      feedback_question:"買わない理由と、先に試す無料対策は明確でしたか？",
      post_purchase_outcome_question:"購入不要。設定変更後に問題が改善したかだけ記録してください。",
      purchase_required:false
    }),
    Object.freeze({
      id:"limited-non-dont", test_scenario:"exact game/input・価格・互換性・Evidence・deltaが揃う限定ケース",
      expected_action:"候補を検討するが、購入は必須ではない",
      feedback_question:"合っている／違う／わからない。違う場合は理由と望む方向を選んでください。",
      post_purchase_outcome_question:"購入した場合のみ、満足度、継続利用、元製品へ戻ったか、売却・交換、理由を後日記録してください。",
      purchase_required:false
    }),
    Object.freeze({
      id:"same-product-opposite-fit", test_scenario:"同じ候補が別のhard avoidではAVOIDになる対照試験",
      expected_action:"製品の絶対評価ではなく個人Fitの差を確認する",
      feedback_question:"AVOID理由は自分の条件として理解できますか？",
      post_purchase_outcome_question:"購入しない想定。誤って魅力的に見えた点があれば記録してください。",
      purchase_required:false
    })
  ]);
  return { version:1, privacyNotice, scenarios, external_recruitment_authorized:false };
});
