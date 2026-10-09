(function (root, factory) {
  const api = factory();
  root.GameFitValidation = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const EVENT_DEFINITIONS = Object.freeze({
    landing_viewed: [], demand_qualified: ["shopping_state","purchase_window","problem_state"], my_setup_started: [],
    gear_taste_completed: ["attributes_count"], next_upgrade_reached: [], decision_viewed: ["decision","affiliate_eligible"],
    why_not_opened: [], rerank_requested: ["reason_count","direction_count"], rerank_completed: ["rerank_success","confidence_change"],
    recommendation_feedback: ["verdict"], dont_upgrade_response: ["accepted"], save_return_intent: ["intent"],
    purchase_route_intent: ["destination_type","commercial_relationship","merchant_id"],
    session_review_completed: ["reason_understood","severe_error","privacy_incident"]
  });
  const COMMON_PROPERTIES = Object.freeze(["journey_id","category","game_id","input_method","source","content_id","entry_offer","campaign","cohort","locale","traffic_class","sequence","elapsed_ms"]);
  const ENUMS = Object.freeze({
    category:new Set(["mouse","keyboard","monitor","mousepad","mouse_skates","audio","controller","network","cable"]),
    input_method:new Set(["mnk","controller","unknown"]), decision:new Set(["SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","EXPLORE","AVOID","DONT_UPGRADE","CLARIFY"]),
    confidence_change:new Set(["increased","decreased","unchanged"]), verdict:new Set(["agree","disagree","unsure"]), intent:new Set(["save","return","none"]),
    destination_type:new Set(["manufacturer","marketplace","accessory","network","isp"]), commercial_relationship:new Set(["affiliate","non_affiliate","none"]),
    shopping_state:new Set(["actively_shopping","considering","not_shopping"]), purchase_window:new Set(["within_30_days","within_90_days","later","none"]),
    problem_state:new Set(["specific_problem","general_dissatisfaction","no_problem"]), source:new Set(["direct","youtube","x","google_search","note","reddit","referral","private_fixture"]),
    entry_offer:new Set(["comparison","diagnosis","free_tool","guide","community"]), cohort:new Set(["n10","n30","n100","internal"]), locale:new Set(["ja","en"]),
    traffic_class:new Set(["external_qualified","tester","internal_qa","bot_suspected"])
  });
  const FORBIDDEN_PROPERTIES = new Set(["email","name","address","phone","ip","user_id","distinct_id","hardware_free_text","comment","free_text"]);
  const CONTEXT_KEYS = Object.freeze(["category","game_id","input_method","source","content_id","entry_offer","campaign","cohort","locale","traffic_class"]);

  function isSlug(value) { return typeof value === "string" && /^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(value); }

  function validateEvent(event) {
    const errors = [];
    if (!event || !Object.hasOwn(EVENT_DEFINITIONS,event.name)) return ["unknown event"];
    const properties = event.properties || {};
    for (const key of [...COMMON_PROPERTIES,...EVENT_DEFINITIONS[event.name]]) {
      if (properties[key] === undefined || properties[key] === null || properties[key] === "") errors.push(`${key} is required for ${event.name}`);
    }
    const allowed = new Set([...COMMON_PROPERTIES,...EVENT_DEFINITIONS[event.name]]);
    for (const key of Object.keys(properties)) {
      if (!allowed.has(key)) errors.push(`${key} is not allowed for ${event.name}`);
      if (FORBIDDEN_PROPERTIES.has(key)) errors.push(`${key} is forbidden`);
    }
    for (const [key,values] of Object.entries(ENUMS)) if (properties[key] !== undefined && !values.has(properties[key])) errors.push(`${key} has an unsupported value`);
    if (!isSlug(properties.journey_id)) errors.push("journey_id must be an explicitly supplied local slug");
    for (const key of ["game_id","content_id","campaign","merchant_id"]) if (properties[key] !== undefined && !isSlug(properties[key])) errors.push(`${key} must be a privacy-safe slug`);
    for (const key of ["attributes_count","reason_count","direction_count","sequence","elapsed_ms"]) {
      if (properties[key] !== undefined && (!Number.isInteger(properties[key]) || properties[key] < 0)) errors.push(`${key} must be a non-negative integer`);
    }
    for (const key of ["rerank_success","accepted","affiliate_eligible","reason_understood","severe_error","privacy_incident"]) {
      if (properties[key] !== undefined && typeof properties[key] !== "boolean") errors.push(`${key} must be boolean`);
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

  function computeMetrics(events) {
    const invalid = (events || []).flatMap((event,index)=>validateEvent(event).map(error=>({ index,error })));
    if (invalid.length) return { valid:false, errors:invalid, metrics:null };
    const candidates = events.filter(event=>!["internal_qa","bot_suspected"].includes(event.properties.traffic_class));
    const grouped = new Map();
    for (const event of candidates) { const id=event.properties.journey_id; if (!grouped.has(id)) grouped.set(id,[]); grouped.get(id).push(event); }
    const journeys = new Map(), excludedJourneys = [];
    for (const [id,records] of grouped) {
      const sorted=[...records].sort((a,b)=>a.properties.sequence-b.properties.sequence), first=sorted[0].properties;
      const mismatch=sorted.some(event=>CONTEXT_KEYS.some(key=>event.properties[key]!==first[key]));
      const duplicateSequence=new Set(sorted.map(event=>event.properties.sequence)).size!==sorted.length;
      const timeReversal=sorted.some((event,index)=>index>0 && event.properties.elapsed_ms<sorted[index-1].properties.elapsed_ms);
      if (mismatch || duplicateSequence || timeReversal) excludedJourneys.push(id); else journeys.set(id,sorted);
    }
    const sequenceOf=(id,name)=>{ const matches=(journeys.get(id)||[]).filter(event=>event.name===name); return matches.length?Math.max(...matches.map(event=>event.properties.sequence)):null; };
    const eventAfter=(id,name,priorName)=>{ const current=sequenceOf(id,name),prior=sequenceOf(id,priorName); return current!==null&&prior!==null&&current>prior; };
    const latest=(id,name)=>[...(journeys.get(id)||[])].reverse().find(event=>event.name===name)||null;
    const landingIds=new Set([...journeys].filter(([,records])=>records.some(event=>event.name==="landing_viewed")).map(([id])=>id));
    const setupIds=new Set([...landingIds].filter(id=>eventAfter(id,"my_setup_started","landing_viewed")));
    const tasteIds=new Set([...setupIds].filter(id=>eventAfter(id,"gear_taste_completed","my_setup_started")));
    const upgradeIds=new Set([...tasteIds].filter(id=>eventAfter(id,"next_upgrade_reached","gear_taste_completed")));
    const qualifiedIds=new Set([...landingIds].filter(id=>{ const event=latest(id,"demand_qualified"); return event&&event.properties.sequence>sequenceOf(id,"landing_viewed")&&event.properties.shopping_state!=="not_shopping"&&event.properties.problem_state!=="no_problem"; }));
    const decisionEvents=[...upgradeIds].map(id=>latest(id,"decision_viewed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"next_upgrade_reached"));
    const decisionIds=new Set(decisionEvents.map(event=>event.properties.journey_id));
    const affiliateEligibleIds=new Set(decisionEvents.filter(event=>event.properties.affiliate_eligible).map(event=>event.properties.journey_id));
    const whyNotIds=new Set([...decisionIds].filter(id=>eventAfter(id,"why_not_opened","decision_viewed")));
    const rerankRequestIds=new Set([...whyNotIds].filter(id=>eventAfter(id,"rerank_requested","why_not_opened")));
    const rerankEvents=[...rerankRequestIds].map(id=>latest(id,"rerank_completed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"rerank_requested"));
    const feedback=[...decisionIds].map(id=>latest(id,"recommendation_feedback")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"decision_viewed"));
    const dontDecisionIds=new Set(decisionEvents.filter(event=>event.properties.decision==="DONT_UPGRADE").map(event=>event.properties.journey_id));
    const dontResponses=[...dontDecisionIds].map(id=>latest(id,"dont_upgrade_response")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"decision_viewed"));
    const saveReturnIds=new Set([...decisionIds].filter(id=>{ const event=latest(id,"save_return_intent"); return event&&event.properties.sequence>sequenceOf(id,"decision_viewed")&&event.properties.intent!=="none"; }));
    const affiliateIntentIds=new Set([...affiliateEligibleIds].filter(id=>{ const event=latest(id,"purchase_route_intent"); return event&&event.properties.sequence>sequenceOf(id,"decision_viewed")&&event.properties.commercial_relationship==="affiliate"; }));
    const reviews=[...decisionIds].map(id=>latest(id,"session_review_completed")).filter(event=>event&&event.properties.sequence>sequenceOf(event.properties.journey_id,"decision_viewed"));
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
      save_return_intent_rate:rate(saveReturnIds.size,decisionIds.size), affiliate_cta_intent_rate:rate(affiliateIntentIds.size,affiliateEligibleIds.size)
    };
    return {
      valid:true, errors:[], excluded_journeys:excludedJourneys,
      denominator_policy:Object.freeze({ my_setup_start_rate:"landing_viewed journeys",qualified_demand_rate:"landing_viewed journeys; requires shopping state and a current problem",gear_taste_input_rate:"my_setup_started journeys",next_upgrade_reach_rate:"my_setup_started journeys",why_not_usage_rate:"decision_viewed journeys",rerank_usage_rate:"why_not_opened journeys",recommendation_acceptance_rate:"all recommendation_feedback responses, including unsure",correction_rate:"all recommendation_feedback responses, including unsure",re_ranking_success:"ordered rerank_completed journeys",dont_upgrade_acceptance_rate:"ordered DONT_UPGRADE responses",save_return_intent_rate:"decision_viewed journeys",affiliate_cta_intent_rate:"affiliate-eligible decision_viewed journeys" }),
      counts:{ landings:landingIds.size,qualified:qualifiedIds.size,setups:setupIds.size,tastes:tasteIds.size,upgrades:upgradeIds.size,decisions:decisionIds.size,feedback:feedback.length,affiliate_eligible_decisions:affiliateEligibleIds.size,why_not:whyNotIds.size,rerank_requested:rerankRequestIds.size,rerank_completed:rerankEvents.length,successful_journeys:successfulJourneys,reviewed:reviews.length },
      quality:{ reasons_understood:reviews.filter(event=>event.properties.reason_understood).length,severe_errors:reviews.filter(event=>event.properties.severe_error).length,privacy_incidents:reviews.filter(event=>event.properties.privacy_incident).length,median_completion_ms:times.length?times[Math.floor((times.length-1)/2)]:null }, metrics
    };
  }

  function evaluateCohortGate(events,size) {
    const report=computeMetrics(events);
    if (!report.valid) return { status:"INCONCLUSIVE",reasons:["invalid events"],report };
    if (report.quality.severe_errors>0||report.quality.privacy_incidents>0) return { status:"STOP",reasons:["safety or privacy incident"],report };
    if (![10,30,100].includes(size)) return { status:"INCONCLUSIVE",reasons:["unsupported cohort"],report };
    if (report.counts.landings<size) return { status:"INCONCLUSIVE",reasons:[`fewer than ${size} eligible journeys`],report };
    if (size===10) {
      if (report.counts.reviewed<10) return { status:"INCONCLUSIVE",reasons:["missing session reviews"],report };
      const pass=report.counts.upgrades>=8&&report.quality.reasons_understood>=7&&report.quality.median_completion_ms<=420000;
      return { status:pass?"PASS":"STOP",reasons:pass?[]:["usability threshold not met"],report };
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

  return { EVENT_DEFINITIONS,validateEvent,createLocalHarness,computeMetrics,evaluateCohortGate };
});
