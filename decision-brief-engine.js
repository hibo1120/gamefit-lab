(function (root, factory) {
  const data = root.GameFitDecisionBriefs || (typeof module === "object" && module.exports ? require("./data/decision-briefs.js") : null);
  const api = factory(data);
  root.GameFitDecisionBriefEngine = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (data) {
  "use strict";

  const REQUIRED_FIELDS = Object.freeze(["what_matters", "usually_does_not_matter", "common_misconception", "check_before_buy", "when_upgrade_unnecessary", "compatibility_prerequisites", "evidence_strength"]);

  function validateBrief(brief) {
    const errors = [];
    for (const field of REQUIRED_FIELDS) if (!brief?.[field] || (Array.isArray(brief[field]) && !brief[field].length)) errors.push("missing:" + field);
    for (const sourceId of brief?.source_ids || []) if (!data.sources[sourceId]) errors.push("unknown_source:" + sourceId);
    return errors;
  }

  function getBrief(id) {
    return data.briefs.find(item => item.id === id) || null;
  }

  function buildResearchDigest(id) {
    const brief = getBrief(id);
    if (!brief) return null;
    return {
      brief,
      evidence:(brief.source_ids || []).map(sourceId => ({ source_id:sourceId, ...data.sources[sourceId] })),
      presentation_rule:"GameFit decision brief first; source list is supporting detail, never copied editorial content."
    };
  }

  return { REQUIRED_FIELDS, validateBrief, getBrief, buildResearchDigest };
});
