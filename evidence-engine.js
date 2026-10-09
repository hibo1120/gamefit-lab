(function (root, factory) {
  const api = factory();
  root.GameFitEvidence = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const EVIDENCE_TYPES = Object.freeze(["spec","measurement","subjective","issue","trend","price","adoption","fact_correction"]);
  const CONSENSUS = Object.freeze(["anecdotal","medium","high","mixed","not_applicable"]);
  const PROHIBITED_COPY_FIELDS = Object.freeze([
    "raw_text", "review_body", "image_url", "thumbnail_url", "video_file", "transcript", "table_data", "graph_data"
  ]);

  function validateEvidenceRecord(record) {
    const errors = [];
    for (const key of ["evidence_id", "source_id", "product_id", "evidence_type", "summary", "source_url", "retrieved_at"]) {
      if (record?.[key] === undefined || record?.[key] === "") errors.push(key + " is required");
    }
    if (record?.evidence_type && !EVIDENCE_TYPES.includes(record.evidence_type)) errors.push("evidence_type is invalid");
    if (record?.source_url && !/^https:\/\//i.test(record.source_url)) errors.push("source_url must use https");
    if (String(record?.summary || "").length > 280) errors.push("summary must be a concise GameFit-authored normalization");
    for (const key of PROHIBITED_COPY_FIELDS) {
      if (record?.[key] !== undefined && record[key] !== null && record[key] !== "") errors.push(key + " is prohibited");
    }
    return errors;
  }

  function uniqueIndependent(items) {
    const seen = new Set();
    return items.filter(item => {
      if (item.independent === false) return false;
      const key = item.source_id;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeSubjectiveConsensus(items) {
    const independent = uniqueIndependent(items.filter(item => item.evidence_type === "subjective"));
    if (independent.length <= 1) return "anecdotal";
    const stances = independent.map(item => item.stance).filter(Boolean);
    if (!stances.length) return independent.length >= 3 ? "medium" : "anecdotal";
    const counts = stances.reduce((acc, stance) => ((acc[stance] = (acc[stance] || 0) + 1), acc), {});
    const values = Object.values(counts).sort((a,b)=>b-a);
    if (values.length > 1 && values[0] === values[1]) return "mixed";
    if (values[0] >= 3) return "high";
    if (values[0] >= 2) return "medium";
    return "mixed";
  }

  function groupCompatibleMeasurements(items) {
    const groups = new Map();
    for (const item of items.filter(item => item.evidence_type === "measurement")) {
      const family = item.methodology_family || "unknown";
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(item);
    }
    return Object.fromEntries(groups);
  }

  function newProductConfidenceCap(product) {
    if (!product) return 1;
    if (["announced","preorder"].includes(product.lifecycle_state)) return 0.35;
    if (product.lifecycle_state === "available" && ["D","C"].includes(product.evidence_grade || "D")) return 0.55;
    return 1;
  }

  function gradeFromEvidence(items, product) {
    const measurements = uniqueIndependent(items.filter(i => i.evidence_type === "measurement")).length;
    const subjectiveConsensus = normalizeSubjectiveConsensus(items);
    const longTermCoverage = uniqueIndependent(items.filter(i => i.long_term === true)).length;
    let grade = "D";
    if (measurements >= 1 || subjectiveConsensus === "medium") grade = "C";
    if (measurements >= 1 && ["medium","high"].includes(subjectiveConsensus)) grade = "B";
    if (measurements >= 2 && subjectiveConsensus === "high" && longTermCoverage >= 1) grade = "A";

    const cap = newProductConfidenceCap(product);
    if (cap <= 0.35 && ["A","B"].includes(grade)) grade = "C";
    if (cap <= 0.55 && grade === "A") grade = "B";
    return grade;
  }

  function buildAssessment(items, product={}) {
    const strengths = [...new Set(items.filter(i=>i.effect === "strength").map(i=>i.summary).filter(Boolean))];
    const concerns = [...new Set(items.filter(i=>i.effect === "concern").map(i=>i.summary).filter(Boolean))];
    const mixed = items.filter(i=>i.effect === "mixed").map(i=>i.summary).filter(Boolean);
    return {
      evidence_grade: gradeFromEvidence(items, product),
      subjective_consensus: normalizeSubjectiveConsensus(items),
      strengths,
      concerns,
      disagreement_notes:[...new Set(mixed)],
      measurement_groups:groupCompatibleMeasurements(items)
    };
  }

  return {
    EVIDENCE_TYPES, CONSENSUS, PROHIBITED_COPY_FIELDS, validateEvidenceRecord,
    normalizeSubjectiveConsensus, groupCompatibleMeasurements,
    uniqueIndependent, newProductConfidenceCap, gradeFromEvidence, buildAssessment
  };
});
