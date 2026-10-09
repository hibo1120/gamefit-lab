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
      { attribute:"shape", label:"Shape", values:[["right_handed_symmetrical","右手用symmetrical"],["ergonomic","ergonomic"]] },
      { attribute:"hump", label:"Hump", values:[["rear","rear / back hump"],["center","center hump"]] },
      { attribute:"weight", label:"Weight", values:[["80 g","80 gが苦手"],["55 g","55 g付近が苦手"]] },
      { attribute:"click", label:"Click", values:[["heavy","重いclick"],["light","軽いclick"]] }
    ],
    keyboard:[
      { attribute:"layout", label:"Layout", values:[["60_percent","60% layout"],["tkl","TKL"]] },
      { attribute:"rapid_trigger", label:"Rapid Trigger", values:[["false","Rapid Triggerなし"],["true","Rapid Triggerあり"]] },
      { attribute:"actuation", label:"Actuation", values:[["0.1 mm","0.1 mm"],["2 mm","2 mm"]] }
    ],
    monitor:[
      { attribute:"panel", label:"Panel", values:[["tn","TN"],["oled","OLED"]] },
      { attribute:"refresh_rate", label:"Refresh rate", values:[["240 Hz","240 Hz"],["480 Hz","480 Hz"]] },
      { attribute:"resolution", label:"Resolution", values:[["1920x1080","1920 × 1080"],["2560x1440","2560 × 1440"]] }
    ],
    mousepad:[
      { attribute:"surface_speed", label:"Surface speed", values:[["low","low speed"],["medium","medium speed"]] },
      { attribute:"stopping_power", label:"Stopping power", values:[["high","high stopping power"],["low","low stopping power"]] },
      { attribute:"base_thickness", label:"Thickness", values:[["6 mm","6 mm"],["4 mm","4 mm"]] }
    ],
    audio:[
      { attribute:"fit", label:"Fit", values:[["over_ear_closed_back","closed back"],["over_ear_open_back","open back"]] },
      { attribute:"weight", label:"Weight", values:[["560 g","560 g"],["280 g","280 g"]] },
      { attribute:"bass", label:"Bass", values:[["boosted","boosted"],["neutral","neutral"]] }
    ],
    controller:[
      { attribute:"layout", label:"Stick layout", values:[["asymmetric","asymmetric"],["symmetrical","symmetrical"]] },
      { attribute:"stick_type", label:"Stick type", values:[["hall_effect","Hall Effect"],["tmr","TMR"]] },
      { attribute:"weight", label:"Weight", values:[["345 g","345 g"],["250 g","250 g"]] }
    ],
    network:[
      { attribute:"wifi_generation", label:"Wi-Fi generation", values:[["wifi_6","Wi-Fi 6"],["wifi_7","Wi-Fi 7"]] },
      { attribute:"bands", label:"Band", values:[["6ghz","6 GHzが必要"],["2.4ghz","2.4 GHzが必要"]] },
      { attribute:"mesh", label:"Mesh", values:[["false","Meshなし"],["true","Meshあり"]] }
    ],
    cable:[
      { attribute:"connector", label:"Connector", values:[["displayport","DisplayPort"],["hdmi","HDMI"],["rj45","Ethernet"],["usb_c","USB-C"]] },
      { attribute:"certification", label:"Certification", values:[["vesa_dp80","VESA DP80"],["ultra_high_speed_hdmi","Ultra High Speed HDMI"]] },
      { attribute:"active_passive", label:"Signal type", values:[["active","active"],["passive","passive"]] }
    ]
  };

  const REASONS = [
    ["shape","shape"],["size","size"],["weight","weight"],["click","click"],["price","price"],
    ["brand","brand"],["game_fit","game fit"],["durability","durability"],["software","software"],
    ["current_gear_delta_small","current gearとの差が小さい"],["other","その他"]
  ];
  const DIRECTIONS = [
    ["lighter","lighter"],["heavier","heavier"],["smaller","smaller"],["larger","larger"],
    ["lower_hump","lower hump"],["cheaper","cheaper"],["same_brand","same brand"],
    ["different_brand","different brand"],["higher_performance","higher performance"],
    ["safer_familiar","safer familiar"],["do_not_upgrade","do not upgrade"]
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

  function persist(message) {
    if (readOnly) {
      setStatus("保存データを安全に読めません。ResetまたはDelete all後に再開してください。", true);
      return false;
    }
    try {
      state = storageApi.save(storage, state);
      setStatus(message || "このブラウザ内に保存しました。");
      return true;
    } catch (error) {
      setStatus("保存できませんでした。既存データは変更していません: " + error.message, true);
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
    select.append(option("not_listed","該当製品がない（近似製品へ置換しない）"));
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
      validationStatus("匿名記録を保存できないため停止しました: "+error.message,true);
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
      validationStatus("匿名記録を保存できないため停止しました: "+error.message,true);
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
    byId("validation-setup").hidden=Boolean(active);
    byId("validation-session").hidden=!active;
    byId("active-tester-id").textContent=active||"";
    document.body.classList.toggle("validation-active",Boolean(active));
    const report=loaded.state?validationStore.report(loaded.state):null;
    const stopped=report?.gate?.status==="STOP";
    byId("begin-validation").disabled=Boolean(stopped);
    setFlowDisabled(Boolean(active&&activeStatus!=="in_progress"));
    byId("validation-report-status").textContent=report
      ? `${report.finalized}/10確定 · 担当者確認待ち ${report.awaiting_review} · Gate ${report.gate.status} · 自動送信なし`
      : "匿名テスト記録を読み取れません。";
    if (activeStatus==="awaiting_review") validationStatus("回答を保存しました。担当者が別画面でSafety確認を完了するまで操作を停止します。");
    if (stopped&&!active) byId("validation-setup-status").textContent="重大問題でGateがSTOPしています。原因修正と新しいcohort versionなしに再開できません。";
  }

  function badge(text) {
    const node = document.createElement("span");
    node.className = "badge";
    node.textContent = text;
    return node;
  }

  function renderCards(container, rows) {
    clear(container);
    for (const row of rows) {
      const source = fixtures.products.find(item => item.product_id === row.product_id);
      const card = document.createElement("article");
      card.className = "card";
      const title = document.createElement("h3");
      title.textContent = source?.product_name || row.product_id;
      const badges = document.createElement("p");
      badges.append(badge(row.upgrade_match || "RE-RANK"), badge("Confidence " + row.confidence));
      const detail = document.createElement("details");
      const detailSummary = document.createElement("summary");
      detailSummary.textContent = "詳細を見る";
      const list = document.createElement("dl");
      const delta = row.current_gear_delta_assessment;
      const details = [
        ["理由", `score ${row.personalized_score ?? row.recommendation_score} / delta ${delta?.delta_band || "unknown"}`],
        ["懸念", `${row.regret_shield?.risk_level || "unknown"} (${row.regret_shield?.confidence || "Low"}) · ${(row.data_gaps || []).join(", ") || "none"}`],
        ["Evidence", `${row.evidence_grade || "D"} · compared attributes ${(delta?.compared_attributes || []).length}`],
        ["Compatibility", `${row.compatibility_status || "unknown"} · ${(row.compatibility_assessment?.unknowns || []).join(", ") || "checked"}`],
        ["買わなくてもできること", (row.fix_before_buy || []).map(item => item.code).join(", ") || "設定・接続経路を先に確認"]
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
      byId("context-warning").textContent = `${category}は${inputMethod}推薦空間へ流用しません。入力方式をMouse & Keyboardへ変更してください。`;
      return false;
    }
    byId("context-warning").hidden = true;
    if (currentProductId === "not_listed") {
      currentResult={ status:"clarify",decision:"CLARIFY",reason_codes:["current_product_not_profiled"],recommendations:[] };
      byId("decision-summary").textContent=`CLARIFY · ${gameId}/${inputMethod} · 現在製品を近似SKUへ置換せず、coverage gapとして停止しました。`;
      renderCards(byId("recommendations"),[]);
      state.setup={ category,current_product_id:currentProductId,budget_band:Number(byId("budget").value),game_id:gameId,input_method:inputMethod,platform };
      state.recommendations.push({ created_at:new Date().toISOString(),model_version:"pgi-s3-fixture-v1",game_id:gameId,input_method:inputMethod,decision:"CLARIFY",original_snapshot:[] });
      persist("未登録製品をcoverage gapとして保存しました。");
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
      ? `${currentResult.decision} · ${gameId}/${inputMethod} · 実Outcome未収集のためConfidenceは仮評価です。`
      : "登録済みのGame/Input profileがないため推薦を停止しました。";
    renderCards(byId("recommendations"), currentResult.recommendations || []);
    state.setup = { category, current_product_id:currentProductId, budget_band:Number(byId("budget").value), game_id:gameId, input_method:inputMethod, platform };
    state.recommendations.push({
      created_at:new Date().toISOString(), model_version:"pgi-s3-fixture-v1", game_id:gameId, input_method:inputMethod,
      decision:currentResult.decision, original_snapshot:JSON.parse(JSON.stringify(currentResult.recommendations || []))
    });
    persist("条件と推薦snapshotをこのブラウザ内に保存しました。");
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
    persist("Gear Tasteをこのブラウザ内に保存しました。");
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
      byId("feedback-status").textContent = "未登録製品のため再推薦せず、coverage gapとして回答を記録しました。";
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
      rerankedResult = learned.recommendations;
      renderCards(byId("reranked"),rerankedResult);
      byId("accept-rerank").hidden = verdict !== "disagree" || !rerankedResult.length;
      const explanation = learned.explanation.user_facing_explanation;
      const changedPreferences = explanation.preference_changed.map(item => item.code).join(", ");
      const ranking = explanation.candidate_rank_changed ? "あり" : "なし";
      const confidence = explanation.confidence_changed ? "変更あり" : "変更なし";
      byId("feedback-status").textContent = `Personal更新 ${changedPreferences || "なし"} · 順位変化 ${ranking} · Confidence ${confidence}。安全分類境界を維持し、Global learningは無効で変更していません。`;
      persist("フィードバックと再ランキングを保存しました。");
      byId("session-review").hidden=!activeTesterId();
    } catch (error) {
      byId("feedback-status").textContent = error.message;
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
    byId("feedback-status").textContent = "「こっちなら合う」を保存しました。";
    byId("accept-rerank").hidden = true;
    persist("再ランキング結果を保存しました。");
  });

  byId("begin-validation").addEventListener("click", () => {
    const purchaseContexts=selectedCodes("purchase_context");
    if (!purchaseContexts.length||!byId("tester-independent").checked||!byId("tester-consent").checked) {
      byId("validation-setup-status").textContent="状況を1つ以上選び、独立性と同意を確認してください。";
      return;
    }
    if (!window.confirm("前のTesterのPersonal Gearデータだけを消去して新しい匿名セッションを開始します。10人テスト記録は保持します。必要なら先にPersonal Exportしてください。")) return;
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
    } catch (error) { byId("validation-setup-status").textContent=error.message; }
  });

  byId("finish-validation").addEventListener("click", () => {
    const reasonUnderstood=document.querySelector('input[name="reason_understood"]:checked')?.value;
    const uxIssues=selectedCodes("ux_issue");
    if (!reasonUnderstood||!uxIssues.length||(uxIssues.includes("none")&&uxIssues.length>1)) {
      validationStatus("理由理解とPrivacy / UX項目を回答してください。「問題なし」は単独で選択します。",true);
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
      validationStatus("回答を保存しました。担当者へ端末を戻してください。");
      syncValidationUi();
    } catch (error) { validationStatus(error.message,true); }
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
      byId("validation-report-status").textContent="匿名10人テスト記録をExportしました。";
    } catch (error) { byId("validation-report-status").textContent=error.message; }
  });

  byId("delete-validation").addEventListener("click", () => {
    if (!window.confirm("匿名10人テスト記録をすべて削除します。元に戻せません。")) return;
    validationStore.deleteAll(storage);
    syncValidationUi();
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
        ? "読み取れない元データを変更せずRecovery Exportしました。"
        : "JSONをExportしました。内容にはGear Tasteと推薦履歴が含まれます。");
    } catch (error) { setStatus(error.message,true); }
  });

  byId("delete-data").addEventListener("click", () => {
    if (!window.confirm("このブラウザ内のGameFit Personal Gearデータと匿名テスト記録をすべて削除します。元に戻せません。")) return;
    try {
      storageApi.deleteAll(storage);
      validationStore.deleteAll(storage);
      state = storageApi.createState();
      readOnly = false;
      recoveryRaw = null;
      currentResult = null;
      rerankedResult = null;
      setStatus("このoriginのGameFit Personal Gearデータを削除しました。");
      gotoStep("setup");
      syncValidationUi();
    } catch (error) { setStatus("削除できませんでした: " + error.message,true); }
  });

  byId("reset-data").addEventListener("click", () => {
    if (!window.confirm("保存データを空のschemaへResetします。必要なら先にExportしてください。")) return;
    try {
      state = storageApi.reset(storage);
      readOnly = false;
      recoveryRaw = null;
      currentResult = null;
      rerankedResult = null;
      setStatus("空のschemaへResetしました。");
      gotoStep("setup");
    } catch (error) { setStatus("Resetできませんでした: " + error.message,true); }
  });

  byId("schema-version").textContent = String(storageApi.SCHEMA_VERSION);
  for (const testerId of validationStore.TESTER_IDS) byId("tester-id").append(option(testerId,testerId.toUpperCase()));
  addCheckboxes(byId("reason-codes"),REASONS,"reason_code");
  addCheckboxes(byId("direction-codes"),DIRECTIONS,"direction_code");
  refreshProducts();
  if (loadResult.status === "corrupt") setStatus("保存データが破損しています。自動上書きせず停止しました。Exportで元データを退避してからResetまたはDelete allを選んでください。",true);
  else if (loadResult.status === "future_schema") setStatus("新しいschemaのデータです。このUIでは上書きしません。Export後に対応版を使用してください。",true);
  else if (loadResult.status === "unavailable") {
    for (const id of ["export-data","reset-data","delete-data"]) byId(id).disabled = true;
    setStatus("このブラウザではlocalStorageを利用できません。保存せず読み取り専用で停止しました。",true);
  }
  else if (loadResult.status === "ok") setStatus("保存済みデータをこのブラウザから読み込みました。");
  else setStatus("保存データはまだありません。外部送信は行いません。");
  syncValidationUi();
})();
