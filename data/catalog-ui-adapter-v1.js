(function (root, factory) {
  const fixtures = root.GameFitPersonalGearFixtures || (typeof module === "object" && module.exports ? require("./personal-gear-fixtures.js") : null);
  const catalog = root.GameFitDeviceCatalogV1 || (typeof module === "object" && module.exports ? require("./device-catalog-v1.js") : null);
  const api = factory(fixtures, catalog);
  root.GameFitCatalogUiAdapterV1 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (fixtures, catalog) {
  "use strict";

  if (!fixtures || !catalog) throw new Error("Fixture and real catalog modules are required");

  function fixtureView(item) {
    const verifiedIdentity = catalog.find(item.product_id);
    return Object.freeze({
      product_id:item.product_id,
      product_name:item.product_name,
      manufacturer:verifiedIdentity?.manufacturer || null,
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
  const fixtureIds = new Set(fixtureProducts.map(item => item.product_id));
  const realProducts = Object.freeze(catalog.products.filter(item => !fixtureIds.has(item.product_id)).map(item => Object.freeze({
    ...catalog.publicView(item),
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
    return [item.product_name,item.manufacturer,...(item.verified_aliases || [])]
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
    return products.find(item => item.product_id === productId) || null;
  }

  function isRecommendationProfiled(productId) {
    return find(productId)?.selection_kind === "fixture_profiled";
  }

  function detailsFor(productId) {
    const item = find(productId);
    if (!item) return null;
    const catalogProduct = catalog.find(productId);
    return Object.freeze({
      product_id:item.product_id,
      product_name:item.product_name,
      manufacturer:item.manufacturer,
      selection_kind:item.selection_kind,
      catalog_identity_verified:Boolean(catalogProduct),
      checked_at:catalogProduct?.checked_at || null,
      claims:Object.freeze([...(catalogProduct ? catalog.claimsFor(productId) : [])]),
      comparison_ready_scopes:Object.freeze([...(catalogProduct?.comparison_ready_scopes || [])]),
      fixture_profile_fields:Object.freeze([...(item.fixture_profile_fields || [])]),
      fixture_recommendation_profiled:Boolean(item.fixture_recommendation_profiled),
      recommendation_eligible:Boolean(catalogProduct?.recommendation_eligible)
    });
  }

  function statusText(productId) {
    const item = find(productId);
    if (!item) return "製品を選択してください。";
    if (item.selection_kind === "fixture_profiled" && item.identity_verified) return "既存fixtureのテスト用比較データがある製品です。製品名は新カタログでも確認済みですが、カタログ側の推薦許可はありません。";
    if (item.selection_kind === "fixture_profiled") return "既存fixtureのテスト用行です。新カタログの公式確認済み69件には含めません。";
    if (item.specs_verified_fields.length) return `製品名を確認済みです。公式情報で${item.specs_verified_fields.length}項目を確認していますが、推薦条件は未確認です。`;
    return "製品名は確認済みです。比較に必要な情報がまだ揃っていないため、推薦には使いません。";
  }

  return { products, fixtureProducts, realProducts, optionsForCategory, search, find, isRecommendationProfiled, detailsFor, statusText };
});
