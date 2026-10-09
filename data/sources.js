(function (root, factory) {
  const api = factory();
  root.GameFitSources = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SOURCE_TYPES = Object.freeze(["official","lab","expert","community","adoption","retailer","social"]);
  const RELATIONSHIPS = Object.freeze(["none","affiliate","sponsored","mixed_or_unknown","unknown"]);

  const sources = Object.freeze([
    Object.freeze({
      source_id:"manufacturer_official", name:"Manufacturer official", source_type:"official",
      category_scope:["all"], methodology_quality:5, independence:1, repeatability:5, long_term_value:4,
      commercial_relationship:"none", base_weight:1.0, attribution_visibility:"detail",
      use_for:["static_specs","release_status","firmware","compatibility"], do_not_use_for:["subjective_quality","marketing_performance_claims_as_fact"]
    }),
    Object.freeze({
      source_id:"gamegeek", name:"GameGeek", source_type:"lab", category_scope:["mouse","monitor","mousepad","keyboard"],
      methodology_quality:5, independence:4, repeatability:5, long_term_value:4,
      commercial_relationship:"unknown", base_weight:0.95, attribution_visibility:"detail",
      use_for:["measurements","same_method_comparison"], do_not_use_for:["cross_lab_numeric_averaging"]
    }),
    Object.freeze({
      source_id:"dpqp", name:"DPQP / Mioni DB", source_type:"expert", category_scope:["mouse","keyboard","mousepad","audio"],
      methodology_quality:4, independence:4, repeatability:4, long_term_value:4,
      commercial_relationship:"mixed_or_unknown", base_weight:0.85, attribution_visibility:"detail",
      use_for:["measurements","expert_subjective","catalog_reference"], do_not_use_for:["single_source_subjective_final_judgment"]
    }),
    Object.freeze({
      source_id:"junuj", name:"JUNUJ", source_type:"expert", category_scope:["mouse","keyboard","mousepad","audio","monitor"],
      methodology_quality:4, independence:3, repeatability:3, long_term_value:4,
      commercial_relationship:"mixed_or_unknown", base_weight:0.75, attribution_visibility:"detail",
      use_for:["expert_subjective","new_product_context","long_use_context"], do_not_use_for:["single_source_subjective_final_judgment"]
    }),
    Object.freeze({
      source_id:"rtings", name:"RTINGS", source_type:"lab", category_scope:["mouse","keyboard","monitor","audio"],
      methodology_quality:5, independence:5, repeatability:5, long_term_value:5,
      commercial_relationship:"unknown", base_weight:0.95, attribution_visibility:"detail",
      use_for:["measurements","same_method_comparison"], do_not_use_for:["cross_lab_numeric_averaging"]
    }),
    Object.freeze({
      source_id:"tftcentral", name:"TFTCentral", source_type:"lab", category_scope:["monitor"],
      methodology_quality:5, independence:5, repeatability:5, long_term_value:5,
      commercial_relationship:"unknown", base_weight:0.95, attribution_visibility:"detail",
      use_for:["monitor_measurements","same_method_comparison"], do_not_use_for:["cross_lab_numeric_averaging"]
    }),
    Object.freeze({
      source_id:"geartics", name:"Geartics", source_type:"adoption", category_scope:["all"],
      methodology_quality:3, independence:3, repeatability:3, long_term_value:3,
      commercial_relationship:"unknown", base_weight:0.45, attribution_visibility:"detail",
      use_for:["market_adoption","creator_setup_signal"], do_not_use_for:["performance_score"]
    }),
    Object.freeze({
      source_id:"prosettings", name:"ProSettings", source_type:"adoption", category_scope:["mouse","keyboard","monitor","mousepad","audio"],
      methodology_quality:4, independence:4, repeatability:4, long_term_value:4,
      commercial_relationship:"unknown", base_weight:0.55, attribution_visibility:"detail",
      use_for:["game_specific_pro_adoption"], do_not_use_for:["performance_score","cross_game_recommendation"]
    }),
    Object.freeze({
      source_id:"community", name:"Community consensus", source_type:"community", category_scope:["all"],
      methodology_quality:2, independence:3, repeatability:2, long_term_value:5,
      commercial_relationship:"unknown", base_weight:0.5, attribution_visibility:"aggregate",
      use_for:["recurring_issues","long_term_use","subjective_consensus"], do_not_use_for:["single_comment_final_judgment"]
    })
  ]);

  function find(sourceId) { return sources.find(item => item.source_id === sourceId) || null; }

  function validateSource(source) {
    const errors = [];
    for (const key of ["source_id","name","source_type","category_scope","base_weight"]) {
      if (source?.[key] === undefined || source?.[key] === "") errors.push(key + " is required");
    }
    if (source?.source_type && !SOURCE_TYPES.includes(source.source_type)) errors.push("source_type is invalid");
    if (source?.commercial_relationship && !RELATIONSHIPS.includes(source.commercial_relationship)) errors.push("commercial_relationship is invalid");
    return errors;
  }

  return { SOURCE_TYPES, RELATIONSHIPS, sources, find, validateSource };
});
