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
  const VALID_GAMES = new Set(["valorant", "apex", "fortnite", "mhwilds"]);
  const VALID_DEVICES = new Set(["desktop", "laptop"]);
  const VALID_RECOMMENDATIONS = new Set(["keep", "monitor", "ram", "performance", "replacement"]);
  const EVENT_PROPERTIES = {
    diagnosis_page_viewed: [],
    diagnosis_started: ["game", "device_type"],
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
      "recommendation_count"
    ],
    diagnosis_invalid_input: ["reason"],
    affiliate_clicked: ["merchant", "category", "destination_type", "game", "top_recommendation"]
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
  let latestDiagnosis = { game: null, topRecommendation: null };

  function safeSessionStorage() {
    try {
      return root.sessionStorage || null;
    } catch (_) {
      return null;
    }
  }

  function safeCapture(eventName, properties) {
    try {
      const posthog = root.posthog;
      if (!posthog || typeof posthog.capture !== "function") return false;
      posthog.capture(eventName, properties || {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function enumValue(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
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
    return safeCapture("diagnosis_page_viewed", { $geoip_disable: true });
  }

  function trackDiagnosisStarted(input) {
    const storage = safeSessionStorage();
    let alreadyStarted = startedInMemory;

    try {
      alreadyStarted = alreadyStarted || storage?.getItem(STARTED_KEY) === "1";
    } catch (_) {
      // The in-memory guard still prevents duplicate events if storage is unavailable.
    }

    if (alreadyStarted) return false;

    startedInMemory = true;
    try {
      storage?.setItem(STARTED_KEY, "1");
    } catch (_) {
      // Analytics must never interfere with form input.
    }

    return safeCapture("diagnosis_started", {
      game: enumValue(input?.game, VALID_GAMES, "unknown"),
      device_type: enumValue(input?.device, VALID_DEVICES, "unknown"),
      $geoip_disable: true
    });
  }

  function completionProperties(input, result) {
    const topRecommendation = enumValue(result?.ranked?.[0]?.key, VALID_RECOMMENDATIONS, "unknown");
    const game = enumValue(input?.game, VALID_GAMES, "unknown");

    latestDiagnosis = { game, topRecommendation };

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
      $geoip_disable: true
    };
  }

  function trackDiagnosisCompleted(input, result) {
    return safeCapture("diagnosis_completed", completionProperties(input, result));
  }

  function trackInvalidInput(reason) {
    return safeCapture("diagnosis_invalid_input", {
      reason: slugValue(reason),
      $geoip_disable: true
    });
  }

  function currentGame() {
    try {
      const game = root.document?.getElementById("game")?.value;
      return enumValue(game, VALID_GAMES, latestDiagnosis.game || "unknown");
    } catch (_) {
      return latestDiagnosis.game || "unknown";
    }
  }

  function trackAffiliateClick(merchant, category, destinationType) {
    return safeCapture("affiliate_clicked", {
      merchant: slugValue(merchant),
      category: slugValue(category),
      destination_type: slugValue(destinationType),
      game: currentGame(),
      top_recommendation: latestDiagnosis.topRecommendation || "unknown",
      $geoip_disable: true
    });
  }

  return {
    beforeSend,
    bucketCurrentFps,
    completionProperties,
    safeCapture,
    trackAffiliateClick,
    trackDiagnosisCompleted,
    trackDiagnosisStarted,
    trackInvalidInput,
    trackPageViewed,
    createAnalytics
  };
});
