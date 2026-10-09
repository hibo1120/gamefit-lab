(function (root, factory) {
  const api = factory();
  root.GameFitEvidence = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const EVIDENCE_TYPES = Object.freeze(["spec","measurement","subjective","issue","trend","price","adoption","fact_correction"]);
  const CONSENSUS = Object.freeze(["anecdotal","medium","high","mixed","not_applicable"]);
  const PROHIBITED_COPY_FIELDS = Object.freeze([
    "raw_text", "review_body", "body", "quote", "quotes", "caption", "captions", "ocr_text", "html", "markdown",
    "image_url", "image_data", "thumbnail_url", "video_file", "transcript", "table_data", "raw_table", "graph_data"
  ]);
  const ATTRIBUTE_GRADES = Object.freeze(["A", "B", "C", "D"]);
  const SOURCE_TYPES = Object.freeze(["official","official_support","official_manual","official_documentation","official_compliance","independent_lab","specialist_review","community","esports_database","certification_registry","standards_body"]);
  const COMMERCIAL_RELATIONSHIPS = Object.freeze(["manufacturer","none","affiliate_links_disclosed","reader_supported_affiliate_disclosed","standards_registry","unknown_disclosed"]);

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

  function validateFixtureEvidenceRecord(record) {
    const errors = validateEvidenceRecord(record);
    for (const key of ["source_origin_id", "source_type", "checked_date", "raw_fact", "normalized_fact", "locale", "methodology_family", "rights_use_note", "commercial_relationship"]) {
      if (record?.[key] === undefined || record?.[key] === "") errors.push(key + " is required");
    }
    if (typeof record?.independent !== "boolean") errors.push("independent must be explicit");
    if (record?.raw_fact && (typeof record.raw_fact !== "string" || record.raw_fact.length > 280 || /[\r\n<>]/.test(record.raw_fact))) {
      errors.push("raw_fact must be a concise plain-text GameFit-authored fact");
    }
    if (record?.checked_date && !/^\d{4}-\d{2}-\d{2}$/.test(record.checked_date)) errors.push("checked_date must be YYYY-MM-DD");
    if (record?.retrieved_at && record?.checked_date && record.retrieved_at !== record.checked_date) {
      errors.push("retrieved_at and checked_date must match");
    }
    if (record?.checked_date && /^\d{4}-\d{2}-\d{2}$/.test(record.checked_date)) {
      const parsed = Date.parse(record.checked_date + "T00:00:00Z");
      if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0,10) !== record.checked_date) errors.push("checked_date is invalid");
      else if (parsed > Date.now() + 86400000) errors.push("checked_date cannot be in the future");
    }
    if (record?.source_type && !SOURCE_TYPES.includes(record.source_type)) errors.push("source_type is invalid");
    if (record?.commercial_relationship && !COMMERCIAL_RELATIONSHIPS.includes(record.commercial_relationship)) errors.push("commercial_relationship is invalid");
    if (record?.normalized_fact && typeof record.normalized_fact !== "object") errors.push("normalized_fact must be an object");
    if (record?.normalized_fact && !record.normalized_fact.attribute) errors.push("normalized_fact.attribute is required");
    if (record?.rights_use_note && String(record.rights_use_note).length > 240) errors.push("rights_use_note is too long");
    return [...new Set(errors)];
  }

  function uniqueIndependent(items) {
    const seen = new Set();
    return items.filter(item => {
      if (item.independent !== true) return false;
      let publisher = null;
      try { publisher = item.source_url ? new URL(item.source_url).hostname.toLowerCase().replace(/^www\./, "") : null; } catch (_) {}
      const origin = item.source_origin_id || item.origin_source_id || item.source_id;
      const key = item.publisher_id || (item.source_type === "community" ? origin : publisher) || origin;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeSubjectiveConsensus(items) {
    const independent = uniqueIndependent(items.filter(item => item.evidence_type === "subjective"));
    const stances = independent.map(item => item.stance).filter(Boolean);
    if (independent.length <= 1 || stances.length !== independent.length) return "anecdotal";
    const counts = stances.reduce((acc, stance) => ((acc[stance] = (acc[stance] || 0) + 1), acc), {});
    const values = Object.values(counts).sort((a,b)=>b-a);
    if (values.length > 1) return "mixed";
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
    const current = (items || []).filter(item => {
      if (!item.checked_date && !item.retrieved_at) return true;
      const timestamp = Date.parse((item.checked_date || item.retrieved_at) + "T00:00:00Z");
      return Number.isFinite(timestamp) && timestamp <= Date.now() + 86400000 && Date.now() - timestamp <= 3 * 365.25 * 86400000;
    });
    const measurements = uniqueIndependent(current.filter(i => i.evidence_type === "measurement")).length;
    const subjectiveConsensus = normalizeSubjectiveConsensus(current);
    const longTermCoverage = uniqueIndependent(current.filter(i => i.long_term === true && !["adoption", "trend", "price"].includes(i.evidence_type))).length;
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

  function confidenceFromGrade(grade) {
    if (grade === "A" || grade === "B") return "High";
    if (grade === "C") return "Medium";
    return "Low";
  }

  function normalizedFactKey(item) {
    const fact = item?.normalized_fact;
    if (!fact || typeof fact !== "object" || fact.value === undefined) return null;
    return JSON.stringify([fact.value, fact.unit || null, fact.variant || item.variant || null]);
  }

  function buildAttributeAssessment(items, attribute, product={}) {
    const relevant = (items || []).filter(item => item.attribute === attribute || item.normalized_fact?.attribute === attribute);
    const independent = uniqueIndependent(relevant);
    // A manufacturer is not an independent reviewer, but it is still the primary
    // source for an explicit specification.  Keep one record per origin for
    // objective facts; independence remains mandatory for subjective consensus.
    const objectiveOrigins = new Set();
    const objective = relevant.filter(item => {
      if (!["spec", "measurement", "fact_correction"].includes(item.evidence_type)) return false;
      const origin = item.source_origin_id || item.origin_source_id || item.source_id;
      if (!origin || objectiveOrigins.has(origin)) return false;
      objectiveOrigins.add(origin);
      return true;
    });
    const official = objective.filter(item => item.source_type === "official" && item.methodology_family === "official_spec");
    const measurement = objective.filter(item => item.evidence_type === "measurement");
    const subjective = independent.filter(item => item.evidence_type === "subjective");
    const consensus = normalizeSubjectiveConsensus(subjective);
    const knownValues = [...new Set(objective.map(normalizedFactKey).filter(Boolean))];
    const conflict = knownValues.length > 1 || consensus === "mixed";
    const allOrigins = new Set(relevant.map(item => item.source_origin_id || item.origin_source_id || item.source_id).filter(Boolean));
    let grade = "D";
    if (!conflict && official.length >= 1) grade = measurement.length >= 1 ? "A" : "B";
    else if (!conflict && measurement.length >= 2) grade = "A";
    else if (!conflict && measurement.length >= 1) grade = "B";
    else if (!conflict && consensus === "high") grade = "B";
    else if (!conflict && consensus === "medium") grade = "C";
    else if (independent.length >= 1) grade = "D";

    const cap = newProductConfidenceCap(product);
    if (cap <= 0.35 && ["A", "B"].includes(grade)) grade = "C";
    if (cap <= 0.55 && grade === "A") grade = "B";
    return {
      attribute,
      grade,
      confidence:confidenceFromGrade(grade),
      source_count:allOrigins.size,
      independent_source_count:independent.length,
      conflict,
      consensus,
      methodology_families:[...new Set(relevant.map(item => item.methodology_family).filter(Boolean))],
      normalized_facts:relevant.map(item => item.normalized_fact).filter(Boolean),
      data_gaps:relevant.length ? [] : ["attribute_evidence_missing"]
    };
  }

  function buildAttributeAssessments(items, attributes, product={}) {
    const names = attributes || [...new Set((items || []).map(item => item.attribute || item.normalized_fact?.attribute).filter(Boolean))];
    return Object.fromEntries(names.map(attribute => [attribute, buildAttributeAssessment(items, attribute, product)]));
  }

  return {
    EVIDENCE_TYPES, CONSENSUS, PROHIBITED_COPY_FIELDS, ATTRIBUTE_GRADES, SOURCE_TYPES, COMMERCIAL_RELATIONSHIPS, validateEvidenceRecord, validateFixtureEvidenceRecord,
    normalizeSubjectiveConsensus, groupCompatibleMeasurements,
    uniqueIndependent, newProductConfidenceCap, gradeFromEvidence, buildAssessment,
    confidenceFromGrade, buildAttributeAssessment, buildAttributeAssessments
  };
});
