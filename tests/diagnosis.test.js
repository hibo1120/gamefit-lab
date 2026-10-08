const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const engine = require("../diagnosis-engine.js");
const projectRoot = path.join(__dirname, "..");

function input(overrides = {}) {
  return {
    game: "valorant",
    currentFps: "100",
    targetFps: "144",
    monitorHz: "144",
    ram: "16",
    storage: "nvme",
    budget: "50000",
    device: "desktop",
    stream: "no",
    ...overrides
  };
}

test("recommendation categories use one stable seven-category vocabulary", () => {
  assert.deepEqual(Object.keys(engine.recommendationCategories), [
    "keep", "monitor", "ram", "storage", "cpu_gpu", "pc_replacement", "device"
  ]);
  const result = engine.diagnoseInputs(input());
  assert.equal(result.ranked.length, 5);
  assert.deepEqual(new Set(result.allRanked.map(item => item.key)), new Set(Object.keys(engine.recommendationCategories)));
});

test("representative results preserve MVP decisions and separate storage", () => {
  const scenarios = [
    ["VALORANT FPS gap", {}, "cpu_gpu"],
    ["VALORANT display bottleneck", { currentFps: "240", targetFps: "240", monitorHz: "60" }, "monitor"],
    ["Apex large FPS gap", { game: "apex", currentFps: "70", storage: "hdd", budget: "100000" }, "cpu_gpu"],
    ["Fortnite RAM and streaming", { game: "fortnite", currentFps: "130", ram: "8", storage: "ssd", budget: "30000", stream: "yes" }, "ram"],
    ["Wilds official SSD requirement", { game: "mhwilds", currentFps: "30", targetFps: "60", monitorHz: "60", ram: "16", storage: "hdd", budget: "100000" }, "storage"],
    ["Wilds laptop replacement", { game: "mhwilds", currentFps: "30", targetFps: "60", monitorHz: "60", ram: "16", storage: "ssd", budget: "200000", device: "laptop" }, "pc_replacement"],
    ["goal already met", { game: "apex", currentFps: "160", targetFps: "144", monitorHz: "165" }, "keep"]
  ];

  for (const [name, overrides, expected] of scenarios) {
    assert.equal(engine.diagnoseInputs(input(overrides)).topRecommendation, expected, name);
  }
});

test("invalid inputs fail with normalized codes", () => {
  const cases = [
    [{ currentFps: "0" }, "current_fps_invalid"],
    [{ currentFps: "not-a-number" }, "current_fps_invalid"],
    [{ game: "unknown" }, "game_invalid"],
    [{ storage: "tape" }, "storage_invalid"],
    [{ device: "console" }, "device_invalid"]
  ];
  for (const [overrides, code] of cases) {
    assert.throws(() => engine.diagnoseInputs(input(overrides)), error => error.code === code);
  }
});

test("budget and game guides stay aligned with diagnosis decision boundaries", () => {
  const guide = file => fs.readFileSync(path.join(projectRoot, "guides", file), "utf8");
  assert.match(guide("budget-30000.html"), /RAM|SSD|モニター/);
  assert.match(guide("budget-30000.html"), /現状維持/);
  assert.match(guide("budget-50000.html"), /CPU|GPU|RAM|SSD|モニター/);
  assert.match(guide("budget-100000.html"), /買い替え|買替/);
  assert.match(guide("valorant-upgrade.html"), /144fps以上/);
  assert.match(guide("apex-upgrade.html"), /CPU|GPU/);
  assert.match(guide("fortnite-upgrade.html"), /16GB以上のRAMとNVMe SSD/);
  assert.match(guide("mhwilds-upgrade.html"), /SSD必須/);
  assert.match(guide("upgrade-or-replace.html"), /部分アップグレード/);
  for (const file of ["valorant-upgrade.html", "apex-upgrade.html", "fortnite-upgrade.html", "mhwilds-upgrade.html"]) {
    assert.match(guide(file), /公式/);
    assert.match(guide(file), /GameFit|独自/);
  }
});
