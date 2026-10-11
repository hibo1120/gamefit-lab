const assert = require("node:assert/strict");
const test = require("node:test");
const compat = require("../compatibility-engine.js");

test("display bottlenecks are surfaced before recommending replacement hardware", () => {
  const issues = compat.evaluateDisplayLink({ monitor_refresh_hz:240, output_max_hz:144 });
  assert.ok(issues.some(item => item.code === "output_refresh_bottleneck"));
});

test("network instability is treated as a setup issue", () => {
  const issues = compat.evaluateNetwork({ connection_type:"wifi", packet_loss_pct:1, jitter_ms:15 });
  assert.ok(issues.some(item => item.code === "packet_loss_before_upgrade"));
  assert.ok(issues.some(item => item.code === "high_jitter_before_upgrade"));
});