const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const analyticsModule = require("../analytics.js");
const projectRoot = path.join(__dirname, "..");

function memorySessionStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

function recordingEnvironment() {
  const calls = [];
  const root = {
    posthog: {
      capture(event, properties) { calls.push({ event, properties }); }
    },
    sessionStorage: memorySessionStorage(),
    document: {
      getElementById() { return { value: "valorant" }; }
    }
  };

  return { analytics: analyticsModule.createAnalytics(root), calls };
}

test("diagnosis works when PostHog is unavailable", () => {
  const html = fs.readFileSync(path.join(projectRoot, "diagnose.html"), "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  const diagnosisScript = scripts.at(-1)[1];
  const inertElement = { addEventListener() {} };
  const window = {};
  const sandbox = {
    window,
    document: { getElementById() { return inertElement; } },
    FormData: function FormData() {},
    console
  };
  window.window = window;

  vm.runInNewContext(diagnosisScript, sandbox, { filename: "diagnose-inline.js" });
  const result = window.GameFitLab.diagnoseInputs({
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

  assert.equal(result.game.name, "VALORANT");
  assert.equal(result.ranked.length, 5);
});

test("first form interaction captures diagnosis_started once per session", () => {
  const { analytics, calls } = recordingEnvironment();
  const input = { game: "apex", device: "laptop" };

  assert.equal(analytics.trackDiagnosisStarted(input), true);
  assert.equal(analytics.trackDiagnosisStarted(input), false);
  assert.deepEqual(calls, [{
    event: "diagnosis_started",
    properties: { game: "apex", device_type: "laptop", $geoip_disable: true }
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
  const result = { ranked: [{ key: "performance" }, { key: "ram" }] };

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
    top_recommendation: "performance",
    recommendation_count: 2,
    $geoip_disable: true
  });
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
    properties: { reason: "current_fps_above_maximum", $geoip_disable: true }
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

test("affiliate helper is available without adding affiliate links", () => {
  const { analytics, calls } = recordingEnvironment();

  analytics.trackAffiliateClick("example_store", "monitor", "product_page");
  assert.deepEqual(calls[0], {
    event: "affiliate_clicked",
    properties: {
      merchant: "example_store",
      category: "monitor",
      destination_type: "product_page",
      game: "valorant",
      top_recommendation: "unknown",
      $geoip_disable: true
    }
  });
});

test("PostHog configuration is anonymous, explicit-only, and replay-free", () => {
  const html = fs.readFileSync(path.join(projectRoot, "diagnose.html"), "utf8");

  assert.match(html, /person_profiles:\s*"identified_only"/);
  assert.match(html, /persistence:\s*"sessionStorage"/);
  assert.match(html, /autocapture:\s*false/);
  assert.match(html, /capture_pageview:\s*false/);
  assert.match(html, /capture_pageleave:\s*false/);
  assert.match(html, /disable_session_recording:\s*true/);
  assert.doesNotMatch(html, /posthog\.identify\s*\(/);
});
