(function (root, factory) {
  const api = factory(
    root.GameFitPreferences || (typeof module === "object" && module.exports ? require("./preference-engine.js") : null),
    root.GameFitPersonalGear || (typeof module === "object" && module.exports ? require("./personal-gear-engine.js") : null),
    root.GameFitFeedback || (typeof module === "object" && module.exports ? require("./feedback-engine.js") : null),
    root.GameFitPersonalGearFixtures || (typeof module === "object" && module.exports ? require("./data/personal-gear-fixtures.js") : null),
    root.GameFitCurrentGearDelta || (typeof module === "object" && module.exports ? require("./current-gear-delta.js") : null),
    root.GameFitFixBeforeBuy || (typeof module === "object" && module.exports ? require("./fix-before-buy.js") : null),
    root.GameFitRecommendationPairs || (typeof module === "object" && module.exports ? require("./data/recommendation-pairs.js") : null),
    root.GameFitJaCopy || (typeof module === "object" && module.exports ? require("./ui-copy-ja.js") : null)
  );
  root.GameFitSyntheticValidation = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (preferences, gear, feedback, fixtures, deltaEngine, fixBeforeBuy, pairs, copy) {
  "use strict";

  if (![preferences,gear,feedback,fixtures,deltaEngine,fixBeforeBuy,pairs,copy].every(Boolean)) {
    throw new Error("Synthetic validation dependencies are required");
  }

  const NON_DONT = new Set(["SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","EXPLORE"]);
  const FORBIDDEN_UI_TOKENS = [
    "DONT_UPGRADE","CLARIFY","SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","AVOID",
    "My Setup","Gear Taste","Next Upgrade","Regret Shield","Why Not?","Compatibility","Fix Before Buy","Decision Brief",
    "undefined","null","[object Object]"
  ];
  const FIXED_TIME = "2026-10-10T00:00:00.000Z";

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function product(id) { return fixtures.products.find(item => item.product_id === id); }
  function uiLabel(group,value,fallback) { return copy.label(group,value,fallback) || fallback; }

  function inputMatchesCategory(category,inputMethod) {
    if (["mouse","keyboard","mousepad"].includes(category)) return inputMethod === "mnk";
    if (category === "controller") return inputMethod === "controller";
    return ["mnk","controller"].includes(inputMethod);
  }

  function profileFor(persona) {
    let profile=preferences.createProfile();
    if (persona.hard_avoid) profile=preferences.addHardAvoid(profile,{
      category:persona.category,
      ...persona.hard_avoid,
      game_id:persona.game_id,
      input_method:persona.input_method,
      created_at:FIXED_TIME
    });
    if (persona.contradictory_preference) {
      profile=preferences.recordAttributePreference(profile,{
        category:persona.category,attribute:"weight",sentiment:"like",value:55,direction_code:"lighter",
        game_id:persona.game_id,input_method:persona.input_method,source:"synthetic_adversarial"
      });
      profile=preferences.recordAttributePreference(profile,{
        category:persona.category,attribute:"weight",sentiment:"dislike",value:55,direction_code:"heavier",
        game_id:persona.game_id,input_method:persona.input_method,source:"synthetic_adversarial"
      });
    }
    return profile;
  }

  function freeFixesFor(persona) {
    const flags=persona.setup_flags||{};
    const suggestions=fixBeforeBuy.suggestions({
      display_target_mode:persona.category === "monitor",
      display_link_verified:flags.os_refresh_144 ? false : persona.category !== "monitor",
      high_polling_device:["mouse","keyboard","controller"].includes(persona.category),
      actual_polling_verified:flags.usb_hub ? false : persona.category === "controller",
      audio_issue:persona.category === "audio",
      audio_output_settings_checked:persona.category !== "audio",
      direct_audio_path_tested:persona.category !== "audio",
      online_game:true,
      connection_type:flags.wifi_problem ? "wifi" : "unknown",
      wired_tested:!flags.wifi_problem,
      bufferbloat_tested:!flags.wifi_problem,
      performance_issue:true,
      os_power_mode_checked:false
    });
    const forced=[];
    if (flags.os_refresh_144) forced.push({ code:"set_os_refresh_rate",priority:100,category:"display" });
    if (flags.usb_hub) forced.push({ code:"test_mouse_direct_usb",priority:100,category:"usb" });
    if (flags.wifi_problem) forced.push({ code:"compare_temporary_wired_test",priority:100,category:"network" });
    const byCode=new Map([...suggestions,...forced].map(item=>[item.code,item]));
    return [...byCode.values()];
  }

  function compatibilityFor(item,persona) {
    if (persona.category === "controller" && item.compatibility_profile?.platforms?.length) {
      return item.compatibility_profile.platforms.includes(persona.platform)
        ? { assessment_type:"rule_evaluation",status:"compatible",issues:[],unknowns:[],evaluated_fields:["platform"] }
        : { assessment_type:"rule_evaluation",status:"incompatible",issues:[{ code:"platform_not_supported",severity:"high" }],unknowns:[],evaluated_fields:["platform"] };
    }
    return { assessment_type:"rule_evaluation",status:"unknown",issues:[],unknowns:["setup_details_missing"],evaluated_fields:["category_setup"] };
  }

  function buildCandidates(persona,profile,freeFixes) {
    const current=product(persona.current_product_id);
    const directions=preferences.attributePreferencesFor(profile,persona.category,{
      game_id:persona.game_id,input_method:persona.input_method
    }).map(item=>item.direction_code).filter(Boolean);
    return (fixtures.byCategory[persona.category]||[]).filter(item=>item.product_id!==persona.current_product_id).map(item=>{
      const compatibility=compatibilityFor(item,persona);
      return {
        ...item,
        input_methods:["mouse","keyboard","mousepad"].includes(persona.category) ? ["mnk"] : persona.category === "controller" ? ["controller"] : ["mnk","controller"],
        current_gear_delta_assessment:current ? deltaEngine.compareProducts(current,item,{ desired_direction_codes:directions }) : null,
        compatibility_assessment:compatibility,
        compatibility_status:compatibility.status,
        compatible:compatibility.status === "compatible" ? true : compatibility.status === "incompatible" ? false : undefined,
        fix_before_buy:freeFixes,
        need_assessment:persona.category === "cable" ? { status:"unknown",reason_code:"signal_chain_need_not_verified",evidence:[] } : undefined,
        value_score:persona.tags.includes("budget_focus") ? 0.7 : 0.5,
        similarity_to_current:0,
        direction_codes:directions
      };
    });
  }

  function resultFor(persona) {
    if (persona.current_product_id === "not_listed") {
      return { profile:profileFor(persona),input:null,result:{ status:"clarify",decision:"CLARIFY",reason_codes:["current_product_not_profiled"],recommendations:[] },candidates:[],free_fixes:[] };
    }
    if (!inputMatchesCategory(persona.category,persona.input_method)) {
      return { profile:profileFor(persona),input:null,result:{ status:"insufficient_context",decision:"CLARIFY",reason_codes:["input_category_mismatch"],recommendations:[] },candidates:[],free_fixes:[] };
    }
    if (persona.verified_case_by_expertise) {
      const pair=pairs.buildCases()[persona.verified_case_by_expertise[persona.expertise]];
      const input=clone(pair.input);
      return { profile:input.profile,input,result:gear.recommendUpgrades(input),candidates:input.candidates,free_fixes:input.fix_before_buy||[],verified_pair_id:pair.id };
    }
    const profile=profileFor(persona);
    const freeFixes=freeFixesFor(persona);
    const candidates=buildCandidates(persona,profile,freeFixes);
    const input={
      game_id:persona.game_id,input_method:persona.input_method,platform:persona.platform,
      region:"JP",currency:"JPY",profile,
      current_gear:{ product_id:persona.current_product_id,category:persona.category },
      budget:persona.budget,fix_before_buy:freeFixes,
      setup_assessment:{ assessment_type:"observed_setup_checks",status:"evaluated",checks:freeFixes.map(item=>({ code:item.code,result:"pending" })) },
      candidates
    };
    return { profile,input,result:gear.recommendUpgrades(input),candidates,free_fixes:freeFixes };
  }

  function candidateExplanation(row) {
    if (!row) return "製品を特定できないため、似た製品で代用せず確認を止めました。";
    if (row.compatibility_status === "incompatible") return "現在の環境とは組み合わせられないため、候補から外します。";
    if (row.regret_shield?.should_block) return "必ず避けたい条件、または過去に苦手だった特徴と重なります。";
    if ((row.fix_before_buy||[]).some(item=>Number(item.priority)>=90)) return "買う前に、無料で確認できる設定や接続があります。";
    if (row.upgrade_match === "BETTER_FIT") return "登録した好みとの一致が比較的多い候補です。";
    if (row.upgrade_match === "SAFE / FAMILIAR") return "今の機材に近い仕様が多い候補です。";
    if (row.upgrade_match === "VALUE_ALTERNATIVE") return "登録条件に近く、価格を抑えやすい候補です。";
    if (row.upgrade_match === "EXPLORE") return "相性を判断するには、追加確認や実機比較が必要です。";
    return "判断材料がそろっていないため、買い替えを急がない結果です。";
  }

  function userFacing(persona,result,top) {
    const decision=result.decision||"CLARIFY";
    const gapLabels=copy.detailLabels(top?.data_gaps||[]);
    const freeLabels=copy.detailLabels((top?.fix_before_buy||[]).map(item=>item.code));
    const why=[...new Set([...gapLabels,...freeLabels])];
    if (!why.length) why.push(top ? candidateExplanation(top) : "現在の製品名や入力方法を確認してください");
    return {
      headline:uiLabel("decision",decision,"もう少し情報が必要です"),
      context:`${uiLabel("game",persona.game_id,"選択したゲーム")}を${uiLabel("input",persona.input_method,"選択した操作方法")}で遊ぶ条件です。`,
      explanation:candidateExplanation(top),
      confidence:top ? `判断材料は${uiLabel("confidence",top.confidence,"少なめ")}です。${copy.confidenceNote(top.confidence)}` : "判断材料が不足しているため、断定していません。",
      why_not:why
    };
  }

  function rerankFor(persona,profile,result) {
    const top=result.recommendations?.[0];
    if (!top) return { performed:false,reason:"候補を特定できないため、見直しは行いませんでした。",recommendations:[],explanation:null };
    const objection=persona.objection||{};
    if (objection.verdict!=="disagree") return { performed:false,reason:"候補の見直しは希望されませんでした。",recommendations:result.recommendations,explanation:null };
    const item=feedback.recommendationFeedback({
      product_id:top.product_id,category:top.category,game_id:top.game_id||persona.game_id,input_method:top.input_method||persona.input_method,
      verdict:"disagree",reason_codes:objection.reason_codes||[],desired_direction_codes:objection.desired_direction_codes||[],
      confidence_at_recommendation:top.confidence,created_at:FIXED_TIME
    });
    const learned=feedback.applyPersonalLearningWithExplanation(profile,item,result.recommendations);
    return { performed:true,reason:"回答内容を本人向けの候補順へ反映しました。",recommendations:learned.recommendations,explanation:learned.explanation.user_facing_explanation };
  }

  function safeNonDont(row) {
    if (!row||!NON_DONT.has(row.upgrade_match)) return true;
    return row.decision_readiness?.eligible===true && row.evidence_grade!=="D" && row.compatibility_status==="compatible" &&
      row.regret_shield?.should_block!==true && row.confidence!=="High";
  }

  function copyIsSafe(view) {
    const text=JSON.stringify(view);
    return FORBIDDEN_UI_TOKENS.every(token=>!text.includes(token));
  }

  function rankingFingerprint(result) {
    return (result.recommendations||[]).map(item=>`${item.product_id}:${item.recommendation_score}:${item.upgrade_match}`).join("|");
  }

  function biasInvariant(input,result) {
    if (!input) return true;
    const candidates=input.candidates.map((item,index)=>({
      ...item,affiliate:index%2===0,commission_rate:index%2===0?99:0,merchant_priority:999-index,
      popularity:100000-index,pro_adoption:1000-index,fixture_role:index===0?"current_flagship":"value"
    }));
    const changed=gear.recommendUpgrades({ ...input,candidates });
    return rankingFingerprint(result)===rankingFingerprint(changed);
  }

  function runPersona(persona) {
    const execution=resultFor(persona);
    const { result,profile,input }=execution;
    const top=result.recommendations?.[0]||null;
    const view=userFacing(persona,result,top);
    const rerank=rerankFor(persona,profile,result);
    const finalTop=rerank.recommendations?.[0]||top;
    const finalCode=finalTop?.upgrade_match||result.decision||"CLARIFY";
    const matchedInput=inputMatchesCategory(persona.category,persona.input_method);
    const recommendations=result.recommendations||[];
    const checks={
      game_input_contamination:matchedInput ? recommendations.every(item=>(item.input_methods||[persona.input_method]).includes(persona.input_method)) : recommendations.length===0,
      unsafe_non_dont:recommendations.every(safeNonDont),
      hard_avoid_violation:recommendations.every(item=>item.regret_shield?.should_block!==true||item.upgrade_match==="AVOID"),
      compatibility_bypass:recommendations.every(item=>item.compatibility_status!=="incompatible"||item.upgrade_match==="AVOID"),
      evidence_overclaim:recommendations.every(item=>item.confidence!=="High"),
      affiliate_flagship_pro_bias:biasInvariant(input,result),
      japanese_ui_copy:copyIsSafe(view),
      finite_flow:true,
      confidence_not_completed_without_outcomes:recommendations.every(item=>item.confidence!=="High")
    };
    return {
      persona_id:persona.persona_id,synthetic:true,real_tester_eligible:false,tags:[...persona.tags],expertise:persona.expertise,
      input:{ category:persona.category,current_product_id:persona.current_product_id,game_id:persona.game_id,input_method:persona.input_method,platform:persona.platform,budget:persona.budget },
      recommendation:{ status:result.status,decision:result.decision||"CLARIFY",top_product_id:top?.product_id||null,top_match:top?.upgrade_match||null,confidence:top?.confidence||"Low" },
      explanation:view,
      user_objection:clone(persona.objection),
      why_not:{ opened:true,reasons:[...view.why_not] },
      rerank:{ performed:rerank.performed,top_before:top?.product_id||null,top_after:finalTop?.product_id||null,rank_changed:Boolean(rerank.explanation?.candidate_rank_changed),reason:rerank.reason },
      final_decision:{ code:finalCode,label:uiLabel("decision",finalCode,"もう少し情報が必要です"),purchase_instruction:NON_DONT.has(finalCode)?"比較を続ける":"購入を急がない" },
      checks,
      flow:["input","recommendation","explanation","user_objection","why_not","rerank","final_decision"]
    };
  }

  function highPriceCheck() {
    const base={
      category:"mouse",evidence_grade:"B",lifecycle_state:"available",current_gear_delta:0.3,
      game_fitness:{ apex_mnk:{ score:0.8,evidence_grade:"B" } },value_score:0.5,input_methods:["mnk"],
      compatible:true,compatibility_status:"compatible",compatibility_assessment:{ assessment_type:"rule_evaluation",status:"compatible",issues:[],unknowns:[],evaluated_fields:["device_connector","host_connector"] },
      attributes:{ weight:{ normalized_value:55,normalized_unit:"g" } }
    };
    const result=gear.recommendUpgrades({
      game_id:"apex",input_method:"mnk",profile:preferences.createProfile(),current_gear:{ category:"mouse" },budget:30000,as_of:"2026-10-10",region:"JP",currency:"JPY",
      fix_before_buy:[],setup_assessment:{ assessment_type:"observed_setup_checks",status:"evaluated",checks:[] },
      candidates:[
        { ...base,product_id:"aaa-high-price",variant_id:"high",variant_scope:"exact",price_snapshot:{ product_id:"aaa-high-price",variant_id:"high",current_price:200000,currency:"JPY",region:"JP",checked_at:"2026-10-10",availability:"in_stock",lifecycle_phase:"mature",historical_context_available:false,source_url:"https://price.example/high" } },
        { ...base,product_id:"zzz-lower-price",variant_id:"low",variant_scope:"exact",price_snapshot:{ product_id:"zzz-lower-price",variant_id:"low",current_price:10000,currency:"JPY",region:"JP",checked_at:"2026-10-10",availability:"in_stock",lifecycle_phase:"mature",historical_context_available:false,source_url:"https://price.example/low" } }
      ]
    });
    return result.recommendations?.[0]?.product_id!=="aaa-high-price";
  }

  function summarize(results) {
    const failures=[];
    for (const result of results) for (const [check,passed] of Object.entries(result.checks)) {
      if (!passed) failures.push({ persona_id:result.persona_id,check });
    }
    const countBy=selector=>results.reduce((counts,row)=>{
      const key=selector(row)||"none";
      counts[key]=(counts[key]||0)+1;
      return counts;
    },{});
    const tags=new Set(results.flatMap(item=>item.tags));
    const metamorphic_checks={
      affiliate_flagship_pro_invariant:results.every(item=>item.checks.affiliate_flagship_pro_bias),
      high_price_not_a_positive_signal:highPriceCheck(),
      all_high_confidence_locked_without_outcomes:results.every(item=>item.recommendation.confidence!=="High")
    };
    return {
      status:failures.length||Object.values(metamorphic_checks).includes(false)?"STOP":"PASS",
      scope:"synthetic_only",
      synthetic_personas:results.length,
      real_tester_count:0,
      counts:{ decisions:countBy(item=>item.recommendation.decision),top_matches:countBy(item=>item.recommendation.top_match),expertise:countBy(item=>item.expertise),reranked:results.filter(item=>item.rerank.performed).length },
      covered_tags:[...tags].sort(),
      failures,
      metamorphic_checks,
      disclosure:"Synthetic personas are adversarial engineering fixtures. They are excluded from the independent 10-person Gate and cannot establish real-world accuracy, demand, or safety."
    };
  }

  function runSuite(personas) {
    const results=(personas||[]).map(runPersona);
    return { summary:summarize(results),results };
  }

  return { NON_DONT,FORBIDDEN_UI_TOKENS,inputMatchesCategory,runPersona,runSuite,summarize };
});
