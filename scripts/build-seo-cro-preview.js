const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".seo-cro-preview-dist");
const liveLanding = "https://hibo1120.github.io/gamefit-lab/";
const EXPECTED_LIVE_LANDING_SHA256 = "95152e400c9fce73d3a72208bd2e9bc9613358f43414c72e3ffe7c654943a6d2";
const EXPECTED_THEME_SHA256 = "38ec41b2a4c4765872f17ff3b131f560da97704113ee4f7dc884a643c8628fca";
const SOURCE_REMOTE_HEAD = "46f96d18289c2c89d32838dbd53af222dc315c2b";
const SOURCE_TREE = "08588b7d8c4bfa3ad310ebba16068807afbc01ab";
const deviceUpdates = require("../data/device-updates.json");
const { DECISION_LABELS, EVIDENCE_LABELS } = require("./generate-device-updates.js");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readBuilderCheckout() {
  const git = (...args) => execFileSync(
    "git",
    ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, ...args],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  ).trim();

  try {
    return {
      head: git("rev-parse", "HEAD"),
      tree: git("rev-parse", "HEAD^{tree}"),
      dirty: git("status", "--porcelain").length > 0
    };
  } catch (_) {
    return { head: null, tree: null, dirty: null };
  }
}

function replaceRequired(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Live landing no longer matches ${label}`);
  return source.replace(search, replacement);
}

function replaceRequiredPattern(source, pattern, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!pattern.test(source)) throw new Error(`Live landing no longer matches ${label}`);
  return source.replace(pattern, replacement);
}

function removeExactlyOnce(source, pattern, label) {
  const matches = source.match(pattern) || [];
  if (matches.length !== 1) throw new Error(`Live landing has ${matches.length} ${label} blocks; expected 1`);
  return source.replace(pattern, "");
}

async function copyPublicFiles() {
  const allowedExtensions = new Set([".html", ".js", ".css", ".json", ".xml"]);
  const rootFiles = await fs.readdir(root, { withFileTypes: true });
  for (const entry of rootFiles) {
    if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name)) || entry.name === "index.html") continue;
    await fs.copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
  for (const directory of ["guides", "en", "data", "updates"]) {
    await fs.cp(path.join(root, directory), path.join(output, directory), { recursive: true });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deviceUpdatesSection() {
  const items = deviceUpdates.slice(0, 3).map(update => `<h3 id="${escapeHtml(update.slug)}"><a href="./updates/${escapeHtml(update.slug)}.html">${escapeHtml(update.product_name)}</a></h3><p>${escapeHtml(update.category_label)} / <strong>${escapeHtml(DECISION_LABELS[update.decision_state])}</strong> / ${escapeHtml(EVIDENCE_LABELS[update.evidence_state])}<br>${escapeHtml(update.change_summary)}</p>`).join("");
  return `<h2 id="最新gear-updates">最新Gear Updates</h2><p>新しい＝買い替えるべき、ではありません。公式情報と根拠の状態から、今の機材を替える意味があるかを整理します。</p>${items}<p><a href="./updates/">すべて見る</a></p>`;
}

async function fetchPinned(url, expectedHash, label) {
  const response = await fetch(url, { headers: { "user-agent": "GameFit-SEO-CRO-Preview-Builder/1.1" } });
  if (!response.ok) throw new Error(`Unable to read ${label}: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(body);
  if (actualHash !== expectedHash) throw new Error(`${label} changed: expected sha256 ${expectedHash}, received ${actualHash}`);
  return body;
}

async function writeManifest() {
  const builderCheckout = readBuilderCheckout();
  const builderScript = await fs.readFile(__filename);
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name !== "preview-manifest.json") {
        const contents = await fs.readFile(absolute);
        files.push({
          path: path.relative(output, absolute).split(path.sep).join("/"),
          bytes: contents.length,
          sha256: sha256(contents)
        });
      }
    }
  }
  await walk(output);
  files.sort((a, b) => a.path.localeCompare(b.path, "en"));
  const manifest = {
    kind: "gamefit_device_radar_preview_manifest",
    schema_version: 1,
    source_remote_head: SOURCE_REMOTE_HEAD,
    source_tree: SOURCE_TREE,
    content_source: {
      remote_head: SOURCE_REMOTE_HEAD,
      tree: SOURCE_TREE,
      role: "content baseline from Draft PR #3"
    },
    builder_checkout: {
      ...builderCheckout,
      script_path: "scripts/build-seo-cro-preview.js",
      script_sha256: sha256(builderScript)
    },
    live_shell_sha256: EXPECTED_LIVE_LANDING_SHA256,
    theme_sha256: EXPECTED_THEME_SHA256,
    preview_only: ["banner", "noindex headers", "robots disallow", "sessionStorage analytics stub"],
    excluded: [".git", ".env", "growth", "scripts", "settings-notebook", "tests", "participant data", "tester stores", "local backups"],
    files
  };
  await fs.writeFile(path.join(output, "preview-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function build() {
  const liveHtml = await fetchPinned(liveLanding, EXPECTED_LIVE_LANDING_SHA256, "live landing");
  let html = liveHtml.toString("utf8");
  html = replaceRequired(html, '<html lang="en-US">', '<html lang="ja">', "Japanese document language");
  const stylesheetMatch = html.match(/<link rel="stylesheet" href="([^"]*\/assets\/css\/style\.css\?v=[^"]+)">/u);
  if (!stylesheetMatch) throw new Error("Live landing no longer exposes the GitHub Pages theme stylesheet");
  const themeUrl = new URL(stylesheetMatch[1], liveLanding).href;
  const themeCss = await fetchPinned(themeUrl, EXPECTED_THEME_SHA256, "GitHub Pages theme stylesheet");
  html = html.replace(stylesheetMatch[0], '<link rel="stylesheet" href="./assets/css/style.css">');

  if (!html.includes("<h2 id=\"今のpc環境に次の1円をどこへ使うべきか\">今のPC環境に、次の1円をどこへ使うべきか？</h2>")) throw new Error("Live landing no longer matches hero heading");
  if ((html.match(/FPS不足、GPU交換、PC買い替え。/gu) || []).length !== 1) throw new Error("Live landing no longer has exactly one source hero bridge");
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
    "匿名の利用状況分析にPostHogを使用し、改善のためトップ・判断ガイド・診断の閲覧、診断CTAの利用、ゲーム種別、FPS帯、予算帯、推奨結果等を取得する場合があります。",
    "匿名の利用状況分析にPostHogを使用し、改善のためトップ・判断ガイド・Gear Updates・診断の閲覧、診断CTAの利用、ゲーム種別、FPS帯、予算帯、推奨結果等を取得する場合があります。",
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
    "<h2 id=\"広告について\">広告について</h2>",
    `${deviceUpdatesSection()}<h2 id="広告について">広告について</h2>`,
    "Gear Updates insertion point"
  );
  html = removeExactlyOnce(html, /<script>window\.GameFitPageContext = Object\.freeze\(\{ language: "ja", regionVersion: "jp", pageSource: "index" \}\);<\/script>\s*/gu, "production page context");
  html = removeExactlyOnce(html, /<script src="\.\/analytics\.js"><\/script>\s*/gu, "production analytics script");
  html = removeExactlyOnce(html, /<script src="\.\/posthog-init\.js"><\/script>\s*/gu, "production PostHog script");
  html = removeExactlyOnce(html, /<script src="\.\/guide\.js" defer=""><\/script>\s*/gu, "production guide script");
  html = replaceRequired(
    html,
    "</head>",
    `<meta name="robots" content="noindex,nofollow,noarchive">
<style>
.seo-preview-banner{background:#2a1f00;color:#ffe7a3;border:1px solid #745b18;padding:.65rem 1rem;text-align:center;font:600 14px/1.4 system-ui,sans-serif}
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
  await fs.mkdir(path.join(output, "assets", "css"), { recursive: true });
  await fs.writeFile(path.join(output, "assets", "css", "style.css"), themeCss);
  await fs.writeFile(path.join(output, "index.html"), html, "utf8");
  await fs.writeFile(path.join(output, "404.html"), `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>ページが見つかりません | GameFit Lab Preview</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <style>
    body { max-width: 760px; margin: 0 auto; padding: 48px 20px; }
    .preview-notice { margin: 0 0 28px; padding: 10px 14px; border: 1px solid #d6b04c; background: #201900; color: #f5d980; }
  </style>
</head>
<body>
  <p class="preview-notice">GameFit Preview — テスト用の未公開候補です</p>
  <main>
    <h1>ページが見つかりません</h1>
    <p>指定されたページは、このPreviewには存在しません。</p>
    <p><a href="/?qa=1">Previewトップへ戻る</a></p>
  </main>
</body>
</html>
`, "utf8");
  await fs.writeFile(path.join(output, "posthog-init.js"), `(function () {
  "use strict";
  const key = "gamefit_seo_cro_preview_events";
  const qaMode = new URLSearchParams(window.location.search || "").get("qa") === "1";
  function preserveQaModeOnInternalLinks() {
    if (!qaMode || !document?.querySelectorAll) return;
    for (const anchor of document.querySelectorAll("a[href]")) {
      try {
        const destination = new URL(anchor.getAttribute("href"), window.location.href);
        if (destination.origin !== window.location.origin || !["http:", "https:"].includes(destination.protocol)) continue;
        destination.searchParams.set("qa", "1");
        anchor.href = destination.href;
      } catch (_) {}
    }
  }
  if (qaMode) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", preserveQaModeOnInternalLinks, { once: true });
    else preserveQaModeOnInternalLinks();
  }
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
    clear() { write([]); },
    qaMode
  });
})();
`, "utf8");
  await fs.writeFile(path.join(output, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  await fs.writeFile(path.join(output, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n", "utf8");
  await fs.writeFile(path.join(output, "_redirects"), "/gamefit-lab/* /:splat 200\n", "utf8");
  await writeManifest();

  process.stdout.write(`SEO/CRO preview built at ${output}\n`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
