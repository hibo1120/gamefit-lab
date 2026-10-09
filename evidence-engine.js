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
  const RIGHTS_STATES = Object.freeze(["safe_for_internal_fact","manual_terms_review","do_not_reuse_content"]);
  const MEASUREMENT_VERIFICATION = Object.freeze(["verified_lab","publisher_test","user_submitted","not_applicable"]);

  function validHttpsUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && Boolean(parsed.hostname);
    } catch (_) {
      return false;
    }
  }

  function validateEvidenceRecord(record) {
    const errors = [];
    for (const key of ["evidence_id", "source_id", "product_id", "evidence_type", "summary", "source_url", "retrieved_at"]) {
      if (record?.[key] === undefined || record?.[key] === "") errors.push(key + " is required");
    }
    if (record?.evidence_type && !EVIDENCE_TYPES.includes(record.evidence_type)) errors.push("evidence_type is invalid");
    if (record?.source_url && !validHttpsUrl(record.source_url)) errors.push("source_url must be a valid https URL");
    if (String(record?.summary || "").length > 280) errors.push("summary must be a concise GameFit-authored normalization");
    for (const key of PROHIBITED_COPY_FIELDS) {
      if (record?.[key] !== undefined && record[key] !== null && record[key] !== "") errors.push(key + " is prohibited");
    }
    return errors;
  }

  function validateFixtureEvidenceRecord(record) {
    const errors = validateEvidenceRecord(record);
    for (const key of ["source_origin_id", "source_type", "checked_date", "raw_fact", "normalized_fact", "locale", "methodology_family", "rights_use_note", "rights_status", "commercial_relationship"]) {
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
    if (record?.normalized_fact && record.normalized_fact.value === undefined) errors.push("normalized_fact.value is required");
    if (record?.rights_use_note && String(record.rights_use_note).length > 240) errors.push("rights_use_note is too long");
    if (record?.rights_status && !RIGHTS_STATES.includes(record.rights_status)) errors.push("rights_status is invalid");
    if (record?.measurement_verification && !MEASUREMENT_VERIFICATION.includes(record.measurement_verification)) errors.push("measurement_verification is invalid");
    if (record?.evidence_type === "measurement" && !["verified_lab","publisher_test","user_submitted"].includes(record?.measurement_verification)) {
      errors.push("measurement_verification is required for measurement");
    }
    return [...new Set(errors)];
  }

  function uniqueIndependent(items) {
    const seen = new Set();
    const seenOrigins = new Set();
    const seenPublisherIds = new Set();
    const seenCommunityAuthors = new Set();
    return items.filter(item => {
      if (item.independent !== true) return false;
      let publisher = null;
      try {
        const hostname = item.source_url ? new URL(item.source_url).hostname.toLowerCase().replace(/^www\./, "") : null;
        if (hostname) {
          const parts = hostname.split(".");
          const compoundSuffixes = new Set(["co.uk","org.uk","com.au","net.au","co.jp","ne.jp"]);
          const suffix = parts.slice(-2).join(".");
          publisher = compoundSuffixes.has(suffix) && parts.length >= 3 ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
        }
      } catch (_) {}
      const origin = item.source_origin_id || item.origin_source_id || item.source_id;
      const corporateOwner = item.publisher_group || item.corporate_owner;
      const communityAuthor = typeof item.community_author_id === "string" && item.community_author_id.trim() ? item.community_author_id.trim() : null;
      const communitySite = corporateOwner || publisher || item.publisher_id;
      const key = item.source_type === "community" ?
        (communityAuthor && communitySite ? "community:" + communitySite + ":" + communityAuthor : communitySite ? "community-site:" + communitySite : null) :
        (corporateOwner || publisher || item.publisher_id || origin);
      if (!key) return false;
      if ((origin && seenOrigins.has(origin)) || seen.has(key) || (item.publisher_id && seenPublisherIds.has(item.publisher_id)) ||
          (communityAuthor && seenCommunityAuthors.has(communityAuthor))) return false;
      if (origin) seenOrigins.add(origin);
      if (item.publisher_id) seenPublisherIds.add(item.publisher_id);
      if (communityAuthor) seenCommunityAuthors.add(communityAuthor);
      seen.add(key);
      return true;
    });
  }

  function currentEvidence(items) {
    return (items || []).filter(item => {
      if (validateFixtureEvidenceRecord(item).length) return false;
      if (!item.checked_date && !item.retrieved_at) return true;
      const timestamp = Date.parse((item.checked_date || item.retrieved_at) + "T00:00:00Z");
      return Number.isFinite(timestamp) && timestamp <= Date.now() + 86400000 && Date.now() - timestamp <= 3 * 365.25 * 86400000;
    });
  }

  function evidenceForProduct(items, product={}) {
    const records = items || [];
    return product?.variant_id ? records.filter(item => item.product_variant_id === product.variant_id) : records;
  }

  function normalizeSubjectiveConsensus(items, attribute=null) {
    const independent = uniqueIndependent(items.filter(item => item.evidence_type === "subjective" &&
      (!attribute || item.attribute === attribute || item.normalized_fact?.attribute === attribute)));
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
    const exact = evidenceForProduct(currentEvidence(items), product);
    const measurements = uniqueIndependent(exact.filter(i => i.evidence_type === "measurement" && ["verified_lab","publisher_test"].includes(i.measurement_verification))).length;
    const officialSpecs = exact.filter(i => i.evidence_type === "spec" && ["official","official_support","official_manual","official_documentation","official_compliance"].includes(i.source_type)).length;
    const specialistReviews = uniqueIndependent(exact.filter(i => i.evidence_type === "subjective" && i.source_type === "specialist_review")).length;
    const subjectiveConsensus = normalizeSubjectiveConsensus(exact);
    const subjectiveAttributes = [...new Set(exact.filter(i=>i.evidence_type === "subjective").map(i=>i.attribute || i.normalized_fact?.attribute).filter(Boolean))];
    const hasHighAttributeConsensus = subjectiveAttributes.some(attribute => normalizeSubjectiveConsensus(exact,attribute) === "high");
    const longTermCoverage = uniqueIndependent(exact.filter(i => i.long_term === true && !["adoption", "trend", "price"].includes(i.evidence_type))).length;
    const measurementValues = new Map();
    for (const item of exact.filter(i => i.evidence_type === "measurement" && i.normalized_fact?.value !== undefined)) {
      const key = [item.normalized_fact.attribute,item.methodology_family || "unknown"].join("|");
      const values = measurementValues.get(key) || new Set();
      values.add(JSON.stringify([item.normalized_fact.value,item.normalized_fact.unit || null]));
      measurementValues.set(key,values);
    }
    const criticalConflict = [...measurementValues.values()].some(values => values.size > 1);
    let grade = "D";
    if (measurements >= 1 || subjectiveConsensus === "medium") grade = "C";
    if (officialSpecs >= 1 && measurements >= 1 && specialistReviews >= 1) grade = "B";
    if (officialSpecs >= 1 && measurements >= 2 && hasHighAttributeConsensus && longTermCoverage >= 1) grade = "A";
    if (criticalConflict && ["A","B"].includes(grade)) grade = "C";

    const cap = newProductConfidenceCap(product);
    if (cap <= 0.35 && ["A","B"].includes(grade)) grade = "C";
    if (cap <= 0.55 && grade === "A") grade = "B";
    return grade;
  }

  function buildAssessment(items, product={}) {
    const scoped = evidenceForProduct(items, product);
    const strengths = [...new Set(scoped.filter(i=>i.effect === "strength").map(i=>i.summary).filter(Boolean))];
    const concerns = [...new Set(scoped.filter(i=>i.effect === "concern").map(i=>i.summary).filter(Boolean))];
    const mixed = scoped.filter(i=>i.effect === "mixed").map(i=>i.summary).filter(Boolean);
    return {
      evidence_grade: gradeFromEvidence(scoped, product),
      subjective_consensus: normalizeSubjectiveConsensus(scoped),
      subjective_consensus_by_attribute:Object.fromEntries([...new Set(scoped.filter(i=>i.evidence_type === "subjective").map(i=>i.attribute || i.normalized_fact?.attribute).filter(Boolean))]
        .map(attribute=>[attribute,normalizeSubjectiveConsensus(scoped,attribute)])),
      strengths,
      concerns,
      disagreement_notes:[...new Set(mixed)],
      measurement_groups:groupCompatibleMeasurements(scoped),
      coverage:{
        official_spec:scoped.some(i=>i.evidence_type === "spec" && String(i.source_type || "").startsWith("official")),
        independent_measurement:uniqueIndependent(scoped.filter(i=>i.evidence_type === "measurement" && ["verified_lab","publisher_test"].includes(i.measurement_verification))).length > 0,
        specialist_review:uniqueIndependent(scoped.filter(i=>i.evidence_type === "subjective" && i.source_type === "specialist_review")).length > 0,
        long_term_or_recurring_issue:scoped.some(i=>i.long_term === true),
        lifecycle:scoped.some(i=>i.claim_scope === "lifecycle" || i.normalized_fact?.attribute === "lifecycle")
      }
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
    const relevant = evidenceForProduct(currentEvidence(items), product)
      .filter(item => item.attribute === attribute || item.normalized_fact?.attribute === attribute);
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
    const official = objective.filter(item => ["official","official_support","official_manual","official_documentation","official_compliance"].includes(item.source_type) && item.methodology_family === "official_spec");
    const measurement = objective.filter(item => item.evidence_type === "measurement" && ["verified_lab","publisher_test"].includes(item.measurement_verification));
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
    EVIDENCE_TYPES, CONSENSUS, PROHIBITED_COPY_FIELDS, ATTRIBUTE_GRADES, SOURCE_TYPES, COMMERCIAL_RELATIONSHIPS, RIGHTS_STATES, MEASUREMENT_VERIFICATION, validateEvidenceRecord, validateFixtureEvidenceRecord,
    normalizeSubjectiveConsensus, groupCompatibleMeasurements,
    uniqueIndependent, currentEvidence, newProductConfidenceCap, gradeFromEvidence, buildAssessment,
    confidenceFromGrade, buildAttributeAssessment, buildAttributeAssessments
  };
});
