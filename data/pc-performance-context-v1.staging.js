(function(root,factory){
  const api=factory();
  root.GameFitPcPerformanceContextV1Staging=api;
  if(typeof module==="object"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const CHECKED_AT="2026-10-11";
  const POLICY_VERSION="pc-performance-context-v1-staging";

  const BASELINE_REQUIRED=Object.freeze(["game_id","cpu_id","gpu_id","ram_gb"]);
  const TARGET_FIELDS=Object.freeze(["resolution","target_fps","graphics_preset"]);
  const ADVANCED_TARGET_FIELDS=Object.freeze(["ray_tracing","upscaling","frame_generation"]);
  const OBSERVED_FIELDS=Object.freeze([
    "actual_fps_avg","fps_1pct_low","gpu_utilization_pct","cpu_utilization_pct",
    "gpu_temp_c","cpu_temp_c","vram_used_gb","ram_used_gb","frame_time_ms"
  ]);

  const RESOLUTIONS=Object.freeze(["1080p","1440p","4k"]);
  const PRESETS=Object.freeze(["low","medium","high","ultra","competitive_custom"]);

  const marketSignals=Object.freeze({
    pcpartpicker:Object.freeze({
      estimated_monthly_visits:9010000,
      estimate_month:"2026-08",
      provider:"SEMrush",
      signal_type:"domain_reach",
      use:"component selection and compatibility demand",
      source_url:"https://www.semrush.com/website/pcpartpicker.com/overview/"
    }),
    technical_city:Object.freeze({
      estimated_monthly_visits:10140000,
      estimate_month:"2026-08",
      provider:"SEMrush",
      signal_type:"domain_reach",
      use:"CPU/GPU comparison and game requirements demand",
      source_url:"https://www.semrush.com/website/technical.city/overview/"
    }),
    pcgamebenchmark:Object.freeze({
      estimated_monthly_visits:624650,
      estimate_month:"2026-08",
      provider:"SEMrush",
      signal_type:"domain_reach",
      use:"Can-I-run-it, FPS and upgrade-advice demand",
      source_url:"https://www.semrush.com/website/pcgamebenchmark.com/overview/"
    }),
    system_requirements_lab:Object.freeze({
      estimated_monthly_visits:null,
      estimate_month:"2026-10",
      provider:"site-published usage",
      signal_type:"feature_usage_claim",
      use:"Can You RUN It checks",
      source_url:"https://svc.systemrequirementslab.com/cyri/",
      usage_claim:"millions of checks per month; billions since 2005",
      current_examples:Object.freeze({
        valorant_last_30d:29393,
        fortnite_last_30d:23862,
        cs2_last_30d:23694
      })
    }),
    canirun_gg:Object.freeze({
      estimated_monthly_visits:null,
      estimate_month:"2026-10",
      provider:"site-published catalog size",
      signal_type:"catalog_scale",
      use:"browser-based game compatibility",
      source_url:"https://canirun.gg/",
      catalog_claim:"14075 games; 182 GPUs; 97 CPUs"
    })
  });

  const progressiveInputPolicy=Object.freeze({
    baseline:Object.freeze({
      required:BASELINE_REQUIRED,
      optional:Object.freeze(["vram_gb","storage_free_gb","os_id","storage_type"]),
      purpose:"requirements_compatibility"
    }),
    performance_target:Object.freeze({
      required_when:"user asks whether to upgrade or wants expected performance",
      fields:TARGET_FIELDS,
      advanced:ADVANCED_TARGET_FIELDS,
      purpose:"define the goal before judging an upgrade"
    }),
    observed_verification:Object.freeze({
      required_when:"GameFit is about to name a limiting component or recommend hardware replacement",
      fields:OBSERVED_FIELDS,
      purpose:"verify a repeatable real limitation before spending"
    })
  });

  const decisionStates=Object.freeze([
    "BASELINE_INCOMPLETE",
    "REQUIREMENTS_CHECK",
    "TARGET_NEEDED",
    "TARGET_MET",
    "FREE_CHECK_FIRST",
    "VERIFY_LIMITER",
    "UPGRADE_CANDIDATE",
    "CLARIFY"
  ]);

  function finitePositive(value){
    return Number.isFinite(Number(value)) && Number(value)>0;
  }

  function validateBaseline(value){
    const errors=[];
    for(const key of BASELINE_REQUIRED) if(value?.[key]===undefined||value?.[key]===null||value?.[key]==="") errors.push(key+" is required");
    if(value?.ram_gb!==undefined&&!finitePositive(value.ram_gb)) errors.push("ram_gb must be positive");
    if(value?.vram_gb!==undefined&&value.vram_gb!==null&&!finitePositive(value.vram_gb)) errors.push("vram_gb must be positive when provided");
    if(value?.storage_free_gb!==undefined&&value.storage_free_gb!==null&&!finitePositive(value.storage_free_gb)) errors.push("storage_free_gb must be positive when provided");
    return errors;
  }

  function validateTarget(value){
    const errors=[];
    if(!RESOLUTIONS.includes(value?.resolution)) errors.push("resolution is invalid");
    if(!finitePositive(value?.target_fps)) errors.push("target_fps must be positive");
    if(!PRESETS.includes(value?.graphics_preset)) errors.push("graphics_preset is invalid");
    return errors;
  }

  function nextQuestion(context={}){
    const baselineErrors=validateBaseline(context.baseline||{});
    if(baselineErrors.length) return Object.freeze({state:"BASELINE_INCOMPLETE",ask:"baseline",errors:baselineErrors});
    if(context.intent==="can_run") return Object.freeze({state:"REQUIREMENTS_CHECK",ask:null});
    if(!context.target||validateTarget(context.target).length) return Object.freeze({state:"TARGET_NEEDED",ask:"performance_target"});
    if(context.target_met===true) return Object.freeze({state:"TARGET_MET",ask:null});
    if(context.free_checks_completed!==true) return Object.freeze({state:"FREE_CHECK_FIRST",ask:"free_checks"});
    if(context.limiter_assessment?.status!=="verified") return Object.freeze({state:"VERIFY_LIMITER",ask:"observed_verification"});
    if(context.compatibility_verified!==true) return Object.freeze({state:"CLARIFY",ask:"compatibility"});
    return Object.freeze({state:"UPGRADE_CANDIDATE",ask:null});
  }

  function upgradeGate(context={}){
    const step=nextQuestion(context);
    return Object.freeze({
      eligible:step.state==="UPGRADE_CANDIDATE",
      state:step.state,
      reason:step.state==="UPGRADE_CANDIDATE"
        ?"A target miss, free-check completion, verified limiter assessment, and compatibility check are all present."
        :"Do not recommend replacement hardware until the progressive PC decision path reaches UPGRADE_CANDIDATE."
    });
  }

  function prohibitFalsePrecision(payload={}){
    const forbidden=["bottleneck_percentage","exact_fps_guarantee","performance_guarantee","upgrade_score_without_methodology"];
    return forbidden.filter(key=>Object.prototype.hasOwnProperty.call(payload,key));
  }

  return {
    CHECKED_AT,
    POLICY_VERSION,
    BASELINE_REQUIRED,
    TARGET_FIELDS,
    ADVANCED_TARGET_FIELDS,
    OBSERVED_FIELDS,
    RESOLUTIONS,
    PRESETS,
    marketSignals,
    progressiveInputPolicy,
    decisionStates,
    validateBaseline,
    validateTarget,
    nextQuestion,
    upgradeGate,
    prohibitFalsePrecision
  };
});
