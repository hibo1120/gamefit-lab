(function () {
  "use strict";

  const prefs = window.GameFitPreferences;
  const gear = window.GameFitPersonalGear;
  const feedback = window.GameFitFeedback;
  const storageApi = window.GameFitStorage;
  const fixtures = window.GameFitPersonalGearFixtures;
  const deltaEngine = window.GameFitCurrentGearDelta;
  const compatibilityEngine = window.GameFitCompatibility;
  const fixBeforeBuy = window.GameFitFixBeforeBuy;
  const validationStore = window.GameFitPrivateValidationStore;
  const copy = window.GameFitJaCopy;
  let storage;
  try { storage = window.localStorage; }
  catch (error) { storage = { getItem() { throw error; } }; }
  const loadResult = storageApi.load(storage);
  let state = loadResult.state || storageApi.createState();
  let readOnly = loadResult.read_only;
  let recoveryRaw = loadResult.recovery_raw || null;
  let currentResult = null;
  let rerankedResult = null;
  let validationRerankRequested = false;
  let validationRerankCompleted = false;

  const OPTIONS = {
    mouse:[
      { attribute:"shape", label:"形状", values:[["right_handed_symmetrical","左右対称に近い右手用形状"],["ergonomic","右手用エルゴノミクス形状"]] },
      { attribute:"hump", label:"背の位置", values:[["rear","後方が高い"],["center","中央が高い"]] },
      { attribute:"weight", label:"重さ", values:[["80 g","80 g前後が苦手"],["55 g","55 g前後が苦手"]] },
      { attribute:"click", label:"クリック感", values:[["heavy","重いクリック"],["light","軽いクリック"]] }
    ],
    keyboard:[
      { attribute:"layout", label:"配列・サイズ", values:[["60_percent","60%サイズ"],["tkl","テンキーレス"]] },
      { attribute:"rapid_trigger", label:"ラピッドトリガー", values:[["false","ラピッドトリガーなし"],["true","ラピッドトリガーあり"]] },
      { attribute:"actuation", label:"反応する深さ", values:[["0.1 mm","0.1 mm"],["2 mm","2 mm"]] }
    ],
    monitor:[
      { attribute:"panel", label:"パネル方式", values:[["tn","TN"],["oled","OLED"]] },
      { attribute:"refresh_rate", label:"リフレッシュレート", values:[["240 Hz","240 Hz"],["480 Hz","480 Hz"]] },
      { attribute:"resolution", label:"解像度", values:[["1920x1080","1920 × 1080"],["2560x1440","2560 × 1440"]] }
    ],
    mousepad:[
      { attribute:"surface_speed", label:"滑りの速さ", values:[["low","遅め"],["medium","中程度"]] },
      { attribute:"stopping_power", label:"止めやすさ", values:[["high","止めやすい"],["low","止めにくい"]] },
      { attribute:"base_thickness", label:"厚さ", values:[["6 mm","6 mm"],["4 mm","4 mm"]] }
    ],
    audio:[
      { attribute:"fit", label:"装着方式", values:[["over_ear_closed_back","密閉型オーバーイヤー"],["over_ear_open_back","開放型オーバーイヤー"]] },
      { attribute:"weight", label:"重さ", values:[["560 g","560 g"],["280 g","280 g"]] },
      { attribute:"bass", label:"低音", values:[["boosted","強め"],["neutral","自然"]] }
    ],
    controller:[
      { attribute:"layout", label:"スティック配置", values:[["asymmetric","左右非対称"],["symmetrical","左右対称"]] },
      { attribute:"stick_type", label:"スティック方式", values:[["hall_effect","ホールエフェクト"],["tmr","TMR"]] },
      { attribute:"weight", label:"重さ", values:[["345 g","345 g"],["250 g","250 g"]] }
    ],
    network:[
      { attribute:"wifi_generation", label:"Wi-Fi規格", values:[["wifi_6","Wi-Fi 6"],["wifi_7","Wi-Fi 7"]] },
      { attribute:"bands", label:"周波数帯", values:[["6ghz","6 GHz帯が必要"],["2.4ghz","2.4 GHz帯が必要"]] },
      { attribute:"mesh", label:"メッシュ機能", values:[["false","メッシュ機能なし"],["true","メッシュ機能あり"]] }
    ],
    cable:[
      { attribute:"connector", label:"端子", values:[["displayport","DisplayPort"],["hdmi","HDMI"],["rj45","LAN（RJ45）"],["usb_c","USB Type-C"]] },
      { attribute:"certification", label:"認証", values:[["vesa_dp80","VESA DP80"],["ultra_high_speed_hdmi","Ultra High Speed HDMI"]] },
      { attribute:"active_passive", label:"伝送方式", values:[["active","アクティブ"],["passive","パッシブ"]] }
    ]
  };

  const REASONS = [
    ["shape","形状"],["size","大きさ"],["weight","重さ"],["click","クリック感"],["price","価格"],
    ["brand","ブランド"],["game_fit","ゲームとの相性"],["durability","耐久性"],["software","ソフトウェア"],
    ["current_gear_delta_small","今の機材との差が小さい"],["other","その他"]
  ];
  const DIRECTIONS = [
    ["lighter","軽くしたい"],["heavier","重くしたい"],["smaller","小さくしたい"],["larger","大きくしたい"],
    ["lower_hump","背を低くしたい"],["cheaper","価格を抑えたい"],["same_brand","同じブランドがよい"],
    ["different_brand","別ブランドを試したい"],["higher_performance","性能を上げたい"],
    ["safer_familiar","慣れた感覚を優先したい"],["do_not_upgrade","買い替えたくない"]
  ];

  function byId(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function option(value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    return node;
  }

  function setStatus(message, warning=false) {
    const node = byId("storage-status");
    node.textContent = message;
    node.classList.toggle("warning", warning);
  }

  function friendlyError(error, fallback="処理できませんでした。もう一度お試しください。") {
    console.error(error);
    return fallback;
  }

  function persist(message) {
    if (readOnly) {
      setStatus("保存内容を読み取れません。内容を書き出したうえで、初期化または削除を行ってください。", true);
      return false;
    }
    try {
      state = storageApi.save(storage, state);
      setStatus(message || "このブラウザ内に保存しました。");
      return true;
    } catch (error) {
      setStatus(friendlyError(error,"保存できませんでした。これまでの保存内容は変更していません。"), true);
      return false;
    }
  }

  function gotoStep(name) {
    document.querySelectorAll("[data-step]").forEach(node => { node.hidden = node.dataset.step !== name; });
    document.querySelectorAll("[data-step-indicator]").forEach(node => node.classList.toggle("active", node.dataset.stepIndicator === name));
    document.querySelector(`[data-step="${name}"]`)?.focus?.();
  }

  function selectedCategory() { return byId("category").value; }

  function refreshProducts() {
    const select = byId("current-product");
    clear(select);
    for (const item of fixtures.byCategory[selectedCategory()] || []) select.append(option(item.product_id, item.product_name));
    select.append(option("not_listed","使っている製品が一覧にない"));
    refreshTasteAttributes();
  }

  function refreshTasteAttributes() {
    const attributeSelect = byId("avoid-attribute");
    clear(attributeSelect);
    attributeSelect.append(option("none","特になし"));
    for (const item of OPTIONS[selectedCategory()] || []) attributeSelect.append(option(item.attribute, item.label));
    refreshTasteValues();
  }

  function refreshTasteValues() {
    const definition = (OPTIONS[selectedCategory()] || []).find(item => item.attribute === byId("avoid-attribute").value);
    const valueSelect = byId("avoid-value");
    clear(valueSelect);
    if (byId("avoid-attribute").value === "none") {
      valueSelect.append(option("none","登録しない"));
      valueSelect.disabled=true;
      byId("hard-avoid").checked=false;
      byId("hard-avoid").disabled=true;
      return;
    }
    valueSelect.disabled=false;
    byId("hard-avoid").disabled=false;
    for (const [value,label] of definition?.values || []) valueSelect.append(option(value,label));
  }

  function addCheckboxes(container, items, prefix) {
    for (const [value,labelText] of items) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = prefix;
      input.value = value;
      label.append(input, document.createTextNode(" " + labelText));
      container.append(label);
    }
  }

  function selectedCodes(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(node => node.value);
  }

  function testerSlotFromHash() {
    const value=String(window.location.hash||"").slice(1).toLowerCase();
    return validationStore.TESTER_IDS.includes(value)?value:null;
  }

  function validationLoad() { return validationStore.load(storage); }
  function activeTesterId() { return validationLoad().state?.active_tester_id || null; }
  function validationStatus(message,warning=false) {
    const node=byId("validation-session-status");
    node.textContent=message;
    node.classList.toggle("warning",warning);
  }
  function validationContext(stage="decision") {
    return {
      category:selectedCategory(),
      game_id:stage==="setup"?"unknown":byId("game").value,
      input_method:stage==="setup"?"unknown":byId("input-method").value
    };
  }
  function captureValidation(name,properties={},stage="decision") {
    if (!activeTesterId()) return true;
    try {
      validationStore.capture(storage,name,{ ...validationContext(stage), ...properties });
      return true;
    } catch (error) {
      validationStatus(friendlyError(error,"テスト記録を保存できなかったため、ここで停止しました。担当者へお知らせください。"),true);
      setFlowDisabled(true);
      return false;
    }
  }
  function captureValidationBatch(events,stage="decision") {
    if (!activeTesterId()) return true;
    try {
      validationStore.captureMany(storage,events.map(event=>({ name:event.name,properties:{ ...validationContext(stage),...(event.properties||{}) } })));
      return true;
    } catch (error) {
      validationStatus(friendlyError(error,"テスト記録を保存できなかったため、ここで停止しました。担当者へお知らせください。"),true);
      setFlowDisabled(true);
      return false;
    }
  }
  function setFlowDisabled(disabled) {
    for (const id of ["to-taste","save-taste","to-recommend","to-feedback","rerank","accept-rerank","finish-validation"]) {
      const node=byId(id);
      if (node) node.disabled=disabled;
    }
  }
  function syncValidationUi() {
    const loaded=validationLoad();
    const active=loaded.state?.active_tester_id||null;
    const activeStatus=active?loaded.state.testers?.[active]?.status:null;
    const linkedSlot=testerSlotFromHash();
    const linkedStatus=linkedSlot?loaded.state?.testers?.[linkedSlot]?.status:null;
    byId("validation-setup").hidden=Boolean(active);
    byId("validation-session").hidden=!active;
    byId("tester-export").hidden=!(linkedSlot&&["awaiting_review","completed","abandoned","stopped"].includes(linkedStatus));
    byId("active-tester-id").textContent=active||"";
    document.body.classList.toggle("validation-active",Boolean(active));
    const report=loaded.state?validationStore.report(loaded.state):null;
    const stopped=report?.gate?.status==="STOP";
    byId("begin-validation").disabled=Boolean(stopped);
    setFlowDisabled(Boolean(active&&activeStatus!=="in_progress"));
    byId("validation-report-status").textContent=report
      ? `${report.finalized}/10人確認済み · 担当者確認待ち ${report.awaiting_review}人 · 判定 ${gateLabel(report.gate.status)} · 自動送信なし`
      : "参加者番号付きテスト記録を読み取れません。";
    if (activeStatus==="awaiting_review") validationStatus("回答を保存しました。担当者の安全確認が終わるまで、この画面はそのままにしてください。");
    if (stopped&&!active) byId("validation-setup-status").textContent="重大な問題が確認されたため、テストを停止しています。修正後は別のテストとしてやり直します。";
  }

  function badge(text) {
    const node = document.createElement("span");
    node.className = "badge";
    node.textContent = text;
    return node;
  }

  function uiLabel(group,value,fallback) { return copy?.label(group,value,fallback) || fallback; }

  function gateLabel(value) {
    return ({ PASS:"通過", STOP:"停止中", INCONCLUSIVE:"判定保留", PENDING:"確認中" })[value] || "確認中";
  }

  function candidateReason(row) {
    if (row.compatibility_status==="incompatible") return "現在の環境とは組み合わせられないため、候補から外します。";
    if (row.regret_shield?.should_block) return "必ず避けたい条件、または過去に苦手だった特徴と重なります。";
    if ((row.fix_before_buy||[]).some(item=>Number(item.priority)>=90)) return "買う前に、無料で確認できる設定や接続があります。";
    if (row.upgrade_match==="BETTER_FIT") return "登録した好みとの一致が比較的多い候補です。";
    if (row.upgrade_match==="SAFE / FAMILIAR") return "今の機材に近い仕様が多い候補です。";
    if (row.upgrade_match==="VALUE_ALTERNATIVE") return "登録条件に近く、価格を抑えやすい候補です。";
    if (row.upgrade_match==="EXPLORE") return "相性を判断するには、追加確認や実機比較が必要です。";
    return "判断材料がそろっていないため、買い替えを急がない結果です。";
  }

  function renderCards(container, rows) {
    clear(container);
    for (const row of rows) {
      const source = fixtures.products.find(item => item.product_id === row.product_id);
      const card = document.createElement("article");
      card.className = "card";
      const title = document.createElement("h3");
      title.textContent = source?.product_name || "製品名を確認できません";
      const badges = document.createElement("p");
      badges.append(
        badge(uiLabel("decision",row.upgrade_match || "RE-RANK","条件を反映した候補")),
        badge("判断材料: " + uiLabel("confidence",row.confidence,"少なめ"))
      );
      const detail = document.createElement("details");
      const detailSummary = document.createElement("summary");
      detailSummary.textContent = "詳細を見る";
      const list = document.createElement("dl");
      const delta = row.current_gear_delta_assessment;
      const gaps=copy?.detailLabels(row.data_gaps)||[];
      const unknowns=copy?.detailLabels(row.compatibility_assessment?.unknowns)||[];
      const freeChecks=copy?.detailLabels((row.fix_before_buy||[]).map(item=>item.code))||[];
      const details = [
        ["理由", `${candidateReason(row)} 今の機材との差は「${uiLabel("delta",delta?.delta_band,"比較材料が不足")}」です。`],
        ["判断材料の見方", copy?.confidenceNote(row.confidence)||"判断材料が不足しているため、断定していません。"],
        ["購入前の注意点", `合わない可能性: ${uiLabel("risk",row.regret_shield?.risk_level,"判断材料が不足")}（判断材料: ${uiLabel("confidence",row.regret_shield?.confidence,"少なめ")}）${gaps.length?`。${gaps.join("、")}`:""}`],
        ["根拠", `公開仕様・参照した測定情報の確認状況: ${uiLabel("evidence",row.evidence_grade || "D","不足")}。比べられた属性: ${(delta?.compared_attributes || []).length}件。これは情報量の評価で、相性や満足を保証するものではありません。`],
        ["組み合わせ", `${uiLabel("compatibility",row.compatibility_status,"未確認の項目あり")}${unknowns.length?`。${unknowns.join("、")}`:""}`],
        ["買わずに試せること", freeChecks.length?freeChecks.join("、"):"設定や接続を先に確認してください"]
      ];
      for (const [term,value] of details) {
        const dt = document.createElement("dt"); dt.textContent = term;
        const dd = document.createElement("dd"); dd.textContent = value;
        list.append(dt,dd);
      }
      detail.append(detailSummary,list);
      card.append(title,badges,detail);
      container.append(card);
    }
  }

  function buildCandidates(category, currentProductId, inputMethod, platform, freeFixes) {
    const current = fixtures.products.find(item => item.product_id === currentProductId);
    return (fixtures.byCategory[category] || []).filter(item => item.product_id !== currentProductId).map(item => {
      const delta = deltaEngine.compareProducts(current,item);
      let compatibility = { assessment_type:"rule_evaluation", status:"unknown", issues:[], unknowns:["setup_details_missing"], evaluated_fields:["category_setup"] };
      if (category === "controller" && item.compatibility_profile?.platforms?.length) {
        compatibility = item.compatibility_profile.platforms.includes(platform)
          ? { assessment_type:"rule_evaluation", status:"compatible", issues:[], unknowns:[], evaluated_fields:["platform"] }
          : { assessment_type:"rule_evaluation", status:"incompatible", issues:[{ code:"platform_not_supported", severity:"high" }], unknowns:[], evaluated_fields:["platform"] };
      }
      return {
        ...item,
        input_methods:["mouse","keyboard","mousepad"].includes(category) ? ["mnk"] : category === "controller" ? ["controller"] : ["mnk","controller"],
        current_gear_delta_assessment:delta,
        compatibility_assessment:compatibility,
        compatibility_status:compatibility.status,
        compatible:compatibility.status === "compatible" ? true : compatibility.status === "incompatible" ? false : undefined,
        fix_before_buy:freeFixes,
        need_assessment:category !== "cable" ? undefined : { status:"unknown", reason_code:"signal_chain_need_not_verified", evidence:[] },
        value_score:0.5,
        similarity_to_current:0,
        direction_codes:[]
      };
    });
  }

  function runRecommendation() {
    const category = selectedCategory();
    const currentProductId = byId("current-product").value;
    const current = fixtures.products.find(item => item.product_id === currentProductId);
    const gameId = byId("game").value;
    const inputMethod = byId("input-method").value;
    const platform = byId("platform").value;
    const incompatibleInput = (["mouse","keyboard","mousepad"].includes(category) && inputMethod !== "mnk") || (category === "controller" && inputMethod !== "controller");
    if (incompatibleInput) {
      byId("context-warning").hidden = false;
      const expected=category==="controller"?"コントローラー":"マウス・キーボード";
      byId("context-warning").textContent = `${uiLabel("category",category,"この機材")}は、選択中の入力方法とは分けて判定します。入力方法を「${expected}」に変更してください。`;
      return false;
    }
    byId("context-warning").hidden = true;
    if (currentProductId === "not_listed") {
      currentResult={ status:"clarify",decision:"CLARIFY",reason_codes:["current_product_not_profiled"],recommendations:[] };
      byId("decision-summary").textContent=`${uiLabel("decision","CLARIFY","もう少し情報が必要です")}。使っている製品が一覧にないため、似た製品で代用せず、ここで判定を止めました。製品名と型番を担当者へ伝えてください。`;
      renderCards(byId("recommendations"),[]);
      state.setup={ category,current_product_id:currentProductId,budget_band:Number(byId("budget").value),game_id:gameId,input_method:inputMethod,platform };
      state.recommendations.push({ created_at:new Date().toISOString(),model_version:"pgi-s3-fixture-v1",game_id:gameId,input_method:inputMethod,decision:"CLARIFY",original_snapshot:[] });
      persist("一覧にない製品として保存しました。");
      if (!captureValidationBatch([
        { name:"next_upgrade_reached" },
        { name:"decision_viewed",properties:{ decision:"CLARIFY",affiliate_eligible:false,top_candidate_id:"none" } },
        { name:"regret_shield_viewed",properties:{ risk_level:"unknown",confidence_label:"Low" } }
      ])) return false;
      gotoStep("recommend");
      return true;
    }
    const freeFixes = fixBeforeBuy.suggestions({
      display_target_mode:category === "monitor", display_link_verified:false,
      high_polling_device:["mouse","keyboard","controller"].includes(category), actual_polling_verified:false,
      audio_issue:category === "audio", audio_output_settings_checked:false, direct_audio_path_tested:false,
      online_game:true, connection_type:category === "network" ? "wifi" : "unknown", wired_tested:category !== "network", bufferbloat_tested:category !== "network",
      performance_issue:true, os_power_mode_checked:false
    });
    currentResult = gear.recommendUpgrades({
      game_id:gameId,
      input_method:inputMethod,
      profile:state.profile,
      current_gear:current ? { product_id:current.product_id, category:current.category } : null,
      budget:Number(byId("budget").value),
      region:"JP",
      currency:"JPY",
      fix_before_buy:freeFixes,
      setup_assessment:{ assessment_type:"observed_setup_checks", status:"evaluated", checks:freeFixes.map(item => ({ code:item.code, result:"pending" })) },
      candidates:buildCandidates(category,currentProductId,inputMethod,platform,freeFixes)
    });
    const summary = byId("decision-summary");
    summary.textContent = currentResult.status === "ok"
      ? `${uiLabel("decision",currentResult.decision,"条件を確認中です")}。${uiLabel("game",gameId,gameId)}を${uiLabel("input",inputMethod,inputMethod)}で遊ぶ条件です。判断材料の多さはテスト用データによる仮評価です。`
      : "このゲームと入力方法の組み合わせは、まだ判定できません。別ゲームのデータは流用していません。";
    renderCards(byId("recommendations"), currentResult.recommendations || []);
    state.setup = { category, current_product_id:currentProductId, budget_band:Number(byId("budget").value), game_id:gameId, input_method:inputMethod, platform };
    state.recommendations.push({
      created_at:new Date().toISOString(), model_version:"pgi-s3-fixture-v1", game_id:gameId, input_method:inputMethod,
      decision:currentResult.decision, original_snapshot:JSON.parse(JSON.stringify(currentResult.recommendations || []))
    });
    persist("入力条件と判定結果をこのブラウザ内に保存しました。");
    const top=currentResult.recommendations?.[0];
    if (!captureValidationBatch([
      { name:"next_upgrade_reached" },
      { name:"decision_viewed",properties:{ decision:currentResult.decision||"CLARIFY",affiliate_eligible:false,top_candidate_id:top?.product_id||"none" } },
      { name:"regret_shield_viewed",properties:{ risk_level:top?.regret_shield?.risk_level||"unknown",confidence_label:top?.regret_shield?.confidence||"Low" } }
    ])) return false;
    gotoStep("recommend");
    return true;
  }

  byId("category").addEventListener("change", refreshProducts);
  byId("avoid-attribute").addEventListener("change", refreshTasteValues);
  byId("to-taste").addEventListener("click", () => {
    if (!captureValidation("my_setup_started",{},"setup")) return;
    gotoStep("taste");
  });
  document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => gotoStep(button.dataset.back)));

  byId("save-taste").addEventListener("click", () => {
    const category = selectedCategory();
    const attribute = byId("avoid-attribute").value;
    const value = byId("avoid-value").value;
    const currentProductId = byId("current-product").value;
    if (attribute!=="none"&&currentProductId!=="not_listed") state.profile = prefs.recordProductFeedback(state.profile, {
      product_id:currentProductId, category, sentiment:"dislike",
      reasons:[{ attribute, sentiment:"dislike", value, reason_code:attribute }],
      observed_at:new Date().toISOString()
    });
    if (attribute!=="none"&&byId("hard-avoid").checked) state.profile = prefs.addHardAvoid(state.profile, {
      category, attribute, value, operator:attribute === "bands" ? "includes" : "equals", reason_code:"explicit_hard_avoid",
      created_at:new Date().toISOString()
    });
    persist("好みと苦手な条件をこのブラウザ内に保存しました。");
    if (!captureValidation("gear_taste_completed",{ attributes_count:attribute==="none"?0:1 },"setup")) return;
    gotoStep("context");
  });

  byId("to-recommend").addEventListener("click", runRecommendation);
  byId("to-feedback").addEventListener("click", () => {
    if (!captureValidation("why_not_opened",{},"decision")) return;
    gotoStep("feedback");
  });
  document.querySelectorAll('input[name="verdict"]').forEach(input => input.addEventListener("change", () => {
    byId("disagree-details").hidden = input.value !== "disagree" || !input.checked;
  }));

  byId("rerank").addEventListener("click", () => {
    const verdict = document.querySelector('input[name="verdict"]:checked')?.value;
    const selected = currentResult?.recommendations?.[0];
    if (!verdict) {
      byId("feedback-status").textContent = "回答を選択してください。";
      return;
    }
    const reasonCodes = selectedCodes("reason_code");
    const directionCodes = selectedCodes("direction_code");
    if (verdict==="disagree"&&(!reasonCodes.length||!directionCodes.length)) {
      byId("feedback-status").textContent = "「違う」の理由と望む方向を1つ以上選択してください。";
      return;
    }
    const validationEvents=[{ name:"recommendation_feedback",properties:{ verdict } }];
    if (currentResult?.decision==="DONT_UPGRADE") validationEvents.push({ name:"dont_upgrade_response",properties:{ accepted:verdict==="agree" } });
    if (verdict==="disagree") validationEvents.push({ name:"rerank_requested",properties:{ reason_count:reasonCodes.length,direction_count:directionCodes.length,reason_codes:reasonCodes,desired_direction_codes:directionCodes } });
    if (!captureValidationBatch(validationEvents)) return;
    if (verdict==="disagree") {
      validationRerankRequested=true;
    }
    if (!selected) {
      byId("feedback-status").textContent = "使っている製品が一覧にないため、候補は見直しません。製品名と型番を担当者へ伝えてください。";
      byId("session-review").hidden=!activeTesterId();
      return;
    }
    try {
      const item = feedback.recommendationFeedback({
        product_id:selected.product_id, category:selected.category, game_id:selected.game_id, input_method:selected.input_method,
        verdict, reason_codes:reasonCodes, desired_direction_codes:directionCodes,
        confidence_at_recommendation:selected.confidence, created_at:new Date().toISOString()
      });
      state.feedback.push(item);
      const learned = feedback.applyPersonalLearningWithExplanation(state.profile,item,currentResult.recommendations);
      state.profile = learned.profile;
      if (verdict!=="disagree") {
        rerankedResult=[];
        clear(byId("reranked"));
        byId("accept-rerank").hidden=true;
        if (!persist("回答をこのブラウザ内に保存しました。")) {
          byId("feedback-status").textContent="回答を保存できませんでした。ブラウザの保存設定を確認してください。";
          return;
        }
        byId("feedback-status").textContent="回答を保存しました。この回答が他の利用者の判定へ反映されることはありません。";
        byId("session-review").hidden=!activeTesterId();
        return;
      }
      rerankedResult = learned.recommendations;
      renderCards(byId("reranked"),rerankedResult);
      byId("accept-rerank").hidden = verdict !== "disagree" || !rerankedResult.length;
      const explanation = learned.explanation.user_facing_explanation;
      const changedPreferences = explanation.preference_changed.map(item => uiLabel("direction",item.code,uiLabel("reason",item.code,"回答内容")));
      const ranking = explanation.candidate_rank_changed ? "候補の順番を見直しました" : "候補の順番は変わりませんでした";
      const confidence = explanation.confidence_changed ? "判断の確かさも変わりました" : "判断の確かさは変えていません";
      if (!persist("回答を保存し、候補を見直しました。")) {
        byId("feedback-status").textContent="回答を保存できませんでした。ブラウザの保存設定を確認してください。";
        return;
      }
      byId("feedback-status").textContent = `${changedPreferences.length?`「${changedPreferences.join("、")}」を反映しました。`:"好みの登録内容は変わりませんでした。"}${ranking}。${confidence}。この回答が他の利用者の判定へ反映されることはありません。`;
      byId("session-review").hidden=!activeTesterId();
    } catch (error) {
      byId("feedback-status").textContent = friendlyError(error,"回答を反映できませんでした。入力内容を確認して、もう一度お試しください。");
    }
  });

  byId("accept-rerank").addEventListener("click", () => {
    const top = rerankedResult?.[0];
    if (!top) return;
    const item = feedback.recommendationFeedback({
      product_id:top.product_id, category:top.category, game_id:top.game_id, input_method:top.input_method,
      verdict:"agree", created_at:new Date().toISOString()
    });
    state.feedback.push(item);
    state.profile = feedback.applyPersonalLearning(state.profile,item);
    state.rerank_events.push({ success:true, game_id:top.game_id, input_method:top.input_method, product_id:top.product_id, created_at:new Date().toISOString() });
    if (validationRerankRequested&&!validationRerankCompleted) {
      if (!captureValidation("rerank_completed",{ rerank_success:true,confidence_change:"unchanged" },"decision")) return;
      validationRerankCompleted=true;
    }
    if (!persist("見直した候補への回答を保存しました。")) {
      byId("feedback-status").textContent="回答を保存できませんでした。ブラウザの保存設定を確認してください。";
      return;
    }
    byId("feedback-status").textContent = "見直した候補の方が合う、という回答を保存しました。";
    byId("accept-rerank").hidden = true;
  });

  byId("begin-validation").addEventListener("click", () => {
    const purchaseContexts=selectedCodes("purchase_context");
    if (!purchaseContexts.length||!byId("tester-independent").checked||!byId("tester-consent").checked) {
      byId("validation-setup-status").textContent="状況を1つ以上選び、独立性と同意を確認してください。";
      return;
    }
    if (!window.confirm("前回の入力内容だけを消して、新しい参加者番号でテストを始めます。これまでの参加者番号付き記録は残ります。必要な場合は、先に入力内容を書き出してください。")) return;
    try {
      storageApi.deleteAll(storage);
      state=storageApi.save(storage,storageApi.createState());
      readOnly=false;
      recoveryRaw=null;
      currentResult=null;
      rerankedResult=null;
      validationRerankRequested=false;
      validationRerankCompleted=false;
      validationStore.startTester(storage,{
        tester_id:byId("tester-id").value,
        expertise:byId("tester-expertise").value,
        purchase_contexts:purchaseContexts,
        independence_confirmed:true,
        developer_or_contributor:false,
        answer_aware:false,
        consent_confirmed:true
      });
      byId("validation-setup-status").textContent="";
      validationStatus("計測を開始しました。担当者は操作・結論を誘導しません。");
      gotoStep("setup");
      syncValidationUi();
    } catch (error) { byId("validation-setup-status").textContent=friendlyError(error,"テストを開始できませんでした。担当者へお知らせください。"); }
  });

  byId("finish-validation").addEventListener("click", () => {
    const reasonUnderstood=document.querySelector('input[name="reason_understood"]:checked')?.value;
    const uxIssues=selectedCodes("ux_issue");
    if (!reasonUnderstood||!uxIssues.length||(uxIssues.includes("none")&&uxIssues.length>1)) {
      validationStatus("理由を理解できたかと、使いにくかった点を回答してください。「問題なし」は単独で選んでください。",true);
      return;
    }
    try {
      if (validationRerankRequested&&!validationRerankCompleted) {
        if (!captureValidation("rerank_completed",{ rerank_success:false,confidence_change:"unchanged" },"decision")) return;
        validationRerankCompleted=true;
      }
      validationStore.submitTesterReview(storage,{
        ...validationContext("decision"),
        self_reported_reason_understood:reasonUnderstood==="yes",
        intended_judgment:byId("intended-judgment").value,
        ux_issue_codes:uxIssues
      });
      validationStatus(testerSlotFromHash()
        ? "回答を保存しました。下のボタンから参加者番号付きのテスト結果を書き出してください。"
        : "回答を保存しました。担当者へ端末を戻してください。");
      syncValidationUi();
    } catch (error) { validationStatus(friendlyError(error,"回答を保存できませんでした。担当者へお知らせください。"),true); }
  });

  byId("export-validation").addEventListener("click", () => {
    try {
      const loaded=validationLoad();
      if (!loaded.state) throw new Error(loaded.error||"テスト記録を読み取れません");
      const blob=new Blob([validationStore.exportState(loaded.state)],{ type:"application/json" });
      const link=document.createElement("a");
      link.href=URL.createObjectURL(blob);
      link.download="gamefit-private-validation-n10.json";
      link.click();
      URL.revokeObjectURL(link.href);
      byId("validation-report-status").textContent="参加者番号付きの10人テスト記録を書き出しました。";
    } catch (error) { byId("validation-report-status").textContent=friendlyError(error,"テスト記録を書き出せませんでした。"); }
  });

  byId("export-session").addEventListener("click", () => {
    try {
      const testerId=testerSlotFromHash();
      const loaded=validationLoad();
      if (!testerId||!loaded.state) throw new Error(loaded.error||"テスト結果を読み取れません");
      const blob=new Blob([validationStore.exportTester(loaded.state,testerId)],{ type:"application/json" });
      const link=document.createElement("a");
      link.href=URL.createObjectURL(blob);
      link.download=`gamefit-private-validation-${testerId}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      byId("session-export-status").textContent="参加者番号付きのテスト結果を書き出しました。ファイルには氏名・メールアドレス・自由記述は含まれません。担当者の受領確認後、この端末のファイルを削除してください。";
    } catch (error) { byId("session-export-status").textContent=friendlyError(error,"テスト結果を書き出せませんでした。担当者へお知らせください。"); }
  });

  byId("delete-validation").addEventListener("click", () => {
    if (!window.confirm("参加者番号付きの10人テスト記録をすべて削除します。元に戻せません。")) return;
    try {
      validationStore.deleteAll(storage);
      syncValidationUi();
    } catch (error) { byId("validation-report-status").textContent=friendlyError(error,"テスト記録を削除できませんでした。ブラウザの保存設定をご確認ください。"); }
  });

  byId("export-data").addEventListener("click", () => {
    try {
      const recovery = readOnly && recoveryRaw !== null;
      const contents = recovery ? storageApi.exportRecovery(recoveryRaw) : storageApi.exportState(state);
      const blob = new Blob([contents], { type:recovery ? "text/plain" : "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = recovery ? "gamefit-personal-gear-recovery.txt" : "gamefit-personal-gear-export.json";
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus(recovery
        ? "読み取れない保存データを変更せず、復旧用ファイルとして書き出しました。"
        : "入力内容を書き出しました。ファイルには好みと判定履歴が含まれます。");
    } catch (error) { setStatus(friendlyError(error,"入力内容を書き出せませんでした。"),true); }
  });

  byId("delete-data").addEventListener("click", () => {
    if (!window.confirm("この画面で入力した好みと判定履歴を削除します。参加者番号付きテスト記録は削除されません。削除後は元に戻せません。")) return;
    try {
      storageApi.deleteAll(storage);
      state = storageApi.createState();
      readOnly = false;
      recoveryRaw = null;
      currentResult = null;
      rerankedResult = null;
      setStatus("この画面で入力した好みと判定履歴を削除しました。");
      gotoStep("setup");
      syncValidationUi();
    } catch (error) { setStatus(friendlyError(error,"削除できませんでした。ブラウザの保存設定をご確認ください。"),true); }
  });

  byId("reset-data").addEventListener("click", () => {
    if (!window.confirm("保存している入力内容を初期状態に戻します。必要な場合は、先に書き出してください。")) return;
    try {
      state = storageApi.reset(storage);
      readOnly = false;
      recoveryRaw = null;
      currentResult = null;
      rerankedResult = null;
      setStatus("入力内容を初期状態に戻しました。");
      gotoStep("setup");
    } catch (error) { setStatus(friendlyError(error,"初期化できませんでした。ブラウザの保存設定をご確認ください。"),true); }
  });

  byId("schema-version").textContent = String(storageApi.SCHEMA_VERSION);
  for (const testerId of validationStore.TESTER_IDS) byId("tester-id").append(option(testerId,testerId.toUpperCase()));
  const linkedTester=testerSlotFromHash();
  if (linkedTester) {
    document.body.classList.add("tester-link");
    byId("tester-id").value=linkedTester;
    byId("tester-id-field").hidden=true;
  }
  addCheckboxes(byId("reason-codes"),REASONS,"reason_code");
  addCheckboxes(byId("direction-codes"),DIRECTIONS,"direction_code");
  refreshProducts();
  if (loadResult.status === "corrupt") setStatus("保存内容を読み取れません。自動では上書きしていません。復旧用ファイルを書き出してから、初期化または削除を行ってください。",true);
  else if (loadResult.status === "future_schema") setStatus("この画面より新しい形式で保存されたデータです。内容を書き出してから、対応する画面をご利用ください。",true);
  else if (loadResult.status === "unavailable") {
    for (const id of ["export-data","reset-data","delete-data"]) byId(id).disabled = true;
    setStatus("このブラウザでは入力内容を保存できません。ブラウザの保存設定をご確認ください。",true);
  }
  else if (loadResult.status === "ok") setStatus("保存済みデータをこのブラウザから読み込みました。");
  else setStatus("保存データはまだありません。外部送信は行いません。");
  syncValidationUi();
})();
