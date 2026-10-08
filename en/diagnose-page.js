(function (root) {
  "use strict";
  const games = root.GameFitGames;
  const engine = root.GameFitDiagnosis;
  const locale = root.GameFitGlobal;
  const sharing = root.GameFitGlobalSharing;
  if (!games || !engine || !locale || !sharing) throw new Error("GameFit Global configuration failed to load");

  const form = document.getElementById("diagnosis-form");
  const gameSelect = document.getElementById("game");
  const sourceLinks = document.getElementById("official-source-links");
  let latestResult = null;

  function option(game) {
    const item = document.createElement("option");
    item.value = game.id;
    item.textContent = game.display_name;
    return item;
  }

  function populateGames() {
    const requested = new URLSearchParams(root.location.search).get("game");
    gameSelect.replaceChildren(...games.list().map(option));
    if (games.get(requested)) gameSelect.value = requested;
  }

  function populateSources() {
    sourceLinks.replaceChildren(...games.list().map(game => {
      const link = document.createElement("a");
      link.href = game.official_requirement_sources?.global || game.official_requirement_source;
      link.textContent = game.display_name;
      link.rel = "noopener";
      return link;
    }));
  }

  function renderResult(result, hardware, budgetBand) {
    latestResult = result;
    const summary = document.getElementById("result-summary");
    summary.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = result.game.display_name;
    summary.append(title, document.createElement("br"));
    summary.append(`${result.current} FPS now → ${result.target} FPS target / ${result.monitor} Hz / ${result.ram} GB RAM / ${result.budgetLabel}`);
    if (hardware) summary.append(document.createElement("br"), `Local setup note: ${hardware}`);
    summary.append(document.createElement("br"), result.game.notes);

    document.getElementById("ranking").replaceChildren(...result.ranked.map((item, index) => {
      const card = document.createElement("li");
      card.className = "rank-card";
      card.dataset.recommendationCategory = item.key;
      const number = document.createElement("span");
      number.className = "rank-number";
      number.textContent = String(index + 1);
      const body = document.createElement("div");
      const heading = document.createElement("h3");
      heading.className = "rank-title";
      heading.textContent = item.title;
      const reason = document.createElement("p");
      reason.className = "rank-reason";
      reason.textContent = item.reasons[0];
      body.append(heading, reason);
      const score = document.createElement("span");
      score.className = "rank-score";
      score.textContent = `${item.score} pt`;
      card.append(number, body, score);
      return card;
    }));

    document.getElementById("recommendation").textContent = result.advice;
    document.getElementById("share-status").textContent = "";
    root.GameFitAffiliate?.render(document.getElementById("affiliate-recommendations"), result, {
      region: "US",
      language: "en",
      sourcePage: new URLSearchParams(root.location.search).get("source") || "en_diagnose",
      budgetBand
    });
    document.getElementById("initial-state").hidden = true;
    document.getElementById("result-content").hidden = false;
  }

  function context(platform) {
    return { platform, game: latestResult?.game?.id, topRecommendation: latestResult?.topRecommendation };
  }

  document.getElementById("share-x").addEventListener("click", () => {
    if (!latestResult) return;
    root.open(sharing.xShareUrl(latestResult), "_blank", "noopener,noreferrer");
    root.GameFitAnalytics?.trackResultShared(context("x"));
  });
  document.getElementById("copy-diagnosis-url").addEventListener("click", async () => {
    if (!latestResult) return;
    const status = document.getElementById("share-status");
    try {
      await sharing.copyDiagnosisUrl();
      status.textContent = "Diagnosis link copied.";
      root.GameFitAnalytics?.trackResultShared(context("copy"));
    } catch (_) {
      status.textContent = "Could not copy the link. Check your browser permissions.";
    }
  });

  function trackingInput() {
    root.GameFitAnalytics?.trackDiagnosisStarted(Object.fromEntries(new FormData(form)));
  }

  populateGames();
  populateSources();
  form.addEventListener("input", trackingInput);
  form.addEventListener("change", trackingInput);
  form.addEventListener("pointerdown", trackingInput);
  form.addEventListener("keydown", trackingInput);
  form.addEventListener("invalid", event => {
    const reason = event.target.id ? `${event.target.id.replace(/[A-Z]/g, value => `_${value.toLowerCase()}`)}_invalid` : "diagnosis_invalid";
    root.GameFitAnalytics?.trackInvalidInput(reason);
  }, true);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const rawResult = engine.diagnoseInputs({ ...data, budget: locale.budgetToEngine(data.budget) });
      const result = locale.localizeResult(rawResult, data);
      renderResult(result, String(data.hardware || "").trim(), data.budget);
      root.GameFitAnalytics?.trackDiagnosisCompleted(data, result);
      if (root.matchMedia("(max-width: 860px)").matches) document.getElementById("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      root.GameFitAnalytics?.trackInvalidInput(error.code || "diagnosis_invalid");
      const currentFps = document.getElementById("currentFps");
      currentFps.setCustomValidity(locale.errorMessage(error.code, error.message));
      currentFps.reportValidity();
    }
  });
  document.getElementById("currentFps").addEventListener("input", event => event.currentTarget.setCustomValidity(""));
  root.GameFitAnalytics?.trackPageViewed();
})(window);
