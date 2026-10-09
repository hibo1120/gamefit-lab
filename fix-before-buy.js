(function (root, factory) {
  const api = factory();
  root.GameFitFixBeforeBuy = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function suggestions(context) {
    const out = [];

    if (context.monitor_max_hz && context.os_refresh_hz && context.os_refresh_hz < context.monitor_max_hz) {
      out.push({
        code:"set_os_refresh_rate",
        cost_level:"free",
        priority:100,
        message:"Increase the OS display refresh setting before buying a new monitor."
      });
    }

    if (context.mouse_polling_hz >= 4000 && context.mouse_via_hub === true) {
      out.push({
        code:"test_mouse_direct_usb",
        cost_level:"free",
        priority:90,
        message:"Test the high-polling mouse directly on a motherboard USB port before replacing it."
      });
    }

    if (context.online_game === true && context.connection_type === "wifi" && (context.packet_loss_pct > 0 || context.jitter_ms >= 10)) {
      out.push({
        code:"network_stability_check",
        cost_level:"free_or_low",
        priority:95,
        message:"Check wired Ethernet, router placement, band selection, and local congestion before upgrading unrelated devices."
      });
    }

    return out.sort((a,b)=>b.priority-a.priority);
  }

  return { suggestions };
});
