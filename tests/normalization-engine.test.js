const assert = require("node:assert/strict");
const test = require("node:test");
const normalization = require("../normalization-engine.js");

test("mass normalization preserves raw input and canonicalizes grams", () => {
  const rows = [
    normalization.normalizeMeasurement({ dimension:"weight", raw_value:"55 g" }),
    normalization.normalizeMeasurement({ dimension:"weight", raw_value:"0.055 kg" }),
    normalization.normalizeMeasurement({ dimension:"weight", raw_value:55 })
  ];
  assert.deepEqual(rows.map(row => row.normalized_value), [55,55,55]);
  assert.ok(rows.every(row => row.normalized_unit === "g"));
  assert.equal(rows[0].raw_value, "55 g");
});

test("length, frequency and time units normalize deterministically", () => {
  assert.equal(normalization.normalizeMeasurement({ dimension:"length", raw_value:"1 in" }).normalized_value, 25.4);
  assert.equal(normalization.normalizeMeasurement({ dimension:"frequency", raw_value:"8 kHz" }).normalized_value, 8000);
  assert.equal(normalization.normalizeMeasurement({ dimension:"latency", raw_value:"500 us" }).normalized_value, 0.5);
});

test("panel, symmetrical, hump and rapid trigger aliases use canonical values", () => {
  assert.equal(normalization.normalizeAttribute("monitor","panel","Fast IPS").normalized_value, "fast_ips");
  assert.equal(normalization.normalizeAttribute("mouse","shape","ambidextrous").normalized_value, "symmetrical");
  assert.equal(normalization.normalizeAttribute("mouse","hump","back hump").normalized_value, "rear");
  assert.equal(normalization.normalizeAttribute("mouse","hump","rear_high").normalized_value, "rear_high");
  assert.equal(normalization.normalizeAttribute("keyboard","rapid_trigger","enabled").normalized_value, true);
});

test("invalid or physically impossible measurements are rejected", () => {
  assert.throws(() => normalization.normalizeMeasurement({ dimension:"weight", raw_value:"-5 g" }), /range/);
  assert.throws(() => normalization.normalizeMeasurement({ dimension:"frequency", raw_value:"0 Hz" }), /range/);
  assert.throws(() => normalization.normalizeMeasurement({ dimension:"latency", raw_value:"NaN ms" }), /format/);
  assert.throws(() => normalization.normalizeAttribute("monitor","panel","mystery panel"), /unknown/);
});
