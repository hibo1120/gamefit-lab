(function (root, factory) {
  const api = factory();
  root.GameFitProducts = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createProductSchema() {
  "use strict";

  const PRODUCT_CATEGORIES = Object.freeze(["pc", "gpu", "monitor", "mouse", "keyboard"]);
  const PRODUCT_SCHEMA = Object.freeze({
    version: 1,
    required: ["product_id", "product_name", "category", "merchant_id", "enabled"],
    fields: Object.freeze({
      product_id: "string: stable internal identifier",
      product_name: "string: display name",
      category: "enum: pc | gpu | monitor | mouse | keyboard",
      merchant_id: "string: data/merchants.js merchant_id",
      enabled: "boolean: false until listing is reviewed",
      destination_url: "string: empty until an approved destination exists",
      price_yen: "number|null: manually verified snapshot only",
      specs: "object: category-specific normalized attributes",
      recommendation_categories: "string[]: diagnosis categories this product may support",
      last_verified_at: "string|null: ISO-8601 timestamp",
      notes: "string: operator-only notes"
    })
  });

  function validateProduct(product) {
    const errors = [];
    for (const field of PRODUCT_SCHEMA.required) {
      if (product?.[field] === undefined || product?.[field] === "") errors.push(`${field} is required`);
    }
    if (product?.category && !PRODUCT_CATEGORIES.includes(product.category)) errors.push("category is invalid");
    if (product?.enabled === true && !/^https:\/\//i.test(product?.destination_url || "")) {
      errors.push("enabled products require an https destination_url");
    }
    return errors;
  }

  return { PRODUCT_CATEGORIES, PRODUCT_SCHEMA, products: Object.freeze([]), validateProduct };
});
