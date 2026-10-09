(function (root, factory) {
  const api = factory();
  root.GameFitValidationGrowthPlan = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const checked_date = "2026-10-10";
  const channels = Object.freeze([
    Object.freeze({ rank:1, channel:"comparison_diagnosis_pages", decision_intent:5, funnel_fit:5, organic_reuse:4, operating_cost:3, role:"Capture current-gear vs candidate and buying-mistake intent; route directly into a prefilled diagnosis.", gate:"TEST" }),
    Object.freeze({ rank:2, channel:"free_tools", decision_intent:5, funnel_fit:5, organic_reuse:4, operating_cost:3, role:"Fix-before-buy checks and compatibility tools create value even when the answer is do not buy.", gate:"TEST" }),
    Object.freeze({ rank:3, channel:"seo", decision_intent:4, funnel_fit:5, organic_reuse:5, operating_cost:3, role:"Compound exact comparison and problem-led pages after evidence and rights QA.", gate:"TEST" }),
    Object.freeze({ rank:4, channel:"youtube_shorts", decision_intent:2, funnel_fit:3, organic_reuse:3, operating_cost:2, role:"Test hooks cheaply, but judge by qualified diagnosis starts rather than views.", gate:"TEST" }),
    Object.freeze({ rank:5, channel:"reddit_global", decision_intent:4, funnel_fit:3, organic_reuse:2, operating_cost:1, role:"Research objections and answer only where community rules allow; no automated promotion.", gate:"HOLD" }),
    Object.freeze({ rank:6, channel:"note", decision_intent:3, funnel_fit:3, organic_reuse:3, operating_cost:2, role:"Japanese education layer for misconceptions and decision briefs.", gate:"TEST" }),
    Object.freeze({ rank:7, channel:"x", decision_intent:1, funnel_fit:2, organic_reuse:2, operating_cost:2, role:"Fast message testing; weak purchase intent must be proven with downstream events.", gate:"TEST" })
  ]);
  const hooks = Object.freeze([
    Object.freeze({ theme:"why_not_to_upgrade", hook:"買わなくていい人を先に判定", structure:["current gear","meaningful delta","free checks","who should wait"], cta:"My Setupで差分を見る", feature:"DONT_UPGRADE + Current Gear Delta" }),
    Object.freeze({ theme:"cable_network_myth", hook:"そのケーブル、本当に必要？", structure:["claimed standard","actual prerequisite","known compatibility","do-not-buy condition"], cta:"Compatibilityを確認", feature:"Compatibility Guard + Decision Brief" }),
    Object.freeze({ theme:"cable_network_myth", hook:"Wi-Fi 7でもPingが下がらない場合", structure:["throughput vs latency","wired baseline","jitter/packet loss","official ISP boundary"], cta:"Fix Before Buyを確認", feature:"Network Fit + Fix Before Buy" }),
    Object.freeze({ theme:"device_regret", hook:"プロ使用率が高くてもあなたには合わない", structure:["pro adoption is context","hard avoid","personal fit","evidence confidence"], cta:"Gear Tasteを入力", feature:"Gear Taste + Regret Shield" }),
    Object.freeze({ theme:"current_gear_vs_candidate", hook:"Viper V3 ProからV4 Proに替える意味がある人／ない人", structure:["same evidence pair","preference split","delta","DONT/limited upgrade"], cta:"自分の条件で比較", feature:"Current Gear Delta + Upgrade Match" }),
    Object.freeze({ theme:"fix_before_buy", hook:"240Hzなのに144Hzで使ってない？", structure:["OS setting","cable/GPU path","game cap","purchase last"], cta:"無料チェックを実行", feature:"Fix Before Buy" })
  ]);
  const monetization = Object.freeze([
    Object.freeze({ category:"manufacturer_affiliate", unit_value:3, conversion_ease:3, purchase_frequency:2, gamefit_fit:4, coverage:2, human_effort:3, profit_per_effort:3, phase:"after intent validation", recommendation_rank_input:false }),
    Object.freeze({ category:"mall_affiliate", unit_value:2, conversion_ease:4, purchase_frequency:3, gamefit_fit:4, coverage:5, human_effort:2, profit_per_effort:3, phase:"after program approval", recommendation_rank_input:false }),
    Object.freeze({ category:"cable_accessory", unit_value:1, conversion_ease:3, purchase_frequency:2, gamefit_fit:3, coverage:4, human_effort:2, profit_per_effort:2, phase:"verified compatibility need only", recommendation_rank_input:false }),
    Object.freeze({ category:"network_device", unit_value:2, conversion_ease:2, purchase_frequency:1, gamefit_fit:3, coverage:3, human_effort:3, profit_per_effort:2, phase:"after network validation", recommendation_rank_input:false }),
    Object.freeze({ category:"isp_optical_line", unit_value:5, conversion_ease:1, purchase_frequency:1, gamefit_fit:2, coverage:2, human_effort:5, profit_per_effort:2, phase:"human and official review only", recommendation_rank_input:false }),
    Object.freeze({ category:"premium_watch", unit_value:3, conversion_ease:1, purchase_frequency:5, gamefit_fit:5, coverage:5, human_effort:3, profit_per_effort:4, phase:"after save/return willingness evidence", recommendation_rank_input:false }),
    Object.freeze({ category:"separated_sponsorship", unit_value:5, conversion_ease:1, purchase_frequency:2, gamefit_fit:1, coverage:2, human_effort:5, profit_per_effort:2, phase:"last; clearly labeled and ranking-isolated", recommendation_rank_input:false })
  ]);
  const premium = Object.freeze({
    free:["My Setup","basic recommendation","Regret Shield","basic Decision Brief"],
    candidates:["advanced Watch","price history / Buy Window","multiple setup profiles","long-term Gear Memory","advanced comparison / counterfactual budget allocation"],
    rule:"A paid feature must have recurring value or measurable incremental operating cost; the free decision must remain useful.",
    status:"hypothesis_only"
  });
  const workstreams = Object.freeze([
    Object.freeze({ name:"catalog maintenance", automation_class:"B", workload_units:18, mature_human_hours:5 }),
    Object.freeze({ name:"evidence refresh", automation_class:"B", workload_units:15, mature_human_hours:6 }),
    Object.freeze({ name:"rights review", automation_class:"C", workload_units:15, mature_human_hours:6 }),
    Object.freeze({ name:"variant verification", automation_class:"C", workload_units:15, mature_human_hours:5 }),
    Object.freeze({ name:"product launch watch", automation_class:"A", workload_units:15, mature_human_hours:2 }),
    Object.freeze({ name:"affiliate maintenance", automation_class:"B", workload_units:12, mature_human_hours:4 }),
    Object.freeze({ name:"user support", automation_class:"D", workload_units:10, mature_human_hours:7 })
  ]);
  const revenue_scenarios = Object.freeze([
    Object.freeze({ name:"pessimistic", assumptions:"hypothesis; taxes excluded", monthly_users:1000, diagnosis_setup_completion:0.25, purchase_intent:0.08, affiliate_click:0.30, affiliate_cv:0.02, average_commission:300, affiliate_reversal_rate:0.30, merchant_closure_haircut_rate:0.20, premium_conversion:0, premium_arpu:600, premium_refund_rate:0, payment_fee_rate:0.036, infra_api_cost:0, data_maintenance_cost:5000, human_hours:15, human_hourly_cost:2500 }),
    Object.freeze({ name:"base", assumptions:"hypothesis; taxes excluded", monthly_users:10000, diagnosis_setup_completion:0.40, purchase_intent:0.15, affiliate_click:0.40, affiliate_cv:0.04, average_commission:500, affiliate_reversal_rate:0.15, merchant_closure_haircut_rate:0.10, premium_conversion:0.005, premium_arpu:600, premium_refund_rate:0.08, payment_fee_rate:0.036, infra_api_cost:3000, data_maintenance_cost:10000, human_hours:35, human_hourly_cost:2500 }),
    Object.freeze({ name:"success", assumptions:"hypothesis; taxes excluded", monthly_users:50000, diagnosis_setup_completion:0.50, purchase_intent:0.20, affiliate_click:0.45, affiliate_cv:0.05, average_commission:800, affiliate_reversal_rate:0.10, merchant_closure_haircut_rate:0.05, premium_conversion:0.015, premium_arpu:600, premium_refund_rate:0.05, payment_fee_rate:0.036, infra_api_cost:15000, data_maintenance_cost:50000, human_hours:80, human_hourly_cost:2500 })
  ]);
  const sources = Object.freeze([
    Object.freeze({ title:"Amazon Associates JP fee schedule", url:"https://affiliate.amazon.co.jp/help/node/topic/GRXPHT8U84RAYDXZ", type:"official_program_terms", checked_date }),
    Object.freeze({ title:"Rakuten Affiliate guidelines", url:"https://affiliate.rakuten.co.jp/guideline/rule/", type:"official_program_terms", checked_date }),
    Object.freeze({ title:"NTT East service area check", url:"https://flets.com/app2/search_c.html", type:"official_availability", checked_date }),
    Object.freeze({ title:"Newegg PC Upgrader Tool", url:"https://kb.newegg.com/knowledge-base/pc-upgrader-tool", type:"competitor_official", checked_date }),
    Object.freeze({ title:"RTINGS Viper V3 Pro vs V4 Pro", url:"https://www.rtings.com/mouse/tools/compare/razer-viper-v3-pro-vs-razer-viper-v4-pro/59884/134208", type:"current_competitor_content", checked_date })
  ]);
  return { checked_date, channels, hooks, monetization, premium, workstreams, revenue_scenarios, sources, external_publication_authorized:false };
});
