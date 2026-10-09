(function (root, factory) {
  const api = factory();
  root.GameFitCompatibility = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const BUFFERBLOAT_METHODS = new Set(["latency_under_load","waveform","router_queue_test"]);

  function finiteMeasurement(value) {
    if (typeof value === "boolean" || value == null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

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

  function result(issues, unknowns, evaluatedFields=[]) {
    return {
      assessment_type:"rule_evaluation",
      status:issues.some(item => item.severity === "high") ? "incompatible" :
        unknowns.length || issues.some(item => item.severity === "medium") ? "unknown" : "compatible",
      issues,
      unknowns,
      evaluated_fields:[...new Set(evaluatedFields)]
    };
  }

  function evaluateDisplayCompatibility(input) {
    const issues = evaluateDisplayLink(input);
    const unknowns = [];
    if (!input.gpu_connector) unknowns.push("gpu_connector_missing");
    if (!input.monitor_connector) unknowns.push("monitor_connector_missing");
    if (!input.cable_connector) unknowns.push("cable_connector_missing");
    if (input.gpu_connector && input.monitor_connector && input.cable_connector) {
      const endpointMatch = input.gpu_connector === input.cable_connector && input.monitor_connector === input.cable_connector;
      if (!endpointMatch) issues.push({ code:"display_connector_mismatch", severity:"high", message:"The display cable connector does not match both endpoints." });
    }
    if (input.required_bandwidth_gbps == null) unknowns.push("target_mode_bandwidth_missing");
    if (input.cable_certified_bandwidth_gbps == null) unknowns.push("cable_certified_bandwidth_missing");
    if (Number.isFinite(Number(input.required_bandwidth_gbps)) && Number.isFinite(Number(input.cable_certified_bandwidth_gbps)) &&
        Number(input.cable_certified_bandwidth_gbps) < Number(input.required_bandwidth_gbps)) {
      issues.push({ code:"certified_cable_bandwidth_insufficient", severity:"high", message:"Certified cable bandwidth is below the target mode requirement." });
    }
    return result(issues, unknowns,["gpu_connector","monitor_connector","cable_connector","required_bandwidth_gbps","cable_certified_bandwidth_gbps"]);
  }

  function evaluateUsbPath(input) {
    const issues = [];
    if (input.high_polling_device && input.connected_via_unverified_hub) {
      issues.push({ code:"high_polling_hub_risk", severity:"medium", message:"Test the device directly on the motherboard before buying replacement hardware." });
    }
    return issues;
  }

  function evaluateUsbCompatibility(input) {
    const issues = evaluateUsbPath(input);
    const unknowns = [];
    if (input.high_polling_device && input.host_high_polling_support == null) unknowns.push("host_high_polling_support_unknown");
    if (!input.device_connector) unknowns.push("device_connector_missing");
    if (!input.host_connector) unknowns.push("host_connector_missing");
    if (input.device_connector && input.host_connector && input.device_connector !== input.host_connector && input.verified_adapter !== true) {
      issues.push({ code:"usb_connector_requires_verified_adapter", severity:"high", message:"A verified compatible adapter or cable is required." });
    }
    return result(issues, unknowns,["device_connector","host_connector","host_high_polling_support","verified_adapter"]);
  }

  function evaluateAudioCompatibility(input) {
    const issues = [];
    const unknowns = [];
    if (!input.audio_connector) unknowns.push("audio_connector_missing");
    if (!input.source_connector) unknowns.push("source_connector_missing");
    if (input.requires_dac === true && input.dac_available == null) unknowns.push("dac_availability_unknown");
    if (input.requires_dac === true && input.dac_available === false) {
      issues.push({ code:"dac_required", severity:"high", message:"The audio device requires a DAC or interface not present in the setup." });
    }
    if (input.audio_connector && input.source_connector && input.audio_connector !== input.source_connector && input.verified_adapter !== true) {
      issues.push({ code:"audio_connector_mismatch", severity:"high", message:"The audio connection path is not verified." });
    }
    return result(issues, unknowns,["audio_connector","source_connector","requires_dac","dac_available","verified_adapter"]);
  }

  function evaluateNetwork(input) {
    const issues = [];
    const loss = finiteMeasurement(input.packet_loss_pct);
    const jitter = finiteMeasurement(input.jitter_ms);
    if (input.connection_type === "wifi" && loss != null && loss > 0) {
      issues.push({ code:"packet_loss_before_upgrade", severity:"high", message:"Network stability should be investigated before upgrading unrelated gaming hardware." });
    }
    if (input.connection_type === "wifi" && jitter != null && jitter >= 10) {
      issues.push({ code:"high_jitter_before_upgrade", severity:"medium", message:"High jitter can affect online play even when throughput is sufficient." });
    }
    return issues;
  }

  function evaluateNetworkCompatibility(input) {
    const issues = evaluateNetwork(input);
    const unknowns = [];
    if (["wifi","wired"].includes(input.connection_type)) {
      const loss = finiteMeasurement(input.packet_loss_pct);
      const jitter = finiteMeasurement(input.jitter_ms);
      if (input.packet_loss_pct == null) unknowns.push("packet_loss_not_measured");
      else if (loss == null || loss < 0 || loss > 100) unknowns.push("packet_loss_invalid");
      if (input.jitter_ms == null) unknowns.push("jitter_not_measured");
      else if (jitter == null || jitter < 0) unknowns.push("jitter_invalid");
      if (!BUFFERBLOAT_METHODS.has(input.bufferbloat_method)) unknowns.push("bufferbloat_method_missing_or_invalid");
      if (!["pass","degraded","fail"].includes(input.bufferbloat_result)) unknowns.push("bufferbloat_result_missing_or_invalid");
      else if (input.bufferbloat_result === "degraded") issues.push({ code:"bufferbloat_degraded", severity:"medium", message:"Latency under load is degraded and should be investigated before replacing hardware." });
      else if (input.bufferbloat_result === "fail") issues.push({ code:"bufferbloat_failed", severity:"high", message:"Latency under load failed the recorded check." });
    } else unknowns.push("connection_type_unknown");
    if (input.connection_type === "wifi") {
      if (!input.client_bands || !input.router_bands) unknowns.push("wifi_band_support_unknown");
      else if (!input.client_bands.some(band => input.router_bands.includes(band))) {
        issues.push({ code:"wifi_band_mismatch", severity:"high", message:"The router and client have no verified common Wi-Fi band." });
      }
    }
    if (input.required_wired_gbps != null) {
      if (input.router_lan_gbps == null || input.client_lan_gbps == null || input.cable_certified_gbps == null) {
        unknowns.push("wired_path_capacity_unknown");
      } else {
        const pathCapacity = Math.min(Number(input.router_lan_gbps), Number(input.client_lan_gbps), Number(input.cable_certified_gbps));
        if (pathCapacity < Number(input.required_wired_gbps)) issues.push({ code:"wired_path_capacity_insufficient", severity:"high", message:"One part of the wired path is below the required link capacity." });
      }
    }
    return result(issues, unknowns,["connection_type","packet_loss_pct","jitter_ms","bufferbloat_method","bufferbloat_result","client_bands","router_bands","wired_path_capacity"]);
  }

  function evaluateProductCompatibility(kind, input) {
    if (kind === "display") return evaluateDisplayCompatibility(input || {});
    if (kind === "usb") return evaluateUsbCompatibility(input || {});
    if (kind === "audio") return evaluateAudioCompatibility(input || {});
    if (kind === "network") return evaluateNetworkCompatibility(input || {});
    return { assessment_type:"rule_evaluation", status:"unknown", issues:[], unknowns:["compatibility_kind_unknown"], evaluated_fields:["compatibility_kind"] };
  }

  function evaluateSetup(input) {
    return [
      ...evaluateDisplayLink(input.display || {}),
      ...evaluateUsbPath(input.usb || {}),
      ...evaluateNetwork(input.network || {})
    ];
  }

  return {
    BUFFERBLOAT_METHODS,
    evaluateDisplayLink, evaluateUsbPath, evaluateNetwork, evaluateSetup,
    evaluateDisplayCompatibility, evaluateUsbCompatibility, evaluateAudioCompatibility,
    evaluateNetworkCompatibility, evaluateProductCompatibility
  };
});
