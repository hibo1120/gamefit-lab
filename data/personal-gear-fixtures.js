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
      sample_size:options.sample_size || null
    });
  }

  function product(definition) {
    const records = Object.freeze(definition.evidence);
    const evidenceGrade = evidence.gradeFromEvidence(records,{ lifecycle_state:definition.lifecycle_state });
    const attributeNames = [...new Set(records.map(record => record.attribute).filter(attribute => attribute !== "product_identity"))];
    const attributeEvidence = evidence.buildAttributeAssessments(records, attributeNames,{
      lifecycle_state:definition.lifecycle_state, evidence_grade:evidenceGrade
    });
    const attributes = {};
    for (const record of records) {
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
      evidence_grade:evidenceGrade,
      fixture_only:true,
      attributes:Object.freeze(attributes),
      attribute_evidence:Object.freeze(attributeEvidence),
      evidence:records
    });
  }

  const definitions = [
    {
      product_id:"mouse-razer-viper-v4-pro", product_name:"Razer Viper V4 Pro", category:"mouse",
      fixture_role:"current_flagship", lifecycle_state:"available",
      evidence:[
        fact("mouse-razer-viper-v4-pro",1,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","weight","Razer lists 49 g for the black edition.",49,"g",{variant:"black"}),
        fact("mouse-razer-viper-v4-pro",2,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","polling_rate","Razer lists polling up to 8000 Hz.",8000,"hz"),
        fact("mouse-razer-viper-v4-pro",3,"https://www.razer.com/gaming-mice/razer-viper-v4-pro","shape","Razer describes a right-handed symmetrical shape.","right_handed_symmetrical")
      ]
    },
    {
      product_id:"mouse-logitech-pro-x2-superstrike", product_name:"Logitech G PRO X2 SUPERSTRIKE", category:"mouse",
      fixture_role:"staple", lifecycle_state:"available",
      evidence:[
        fact("mouse-logitech-pro-x2-superstrike",1,"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse","rapid_trigger","Logitech lists adjustable rapid-trigger reset points for the main buttons.",true),
        fact("mouse-logitech-pro-x2-superstrike",2,"https://www.logitechg.com/en-us/shop/p/pro-x2-superstrike-mouse","product_identity","Logitech lists PRO X2 SUPERSTRIKE as a LIGHTSPEED wireless gaming mouse.","logitech_pro_x2_superstrike")
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
      fixture_role:"hidden_gem_candidate", lifecycle_state:"available",
      evidence:[
        fact("mouse-razer-viper-v3-pro",1,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","weight","Razer lists 54 g for the black edition.",54,"g",{variant:"black"}),
        fact("mouse-razer-viper-v3-pro",2,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","hump","Razer describes a raised rear-shifted hump.","rear",null,{methodology_family:"manufacturer_positioning"}),
        fact("mouse-razer-viper-v3-pro",3,"https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs","shape","Razer describes a right-handed symmetrical form factor.","right_handed_symmetrical",null,{methodology_family:"manufacturer_positioning"}),
        fact("mouse-razer-viper-v3-pro",4,"https://www.rtings.com/mouse/reviews/razer/viper-v3-pro","click_latency","RTINGS' 2026 retest reports very low click latency under mouse methodology 1.5.2.","very_low_under_rtings_v1_5_2",null,{
          evidence_type:"measurement", source_type:"independent_lab", source_id:"rtings-mouse-viper-v3-pro",
          source_origin_id:"rtings-mouse-viper-v3-pro", methodology_family:"rtings_mouse_v1_5_2", independent:true,
          commercial_relationship:"reader_supported_affiliate_disclosed"
        }),
        fact("mouse-razer-viper-v3-pro",5,"https://prosettings.net/guides/apex-legends-mouse/","shape","ProSettings describes the Viper V3 Pro shape as broadly accommodating; this is reviewer opinion, not personal-fit proof.","broad_fit_claim",null,{
          evidence_type:"subjective", source_type:"specialist_review", source_id:"prosettings-apex-mouse-2026-10",
          source_origin_id:"prosettings-apex-mouse-2026-10", methodology_family:"specialist_editorial", independent:true,
          stance:"positive", effect:"strength", game_id:"apex", time_window:"2026-10", sample_size:87,
          commercial_relationship:"affiliate_links_disclosed"
        }),
        fact("mouse-razer-viper-v3-pro",6,"https://prosettings.net/guides/apex-legends-mouse/","pro_adoption","The October 2026 ProSettings snapshot lists 6 of 87 tracked Apex players using this model.",6,"players",{
          evidence_type:"adoption", source_type:"esports_database", source_id:"prosettings-apex-mouse-2026-10",
          source_origin_id:"prosettings-apex-mouse-2026-10", methodology_family:"prosettings_observed_roster_snapshot", independent:true,
          game_id:"apex", input_method:"mnk", time_window:"2026-10", sample_size:87, commercial_relationship:"affiliate_links_disclosed"
        })
      ]
    },
    {
      product_id:"mouse-logitech-pro-x3-superstrike", product_name:"Logitech G PRO X3 SUPERSTRIKE", category:"mouse",
      fixture_role:"new_low_evidence", lifecycle_state:"available",
      evidence:[
        fact("mouse-logitech-pro-x3-superstrike",1,"https://www.logitechg.com/en-us/shop/p/pro-x3-superstrike-mouse","weight","Logitech lists a 59 g mouse weight.",59,"g"),
        fact("mouse-logitech-pro-x3-superstrike",2,"https://www.logitechg.com/en-us/shop/p/pro-x3-superstrike-mouse","polling_rate","Logitech lists a maximum 8 kHz report rate.",8000,"hz")
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
        })
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
        fact("keyboard-razer-huntsman-v3-pro-mini-8khz",3,"https://www.razer.com/gaming-keyboards/razer-huntsman-v3-pro-mini-8khz","polling_rate","Razer lists 8000 Hz HyperPolling.",8000,"hz")
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
      evidence:[fact("monitor-sony-inzone-m10s-ii",1,"https://www.sony.com/electronics/support/televisions-projectors-monitors/sdm-27q102/specifications","product_identity","Sony publishes specifications for the INZONE M10S II; this pilot intentionally withholds recommendation attributes until independent lab evidence is recorded.","sony_inzone_m10s_ii")]
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
      evidence:[fact("mousepad-razer-atlas-pro",1,"https://www.razer.com/pc/gaming-mouse-mats/atlas-line","product_identity","Razer lists Atlas Pro as a new glass gaming mouse mat; recommendation attributes remain withheld pending independent evidence.","razer_atlas_pro")]
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
        fact("audio-audeze-maxwell-2",2,"https://www.audeze.com/products/maxwell-2-wireless-gaming-headset","product_identity","Audeze lists 90 mm planar magnetic drivers and low-latency wireless.","audeze_maxwell_2")
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
