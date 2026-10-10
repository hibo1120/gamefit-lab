(function(root,factory){
  const api=factory();
  root.GameFitClassificationStrategyV1Staging=api;
  if(typeof module==="object"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const CHECKED_AT="2026-10-11";
  const MARKET_SIGNAL_LEVELS=Object.freeze(["low","medium","high","very_high"]);
  const DIFFERENTIATION_LEVELS=Object.freeze(["low","medium","high"]);
  const COST_LEVELS=Object.freeze(["low","medium","high"]);
  const SURFACES=Object.freeze(["core_input","core_guard","deferred_input","result_core","reference_only","pc_context","research_only"]);
  const STATUSES=Object.freeze(["GO","TEST","HOLD","NO-GO"]);

  const trafficSignals=Object.freeze({
    rtings:Object.freeze({
      domain:"rtings.com",
      estimated_monthly_visits:9560000,
      estimate_month:"2026-08",
      provider:"SEMrush",
      estimate_scope:"domain_not_feature",
      estimated:true,
      product_scale:"416 mice bought and tested",
      source_url:"https://www.semrush.com/website/rtings.com/overview/"
    }),
    pcpartpicker:Object.freeze({
      domain:"pcpartpicker.com",
      estimated_monthly_visits:9010000,
      estimate_month:"2026-08",
      provider:"SEMrush",
      estimate_scope:"domain_not_feature",
      estimated:true,
      product_scale:"high-engagement compatibility/system-builder workflow",
      source_url:"https://www.semrush.com/website/pcpartpicker.com/overview/"
    }),
    prosettings:Object.freeze({
      domain:"prosettings.net",
      estimated_monthly_visits:5100000,
      estimate_month:"2026-08",
      provider:"third-party traffic estimate using Semrush-class data",
      estimate_scope:"domain_not_feature",
      estimated:true,
      product_scale:"754 VALORANT pro players / 148 teams on game hub; 700-player mouse sample in Oct 2026 guide",
      source_url:"https://analytics.explodingtopics.com/website/prosettings.net"
    }),
    eloshapes:Object.freeze({
      domain:"eloshapes.com",
      estimated_monthly_visits:589000,
      estimate_month:"2026-09_or_latest_aggregate",
      provider:"HypeStat aggregate",
      estimate_scope:"domain_not_feature",
      estimated:true,
      product_scale:"more than 1700 gaming mice in compare database",
      source_url:"https://hypestat.com/info/eloshapes.com"
    }),
    fpslab:Object.freeze({
      domain:"fpstools.com",
      estimated_monthly_visits:null,
      estimate_month:null,
      provider:null,
      estimate_scope:"no_reliable_public_estimate_found",
      estimated:true,
      product_scale:"173 mouse database candidates; 4-question finder",
      source_url:"https://fpstools.com/gear/mouse-finder"
    })
  });

  const classifications=Object.freeze({
    product_category:Object.freeze({
      classification_id:"product_category",
      market_signal:"very_high",
      differentiation:"low",
      cognitive_cost:"low",
      maintenance_cost:"low",
      surface:"core_input",
      status:"GO",
      evidence_basis:Object.freeze(["rtings","pcpartpicker"]),
      rationale:"Large comparison/build sites organize decisions around product/component categories. This is expected navigation, not GameFit differentiation.",
      absence_policy:"not_applicable"
    }),

    exact_game_input:Object.freeze({
      classification_id:"exact_game_input",
      market_signal:"high",
      differentiation:"medium",
      cognitive_cost:"low",
      maintenance_cost:"low",
      surface:"core_input",
      status:"GO",
      evidence_basis:Object.freeze(["prosettings"]),
      rationale:"Game-specific databases have clear demand, but GameFit uses Game + Input primarily to prevent context contamination rather than to invent per-game peripheral weights.",
      absence_policy:"not_applicable"
    }),

    compatibility:Object.freeze({
      classification_id:"compatibility",
      market_signal:"very_high",
      differentiation:"medium",
      cognitive_cost:"low",
      maintenance_cost:"medium",
      surface:"core_guard",
      status:"GO",
      evidence_basis:Object.freeze(["pcpartpicker"]),
      rationale:"PCPartPicker-scale usage is strong evidence that compatibility checks solve a real planning problem. GameFit should keep Compatibility Guard foundational.",
      absence_policy:"not_applicable"
    }),

    budget:Object.freeze({
      classification_id:"budget",
      market_signal:"high",
      differentiation:"low",
      cognitive_cost:"medium",
      maintenance_cost:"low",
      surface:"deferred_input",
      status:"TEST",
      evidence_basis:Object.freeze(["pcpartpicker","fpslab"]),
      rationale:"Budget is common in build guides and finders, but GameFit can defer it until purchase comparison is actually necessary so DONT_UPGRADE/Fix First paths avoid irrelevant input.",
      absence_policy:"not_applicable"
    }),

    hand_grip_physical_fit:Object.freeze({
      classification_id:"hand_grip_physical_fit",
      market_signal:"medium",
      differentiation:"medium",
      cognitive_cost:"medium",
      maintenance_cost:"medium",
      surface:"deferred_input",
      status:"TEST",
      evidence_basis:Object.freeze(["eloshapes","fpslab"]),
      rationale:"Shape/size/grip classification is visibly established in specialist mouse tools. GameFit should use it only when a mouse choice remains unresolved, not as universal onboarding.",
      absence_policy:"preserve_as_optional_specialist_signal"
    }),

    pro_adoption:Object.freeze({
      classification_id:"pro_adoption",
      market_signal:"very_high",
      differentiation:"low",
      cognitive_cost:"low",
      maintenance_cost:"high",
      surface:"reference_only",
      status:"TEST",
      evidence_basis:Object.freeze(["prosettings"]),
      rationale:"Strong audience demand exists for Pro gear/settings. Raw Pro usage is not differentiation and must remain reference-only; GameFit's opportunity is to show where Pro usage conflicts with the user's Personal Fit.",
      absence_policy:"not_applicable"
    }),

    role_weapon_style:Object.freeze({
      classification_id:"role_weapon_style",
      market_signal:"low",
      differentiation:"medium",
      cognitive_cost:"high",
      maintenance_cost:"high",
      surface:"research_only",
      status:"HOLD",
      evidence_basis:Object.freeze([]),
      rationale:"Major comparison/pro-gear sites reviewed here do not provide strong evidence that Role/Weapon/Combat Style should drive hardware purchase ranking. Preserve as a research hypothesis or optional Pro filter rather than delete it.",
      absence_policy:"preserve_as_differentiation_hypothesis"
    }),

    current_gear_delta:Object.freeze({
      classification_id:"current_gear_delta",
      market_signal:"high",
      differentiation:"high",
      cognitive_cost:"low",
      maintenance_cost:"medium",
      surface:"result_core",
      status:"GO",
      evidence_basis:Object.freeze(["rtings","eloshapes"]),
      rationale:"Pairwise comparison demand is proven by large comparison tools, but GameFit differentiates by anchoring every difference to the user's current gear and suppressing irrelevant specs.",
      absence_policy:"preserve_and_prioritize_differentiation"
    }),

    fix_before_buy:Object.freeze({
      classification_id:"fix_before_buy",
      market_signal:"low",
      differentiation:"high",
      cognitive_cost:"low",
      maintenance_cost:"medium",
      surface:"result_core",
      status:"TEST",
      evidence_basis:Object.freeze([]),
      rationale:"Large traffic proof is limited, but adjacent upgrade-diagnostic tools increasingly tell users to verify settings/bottlenecks before spending. Lack of a dominant incumbent is treated as differentiation opportunity, not a deletion signal.",
      absence_policy:"preserve_and_validate_differentiation"
    }),

    dont_upgrade:Object.freeze({
      classification_id:"dont_upgrade",
      market_signal:"low",
      differentiation:"high",
      cognitive_cost:"low",
      maintenance_cost:"low",
      surface:"result_core",
      status:"TEST",
      evidence_basis:Object.freeze([]),
      rationale:"Most shopping/review experiences optimize toward a product choice. A formal 'keep current gear' answer is weakly represented in major comparison sites and therefore remains a high-value GameFit differentiation hypothesis.",
      absence_policy:"preserve_and_validate_differentiation"
    }),

    pc_performance_target:Object.freeze({
      classification_id:"pc_performance_target",
      market_signal:"very_high",
      differentiation:"medium",
      cognitive_cost:"medium",
      maintenance_cost:"high",
      surface:"pc_context",
      status:"TEST",
      evidence_basis:Object.freeze(["pcpartpicker"]),
      rationale:"PC planning tools strongly organize around system components, compatibility, use case and budget. GameFit should build a separate PC Performance Context using game/resolution/target FPS/settings/current components rather than peripheral motor-skill Game DNA.",
      absence_policy:"not_applicable"
    }),

    game_specific_peripheral_weights:Object.freeze({
      classification_id:"game_specific_peripheral_weights",
      market_signal:"low",
      differentiation:"low",
      cognitive_cost:"high",
      maintenance_cost:"high",
      surface:"research_only",
      status:"HOLD",
      evidence_basis:Object.freeze(["rtings","prosettings"]),
      rationale:"Different games have different Pro adoption distributions, but the same top peripheral families recur across FPS titles and independent evidence does not currently justify bespoke GameFit weight matrices.",
      absence_policy:"preserve_as_internal_hypothesis_only"
    })
  });

  function validateTrafficSignal(signal){
    const errors=[];
    if(!signal?.domain) errors.push("domain is required");
    if(signal?.estimate_scope!=="domain_not_feature" && signal?.estimate_scope!=="no_reliable_public_estimate_found") errors.push("estimate_scope must distinguish domain traffic from feature usage");
    if(signal?.estimated_monthly_visits!==null && (!Number.isFinite(signal.estimated_monthly_visits)||signal.estimated_monthly_visits<0)) errors.push("traffic estimate must be finite non-negative or null");
    if(signal?.estimated!==true) errors.push("traffic must be explicitly marked estimated");
    return errors;
  }

  function validateClassification(item){
    const errors=[];
    if(!item?.classification_id) errors.push("classification_id is required");
    if(!MARKET_SIGNAL_LEVELS.includes(item?.market_signal)) errors.push("invalid market_signal");
    if(!DIFFERENTIATION_LEVELS.includes(item?.differentiation)) errors.push("invalid differentiation");
    if(!COST_LEVELS.includes(item?.cognitive_cost)) errors.push("invalid cognitive_cost");
    if(!COST_LEVELS.includes(item?.maintenance_cost)) errors.push("invalid maintenance_cost");
    if(!SURFACES.includes(item?.surface)) errors.push("invalid surface");
    if(!STATUSES.includes(item?.status)) errors.push("invalid status");
    if(!Array.isArray(item?.evidence_basis)) errors.push("evidence_basis must be an array");
    for(const id of item?.evidence_basis||[]) if(!trafficSignals[id]) errors.push("unknown evidence source: "+id);
    if(!item?.rationale) errors.push("rationale is required");
    if(!item?.absence_policy) errors.push("absence_policy is required");
    return errors;
  }

  function strategyBuckets(){
    const out={core:[],deferred:[],reference:[],differentiation:[],research:[]};
    for(const item of Object.values(classifications)){
      if(["core_input","core_guard"].includes(item.surface)) out.core.push(item.classification_id);
      else if(item.surface==="deferred_input") out.deferred.push(item.classification_id);
      else if(item.surface==="reference_only") out.reference.push(item.classification_id);
      else if(item.surface==="result_core"&&item.differentiation==="high") out.differentiation.push(item.classification_id);
      else out.research.push(item.classification_id);
    }
    return out;
  }

  function marketAbsenceDecision(item){
    if(!item) return null;
    if(item.market_signal!=="low") return Object.freeze({delete:false,reason:"market signal exists"});
    return Object.freeze({
      delete:false,
      reason:item.differentiation==="high"||item.absence_policy.includes("preserve")
        ?"low market proof is not deletion evidence; preserve for differentiated validation"
        :"retain as research until direct evidence changes"
    });
  }

  return {
    CHECKED_AT,
    trafficSignals,
    classifications,
    validateTrafficSignal,
    validateClassification,
    strategyBuckets,
    marketAbsenceDecision
  };
});
