(function (root, factory) {
  const api = factory();
  root.GameFitEvidenceAudit = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const RIGHTS_STATES = Object.freeze(["safe_for_internal_fact", "manual_terms_review", "do_not_reuse_content"]);
  const FACT_SCOPES = Object.freeze(["factual_data", "measurement", "subjective_review", "community", "adoption"]);
  const METHODOLOGY_PREFIXES = Object.freeze([
    "official_", "manufacturer_", "rtings_", "gamepadla_", "p82_", "gpdl_", "specialist_",
    "community_", "prosettings_", "registry_", "standards_", "usb_if_", "ifixit_", "launch_", "toms_"
  ]);

  function publisherKey(record) {
    if (record.publisher_group || record.corporate_owner || record.publisher_id) {
      return record.publisher_group || record.corporate_owner || record.publisher_id;
    }
    try {
      const host = new URL(record.source_url).hostname.toLowerCase().replace(/^www\./, "");
      const parts = host.split(".");
      const suffix = parts.slice(-2).join(".");
      const compound = new Set(["co.uk", "org.uk", "com.au", "net.au", "co.jp", "ne.jp"]);
      return compound.has(suffix) && parts.length >= 3 ? parts.slice(-3).join(".") : suffix;
    } catch (_) { return null; }
  }

  function factScope(record) {
    if (record.source_type === "community") return "community";
    if (record.evidence_type === "measurement") return "measurement";
    if (record.evidence_type === "subjective") return "subjective_review";
    if (record.evidence_type === "adoption") return "adoption";
    return "factual_data";
  }

  function defaultRightsState(record) {
    if (["community", "specialist_review", "independent_lab", "esports_database"].includes(record.source_type)) return "manual_terms_review";
    return "safe_for_internal_fact";
  }

  function daysBetween(left, right) {
    const a = Date.parse(left + "T00:00:00Z");
    const b = Date.parse(right + "T00:00:00Z");
    return Number.isFinite(a) && Number.isFinite(b) ? Math.floor((b - a) / 86400000) : null;
  }

  function staleLimit(record) {
    if (record.evidence_type === "price") return 30;
    if (record.evidence_type === "adoption") return 120;
    if (["spec", "trend", "fact_correction"].includes(record.evidence_type)) return 730;
    return 1095;
  }

  function addIssue(issues, severity, code, record, detail) {
    issues.push({ severity, code, evidence_id:record?.evidence_id || null, product_id:record?.product_id || null, detail });
  }

  function auditEvidence(records, options={}) {
    const asOf = options.as_of || new Date().toISOString().slice(0,10);
    const issues = [];
    const urls = new Map();
    const publisherRoles = new Map();
    const normalizedGroups = new Map();
    const enriched = [];
    for (const record of records || []) {
      const scope = record.fact_scope || factScope(record);
      const rights = record.rights_status || defaultRightsState(record);
      enriched.push({ ...record, fact_scope:scope, rights_status:rights });
      if (!RIGHTS_STATES.includes(rights)) addIssue(issues,"error","invalid_rights_status",record,rights);
      if (!FACT_SCOPES.includes(scope)) addIssue(issues,"error","invalid_fact_scope",record,scope);
      if (!record.checked_date) addIssue(issues,"error","missing_checked_date",record,null);
      if (!record.variant && !record.product_variant_id && record.variant_scope !== "family" && record.normalized_fact?.attribute !== "product_identity") {
        addIssue(issues,"warning","missing_variant",record,"Exact-SKU claims should name the variant or model.");
      }
      try {
        const url = new URL(record.source_url);
        if (url.protocol !== "https:") throw new Error("not https");
      } catch (_) { addIssue(issues,"error","malformed_source_url",record,record.source_url || null); }
      const raw = String(record.raw_fact || "");
      if (!raw || raw.length > 280 || /[\r\n<>]/.test(raw)) addIssue(issues,"error","raw_fact_invalid",record,raw.length);
      const method = String(record.methodology_family || "");
      if (!method || !METHODOLOGY_PREFIXES.some(prefix => method.startsWith(prefix))) {
        addIssue(issues,"warning","unsupported_methodology",record,method || null);
      }
      if (record.evidence_type === "measurement" && !["independent_lab","specialist_review"].includes(record.source_type)) {
        addIssue(issues,"error","source_type_mismatch",record,"measurement requires independent_lab or specialist_review");
      }
      if (record.evidence_type === "subjective" && !["specialist_review","community"].includes(record.source_type)) {
        addIssue(issues,"error","source_type_mismatch",record,"subjective requires specialist_review or community");
      }
      const age = record.checked_date ? daysBetween(record.checked_date,asOf) : null;
      if (age !== null && age > staleLimit(record)) addIssue(issues,"warning","stale_evidence",record,age);
      if (record.source_url) {
        const bucket = urls.get(record.source_url) || [];
        bucket.push(record.evidence_id);
        urls.set(record.source_url,bucket);
      }
      const pub = publisherKey(record);
      if (pub) {
        const key = [record.product_id,pub,record.evidence_type].join("|");
        const bucket = publisherRoles.get(key) || [];
        bucket.push(record.evidence_id);
        publisherRoles.set(key,bucket);
      }
      const fact = record.normalized_fact;
      if (fact && fact.value !== undefined) {
        const key = [record.product_id,fact.attribute,record.variant || fact.variant || "",record.methodology_family || ""].join("|");
        const bucket = normalizedGroups.get(key) || [];
        bucket.push({ id:record.evidence_id, value:JSON.stringify([fact.value,fact.unit || null]), objective:["spec","measurement","fact_correction"].includes(record.evidence_type) });
        normalizedGroups.set(key,bucket);
      }
    }
    for (const [url, ids] of urls) if (ids.length > 1) issues.push({ severity:"info", code:"duplicate_url", evidence_ids:ids, detail:url });
    for (const [key, ids] of publisherRoles) if (ids.length > 1) issues.push({ severity:"info", code:"same_corporate_publisher", evidence_ids:ids, detail:key });
    for (const [key, values] of normalizedGroups) {
      if (new Set(values.map(item => item.value)).size > 1) issues.push({ severity:values.every(item=>item.objective) ? "error" : "warning", code:"conflicting_normalized_value", evidence_ids:values.map(item=>item.id), detail:key });
    }
    const manualReview = enriched.filter(item => item.rights_status === "manual_terms_review").map(item => ({
      evidence_id:item.evidence_id, source_url:item.source_url, fact_scope:item.fact_scope,
      review_reason:"Confirm source terms before any use beyond internal factual analysis and a link."
    }));
    const counts = issues.reduce((acc,item)=>((acc[item.code]=(acc[item.code]||0)+1),acc),{});
    return {
      as_of:asOf,
      record_count:enriched.length,
      issue_count:issues.length,
      blocking_count:issues.filter(item=>item.severity === "error").length,
      counts,
      issues,
      rights_queue:{ manual_review_required:manualReview, do_not_reuse:enriched.filter(item=>item.rights_status === "do_not_reuse_content").map(item=>item.evidence_id) },
      records:enriched,
      policy:"Keep source URL and short GameFit-authored facts only; never ingest article prose, images, tables, graphs, video, thumbnails, or transcripts."
    };
  }

  function renderMarkdown(report) {
    const rows = Object.entries(report.counts || {}).sort(([a],[b])=>a.localeCompare(b))
      .map(([code,count])=>`| ${code} | ${count} |`).join("\n") || "| none | 0 |";
    return [
      "# Evidence audit", "", `Checked: ${report.as_of}`, `Records: ${report.record_count}`,
      `Blocking errors: ${report.blocking_count}`, `Manual rights review: ${report.rights_queue.manual_review_required.length}`,
      "", "| Check | Count |", "|---|---:|", rows, "", report.policy
    ].join("\n");
  }

  return { RIGHTS_STATES, FACT_SCOPES, publisherKey, factScope, defaultRightsState, auditEvidence, renderMarkdown };
});
