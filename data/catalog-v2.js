(function (root, factory) {
  const api = factory();
  root.GameFitCatalogV2 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CATEGORIES = Object.freeze([
    "pc","cpu","gpu","ram","storage","monitor","mouse","keyboard","mousepad","mouse_skates",
    "audio","controller","mic","dac_amp","network","cable","hub","kvm","dock","power",
    "monitor_arm","capture_card","other"
  ]);
  const CATALOG_STATES = Object.freeze(["catalog","profiled","evaluated","verified","legacy","discontinued"]);
  const LIFECYCLE_STATES = Object.freeze(["announced","preorder","available","mature","discounting","out_of_stock","unavailable_us","eol","discontinued","legacy"]);
  const EVIDENCE_GRADES = Object.freeze(["D","C","B","A"]);

  function validateProduct(product) {
    const errors = [];
    for (const key of ["product_id","product_name","brand","category","catalog_state"]) {
      if (product?.[key] === undefined || product?.[key] === "") errors.push(key + " is required");
    }
    if (product?.category && !CATEGORIES.includes(product.category)) errors.push("category is invalid");
    if (product?.catalog_state && !CATALOG_STATES.includes(product.catalog_state)) errors.push("catalog_state is invalid");
    if (product?.lifecycle_state != null && !LIFECYCLE_STATES.includes(product.lifecycle_state)) errors.push("lifecycle_state is invalid");
    if (product?.evidence_grade != null && !EVIDENCE_GRADES.includes(product.evidence_grade)) errors.push("evidence_grade is invalid");
    if (product?.official_url && !/^https:\/\//i.test(product.official_url)) errors.push("official_url must use https");
    return errors;
  }

  const schema = Object.freeze({
    version: 2,
    productMasterRequired: Object.freeze(["product_id","product_name","brand","category","catalog_state"]),
    note: "Product identity/evaluation is independent from merchant listings and affiliate availability."
  });

  return { CATEGORIES, CATALOG_STATES, LIFECYCLE_STATES, EVIDENCE_GRADES, schema, validateProduct };
});
