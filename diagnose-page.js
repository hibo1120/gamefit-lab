(function (root) {
  "use strict";

  const games = root.GameFitGames;
  const diagnosis = root.GameFitDiagnosis;
  const sharing = root.GameFitSharing;
  if (!games || !diagnosis || !sharing) throw new Error("GameFit diagnosis configuration failed to load");

  const form = document.getElementById("diagnosis-form");
  const gameSelect = document.getElementById("game");
  const sourceLinks = document.getElementById("official-source-links");
  let latestResult = null;

  function populateGames() {
    const requestedGame = new URLSearchParams(root.location.search).get("game");
    gameSelect.replaceChildren(...games.list().map(game => {
      const option = document.createElement("option");
      option.value = game.id;
      option.textContent = game.display_name;
      option.selected = game.id === requestedGame;
      return option;
    }));
  }

  function populateOfficialSources() {
    sourceLinks.replaceChildren(...games.list().map(game => {
      const link = document.createElement("a");
      link.href = game.official_requirement_source;
      link.textContent = game.display_name;
      link.rel = "noopener";
      return link;
    }));
  }

  function renderResult(result, hardware) {
    const summary = document.getElementById("result-summary");
    const ranking = document.getElementById("ranking");
    const recommendation = document.getElementById("recommendation");

    summary.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = result.game.display_name;
    summary.append(title, document.createElement("br"));
    summary.append(`現在 ${result.current} FPS → 目標 ${result.target} FPS / ${result.monitor} Hz / RAM ${result.ram} GB / 予算 ${result.budget.toLocaleString("ja-JP")}円`);
    if (hardware) summary.append(document.createElement("br"), `構成メモ：${hardware}`);
    summary.append(document.createElement("br"), result.game.notes);

    ranking.replaceChildren(...result.ranked.map((item, index) => {
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

    recommendation.textContent = result.advice;
    latestResult = result;
    document.getElementById("share-status").textContent = "";
    root.GameFitAffiliate?.render(document.getElementById("affiliate-recommendations"), result, {
      sourcePage: new URLSearchParams(root.location.search).get("source") || "diagnose"
    });
    document.getElementById("initial-state").hidden = true;
    document.getElementById("result-content").hidden = false;
  }

  function sharedContext(platform) {
    return {
      platform,
      game: latestResult?.game?.id,
      topRecommendation: latestResult?.topRecommendation || latestResult?.ranked?.[0]?.key
    };
  }

  document.getElementById("share-x").addEventListener("click", () => {
    if (!latestResult) return;
    root.open(sharing.buildXShareUrl(latestResult), "_blank", "noopener,noreferrer");
    root.GameFitAnalytics?.trackResultShared(sharedContext("x"));
  });

  document.getElementById("copy-diagnosis-url").addEventListener("click", async () => {
    if (!latestResult) return;
    const status = document.getElementById("share-status");
    try {
      await sharing.copyDiagnosisUrl();
      status.textContent = "診断URLをコピーしました。";
      root.GameFitAnalytics?.trackResultShared(sharedContext("copy"));
    } catch (_) {
      status.textContent = "コピーできませんでした。ブラウザーの権限をご確認ください。";
    }
  });

  function formTrackingInput() {
    const data = Object.fromEntries(new FormData(form));
    root.GameFitAnalytics?.trackDiagnosisStarted(data);
  }

  function invalidReason(input) {
    if (input.validity?.valueMissing) return "current_fps_missing";
    if (input.validity?.rangeUnderflow) return "current_fps_below_minimum";
    if (input.validity?.rangeOverflow) return "current_fps_above_maximum";
    if (input.validity?.badInput) return "current_fps_not_number";
    return "current_fps_invalid";
  }

  populateGames();
  populateOfficialSources();

  form.addEventListener("input", formTrackingInput);
  form.addEventListener("change", formTrackingInput);
  form.addEventListener("pointerdown", formTrackingInput);
  form.addEventListener("keydown", formTrackingInput);
  form.addEventListener("invalid", event => {
    root.GameFitAnalytics?.trackInvalidInput(invalidReason(event.target));
  }, true);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const result = diagnosis.diagnoseInputs(data);
      renderResult(result, String(data.hardware || "").trim());
      root.GameFitAnalytics?.trackDiagnosisCompleted(data, result);

      if (root.matchMedia("(max-width: 860px)").matches) {
        document.getElementById("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      root.GameFitAnalytics?.trackInvalidInput(error.code || "diagnosis_invalid");
      const currentFps = document.getElementById("currentFps");
      currentFps.setCustomValidity(error.message);
      currentFps.reportValidity();
    }
  });

  document.getElementById("currentFps").addEventListener("input", event => {
    event.currentTarget.setCustomValidity("");
  });

  root.GameFitAnalytics?.trackPageViewed();
  root.GameFitLab = { diagnoseInputs: diagnosis.diagnoseInputs, games: games.games };
})(window);
