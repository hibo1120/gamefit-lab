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
  let storage;
  try { storage = window.localStorage; }
  catch (error) { storage = { getItem() { throw error; } }; }
  const loadResult = storageApi.load(storage);
  let state = loadResult.state || storageApi.createState();
  let readOnly = loadResult.read_only;
  let recoveryRaw = loadResult.recovery_raw || null;
  let currentResult = null;
  let rerankedResult = null;

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
    refreshTasteAttributes();
  }

  function refreshTasteAttributes() {
    const attributeSelect = byId("avoid-attribute");
    clear(attributeSelect);
    for (const item of OPTIONS[selectedCategory()] || []) attributeSelect.append(option(item.attribute, item.label));
    refreshTasteValues();
  }

  function refreshTasteValues() {
    const definition = (OPTIONS[selectedCategory()] || []).find(item => item.attribute === byId("avoid-attribute").value);
    const valueSelect = byId("avoid-value");
    clear(valueSelect);
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
    gotoStep("recommend");
    return true;
  }

  byId("category").addEventListener("change", refreshProducts);
  byId("avoid-attribute").addEventListener("change", refreshTasteValues);
  byId("to-taste").addEventListener("click", () => gotoStep("taste"));
  document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => gotoStep(button.dataset.back)));

  byId("save-taste").addEventListener("click", () => {
    const category = selectedCategory();
    const attribute = byId("avoid-attribute").value;
    const value = byId("avoid-value").value;
    const currentProductId = byId("current-product").value;
    state.profile = prefs.recordProductFeedback(state.profile, {
      product_id:currentProductId, category, sentiment:"dislike",
      reasons:[{ attribute, sentiment:"dislike", value, reason_code:attribute }],
      observed_at:new Date().toISOString()
    });
    if (byId("hard-avoid").checked) state.profile = prefs.addHardAvoid(state.profile, {
      category, attribute, value, operator:attribute === "bands" ? "includes" : "equals", reason_code:"explicit_hard_avoid",
      created_at:new Date().toISOString()
    });
    persist("Gear Tasteをこのブラウザ内に保存しました。");
    gotoStep("context");
  });

  byId("to-recommend").addEventListener("click", runRecommendation);
  byId("to-feedback").addEventListener("click", () => gotoStep("feedback"));
  document.querySelectorAll('input[name="verdict"]').forEach(input => input.addEventListener("change", () => {
    byId("disagree-details").hidden = input.value !== "disagree" || !input.checked;
  }));

  byId("rerank").addEventListener("click", () => {
    const verdict = document.querySelector('input[name="verdict"]:checked')?.value;
    const selected = currentResult?.recommendations?.[0];
    if (!verdict || !selected) {
      byId("feedback-status").textContent = "推薦と回答を選択してください。";
      return;
    }
    const reasonCodes = selectedCodes("reason_code");
    const directionCodes = selectedCodes("direction_code");
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
    byId("feedback-status").textContent = "「こっちなら合う」を保存しました。";
    byId("accept-rerank").hidden = true;
    persist("再ランキング結果を保存しました。");
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
    if (!window.confirm("このブラウザ内のGameFit Personal Gearデータをすべて削除します。元に戻せません。")) return;
    try {
      storageApi.deleteAll(storage);
      state = storageApi.createState();
      readOnly = false;
      recoveryRaw = null;
      currentResult = null;
      rerankedResult = null;
      setStatus("このoriginのGameFit Personal Gearデータを削除しました。");
      gotoStep("setup");
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
})();
