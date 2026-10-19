(function (root, factory) {
  const fixtures = root.GameFitPersonalGearFixtures || (typeof module === "object" && module.exports ? require("./personal-gear-fixtures.js") : null);
  const catalog = root.GameFitDeviceCatalogV1 || (typeof module === "object" && module.exports ? require("./device-catalog-v1.js") : null);
  const api = factory(fixtures, catalog);
  root.GameFitCatalogUiAdapterV1 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (fixtures, catalog) {
  "use strict";

  if (!fixtures || !catalog) throw new Error("Fixture and real catalog modules are required");

  const canonicalIdentities = Object.freeze([
    Object.freeze({
      canonical_product_id:"audio-logitech-pro-x-2-lightspeed",
      primary_selection_product_id:"audio-logitech-pro-x2",
      legacy_product_ids:Object.freeze(["audio-logitech-pro-x2"]),
      category:"audio",
      normalized_model:"logitech g pro x 2 lightspeed",
      catalog_source_id:"logitech_pro_x2_audio",
      official_resource_url:"https://www.logitechg.com/en-us/shop/p/pro-x-2-wireless-headset",
      resolution_basis:"Exact official resource and exact normalized model match; manually reviewed."
    })
  ]);

  const identityByLegacyId = new Map();
  const identityByCanonicalId = new Map();
  for (const identity of canonicalIdentities) {
    identityByCanonicalId.set(identity.canonical_product_id,identity);
    for (const legacyId of identity.legacy_product_ids) identityByLegacyId.set(legacyId,identity);
  }

  function canonicalProductId(productId) {
    return identityByLegacyId.get(productId)?.canonical_product_id || productId;
  }

  function selectionProductId(productId) {
    return identityByCanonicalId.get(productId)?.primary_selection_product_id || productId;
  }

  function catalogProductFor(productId) {
    return catalog.find(canonicalProductId(productId));
  }

  function validateCanonicalIdentities() {
    const errors = [];
    const legacyOwners = new Set();
    const canonicalOwners = new Set();
    for (const identity of canonicalIdentities) {
      const catalogProduct = catalog.find(identity.canonical_product_id);
      const primaryFixture = fixtures.products.find(item => item.product_id === identity.primary_selection_product_id);
      if (!catalogProduct) errors.push(`${identity.canonical_product_id}:canonical catalog product is missing`);
      if (!primaryFixture) errors.push(`${identity.canonical_product_id}:primary fixture is missing`);
      if (canonicalOwners.has(identity.canonical_product_id)) errors.push(`${identity.canonical_product_id}:duplicate canonical mapping`);
      canonicalOwners.add(identity.canonical_product_id);
      if (catalogProduct && primaryFixture) {
        if (catalogProduct.category !== primaryFixture.category || identity.category !== catalogProduct.category) errors.push(`${identity.canonical_product_id}:category mismatch`);
        if (catalog.normalizeSearch(catalogProduct.product_name) !== catalog.normalizeSearch(primaryFixture.product_name)) errors.push(`${identity.canonical_product_id}:model name mismatch`);
        if (catalog.normalizeSearch(identity.normalized_model) !== catalog.normalizeSearch(catalogProduct.product_name)) errors.push(`${identity.canonical_product_id}:reviewed model mismatch`);
        if (!catalogProduct.source_ids.includes(identity.catalog_source_id)) errors.push(`${identity.canonical_product_id}:catalog source mismatch`);
        if (!(primaryFixture.evidence || []).some(row => row.source_url === identity.official_resource_url)) errors.push(`${identity.canonical_product_id}:fixture resource mismatch`);
      }
      for (const legacyId of identity.legacy_product_ids) {
        if (legacyOwners.has(legacyId)) errors.push(`${legacyId}:duplicate legacy alias`);
        legacyOwners.add(legacyId);
        if (!fixtures.products.some(item => item.product_id === legacyId)) errors.push(`${legacyId}:legacy fixture is missing`);
      }
    }
    return errors;
  }

  function fixtureView(item) {
    const verifiedIdentity = catalogProductFor(item.product_id);
    const identity = identityByLegacyId.get(item.product_id) || null;
    return Object.freeze({
      product_id:item.product_id,
      canonical_product_id:verifiedIdentity?.product_id || item.product_id,
      legacy_product_ids:Object.freeze([...(identity?.legacy_product_ids || [])]),
      product_name:item.product_name,
      manufacturer:verifiedIdentity?.manufacturer || null,
      manufacturer_model_id:verifiedIdentity?.manufacturer_model_id || null,
      category:item.category,
      verified_aliases:Object.freeze([...(verifiedIdentity?.verified_aliases || [])]),
      identity_verified:Boolean(verifiedIdentity),
      specs_verified_fields:Object.freeze([...(verifiedIdentity?.specs_verified_fields || [])]),
      comparison_ready_scopes:Object.freeze([...(verifiedIdentity?.comparison_ready_scopes || [])]),
      fixture_profile_fields:Object.freeze(Object.keys(item.attributes || {})),
      fixture_recommendation_profiled:true,
      recommendation_eligible:verifiedIdentity?.recommendation_eligible ?? false,
      public_ui_connected:false,
      local_ui_selectable:true,
      selection_kind:"fixture_profiled"
    });
  }

  const fixtureProducts = Object.freeze(fixtures.products.map(fixtureView));
  const fixtureCoveredCatalogIds = new Set(fixtureProducts.filter(item => item.identity_verified).map(item => item.canonical_product_id));
  const realProducts = Object.freeze(catalog.products.filter(item => !fixtureCoveredCatalogIds.has(item.product_id)).map(item => Object.freeze({
    ...catalog.publicView(item),
    canonical_product_id:item.product_id,
    legacy_product_ids:Object.freeze([]),
    local_ui_selectable:item.local_ui_selectable,
    fixture_profile_fields:Object.freeze([]),
    fixture_recommendation_profiled:false,
    selection_kind:item.specs_verified_fields.length ? "catalog_specs_partial" : "catalog_identity_only"
  })));
  const products = Object.freeze([...fixtureProducts, ...realProducts]);

  function sortRows(rows) {
    return [...rows].sort((a,b) => {
      if (a.selection_kind === "fixture_profiled" && b.selection_kind !== "fixture_profiled") return -1;
      if (b.selection_kind === "fixture_profiled" && a.selection_kind !== "fixture_profiled") return 1;
      return a.product_name.localeCompare(b.product_name,"ja");
    });
  }

  function matches(item, query) {
    const needle = catalog.normalizeSearch(query);
    if (!needle) return true;
    return [item.product_id,item.canonical_product_id,...(item.legacy_product_ids || []),item.product_name,item.manufacturer,item.manufacturer_model_id,...(item.verified_aliases || [])]
      .filter(Boolean).some(value => catalog.normalizeSearch(value).includes(needle));
  }

  function optionsForCategory(category, query="") {
    return sortRows(products.filter(item => item.category === category && item.local_ui_selectable && matches(item,query)));
  }

  function search(query, options={}) {
    const category = options.category || null;
    return sortRows(products.filter(item => (!category || item.category === category) && matches(item,query)));
  }

  function find(productId) {
    const direct = products.find(item => item.product_id === productId);
    if (direct) return direct;
    const selectionId = selectionProductId(productId);
    return products.find(item => item.product_id === selectionId) || null;
  }

  function isRecommendationProfiled(productId) {
    return find(productId)?.selection_kind === "fixture_profiled";
  }

  function detailsFor(productId) {
    const item = find(productId);
    if (!item) return null;
    const catalogProduct = catalogProductFor(productId);
    return Object.freeze({
      product_id:item.product_id,
      requested_product_id:productId,
      canonical_product_id:catalogProduct?.product_id || item.canonical_product_id,
      legacy_product_ids:Object.freeze([...(item.legacy_product_ids || [])]),
      product_name:item.product_name,
      manufacturer:item.manufacturer,
      selection_kind:item.selection_kind,
      catalog_identity_verified:Boolean(catalogProduct),
      checked_at:catalogProduct?.checked_at || null,
      claims:Object.freeze([...(catalogProduct ? catalog.claimsFor(catalogProduct.product_id) : [])]),
      claim_holds:Object.freeze([...(catalogProduct ? catalog.holdsFor(catalogProduct.product_id) : [])]),
      comparison_ready_scopes:Object.freeze([...(catalogProduct?.comparison_ready_scopes || [])]),
      fixture_profile_fields:Object.freeze([...(item.fixture_profile_fields || [])]),
      fixture_recommendation_profiled:Boolean(item.fixture_recommendation_profiled),
      recommendation_eligible:Boolean(catalogProduct?.recommendation_eligible)
    });
  }

  function statusText(productId) {
    const item = find(productId);
    if (!item) return "製品を選択してください。";
    const catalogProduct = catalogProductFor(productId);
    const holdCount = catalogProduct ? catalog.holdsFor(catalogProduct.product_id).length : 0;
    const holdText = holdCount ? ` ${holdCount}項目は根拠条件が一致せず保留しています。` : "";
    if (item.selection_kind === "fixture_profiled" && item.identity_verified) return `既存fixtureのテスト用比較データがある製品です。製品名は新カタログでも確認済みですが、カタログ側の推薦許可はありません。${holdText}`;
    if (item.selection_kind === "fixture_profiled") return "既存fixtureのテスト用行です。新カタログの公式確認済み69件には含めません。";
    if (item.specs_verified_fields.length) return `製品名を確認済みです。公式情報で${item.specs_verified_fields.length}項目を確認していますが、推薦条件は未確認です。${holdText}`;
    return "製品名は確認済みです。比較に必要な情報がまだ揃っていないため、推薦には使いません。";
  }

  return { canonicalIdentities, products, fixtureProducts, realProducts, optionsForCategory, search, find, canonicalProductId, selectionProductId, isRecommendationProfiled, detailsFor, statusText, validateCanonicalIdentities };
});
