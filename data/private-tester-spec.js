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
  const cohorts = Object.freeze([
    Object.freeze({
      size:10, stage:"usability", purpose:"導線理解、重大誤推薦、privacy事故を最小人数で発見する",
      data:["completion time","Next Upgrade reached","reason understood","severe recommendation error","privacy incident"],
      success:["Next Upgrade reached >= 8/10","reason understood >= 7/10","median completion <= 7 minutes","severe error = 0","privacy incident = 0"],
      stop:["severe error > 0","privacy incident > 0","Next Upgrade reached < 8/10"], estimated_human_hours:8, purchase_required:false
    }),
    Object.freeze({
      size:30, stage:"directional_validity", purpose:"推薦・修正・DONT_UPGRADEの方向性を仮検証する",
      data:["Acceptance","Correction","Re-ranking Success","DONT_UPGRADE acceptance","Save/Return intent"],
      success:["completed >= 24","decided feedback >= 20","Acceptance >= 60%","Correction <= 30%","Re-ranking Success >= 50%","DONT_UPGRADE acceptance >= 70%"],
      stop:["Correction > 40% after one iteration","DONT_UPGRADE acceptance < 50%","severe error > 0"], estimated_human_hours:18, purchase_required:false
    }),
    Object.freeze({
      size:100, stage:"acquisition_and_intent", purpose:"qualified trafficから意思決定までの需要と収益意図を検証する",
      data:["My Setup start","Gear Taste completion","Next Upgrade reach","Why Not usage","CTA intent","Save/Return intent"],
      success:["My Setup start >= 25%","Gear Taste / started >= 70%","Next Upgrade / started >= 50%","Why Not / decision >= 40%","eligible CTA intent >= 8%","Save/Return intent >= 15%"],
      stop:["My Setup start < 15% after one message iteration","fewer than 10 completions","zero concrete feedback/share/save after 200 qualified visits"], estimated_human_hours:35, purchase_required:false
    })
  ]);
  return { version:2, privacyNotice, scenarios, cohorts, external_recruitment_authorized:false };
});
