(function (root, factory) {
  const api = factory();
  root.GameFitValidation = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const EVENT_DEFINITIONS = Object.freeze({
    landing_viewed: [],
    tester_profile_recorded: ["expertise","purchase_contexts","independence_confirmed","developer_or_contributor","answer_aware","consent_confirmed","data_origin"],
    demand_qualified: ["shopping_state","purchase_window","problem_state"], my_setup_started: [],
    gear_taste_completed: ["attributes_count"], next_upgrade_reached: [], decision_viewed: ["decision","affiliate_eligible","top_candidate_id"],
    regret_shield_viewed: ["risk_level","confidence_label"],
    why_not_opened: [], rerank_requested: ["reason_count","direction_count","reason_codes","desired_direction_codes"], rerank_completed: ["rerank_success","confidence_change"],
    recommendation_feedback: ["verdict"], dont_upgrade_response: ["accepted"], save_return_intent: ["intent"],
    purchase_route_intent: ["destination_type","commercial_relationship","merchant_id"],
    safety_incident_recorded: ["incident_type","confirmed"],
    tester_self_review_recorded: ["self_reported_reason_understood","intended_judgment","ux_issue_codes"],
    session_review_completed: ["flow_completed","reason_understood","intended_judgment","assistance_level","severe_error","privacy_incident","game_input_contamination","hard_avoid_violation","compatibility_major_violation","affiliate_rank_influence","ux_issue_codes"]
  });
  const COMMON_PROPERTIES = Object.freeze(["journey_id","category","game_id","input_method","source","content_id","entry_offer","campaign","cohort","locale","traffic_class","sequence","elapsed_ms"]);
  const OPTIONAL_COMMON_PROPERTIES = Object.freeze(["build_id"]);
  const ENUMS = Object.freeze({
    category:new Set(["mouse","keyboard","monitor","mousepad","mouse_skates","audio","controller","network","cable","unknown"]),
    input_method:new Set(["mnk","controller","unknown"]), decision:new Set(["SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","EXPLORE","AVOID","DONT_UPGRADE","CLARIFY"]),
    confidence_change:new Set(["increased","decreased","unchanged"]), verdict:new Set(["agree","disagree","unsure"]), intent:new Set(["save","return","none"]),
    destination_type:new Set(["manufacturer","marketplace","accessory","network","isp"]), commercial_relationship:new Set(["affiliate","non_affiliate","none"]),
    shopping_state:new Set(["actively_shopping","considering","not_shopping"]), purchase_window:new Set(["within_30_days","within_90_days","later","none"]),
    problem_state:new Set(["specific_problem","general_dissatisfaction","no_problem"]), source:new Set(["direct","youtube","x","google_search","note","reddit","referral","private_fixture","private_tester"]),
    entry_offer:new Set(["comparison","diagnosis","free_tool","guide","community"]), cohort:new Set(["n10","n30","n100","internal"]), locale:new Set(["ja","en"]),
    traffic_class:new Set(["external_qualified","tester","internal_qa","bot_suspected"]),
    expertise:new Set(["beginner","intermediate","enthusiast"]), data_origin:new Set(["observed_participant","synthetic_fixture","internal_qa"]),
    risk_level:new Set(["low","medium","high","unknown"]), confidence_label:new Set(["Low","Medium","High"]),
    intended_judgment:new Set(["keep_current","fix_setup_first","compare_more","buy_candidate","avoid_candidate","unsure"]),
    assistance_level:new Set(["none","navigation_only","substantive"]),
    incident_type:new Set(["dangerous_recommendation","hard_avoid_violation","game_input_contamination","compatibility_major_violation","affiliate_rank_influence","privacy_leak"])
  });
  const FORBIDDEN_PROPERTIES = new Set(["email","name","address","phone","ip","user_id","distinct_id","hardware_free_text","comment","free_text"]);
  const CONTEXT_KEYS = Object.freeze(["category","game_id","input_method","source","content_id","entry_offer","campaign","cohort","locale","traffic_class","build_id"]);
  const CONTEXT_ALLOW_UNKNOWN = new Set(["category","game_id","input_method"]);
  const PURCHASE_CONTEXTS = new Set(["actively_deciding","current_gear_dissatisfied","recently_considered_upgrade","no_purchase_may_be_best"]);
  const REASON_CODES = new Set(["shape","size","weight","click","price","brand","game_fit","durability","software","current_gear_delta_small","other"]);
  const DIRECTION_CODES = new Set(["lighter","heavier","smaller","larger","lower_hump","cheaper","same_brand","different_brand","higher_performance","safer_familiar","do_not_upgrade"]);
  const UX_ISSUE_CODES = new Set(["none","navigation","wording","reason_unclear","too_much_detail","too_little_detail","missing_current_product","mobile_layout","storage_controls","other"]);

  function isSlug(value) { return typeof value === "string" && /^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(value); }

  function validateEvent(event) {
    const errors = [];
    if (!event || !Object.hasOwn(EVENT_DEFINITIONS,event.name)) return ["unknown event"];
    const properties = event.properties || {};
    for (const key of [...COMMON_PROPERTIES,...EVENT_DEFINITIONS[event.name]]) {
      if (properties[key] === undefined || properties[key] === null || properties[key] === "") errors.push(`${key} is required for ${event.name}`);
    }
    const allowed = new Set([...COMMON_PROPERTIES,...OPTIONAL_COMMON_PROPERTIES,...EVENT_DEFINITIONS[event.name]]);
    for (const key of Object.keys(properties)) {
      if (!allowed.has(key)) errors.push(`${key} is not allowed for ${event.name}`);
      if (FORBIDDEN_PROPERTIES.has(key)) errors.push(`${key} is forbidden`);
    }
    for (const [key,values] of Object.entries(ENUMS)) if (properties[key] !== undefined && !values.has(properties[key])) errors.push(`${key} has an unsupported value`);
    if (!isSlug(properties.journey_id)) errors.push("journey_id must be an explicitly supplied local slug");
    for (const key of ["game_id","content_id","campaign","merchant_id","top_candidate_id","build_id"]) if (properties[key] !== undefined && !isSlug(properties[key])) errors.push(`${key} must be a privacy-safe slug`);
    for (const key of ["attributes_count","reason_count","direction_count","sequence","elapsed_ms"]) {
      if (properties[key] !== undefined && (!Number.isInteger(properties[key]) || properties[key] < 0)) errors.push(`${key} must be a non-negative integer`);
    }
    for (const key of ["rerank_success","accepted","affiliate_eligible","reason_understood","self_reported_reason_understood","severe_error","privacy_incident","flow_completed","game_input_contamination","hard_avoid_violation","compatibility_major_violation","affiliate_rank_influence","independence_confirmed","developer_or_contributor","answer_aware","consent_confirmed","confirmed"]) {
      if (properties[key] !== undefined && typeof properties[key] !== "boolean") errors.push(`${key} must be boolean`);
    }
    for (const [key,allowlist,minItems] of [
      ["purchase_contexts",PURCHASE_CONTEXTS,1],
      ["reason_codes",REASON_CODES,0],
      ["desired_direction_codes",DIRECTION_CODES,0],
      ["ux_issue_codes",UX_ISSUE_CODES,1]
    ]) {
      if (properties[key] === undefined) continue;
      if (!Array.isArray(properties[key]) || properties[key].length < minItems || new Set(properties[key]).size !== properties[key].length || properties[key].some(value=>!allowlist.has(value))) {
        errors.push(`${key} contains unsupported or duplicate values`);
      }
    }
    if (event.name === "tester_profile_recorded") {
      if (!properties.independence_confirmed || properties.developer_or_contributor || properties.answer_aware) errors.push("tester must be independent and unaware of the expected answer");
      if (!properties.consent_confirmed) errors.push("tester consent must be confirmed");
      if (properties.data_origin !== "observed_participant") errors.push("real tester profile requires observed_participant origin");
    }
    if (event.name === "rerank_requested") {
      if (properties.reason_count !== properties.reason_codes?.length) errors.push("reason_count must match reason_codes");
      if (properties.direction_count !== properties.desired_direction_codes?.length) errors.push("direction_count must match desired_direction_codes");
    }
    if (event.name === "demand_qualified") {
      if (properties.shopping_state === "not_shopping" && properties.purchase_window !== "none") errors.push("not_shopping requires purchase_window none");
      if (["actively_shopping","considering"].includes(properties.shopping_state) && properties.purchase_window === "none") errors.push("shopping intent requires a purchase window");
    }
    return [...new Set(errors)];
  }

  function createLocalHarness() {
    let records = [], sequence = 0, startedAt = Date.now();
    return Object.freeze({
      capture(name,properties) {
        const event = { name, properties:{ ...(properties || {}) } };
        if (event.properties.sequence === undefined) event.properties.sequence = sequence++;
        if (event.properties.elapsed_ms === undefined) event.properties.elapsed_ms = Math.max(0,Date.now()-startedAt);
        const errors = validateEvent(event);
        if (errors.length) return { accepted:false, errors };
        records.push(Object.freeze({ name, properties:Object.freeze({ ...event.properties }) }));
        return { accepted:true, errors:[] };
      },
      events() { return records.map(event=>({ name:event.name, properties:{ ...event.properties } })); },
      reset() { records=[]; sequence=0; startedAt=Date.now(); }, transport:"none", external_sending_enabled:false
    });
  }

  function rate(numerator,denominator) { return { numerator, denominator, rate:denominator > 0 ? numerator/denominator : null }; }
  function median(values) {
    if (!values.length) return null;
    const middle=Math.floor(values.length/2);
    return values.length%2 ? values[middle] : (values[middle-1]+values[middle])/2;
  }

  function computeMetrics(events) {
    const invalid = (events || []).flatMap((event,index)=>validateEvent(event).map(error=>({ index,error })));
    if (invalid.length) return { valid:false, errors:invalid, metrics:null };
    const candidates = events.filter(event=>!["internal_qa","bot_suspected"].includes(event.properties.traffic_class));
    const grouped = new Map();
    for (const event of candidates) { const id=event.properties.journey_id; if (!grouped.has(id)) grouped.set(id,[]); grouped.get(id).push(event); }
    const journeys = new Map(), excludedJourneys = [];
    for (const [id,records] of grouped) {
      const sorted=[...records].sort((a,b)=>a.properties.sequence-b.properties.sequence);
      const mismatch=CONTEXT_KEYS.some(key=>{
        const values=new Set(sorted.map(event=>event.properties[key]).filter(value=>!CONTEXT_ALLOW_UNKNOWN.has(key)||value!=="unknown"));
        return values.size>1;
      });
      const duplicateSequence=new Set(sorted.map(event=>event.properties.sequence)).size!==sorted.length;
      const timeReversal=sorted.some((event,index)=>index>0 && event.properties.elapsed_ms<sorted[index-1].properties.elapsed_ms);
      if (mismatch || duplicateSequence || timeReversal) excludedJourneys.push(id); else journeys.set(id,sorted);
    }
    const sequenceOf=(id,name)=>{ const matches=(journeys.get(id)||[]).filter(event=>event.name===name); return matches.length?Math.max(...matches.map(event=>event.properties.sequence)):null; };
    const eventAfter=(id,name,priorName)=>{ const current=sequenceOf(id,name),prior=sequenceOf(id,priorName); return current!==null&&prior!==null&&current>prior; };
    const latest=(id,name)=>[...(journeys.get(id)||[])].reverse().find(event=>event.name===name)||null;
    const landingIds=new Set([...journeys].filter(([,records])=>records.some(event=>event.name==="landing_viewed")).map(([id])=>id));
    const verifiedTesterIds=new Set([...landingIds].filter(id=>{
      const event=latest(id,"tester_profile_recorded");
      return event&&event.properties.sequence>sequenceOf(id,"landing_viewed")&&event.properties.data_origin==="observed_participant"&&event.properties.independence_confirmed&&!event.properties.developer_or_contributor&&!event.properties.answer_aware&&event.properties.consent_confirmed;
    }));
    const setupIds=new Set([...landingIds].filter(id=>eventAfter(id,"my_setup_started","landing_viewed")));
    const tasteIds=new Set([...setupIds].filter(id=>eventAfter(id,"gear_taste_completed","my_setup_started")));
    const upgradeIds=new Set([...tasteIds].filter(id=>eventAfter(id,"next_upgrade_reached","gear_taste_completed")));
    const qualifiedIds=new Set([...landingIds].filter(id=>{ const event=latest(id,"demand_qualified"); return event&&event.properties.sequence>sequenceOf(id,"landing_viewed")&&event.properties.shopping_state!=="not_shopping"&&event.properties.problem_state!=="no_problem"; }));
    const decisionEvents=[...upgradeIds].map(id=>latest(id,"decision_viewed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"next_upgrade_reached"));
    const decisionIds=new Set(decisionEvents.map(event=>event.properties.journey_id));
    const recommendableDecisionIds=new Set(decisionEvents.filter(event=>event.properties.decision!=="CLARIFY"&&event.properties.top_candidate_id!=="none").map(event=>event.properties.journey_id));
    const regretShieldIds=new Set([...decisionIds].filter(id=>eventAfter(id,"regret_shield_viewed","decision_viewed")));
    const affiliateEligibleIds=new Set(decisionEvents.filter(event=>event.properties.affiliate_eligible).map(event=>event.properties.journey_id));
    const whyNotIds=new Set([...decisionIds].filter(id=>eventAfter(id,"why_not_opened","decision_viewed")));
    const rerankRequestIds=new Set([...whyNotIds].filter(id=>eventAfter(id,"rerank_requested","why_not_opened")));
    const rerankEvents=[...rerankRequestIds].map(id=>latest(id,"rerank_completed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"rerank_requested"));
    const feedback=[...recommendableDecisionIds].map(id=>latest(id,"recommendation_feedback")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"decision_viewed"));
    const dontDecisionIds=new Set(decisionEvents.filter(event=>event.properties.decision==="DONT_UPGRADE").map(event=>event.properties.journey_id));
    const dontResponses=[...dontDecisionIds].map(id=>latest(id,"dont_upgrade_response")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"decision_viewed"));
    const saveReturnIds=new Set([...decisionIds].filter(id=>{ const event=latest(id,"save_return_intent"); return event&&event.properties.sequence>sequenceOf(id,"decision_viewed")&&event.properties.intent!=="none"; }));
    const affiliateIntentIds=new Set([...affiliateEligibleIds].filter(id=>{ const event=latest(id,"purchase_route_intent"); return event&&event.properties.sequence>sequenceOf(id,"decision_viewed")&&event.properties.commercial_relationship==="affiliate"; }));
    const reviews=[...landingIds].map(id=>latest(id,"session_review_completed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"landing_viewed"));
    const reviewById=new Map(reviews.map(event=>[event.properties.journey_id,event]));
    const flowCompletedIds=new Set([...regretShieldIds].filter(id=>{
      const review=reviewById.get(id);
      return review&&review.properties.flow_completed===true&&review.properties.assistance_level==="none"&&review.properties.sequence>sequenceOf(id,"regret_shield_viewed");
    }));
    const incidents=candidates.filter(event=>event.name==="safety_incident_recorded"&&event.properties.confirmed);
    const times=reviews.map(event=>event.properties.elapsed_ms).sort((a,b)=>a-b);
    const successfulJourneys=new Set([
      ...feedback.filter(event=>event.properties.verdict==="agree").map(event=>event.properties.journey_id),
      ...dontResponses.filter(event=>event.properties.accepted).map(event=>event.properties.journey_id),
      ...rerankEvents.filter(event=>event.properties.rerank_success).map(event=>event.properties.journey_id)
    ]).size;
    const metrics={
      my_setup_start_rate:rate(setupIds.size,landingIds.size), qualified_demand_rate:rate(qualifiedIds.size,landingIds.size),
      gear_taste_input_rate:rate(tasteIds.size,setupIds.size), next_upgrade_reach_rate:rate(upgradeIds.size,setupIds.size),
      why_not_usage_rate:rate(whyNotIds.size,decisionIds.size), rerank_usage_rate:rate(rerankRequestIds.size,whyNotIds.size),
      recommendation_acceptance_rate:rate(feedback.filter(event=>event.properties.verdict==="agree").length,feedback.length), correction_rate:rate(feedback.filter(event=>event.properties.verdict==="disagree").length,feedback.length),
      re_ranking_success:rate(rerankEvents.filter(event=>event.properties.rerank_success).length,rerankEvents.length), dont_upgrade_acceptance_rate:rate(dontResponses.filter(event=>event.properties.accepted).length,dontResponses.length),
      coverage_gap_rate:rate(decisionEvents.filter(event=>event.properties.decision==="CLARIFY"||event.properties.top_candidate_id==="none").length,decisionIds.size),
      save_return_intent_rate:rate(saveReturnIds.size,decisionIds.size), affiliate_cta_intent_rate:rate(affiliateIntentIds.size,affiliateEligibleIds.size)
    };
    return {
      valid:true, errors:[], excluded_journeys:excludedJourneys,
      denominator_policy:Object.freeze({ my_setup_start_rate:"landing_viewed journeys",qualified_demand_rate:"landing_viewed journeys; requires shopping state and a current problem",gear_taste_input_rate:"my_setup_started journeys",next_upgrade_reach_rate:"my_setup_started journeys",why_not_usage_rate:"decision_viewed journeys",rerank_usage_rate:"why_not_opened journeys",recommendation_acceptance_rate:"all recommendation_feedback responses, including unsure",correction_rate:"all recommendation_feedback responses, including unsure",re_ranking_success:"ordered rerank_completed journeys",dont_upgrade_acceptance_rate:"ordered DONT_UPGRADE responses",save_return_intent_rate:"decision_viewed journeys",affiliate_cta_intent_rate:"affiliate-eligible decision_viewed journeys" }),
      counts:{ landings:landingIds.size,verified_testers:verifiedTesterIds.size,qualified:qualifiedIds.size,setups:setupIds.size,tastes:tasteIds.size,upgrades:upgradeIds.size,decisions:decisionIds.size,regret_shield_viewed:regretShieldIds.size,feedback:feedback.length,affiliate_eligible_decisions:affiliateEligibleIds.size,why_not:whyNotIds.size,rerank_requested:rerankRequestIds.size,rerank_completed:rerankEvents.length,successful_journeys:successfulJourneys,reviewed:reviews.length,flow_completed:flowCompletedIds.size },
      quality:{
        reasons_understood:reviews.filter(event=>flowCompletedIds.has(event.properties.journey_id)&&event.properties.reason_understood).length,
        severe_errors:reviews.filter(event=>event.properties.severe_error).length,
        privacy_incidents:reviews.filter(event=>event.properties.privacy_incident).length,
        game_input_contamination:reviews.filter(event=>event.properties.game_input_contamination).length,
        hard_avoid_violations:reviews.filter(event=>event.properties.hard_avoid_violation).length,
        compatibility_major_violations:reviews.filter(event=>event.properties.compatibility_major_violation).length,
        affiliate_rank_influence:reviews.filter(event=>event.properties.affiliate_rank_influence).length,
        incident_counts:Object.fromEntries([...ENUMS.incident_type].map(type=>[type,incidents.filter(event=>event.properties.incident_type===type).length])),
        median_completion_ms:median(times)
      }, metrics
    };
  }

  function evaluateCohortGate(events,size) {
    const rawConfirmedIncidents=(events||[]).filter(event=>event?.name==="safety_incident_recorded"&&event?.properties?.confirmed===true);
    if (rawConfirmedIncidents.length) return { status:"STOP",reasons:["confirmed safety, affiliate, or privacy incident"],report:computeMetrics(events) };
    const report=computeMetrics(events);
    if (!report.valid) return { status:"INCONCLUSIVE",reasons:["invalid events"],report };
    const incidentTotal=Object.values(report.quality.incident_counts).reduce((sum,value)=>sum+value,0);
    const criticalReviewTotal=report.quality.severe_errors+report.quality.privacy_incidents+report.quality.game_input_contamination+report.quality.hard_avoid_violations+report.quality.compatibility_major_violations+report.quality.affiliate_rank_influence;
    if (incidentTotal>0||criticalReviewTotal>0) return { status:"STOP",reasons:["confirmed safety, affiliate, or privacy incident"],report };
    if (![10,30,100].includes(size)) return { status:"INCONCLUSIVE",reasons:["unsupported cohort"],report };
    if (report.counts.landings<size) return { status:"INCONCLUSIVE",reasons:[`fewer than ${size} eligible journeys`],report };
    if (size===10) {
      if (report.counts.reviewed<10) return { status:"INCONCLUSIVE",reasons:["missing session reviews"],report };
      if (report.counts.verified_testers<10) return { status:"INCONCLUSIVE",reasons:["independent observed tester profiles are missing"],report };
      const n10Events=(events||[]).filter(event=>event.properties?.cohort==="n10");
      if (n10Events.length!==(events||[]).length||n10Events.some(event=>event.properties.source==="private_fixture"||event.properties.traffic_class!=="tester")) {
        return { status:"INCONCLUSIVE",reasons:["synthetic, internal, or non-n10 data cannot pass the 10-person gate"],report };
      }
      const buildIds=new Set(n10Events.map(event=>event.properties.build_id).filter(Boolean));
      if (buildIds.size!==1||n10Events.some(event=>!event.properties.build_id)) return { status:"INCONCLUSIVE",reasons:["one fixed build_id is required for the entire 10-person cohort"],report };
      const pass=report.counts.flow_completed>=7&&report.quality.reasons_understood>=7;
      return { status:pass?"PASS":"INCONCLUSIVE",reasons:pass?[]:["flow completion or comprehension threshold not met"],report };
    }
    if (size===30) {
      const m=report.metrics,hasSamples=report.counts.decisions>=24&&report.counts.feedback>=20&&m.re_ranking_success.denominator>0&&m.dont_upgrade_acceptance_rate.denominator>0;
      if (!hasSamples) return { status:"INCONCLUSIVE",reasons:["required decision, feedback, rerank, or DONT sample missing"],report };
      const pass=m.recommendation_acceptance_rate.rate>=0.60&&m.correction_rate.rate<=0.30&&m.re_ranking_success.rate>=0.50&&m.dont_upgrade_acceptance_rate.rate>=0.70;
      return { status:pass?"PASS":"STOP",reasons:pass?[]:["directional validity threshold not met"],report };
    }
    const m=report.metrics,pass=m.my_setup_start_rate.rate>=0.25&&m.gear_taste_input_rate.rate>=0.70&&m.next_upgrade_reach_rate.rate>=0.50&&m.why_not_usage_rate.rate>=0.40&&m.affiliate_cta_intent_rate.denominator>0&&m.affiliate_cta_intent_rate.rate>=0.08&&m.save_return_intent_rate.rate>=0.15;
    return { status:pass?"PASS":"STOP",reasons:pass?[]:["acquisition or intent threshold not met"],report };
  }

  return { EVENT_DEFINITIONS,COMMON_PROPERTIES,OPTIONAL_COMMON_PROPERTIES,validateEvent,createLocalHarness,computeMetrics,evaluateCohortGate };
});
