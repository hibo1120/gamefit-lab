(function (root, factory) {
  const api = factory();
  root.GameFitCatalogSourceRegistryV1 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CHECKED_AT = "2026-10-18";
  const SOURCE_ORIGINS = Object.freeze([
    "user_provided_verified",
    "existing_project_reference",
    "assistant_supplement",
    "original_unlocated"
  ]);
  const PERMISSION_STATES = Object.freeze(["manual_facts_only", "reference_only", "hold", "unknown"]);
  const CATEGORY_SCOPE = Object.freeze([
    "all", "pc", "cpu", "gpu", "ram", "storage", "monitor", "mouse", "keyboard", "mousepad",
    "mouse_skates", "audio", "controller", "mic", "dac_amp", "network", "cable", "hub", "kvm",
    "dock", "power", "monitor_arm", "capture_card", "other"
  ]);

  const REFERENCE_RIGHTS_NOTE = "Reference only. Do not bulk extract, reproduce databases, articles, measurements, images, tables, or review prose.";
  const OFFICIAL_RIGHTS_NOTE = "Manual product identity and concise GameFit-authored normalized manufacturer claims only. Do not republish page prose, images, tables, or downloads.";

  function source(source_id, name, canonical_url, options={}) {
    return Object.freeze({
      source_id,
      name,
      canonical_url,
      source_origin:options.source_origin || "assistant_supplement",
      use_purpose:Object.freeze(options.use_purpose || ["product_identity", "manufacturer_spec"]),
      category_scope:Object.freeze(options.category_scope || ["all"]),
      checked_at:options.checked_at || CHECKED_AT,
      terms_url:options.terms_url || null,
      terms_review_result:options.terms_review_result || "normal_manual_browsing_only",
      extraction_permission:options.extraction_permission || "manual_facts_only",
      redistribution_permission:options.redistribution_permission || "no_raw_content_redistribution",
      automation_allowed:options.automation_allowed === true,
      rights_note:options.rights_note || OFFICIAL_RIGHTS_NOTE,
      open_questions:Object.freeze(options.open_questions || [])
    });
  }

  const references = [
    source("manufacturer_official", "Manufacturer official", "https://example.invalid/manufacturer-specific-source-required", {
      source_origin:"existing_project_reference", use_purpose:["routing_only"], category_scope:["all"],
      extraction_permission:"reference_only", terms_review_result:"use_a_specific_manufacturer_source_before_claiming",
      rights_note:OFFICIAL_RIGHTS_NOTE, open_questions:["Generic registry entry cannot support a product claim by itself."]
    }),
    source("gamegeek", "GameGeek", "https://ggjpn.com/", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "measurement_reference"], category_scope:["mouse","monitor","mousepad","keyboard"],
      terms_url:"https://ggjpn.com/about/", extraction_permission:"reference_only", terms_review_result:"bulk_reuse_not_authorized", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("dpqp", "DPQP / Mioni DB", "https://dpqp.jp/", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "expert_reference"], category_scope:["mouse","keyboard","mousepad","audio"],
      extraction_permission:"reference_only", terms_review_result:"bulk_reuse_not_authorized", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("junuj_lbr", "JUNUJ / LBR", "https://lbrgg.jp/about/", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "expert_reference"], category_scope:["mouse","keyboard","mousepad","audio","monitor"],
      extraction_permission:"reference_only", terms_review_result:"bulk_reuse_not_authorized", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("rtings", "RTINGS", "https://www.rtings.com/", {
      source_origin:"existing_project_reference", use_purpose:["individual_measurement_reference"], category_scope:["mouse","keyboard","monitor","audio"],
      terms_url:"https://www.rtings.com/company/terms-of-use", extraction_permission:"hold", terms_review_result:"systematic_database_creation_and_scraping_restricted",
      rights_note:REFERENCE_RIGHTS_NOTE, open_questions:["No bulk or systematic transfer into this catalog."]
    }),
    source("tftcentral", "TFTCentral", "https://tftcentral.co.uk/", {
      source_origin:"original_unlocated", use_purpose:["monitor_measurement_reference"], category_scope:["monitor"],
      extraction_permission:"hold", terms_review_result:"exact_project_source_and_reuse_conditions_not_reconfirmed", rights_note:REFERENCE_RIGHTS_NOTE,
      open_questions:["Original project URL and reuse conditions remain unlocated."]
    }),
    source("geartics", "Geartics", "https://www.geartics.com/about", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "creator_setup_signal"], category_scope:["all"],
      extraction_permission:"reference_only", terms_review_result:"adoption_signal_only_no_bulk_reuse", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("prosettings", "ProSettings", "https://prosettings.net/about/", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "game_specific_adoption_signal"], category_scope:["mouse","keyboard","monitor","mousepad","audio"],
      extraction_permission:"reference_only", terms_review_result:"adoption_signal_only_no_bulk_reuse", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("eloshapes", "EloShapes", "https://www.eloshapes.com/", {
      source_origin:"existing_project_reference", use_purpose:["candidate_discovery", "shape_reference"], category_scope:["mouse"],
      extraction_permission:"reference_only", terms_review_result:"bulk_reuse_not_authorized", rights_note:REFERENCE_RIGHTS_NOTE
    }),
    source("community", "Community consensus", "https://example.invalid/no-single-community-source", {
      source_origin:"existing_project_reference", use_purpose:["routing_only"], category_scope:["all"], extraction_permission:"hold",
      terms_review_result:"requires_specific_post_and_rights_review", rights_note:REFERENCE_RIGHTS_NOTE
    })
  ];

  const official = [
    source("razer_basilisk_v3_pro_support", "Razer Basilisk V3 Pro Support", "https://mysupport.razer.com/app/answers/detail/a_id/6219", { category_scope:["mouse"] }),
    source("razer_basilisk_v3_pro_35k_support", "Razer Basilisk V3 Pro 35K Support", "https://mysupport.razer.com/app/answers/detail/a_id/14676", { category_scope:["mouse"] }),
    source("razer_basilisk_line", "Razer Basilisk Gaming Mice Line", "https://www.razer.com/pc/gaming-mice/basilisk-line", { category_scope:["mouse"] }),
    source("logitech_pro_mice_catalog", "Logitech G PRO gaming mice catalog", "https://www.logitechg.com/en-us/shop/c/gaming-mice?refine=c_filterseries%3Dpro", { category_scope:["mouse"] }),
    source("logitech_superlight2", "Logitech G PRO X SUPERLIGHT 2", "https://www.logitechg.com/en-us/shop/p/pro-x2-superlight-wireless-mouse.910-006628", { category_scope:["mouse"] }),
    source("logitech_g502_x_plus", "Logitech G G502 X PLUS (US retail SKU 910-006160)", "https://www.logitechg.com/en-us/shop/p/g502-x-plus-wireless-lightforce.910-006160", {
      category_scope:["mouse"], checked_at:"2026-10-19",
      open_questions:["The current page describes both HERO 25K and an upgraded HERO 44K sensor; do not derive a numeric DPI limit from either sensor name."]
    }),
    source("logitech_g502_x_plus_support", "Logitech G502 X PLUS support specifications", "https://support.logi.com/hc/en-001/articles/7639125500183-Specification-G502-X-PLUS-Wireless-RGB-Gaming-Mouse", {
      category_scope:["mouse"], checked_at:"2026-10-19",
      open_questions:["The support article identifies product model MR0089 and a 100-25,600 DPI range, but does not state retail SKU 910-006160 or a firmware applicability boundary."]
    }),
    source("logitech_wireless_mouse_comparison", "Logitech G official wireless gaming mouse comparison", "https://gaming.logitech.com/en-gb/discover/a/best-wireless-gaming-mouse", {
      category_scope:["mouse"], checked_at:"2026-10-19",
      open_questions:["The comparison lists G502 X PLUS at 100-25,600 DPI but does not identify the retail SKU, region transition, or firmware boundary."]
    }),
    source("logitech_g502_x_plus_ph", "Logitech G G502 X PLUS (PH retail SKU 910-006164)", "https://www.logitechg.com/en-ph/shop/p/g502-x-plus-wireless-lightforce.910-006164", {
      category_scope:["mouse"], checked_at:"2026-10-19",
      open_questions:["This is a different regional retail SKU and cannot establish the sensor or maximum DPI for US SKU 910-006160."]
    }),
    source("logitech_keyboards_catalog", "Logitech G PRO keyboards catalog", "https://www.logitechg.com/en-us/shop/c/gaming-keyboards?refine=c_filterseries%3Dpro", { category_scope:["keyboard"] }),
    source("logitech_pro_x_tkl_rapid", "Logitech G PRO X TKL RAPID", "https://www.logitechg.com/en-us/shop/p/pro-x-tkl-rapid.920-013131", { category_scope:["keyboard"] }),
    source("wooting_catalog", "Wooting products", "https://wooting.io/products", { category_scope:["keyboard"] }),
    source("wooting_60he_plus", "Wooting 60HE+", "https://wooting.io/wooting-60he", { category_scope:["keyboard"] }),
    source("logitech_mousepads_catalog", "Logitech G gaming mousepads catalog", "https://www.logitechg.com/en-us/shop/c/gaming-mousepads", { category_scope:["mousepad","power"] }),
    source("logitech_g640", "Logitech G640", "https://www.logitechg.com/en-us/shop/p/g640-cloth-gaming-mouse-pad.943-000088", { category_scope:["mousepad"] }),
    source("razer_gigantus_v2_support", "Razer Gigantus V2 Support", "https://mysupport.razer.com/app/answers/detail/a_id/3739", { category_scope:["mousepad"] }),
    source("steelseries_qck", "SteelSeries QcK", "https://steelseries.com/gaming-mousepads/qck", { category_scope:["mousepad"] }),
    source("xbox_controllers_catalog", "Xbox controllers catalog", "https://www.xbox.com/en-US/accessories/controllers", { category_scope:["controller"] }),
    source("xbox_elite_series_2", "Xbox Elite Wireless Controller Series 2", "https://www.xbox.com/en-US/accessories/controllers/elite-wireless-controller-series-2", { category_scope:["controller"] }),
    source("playstation_accessories", "PlayStation accessories", "https://www.playstation.com/en-us/accessories/", { category_scope:["controller","audio"] }),
    source("playstation_dualsense", "PlayStation DualSense wireless controller", "https://www.playstation.com/en-us/accessories/dualsense-wireless-controller/", { category_scope:["controller"] }),
    source("playstation_dualsense_edge", "PlayStation DualSense Edge wireless controller", "https://www.playstation.com/en-us/accessories/dualsense-edge-wireless-controller/", { category_scope:["controller"] }),
    source("nintendo_switch_pro_controller", "Nintendo Switch Pro Controller", "https://www.nintendo.com/us/store/products/pro-controller/", { category_scope:["controller"] }),
    source("8bitdo_ultimate_2", "8BitDo Ultimate 2 Wireless Controller", "https://www.8bitdo.com/ultimate-2-wireless-controller/", { category_scope:["controller"] }),
    source("asus_pg27aqdp", "ASUS ROG Swift OLED PG27AQDP", "https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdp/", { category_scope:["monitor"] }),
    source("lg_27gs95qe", "LG UltraGear 27GS95QE-B", "https://www.lg.com/us/monitors/lg-27gs95qe-b-gaming-monitor", { category_scope:["monitor"] }),
    source("sony_monitor_support_catalog", "Sony monitor support catalog", "https://www.sony.com/electronics/support/televisions-projectors-monitors", { category_scope:["monitor"] }),
    source("sony_inzone_m9ii_specs", "Sony INZONE M9 II specifications", "https://www.sony.com/electronics/support/televisions-projectors-monitors/sdm-27u9m2/specifications", { category_scope:["monitor"] }),
    source("logitech_audio_catalog", "Logitech G PRO gaming audio catalog", "https://www.logitechg.com/en-us/shop/c/gaming-headsets-audio?refine=c_filterseries%3Dpro", { category_scope:["audio"] }),
    source("logitech_pro_x2_audio", "Logitech G PRO X 2 LIGHTSPEED", "https://www.logitechg.com/en-us/shop/p/pro-x-2-wireless-headset", { category_scope:["audio"] }),
    source("elgato_wave3", "Elgato Wave:3", "https://www.elgato.com/us/en/p/wave-3", { category_scope:["mic"] }),
    source("logitech_yeti_gx", "Logitech G Yeti GX", "https://www.logitechg.com/en-us/shop/p/yeti-gx-gaming-microphone.988-000574", { category_scope:["mic"] }),
    source("elgato_4k_x", "Elgato Game Capture 4K X", "https://www.elgato.com/us/en/p/game-capture-4k-x", { category_scope:["capture_card"] }),
    source("avermedia_gc553g2", "AVerMedia Live Gamer ULTRA 2.1 GC553G2", "https://shop-us.avermedia.com/collections/css-10off/products/avermedia-live-gamer-ultra2-1-gc553g2", { category_scope:["capture_card"] }),
    source("kingston_gaming_ssd_catalog", "Kingston gaming SSD catalog", "https://www.kingston.com/en/ssd/gaming", { category_scope:["storage"] }),
    source("kingston_fury_renegade", "Kingston FURY Renegade PCIe 4.0 NVMe SSD", "https://www.kingston.com/en/ssd/gaming/kingston-fury-renegade-nvme-m2-ssd", { category_scope:["storage"] }),
    source("kingston_fury_renegade_g5", "Kingston FURY Renegade G5", "https://www.kingston.com/en/ssd/gaming/kingston-fury-renegade-g5-nvme-m2-ssd", { category_scope:["storage"] }),
    source("amd_ryzen_desktop_catalog", "AMD Ryzen desktop processor catalog", "https://www.amd.com/en/products/processors/desktops/ryzen.html", { category_scope:["cpu"] }),
    source("amd_ryzen_9800x3d", "AMD Ryzen 7 9800X3D", "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800X3d.html", { category_scope:["cpu"] }),
    source("amd_radeon_desktop_catalog", "AMD Radeon desktop graphics catalog", "https://www.amd.com/en/products/graphics/desktops/radeon.html", { category_scope:["gpu"] }),
    source("amd_radeon_rx9070xt", "AMD Radeon RX 9070 XT", "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html", { category_scope:["gpu"] }),
    source("nvidia_rtx5090", "NVIDIA GeForce RTX 5090", "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/", { category_scope:["gpu"] }),
    source("tplink_archer_ge800", "TP-Link Archer GE800", "https://www.tp-link.com/us/home-networking/wifi-router/archer-ge800/v1/", { category_scope:["network"] })
  ];

  const sources = Object.freeze([...references, ...official]);

  function find(sourceId) {
    return sources.find(item => item.source_id === sourceId) || null;
  }

  function validateSource(row) {
    const errors = [];
    for (const key of ["source_id","name","canonical_url","source_origin","use_purpose","category_scope","checked_at","terms_review_result","extraction_permission","redistribution_permission","automation_allowed","rights_note","open_questions"]) {
      if (row?.[key] === undefined || row?.[key] === "") errors.push(`${key} is required`);
    }
    if (!SOURCE_ORIGINS.includes(row?.source_origin)) errors.push("source_origin is invalid");
    if (!PERMISSION_STATES.includes(row?.extraction_permission)) errors.push("extraction_permission is invalid");
    if (!Array.isArray(row?.category_scope) || row.category_scope.some(value => !CATEGORY_SCOPE.includes(value))) errors.push("category_scope is invalid");
    if (!/^https:\/\//i.test(row?.canonical_url || "")) errors.push("canonical_url must use https");
    if (row?.terms_url != null && !/^https:\/\//i.test(row.terms_url)) errors.push("terms_url must use https");
    if (row?.automation_allowed !== false) errors.push("automation_allowed must remain false in v1");
    return errors;
  }

  function validateRegistry() {
    const errors = [];
    const ids = new Set();
    for (const row of sources) {
      for (const error of validateSource(row)) errors.push(`${row.source_id}:${error}`);
      if (ids.has(row.source_id)) errors.push(`${row.source_id}:duplicate source_id`);
      ids.add(row.source_id);
    }
    return errors;
  }

  return { CHECKED_AT, SOURCE_ORIGINS, PERMISSION_STATES, CATEGORY_SCOPE, sources, find, validateSource, validateRegistry };
});
