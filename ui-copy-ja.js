(function (root, factory) {
  const api = factory();
  root.GameFitJaCopy = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const maps = Object.freeze({
    decision:Object.freeze({
      "SAFE / FAMILIAR":"今の機材に近い仕様の候補",
      BETTER_FIT:"登録した好みとの一致が比較的多い候補",
      VALUE_ALTERNATIVE:"条件に近く価格を抑えやすい候補",
      EXPLORE:"条件を確認しながら比べたい候補",
      AVOID:"今回は避けた方がよさそう",
      DONT_UPGRADE:"今は買い替えを急がなくてよさそうです",
      CLARIFY:"もう少し情報が必要です",
      CONSIDER_UPGRADE:"条件を確認しながら比較できる候補があります",
      "RE-RANK":"条件を反映した候補"
    }),
    confidence:Object.freeze({ High:"多め", Medium:"中程度", Low:"少なめ", unknown:"不足" }),
    risk:Object.freeze({ high:"高い", medium:"中程度", low:"低め", High:"高い", Medium:"中程度", Low:"低め", unknown:"判断材料が不足" }),
    evidence:Object.freeze({ A:"十分", B:"おおむね十分", C:"一部のみ", D:"不足" }),
    compatibility:Object.freeze({ compatible:"確認できた範囲では問題なし", incompatible:"組み合わせに問題あり", unknown:"未確認の項目あり" }),
    delta:Object.freeze({ meaningful_change:"仕様の違いが複数ある", limited_change:"確認できた違いは1項目", small_change:"確認できた範囲では大きな違いなし", unknown:"比較材料が不足" }),
    category:Object.freeze({ mouse:"マウス", keyboard:"キーボード", monitor:"モニター", mousepad:"マウスパッド", audio:"オーディオ", controller:"コントローラー", network:"ネットワーク", cable:"ケーブル" }),
    input:Object.freeze({ mnk:"マウス・キーボード", controller:"コントローラー", unknown:"未選択" }),
    game:Object.freeze({ apex:"Apex Legends", valorant:"VALORANT", unknown:"未選択" }),
    reason:Object.freeze({ shape:"形状", size:"大きさ", weight:"重さ", click:"クリック感", price:"価格", brand:"ブランド", game_fit:"ゲームとの相性", durability:"耐久性", software:"ソフトウェア", current_gear_delta_small:"今の機材との差が小さい", other:"その他" }),
    direction:Object.freeze({ lighter:"軽くしたい", heavier:"重くしたい", smaller:"小さくしたい", larger:"大きくしたい", lower_hump:"背を低くしたい", cheaper:"価格を抑えたい", same_brand:"同じブランドがよい", different_brand:"別ブランドを試したい", higher_performance:"性能を上げたい", safer_familiar:"慣れた感覚を優先したい", do_not_upgrade:"買い替えたくない" }),
    detail:Object.freeze({
      setup_details_missing:"現在の接続・設定を確認できていません",
      category_setup:"カテゴリ固有の接続・設定を確認中です",
      set_os_refresh_rate:"Windowsのリフレッシュレート設定を確認",
      test_mouse_direct_usb:"USBハブを外し、PCへ直接つないで確認",
      verify_actual_usb_polling:"実際のポーリングレートと安定性を確認",
      verify_display_signal_chain:"GPU・モニター・ケーブル・表示設定を順に確認",
      check_audio_output_settings:"出力先・サンプルレート・音響設定を確認",
      test_direct_audio_path:"別の正常な接続経路で音を確認",
      network_stability_check:"遅延・揺れ・パケットロスを時間帯別に確認",
      test_bufferbloat_under_load:"通信中の遅延増加を確認",
      compare_temporary_wired_test:"一時的な有線接続と比較",
      check_os_power_and_background_load:"電源設定・常駐処理・ドライバーを確認",
      evidence_insufficient:"製品の根拠がまだ十分ではありません",
      current_gear_delta_missing:"今の機材との差を比べられていません",
      game_fitness_evidence_missing:"このゲーム条件の根拠が不足しています",
      game_fitness_is_trait_derived:"ゲームとの相性は製品属性からの推定です",
      compatibility_unknown:"接続や対応状況に未確認の項目があります",
      budget_exceeded:"予算を超えています",
      price_unknown_for_budget:"現在価格を確認できていません",
      non_buyable_lifecycle:"現在購入できる製品か確認できません",
      exact_variant_unresolved:"型番違いを除外できていません",
      category_unknown:"製品カテゴリを確認できません",
      cable_need_unverified:"ケーブル交換が必要か確認できていません",
      price_context_unknown:"価格の比較材料が不足しています",
      confidence_calibration_incomplete:"購入後の実績による検証はまだありません",
      setup_assessment_missing:"購入前の設定確認が終わっていません"
    })
  });

  function label(group, value, fallback) {
    return maps[group]?.[value] || fallback;
  }

  function detailLabels(values) {
    const input = Array.isArray(values) ? values : [];
    const translated = input.map(value => maps.detail[value] || "追加確認が必要な項目があります");
    return [...new Set(translated)];
  }

  function confidenceNote(value) {
    if (value === "High") return "複数の根拠と比較材料がそろっています。ただし購入後の実績による検証はまだありません。";
    if (value === "Medium") return "主要な根拠はありますが、未確認の項目も残っています。";
    return "根拠または今の機材との比較材料が不足しています。断定せずに表示しています。";
  }

  return { maps, label, detailLabels, confidenceNote };
});
