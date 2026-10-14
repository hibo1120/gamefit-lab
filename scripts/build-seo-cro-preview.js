const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".seo-cro-preview-dist");
const liveLanding = "https://hibo1120.github.io/gamefit-lab/";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Live landing no longer matches ${label}`);
  return source.replace(search, replacement);
}

function replaceRequiredPattern(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Live landing no longer matches ${label}`);
  return source.replace(pattern, replacement);
}

async function copyPublicFiles() {
  const allowedExtensions = new Set([".html", ".js", ".css", ".json", ".xml"]);
  const rootFiles = await fs.readdir(root, { withFileTypes: true });
  for (const entry of rootFiles) {
    if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name)) || entry.name === "index.html") continue;
    await fs.copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
  for (const directory of ["guides", "en", "data"]) {
    await fs.cp(path.join(root, directory), path.join(output, directory), { recursive: true });
  }
}

async function build() {
  const response = await fetch(liveLanding, { headers: { "user-agent": "GameFit-SEO-CRO-Preview-Builder/1.0" } });
  if (!response.ok) throw new Error(`Unable to read live landing: HTTP ${response.status}`);
  let html = await response.text();

  html = replaceRequired(
    html,
    "<h2 id=\"今のpc環境に次の1円をどこへ使うべきか\">今のPC環境に、次の1円をどこへ使うべきか？</h2>",
    "<h2 id=\"今のpc環境に次の1円をどこへ使うべきか\">今のPC環境に、次の1円をどこへ使うべきか？</h2><p class=\"search-intent-bridge\"><strong>FPS不足、GPU交換、PC買い替え。</strong>ゲーム・現在のPC環境・予算から、まずどこを変えるべきか整理します。</p>",
    "hero heading"
  );
  html = replaceRequired(html, "現在は公開テスト準備中です。", "現在は無料の簡易診断と判断ガイドを公開しています。", "status copy");
  html = replaceRequired(
    html,
    "診断ロジック、製品情報、価格情報を順次追加しています。",
    "診断結果は目安です。実際の利用状況を少人数から確認し、診断ロジックと情報を段階的に改善しています。",
    "status detail"
  );
  html = replaceRequiredPattern(
    html,
    /<a href="(?:\.\/|\/gamefit-lab\/)diagnose\.html">ゲーミング環境の投資優先順位を無料診断する<\/a>/u,
    "<a class=\"diagnosis-cta\" data-source-page=\"index\" data-content-type=\"landing\" href=\"./diagnose.html?utm_source=gamefit&amp;utm_medium=website&amp;utm_campaign=seo_cro_phase1&amp;source=index\">ゲーミング環境の投資優先順位を無料診断する</a>",
    "diagnosis CTA"
  );
  html = replaceRequired(
    html,
    "匿名の利用状況分析にPostHogを使用し、診断改善のためページ閲覧、診断利用、ゲーム種別、FPS帯、予算帯、推奨結果等を取得する場合があります。",
    "匿名の利用状況分析にPostHogを使用し、改善のためトップ・判断ガイド・診断の閲覧、診断CTAの利用、ゲーム種別、FPS帯、予算帯、推奨結果等を取得する場合があります。",
    "privacy summary"
  );
  html = replaceRequired(
    html,
    "診断では氏名・メールアドレス等を取得せず、CPU / GPUの自由入力内容も分析データとして送信しません。",
    "氏名・メールアドレス等は取得せず、CPU / GPUの自由入力内容、閲覧URL全文、Query String全文も分析データとして送信しません。",
    "privacy detail"
  );
  html = replaceRequired(
    html,
    "</head>",
    `<meta name="robots" content="noindex,nofollow,noarchive">
<style>
.seo-preview-banner{background:#2a1f00;color:#ffe7a3;border:1px solid #745b18;padding:.65rem 1rem;text-align:center;font:600 14px/1.4 system-ui,sans-serif}
.search-intent-bridge{font-size:1.05rem}
</style>
<script>window.GameFitPageContext=Object.freeze({language:"ja",regionVersion:"jp",pageSource:"index"});</script>
<script src="./analytics.js?preview=seo-cro-phase1"></script>
<script src="./posthog-init.js?preview=seo-cro-phase1"></script>
<script src="./guide.js?preview=seo-cro-phase1" defer></script>
</head>`,
    "head"
  );
  html = replaceRequired(
    html,
    "<body>",
    "<body><aside class=\"seo-preview-banner\" role=\"note\">GameFit SEO/CRO Preview — テスト用の未公開候補です</aside>",
    "body"
  );

  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  await copyPublicFiles();
  await fs.writeFile(path.join(output, "index.html"), html, "utf8");
  await fs.writeFile(path.join(output, "posthog-init.js"), `(function () {
  "use strict";
  const key = "gamefit_seo_cro_preview_events";
  function read() {
    try { return JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (_) { return []; }
  }
  function write(events) {
    try { sessionStorage.setItem(key, JSON.stringify(events)); } catch (_) {}
  }
  window.posthog = {
    capture(eventName, properties, options) {
      const sanitized = window.GameFitAnalytics.beforeSend({ event: eventName, properties: properties || {} });
      if (!sanitized) return;
      const events = read();
      events.push({ event: sanitized.event, properties: sanitized.properties, options: options || null });
      write(events);
    }
  };
  window.GameFitPreviewAnalytics = Object.freeze({
    events: read,
    clear() { write([]); }
  });
})();
`, "utf8");
  await fs.writeFile(path.join(output, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  await fs.writeFile(path.join(output, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n", "utf8");
  await fs.writeFile(path.join(output, "_redirects"), "/gamefit-lab/* /:splat 200\n", "utf8");

  process.stdout.write(`SEO/CRO preview built at ${output}\n`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
