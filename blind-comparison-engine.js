(function (root, factory) {
  const api=factory();
  root.GameFitBlindComparison=api;
  if (typeof module==="object"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis,function () {
  "use strict";

  const METHODS=Object.freeze(["gamefit","simple_heuristic","generic_ai"]);
  const ORDERS=Object.freeze([
    Object.freeze(["gamefit","simple_heuristic","generic_ai"]),
    Object.freeze(["gamefit","generic_ai","simple_heuristic"]),
    Object.freeze(["simple_heuristic","gamefit","generic_ai"]),
    Object.freeze(["simple_heuristic","generic_ai","gamefit"]),
    Object.freeze(["generic_ai","gamefit","simple_heuristic"]),
    Object.freeze(["generic_ai","simple_heuristic","gamefit"])
  ]);
  const CRITERIA=Object.freeze(["agreement","clarity","personal_fit","avoids_unnecessary_purchase"]);
  const BRANDING=/(gamefit|chatgpt|copilot|gemini|generic ai|simple heuristic|regret shield|dont_upgrade|safe\s*\/\s*familiar|better_fit|value_alternative)/i;
  const DECISIONS=new Set(["keep","buy","avoid","clarify","compare_more"]);

  function isSlug(value) { return typeof value==="string"&&/^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(value); }
  function isRealDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value||"")) return false;
    const [year,month,day]=value.split("-").map(Number),date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  function validateAnswer(answer,method,asOf) {
    const errors=[];
    if (!answer||answer.method!==method) errors.push(`${method} answer method mismatch`);
    if (!isSlug(answer?.case_id)) errors.push(`${method} case_id is invalid`);
    if (!/^[a-f0-9]{64}$/i.test(answer?.input_hash||"")) errors.push(`${method} input_hash is invalid`);
    if (!isSlug(answer?.source_budget_version)) errors.push(`${method} source budget version is invalid`);
    if (!DECISIONS.has(answer?.decision)) errors.push(`${method} decision is not normalized`);
    for (const key of ["decision","summary","reasons","caution","next_action"]) {
      const value=answer?.[key];
      if (key==="reasons") {
        if (!Array.isArray(value)||value.length<1||value.length>3||value.some(item=>typeof item!=="string"||!item.trim()||item.length>160||BRANDING.test(item))) errors.push(`${method} reasons are not blind-safe`);
      } else if (typeof value!=="string"||!value.trim()||value.length>240||BRANDING.test(value)) errors.push(`${method} ${key} is not blind-safe`);
    }
    if (method==="generic_ai") {
      const provenance=answer?.provenance;
      if (!provenance||!isSlug(provenance.model)||!isRealDate(provenance.checked_date)||provenance.checked_date>asOf||!isSlug(provenance.prompt_version)||!/^[a-f0-9]{64}$/i.test(provenance.output_hash||"")||provenance.memory_disabled!==true||provenance.first_valid_response!==true||!["off","on_frozen_sources"].includes(provenance.web_state)) errors.push("generic AI provenance is incomplete, future-dated, or cherry-pickable");
    }
    return errors;
  }

  function createPacket({ case_id,tester_id,answers,as_of=new Date().toISOString().slice(0,10) }) {
    if (!isSlug(case_id)) throw new Error("case_id must be a privacy-safe slug");
    if (!/^t(?:0[1-9]|10)$/.test(tester_id||"")) throw new Error("tester_id must be t01 through t10");
    if (!isRealDate(as_of)) throw new Error("as_of must be a real date");
    const order_index=(Number(tester_id.slice(1))-1)%ORDERS.length;
    const byMethod=new Map((answers||[]).map(answer=>[answer.method,answer]));
    const errors=METHODS.flatMap(method=>validateAnswer(byMethod.get(method),method,as_of));
    if (new Set((answers||[]).map(answer=>answer.method)).size!==3||answers?.length!==3) errors.push("exactly one answer per method is required");
    if ((answers||[]).some(answer=>answer.case_id!==case_id)) errors.push("all answers must use the same case_id");
    const inputHashes=new Set((answers||[]).map(answer=>answer.input_hash));
    const sourceBudgets=new Set((answers||[]).map(answer=>answer.source_budget_version));
    if (inputHashes.size!==1||sourceBudgets.size!==1) errors.push("all methods must use the same input and frozen source budget");
    if (errors.length) throw new Error(errors.join("; "));
    const labels=["A","B","C"],order=ORDERS[order_index];
    const blinded_options=order.map((method,index)=>{
      const answer=byMethod.get(method);
      return { label:labels[index], decision:answer.decision, summary:answer.summary, reasons:[...answer.reasons], caution:answer.caution, next_action:answer.next_action };
    });
    return {
      tester_packet:{ protocol_version:1,case_id,tester_id,blinded_options,criteria:[...CRITERIA],instruction:"各案を単独採点した後、A/B/Cを1位から3位まで並べてください。" },
      operator_key:{ protocol_version:1,case_id,tester_id,input_hash:[...inputHashes][0],source_budget_version:[...sourceBudgets][0],order_index,mapping:Object.fromEntries(labels.map((label,index)=>[label,order[index]])),locked:false }
    };
  }

  function lockAssessment(testerId,packet,ratings,forcedRank,completedAt=new Date().toISOString()) {
    if (!/^t(?:0[1-9]|10)$/.test(testerId)) throw new Error("tester id is invalid");
    if (packet?.tester_id!==testerId||packet?.protocol_version!==1) throw new Error("packet does not belong to this tester or protocol");
    const labels=(packet?.blinded_options||[]).map(option=>option.label);
    if (labels.join("")!=="ABC") throw new Error("blind packet is invalid");
    if (!ratings||Object.keys(ratings).sort().join("")!==labels.slice().sort().join("")) throw new Error("every option must be rated");
    for (const label of labels) for (const criterion of CRITERIA) if (!Number.isInteger(ratings[label]?.[criterion])||ratings[label][criterion]<1||ratings[label][criterion]>5) throw new Error("ratings must be integers from 1 to 5");
    if (!Array.isArray(forcedRank)||forcedRank.length!==3||new Set(forcedRank).size!==3||forcedRank.some(label=>!labels.includes(label))) throw new Error("forced rank must contain A, B, and C exactly once");
    if (!Number.isFinite(Date.parse(completedAt))) throw new Error("completion time is invalid");
    return Object.freeze({ tester_id:testerId,case_id:packet.case_id,ratings:JSON.parse(JSON.stringify(ratings)),forced_rank:[...forcedRank],completed_at:completedAt,locked:true });
  }

  function reveal(assessment,operatorKey) {
    if (!assessment?.locked) throw new Error("assessment must be locked before reveal");
    if (operatorKey?.protocol_version!==1||operatorKey?.case_id!==assessment.case_id||operatorKey?.tester_id!==assessment.tester_id||!operatorKey.mapping) throw new Error("operator key does not match assessment");
    const scores={};
    for (const [label,method] of Object.entries(operatorKey.mapping)) scores[method]={ ...assessment.ratings[label], rank:assessment.forced_rank.indexOf(label)+1 };
    return { tester_id:assessment.tester_id,case_id:assessment.case_id,scores };
  }

  function median(values) {
    const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
    if (!sorted.length) return null;
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }

  function summarize(revealed) {
    const rows=revealed||[];
    return {
      sample_size:rows.length,
      methods:Object.fromEntries(METHODS.map(method=>[method,{
        first_place_count:rows.filter(row=>row.scores?.[method]?.rank===1).length,
        medians:Object.fromEntries(CRITERIA.map(criterion=>[criterion,median(rows.map(row=>row.scores?.[method]?.[criterion]).filter(Number.isFinite))]))
      }])),
      interpretation:"Exploratory paired preference only; do not claim statistical superiority, market demand, or safety calibration."
    };
  }

  return { METHODS,ORDERS,CRITERIA,validateAnswer,createPacket,lockAssessment,reveal,summarize };
});
