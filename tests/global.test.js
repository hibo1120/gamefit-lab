const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const locale = require("../en/locale.js");
const sharingModule = require("../en/sharing.js");
const engine = require("../diagnosis-engine.js");
const globalPages = [
  "en/index.html",
  "en/diagnose.html",
  "en/guides/upgrade-or-replace.html",
  "en/guides/gpu-or-monitor.html",
  "en/guides/budget-500.html",
  "en/guides/do-i-need-new-gaming-pc.html"
];

function read(file) {
  return fs.readFileSync(path.join(projectRoot, file), "utf8");
}

test("Global pages have English SEO metadata and independent canonical URLs", () => {
  for (const file of globalPages) {
    const html = read(file);
    const publicPath = file === "en/index.html" ? "en/" : file;
    assert.match(html, /<html lang="en"/i, file);
    assert.match(html, /<title>[^<]+<\/title>/i, file);
    assert.match(html, /<meta name="description" content="[^"]+"/i, file);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://hibo1120\\.github\\.io/gamefit-lab/${publicPath.replaceAll(".", "\\.")}">`), file);
    assert.match(html, /<meta property="og:title"/i, file);
    assert.match(html, /<meta property="og:description"/i, file);
    assert.match(html, /<meta name="twitter:card" content="summary">/i, file);
    assert.match(html, /Advertising disclosure/i, file);
    assert.match(html, /Limitations/i, file);
  }
});

test("paired Japanese and English pages expose reciprocal hreflang", () => {
  const pairs = [
    ["diagnose.html", "en/diagnose.html"],
    ["guides/upgrade-or-replace.html", "en/guides/upgrade-or-replace.html"],
    ["guides/budget-50000.html", "en/guides/budget-500.html"]
  ];
  for (const [jaFile, enFile] of pairs) {
    assert.match(read(jaFile), /rel="alternate" hreflang="en"/i, jaFile);
    assert.match(read(enFile), /rel="alternate" hreflang="ja"/i, enFile);
  }
  assert.match(read("index.md"), /hreflang="en"/i);
  assert.match(read("en/index.html"), /hreflang="ja"/i);
});

test("Global diagnosis reuses the shared engine with six non-FX USD bands", () => {
  const html = read("en/diagnose.html");
  const pageScript = read("en/diagnose-page.js");
  assert.match(html, /src="\.\.\/diagnosis-engine\.js"/);
  assert.doesNotMatch(pageScript, /function\s+(?:score|diagnoseInputs)\s*\(/);
  assert.deepEqual(Object.keys(locale.BUDGET_TO_ENGINE), ["100", "300", "500", "1000", "1500", "2000"]);
  assert.equal(locale.budgetToEngine("500"), 50000);
  assert.throws(() => locale.budgetToEngine("999"), error => error.code === "budget_invalid");
  assert.match(html, /not currency conversions/i);
});

test("all four games produce localized results without changing engine scores", () => {
  for (const game of ["valorant", "apex", "fortnite", "mhwilds"]) {
    const input = { game, currentFps: game === "mhwilds" ? "30" : "100", targetFps: "144", monitorHz: "144", ram: "16", storage: "nvme", budget: "500", device: "desktop", stream: "no" };
    const raw = engine.diagnoseInputs({ ...input, budget: locale.budgetToEngine(input.budget) });
    const localized = locale.localizeResult(raw, input);
    assert.deepEqual(localized.ranked.map(item => item.score), raw.ranked.map(item => item.score), game);
    assert.equal(localized.ranked.length, 5, game);
    assert.match(localized.budgetLabel, /^\$500$/);
    assert.equal(/[ぁ-んァ-ヶ一-龠]/.test(localized.ranked.map(item => `${item.title} ${item.reasons[0]}`).join(" ")), false, game);
  }
});

test("Global share URLs use X intent, English campaign, and never serialize hardware", async () => {
  let copied = "";
  const sharing = sharingModule.createGlobalSharing({ navigator: { clipboard: { writeText(value) { copied = value; return Promise.resolve(); } } } });
  const result = { ranked: [{ key: "monitor", title: "Upgrade your monitor" }], hardware: "SECRET CPU GPU" };
  const intent = new URL(sharing.xShareUrl(result));
  assert.equal(intent.origin, "https://x.com");
  assert.equal(intent.pathname, "/intent/post");
  const sharedUrl = new URL(intent.searchParams.get("url"));
  assert.equal(sharedUrl.pathname, "/gamefit-lab/en/diagnose.html");
  assert.equal(sharedUrl.searchParams.get("utm_campaign"), "gamefit_global_test");
  assert.equal(sharedUrl.searchParams.get("utm_content"), "en_result_share");
  assert.equal(intent.toString().includes("SECRET"), false);
  await sharing.copyDiagnosisUrl();
  assert.equal(new URL(copied).searchParams.get("utm_content"), "en_result_copy");
});

test("sitemap and robots expose Global routes without blocking them", () => {
  const sitemap = read("sitemap.xml");
  const robots = read("robots.txt");
  for (const file of globalPages) {
    const publicPath = file === "en/index.html" ? "en/" : file;
    assert.match(sitemap, new RegExp(`https://hibo1120\\.github\\.io/gamefit-lab/${publicPath.replaceAll(".", "\\.")}`), file);
  }
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow:\s*\/en/);
});

test("every Global internal asset, guide, CTA, and language-switch target exists", () => {
  for (const file of globalPages) {
    const html = read(file);
    const base = new URL(`https://hibo1120.github.io/gamefit-lab/${file === "en/index.html" ? "en/" : file}`);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
      const value = match[1].replaceAll("&amp;", "&");
      if (value.startsWith("data:") || value.startsWith("#")) continue;
      const url = new URL(value, base);
      if (url.origin !== base.origin || !url.pathname.startsWith("/gamefit-lab/")) continue;
      let relative = decodeURIComponent(url.pathname.slice("/gamefit-lab/".length));
      if (!relative) relative = "index.md";
      else if (relative.endsWith("/")) relative += "index.html";
      assert.equal(fs.existsSync(path.join(projectRoot, relative)), true, `${file}: ${value}`);
    }
  }
});
