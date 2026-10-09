(function (root, factory) {
  const api = factory();
  root.GameFitCompatibility = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function evaluateDisplayLink(input) {
    const issues = [];
    if (input.monitor_refresh_hz && input.output_max_hz && input.output_max_hz < input.monitor_refresh_hz) {
      issues.push({ code:"output_refresh_bottleneck", severity:"high", message:"Current output path cannot expose the monitor's configured maximum refresh rate." });
    }
    if (input.required_bandwidth_gbps && input.link_bandwidth_gbps && input.link_bandwidth_gbps < input.required_bandwidth_gbps) {
      issues.push({ code:"display_bandwidth_insufficient", severity:"high", message:"The current display link may not provide enough bandwidth for the target mode." });
    }
    return issues;
  }

  function evaluateUsbPath(input) {
    const issues = [];
    if (input.high_polling_device && input.connected_via_unverified_hub) {
      issues.push({ code:"high_polling_hub_risk", severity:"medium", message:"Test the device directly on the motherboard before buying replacement hardware." });
    }
    return issues;
  }

  function evaluateNetwork(input) {
    const issues = [];
    if (input.connection_type === "wifi" && input.packet_loss_pct > 0) {
      issues.push({ code:"packet_loss_before_upgrade", severity:"high", message:"Network stability should be investigated before upgrading unrelated gaming hardware." });
    }
    if (input.connection_type === "wifi" && input.jitter_ms >= 10) {
      issues.push({ code:"high_jitter_before_upgrade", severity:"medium", message:"High jitter can affect online play even when throughput is sufficient." });
    }
    return issues;
  }

  function evaluateSetup(input) {
    return [
      ...evaluateDisplayLink(input.display || {}),
      ...evaluateUsbPath(input.usb || {}),
      ...evaluateNetwork(input.network || {})
    ];
  }

  return { evaluateDisplayLink, evaluateUsbPath, evaluateNetwork, evaluateSetup };
});
