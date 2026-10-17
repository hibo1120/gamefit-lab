(function (root, factory) {
  const catalog = root.GameFitDeviceCatalogV1 || (typeof module === "object" && module.exports ? require("./device-catalog-v1.js") : null);
  const registry = root.GameFitCatalogSourceRegistryV1 || (typeof module === "object" && module.exports ? require("./catalog-source-registry-v1.js") : null);
  const api = factory(catalog, registry);
  root.GameFitCatalogResearchLedgerV1 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (catalog, registry) {
  "use strict";

  if (!catalog || !registry) throw new Error("Catalog and source registry are required");

  const VERSION = "catalog-expansion-v1-20261018";
  const processed_batches = Object.freeze([
    Object.freeze({ batch_id:"official-input-controllers",categories:Object.freeze(["mouse","keyboard","mousepad","controller"]),product_count:39,status:"registered_identity",checked_at:"2026-10-18" }),
    Object.freeze({ batch_id:"official-display-av",categories:Object.freeze(["monitor","audio","mic","capture_card"]),product_count:16,status:"registered_identity",checked_at:"2026-10-18" }),
    Object.freeze({ batch_id:"official-core-network",categories:Object.freeze(["cpu","gpu","storage","network","power"]),product_count:14,status:"registered_identity",checked_at:"2026-10-18" })
  ]);

  const hold = Object.freeze([
    Object.freeze({ item_id:"source-rtings-bulk",source_id:"rtings",status:"HOLD",reason:"Systematic database creation or bulk transfer is outside the reviewed permission scope." }),
    Object.freeze({ item_id:"source-tftcentral-original",source_id:"tftcentral",status:"HOLD",reason:"The exact original project source and reuse conditions have not been reconfirmed." }),
    Object.freeze({ item_id:"source-community-unspecified",source_id:"community",status:"HOLD",reason:"A specific post, author, claim, and reuse basis are required before use." }),
    Object.freeze({ item_id:"recommendation-eligibility",source_id:null,status:"HOLD",reason:"Identity and manufacturer specifications alone do not establish comparative value or a recommendation." })
  ]);

  const remaining_queue = Object.freeze([
    Object.freeze({ category:"pc",priority:"high",next_gate:"Identify exact official BTO model and region-specific configuration pages." }),
    Object.freeze({ category:"ram",priority:"high",next_gate:"Register kit-level capacity, speed, timings, voltage, and platform scope from official pages." }),
    Object.freeze({ category:"dac_amp",priority:"medium",next_gate:"Separate DAC, amplifier, and combined-device identities before specification work." }),
    Object.freeze({ category:"mouse_skates",priority:"medium",next_gate:"Require model compatibility and pack identity from a manufacturer source." }),
    Object.freeze({ category:"cable",priority:"medium",next_gate:"Separate connector pair, certification, length, and active/passive variants." }),
    Object.freeze({ category:"hub",priority:"medium",next_gate:"Verify host interface, power delivery, and display-mode conditions." }),
    Object.freeze({ category:"kvm",priority:"medium",next_gate:"Verify supported resolution/refresh combinations and USB switching scope." }),
    Object.freeze({ category:"dock",priority:"medium",next_gate:"Verify host compatibility and shared-bandwidth conditions." }),
    Object.freeze({ category:"monitor_arm",priority:"low",next_gate:"Verify load, VESA range, and display-size conditions." }),
    Object.freeze({ category:"other",priority:"low",next_gate:"Create a named category before adding products where practical." })
  ]);

  const owner_gear_mapping = Object.freeze([
    Object.freeze({ reported_key:"reported_mouse_razer_basilisk_v3_pro",status:"exact_match",product_id:"mouse-razer-basilisk-v3-pro",excluded_product_ids:Object.freeze(["mouse-razer-basilisk-v3-pro-35k"]),reason:"The reported name matches the non-35K model; no silent substitution to the 35K variant." }),
    Object.freeze({ reported_key:"reported_controller_xbox_official_unspecified",status:"family_ambiguous",candidate_product_ids:Object.freeze(["controller-xbox-wireless","controller-xbox-elite-series-2","controller-xbox-elite-series-2-core"]),reason:"The model was not specified, so no exact product is selected." }),
    Object.freeze({ reported_key:"reported_mouse_roccat_brand_only",status:"unresolved",candidate_product_ids:Object.freeze([]),reason:"A brand alone is insufficient for product identity." }),
    Object.freeze({ reported_key:"reported_mouse_logitech_general_non_gaming",status:"unresolved",candidate_product_ids:Object.freeze([]),reason:"The model name or manufacturer model ID is required." })
  ]);

  function validateLedger() {
    const errors = [];
    if (processed_batches.reduce((sum,row) => sum + row.product_count,0) !== catalog.products.length) errors.push("processed product count does not match catalog");
    for (const row of hold) if (row.source_id && !registry.find(row.source_id)) errors.push(`${row.item_id}:unknown source`);
    for (const row of owner_gear_mapping) {
      if (row.product_id && !catalog.find(row.product_id)) errors.push(`${row.reported_key}:unknown product`);
      for (const productId of row.candidate_product_ids || []) if (!catalog.find(productId)) errors.push(`${row.reported_key}:unknown candidate`);
      for (const productId of row.excluded_product_ids || []) if (!catalog.find(productId)) errors.push(`${row.reported_key}:unknown excluded product`);
    }
    return errors;
  }

  return { VERSION, processed_batches, hold, remaining_queue, owner_gear_mapping, validateLedger };
});
