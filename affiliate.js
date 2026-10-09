(function (root, factory) {
  const merchantCatalog = root.GameFitMerchants || (
    typeof module === "object" && module.exports ? require("./data/merchants.js") : null
  );
  const api = factory(root, merchantCatalog);
  root.GameFitAffiliate = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createAffiliate(root, merchantCatalog) {
  "use strict";

  if (!merchantCatalog) throw new Error("GameFitMerchants must be loaded before affiliate.js");

  function buildLinkModel(merchant, category, context = {}) {
    if (!merchantCatalog.isRenderable(merchant)) return null;
    if (!Array.isArray(merchant.categories) || !merchant.categories.includes(category)) return null;

    return {
      href: merchant.affiliate_url,
      label: context.language === "en" ? `Browse options at ${merchant.merchant_name}` : `${merchant.merchant_name}で候補を見る`,
      disclosureLabel: merchant.disclosure_label,
      rel: "sponsored nofollow noopener",
      target: "_blank",
      tracking: {
        merchant: merchant.merchant_id,
        category,
        destinationType: merchant.destination_type,
        game: context.game,
        topRecommendation: context.topRecommendation,
        sourcePage: context.sourcePage || "diagnose",
        budgetBand: context.budgetBand
      }
    };
  }

  function modelsForResult(result, context = {}, catalog = merchantCatalog.merchants) {
    const decisions = [result?.recommendations?.[0]?.upgrade_match, result?.topRecommendation, result?.ranked?.[0]?.key].filter(Boolean);
    if (decisions.some(value => ["keep","DONT_UPGRADE","AVOID","CLARIFY"].includes(value))) return [];
    const usedMerchants = new Set();
    const models = [];

    for (const recommendation of result?.ranked || []) {
      const category = recommendation.affiliateCategory || recommendation.key;
      const merchant = merchantCatalog.forCategory(category, catalog, context.region || "JP")
        .find(candidate => !usedMerchants.has(candidate.merchant_id));
      if (!merchant) continue;

      const model = buildLinkModel(merchant, category, {
        game: result.game?.id,
        topRecommendation: result.topRecommendation || result.ranked?.[0]?.key,
        sourcePage: context.sourcePage,
        budgetBand: context.budgetBand || String(result.budget || ""),
        language: context.language || "ja"
      });
      if (model) {
        usedMerchants.add(merchant.merchant_id);
        models.push(model);
      }
    }

    return models;
  }

  function render(container, result, context = {}) {
    if (!container) return [];
    const models = modelsForResult(result, context);
    container.replaceChildren();
    container.hidden = models.length === 0;
    if (models.length === 0) return models;

    const heading = container.ownerDocument.createElement("h3");
    heading.textContent = context.language === "en" ? "Relevant options" : "関連する選択肢";
    container.append(heading);

    for (const model of models) {
      const link = container.ownerDocument.createElement("a");
      link.href = model.href;
      link.target = model.target;
      link.rel = model.rel;
      link.textContent = model.label;
      link.dataset.merchant = model.tracking.merchant;
      link.dataset.category = model.tracking.category;
      link.dataset.destinationType = model.tracking.destinationType;
      link.addEventListener("click", () => {
        try {
          root.GameFitAnalytics?.trackAffiliateClick(model.tracking);
        } catch (_) {
          // A measurement failure must never block navigation.
        }
      });

      const disclosure = container.ownerDocument.createElement("span");
      disclosure.className = "affiliate-disclosure";
      disclosure.textContent = model.disclosureLabel;
      const item = container.ownerDocument.createElement("p");
      item.append(link, disclosure);
      container.append(item);
    }

    return models;
  }

  return { buildLinkModel, modelsForResult, render };
});
