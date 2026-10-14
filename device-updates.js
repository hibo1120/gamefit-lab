(function () {
  "use strict";

  function trackDeviceUpdate() {
    const page = document.querySelector("[data-device-update-page]");
    if (!page) return;

    window.GameFitAnalytics?.trackDeviceUpdateViewed({
      productSlug: page.dataset.productSlug,
      brand: page.dataset.brand,
      category: page.dataset.category,
      evidenceState: page.dataset.evidenceState,
      decisionState: page.dataset.decisionState
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackDeviceUpdate);
  } else {
    trackDeviceUpdate();
  }
})();
