"use strict";

const catalog = require("../data/device-catalog-v1.js");
const fixtures = require("../data/personal-gear-fixtures.js");
const adapter = require("../data/catalog-ui-adapter-v1.js");
const registry = require("../data/catalog-source-registry-v1.js");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])]));
  }
  return value;
}

function evidenceSignature(productId, scope) {
  const rows = catalog.claimsForComparisonScope(productId,scope);
  if (!rows.length) return null;
  return JSON.stringify(rows.map(row => ({
    field:row.field,
    unit:row.unit ?? null,
    conditions:stable(row.conditions || {})
  })).sort((a,b) => a.field.localeCompare(b.field)));
}

function comparisonAudit() {
  const products = catalog.products.filter(item => item.comparison_ready_scopes.length);
  return products.map(product => {
    const scopes = product.comparison_ready_scopes.map(scope => {
      const signature = evidenceSignature(product.product_id,scope);
      const comparablePeerIds = signature ? products
        .filter(peer => peer.product_id !== product.product_id && peer.category === product.category && peer.comparison_ready_scopes.includes(scope))
        .filter(peer => evidenceSignature(peer.product_id,scope) === signature)
        .map(peer => peer.product_id) : [];
      const details = adapter.detailsFor(product.product_id);
      return Object.freeze({
        scope,
        a_claim_backed:Boolean(signature),
        b_same_unit_condition_peer_ids:Object.freeze(comparablePeerIds),
        c_local_ui_visible:Boolean(details?.comparison_ready_scopes.includes(scope) && catalog.claimsForComparisonScope(product.product_id,scope).length)
      });
    });
    return Object.freeze({
      product_id:product.product_id,
      category:product.category,
      scopes:Object.freeze(scopes),
      d_existing_engine:adapter.isRecommendationProfiled(product.product_id) ? "fixture_profiled_separate" : "not_connected",
      e_personal_recommendation_eligible:product.recommendation_eligible
    });
  });
}

function fixtureLineage() {
  const fixtureIds = new Set(fixtures.products.map(item => item.product_id));
  const catalogIds = new Set(catalog.products.map(item => item.product_id));
  const overlapIds = [...fixtureIds].filter(id => catalogIds.has(id)).sort();
  const mappedCanonicalIds = adapter.canonicalIdentities.map(item => item.canonical_product_id);
  const mappedLegacyIds = adapter.canonicalIdentities.flatMap(item => item.legacy_product_ids);
  const evidenceRows = fixtures.products.flatMap(item => item.evidence || []);
  return Object.freeze({
    checked_date:fixtures.CHECKED_DATE,
    fixture_products:fixtures.products.length,
    fixture_only_flagged:fixtures.products.filter(item => item.fixture_only === true).length,
    fixture_evidence_rows:evidenceRows.length,
    official_evidence_rows:evidenceRows.filter(row => row.source_type === "official" || row.source_type === "official_support").length,
    catalog_products:catalog.products.length,
    raw_distinct_product_ids:new Set([...fixtureIds,...catalogIds]).size,
    overlap_products:overlapIds.length,
    pure_catalog_increment:catalog.products.length - overlapIds.length,
    fixture_only_not_in_catalog:fixtures.products.length - overlapIds.length,
    explicit_canonical_identity_mappings:adapter.canonicalIdentities.length,
    legacy_id_aliases:mappedLegacyIds.length,
    mapped_canonical_ids:Object.freeze(mappedCanonicalIds),
    mapped_legacy_ids:Object.freeze(mappedLegacyIds),
    canonical_catalog_increment:catalog.products.length - overlapIds.length - mappedCanonicalIds.length,
    fixture_only_not_in_canonical_catalog:fixtures.products.length - overlapIds.length - mappedLegacyIds.length,
    catalog_base_models:catalog.summarize().base_models,
    catalog_variants:catalog.summarize().variants,
    combined_canonical_identities:adapter.products.length,
    local_ui_distinct_products:adapter.products.length,
    overlap_ids:Object.freeze(overlapIds)
  });
}

function conservativeIdentityKey(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\-_™®()]+/g,"");
}

function identityAudit() {
  const fixtureRows = fixtures.products.map(item => ({
    lane:"fixture", product_id:item.product_id, product_name:item.product_name, category:item.category,
    resource_urls:[...new Set((item.evidence || []).map(row => row.source_url).filter(Boolean))]
  }));
  const catalogRows = catalog.products.map(item => ({
    lane:"catalog", product_id:item.product_id, product_name:item.product_name, category:item.category,
    resource_urls:[...new Set(item.source_ids.map(sourceId => registry.find(sourceId)?.canonical_url).filter(Boolean))]
  }));
  const rows = [...fixtureRows,...catalogRows];
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.category}:${conservativeIdentityKey(row.product_name)}`;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  }
  const sameNameDistinctIds = [...groups.values()]
    .filter(group => new Set(group.map(item => item.product_id)).size > 1)
    .map(group => Object.freeze({
      product_name:group[0].product_name,
      product_ids:Object.freeze([...new Set(group.map(item => item.product_id))].sort()),
      shared_resource_urls:Object.freeze([...new Set(group.flatMap(item => item.resource_urls))].filter(url => group.filter(item => item.resource_urls.includes(url)).length > 1).sort())
    }));
  return Object.freeze({
    same_name_distinct_id_candidates:Object.freeze(sameNameDistinctIds),
    explicit_mappings:adapter.canonicalIdentities,
    protected_distinct_counterexamples:Object.freeze([
      Object.freeze(["mouse-razer-basilisk-v3-pro","mouse-razer-basilisk-v3-pro-35k"]),
      Object.freeze(["keyboard-wooting-80he","keyboard-wooting-80he-plus"]),
      Object.freeze(["audio-logitech-pro-x-se","audio-logitech-pro-x-wireless","audio-logitech-pro-x-wired"])
    ])
  });
}

function buildReport() {
  const comparison = comparisonAudit();
  const scopes = comparison.flatMap(item => item.scopes);
  return Object.freeze({
    generated_for:"catalog-v1-local-acceptance-20261018",
    fixture_lineage:fixtureLineage(),
    identity_audit:identityAudit(),
    comparison_summary:Object.freeze({
      products_with_declared_scopes:comparison.length,
      declared_scopes:scopes.length,
      a_claim_backed_scopes:scopes.filter(item => item.a_claim_backed).length,
      b_scopes_with_comparable_peer:scopes.filter(item => item.b_same_unit_condition_peer_ids.length).length,
      c_locally_visible_scopes:scopes.filter(item => item.c_local_ui_visible).length,
      d_existing_engine_fixture_overlap:comparison.filter(item => item.d_existing_engine === "fixture_profiled_separate").length,
      e_personal_recommendation_eligible:comparison.filter(item => item.e_personal_recommendation_eligible).length
    }),
    comparison_products:Object.freeze(comparison)
  });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(buildReport(),null,2)}\n`);

module.exports = { evidenceSignature, comparisonAudit, fixtureLineage, conservativeIdentityKey, identityAudit, buildReport };
