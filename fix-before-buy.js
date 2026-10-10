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

    if (context.high_polling_device === true && context.actual_polling_verified !== true) {
      out.push({ code:"verify_actual_usb_polling", cost_level:"free", priority:92, message:"Verify the real polling rate and frame-time stability before replacing USB hardware." });
    }

    if (context.display_target_mode === true && context.display_link_verified !== true) {
      out.push({ code:"verify_display_signal_chain", cost_level:"free", priority:96, message:"Check GPU output, monitor input, cable certification, and the selected OS mode before buying a new display or cable." });
    }

    if (context.audio_issue === true && context.audio_output_settings_checked !== true) {
      out.push({ code:"check_audio_output_settings", cost_level:"free", priority:94, message:"Check the selected output device, sample rate, spatial audio, and enhancements before replacing audio hardware." });
    }

    if (context.audio_issue === true && context.direct_audio_path_tested !== true) {
      out.push({ code:"test_direct_audio_path", cost_level:"free", priority:88, message:"Test a direct known-good audio path before buying a DAC, interface, or headset." });
    }

    if (context.online_game === true && context.connection_type === "wifi" && (context.packet_loss_pct > 0 || context.jitter_ms >= 10)) {
      out.push({
        code:"network_stability_check",
        cost_level:"free_or_low",
        priority:95,
        message:"Check wired Ethernet, router placement, band selection, and local congestion before upgrading unrelated devices."
      });
    }

    if (context.online_game === true && context.bufferbloat_tested !== true) {
      out.push({ code:"test_bufferbloat_under_load", cost_level:"free", priority:91, message:"Measure latency under load separately from download speed before buying networking gear." });
    }

    if (context.connection_type === "wifi" && context.wired_tested !== true) {
      out.push({ code:"compare_temporary_wired_test", cost_level:"free_or_low", priority:93, message:"Run a temporary wired comparison to isolate Wi-Fi from ISP or game-server effects." });
    }

    if (context.os_power_mode_checked !== true && context.performance_issue === true) {
      out.push({ code:"check_os_power_and_background_load", cost_level:"free", priority:89, message:"Check OS power mode, background load, and device drivers before buying replacement hardware." });
    }

    return out.sort((a,b)=>b.priority-a.priority || a.code.localeCompare(b.code));
  }

  return { suggestions };
});
