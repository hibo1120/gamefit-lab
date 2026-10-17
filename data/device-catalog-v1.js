(function (root, factory) {
  const registry = root.GameFitCatalogSourceRegistryV1 || (typeof module === "object" && module.exports ? require("./catalog-source-registry-v1.js") : null);
  const api = factory(registry);
  root.GameFitDeviceCatalogV1 = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (registry) {
  "use strict";

  if (!registry) throw new Error("GameFitCatalogSourceRegistryV1 is required");

  const VERSION = "catalog-expansion-v1-20261018";
  const CHECKED_AT = "2026-10-18";
  const CATEGORIES = Object.freeze([
    "pc","cpu","gpu","ram","storage","monitor","mouse","keyboard","mousepad","mouse_skates",
    "audio","controller","mic","dac_amp","network","cable","hub","kvm","dock","power",
    "monitor_arm","capture_card","other"
  ]);
  const IDENTITY_GRANULARITIES = Object.freeze(["family","model","variant"]);
  const LIFECYCLE_STATES = Object.freeze(["unknown","announced","preorder","available","mature","discounting","out_of_stock","eol","discontinued","legacy"]);
  const CLAIM_TYPES = Object.freeze(["manufacturer_spec","manufacturer_compatibility","manufacturer_identity"]);
  const PUBLIC_FIELDS = Object.freeze([
    "product_id","family_id","manufacturer","product_name","category","identity_granularity","manufacturer_model_id",
    "verified_aliases","identity_verified","specs_verified_fields","comparison_ready_scopes","recommendation_eligible","public_ui_connected","lifecycle_status"
  ]);

  function definition(product_id, family_id, manufacturer, product_name, category, source_id, options={}) {
    return {
      product_id, family_id, manufacturer, product_name, category, source_id,
      identity_granularity:options.identity_granularity || "model",
      manufacturer_model_id:options.manufacturer_model_id || null,
      verified_aliases:options.verified_aliases || [],
      identity_locator:options.identity_locator || "Official product page heading or official catalog listing.",
      region_scope:options.region_scope || ["global_or_unspecified"],
      lifecycle_status:options.lifecycle_status || "unknown",
      comparison_ready_scopes:options.comparison_ready_scopes || []
    };
  }

  const definitions = [
    definition("mouse-razer-basilisk-v3-pro","razer-basilisk-v3-pro","Razer","Razer Basilisk V3 Pro","mouse","razer_basilisk_v3_pro_support",{ manufacturer_model_id:"RZ01-04620",verified_aliases:["Basilisk V3 Pro","バジリスク V3 Pro","RZ01-04620"],comparison_ready_scopes:["sensor_dpi","weight","dimensions","connection_modes"] }),
    definition("mouse-razer-basilisk-v3-pro-35k","razer-basilisk-v3-pro","Razer","Razer Basilisk V3 Pro 35K","mouse","razer_basilisk_v3_pro_35k_support",{ manufacturer_model_id:"RZ01-0524",verified_aliases:["Basilisk V3 Pro 35K","バジリスク V3 Pro 35K","RZ01-0524"],comparison_ready_scopes:["sensor_dpi"] }),
    definition("mouse-razer-basilisk-v3-35k","razer-basilisk-v3","Razer","Razer Basilisk V3 35K","mouse","razer_basilisk_line",{ verified_aliases:["Basilisk V3 35K","バジリスク V3 35K"] }),
    definition("mouse-razer-basilisk-v3-x-hyperspeed","razer-basilisk-v3","Razer","Razer Basilisk V3 X HyperSpeed","mouse","razer_basilisk_line",{ verified_aliases:["Basilisk V3 X HyperSpeed","バジリスク V3 X ハイパースピード"] }),
    definition("mouse-razer-basilisk-mobile","razer-basilisk-mobile","Razer","Razer Basilisk Mobile","mouse","razer_basilisk_line",{ verified_aliases:["Basilisk Mobile","バジリスク モバイル"] }),
    definition("mouse-logitech-pro-x-superlight-2","logitech-pro-x-superlight","Logitech G","Logitech G PRO X SUPERLIGHT 2","mouse","logitech_superlight2",{ manufacturer_model_id:"910-006628",verified_aliases:["PRO X SUPERLIGHT 2","プロ X スーパーライト 2","Logicool G PRO X SUPERLIGHT 2"],comparison_ready_scopes:["weight","sensor_dpi","polling_rate"] }),
    definition("mouse-logitech-pro-x-superlight-2-dex","logitech-pro-x-superlight","Logitech G","Logitech G PRO X SUPERLIGHT 2 DEX","mouse","logitech_pro_mice_catalog",{ verified_aliases:["PRO X SUPERLIGHT 2 DEX","Logicool G PRO X SUPERLIGHT 2 DEX"] }),
    definition("mouse-logitech-g502-x-plus","logitech-g502-x","Logitech G","Logitech G502 X PLUS","mouse","logitech_g502_x_plus",{ manufacturer_model_id:"910-006160",verified_aliases:["G502 X PLUS","Logicool G502 X PLUS"],comparison_ready_scopes:["sensor_dpi","connection_modes"] }),
    definition("mouse-logitech-pro-x-superlight-2c","logitech-pro-x-superlight","Logitech G","Logitech G PRO X SUPERLIGHT 2c","mouse","logitech_pro_mice_catalog",{ verified_aliases:["PRO X SUPERLIGHT 2c","Logicool G PRO X SUPERLIGHT 2c"] }),
    definition("mouse-logitech-pro-2-lightspeed","logitech-pro-2","Logitech G","Logitech G PRO 2 LIGHTSPEED","mouse","logitech_pro_mice_catalog",{ verified_aliases:["PRO 2 LIGHTSPEED","Logicool G PRO 2 LIGHTSPEED"] }),

    definition("keyboard-wooting-60he-plus","wooting-60he","Wooting","Wooting 60HE+","keyboard","wooting_60he_plus",{ verified_aliases:["60HE+","Wooting 60HE Plus","ウーティング 60HE+"],comparison_ready_scopes:["layout","actuation_range","weight","dimensions"] }),
    definition("keyboard-wooting-60he-v2","wooting-60he","Wooting","Wooting 60HE v2","keyboard","wooting_catalog",{ verified_aliases:["60HE v2","ウーティング 60HE v2"] }),
    definition("keyboard-wooting-80he-plus","wooting-80he","Wooting","Wooting 80HE+","keyboard","wooting_catalog",{ verified_aliases:["80HE+","Wooting 80HE Plus","ウーティング 80HE+"] }),
    definition("keyboard-wooting-two-he","wooting-two-he","Wooting","Wooting Two HE","keyboard","wooting_catalog",{ verified_aliases:["Two HE","Wooting 2 HE","ウーティング Two HE"] }),
    definition("keyboard-logitech-pro-x-tkl-rapid","logitech-pro-x-tkl","Logitech G","Logitech G PRO X TKL RAPID","keyboard","logitech_pro_x_tkl_rapid",{ manufacturer_model_id:"920-013131",verified_aliases:["PRO X TKL RAPID","Logicool G PRO X TKL RAPID"],comparison_ready_scopes:["layout","rapid_trigger","switch_type"] }),
    definition("keyboard-logitech-pro-x-60","logitech-pro-x","Logitech G","Logitech G PRO X 60","keyboard","logitech_keyboards_catalog",{ verified_aliases:["PRO X 60","Logicool G PRO X 60"] }),
    definition("keyboard-logitech-pro-x-tkl","logitech-pro-x-tkl","Logitech G","Logitech G PRO X TKL","keyboard","logitech_keyboards_catalog",{ verified_aliases:["PRO X TKL","Logicool G PRO X TKL"] }),
    definition("keyboard-logitech-pro-wired","logitech-pro","Logitech G","Logitech G PRO Wired Gaming Keyboard","keyboard","logitech_keyboards_catalog",{ verified_aliases:["PRO Wired Gaming Keyboard","Logicool G PRO Wired"] }),

    definition("mousepad-logitech-pro-x-control","logitech-pro-x-control","Logitech G","Logitech G PRO X CONTROL","mousepad","logitech_mousepads_catalog",{ verified_aliases:["PRO X CONTROL","Logicool G PRO X CONTROL"] }),
    definition("power-logitech-powerplay-2","logitech-powerplay","Logitech G","Logitech G POWERPLAY 2 Wireless Charging System","power","logitech_mousepads_catalog",{ verified_aliases:["POWERPLAY 2","Logicool G POWERPLAY 2"] }),
    definition("mousepad-logitech-g840","logitech-g840","Logitech G","Logitech G840","mousepad","logitech_mousepads_catalog",{ verified_aliases:["G840","Logicool G840"] }),
    definition("mousepad-logitech-g440","logitech-g440","Logitech G","Logitech G440","mousepad","logitech_mousepads_catalog",{ verified_aliases:["G440","Logicool G440"] }),
    definition("mousepad-logitech-g640","logitech-g640","Logitech G","Logitech G640","mousepad","logitech_g640",{ manufacturer_model_id:"943-000088",verified_aliases:["G640","Logicool G640"],comparison_ready_scopes:["dimensions","surface_material"] }),
    definition("mousepad-logitech-g740","logitech-g740","Logitech G","Logitech G740","mousepad","logitech_mousepads_catalog",{ verified_aliases:["G740","Logicool G740"] }),
    definition("mousepad-logitech-g240","logitech-g240","Logitech G","Logitech G240","mousepad","logitech_mousepads_catalog",{ verified_aliases:["G240","Logicool G240"] }),
    definition("mousepad-logitech-g640-g502-anniversary","logitech-g640","Logitech G","Logitech G640 - G502 Anniversary Edition","mousepad","logitech_mousepads_catalog",{ identity_granularity:"variant",verified_aliases:["G640 G502 Anniversary","Logicool G640 G502 Anniversary"] }),
    definition("mousepad-razer-gigantus-v2","razer-gigantus-v2","Razer","Razer Gigantus V2","mousepad","razer_gigantus_v2_support",{ manufacturer_model_id:"RZ02-03330",verified_aliases:["Gigantus V2","ギガンタス V2","RZ02-03330"],comparison_ready_scopes:["surface_material","base_material"] }),
    definition("mousepad-steelseries-qck","steelseries-qck","SteelSeries","SteelSeries QcK","mousepad","steelseries_qck",{ identity_granularity:"family",verified_aliases:["QcK","SteelSeries QCK","スティールシリーズ QcK"],comparison_ready_scopes:["size_variants"] }),

    definition("controller-xbox-wireless","xbox-wireless-controller","Microsoft Xbox","Xbox Wireless Controller","controller","xbox_controllers_catalog",{ verified_aliases:["Xbox純正コントローラー","Xbox Controller","Xbox ワイヤレス コントローラー"] }),
    definition("controller-xbox-elite-series-2","xbox-elite-series-2","Microsoft Xbox","Xbox Elite Wireless Controller Series 2","controller","xbox_elite_series_2",{ verified_aliases:["Xbox Elite Series 2","Xbox Elite 2","Xbox エリート シリーズ2"],comparison_ready_scopes:["weight","platforms","connection_modes"] }),
    definition("controller-xbox-elite-series-2-core","xbox-elite-series-2","Microsoft Xbox","Xbox Elite Wireless Controller Series 2 - Core","controller","xbox_controllers_catalog",{ identity_granularity:"variant",verified_aliases:["Xbox Elite Series 2 Core","Xbox Elite Core"] }),
    definition("controller-xbox-adaptive","xbox-adaptive-controller","Microsoft Xbox","Xbox Adaptive Controller","controller","xbox_controllers_catalog",{ verified_aliases:["Xbox Adaptive","Xbox アダプティブ コントローラー"] }),
    definition("controller-playstation-dualsense","playstation-dualsense","Sony Interactive Entertainment","DualSense Wireless Controller","controller","playstation_dualsense",{ verified_aliases:["DualSense","デュアルセンス","PS5 controller"],comparison_ready_scopes:["platforms","connection_modes"] }),
    definition("controller-playstation-dualsense-edge","playstation-dualsense-edge","Sony Interactive Entertainment","DualSense Edge Wireless Controller","controller","playstation_dualsense_edge",{ verified_aliases:["DualSense Edge","デュアルセンス エッジ"],comparison_ready_scopes:["back_buttons","trigger_adjustment"] }),
    definition("controller-nintendo-switch-pro","nintendo-switch-pro-controller","Nintendo","Nintendo Switch Pro Controller","controller","nintendo_switch_pro_controller",{ manufacturer_model_id:"104888",verified_aliases:["Switch Pro Controller","プロコン","Nintendo Switch Proコン"] }),
    definition("controller-8bitdo-ultimate-2-wireless","8bitdo-ultimate-2","8BitDo","8BitDo Ultimate 2 Wireless Controller","controller","8bitdo_ultimate_2",{ verified_aliases:["Ultimate 2 Wireless","8BitDo Ultimate 2","アルティメット2 ワイヤレス"],comparison_ready_scopes:["weight","dimensions","stick_type","polling_rate","platforms"] }),

    definition("monitor-asus-pg27aqdp","asus-pg27aqdp","ASUS ROG","ROG Swift OLED PG27AQDP","monitor","asus_pg27aqdp",{ manufacturer_model_id:"PG27AQDP",verified_aliases:["PG27AQDP","ROG PG27AQDP"],comparison_ready_scopes:["panel","resolution","refresh_rate","response_time"] }),
    definition("monitor-lg-27gs95qe-b","lg-27gs95qe","LG","LG UltraGear 27GS95QE-B","monitor","lg_27gs95qe",{ manufacturer_model_id:"27GS95QE-B",verified_aliases:["27GS95QE-B","LG 27GS95QE"],comparison_ready_scopes:["panel","resolution","refresh_rate","response_time"] }),
    definition("monitor-sony-inzone-m9-ii","sony-inzone-m9","Sony","Sony INZONE M9 II","monitor","sony_inzone_m9ii_specs",{ manufacturer_model_id:"SDM-27U9M2",verified_aliases:["INZONE M9 II","インゾーン M9 II","SDM-27U9M2"],comparison_ready_scopes:["panel","resolution","refresh_rate","response_time"] }),
    definition("monitor-sony-inzone-m10s","sony-inzone-m10s","Sony","Sony INZONE M10S","monitor","sony_monitor_support_catalog",{ manufacturer_model_id:"SDM-27Q10S",verified_aliases:["INZONE M10S","インゾーン M10S","SDM-27Q10S"] }),
    definition("monitor-sony-inzone-m10s-ii","sony-inzone-m10s","Sony","Sony INZONE M10S II","monitor","sony_monitor_support_catalog",{ manufacturer_model_id:"SDM-27Q102",verified_aliases:["INZONE M10S II","インゾーン M10S II","SDM-27Q102"] }),

    definition("audio-logitech-pro-x-2-lightspeed","logitech-pro-x-audio","Logitech G","Logitech G PRO X 2 LIGHTSPEED","audio","logitech_pro_x2_audio",{ verified_aliases:["PRO X 2 LIGHTSPEED headset","Logicool G PRO X 2"],comparison_ready_scopes:["driver_size","connection_modes","battery_life"] }),
    definition("audio-logitech-pro-x-se","logitech-pro-x-audio","Logitech G","Logitech G PRO X SE Wired","audio","logitech_audio_catalog",{ verified_aliases:["PRO X SE","Logicool G PRO X SE"] }),
    definition("audio-logitech-pro-x-wireless","logitech-pro-x-audio","Logitech G","Logitech G PRO X Wireless LIGHTSPEED","audio","logitech_audio_catalog",{ verified_aliases:["PRO X Wireless","Logicool G PRO X Wireless"] }),
    definition("audio-logitech-pro-x-wired","logitech-pro-x-audio","Logitech G","Logitech G PRO X Wired","audio","logitech_audio_catalog",{ verified_aliases:["PRO X Wired","Logicool G PRO X Wired"] }),
    definition("audio-playstation-pulse-elite","playstation-pulse-elite","Sony Interactive Entertainment","PULSE Elite Wireless Headset","audio","playstation_accessories",{ verified_aliases:["PULSE Elite","パルス エリート"] }),

    definition("mic-elgato-wave-3","elgato-wave-3","Elgato","Elgato Wave:3","mic","elgato_wave3",{ verified_aliases:["Wave 3","Wave:3","ウェーブ3"],comparison_ready_scopes:["sample_rate","bit_depth","polar_pattern"] }),
    definition("mic-elgato-wave-3-mk2","elgato-wave-3","Elgato","Elgato Wave:3 MK.2","mic","elgato_wave3",{ identity_granularity:"variant",verified_aliases:["Wave 3 MK2","Wave:3 MK.2","Wave:3 Mark 2"],comparison_ready_scopes:["sample_rate","bit_depth","polar_pattern","weight"] }),
    definition("mic-logitech-yeti-gx","logitech-yeti-gx","Logitech G","Logitech G Yeti GX","mic","logitech_yeti_gx",{ manufacturer_model_id:"988-000574",verified_aliases:["Yeti GX","Logicool G Yeti GX","イエティ GX"] }),

    definition("capture-elgato-4k-x","elgato-4k-x","Elgato","Elgato Game Capture 4K X","capture_card","elgato_4k_x",{ manufacturer_model_id:"10GBH9901",verified_aliases:["4K X","Game Capture 4K X"],comparison_ready_scopes:["interface","passthrough_resolution","capture_resolution","dimensions","weight"] }),
    definition("capture-elgato-4k-pro","elgato-4k-pro","Elgato","Elgato Game Capture 4K Pro","capture_card","elgato_4k_x",{ verified_aliases:["4K Pro","Game Capture 4K Pro"] }),
    definition("capture-avermedia-gc553g2","avermedia-gc553g2","AVerMedia","AVerMedia Live Gamer ULTRA 2.1 GC553G2","capture_card","avermedia_gc553g2",{ manufacturer_model_id:"GC553G2",verified_aliases:["GC553G2","Live Gamer Ultra 2.1"] }),

    definition("storage-kingston-fury-renegade-g5","kingston-fury-renegade-g5","Kingston","Kingston FURY Renegade G5 PCIe 5.0 NVMe M.2 SSD","storage","kingston_fury_renegade_g5",{ verified_aliases:["FURY Renegade G5","Kingston Renegade G5"],comparison_ready_scopes:["interface","form_factor","sequential_read","sequential_write","capacity_options"] }),
    definition("storage-kingston-fury-renegade","kingston-fury-renegade","Kingston","Kingston FURY Renegade PCIe 4.0 NVMe M.2 SSD","storage","kingston_fury_renegade",{ verified_aliases:["FURY Renegade SSD","Kingston Renegade PCIe 4.0"],comparison_ready_scopes:["interface","form_factor","sequential_read","sequential_write","capacity_options"] }),
    definition("storage-kingston-kc3000","kingston-kc3000","Kingston","Kingston KC3000 PCIe 4.0 NVMe M.2 SSD","storage","kingston_gaming_ssd_catalog",{ verified_aliases:["KC3000","Kingston KC3000"] }),
    definition("storage-kingston-xs2000","kingston-xs2000","Kingston","Kingston XS2000 External SSD","storage","kingston_gaming_ssd_catalog",{ verified_aliases:["XS2000","Kingston XS2000"] }),
    definition("storage-kingston-xs1000","kingston-xs1000","Kingston","Kingston XS1000 External SSD","storage","kingston_gaming_ssd_catalog",{ verified_aliases:["XS1000","Kingston XS1000"] }),

    definition("cpu-amd-ryzen-9-9950x3d","amd-ryzen-9000","AMD","AMD Ryzen 9 9950X3D","cpu","amd_ryzen_desktop_catalog",{ manufacturer_model_id:"9950X3D",verified_aliases:["Ryzen 9 9950X3D","R9 9950X3D"],comparison_ready_scopes:["core_count","thread_count","boost_clock","tdp"] }),
    definition("cpu-amd-ryzen-9-9900x3d","amd-ryzen-9000","AMD","AMD Ryzen 9 9900X3D","cpu","amd_ryzen_desktop_catalog",{ manufacturer_model_id:"9900X3D",verified_aliases:["Ryzen 9 9900X3D","R9 9900X3D"],comparison_ready_scopes:["core_count","thread_count","boost_clock","tdp"] }),
    definition("cpu-amd-ryzen-7-9800x3d","amd-ryzen-9000","AMD","AMD Ryzen 7 9800X3D","cpu","amd_ryzen_9800x3d",{ manufacturer_model_id:"100-100001084WOF",verified_aliases:["Ryzen 7 9800X3D","R7 9800X3D"],comparison_ready_scopes:["core_count","thread_count","boost_clock","base_clock","tdp","socket"] }),
    definition("cpu-amd-ryzen-7-9700x","amd-ryzen-9000","AMD","AMD Ryzen 7 9700X","cpu","amd_ryzen_desktop_catalog",{ manufacturer_model_id:"9700X",verified_aliases:["Ryzen 7 9700X","R7 9700X"],comparison_ready_scopes:["core_count","thread_count","boost_clock","tdp"] }),
    definition("cpu-amd-ryzen-5-9600x","amd-ryzen-9000","AMD","AMD Ryzen 5 9600X","cpu","amd_ryzen_desktop_catalog",{ manufacturer_model_id:"9600X",verified_aliases:["Ryzen 5 9600X","R5 9600X"],comparison_ready_scopes:["core_count","thread_count","boost_clock","tdp"] }),
    definition("cpu-amd-ryzen-9-9950x","amd-ryzen-9000","AMD","AMD Ryzen 9 9950X","cpu","amd_ryzen_desktop_catalog",{ manufacturer_model_id:"9950X",verified_aliases:["Ryzen 9 9950X","R9 9950X"],comparison_ready_scopes:["core_count","thread_count","boost_clock","tdp"] }),

    definition("gpu-nvidia-geforce-rtx-5090","nvidia-geforce-rtx-50","NVIDIA","NVIDIA GeForce RTX 5090","gpu","nvidia_rtx5090",{ manufacturer_model_id:"RTX 5090",verified_aliases:["GeForce RTX 5090","RTX5090"],comparison_ready_scopes:["memory_capacity","memory_type"] }),
    definition("gpu-amd-radeon-rx-9070-xt","amd-radeon-rx-9000","AMD","AMD Radeon RX 9070 XT","gpu","amd_radeon_rx9070xt",{ manufacturer_model_id:"RX 9070 XT",verified_aliases:["Radeon RX 9070 XT","RX9070XT"],comparison_ready_scopes:["compute_units","boost_clock","memory_capacity","memory_type","board_power"] }),
    definition("gpu-amd-radeon-rx-9070","amd-radeon-rx-9000","AMD","AMD Radeon RX 9070","gpu","amd_radeon_desktop_catalog",{ manufacturer_model_id:"RX 9070",verified_aliases:["Radeon RX 9070","RX9070"] }),
    definition("gpu-amd-radeon-rx-9070-gre","amd-radeon-rx-9000","AMD","AMD Radeon RX 9070 GRE","gpu","amd_radeon_desktop_catalog",{ manufacturer_model_id:"RX 9070 GRE",verified_aliases:["Radeon RX 9070 GRE","RX9070 GRE"] }),
    definition("gpu-amd-radeon-rx-9060-xt-16gb","amd-radeon-rx-9000","AMD","AMD Radeon RX 9060 XT 16GB","gpu","amd_radeon_desktop_catalog",{ manufacturer_model_id:"RX 9060 XT 16GB",verified_aliases:["Radeon RX 9060 XT 16GB","RX9060XT 16GB"] }),

    definition("network-tplink-archer-ge800-v1","tplink-archer-ge800","TP-Link","TP-Link Archer GE800 V1","network","tplink_archer_ge800",{ manufacturer_model_id:"Archer GE800 V1",verified_aliases:["Archer GE800","GE800","アーチャー GE800"],comparison_ready_scopes:["wifi_generation","bands","wired_ports","mesh"] })
  ];

  function claim(product_id, field, value, unit, source_id, locator, options={}) {
    return Object.freeze({
      claim_id:`${product_id}-${field}-${options.sequence || 1}`,
      product_id,
      field,
      value,
      unit:unit || null,
      claim_type:options.claim_type || "manufacturer_spec",
      subject_scope:options.subject_scope || "exact_product",
      conditions:Object.freeze(options.conditions || {}),
      source_id,
      source_locator:locator,
      checked_at:CHECKED_AT,
      status:options.status || "verified",
      note:options.note || null
    });
  }

  const claims = Object.freeze([
    claim("mouse-razer-basilisk-v3-pro","sensor_dpi",30000,"dpi","razer_basilisk_v3_pro_support","Specifications: 30,000 DPI"),
    claim("mouse-razer-basilisk-v3-pro","weight",112,"g","razer_basilisk_v3_pro_support","Specifications: approx. 112 g excluding cable"),
    claim("mouse-razer-basilisk-v3-pro","length",130,"mm","razer_basilisk_v3_pro_support","Specifications: 130 mm"),
    claim("mouse-razer-basilisk-v3-pro","width",75.4,"mm","razer_basilisk_v3_pro_support","Specifications: 75.4 mm"),
    claim("mouse-razer-basilisk-v3-pro","height",42.5,"mm","razer_basilisk_v3_pro_support","Specifications: 42.5 mm"),
    claim("mouse-razer-basilisk-v3-pro","connection_modes",["2.4GHz","Bluetooth","USB wired"],null,"razer_basilisk_v3_pro_support","Specifications: wireless and wired modes",{ claim_type:"manufacturer_compatibility" }),
    claim("mouse-razer-basilisk-v3-pro-35k","sensor_dpi",35000,"dpi","razer_basilisk_v3_pro_35k_support","Specifications: Focus Pro 35K Optical Sensor Gen-2"),
    claim("mouse-razer-basilisk-v3-pro-35k","model_series","RZ01-0524",null,"razer_basilisk_v3_pro_35k_support","Page heading",{ claim_type:"manufacturer_identity" }),
    claim("mouse-logitech-pro-x-superlight-2","weight",60,"g","logitech_superlight2","Description: 60 g"),
    claim("mouse-logitech-pro-x-superlight-2","sensor_dpi",44000,"dpi","logitech_superlight2","HERO 2 section: up to 44,000 DPI"),
    claim("mouse-logitech-pro-x-superlight-2","polling_rate",8000,"Hz","logitech_superlight2","LIGHTSPEED section: up to 8 kHz",{ conditions:{ connection:"LIGHTSPEED wireless",maximum:true } }),
    claim("mouse-logitech-g502-x-plus","sensor_dpi",25000,"dpi","logitech_g502_x_plus","Description: HERO 25K Optical Sensor"),
    claim("mouse-logitech-g502-x-plus","connection_modes",["LIGHTSPEED wireless"],null,"logitech_g502_x_plus","Description",{ claim_type:"manufacturer_compatibility" }),

    claim("keyboard-wooting-60he-plus","layout","60_percent",null,"wooting_60he_plus","Tech Specs: GH60 (60%)"),
    claim("keyboard-wooting-60he-plus","rapid_trigger",true,null,"wooting_60he_plus","Product features: Rapid Trigger"),
    claim("keyboard-wooting-60he-plus","actuation_range",{ min:0.1,max:4.0 },"mm","wooting_60he_plus","Adjustable Actuation: 0.1 to 4.0 mm"),
    claim("keyboard-wooting-60he-plus","weight",605,"g","wooting_60he_plus","Tech Specs: Weight"),
    claim("keyboard-wooting-60he-plus","dimensions",{ width:302,depth:116,height:38 },"mm","wooting_60he_plus","Tech Specs: Dimensions"),
    claim("keyboard-logitech-pro-x-tkl-rapid","layout","tkl",null,"logitech_pro_x_tkl_rapid","Official product name and description"),
    claim("keyboard-logitech-pro-x-tkl-rapid","rapid_trigger",true,null,"logitech_pro_x_tkl_rapid","Rapid Trigger section"),
    claim("keyboard-logitech-pro-x-tkl-rapid","switch_type","magnetic_analog",null,"logitech_pro_x_tkl_rapid","Description: magnetic-analog switches"),

    claim("mousepad-logitech-g640","dimensions",{ width:460,depth:400 },"mm","logitech_g640","Description: 400 x 460 mm"),
    claim("mousepad-logitech-g640","surface_material","cloth",null,"logitech_g640","Official product name: cloth gaming mouse pad"),
    claim("mousepad-razer-gigantus-v2","surface_material","textured_micro_weave_cloth",null,"razer_gigantus_v2_support","Full Technical Specifications: surface texture"),
    claim("mousepad-razer-gigantus-v2","base_material","anti_slip_rubber",null,"razer_gigantus_v2_support","Full Technical Specifications: base"),
    claim("mousepad-steelseries-qck","size_variants",["S","M","L","XXL","3XL","4XL","5XL"],null,"steelseries_qck","QcK size chart",{ subject_scope:"family" }),

    claim("controller-xbox-elite-series-2","weight",345,"g","xbox_elite_series_2","Tech Specs: 345 g +/- 15 g",{ conditions:{ attached_parts:"4 paddles, faceted d-pad, standard thumbsticks" } }),
    claim("controller-xbox-elite-series-2","platforms",["Xbox Series X|S","Xbox One","Windows PC","Android","iOS"],null,"xbox_elite_series_2","Switch between devices and Tech Specs",{ claim_type:"manufacturer_compatibility" }),
    claim("controller-xbox-elite-series-2","connection_modes",["Xbox Wireless","Bluetooth","USB-C"],null,"xbox_elite_series_2","Tech Specs: Connectivity",{ claim_type:"manufacturer_compatibility" }),
    claim("controller-xbox-elite-series-2","battery_life",40,"hours","xbox_elite_series_2","Tech Specs: up to 40 hours",{ conditions:{ maximum:true } }),
    claim("controller-playstation-dualsense","connection_modes",["USB-C","Bluetooth"],null,"playstation_dualsense","PC, Mac and mobile devices section",{ claim_type:"manufacturer_compatibility" }),
    claim("controller-playstation-dualsense","platforms",["PlayStation 5","Windows PC","Mac","Android","iOS"],null,"playstation_dualsense","Official compatibility description",{ claim_type:"manufacturer_compatibility" }),
    claim("controller-playstation-dualsense-edge","back_buttons",2,"buttons","playstation_dualsense_edge","Included components: two back button styles"),
    claim("controller-playstation-dualsense-edge","trigger_adjustment",true,null,"playstation_dualsense_edge","Ultra-customizable controls"),
    claim("controller-nintendo-switch-pro","platforms",["Nintendo Switch","Nintendo Switch OLED Model"],null,"nintendo_switch_pro_controller","About this item: System",{ claim_type:"manufacturer_compatibility" }),
    claim("controller-nintendo-switch-pro","model_sku","104888",null,"nintendo_switch_pro_controller","About this item: SKU",{ claim_type:"manufacturer_identity" }),
    claim("controller-8bitdo-ultimate-2-wireless","stick_type","tmr",null,"8bitdo_ultimate_2","Equipped with TMR joysticks"),
    claim("controller-8bitdo-ultimate-2-wireless","polling_rate",1000,"Hz","8bitdo_ultimate_2","Precise and Low-Latency",{ conditions:{ connections:["2.4GHz","wired"],environment:"manufacturer ideal environment" } }),
    claim("controller-8bitdo-ultimate-2-wireless","weight",246,"g","8bitdo_ultimate_2","Tech Specs: Dimension / Weight"),
    claim("controller-8bitdo-ultimate-2-wireless","dimensions",{ width:147,depth:103,height:61.3 },"mm","8bitdo_ultimate_2","Tech Specs: Dimension / Weight"),
    claim("controller-8bitdo-ultimate-2-wireless","platforms",["Windows 10+","Android 13+","SteamOS 3.7.13+","Apple OS 26+"],null,"8bitdo_ultimate_2","Compatibility",{ claim_type:"manufacturer_compatibility" }),

    claim("monitor-asus-pg27aqdp","panel","woled",null,"asus_pg27aqdp","Official overview: WOLED"),
    claim("monitor-asus-pg27aqdp","resolution","2560x1440",null,"asus_pg27aqdp","Official overview: QHD 2560 x 1440"),
    claim("monitor-asus-pg27aqdp","refresh_rate",480,"Hz","asus_pg27aqdp","Official overview: native 480 Hz"),
    claim("monitor-asus-pg27aqdp","response_time",0.03,"ms_gtg","asus_pg27aqdp","Official overview: 0.03 ms GTG",{ conditions:{ metric:"GTG" } }),
    claim("monitor-lg-27gs95qe-b","panel","oled",null,"lg_27gs95qe","Official product heading"),
    claim("monitor-lg-27gs95qe-b","resolution","2560x1440",null,"lg_27gs95qe","Official product heading: QHD 1440p"),
    claim("monitor-lg-27gs95qe-b","refresh_rate",240,"Hz","lg_27gs95qe","Key features: up to 240 Hz",{ conditions:{ maximum:true,requires:"DisplayPort 1.4 or HDMI 2.1 compatible GPU" } }),
    claim("monitor-lg-27gs95qe-b","response_time",0.03,"ms_gtg","lg_27gs95qe","Key features: 0.03 ms",{ conditions:{ metric:"GTG" } }),
    claim("monitor-sony-inzone-m9-ii","panel","ips_lcd",null,"sony_inzone_m9ii_specs","Display: panel type"),
    claim("monitor-sony-inzone-m9-ii","resolution","3840x2160",null,"sony_inzone_m9ii_specs","Display resolution"),
    claim("monitor-sony-inzone-m9-ii","refresh_rate",160,"Hz","sony_inzone_m9ii_specs","Refresh rate",{ conditions:{ connection:"DisplayPort",range:"24-160 Hz" } }),
    claim("monitor-sony-inzone-m9-ii","response_time",1,"ms","sony_inzone_m9ii_specs","Response time",{ conditions:{ mode:"Faster Mode",metric:"manufacturer_unspecified" } }),

    claim("audio-logitech-pro-x-2-lightspeed","driver_size",50,"mm","logitech_pro_x2_audio","Official feature: 50 mm graphene drivers"),
    claim("audio-logitech-pro-x-2-lightspeed","battery_life",50,"hours","logitech_pro_x2_audio","LIGHTSPEED section: up to 50 hours",{ conditions:{ maximum:true } }),
    claim("audio-logitech-pro-x-2-lightspeed","connection_modes",["LIGHTSPEED wireless","Bluetooth","3.5mm wired"],null,"logitech_pro_x2_audio","Multiple connection options",{ claim_type:"manufacturer_compatibility" }),

    claim("mic-elgato-wave-3","sample_rate",96,"kHz","elgato_wave3","Wave:3 comparison: maximum sample rate",{ conditions:{ maximum:true,variant:"original Wave:3" } }),
    claim("mic-elgato-wave-3","bit_depth",24,"bit","elgato_wave3","Wave:3 Tech Specs"),
    claim("mic-elgato-wave-3","polar_pattern","cardioid",null,"elgato_wave3","Wave:3 Tech Specs"),
    claim("mic-elgato-wave-3-mk2","sample_rate",48,"kHz","elgato_wave3","Wave:3 MK.2 Tech Specs"),
    claim("mic-elgato-wave-3-mk2","bit_depth",24,"bit","elgato_wave3","Wave:3 MK.2 Tech Specs"),
    claim("mic-elgato-wave-3-mk2","polar_pattern","cardioid",null,"elgato_wave3","Wave:3 MK.2 Tech Specs"),
    claim("mic-elgato-wave-3-mk2","weight",250,"g","elgato_wave3","Wave:3 MK.2 without stand"),

    claim("capture-elgato-4k-x","interface","USB-C 3.2 Gen 2 10Gbps",null,"elgato_4k_x","Tech Specs: connection",{ claim_type:"manufacturer_compatibility" }),
    claim("capture-elgato-4k-x","passthrough_resolution","up_to_4k144",null,"elgato_4k_x","Tech Specs: recording and passthrough",{ conditions:{ maximum:true } }),
    claim("capture-elgato-4k-x","dimensions",{ width:112,depth:72,height:18 },"mm","elgato_4k_x","Tech Specs: dimensions"),
    claim("capture-elgato-4k-x","weight",91,"g","elgato_4k_x","Tech Specs: weight"),

    claim("storage-kingston-fury-renegade-g5","interface","PCIe 5.0 x4 NVMe",null,"kingston_fury_renegade_g5","Specifications: interface",{ claim_type:"manufacturer_compatibility" }),
    claim("storage-kingston-fury-renegade-g5","form_factor","M.2 2280",null,"kingston_fury_renegade_g5","Specifications: form factor",{ claim_type:"manufacturer_compatibility" }),
    claim("storage-kingston-fury-renegade-g5","sequential_read",14800,"MB/s","kingston_fury_renegade_g5","Key features: up to 14,800 MB/s",{ conditions:{ maximum:true,capacity_dependent:true } }),
    claim("storage-kingston-fury-renegade-g5","sequential_write",14000,"MB/s","kingston_fury_renegade_g5","Key features: up to 14,000 MB/s",{ conditions:{ maximum:true,capacity_dependent:true } }),
    claim("storage-kingston-fury-renegade-g5","capacity_options",[1024,2048,4096,8192],"GB","kingston_fury_renegade_g5","Specifications: capacities"),
    claim("storage-kingston-fury-renegade","interface","PCIe 4.0 x4 NVMe",null,"kingston_fury_renegade","Specifications: interface",{ claim_type:"manufacturer_compatibility" }),
    claim("storage-kingston-fury-renegade","form_factor","M.2 2280",null,"kingston_fury_renegade","Specifications: form factor",{ claim_type:"manufacturer_compatibility" }),
    claim("storage-kingston-fury-renegade","sequential_read",7300,"MB/s","kingston_fury_renegade","Specifications: up to 7,300 MB/s",{ conditions:{ maximum:true,capacity_dependent:true } }),
    claim("storage-kingston-fury-renegade","sequential_write",7000,"MB/s","kingston_fury_renegade","Specifications: up to 7,000 MB/s",{ conditions:{ maximum:true,capacity_dependent:true } }),
    claim("storage-kingston-fury-renegade","capacity_options",[1000,2000,4000],"GB","kingston_fury_renegade","Specifications: capacities"),

    claim("cpu-amd-ryzen-9-9950x3d","core_count",16,"cores","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9950x3d","thread_count",32,"threads","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9950x3d","boost_clock",5.7,"GHz","amd_ryzen_desktop_catalog","Ryzen 9000 Series table",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-9-9950x3d","tdp",170,"W","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9900x3d","core_count",12,"cores","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9900x3d","thread_count",24,"threads","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9900x3d","boost_clock",5.5,"GHz","amd_ryzen_desktop_catalog","Ryzen 9000 Series table",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-9-9900x3d","tdp",120,"W","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-7-9800x3d","core_count",8,"cores","amd_ryzen_9800x3d","General Specifications"),
    claim("cpu-amd-ryzen-7-9800x3d","thread_count",16,"threads","amd_ryzen_9800x3d","General Specifications"),
    claim("cpu-amd-ryzen-7-9800x3d","boost_clock",5.2,"GHz","amd_ryzen_9800x3d","General Specifications",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-7-9800x3d","base_clock",4.7,"GHz","amd_ryzen_9800x3d","General Specifications"),
    claim("cpu-amd-ryzen-7-9800x3d","tdp",120,"W","amd_ryzen_9800x3d","General Specifications"),
    claim("cpu-amd-ryzen-7-9800x3d","socket","AM5",null,"amd_ryzen_9800x3d","General Specifications",{ claim_type:"manufacturer_compatibility" }),
    claim("cpu-amd-ryzen-7-9700x","core_count",8,"cores","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-7-9700x","thread_count",16,"threads","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-7-9700x","boost_clock",5.5,"GHz","amd_ryzen_desktop_catalog","Ryzen 9000 Series table",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-7-9700x","tdp",65,"W","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-5-9600x","core_count",6,"cores","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-5-9600x","thread_count",12,"threads","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-5-9600x","boost_clock",5.4,"GHz","amd_ryzen_desktop_catalog","Ryzen 9000 Series table",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-5-9600x","tdp",65,"W","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9950x","core_count",16,"cores","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9950x","thread_count",32,"threads","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),
    claim("cpu-amd-ryzen-9-9950x","boost_clock",5.7,"GHz","amd_ryzen_desktop_catalog","Ryzen 9000 Series table",{ conditions:{ maximum:true } }),
    claim("cpu-amd-ryzen-9-9950x","tdp",170,"W","amd_ryzen_desktop_catalog","Ryzen 9000 Series table"),

    claim("gpu-nvidia-geforce-rtx-5090","memory_capacity",32,"GB","nvidia_rtx5090","Official overview: 32 GB"),
    claim("gpu-nvidia-geforce-rtx-5090","memory_type","GDDR7",null,"nvidia_rtx5090","Official overview"),
    claim("gpu-amd-radeon-rx-9070-xt","compute_units",64,"CU","amd_radeon_rx9070xt","GPU specifications"),
    claim("gpu-amd-radeon-rx-9070-xt","boost_clock",2970,"MHz","amd_radeon_rx9070xt","GPU specifications",{ conditions:{ maximum:true } }),
    claim("gpu-amd-radeon-rx-9070-xt","memory_capacity",16,"GB","amd_radeon_rx9070xt","GPU Memory"),
    claim("gpu-amd-radeon-rx-9070-xt","memory_type","GDDR6",null,"amd_radeon_rx9070xt","GPU Memory"),
    claim("gpu-amd-radeon-rx-9070-xt","board_power",304,"W","amd_radeon_rx9070xt","Requirements: Typical Board Power"),

    claim("network-tplink-archer-ge800-v1","wifi_generation","wifi_7",null,"tplink_archer_ge800","Specifications: 802.11be"),
    claim("network-tplink-archer-ge800-v1","bands",["2.4GHz","5GHz","6GHz"],null,"tplink_archer_ge800","Specifications: tri-band",{ claim_type:"manufacturer_compatibility" }),
    claim("network-tplink-archer-ge800-v1","wired_ports",{ ten_gbps:2,two_point_five_gbps:4 },null,"tplink_archer_ge800","Overview: two 10G and four 2.5G ports",{ claim_type:"manufacturer_compatibility" }),
    claim("network-tplink-archer-ge800-v1","mesh","EasyMesh",null,"tplink_archer_ge800","Overview: EasyMesh compatibility",{ claim_type:"manufacturer_compatibility" })
  ]);

  const claimsByProduct = new Map();
  for (const row of claims) {
    if (!claimsByProduct.has(row.product_id)) claimsByProduct.set(row.product_id, []);
    claimsByProduct.get(row.product_id).push(row);
  }

  const products = Object.freeze(definitions.map(row => {
    const verifiedClaims = claimsByProduct.get(row.product_id) || [];
    return Object.freeze({
      product_id:row.product_id,
      family_id:row.family_id,
      manufacturer:row.manufacturer,
      product_name:row.product_name,
      category:row.category,
      identity_granularity:row.identity_granularity,
      manufacturer_model_id:row.manufacturer_model_id,
      verified_aliases:Object.freeze([...row.verified_aliases]),
      source_ids:Object.freeze([row.source_id]),
      identity_evidence:Object.freeze([{ source_id:row.source_id, locator:row.identity_locator, checked_at:CHECKED_AT }]),
      checked_at:CHECKED_AT,
      region_scope:Object.freeze([...row.region_scope]),
      lifecycle_status:row.lifecycle_status,
      identity_verified:true,
      specs_verified_fields:Object.freeze([...new Set(verifiedClaims.filter(item => item.claim_type !== "manufacturer_identity").map(item => item.field))]),
      comparison_ready_scopes:Object.freeze([...row.comparison_ready_scopes]),
      recommendation_eligible:false,
      public_ui_connected:false,
      local_ui_selectable:true
    });
  }));

  const byCategory = Object.freeze(Object.fromEntries(CATEGORIES.map(category => [category,Object.freeze(products.filter(item => item.category === category))])));

  function normalizeSearch(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\-_:+|™®()]+/g,"");
  }

  function search(query, options={}) {
    const needle = normalizeSearch(query);
    const category = options.category || null;
    return products.filter(item => {
      if (category && item.category !== category) return false;
      if (!needle) return true;
      return [item.product_name,item.manufacturer,item.manufacturer_model_id,...item.verified_aliases]
        .filter(Boolean).some(value => normalizeSearch(value).includes(needle));
    });
  }

  function find(productId) {
    return products.find(item => item.product_id === productId) || null;
  }

  function publicView(product) {
    if (!product) return null;
    return Object.freeze(Object.fromEntries(PUBLIC_FIELDS.map(key => [key,product[key]])));
  }

  function importProducts(existing, incoming=products) {
    const map = new Map((existing || []).map(item => [item.product_id,item]));
    for (const item of incoming) map.set(item.product_id,item);
    return [...map.values()].sort((a,b) => a.product_id.localeCompare(b.product_id));
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  }

  function unsafeText(value) {
    return /[<>&]/.test(String(value || ""));
  }

  function validateProduct(row) {
    const errors = [];
    for (const key of ["product_id","family_id","manufacturer","product_name","category","identity_granularity","verified_aliases","source_ids","identity_evidence","checked_at","region_scope","lifecycle_status","identity_verified","specs_verified_fields","comparison_ready_scopes","recommendation_eligible","public_ui_connected","local_ui_selectable"]) {
      if (row?.[key] === undefined || row?.[key] === "") errors.push(`${key} is required`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row?.product_id || "")) errors.push("product_id is invalid");
    if (["__proto__","prototype","constructor"].some(key => String(row?.product_id || "").includes(key))) errors.push("product_id is unsafe");
    if (!CATEGORIES.includes(row?.category)) errors.push("category is invalid");
    if (!IDENTITY_GRANULARITIES.includes(row?.identity_granularity)) errors.push("identity_granularity is invalid");
    if (!LIFECYCLE_STATES.includes(row?.lifecycle_status)) errors.push("lifecycle_status is invalid");
    if (!validDate(row?.checked_at)) errors.push("checked_at is invalid");
    if (unsafeText(row?.product_name) || unsafeText(row?.manufacturer) || row?.verified_aliases?.some(unsafeText)) errors.push("display text is unsafe");
    if (!Array.isArray(row?.source_ids) || row.source_ids.length === 0) errors.push("source_ids must not be empty");
    for (const sourceId of row?.source_ids || []) if (!registry.find(sourceId)) errors.push(`source_id is missing:${sourceId}`);
    if (row?.identity_verified !== true) errors.push("identity_verified must be true for registered rows");
    if (row?.recommendation_eligible !== false) errors.push("recommendation_eligible must default false");
    if (row?.public_ui_connected !== false) errors.push("public_ui_connected must remain false");
    return errors;
  }

  function validateClaim(row) {
    const errors = [];
    for (const key of ["claim_id","product_id","field","value","claim_type","subject_scope","conditions","source_id","source_locator","checked_at","status"]) {
      if (row?.[key] === undefined || row?.[key] === "") errors.push(`${key} is required`);
    }
    if (!CLAIM_TYPES.includes(row?.claim_type)) errors.push("claim_type is invalid");
    if (!find(row?.product_id)) errors.push("product_id is missing");
    if (!registry.find(row?.source_id)) errors.push("source_id is missing");
    if (!validDate(row?.checked_at)) errors.push("checked_at is invalid");
    if (unsafeText(row?.source_locator)) errors.push("source_locator is unsafe");
    return errors;
  }

  function validateCatalog() {
    const errors = [];
    const productIds = new Set();
    const claimIds = new Set();
    const aliasOwners = new Map();
    for (const row of products) {
      for (const error of validateProduct(row)) errors.push(`${row.product_id}:${error}`);
      if (productIds.has(row.product_id)) errors.push(`${row.product_id}:duplicate product_id`);
      productIds.add(row.product_id);
      for (const alias of row.verified_aliases) {
        const key = normalizeSearch(alias);
        const owner = aliasOwners.get(key);
        if (owner && owner !== row.product_id && row.identity_granularity !== "variant") errors.push(`${row.product_id}:duplicate alias:${alias}`);
        aliasOwners.set(key,row.product_id);
      }
    }
    for (const row of claims) {
      for (const error of validateClaim(row)) errors.push(`${row.claim_id}:${error}`);
      if (claimIds.has(row.claim_id)) errors.push(`${row.claim_id}:duplicate claim_id`);
      claimIds.add(row.claim_id);
    }
    return errors;
  }

  function summarize() {
    const category_counts = Object.fromEntries(CATEGORIES.map(category => [category,byCategory[category].length]).filter(([,count]) => count));
    const manufacturer_counts = {};
    for (const item of products) manufacturer_counts[item.manufacturer] = (manufacturer_counts[item.manufacturer] || 0) + 1;
    return Object.freeze({
      base_models:products.filter(item => item.identity_granularity !== "variant").length,
      variants:products.filter(item => item.identity_granularity === "variant").length,
      aliases:products.reduce((sum,item) => sum + item.verified_aliases.length,0),
      identity_verified:products.filter(item => item.identity_verified).length,
      with_verified_specs:products.filter(item => item.specs_verified_fields.length).length,
      comparison_ready:products.filter(item => item.comparison_ready_scopes.length).length,
      recommendation_eligible:products.filter(item => item.recommendation_eligible).length,
      live_deployed:products.filter(item => item.public_ui_connected).length,
      category_counts:Object.freeze(category_counts),
      manufacturer_counts:Object.freeze(manufacturer_counts)
    });
  }

  return { VERSION, CHECKED_AT, CATEGORIES, IDENTITY_GRANULARITIES, LIFECYCLE_STATES, CLAIM_TYPES, products, claims, byCategory, find, search, normalizeSearch, publicView, importProducts, validateProduct, validateClaim, validateCatalog, summarize };
});
