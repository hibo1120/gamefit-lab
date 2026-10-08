(function (root, factory) {
  const api = factory();
  root.GameFitGlobal = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function createGlobalLocale() {
  "use strict";

  const BUDGET_TO_ENGINE = Object.freeze({
    "100": 10000,
    "300": 30000,
    "500": 50000,
    "1000": 100000,
    "1500": 150000,
    "2000": 200000
  });
  const GAME_COPY = Object.freeze({
    valorant: Object.freeze({ note: "A competitive shooter where high, stable frame rates and display refresh can matter more than ultra settings." }),
    apex: Object.freeze({ note: "A fast battle royale that benefits from balanced CPU/GPU performance and consistent frame pacing." }),
    fortnite: Object.freeze({ note: "Performance varies widely by rendering mode and settings, so separate frame-rate issues from storage and loading issues." }),
    mhwilds: Object.freeze({ note: "A demanding title where lowering settings, checking official requirements, and comparing a larger upgrade may be more realistic." })
  });
  const ERROR_MESSAGES = Object.freeze({
    game_invalid: "Choose a supported game.",
    current_fps_invalid: "Current FPS must be between 1 and 1000.",
    target_fps_invalid: "Target FPS must be between 1 and 1000.",
    monitor_hz_invalid: "Monitor refresh rate must be between 1 and 1000 Hz.",
    ram_invalid: "RAM must be between 1 and 1024 GB.",
    budget_invalid: "Choose a budget band.",
    storage_invalid: "Choose your current storage type.",
    device_invalid: "Choose desktop or gaming laptop.",
    stream_invalid: "Choose whether you stream or edit video."
  });

  function budgetToEngine(value) {
    const mapped = BUDGET_TO_ENGINE[String(value || "")];
    if (!mapped) {
      const error = new Error(ERROR_MESSAGES.budget_invalid);
      error.code = "budget_invalid";
      throw error;
    }
    return mapped;
  }

  function titleFor(key, input) {
    if (key === "keep") {
      const ratio = Number(input.currentFps) / Number(input.targetFps);
      return ratio >= .95 ? "Keep your current setup" : "Wait and save your budget";
    }
    return ({
      monitor: "Upgrade your monitor",
      ram: "Upgrade RAM",
      storage: "Upgrade storage",
      cpu_gpu: "Check the CPU/GPU bottleneck",
      pc_replacement: "Compare a PC replacement",
      device: "Improve input devices"
    })[key] || "Review your setup";
  }

  function reasonFor(key, input, rawResult) {
    const current = Number(input.currentFps);
    const target = Number(input.targetFps);
    const monitor = Number(input.monitorHz);
    const ram = Number(input.ram);
    const budget = Number(input.budget);
    const game = rawResult.game;
    const ratio = current / target;
    const minimumRam = game.ram_requirement.gamefit_minimum_gb || game.ram_requirement.official_minimum_gb;
    const comfortableRam = game.ram_requirement.gamefit_comfortable_gb;

    if (key === "keep") {
      return ratio >= .95
        ? `You are already close to your ${target} FPS target. A major purchase may deliver little practical value right now.`
        : `At the $${budget}${budget === 2000 ? "+" : ""} band, saving toward a more meaningful upgrade may beat a small stopgap purchase.`;
    }
    if (key === "monitor") {
      return current > monitor
        ? `Your PC is producing about ${current} FPS, while the monitor refreshes at ${monitor} Hz. The display may be the next limit you actually notice.`
        : `Match monitor refresh rate to the frame rate your PC can sustain, not to a headline specification.`;
    }
    if (key === "ram") {
      if (ram < minimumRam) return `${ram} GB is below the GameFit working baseline for ${game.display_name}. Check supported capacity and memory configuration first.`;
      if (ram < comfortableRam) return `${comfortableRam} GB may provide more headroom for ${game.display_name}, especially with streaming, browsers, or editing tools open.`;
      return `${ram} GB is already reasonable for this use case, so more memory may not be the highest-value purchase.`;
    }
    if (key === "storage") {
      if (input.storage === "hdd") return "Moving the game from a hard drive to an SSD can improve loading and asset streaming, but it does not guarantee higher average FPS.";
      return "Only prioritize storage if capacity, loading, or an official SSD requirement is the problem you are trying to solve.";
    }
    if (key === "cpu_gpu") {
      return ratio < .8
        ? `The gap from ${current} to ${target} FPS is large enough to check GPU load, CPU limits, temperatures, and settings before choosing a part. A targeted upgrade may be enough.`
        : "Test the same game scene at lower settings and compare CPU/GPU utilization before buying either part.";
    }
    if (key === "pc_replacement") {
      return input.device === "laptop"
        ? "Gaming laptops usually offer limited CPU/GPU upgrade options, so compare a replacement with the cost and limits of smaller upgrades."
        : "If several core parts, the power supply, and the platform all need work, a replacement can be more coherent than stacking upgrades.";
    }
    return "Only move to peripherals after the PC and display are already meeting your performance goal.";
  }

  function adviceFor(key) {
    return ({
      keep: "Do not spend just because a budget is available. Re-test the games and settings you actually use, then keep the money for a change you can clearly justify.",
      monitor: "Choose a refresh rate your PC can sustain. Also compare resolution, adaptive sync, panel behavior, and response performance.",
      ram: "Check free slots, supported speed and capacity, and whether a matched kit is required before ordering memory.",
      storage: "Confirm capacity, interface, free slots, backup needs, and migration steps. Treat loading improvements separately from FPS gains.",
      cpu_gpu: "Measure GPU usage, CPU limits, temperatures, and how performance reacts to lower settings. Upgrade the part that is actually holding the target back.",
      pc_replacement: "Compare the complete cost, warranty, power, cooling, resolution target, and expected lifespan—not just the GPU name.",
      device: "Comfort and control are personal. Try the mouse or keyboard if possible instead of assuming a more expensive device is automatically better."
    })[key] || "Use the result as a shortlist, then verify compatibility and current official specifications.";
  }

  function localizeResult(rawResult, input) {
    const ranked = rawResult.ranked.map(item => ({
      ...item,
      title: titleFor(item.key, input),
      reasons: [reasonFor(item.key, input, rawResult)]
    }));
    return {
      ...rawResult,
      budget: Number(input.budget),
      budgetLabel: `$${input.budget}${String(input.budget) === "2000" ? "+" : ""}`,
      game: { ...rawResult.game, notes: GAME_COPY[rawResult.game.id]?.note || "Performance varies by settings and hardware." },
      ranked,
      topRecommendation: ranked[0].key,
      advice: adviceFor(ranked[0].key)
    };
  }

  function errorMessage(code, fallback) {
    return ERROR_MESSAGES[code] || fallback || "Check the form and try again.";
  }

  return { BUDGET_TO_ENGINE, ERROR_MESSAGES, GAME_COPY, budgetToEngine, errorMessage, localizeResult, reasonFor, titleFor };
});
