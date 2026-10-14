(function () {
  "use strict";

  function bindGuideTracking() {
    const links = Array.from(document.querySelectorAll(".diagnosis-cta"));
    const pageContext = links[0]?.dataset;

    if (pageContext?.contentType === "landing") {
      window.GameFitAnalytics?.trackLandingPageViewed({
        sourcePage: pageContext.sourcePage
      });
    } else if (pageContext?.contentType === "guide") {
      window.GameFitAnalytics?.trackGuidePageViewed({
        sourcePage: pageContext.sourcePage,
        game: pageContext.game,
        budgetBand: pageContext.budgetBand
      });
    }

    links.forEach(link => {
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
