const assert = require("node:assert/strict");
const test = require("node:test");
const fix = require("../fix-before-buy.js");

test("free fixes are suggested before buying new hardware", () => {
  const items = fix.suggestions({
    monitor_max_hz:240,
    os_refresh_hz:144,
    mouse_polling_hz:8000,
    mouse_via_hub:true,
    online_game:true,
    connection_type:"wifi",
    packet_loss_pct:1,
    jitter_ms:12
  });
  assert.equal(items[0].code, "set_os_refresh_rate");
  assert.ok(items.some(item => item.code === "test_mouse_direct_usb"));
  assert.ok(items.some(item => item.code === "network_stability_check"));
});