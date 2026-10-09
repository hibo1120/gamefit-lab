(function (root, factory) {
  const api = factory(root.GameFitValidation || (typeof require === "function" ? require("./validation-engine.js") : null));
  root.GameFitPrivateValidationStore = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (validation) {
  "use strict";

  const STORAGE_KEY = "gamefit.private_validation.v1";
  const SCHEMA_VERSION = 1;
  const MAX_BYTES = 512 * 1024;
  const RETENTION_DAYS = 30;
  const TESTER_IDS = Object.freeze(Array.from({ length:10 }, (_,index)=>`t${String(index+1).padStart(2,"0")}`));
  const COMMON = Object.freeze({
    source:"private_tester", content_id:"private-validation-v1", entry_offer:"diagnosis",
    campaign:"pgi-n10-2026-10", cohort:"n10", locale:"ja", traffic_class:"tester", build_id:"pgi-n10-preflight-v1"
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function createState() { return { schema_version:SCHEMA_VERSION, active_tester_id:null, testers:{}, events:[], updated_at:null }; }
  function isIso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
  function isTesterId(value) { return TESTER_IDS.includes(value); }

  function validateState(state) {
    const errors=[];
    if (!state || typeof state!=="object" || Array.isArray(state)) return ["validation state must be an object"];
    if (state.schema_version!==SCHEMA_VERSION) errors.push("validation schema version is unsupported");
    if (state.active_tester_id!==null&&!isTesterId(state.active_tester_id)) errors.push("active tester id is invalid");
    if (!state.testers||typeof state.testers!=="object"||Array.isArray(state.testers)) errors.push("testers must be an object");
    else for (const [testerId,row] of Object.entries(state.testers)) {
      if (!isTesterId(testerId)) errors.push("tester id is invalid");
      if (!row||!isIso(row.started_at)||!isIso(row.updated_at)||!["in_progress","awaiting_review","completed","abandoned","stopped"].includes(row.status)) errors.push(`${testerId} metadata is invalid`);
    }
    if (!Array.isArray(state.events)) errors.push("events must be an array");
    else state.events.forEach((event,index)=>validation.validateEvent(event).forEach(error=>errors.push(`events[${index}]: ${error}`)));
    if (state.updated_at!==null&&!isIso(state.updated_at)) errors.push("updated_at is invalid");
    const serialized=JSON.stringify(state);
    if (serialized.length>MAX_BYTES) errors.push("validation state exceeds storage limit");
    return [...new Set(errors)];
  }

  function parse(raw) {
    if (typeof raw!=="string"||!raw.trim()) throw new Error("validation data is empty");
    if (raw.length>MAX_BYTES) throw new Error("validation data is too large");
    const state=JSON.parse(raw);
    const errors=validateState(state);
    if (errors.length) throw new Error(errors.join("; "));
    return clone(state);
  }

  function pruneExpired(state,now=new Date().toISOString()) {
    const next=clone(state),nowMs=Date.parse(now),cutoff=nowMs-RETENTION_DAYS*86400000;
    if (!Number.isFinite(nowMs)) throw new Error("retention clock is invalid");
    const expired=new Set(Object.entries(next.testers).filter(([,row])=>Date.parse(row.updated_at)<cutoff).map(([testerId])=>testerId));
    for (const testerId of expired) delete next.testers[testerId];
    next.events=next.events.filter(event=>!expired.has(event.properties.journey_id));
    if (expired.has(next.active_tester_id)) next.active_tester_id=null;
    return next;
  }

  function load(storage) {
    try {
      const raw=storage?.getItem?.(STORAGE_KEY);
      if (raw===null||raw===undefined) return { status:"empty", state:createState(), read_only:false };
      const state=pruneExpired(parse(raw));
      storage.setItem(STORAGE_KEY,JSON.stringify(state));
      return { status:"ok", state, read_only:false };
    } catch (error) {
      return { status:"corrupt_or_unavailable", state:null, read_only:true, error:error.message };
    }
  }

  function save(storage,state,now=new Date().toISOString()) {
    const next=clone(state);
    next.updated_at=now;
    const errors=validateState(next);
    if (errors.length) throw new Error(errors.join("; "));
    storage.setItem(STORAGE_KEY,JSON.stringify(next));
    return next;
  }

  function baseProperties(testerId,sequence,elapsedMs,overrides={}) {
    const protectedKeys=new Set(["journey_id","source","content_id","entry_offer","campaign","cohort","locale","traffic_class","build_id","sequence","elapsed_ms"]);
    const payload=Object.fromEntries(Object.entries(overrides).filter(([key])=>!protectedKeys.has(key)&&!["category","game_id","input_method"].includes(key)));
    return {
      ...payload,
      journey_id:testerId,
      category:overrides.category||"unknown", game_id:overrides.game_id||"unknown", input_method:overrides.input_method||"unknown",
      ...COMMON, sequence, elapsed_ms:elapsedMs
    };
  }

  function appendEvent(state,testerId,name,overrides,nowMs) {
    const row=state.testers[testerId];
    if (!row) throw new Error("tester session has not started");
    const sequence=state.events.filter(event=>event.properties.journey_id===testerId).length;
    const elapsed=Math.max(0,nowMs-Date.parse(row.started_at));
    const event={ name, properties:baseProperties(testerId,sequence,elapsed,overrides) };
    const errors=validation.validateEvent(event);
    if (errors.length) throw new Error(errors.join("; "));
    state.events.push(event);
    row.updated_at=new Date(nowMs).toISOString();
    return event;
  }

  function startTester(storage,input,now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state;
    const testerId=input?.tester_id;
    if (!isTesterId(testerId)) throw new Error("tester_id must be t01 through t10");
    if (validation.evaluateCohortGate(state.events,10).status==="STOP") throw new Error("validation is locked after a confirmed STOP incident; fix and start a new cohort version");
    if (state.active_tester_id) throw new Error("another tester session is active");
    if (state.testers[testerId]) throw new Error("tester_id has already been used; do not replace a failed participant");
    const nowMs=Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new Error("start time is invalid");
    state.testers[testerId]={ started_at:new Date(nowMs).toISOString(), updated_at:new Date(nowMs).toISOString(), status:"in_progress" };
    state.active_tester_id=testerId;
    appendEvent(state,testerId,"landing_viewed",{},nowMs);
    appendEvent(state,testerId,"tester_profile_recorded",{
      expertise:input.expertise, purchase_contexts:input.purchase_contexts,
      independence_confirmed:input.independence_confirmed, developer_or_contributor:input.developer_or_contributor,
      answer_aware:input.answer_aware, consent_confirmed:input.consent_confirmed, data_origin:"observed_participant"
    },nowMs);
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function capture(storage,name,properties={},now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state, testerId=state.active_tester_id;
    if (!testerId||state.testers[testerId]?.status!=="in_progress") throw new Error("no active tester session");
    const nowMs=Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new Error("event time is invalid");
    appendEvent(state,testerId,name,properties,nowMs);
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function captureMany(storage,events,now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state,testerId=state.active_tester_id,nowMs=Date.parse(now);
    if (!testerId||state.testers[testerId]?.status!=="in_progress") throw new Error("no active tester session");
    if (!Array.isArray(events)||!events.length) throw new Error("events are required");
    for (const event of events) appendEvent(state,testerId,event.name,event.properties||{},nowMs);
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function submitTesterReview(storage,review,now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state,testerId=state.active_tester_id,nowMs=Date.parse(now);
    if (!testerId||state.testers[testerId]?.status!=="in_progress") throw new Error("no active tester session");
    appendEvent(state,testerId,"tester_self_review_recorded",review,nowMs);
    state.testers[testerId].status="awaiting_review";
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function stopTester(storage,incidentType,now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state, testerId=state.active_tester_id, nowMs=Date.parse(now);
    if (!testerId||!["in_progress","awaiting_review"].includes(state.testers[testerId]?.status)) throw new Error("no active tester session");
    appendEvent(state,testerId,"safety_incident_recorded",{ incident_type:incidentType, confirmed:true },nowMs);
    state.testers[testerId].status="stopped";
    state.active_tester_id=null;
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function finishTester(storage,review,incidentTypes=[],now=new Date().toISOString()) {
    const loaded=load(storage);
    if (loaded.read_only) throw new Error(loaded.error||"validation storage is unavailable");
    const state=loaded.state, testerId=state.active_tester_id, nowMs=Date.parse(now);
    if (!testerId) throw new Error("no active tester session");
    for (const incidentType of [...new Set(incidentTypes)]) appendEvent(state,testerId,"safety_incident_recorded",{ incident_type:incidentType, confirmed:true },nowMs);
    appendEvent(state,testerId,"session_review_completed",review,nowMs);
    state.testers[testerId].status=incidentTypes.length||review.severe_error||review.privacy_incident?"stopped":review.flow_completed?"completed":"abandoned";
    state.active_tester_id=null;
    return save(storage,state,new Date(nowMs).toISOString());
  }

  function report(state) {
    const gate=validation.evaluateCohortGate(state?.events||[],10);
    const profiles=(state?.events||[]).filter(event=>event.name==="tester_profile_recorded");
    const expertise=Object.fromEntries(["beginner","intermediate","enthusiast"].map(key=>[key,profiles.filter(event=>event.properties.expertise===key).length]));
    const purchaseContexts=Object.fromEntries([...new Set(profiles.flatMap(event=>event.properties.purchase_contexts||[]))].map(key=>[key,profiles.filter(event=>(event.properties.purchase_contexts||[]).includes(key)).length]));
    const rows=Object.values(state?.testers||{});
    return { gate, composition:{ expertise, purchase_contexts:purchaseContexts }, finalized:rows.filter(row=>["completed","abandoned","stopped"].includes(row.status)).length, awaiting_review:rows.filter(row=>row.status==="awaiting_review").length, active_tester_id:state?.active_tester_id||null };
  }

  function exportState(state) {
    const errors=validateState(state);
    if (errors.length) throw new Error(errors.join("; "));
    return JSON.stringify({ ...clone(state), report:report(state), notice:"Anonymous coded test records only. No names, email addresses, contact details, free text, IP addresses, or device identifiers." },null,2);
  }

  function deleteAll(storage) { storage.removeItem(STORAGE_KEY); }

  return { STORAGE_KEY,SCHEMA_VERSION,MAX_BYTES,RETENTION_DAYS,TESTER_IDS,COMMON,createState,validateState,parse,pruneExpired,load,save,startTester,capture,captureMany,submitTesterReview,stopTester,finishTester,report,exportState,deleteAll };
});
