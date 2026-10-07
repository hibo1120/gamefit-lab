(function () {
  "use strict";

  function bindGuideTracking() {
    document.querySelectorAll(".diagnosis-cta").forEach(link => {
      link.addEventListener("click", () => {
        window.GameFitAnalytics?.trackDiagnosisCtaClicked({
          sourcePage: link.dataset.sourcePage,
          contentType: link.dataset.contentType,
          game: link.dataset.game,
          budgetBand: link.dataset.budgetBand
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindGuideTracking);
  } else {
    bindGuideTracking();
  }
})();
