(function (root, factory) {
  const api = factory();
  root.GameFitMerchants = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createMerchantCatalog() {
  "use strict";

  const merchants = Object.freeze([
    Object.freeze({
      merchant_id: "mouse_computer",
      merchant_name: "Mouse Computer",
      enabled: false,
      affiliate_url: "",
      categories: ["pc_replacement", "cpu_gpu"],
      destination_type: "manufacturer_store",
      disclosure_label: "広告・メーカー公式サイト",
      priority: 100,
      notes: "提携承認後に正式なAffiliate URLを設定し、enabledを切り替える。"
    }),
    Object.freeze({
      merchant_id: "razer",
      merchant_name: "Razer",
      enabled: false,
      affiliate_url: "",
      categories: ["device"],
      destination_type: "manufacturer_store",
      disclosure_label: "広告・メーカー公式サイト",
      priority: 80,
      notes: "提携承認前。実URLは未設定。"
    }),
    Object.freeze({
      merchant_id: "amazon",
      merchant_name: "Amazon",
      enabled: false,
      affiliate_url: "",
      categories: ["monitor", "ram", "storage", "device"],
      destination_type: "marketplace_search",
      disclosure_label: "広告・商品検索",
      priority: 60,
      notes: "提携承認前。商品カテゴリ別URLへ将来分割可能。"
    }),
    Object.freeze({
      merchant_id: "rakuten",
      merchant_name: "楽天市場",
      enabled: false,
      affiliate_url: "",
      categories: ["monitor", "ram", "storage", "device"],
      destination_type: "marketplace_search",
      disclosure_label: "広告・商品検索",
      priority: 50,
      notes: "提携承認前。商品カテゴリ別URLへ将来分割可能。"
    })
  ]);

  function isRenderable(merchant) {
    if (!merchant || merchant.enabled !== true) return false;
    if (typeof merchant.affiliate_url !== "string" || !/^https:\/\//i.test(merchant.affiliate_url)) return false;

    try {
      return new URL(merchant.affiliate_url).protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function find(merchantId, catalog = merchants) {
    return catalog.find(merchant => merchant.merchant_id === merchantId) || null;
  }

  function forCategory(category, catalog = merchants) {
    return catalog
      .filter(merchant => isRenderable(merchant) && merchant.categories.includes(category))
      .sort((a, b) => b.priority - a.priority);
  }

  return { find, forCategory, isRenderable, merchants };
});
