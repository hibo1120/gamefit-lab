(function (root, factory) {
  const evidence = root.GameFitEvidence || (typeof module === "object" && module.exports ? require("../evidence-engine.js") : null);
  const normalization = root.GameFitNormalization || (typeof module === "object" && module.exports ? require("../normalization-engine.js") : null);
  const api = factory(evidence, normalization);
  root.GameFitPersonalGearFixtures = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (evidence, normalization) {
  "use strict";

  if (!evidence || !normalization) throw new Error("GameFitEvidence and GameFitNormalization are required");
  const CHECKED_DATE = "2026-10-09";
  const RIGHTS_NOTE = "Store only this GameFit-authored fact and source metadata; do not copy page prose, images, tables, graphs, video, or thumbnails.";

  function fact(productId, sequence, sourceUrl, attribute, rawFact, normalizedValue, unit=null, options={}) {
    return Object.freeze({
      evidence_id:`${productId}-${options.source_type || "official"}-${sequence}`,
      source_id:options.source_id || `${productId}-manufacturer`,
      source_origin_id:options.source_origin_id || `${productId}-manufacturer`,
      product_id:productId,
      evidence_type:options.evidence_type || "spec",
      source_type:options.source_type || "official",
      summary:options.summary || rawFact,
      source_url:sourceUrl,
      retrieved_at:CHECKED_DATE,
      checked_date:CHECKED_DATE,
      raw_fact:rawFact,
      normalized_fact:Object.freeze({ attribute, value:normalizedValue, unit, variant:options.variant || null }),
      attribute,
      variant:options.variant || null,
      product_variant_id:options.product_variant_id || null,
      variant_scope:options.variant_scope || "exact",
      locale:options.locale || "en-US",
      methodology_family:options.methodology_family || "official_spec",
      rights_use_note:RIGHTS_NOTE,
      commercial_relationship:options.commercial_relationship || "manufacturer",
      independent:options.independent ?? false,
      stance:options.stance || null,
      effect:options.effect || null,
      game_id:options.game_id || null,
      input_method:options.input_method || null,
      time_window:options.time_window || null,
      sample_size:options.sample_size || null,
      publisher_group:options.publisher_group || null,
      claim_scope:options.claim_scope || null,
      long_term:options.long_term === true,
      rights_status:options.rights_status || (["community","specialist_review","independent_lab","esports_database"].includes(options.source_type) ? "manual_terms_review" : "safe_for_internal_fact"),
      measurement_verification:options.measurement_verification || (options.evidence_type === "measurement" ? "publisher_test" : "not_applicable"),
      published_at:options.published_at || null
    });
  }

  function product(definition) {
    const records = Object.freeze(definition.evidence);
    const scopedRecords = definition.variant_id ? records.filter(record => record.product_variant_id === definition.variant_id) : records;
    const evidenceGrade = evidence.gradeFromEvidence(scopedRecords,{ lifecycle_state:definition.lifecycle_state, variant_id:definition.variant_id, variant_scope:definition.variant_scope || "exact" });
    const attributeNames = [...new Set(scopedRecords.map(record => record.attribute).filter(attribute => attribute !== "product_identity"))];
    const attributeEvidence = evidence.buildAttributeAssessments(scopedRecords, attributeNames,{
      lifecycle_state:definition.lifecycle_state, evidence_grade:evidenceGrade
    });
    const attributes = {};
    for (const record of scopedRecords) {
      const normalized = record.normalized_fact;
      if (!normalized || normalized.attribute === "product_identity" ||
          !["spec", "measurement", "fact_correction"].includes(record.evidence_type) ||
          attributeEvidence[normalized.attribute]?.conflict) continue;
      attributes[normalized.attribute] = Object.freeze({
        raw_value:record.raw_fact,
        normalized_value:normalized.value,
        normalized_unit:normalized.unit
      });
    }
    return Object.freeze({
      product_id:definition.product_id,
      product_name:definition.product_name,
      category:definition.category,
      fixture_role:definition.fixture_role,
      lifecycle_state:definition.lifecycle_state,
      variant_scope:definition.variant_scope || "exact",
      variant_id:definition.variant_id || null,
      evidence_grade:evidenceGrade,
      fixture_only:true,
      attributes:Object.freeze(attributes),
      attribute_evidence:Object.freeze(attributeEvidence),
      compatibility_profile:Object.freeze(definition.compatibility_profile || {}),
      price_snapshot:definition.price_snapshot ? Object.freeze(definition.price_snapshot) : null,
      price:definition.price_snapshot?.current_price ?? null,
      game_fitness:Object.freeze(definition.game_fitness || {}),
      evidence:records
    });
  }

  const definitions = [
    {
      product_id:"mouse-razer-viper-v4-pro", product_name:"Razer Viper V4 Pro", category:"mouse",
      fixture_role:"current_flagship", lifecycle_state:"available", variant_id:"RZ01-05630100-R3U1",
      price_snapshot:{ product_id:"mouse-razer-viper-v4-pro", variant_id:"RZ01-05630100-R3U1", current_price:159.99, currency:"USD", region:"US", checked_at:CHECKED_DATE, availability:"in_stock", lifecycle_phase:"launch", historical_context_available:false, source_url:"https://www.razer.com/gaming-mice/razer-viper-v4-pro/RZ01-05630100-R3U1" },
      evidence:[
        fact("mouse-razer-viper-v4-pro",1,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","weight","Razer lists 49 g for the black edition.",49,"g",{variant:"black",product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",2,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","polling_rate","Razer lists polling up to 8000 Hz.",8000,"hz",{product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",3,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","shape","Razer describes a right-handed symmetrical shape.","right_handed_symmetrical",null,{product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",4,"https://www.rtings.com/mouse/reviews/razer/viper-v4-pro","click_latency","RTINGS tested the black unit under mouse methodology 1.5.2; the method-specific result is retained without converting it to another lab's scale.","measured_rtings_v1_5_2",null,{ evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-viper-v4-pro", source_origin_id:"rtings-viper-v4-pro", methodology_family:"rtings_mouse_v1_5_2", measurement_verification:"verified_lab", independent:true, commercial_relationship:"reader_supported_affiliate_disclosed", publisher_group:"rtings", variant:"black", product_variant_id:"RZ01-05630100-R3U1" }),
        fact("mouse-razer-viper-v4-pro",5,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","length","Razer lists 127.1 mm length.",127.1,"mm",{product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",6,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","width","Razer lists 63.9 mm width.",63.9,"mm",{product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",7,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","height","Razer lists 39.9 mm height.",39.9,"mm",{product_variant_id:"RZ01-05630100-R3U1"}),
        fact("mouse-razer-viper-v4-pro",8,"https://www.techradar.com/computing/mice/razer-viper-v4-pro-review","review_scope","TechRadar evaluated a retail-category Viper V4 Pro and reported an overall positive specialist assessment; this does not prove personal fit.","positive_specialist_assessment",null,{ evidence_type:"subjective", source_type:"specialist_review", source_id:"techradar-viper-v4-pro", source_origin_id:"techradar-viper-v4-pro", methodology_family:"specialist_editorial", independent:true, stance:"positive", effect:"strength", commercial_relationship:"affiliate_links_disclosed", publisher_group:"future_plc", rights_status:"manual_terms_review", product_variant_id:"RZ01-05630100-R3U1" }),
        fact("mouse-razer-viper-v4-pro",9,"https://www.razer.com/newsroom/product-news/razer-viper-v4-pro","lifecycle","Razer announced the Viper V4 Pro in 2026, so long-term reliability evidence is not yet mature.","launch_2026_long_term_gap",null,{ evidence_type:"trend", source_type:"official", source_id:"razer-viper-v4-pro-launch", source_origin_id:"razer-viper-v4-pro-launch", methodology_family:"launch_timeline", claim_scope:"lifecycle", product_variant_id:"RZ01-05630100-R3U1" }),
        fact("mouse-razer-viper-v4-pro",10,"https://www.razer.com/gaming-mice/razer-viper-v4-pro/RZ01-05630100-R3U1","current_price","Razer US listed the black SKU in stock at USD 159.99 on the checked date.",159.99,"usd",{ evidence_type:"price", source_type:"official", source_id:"razer-viper-v4-pro-us-listing", source_origin_id:"razer-viper-v4-pro-us-listing", methodology_family:"official_listing_snapshot", claim_scope:"lifecycle", product_variant_id:"RZ01-05630100-R3U1" })
      ]
    },
    {
      product_id:"mouse-logitech-pro-x2-superstrike", product_name:"Logitech G PRO X2 SUPERSTRIKE", category:"mouse",
      fixture_role:"staple", lifecycle_state:"available", variant_id:"910-007700",
      price_snapshot:{ product_id:"mouse-logitech-pro-x2-superstrike", variant_id:"910-007700", current_price:179.99, currency:"USD", region:"US", checked_at:CHECKED_DATE, availability:"in_stock", lifecycle_phase:"mature", historical_context_available:false, source_url:"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse.910-007700" },
      evidence:[
        fact("mouse-logitech-pro-x2-superstrike",1,"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse.910-007700","rapid_trigger","Logitech lists adjustable rapid-trigger reset points for the main buttons.",true,null,{product_variant_id:"910-007700"}),
        fact("mouse-logitech-pro-x2-superstrike",2,"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse.910-007700","product_identity","Logitech lists PRO X2 SUPERSTRIKE as a LIGHTSPEED wireless gaming mouse.","logitech_pro_x2_superstrike",null,{product_variant_id:"910-007700"}),
        fact("mouse-logitech-pro-x2-superstrike",3,"https://www.rtings.com/mouse/reviews/logitech/g-pro-x2-superstrike","click_latency","RTINGS tested the product under mouse methodology 1.5.2; the method-specific result is retained without merging it with another lab.","measured_rtings_v1_5_2",null,{ evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-pro-x2-superstrike", source_origin_id:"rtings-pro-x2-superstrike", methodology_family:"rtings_mouse_v1_5_2", measurement_verification:"verified_lab", independent:true, commercial_relationship:"reader_supported_affiliate_disclosed", publisher_group:"rtings", product_variant_id:"910-007700" }),
        fact("mouse-logitech-pro-x2-superstrike",4,"https://www.techradar.com/computing/mice/logitech-g-pro-x2-superstrike-review","click","TechRadar found the adjustable haptic click novel but not universally convincing; this is a specialist opinion, not a performance fact.","mixed_haptic_click_assessment",null,{ evidence_type:"subjective", source_type:"specialist_review", source_id:"techradar-pro-x2-superstrike", source_origin_id:"techradar-pro-x2-superstrike", methodology_family:"specialist_editorial", independent:true, stance:"mixed", effect:"mixed", commercial_relationship:"affiliate_links_disclosed", publisher_group:"future_plc", rights_status:"manual_terms_review", product_variant_id:"910-007700" }),
        fact("mouse-logitech-pro-x2-superstrike",5,"https://www.logitech.com/blog/2026/02/10/pro-x2-superstrike-the-fastest-fully-customizable-click-in-competitive-gaming-lands-february-10th/","lifecycle","Logitech states the product became available in February 2026; long-term evidence remains immature.","launched_2026_long_term_gap",null,{ evidence_type:"trend", source_type:"official", source_id:"logitech-pro-x2-launch", source_origin_id:"logitech-pro-x2-launch", methodology_family:"launch_timeline", claim_scope:"lifecycle", product_variant_id:"910-007700" }),
        fact("mouse-logitech-pro-x2-superstrike",6,"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse.910-007700","current_price","Logitech US listed SKU 910-007700 in stock at USD 179.99 on the checked date.",179.99,"usd",{ evidence_type:"price", source_type:"official", source_id:"logitech-pro-x2-us-listing", source_origin_id:"logitech-pro-x2-us-listing", methodology_family:"official_listing_snapshot", claim_scope:"lifecycle", product_variant_id:"910-007700" })
      ]
    },
    {
      product_id:"mouse-mchose-l7-pro", product_name:"MCHOSE L7 Pro", category:"mouse",
      fixture_role:"value", lifecycle_state:"available",
      evidence:[
        fact("mouse-mchose-l7-pro",1,"https://support.mchose.store/hc/en-us/articles/50830320796820-L7-Tri-mode-Gaming-Mouse-User-Guide","weight","MCHOSE lists 39 g with a ±2 g tolerance for L7 Pro / L7 Ultra.",39,"g",{variant:"L7 Pro",locale:"en"}),
        fact("mouse-mchose-l7-pro",2,"https://support.mchose.store/hc/en-us/articles/50830320796820-L7-Tri-mode-Gaming-Mouse-User-Guide","length","MCHOSE lists 115.62 mm length for L7 Pro / L7 Ultra.",115.62,"mm",{variant:"L7 Pro",locale:"en"})
      ]
    },
    {
      product_id:"mouse-razer-viper-v3-pro", product_name:"Razer Viper V3 Pro", category:"mouse",
      fixture_role:"hidden_gem_candidate", lifecycle_state:"discounting", variant_id:"RZ01-05120100-R3U1",
      price_snapshot:{ product_id:"mouse-razer-viper-v3-pro", variant_id:"RZ01-05120100-R3U1", current_price:129.99, currency:"USD", region:"US", checked_at:CHECKED_DATE, availability:"in_stock", lifecycle_phase:"discounting", historical_context_available:false, source_url:"https://www.razer.com/gaming-mice/razer-viper-v3-pro/RZ01-05120100-R3U1" },
      evidence:[
        fact("mouse-razer-viper-v3-pro",1,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","weight","Razer lists 54 g for the black edition.",54,"g",{variant:"black",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",2,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","hump","Razer describes a raised rear-shifted hump.","rear",null,{methodology_family:"official_spec",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",3,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","shape","Razer describes a right-handed symmetrical form factor.","right_handed_symmetrical",null,{methodology_family:"official_spec",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",4,"https://www.rtings.com/mouse/reviews/razer/viper-v3-pro","click_latency","RTINGS' 2026 retest reports very low click latency under mouse methodology 1.5.2.","very_low_under_rtings_v1_5_2",null,{
          evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-mouse-viper-v3-pro",
          source_origin_id:"rtings-mouse-viper-v3-pro", methodology_family:"rtings_mouse_v1_5_2", measurement_verification:"verified_lab", independent:true,
          publisher_group:"rtings", product_variant_id:"RZ01-05120100-R3U1",
          commercial_relationship:"reader_supported_affiliate_disclosed"
        }),
        fact("mouse-razer-viper-v3-pro",5,"https://prosettings.net/guides/apex-legends-mouse/","shape","ProSettings describes the Viper V3 Pro shape as broadly accommodating; this is reviewer opinion, not personal-fit proof.","broad_fit_claim",null,{
          evidence_type:"subjective", source_type:"specialist_review", source_id:"prosettings-apex-mouse-2026-10",
          source_origin_id:"prosettings-apex-mouse-2026-10", methodology_family:"specialist_editorial", independent:true,
          stance:"positive", effect:"strength", game_id:"apex", time_window:"2026-10", sample_size:87,
          commercial_relationship:"affiliate_links_disclosed", publisher_group:"prosettings", product_variant_id:"RZ01-05120100-R3U1"
        }),
        fact("mouse-razer-viper-v3-pro",6,"https://prosettings.net/guides/apex-legends-mouse/","pro_adoption","The October 2026 ProSettings snapshot lists 6 of 87 tracked Apex players using this model.",6,"players",{
          evidence_type:"adoption", source_type:"esports_database", source_id:"prosettings-apex-mouse-2026-10",
          source_origin_id:"prosettings-apex-mouse-2026-10", methodology_family:"prosettings_observed_roster_snapshot", independent:true,
          game_id:"apex", input_method:"mnk", time_window:"2026-10", sample_size:87, commercial_relationship:"affiliate_links_disclosed", publisher_group:"prosettings", product_variant_id:"RZ01-05120100-R3U1"
        }),
        fact("mouse-razer-viper-v3-pro",7,"https://www.techradar.com/computing/peripherals-accessories/mice/razer-viper-v3-pro-review","review_scope","TechRadar reports a positive specialist assessment of the Viper V3 Pro; it is not treated as proof of individual fit.","positive_specialist_assessment",null,{ evidence_type:"subjective", source_type:"specialist_review", source_id:"techradar-viper-v3-pro", source_origin_id:"techradar-viper-v3-pro", methodology_family:"specialist_editorial", independent:true, stance:"positive", effect:"strength", commercial_relationship:"affiliate_links_disclosed", publisher_group:"future_plc", rights_status:"manual_terms_review", product_variant_id:"RZ01-05120100-R3U1" }),
        fact("mouse-razer-viper-v3-pro",8,"https://insider.razer.com/razer-support-45/viper-v3-pro-sensor-issues-77336","sensor_issue_signal","Multiple community replies report a sensor-tracking symptom; prevalence and root cause are not established.","recurring_unquantified_signal",null,{ evidence_type:"issue", source_type:"community", source_id:"razer-community-viper-v3-sensor", source_origin_id:"razer-community-viper-v3-sensor", methodology_family:"community_issue_cluster", independent:true, effect:"concern", long_term:true, commercial_relationship:"none", rights_status:"manual_terms_review", product_variant_id:"RZ01-05120100-R3U1" }),
        fact("mouse-razer-viper-v3-pro",9,"https://www.razer.com/gaming-mice/razer-viper-v3-pro/RZ01-05120100-R3U1","current_price","Razer US listed the black SKU in stock at USD 129.99 on the checked date.",129.99,"usd",{ evidence_type:"price", source_type:"official", source_id:"razer-viper-v3-pro-us-listing", source_origin_id:"razer-viper-v3-pro-us-listing", methodology_family:"official_listing_snapshot", claim_scope:"lifecycle", product_variant_id:"RZ01-05120100-R3U1" }),
        fact("mouse-razer-viper-v3-pro",10,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","length","Razer lists 127.1 mm length for the black Viper V3 Pro.",127.1,"mm",{variant:"black",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",11,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","width","Razer lists 63.9 mm width for the black Viper V3 Pro.",63.9,"mm",{variant:"black",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",12,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","height","Razer lists 39.9 mm height for the black Viper V3 Pro.",39.9,"mm",{variant:"black",product_variant_id:"RZ01-05120100-R3U1"}),
        fact("mouse-razer-viper-v3-pro",13,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","polling_rate","Razer lists up to 8000 Hz HyperPolling for the Viper V3 Pro.",8000,"hz",{variant:"black",product_variant_id:"RZ01-05120100-R3U1"})
      ]
    },
    {
      product_id:"mouse-logitech-pro-x3-superstrike", product_name:"Logitech G PRO X3 SUPERSTRIKE", category:"mouse",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[
        fact("mouse-logitech-pro-x3-superstrike",1,"https://www.logitechg.com/en-us/shop/p/pro-x3-superstrike-mouse","weight","Logitech lists a 59 g mouse weight.",59,"g"),
        fact("mouse-logitech-pro-x3-superstrike",2,"https://www.logitechg.com/en-us/shop/p/pro-x3-superstrike-mouse","polling_rate","Logitech lists a maximum 8 kHz report rate.",8000,"hz"),
        fact("mouse-logitech-pro-x3-superstrike",3,"https://prosettings.net/reviews/logitech-g-pro-x3-superstrike/","feet_feedback","A specialist review of a supplied unit reports scratchy-feeling feet; this is a single-unit subjective concern.","single_review_concern",null,{ evidence_type:"subjective", source_type:"specialist_review", source_id:"prosettings-pro-x3-review", source_origin_id:"prosettings-pro-x3-review", methodology_family:"specialist_editorial", independent:true, stance:"concern", effect:"concern", commercial_relationship:"affiliate_links_disclosed" })
      ]
    },
    {
      product_id:"mouse-logitech-g305", product_name:"Logitech G305 LIGHTSPEED", category:"mouse",
      fixture_role:"legacy", lifecycle_state:"mature",
      evidence:[
        fact("mouse-logitech-g305",1,"https://www.logitechg.com/en-us/products/gaming-mice/g305-lightspeed-wireless-gaming-mouse.html","weight","Logitech lists a 99 g product weight.",99,"g"),
        fact("mouse-logitech-g305",2,"https://www.logitechg.com/en-us/products/gaming-mice/g305-lightspeed-wireless-gaming-mouse.html","polling_rate","Logitech lists a 1000 Hz wireless report rate.",1000,"hz")
      ]
    },

    {
      product_id:"keyboard-wooting-60he-plus", product_name:"Wooting 60HE+", category:"keyboard",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[
        fact("keyboard-wooting-60he-plus",1,"https://wooting.io/quickstart/keyboard/wooting-60he/prebuilt","rapid_trigger","Wooting states that the default gaming profile has Rapid Trigger enabled.",true,null,{variant:"60HE+"}),
        fact("keyboard-wooting-60he-plus",2,"https://help.wooting.io/article/151-wooting-60he-vs-two-he","layout","Wooting lists the 60HE layout as 60 percent.","60_percent",null,{variant:"60HE family"})
      ]
    },
    {
      product_id:"keyboard-wooting-80he", product_name:"Wooting 80HE", category:"keyboard",
      fixture_role:"legacy", lifecycle_state:"transitioning",
      evidence:[
        fact("keyboard-wooting-80he",1,"https://wooting.io/wooting-80he","product_identity","Wooting maintains an official product page for the 80HE.","wooting_80he",null,{variant:"80HE"}),
        fact("keyboard-wooting-80he",2,"https://www.rtings.com/keyboard/reviews/wooting/80he","latency","RTINGS reports exceptionally low and consistent latency under keyboard methodology 1.4.3.","exceptionally_low_under_rtings_v1_4_3",null,{
          evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-keyboard-wooting-80he",
          source_origin_id:"rtings-keyboard-wooting-80he", methodology_family:"rtings_keyboard_v1_4_3", independent:true,
          commercial_relationship:"reader_supported_affiliate_disclosed"
        }),
        fact("keyboard-wooting-80he",3,"https://help.wooting.io/article/333-my-80he-flashes-or-disconnects-when-i-type","connection_issue","Wooting support identifies a loose internal JST connection as one possible cause of disconnects or missed input.","documented_troubleshooting_cause",null,{ evidence_type:"issue", source_type:"official_support", source_id:"wooting-80he-jst-support", source_origin_id:"wooting-80he-jst-support", methodology_family:"official_support", effect:"concern" })
      ]
    },
    {
      product_id:"keyboard-keychron-k2-he", product_name:"Keychron K2 HE", category:"keyboard",
      fixture_role:"value", lifecycle_state:"available",
      evidence:[fact("keyboard-keychron-k2-he",1,"https://www.keychron.com/products/keychron-k2-he-wireless-magnetic-switch-keyboard","product_identity","Keychron lists the K2 HE magnetic-switch keyboard.","keychron_k2_he")]
    },
    {
      product_id:"keyboard-steelseries-apex-pro-mini-gen3", product_name:"SteelSeries Apex Pro Mini Gen 3", category:"keyboard",
      fixture_role:"hidden_gem_candidate", lifecycle_state:"available",
      evidence:[fact("keyboard-steelseries-apex-pro-mini-gen3",1,"https://support.steelseries.com/hc/en-us/articles/37472171800077-Apex-Pro-Mini-Gen-3-Manual-and-Product-Information-Guide","product_identity","SteelSeries publishes a product information guide for Apex Pro Mini Gen 3.","steelseries_apex_pro_mini_gen3")]
    },
    {
      product_id:"keyboard-razer-huntsman-v3-pro-mini-8khz", product_name:"Razer Huntsman V3 Pro Mini 8KHz", category:"keyboard",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[
        fact("keyboard-razer-huntsman-v3-pro-mini-8khz",1,"https://www.razer.com/gaming-keyboards/razer-huntsman-v3-pro-mini-8khz","rapid_trigger","Razer lists Rapid Trigger support.",true),
        fact("keyboard-razer-huntsman-v3-pro-mini-8khz",2,"https://www.razer.com/gaming-keyboards/razer-huntsman-v3-pro-mini-8khz","actuation","Razer lists an adjustable actuation range beginning at 0.1 mm.",0.1,"mm"),
        fact("keyboard-razer-huntsman-v3-pro-mini-8khz",3,"https://www.razer.com/gaming-keyboards/razer-huntsman-v3-pro-mini-8khz","polling_rate","Razer lists 8000 Hz HyperPolling.",8000,"hz"),
        fact("keyboard-razer-huntsman-v3-pro-mini-8khz",4,"https://www.razer.com/gaming-keyboards/razer-huntsman-v3-pro-mini-8khz","layout","Razer lists the Mini model as a 60 percent form factor.","60_percent")
      ]
    },
    {
      product_id:"keyboard-wooting-80he-plus", product_name:"Wooting 80HE+", category:"keyboard",
      fixture_role:"new_low_evidence", lifecycle_state:"preorder",
      evidence:[fact("keyboard-wooting-80he-plus",1,"https://wooting.io/post/where-did-the-wooting-80he-go","product_identity","Wooting announced 80HE+ preorders and a transition away from most 80HE variants.","wooting_80he_plus",null,{variant:"80HE+"})]
    },

    {
      product_id:"monitor-zowie-xl2566x-plus", product_name:"ZOWIE XL2566X+", category:"monitor",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[
        fact("monitor-zowie-xl2566x-plus",1,"https://zowie.benq.com/en-us/monitor/xl2566x-plus.html","refresh_rate","ZOWIE lists a 400 Hz refresh rate.",400,"hz"),
        fact("monitor-zowie-xl2566x-plus",2,"https://zowie.benq.com/en-us/monitor/xl2566x-plus.html","panel","ZOWIE lists a Fast TN panel.","fast_tn")
      ]
    },
    {
      product_id:"monitor-zowie-xl2586x-plus", product_name:"ZOWIE XL2586X+", category:"monitor",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[
        fact("monitor-zowie-xl2586x-plus",1,"https://zowie.benq.com/en-us/monitor/xl2586x-plus.html","refresh_rate","ZOWIE lists a 600 Hz refresh rate.",600,"hz"),
        fact("monitor-zowie-xl2586x-plus",2,"https://zowie.benq.com/en-us/monitor/xl2586x-plus.html","panel","ZOWIE lists a Fast TN panel.","fast_tn")
      ]
    },
    {
      product_id:"monitor-alienware-aw2523hf", product_name:"Alienware AW2523HF", category:"monitor",
      fixture_role:"value", lifecycle_state:"unavailable_us",
      evidence:[
        fact("monitor-alienware-aw2523hf",1,"https://www.dell.com/en-us/shop/alienware-25-gaming-monitor-aw2523hf/apd/210-bfed/monitors-monitor-accessories","refresh_rate","Dell lists 1920 x 1080 at 360 Hz.",360,"hz"),
        fact("monitor-alienware-aw2523hf",2,"https://www.dell.com/en-us/shop/alienware-25-gaming-monitor-aw2523hf/apd/210-bfed/monitors-monitor-accessories","panel","Dell lists a Fast IPS panel.","fast_ips")
      ]
    },
    {
      product_id:"monitor-asus-pg27aqdp", product_name:"ASUS ROG Swift OLED PG27AQDP", category:"monitor",
      fixture_role:"hidden_gem_candidate", lifecycle_state:"available",
      evidence:[
        fact("monitor-asus-pg27aqdp",1,"https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdp/","refresh_rate","ASUS lists a native 480 Hz refresh rate.",480,"hz"),
        fact("monitor-asus-pg27aqdp",2,"https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdp/","panel","ASUS lists a WOLED panel.","woled"),
        fact("monitor-asus-pg27aqdp",3,"https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdp/","resolution","ASUS lists 2560 x 1440 resolution.","2560x1440")
      ]
    },
    {
      product_id:"monitor-sony-inzone-m10s-ii", product_name:"Sony INZONE M10S II", category:"monitor",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[
        fact("monitor-sony-inzone-m10s-ii",1,"https://www.sony.com/electronics/support/televisions-projectors-monitors/sdm-27q102/specifications","panel","Sony lists an OLED panel.","oled"),
        fact("monitor-sony-inzone-m10s-ii",2,"https://www.sony.com/electronics/support/televisions-projectors-monitors/sdm-27q102/specifications","resolution","Sony lists 2560 x 1440 native resolution.","2560x1440"),
        fact("monitor-sony-inzone-m10s-ii",3,"https://www.sony.com/electronics/support/televisions-projectors-monitors/sdm-27q102/specifications","refresh_rate","Sony lists up to 540 Hz at native resolution over DisplayPort.",540,"hz",{variant:"2560x1440 DisplayPort"}),
        fact("monitor-sony-inzone-m10s-ii",4,"https://www.tomshardware.com/monitors/gaming-monitors/sony-inzone-m10s-ii-27-inch-540-hz-qhd-oled-gaming-monitor-review/2","response_measurement","Tom's Hardware reports method-specific response and total-latency measurements; values are not remapped to panel response time.","measured_toms_monitor_method",null,{ evidence_type:"measurement", source_type:"independent_lab", source_id:"toms-inzone-m10s2", source_origin_id:"toms-inzone-m10s2", methodology_family:"toms_monitor_test", independent:true, commercial_relationship:"affiliate_links_disclosed" })
      ]
    },
    {
      product_id:"monitor-zowie-xl2546k", product_name:"ZOWIE XL2546K", category:"monitor",
      fixture_role:"legacy", lifecycle_state:"mature",
      evidence:[fact("monitor-zowie-xl2546k",1,"https://zowie.benq.com/en-us/monitor/xl2546k.html","product_identity","ZOWIE maintains an official XL2546K product page.","zowie_xl2546k")]
    },

    {
      product_id:"mousepad-artisan-zero", product_name:"ARTISAN NINJA FX ZERO", category:"mousepad",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[
        fact("mousepad-artisan-zero",1,"https://artisan-jp.com/global/products/ninja-fx/fx-zero","surface_speed","ARTISAN groups ZERO as a low-speed surface.","low",null,{methodology_family:"manufacturer_positioning"}),
        fact("mousepad-artisan-zero",2,"https://artisan-jp.com/global/products/ninja-fx/fx-zero","stopping_power","ARTISAN describes ZERO as having high stopping power.","high",null,{methodology_family:"manufacturer_positioning"}),
        fact("mousepad-artisan-zero",3,"https://www.reddit.com/r/MousepadReview/comments/plh4ed","humidity_resistance","Several self-reports in this thread describe stable feel in humid conditions; reports are anecdotal.","humidity_resistant_report",null,{
          evidence_type:"subjective", source_type:"community", source_id:"reddit-mousepadreview-plh4ed",
          source_origin_id:"reddit-mousepadreview-plh4ed", methodology_family:"community_self_report", independent:true,
          stance:"humidity_resistant", effect:"strength", commercial_relationship:"none"
        }),
        fact("mousepad-artisan-zero",4,"https://www.reddit.com/r/MousepadReview/comments/ifpp8q","humidity_resistance","This thread contains opposing self-reports, including users who notice humidity-related feel changes.","humidity_affected_report",null,{
          evidence_type:"subjective", source_type:"community", source_id:"reddit-mousepadreview-ifpp8q",
          source_origin_id:"reddit-mousepadreview-ifpp8q", methodology_family:"community_self_report", independent:true,
          stance:"humidity_affected", effect:"concern", commercial_relationship:"none"
        })
      ]
    },
    {
      product_id:"mousepad-steelseries-qck-performance-control", product_name:"SteelSeries QcK Performance Control", category:"mousepad",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[fact("mousepad-steelseries-qck-performance-control",1,"https://steelseries.com/gaming-mousepads","surface_speed","SteelSeries identifies this variant as Control.","control",null,{variant:"Control",methodology_family:"manufacturer_positioning"})]
    },
    {
      product_id:"mousepad-logitech-g640", product_name:"Logitech G640", category:"mousepad",
      fixture_role:"value", lifecycle_state:"available",
      evidence:[
        fact("mousepad-logitech-g640",1,"https://www.logitechg.com/en-us/shop/p/g640-cloth-gaming-mouse-pad.943-000088","size","Logitech lists a 400 x 460 mm surface.","400x460_mm"),
        fact("mousepad-logitech-g640",2,"https://www.logitechg.com/en-us/shop/p/g640-cloth-gaming-mouse-pad.943-000088","surface_speed","Logitech describes moderate surface friction.","moderate",null,{methodology_family:"manufacturer_positioning"})
      ]
    },
    {
      product_id:"mousepad-artisan-hien", product_name:"ARTISAN NINJA FX HIEN", category:"mousepad",
      fixture_role:"hidden_gem_candidate", lifecycle_state:"available",
      evidence:[fact("mousepad-artisan-hien",1,"https://artisan-jp.com/global/selection-guide/","surface_speed","ARTISAN groups HIEN as a medium-speed surface.","medium",null,{methodology_family:"manufacturer_positioning"})]
    },
    {
      product_id:"mousepad-razer-atlas-pro", product_name:"Razer Atlas Pro", category:"mousepad",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[
        fact("mousepad-razer-atlas-pro",1,"https://www.razer.com/pc/gaming-mouse-mats/atlas-line","surface","Razer lists a tempered-glass surface.","tempered_glass"),
        fact("mousepad-razer-atlas-pro",2,"https://www.razer.com/pc/gaming-mouse-mats/atlas-line","thickness","Razer lists 1.9 mm thickness.",1.9,"mm")
      ]
    },
    {
      product_id:"mousepad-steelseries-qck-heavy", product_name:"SteelSeries QcK Heavy", category:"mousepad",
      fixture_role:"legacy", lifecycle_state:"mature",
      evidence:[fact("mousepad-steelseries-qck-heavy",1,"https://steelseries.com/gaming-mousepads/qck-heavy","base_thickness","SteelSeries lists a 6 mm base for the Large variant.",6,"mm",{variant:"Large"})]
    },

    {
      product_id:"audio-logitech-pro-x2", product_name:"Logitech G PRO X 2 LIGHTSPEED", category:"audio",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[fact("audio-logitech-pro-x2",1,"https://www.logitechg.com/en-us/shop/p/pro-x-2-wireless-headset","product_identity","Logitech lists LIGHTSPEED, Bluetooth, and 3.5 mm connection options.","logitech_pro_x2_lightspeed")]
    },
    {
      product_id:"audio-audeze-maxwell-2", product_name:"Audeze Maxwell 2", category:"audio",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[
        fact("audio-audeze-maxwell-2",1,"https://www.audeze.com/products/maxwell-2-wireless-gaming-headset","weight","Audeze lists a 560 g weight.",560,"g"),
        fact("audio-audeze-maxwell-2",2,"https://www.audeze.com/products/maxwell-2-wireless-gaming-headset","product_identity","Audeze lists 90 mm planar magnetic drivers and low-latency wireless.","audeze_maxwell_2"),
        fact("audio-audeze-maxwell-2",3,"https://www.rtings.com/headphones/reviews/audeze/maxwell-2","fit_variation","RTINGS tested the Xbox variant under methodology 2.3 and reports fit/seal sensitivity; this is not transferred to other variants.","xbox_variant_fit_sensitive",null,{ evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-maxwell-2-xbox", source_origin_id:"rtings-maxwell-2-xbox", methodology_family:"rtings_headphones_v2_3", independent:true, commercial_relationship:"reader_supported_affiliate_disclosed", variant:"Xbox" })
      ]
    },
    {
      product_id:"audio-hyperx-cloud-iii", product_name:"HyperX Cloud III", category:"audio",
      fixture_role:"value", lifecycle_state:"available",
      evidence:[
        fact("audio-hyperx-cloud-iii",1,"https://hyperx.com/products/hyperx-cloud-iii-wired-gaming-headset","fit","HyperX lists an over-ear circumaural closed-back form.","over_ear_closed_back"),
        fact("audio-hyperx-cloud-iii",2,"https://hyperx.com/products/hyperx-cloud-iii-wired-gaming-headset","product_identity","HyperX lists USB-C, USB-A, and 3.5 mm compatibility.","hyperx_cloud_iii_wired")
      ]
    },
    {
      product_id:"audio-sennheiser-hd560s", product_name:"Sennheiser HD 560S", category:"audio",
      fixture_role:"hidden_gem_candidate", lifecycle_state:"mature",
      evidence:[
        fact("audio-sennheiser-hd560s",1,"https://support.sennheiser-hearing.com/hc/en-at/articles/38271134258077-HD-560S-Specifications","weight","Sennheiser lists a 280 g weight.",280,"g",{locale:"en-AT"}),
        fact("audio-sennheiser-hd560s",2,"https://support.sennheiser-hearing.com/hc/en-at/articles/38271134258077-HD-560S-Specifications","fit","Sennheiser lists an over-ear open dynamic design.","over_ear_open_back",null,{locale:"en-AT"})
      ]
    },
    {
      product_id:"audio-audeze-maxwell-2-anc", product_name:"Audeze Maxwell 2 ANC", category:"audio",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[fact("audio-audeze-maxwell-2-anc",1,"https://www.audeze.com/products/maxwell-2-anc-wireless-gaming-headset","product_identity","Audeze lists Maxwell 2 ANC as a current professional wireless gaming headset.","audeze_maxwell_2_anc")]
    },
    {
      product_id:"audio-audeze-maxwell", product_name:"Audeze Maxwell", category:"audio",
      fixture_role:"legacy", lifecycle_state:"legacy",
      evidence:[fact("audio-audeze-maxwell",1,"https://www.audeze.com/products/maxwell","product_identity","Audeze marks the original Maxwell as a legacy product no longer available for sale.","audeze_maxwell_legacy")]
    },

    {
      product_id:"controller-xbox-wireless", product_name:"Xbox Wireless Controller", category:"controller",
      fixture_role:"staple", lifecycle_state:"available", compatibility_profile:{ platforms:["xbox_series","windows_pc","ios","android"], connections:["xbox_wireless","bluetooth","usb_c"] },
      evidence:[
        fact("controller-xbox-wireless",1,"https://www.xbox.com/en-US/accessories/controllers/xbox-wireless-controller","layout","Microsoft shows the Xbox asymmetric stick layout.","asymmetric"),
        fact("controller-xbox-wireless",2,"https://www.xbox.com/en-US/accessories/controllers/xbox-wireless-controller","connections","Microsoft lists Xbox Wireless, Bluetooth, and USB-C connection paths.",["xbox_wireless","bluetooth","usb_c"]),
        fact("controller-xbox-wireless",3,"https://www.xbox.com/en-US/accessories/controllers/xbox-wireless-controller","platforms","Microsoft lists Xbox, Windows 10/11, iOS, and Android compatibility.",["xbox_series","windows_pc","ios","android"])
      ]
    },
    {
      product_id:"controller-dualsense-edge", product_name:"DualSense Edge", category:"controller",
      fixture_role:"current_flagship", lifecycle_state:"available", compatibility_profile:{ platforms:["ps5","windows_pc"], connections:["usb_c","bluetooth"] },
      evidence:[
        fact("controller-dualsense-edge",1,"https://direct.playstation.com/en-us/buy-accessories/dualsense-edge-wireless-controller","layout","Sony shows the PlayStation symmetrical stick layout.","symmetrical"),
        fact("controller-dualsense-edge",2,"https://direct.playstation.com/en-us/buy-accessories/dualsense-edge-wireless-controller","replaceable_stick_modules","Sony lists replaceable stick modules.",true),
        fact("controller-dualsense-edge",3,"https://direct.playstation.com/en-us/buy-accessories/dualsense-edge-wireless-controller","rear_controls","Sony lists configurable back buttons.",true),
        fact("controller-dualsense-edge",4,"https://www.playstation.com/en-us/support/hardware/dualsense-edge-other-devices/","platforms","Sony documents DualSense Edge use with PS5 and supported Windows PCs.",["ps5","windows_pc"],null,{source_type:"official_support",methodology_family:"official_support"}),
        fact("controller-dualsense-edge",5,"https://www.playstation.com/en-us/support/hardware/dualsense-edge-other-devices/","connections","Sony documents USB and Bluetooth connection paths for supported devices.",["usb_c","bluetooth"],null,{source_type:"official_support",methodology_family:"official_support"})
      ]
    },
    {
      product_id:"controller-8bitdo-ultimate-2c-wired", product_name:"8BitDo Ultimate 2C Wired", category:"controller",
      fixture_role:"value", lifecycle_state:"available", compatibility_profile:{ platforms:["windows_pc","android"], connections:["usb"] },
      evidence:[
        fact("controller-8bitdo-ultimate-2c-wired",1,"https://www.8bitdo.com/ultimate-2c-wired-controller/","stick_type","8BitDo lists Hall Effect joysticks.","hall_effect"),
        fact("controller-8bitdo-ultimate-2c-wired",2,"https://www.8bitdo.com/ultimate-2c-wired-controller/","polling_rate","8BitDo lists a 1000 Hz polling rate on Windows.",1000,"hz",{variant:"Windows"}),
        fact("controller-8bitdo-ultimate-2c-wired",3,"https://www.8bitdo.com/ultimate-2c-wired-controller/","platforms","8BitDo lists Windows and Android compatibility.",["windows_pc","android"]),
        fact("controller-8bitdo-ultimate-2c-wired",4,"https://www.8bitdo.com/ultimate-2c-wired-controller/","connections","8BitDo identifies this exact model as wired USB.",["usb"])
      ]
    },
    {
      product_id:"controller-xbox-elite-series-2", product_name:"Xbox Elite Wireless Controller Series 2", category:"controller",
      fixture_role:"niche", lifecycle_state:"available", compatibility_profile:{ platforms:["xbox_series","windows_pc"], connections:["xbox_wireless","bluetooth","usb_c"] },
      evidence:[
        fact("controller-xbox-elite-series-2",1,"https://www.xbox.com/en-US/accessories/controllers/elite-wireless-controller-series-2","weight","Microsoft lists 345 g with a plus or minus 15 g tolerance when using the thumbstick and paddles shown.",345,"g",{variant:"with listed attachments"}),
        fact("controller-xbox-elite-series-2",2,"https://www.xbox.com/en-US/accessories/controllers/elite-wireless-controller-series-2","rear_controls","Microsoft lists interchangeable paddles.",true),
        fact("controller-xbox-elite-series-2",3,"https://www.xbox.com/en-US/accessories/controllers/elite-wireless-controller-series-2","platforms","Microsoft lists Xbox Series and Windows PC compatibility.",["xbox_series","windows_pc"]),
        fact("controller-xbox-elite-series-2",4,"https://www.xbox.com/en-US/accessories/controllers/elite-wireless-controller-series-2","connections","Microsoft lists Xbox Wireless, Bluetooth, and USB-C connection paths.",["xbox_wireless","bluetooth","usb_c"])
      ]
    },
    {
      product_id:"controller-razer-wolverine-v3-pro-8k", product_name:"Razer Wolverine V3 Pro 8K PC", category:"controller",
      fixture_role:"new_low_evidence", lifecycle_state:"available", compatibility_profile:{ platforms:["windows_pc"], connections:["usb","wireless_dongle"] },
      evidence:[
        fact("controller-razer-wolverine-v3-pro-8k",1,"https://www.razer.com/gaming-controllers/razer-wolverine-v3-pro-8k-pc","polling_rate","Razer lists up to 8000 Hz wired and wireless polling for the PC model.",8000,"hz",{variant:"PC"}),
        fact("controller-razer-wolverine-v3-pro-8k",2,"https://www.razer.com/gaming-controllers/razer-wolverine-v3-pro-8k-pc","stick_type","Razer lists TMR thumbsticks.","tmr",null,{variant:"PC"}),
        fact("controller-razer-wolverine-v3-pro-8k",3,"https://www.razer.com/gaming-controllers/razer-wolverine-v3-pro-8k-pc","platforms","Razer identifies this exact variant as the PC model.",["windows_pc"],null,{variant:"PC"}),
        fact("controller-razer-wolverine-v3-pro-8k",4,"https://www.razer.com/gaming-controllers/razer-wolverine-v3-pro-8k-pc","connections","Razer lists wired USB and wireless dongle operation for the PC model.",["usb","wireless_dongle"],null,{variant:"PC"})
      ]
    },
    {
      product_id:"controller-xbox-360-wireless", product_name:"Xbox 360 Wireless Controller", category:"controller",
      fixture_role:"legacy", lifecycle_state:"legacy", compatibility_profile:{ platforms:["xbox_360"], connections:["xbox_360_wireless"] },
      evidence:[
        fact("controller-xbox-360-wireless",1,"https://mktplassets.xbox.com/NR/rdonlyres/A7D7FE0E-FCD4-4E75-9942-303699D05246/0/emeacontrollerwirelessEnFrEs.pdf","platforms","The Microsoft manual identifies this controller for the Xbox 360 system.",["xbox_360"],null,{source_type:"official_manual",methodology_family:"official_manual"}),
        fact("controller-xbox-360-wireless",2,"https://mktplassets.xbox.com/NR/rdonlyres/A7D7FE0E-FCD4-4E75-9942-303699D05246/0/emeacontrollerwirelessEnFrEs.pdf","connections","The Microsoft manual documents the Xbox 360 wireless connection.",["xbox_360_wireless"],null,{source_type:"official_manual",methodology_family:"official_manual"})
      ]
    },

    {
      product_id:"network-asus-rt-ax86u-pro", product_name:"ASUS RT-AX86U Pro", category:"network",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[
        fact("network-asus-rt-ax86u-pro",1,"https://www.asus.com/us/networking-iot-servers/wifi-routers/asus-wifi-routers/rt-ax86u-pro/","wifi_generation","ASUS lists Wi-Fi 6.","wifi_6"),
        fact("network-asus-rt-ax86u-pro",2,"https://www.asus.com/us/networking-iot-servers/wifi-routers/asus-wifi-routers/rt-ax86u-pro/","bands","ASUS lists 2.4 GHz and 5 GHz bands.",["2.4ghz","5ghz"]),
        fact("network-asus-rt-ax86u-pro",3,"https://www.asus.com/us/networking-iot-servers/wifi-routers/asus-wifi-routers/rt-ax86u-pro/","wired_lan_speed","ASUS lists a configurable 2.5 Gb Ethernet port and four 1 Gb LAN ports.",2.5,"gbps"),
        fact("network-asus-rt-ax86u-pro",4,"https://www.asus.com/us/networking-iot-servers/wifi-routers/asus-wifi-routers/rt-ax86u-pro/","mesh","ASUS lists AiMesh support.",true)
      ]
    },
    {
      product_id:"network-asus-gt-be98-pro", product_name:"ASUS ROG Rapture GT-BE98 Pro", category:"network",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[
        fact("network-asus-gt-be98-pro",1,"https://rog.asus.com/us/networking/rog-rapture-gt-be98-pro/spec/","wifi_generation","ASUS lists Wi-Fi 7.","wifi_7"),
        fact("network-asus-gt-be98-pro",2,"https://rog.asus.com/us/networking/rog-rapture-gt-be98-pro/spec/","bands","ASUS lists 2.4 GHz, 5 GHz, and 6 GHz radios.",["2.4ghz","5ghz","6ghz"]),
        fact("network-asus-gt-be98-pro",3,"https://rog.asus.com/us/networking/rog-rapture-gt-be98-pro/spec/","wired_lan_speed","ASUS lists 10 Gb and 2.5 Gb Ethernet interfaces.",10,"gbps"),
        fact("network-asus-gt-be98-pro",4,"https://rog.asus.com/us/networking/rog-rapture-gt-be98-pro/spec/","mesh","ASUS lists AiMesh support.",true)
      ]
    },
    {
      product_id:"network-tplink-archer-be550", product_name:"TP-Link Archer BE550", category:"network",
      fixture_role:"value", lifecycle_state:"available",
      evidence:[
        fact("network-tplink-archer-be550",1,"https://www.tp-link.com/us/home-networking/wifi-router/archer-be550/","wifi_generation","TP-Link lists Wi-Fi 7.","wifi_7"),
        fact("network-tplink-archer-be550",2,"https://www.tp-link.com/us/home-networking/wifi-router/archer-be550/","bands","TP-Link lists 2.4 GHz, 5 GHz, and 6 GHz bands.",["2.4ghz","5ghz","6ghz"]),
        fact("network-tplink-archer-be550",3,"https://www.tp-link.com/us/home-networking/wifi-router/archer-be550/","wired_wan_speed","TP-Link lists one 2.5 Gb WAN port.",2.5,"gbps"),
        fact("network-tplink-archer-be550",4,"https://www.tp-link.com/us/home-networking/wifi-router/archer-be550/","wired_lan_speed","TP-Link lists four 2.5 Gb LAN ports.",2.5,"gbps")
      ]
    },
    {
      product_id:"network-glinet-flint-2", product_name:"GL.iNet Flint 2", category:"network",
      fixture_role:"niche", lifecycle_state:"available",
      evidence:[
        fact("network-glinet-flint-2",1,"https://docs.gl-inet.com/router/en/4/user_guide/gl-mt6000/","wifi_generation","GL.iNet documents Flint 2 as a Wi-Fi 6 router.","wifi_6",null,{source_type:"official_documentation",methodology_family:"official_documentation"}),
        fact("network-glinet-flint-2",2,"https://docs.gl-inet.com/router/en/4/user_guide/gl-mt6000/","multi_wan","GL.iNet documents multi-WAN, failover, and load balancing.",true,null,{source_type:"official_documentation",methodology_family:"official_documentation"})
      ]
    },
    {
      product_id:"network-eero-7", product_name:"eero 7", category:"network",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[
        fact("network-eero-7",1,"https://eero.com/support/articles/eero-7","wifi_generation","eero lists Wi-Fi 7.","wifi_7",null,{source_type:"official_support",methodology_family:"official_support"}),
        fact("network-eero-7",2,"https://eero.com/support/articles/eero-7","bands","eero lists 2.4 GHz and 5 GHz radios for eero 7.",["2.4ghz","5ghz"],null,{source_type:"official_support",methodology_family:"official_support"}),
        fact("network-eero-7",3,"https://eero.com/support/articles/eero-7","wired_lan_speed","eero lists two auto-sensing 2.5 Gb Ethernet ports.",2.5,"gbps",{source_type:"official_support",methodology_family:"official_support"})
      ]
    },
    {
      product_id:"network-eero-original", product_name:"eero (original)", category:"network",
      fixture_role:"legacy", lifecycle_state:"legacy",
      evidence:[
        fact("network-eero-original",1,"https://prod.eero.com/legal/compliance?lang=en-gb","bands","The original eero compliance information lists dual-band 2.4 GHz and 5 GHz operation.",["2.4ghz","5ghz"],null,{source_type:"official_compliance",methodology_family:"official_compliance"}),
        fact("network-eero-original",2,"https://prod.eero.com/legal/compliance?lang=en-gb","wired_lan_speed","The original eero compliance information lists two gigabit WAN/LAN ports.",1,"gbps",{source_type:"official_compliance",methodology_family:"official_compliance"})
      ]
    },

    {
      product_id:"cable-belkin-av10175bt2mbkv2", product_name:"Belkin AV10175bt2MBKV2 Ultra High Speed HDMI Cable", category:"cable",
      fixture_role:"staple", lifecycle_state:"out_of_stock", variant_id:"AV10175bt2MBKV2", compatibility_profile:{ connector:"hdmi" },
      evidence:[
        fact("cable-belkin-av10175bt2mbkv2",1,"https://www.belkin.com/p/8k-ultra-high-speed-hdmi-2.1-cable/P-AV10175.html","connector","Belkin lists HDMI connectors for SKU AV10175bt2MBKV2.","hdmi",null,{variant:"AV10175bt2MBKV2"}),
        fact("cable-belkin-av10175bt2mbkv2",2,"https://www.belkin.com/p/8k-ultra-high-speed-hdmi-2.1-cable/P-AV10175.html","certified_bandwidth","Belkin lists the Ultra High Speed HDMI 48 Gbps class for SKU AV10175bt2MBKV2.",48,"gbps",{variant:"AV10175bt2MBKV2"}),
        fact("cable-belkin-av10175bt2mbkv2",3,"https://www.belkin.com/p/8k-ultra-high-speed-hdmi-2.1-cable/P-AV10175.html","certification","Belkin identifies Ultra High Speed HDMI certification for SKU AV10175bt2MBKV2.","ultra_high_speed_hdmi",null,{variant:"AV10175bt2MBKV2"}),
        fact("cable-belkin-av10175bt2mbkv2",4,"https://www.belkin.com/p/8k-ultra-high-speed-hdmi-2.1-cable/P-AV10175.html","length","Belkin lists SKU AV10175bt2MBKV2 as 2 m.",2,"m",{variant:"AV10175bt2MBKV2"})
      ]
    },
    {
      product_id:"cable-club3d-cac-1091", product_name:"Club 3D CAC-1091 DisplayPort DP80 Cable", category:"cable",
      fixture_role:"current_flagship", lifecycle_state:"available", variant_id:"CAC-1091-1.2M", compatibility_profile:{ connector:"displayport" },
      evidence:[
        fact("cable-club3d-cac-1091",1,"https://www.club-3d.com/shop/cac-1091-1217","connector","Club 3D lists DisplayPort connectors.","displayport"),
        fact("cable-club3d-cac-1091",2,"https://www.club-3d.com/shop/cac-1091-1217","certified_bandwidth","Club 3D lists VESA DP80 certification and 80 Gbps link capability.",80,"gbps"),
        fact("cable-club3d-cac-1091",3,"https://www.club-3d.com/shop/cac-1091-1217","length","Club 3D lists 1.2 m length.",1.2,"m"),
        fact("cable-club3d-cac-1091",4,"https://www.club-3d.com/shop/cac-1091-1217","certification","Club 3D lists VESA DP80 certification.","vesa_dp80")
      ]
    },
    {
      product_id:"cable-belkin-a3l980b05m-s-cat6", product_name:"Belkin A3L980B05M-S Cat6 UTP Patch Cable", category:"cable",
      fixture_role:"value", lifecycle_state:"available", variant_id:"A3L980B05M-S", compatibility_profile:{},
      evidence:[
        fact("cable-belkin-a3l980b05m-s-cat6",1,"https://s3.belkin.com/doc/docs/CE%20DoC%20A3L980.pdf","standard","Belkin's declaration identifies model A3L980B05M-S as UTP category 6; connector type is not inferred.","cat6",null,{source_type:"official_compliance",methodology_family:"official_compliance",variant:"A3L980B05M-S"}),
        fact("cable-belkin-a3l980b05m-s-cat6",2,"https://s3.belkin.com/doc/docs/CE%20DoC%20A3L980.pdf","length","Belkin's declaration identifies model A3L980B05M-S as the 5 m variant.",5,"m",{source_type:"official_compliance",methodology_family:"official_compliance",variant:"A3L980B05M-S"})
      ]
    },
    {
      product_id:"cable-cablematters-dp40", product_name:"Cable Matters DisplayPort DP40 Cable", category:"cable",
      fixture_role:"niche", lifecycle_state:"available", variant_scope:"family", compatibility_profile:{ connector:"displayport" },
      evidence:[
        fact("cable-cablematters-dp40",1,"https://www.cablematters.com/PC-1562-154-DISPLAYPORT-21-DP40-CABLE-8K-60HZ-PREIDE.ASPX","connector","Cable Matters lists DisplayPort connectors; exact selectable length is not fixed in this fixture.","displayport",null,{variant:"product family; length unset"}),
        fact("cable-cablematters-dp40",2,"https://www.cablematters.com/PC-1562-154-DISPLAYPORT-21-DP40-CABLE-8K-60HZ-PREIDE.ASPX","certified_bandwidth","Cable Matters lists VESA DP40 certification and 40 Gbps capability; exact selectable length is not fixed in this fixture.",40,"gbps",{variant:"product family; length unset"}),
        fact("cable-cablematters-dp40",3,"https://www.cablematters.com/PC-1562-154-DISPLAYPORT-21-DP40-CABLE-8K-60HZ-PREIDE.ASPX","certification","Cable Matters lists VESA DP40 certification; exact selectable length is not fixed in this fixture.","vesa_dp40",null,{variant:"product family; length unset"})
      ]
    },
    {
      product_id:"cable-comsol-usb408", product_name:"Comsol USB408 USB4 Cable", category:"cable",
      fixture_role:"new_low_evidence", lifecycle_state:"available", variant_id:"USB408-0.8M", compatibility_profile:{ connector:"usb_c" },
      evidence:[
        fact("cable-comsol-usb408",1,"https://www.usb.org/single-product/10816","connector","USB-IF lists a USB Type-C to Type-C cable.","usb_c",null,{source_type:"certification_registry",source_id:"usb-if-product-registry-10816",source_origin_id:"usb-if-product-registry",methodology_family:"usb_if_registry",commercial_relationship:"standards_registry"}),
        fact("cable-comsol-usb408",2,"https://www.usb.org/single-product/10816","certified_bandwidth","USB-IF lists USB 40 Gbps certification.",40,"gbps",{source_type:"certification_registry",source_id:"usb-if-product-registry-10816",source_origin_id:"usb-if-product-registry",methodology_family:"usb_if_registry",commercial_relationship:"standards_registry"}),
        fact("cable-comsol-usb408",3,"https://www.usb.org/single-product/10816","length","USB-IF lists 0.8 m.",0.8,"m",{source_type:"certification_registry",source_id:"usb-if-product-registry-10816",source_origin_id:"usb-if-product-registry",methodology_family:"usb_if_registry",commercial_relationship:"standards_registry"})
      ]
    },
    {
      product_id:"cable-belkin-premium-hdmi", product_name:"Belkin Premium High Speed HDMI Cable", category:"cable",
      fixture_role:"legacy", lifecycle_state:"legacy", variant_id:"AV10168bt2M-BLK", compatibility_profile:{ connector:"hdmi" },
      evidence:[
        fact("cable-belkin-premium-hdmi",1,"https://www.belkin.com/uk/p/ultrahd-hdmi-cable/AV10168bt2M-BLK.html","connector","Belkin lists HDMI connectors.","hdmi",null,{locale:"en-GB"}),
        fact("cable-belkin-premium-hdmi",2,"https://www.belkin.com/uk/p/ultrahd-hdmi-cable/AV10168bt2M-BLK.html","certified_bandwidth","Belkin lists Premium High Speed HDMI at 18 Gbps.",18,"gbps",{locale:"en-GB"}),
        fact("cable-belkin-premium-hdmi",3,"https://www.belkin.com/uk/p/ultrahd-hdmi-cable/AV10168bt2M-BLK.html","length","Belkin lists 2 m length.",2,"m",{locale:"en-GB"}),
        fact("cable-belkin-premium-hdmi",4,"https://www.belkin.com/uk/p/ultrahd-hdmi-cable/AV10168bt2M-BLK.html","certification","Belkin identifies Premium High Speed HDMI certification.","premium_high_speed_hdmi",null,{locale:"en-GB"})
      ]
    }
  ];

  const products = Object.freeze(definitions.map(product));
  const byCategory = Object.freeze(Object.fromEntries(
    [...new Set(products.map(item => item.category))].map(category => [category, Object.freeze(products.filter(item => item.category === category))])
  ));

  function validateFixtures() {
    const errors = [];
    for (const item of products) {
      if (!item.fixture_only) errors.push(item.product_id + ": fixture_only must be true");
      if (!item.evidence.length) errors.push(item.product_id + ": evidence is required");
      for (const record of item.evidence) {
        for (const error of evidence.validateFixtureEvidenceRecord(record)) errors.push(record.evidence_id + ": " + error);
      }
    }
    return errors;
  }

  return { CHECKED_DATE, RIGHTS_NOTE, products, byCategory, validateFixtures };
});
