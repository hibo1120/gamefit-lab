const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const guideScript = fs.readFileSync(path.join(__dirname, "..", "guide.js"), "utf8");

function runGuideScript(dataset) {
  const calls = [];
  const listeners = new Map();
  const link = {
    dataset,
    addEventListener(name, handler) { listeners.set(name, handler); }
  };
  const analytics = {
    trackLandingPageViewed(context) { calls.push({ event: "landing_page_viewed", context }); },
    trackGuidePageViewed(context) { calls.push({ event: "guide_page_viewed", context }); },
    trackDiagnosisCtaClicked(context) { calls.push({ event: "diagnosis_cta_clicked", context }); }
  };
  const context = {
    window: { GameFitAnalytics: analytics },
    document: {
      readyState: "complete",
      querySelectorAll(selector) {
        assert.equal(selector, ".diagnosis-cta");
        return [link];
      }
    }
  };

  vm.runInNewContext(guideScript, context);
  return { calls, click: () => listeners.get("click")() };
}

test("landing binds one view event before the existing CTA event", () => {
  const runtime = runGuideScript({ sourcePage: "index", contentType: "landing" });
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.calls)), [{ event: "landing_page_viewed", context: { sourcePage: "index" } }]);
  runtime.click();
  assert.equal(runtime.calls[1].event, "diagnosis_cta_clicked");
});

test("guide binds one structured view event before the existing CTA event", () => {
  const runtime = runGuideScript({
    sourcePage: "valorant_upgrade",
    contentType: "guide",
    game: "valorant",
    budgetBand: "50000"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.calls)), [{
    event: "guide_page_viewed",
    context: {
      sourcePage: "valorant_upgrade",
      game: "valorant",
      budgetBand: "50000"
    }
  }]);
  runtime.click();
  assert.equal(runtime.calls[1].event, "diagnosis_cta_clicked");
});
