(function () {
  "use strict";

  const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign"];
  const SAFE_ATTRIBUTION_VALUE = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

  function preserveIncomingAttribution() {
    let incoming;
    try {
      incoming = new URLSearchParams(window.location.search || "");
    } catch (_) {
      return;
    }

    document.querySelectorAll('.diagnosis-cta[data-content-type="device_update"]').forEach(link => {
      try {
        const target = new URL(link.href, window.location.href);
        let changed = false;
        for (const key of ATTRIBUTION_KEYS) {
          const value = incoming.get(key);
          if (value && SAFE_ATTRIBUTION_VALUE.test(value)) {
            target.searchParams.set(key, value.toLowerCase());
            changed = true;
          }
        }
        if (changed) link.href = target.href;
      } catch (_) {
        // A malformed link must not block page rendering or analytics.
      }
    });
  }

  function trackDeviceUpdate() {
    const index = document.querySelector("[data-device-update-index]");
    if (index) {
      window.GameFitAnalytics?.trackDeviceUpdateIndexViewed({
        visibleItemCount: Number(index.dataset.visibleItemCount)
      });
    }

    const page = document.querySelector("[data-device-update-page]");
    if (!page) return;

    window.GameFitAnalytics?.trackDeviceUpdateViewed({
      productSlug: page.dataset.productSlug,
      brand: page.dataset.brand,
      category: page.dataset.category,
      evidenceState: page.dataset.evidenceState,
      decisionState: page.dataset.decisionState
    });
    preserveIncomingAttribution();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackDeviceUpdate);
  } else {
    trackDeviceUpdate();
  }
})();
