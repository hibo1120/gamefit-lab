(function (root, factory) {
  const analytics = factory(root);

  root.GameFitAnalytics = analytics;
  root.trackAffiliateClick = analytics.trackAffiliateClick;

  if (typeof module === "object" && module.exports) {
    module.exports = analytics;
  }
})(typeof window !== "undefined" ? window : globalThis, function createAnalytics(root) {
  "use strict";

  const STARTED_KEY = "gamefit_lab_diagnosis_started";
  const FALLBACK_GAMES = new Set(["valorant", "apex", "fortnite", "mhwilds"]);
  const VALID_DEVICES = new Set(["desktop", "laptop"]);
  const VALID_RECOMMENDATIONS = new Set(["keep", "monitor", "ram", "storage", "cpu_gpu", "pc_replacement", "device"]);
  const RECOMMENDATION_ALIASES = { performance: "cpu_gpu", replacement: "pc_replacement" };
  const VALID_BUDGET_BANDS = new Set(["100", "300", "500", "1000", "1500", "2000", "10000", "30000", "50000", "100000", "150000", "200000"]);
  const ATTRIBUTION_PROPERTIES = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "source"];
  const PAGE_CONTEXT_PROPERTIES = ["language", "region_version", "page_source"];
  const EVENT_PROPERTIES = {
    diagnosis_page_viewed: [...ATTRIBUTION_PROPERTIES, ...PAGE_CONTEXT_PROPERTIES],
    diagnosis_started: ["game", "device_type", ...ATTRIBUTION_PROPERTIES, ...PAGE_CONTEXT_PROPERTIES],
    diagnosis_completed: [
      "game",
      "device_type",
      "current_fps_bucket",
      "target_fps",
      "monitor_hz",
      "ram_gb",
      "storage_type",
      "budget",
      "streaming",
      "top_recommendation",
      "recommendation_count",
      ...ATTRIBUTION_PROPERTIES,
      ...PAGE_CONTEXT_PROPERTIES
    ],
    diagnosis_invalid_input: ["reason", ...PAGE_CONTEXT_PROPERTIES],
    diagnosis_cta_clicked: ["source_page", "content_type", "game", "budget_band", ...PAGE_CONTEXT_PROPERTIES],
    affiliate_clicked: ["merchant", "category", "destination_type", "game", "top_recommendation", "source_page", "budget_band", ...ATTRIBUTION_PROPERTIES, ...PAGE_CONTEXT_PROPERTIES],
    result_shared: ["platform", "game", "top_recommendation", ...PAGE_CONTEXT_PROPERTIES]
  };
  const SDK_PROPERTIES = new Set([
    "token",
    "distinct_id",
    "$device_id",
    "$session_id",
    "$window_id",
    "$lib",
    "$lib_version",
    "$process_person_profile",
    "$geoip_disable"
  ]);

  let startedInMemory = false;
  let latestDiagnosis = { game: null, topRecommendation: null, budgetBand: null };

  function safeSessionStorage() {
    try {
      return root.sessionStorage || null;
    } catch (_) {
      return null;
    }
  }

  function safeCapture(eventName, properties, options) {
    try {
      const posthog = root.posthog;
      if (!posthog || typeof posthog.capture !== "function") return false;
      posthog.capture(eventName, properties || {}, options);
      return true;
    } catch (_) {
      return false;
    }
  }

  function enumValue(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
  }

  function gameValue(value, fallback = "unknown") {
    try {
      if (root.GameFitGames?.get?.(value)) return value;
    } catch (_) {
      // Fall through to the stable MVP list when configuration is unavailable.
    }
    return enumValue(value, FALLBACK_GAMES, fallback);
  }

  function recommendationValue(value) {
    const normalized = RECOMMENDATION_ALIASES[value] || value;
    return enumValue(normalized, VALID_RECOMMENDATIONS, "unknown");
  }

  function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function slugValue(value) {
    return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value)
      ? value.toLowerCase()
      : "unknown";
  }

  function attributionProperties() {
    try {
      const params = new URLSearchParams(root.location?.search || "");
      return Object.fromEntries(ATTRIBUTION_PROPERTIES.flatMap(key => {
        const value = params.get(key);
        return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value)
          ? [[key, value.toLowerCase()]]
          : [];
      }));
    } catch (_) {
      return {};
    }
  }

  function pageContextProperties() {
    const configured = root.GameFitPageContext || {};
    const documentLanguage = root.document?.documentElement?.lang;
    const language = configured.language === "en" || documentLanguage === "en" ? "en" : "ja";
    const regionVersion = configured.regionVersion === "global" || language === "en" ? "global" : "jp";
    let inferredSource = "index";
    try {
      const pathname = root.location?.pathname || "";
      inferredSource = pathname.split("/").filter(Boolean).at(-1)?.replace(/\.html?$/i, "") || "index";
    } catch (_) {
      // Stable default is used when location access is unavailable.
    }
    return {
      language,
      region_version: regionVersion,
      page_source: slugValue(configured.pageSource || inferredSource)
    };
  }

  function bucketCurrentFps(value) {
    const fps = numberValue(value);
    if (fps === null || fps < 60) return "under_60";
    if (fps < 120) return "60_119";
    if (fps < 144) return "120_143";
    if (fps < 240) return "144_239";
    return "240_plus";
  }

  function beforeSend(event) {
    if (!event || !Object.prototype.hasOwnProperty.call(EVENT_PROPERTIES, event.event)) return null;

    const source = event.properties || {};
    const allowed = new Set(EVENT_PROPERTIES[event.event]);
    const properties = {};

    Object.keys(source).forEach(key => {
      if (allowed.has(key) || SDK_PROPERTIES.has(key)) properties[key] = source[key];
    });

    properties.$geoip_disable = true;
    event.properties = properties;
    delete event.$set;
    delete event.$set_once;
    return event;
  }

  function trackPageViewed() {
    return safeCapture("diagnosis_page_viewed", {
      ...attributionProperties(),
      ...pageContextProperties(),
      $geoip_disable: true
    });
  }

  function trackDiagnosisStarted(input) {
    const storage = safeSessionStorage();
    let alreadyStarted = startedInMemory;

    try {
      alreadyStarted = alreadyStarted || storage?.getItem(`${STARTED_KEY}_${pageContextProperties().region_version}`) === "1";
    } catch (_) {
      // The in-memory guard still prevents duplicate events if storage is unavailable.
    }

    if (alreadyStarted) return false;

    startedInMemory = true;
    try {
      storage?.setItem(`${STARTED_KEY}_${pageContextProperties().region_version}`, "1");
    } catch (_) {
      // Analytics must never interfere with form input.
    }

    return safeCapture("diagnosis_started", {
      game: gameValue(input?.game),
      device_type: enumValue(input?.device, VALID_DEVICES, "unknown"),
      ...attributionProperties(),
      ...pageContextProperties(),
      $geoip_disable: true
    });
  }

  function completionProperties(input, result) {
    const topRecommendation = recommendationValue(result?.topRecommendation || result?.ranked?.[0]?.key);
    const game = gameValue(input?.game);
    const budgetBand = enumValue(String(input?.budget || ""), VALID_BUDGET_BANDS, null);

    latestDiagnosis = { game, topRecommendation, budgetBand };

    return {
      game,
      device_type: enumValue(input?.device, VALID_DEVICES, "unknown"),
      current_fps_bucket: bucketCurrentFps(input?.currentFps),
      target_fps: numberValue(input?.targetFps),
      monitor_hz: numberValue(input?.monitorHz),
      ram_gb: numberValue(input?.ram),
      storage_type: slugValue(input?.storage),
      budget: numberValue(input?.budget),
      streaming: input?.stream === "yes",
      top_recommendation: topRecommendation,
      recommendation_count: Array.isArray(result?.ranked) ? result.ranked.length : 0,
      ...attributionProperties(),
      ...pageContextProperties(),
      $geoip_disable: true
    };
  }

  function trackDiagnosisCompleted(input, result) {
    return safeCapture("diagnosis_completed", completionProperties(input, result));
  }

  function trackInvalidInput(reason) {
    return safeCapture("diagnosis_invalid_input", {
      reason: slugValue(reason),
      ...pageContextProperties(),
      $geoip_disable: true
    });
  }

  function trackDiagnosisCtaClicked(context) {
    const properties = {
      source_page: slugValue(context?.sourcePage),
      content_type: slugValue(context?.contentType),
      ...pageContextProperties(),
      $geoip_disable: true
    };
    const game = gameValue(context?.game, null);
    const budgetBand = enumValue(String(context?.budgetBand || ""), VALID_BUDGET_BANDS, null);

    if (game) properties.game = game;
    if (budgetBand) properties.budget_band = budgetBand;

    return safeCapture("diagnosis_cta_clicked", properties, {
      transport: "sendBeacon",
      send_instantly: true
    });
  }

  function currentGame() {
    try {
      const game = root.document?.getElementById("game")?.value;
      return gameValue(game, latestDiagnosis.game || "unknown");
    } catch (_) {
      return latestDiagnosis.game || "unknown";
    }
  }

  function currentSourcePage() {
    const attributed = attributionProperties().source;
    if (attributed) return attributed;
    try {
      const pathname = root.location?.pathname || "";
      const file = pathname.split("/").filter(Boolean).at(-1) || "index";
      return slugValue(file.replace(/\.html?$/i, ""));
    } catch (_) {
      return "unknown";
    }
  }

  function trackAffiliateClick(merchantOrContext, category, destinationType) {
    const context = typeof merchantOrContext === "object" && merchantOrContext !== null
      ? merchantOrContext
      : { merchant: merchantOrContext, category, destinationType };
    const budgetBand = enumValue(String(context.budgetBand || latestDiagnosis.budgetBand || ""), VALID_BUDGET_BANDS, null);
    const properties = {
      merchant: slugValue(context.merchant),
      category: slugValue(context.category),
      destination_type: slugValue(context.destinationType),
      game: gameValue(context.game, currentGame()),
      top_recommendation: recommendationValue(context.topRecommendation || latestDiagnosis.topRecommendation),
      source_page: slugValue(context.sourcePage || currentSourcePage()),
      ...attributionProperties(),
      ...pageContextProperties(),
      $geoip_disable: true
    };
    if (budgetBand) properties.budget_band = budgetBand;

    return safeCapture("affiliate_clicked", properties, {
      transport: "sendBeacon",
      send_instantly: true
    });
  }

  function trackResultShared(context) {
    return safeCapture("result_shared", {
      platform: enumValue(context?.platform, new Set(["x", "copy"]), "unknown"),
      game: gameValue(context?.game, latestDiagnosis.game || "unknown"),
      top_recommendation: recommendationValue(context?.topRecommendation || latestDiagnosis.topRecommendation),
      ...pageContextProperties(),
      $geoip_disable: true
    });
  }

  return {
    attributionProperties,
    pageContextProperties,
    beforeSend,
    bucketCurrentFps,
    completionProperties,
    safeCapture,
    trackAffiliateClick,
    trackDiagnosisCtaClicked,
    trackDiagnosisCompleted,
    trackDiagnosisStarted,
    trackInvalidInput,
    trackPageViewed,
    trackResultShared,
    createAnalytics
  };
});
