const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const analyticsModule = require("../analytics.js");
const diagnosisEngine = require("../diagnosis-engine.js");
const projectRoot = path.join(__dirname, "..");
const JP_CONTEXT = { language: "ja", region_version: "jp", page_source: "index" };

function memorySessionStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

function recordingEnvironment(search = "", pageContext = null, pathname = "") {
  const calls = [];
  const root = {
    posthog: {
      capture(event, properties, options) { calls.push({ event, properties, options }); }
    },
    sessionStorage: memorySessionStorage(),
    location: { search, pathname },
    GameFitPageContext: pageContext,
    document: {
      getElementById() { return { value: "valorant" }; }
    }
  };

  return { analytics: analyticsModule.createAnalytics(root), calls };
}

test("diagnosis works when PostHog is unavailable", () => {
  const result = diagnosisEngine.diagnoseInputs({
    game: "valorant",
    currentFps: "100",
    targetFps: "144",
    monitorHz: "144",
    ram: "16",
    storage: "nvme",
    budget: "50000",
    device: "desktop",
    stream: "no"
  });

  const analytics = analyticsModule.createAnalytics({ location: { search: "" } });
  assert.equal(result.game.display_name, "VALORANT");
  assert.equal(result.ranked.length, 5);
  assert.equal(analytics.trackDiagnosisCompleted({}, result), false);
});

test("first form interaction captures diagnosis_started once per session", () => {
  const { analytics, calls } = recordingEnvironment();
  const input = { game: "apex", device: "laptop" };

  assert.equal(analytics.trackDiagnosisStarted(input), true);
  assert.equal(analytics.trackDiagnosisStarted(input), false);
  assert.deepEqual(calls, [{
    event: "diagnosis_started",
    properties: { game: "apex", device_type: "laptop", ...JP_CONTEXT, $geoip_disable: true },
    options: undefined
  }]);
});

test("diagnosis_completed uses the required privacy-safe properties", () => {
  const { analytics, calls } = recordingEnvironment();
  const input = {
    game: "fortnite",
    device: "desktop",
    currentFps: "143",
    targetFps: "240",
    monitorHz: "165",
    ram: "32",
    storage: "nvme",
    budget: "100000",
    stream: "yes",
    hardware: "SECRET CPU / GPU FREE TEXT"
  };
  const result = { ranked: [{ key: "cpu_gpu" }, { key: "ram" }] };

  assert.equal(analytics.trackDiagnosisCompleted(input, result), true);
  assert.equal(calls[0].event, "diagnosis_completed");
  assert.deepEqual(calls[0].properties, {
    game: "fortnite",
    device_type: "desktop",
    current_fps_bucket: "120_143",
    target_fps: 240,
    monitor_hz: 165,
    ram_gb: 32,
    storage_type: "nvme",
    budget: 100000,
    streaming: true,
    top_recommendation: "cpu_gpu",
    recommendation_count: 2,
    ...JP_CONTEXT,
    $geoip_disable: true
  });
  assert.equal(calls[0].options, undefined);
  assert.equal(JSON.stringify(calls[0]).includes("SECRET"), false);
  assert.equal(Object.hasOwn(calls[0].properties, "hardware"), false);
});

test("FPS values are converted to the documented buckets", () => {
  const bucket = analyticsModule.bucketCurrentFps;
  assert.equal(bucket(59), "under_60");
  assert.equal(bucket(60), "60_119");
  assert.equal(bucket(119), "60_119");
  assert.equal(bucket(120), "120_143");
  assert.equal(bucket(143), "120_143");
  assert.equal(bucket(144), "144_239");
  assert.equal(bucket(239), "144_239");
  assert.equal(bucket(240), "240_plus");
});

test("invalid input captures only a normalized reason", () => {
  const { analytics, calls } = recordingEnvironment();

  assert.equal(analytics.trackInvalidInput("current_fps_above_maximum"), true);
  assert.deepEqual(calls[0], {
    event: "diagnosis_invalid_input",
    properties: { reason: "current_fps_above_maximum", ...JP_CONTEXT, $geoip_disable: true },
    options: undefined
  });
});

test("before_send rejects unrelated events and strips non-allowlisted data", () => {
  assert.equal(analyticsModule.beforeSend({ event: "$autocapture", properties: {} }), null);

  const event = analyticsModule.beforeSend({
    event: "diagnosis_completed",
    properties: {
      token: "project-token",
      distinct_id: "anonymous-id",
      game: "valorant",
      hardware: "must not leave the browser",
      $current_url: "https://example.test/?email=private@example.test"
    },
    $set: { email: "private@example.test" }
  });

  assert.deepEqual(event.properties, {
    token: "project-token",
    distinct_id: "anonymous-id",
    game: "valorant",
    $geoip_disable: true
  });
  assert.equal(Object.hasOwn(event, "$set"), false);
});

test("affiliate helper sends the complete normalized context", () => {
  const { analytics, calls } = recordingEnvironment();

  analytics.trackAffiliateClick({
    merchant: "example_store",
    category: "monitor",
    destinationType: "product_page",
    game: "apex",
    topRecommendation: "monitor",
    sourcePage: "diagnose",
    budgetBand: "50000"
  });
  assert.deepEqual(calls[0], {
    event: "affiliate_clicked",
    properties: {
      merchant: "example_store",
      category: "monitor",
      destination_type: "product_page",
      game: "apex",
      top_recommendation: "monitor",
      source_page: "diagnose",
      budget_band: "50000",
      ...JP_CONTEXT,
      $geoip_disable: true
    },
    options: { transport: "sendBeacon", send_instantly: true }
  });
});

test("UTM and source attribution are retained on page view and completion", () => {
  const { analytics, calls } = recordingEnvironment("?utm_source=gamefit&utm_medium=content&utm_campaign=initial_guides&source=budget_50000&email=private%40example.test");
  const input = {
    game: "apex", device: "desktop", currentFps: "100", targetFps: "144",
    monitorHz: "144", ram: "16", storage: "nvme", budget: "50000", stream: "no"
  };

  analytics.trackPageViewed();
  analytics.trackDiagnosisCompleted(input, { ranked: [{ key: "cpu_gpu" }] });

  for (const call of calls) {
    assert.equal(call.properties.utm_source, "gamefit");
    assert.equal(call.properties.utm_medium, "content");
    assert.equal(call.properties.utm_campaign, "initial_guides");
    assert.equal(call.properties.source, "budget_50000");
    assert.equal(Object.hasOwn(call.properties, "email"), false);
  }
});

test("growth attribution is retained from landing through start and affiliate click", () => {
  const search = "?utm_source=youtube&utm_medium=shorts&utm_campaign=gamefit_growth_v1&utm_content=yt_s01&source=yt_s01&hardware=private";
  const { analytics, calls } = recordingEnvironment(search);

  analytics.trackPageViewed();
  analytics.trackDiagnosisStarted({ game: "valorant", device: "desktop" });
  analytics.trackAffiliateClick({
    merchant: "example_store",
    category: "monitor",
    destinationType: "product_page",
    game: "valorant",
    topRecommendation: "monitor",
    sourcePage: "diagnose"
  });

  for (const call of calls) {
    assert.equal(call.properties.utm_source, "youtube");
    assert.equal(call.properties.utm_medium, "shorts");
    assert.equal(call.properties.utm_campaign, "gamefit_growth_v1");
    assert.equal(call.properties.utm_content, "yt_s01");
    assert.equal(call.properties.source, "yt_s01");
    assert.equal(JSON.stringify(call).includes("private"), false);
  }
});

test("result_shared captures only platform, game, and recommendation", () => {
  const { analytics, calls } = recordingEnvironment();

  analytics.trackResultShared({
    platform: "x",
    game: "fortnite",
    topRecommendation: "storage",
    hardware: "SECRET CPU / GPU",
    shareText: "PRIVATE"
  });

  assert.deepEqual(calls[0], {
    event: "result_shared",
    properties: {
      platform: "x",
      game: "fortnite",
      top_recommendation: "storage",
      ...JP_CONTEXT,
      $geoip_disable: true
    },
    options: undefined
  });
  assert.equal(JSON.stringify(calls[0]).includes("SECRET"), false);
  assert.equal(JSON.stringify(calls[0]).includes("PRIVATE"), false);
});

test("guide CTA capture sends only contextual properties with beacon transport", () => {
  const { analytics, calls } = recordingEnvironment();

  analytics.trackDiagnosisCtaClicked({
    sourcePage: "valorant_upgrade",
    contentType: "guide",
    game: "valorant",
    budgetBand: "50000",
    freeText: "must not be sent"
  });

  assert.deepEqual(calls[0], {
    event: "diagnosis_cta_clicked",
    properties: {
      source_page: "valorant_upgrade",
      content_type: "guide",
      game: "valorant",
      budget_band: "50000",
      ...JP_CONTEXT,
      $geoip_disable: true
    },
    options: { transport: "sendBeacon", send_instantly: true }
  });
});

test("Global events carry comparable language, region, and page context without hardware text", () => {
  const { analytics, calls } = recordingEnvironment(
    "?utm_source=x&utm_medium=social&utm_campaign=gamefit_global_test&utm_content=en_x_09&source=en_x_09",
    { language: "en", regionVersion: "global", pageSource: "en_diagnose" },
    "/gamefit-lab/en/diagnose.html"
  );
  const input = {
    game: "valorant", device: "desktop", currentFps: "100", targetFps: "144",
    monitorHz: "144", ram: "16", storage: "nvme", budget: "500", stream: "no",
    hardware: "SECRET GLOBAL CPU GPU"
  };
  const result = { topRecommendation: "cpu_gpu", ranked: [{ key: "cpu_gpu" }] };

  analytics.trackPageViewed();
  analytics.trackDiagnosisStarted(input);
  analytics.trackDiagnosisCompleted(input, result);
  analytics.trackDiagnosisCtaClicked({ sourcePage: "en_index", contentType: "landing", budgetBand: "500" });
  analytics.trackAffiliateClick({ merchant: "test_us", category: "cpu_gpu", destinationType: "manufacturer_store", game: "valorant", topRecommendation: "cpu_gpu", sourcePage: "en_diagnose", budgetBand: "500" });
  analytics.trackResultShared({ platform: "x", game: "valorant", topRecommendation: "cpu_gpu", hardware: "SECRET GLOBAL CPU GPU" });

  assert.deepEqual(calls.map(call => call.event), [
    "diagnosis_page_viewed", "diagnosis_started", "diagnosis_completed",
    "diagnosis_cta_clicked", "affiliate_clicked", "result_shared"
  ]);
  for (const call of calls) {
    assert.equal(call.properties.language, "en", call.event);
    assert.equal(call.properties.region_version, "global", call.event);
    assert.equal(call.properties.page_source, "en_diagnose", call.event);
    assert.equal(JSON.stringify(call).includes("SECRET"), false, call.event);
  }
  assert.equal(calls[2].properties.budget, 500);
  assert.equal(calls[4].properties.budget_band, "500");
});

test("PostHog configuration is anonymous, explicit-only, and replay-free", () => {
  const config = fs.readFileSync(path.join(projectRoot, "posthog-init.js"), "utf8");

  assert.match(config, /person_profiles:\s*"identified_only"/);
  assert.match(config, /persistence:\s*"sessionStorage"/);
  assert.match(config, /autocapture:\s*false/);
  assert.match(config, /capture_pageview:\s*false/);
  assert.match(config, /capture_pageleave:\s*false/);
  assert.match(config, /disable_session_recording:\s*true/);
  assert.doesNotMatch(config, /posthog\.identify\s*\(/);
});
