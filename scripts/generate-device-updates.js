const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const dataPath = path.join(projectRoot, "data", "device-updates.json");
const updatesDirectory = path.join(projectRoot, "updates");
const indexPath = path.join(projectRoot, "index.md");
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const publicBase = "https://hibo1120.github.io/gamefit-lab";
const LANDING_START = "<!-- DEVICE_UPDATES_START -->";
const LANDING_END = "<!-- DEVICE_UPDATES_END -->";
const SITEMAP_START = "  <!-- DEVICE_UPDATES_START -->";
const SITEMAP_END = "  <!-- DEVICE_UPDATES_END -->";

const DECISION_STATES = new Set(["WATCH", "COMPARE", "NO_RUSH", "UPGRADE_CANDIDATE", "DONT_UPGRADE"]);
const EVIDENCE_STATES = new Set(["official_specs_only", "independent_test_available", "multiple_independent_sources"]);
const CATEGORIES = new Set(["mouse", "keyboard", "headset", "monitor", "controller", "pc", "component"]);
const EVIDENCE_LABELS = {
  official_specs_only: "公式仕様のみ",
  independent_test_available: "独立実測あり",
  multiple_independent_sources: "複数独立ソース確認済み"
};

function invariant(condition, message) {
  if (!condition) throw new Error(`Device update validation failed: ${message}`);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch (_) {
    return false;
  }
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => /(?:^|_)(?:image|affiliate)(?:_|$)/i.test(key) || hasForbiddenKey(nested));
}

function validateUpdates(updates) {
  invariant(Array.isArray(updates), "root must be an array");
  invariant(updates.length >= 1 && updates.length <= 3, "v0.1 must publish between one and three products");

  const ids = new Set();
  const slugs = new Set();
  const titles = new Set();
  const descriptions = new Set();

  for (const [index, update] of updates.entries()) {
    const label = `item ${index + 1}`;
    for (const key of ["id", "slug", "product_name", "brand", "category", "category_label", "announcement_date", "availability_status", "official_url", "previous_model", "change_summary", "decision_state", "decision_reason", "evidence_state", "evidence_summary", "gamefit_judgment", "last_verified_at"]) {
      invariant(typeof update[key] === "string" && update[key].trim(), `${label}.${key} is required`);
    }
    invariant(/^[a-z0-9][a-z0-9-]{1,79}$/.test(update.slug), `${label}.slug is invalid`);
    invariant(!ids.has(update.id), `${label}.id is duplicated`);
    invariant(!slugs.has(update.slug), `${label}.slug is duplicated`);
    ids.add(update.id);
    slugs.add(update.slug);
    invariant(CATEGORIES.has(update.category), `${label}.category is invalid`);
    invariant(DECISION_STATES.has(update.decision_state), `${label}.decision_state is invalid`);
    invariant(EVIDENCE_STATES.has(update.evidence_state), `${label}.evidence_state is invalid`);
    invariant(isIsoDate(update.announcement_date), `${label}.announcement_date must be YYYY-MM-DD`);
    invariant(update.release_date === null || isIsoDate(update.release_date), `${label}.release_date must be null or YYYY-MM-DD`);
    invariant(isIsoDate(update.last_verified_at), `${label}.last_verified_at must be YYYY-MM-DD`);
    invariant(isHttpsUrl(update.official_url), `${label}.official_url must be HTTPS`);
    invariant(Array.isArray(update.official_facts) && update.official_facts.length > 0, `${label}.official_facts must not be empty`);
    invariant(Array.isArray(update.who_should_care) && update.who_should_care.length > 0, `${label}.who_should_care must not be empty`);
    invariant(Array.isArray(update.who_can_wait) && update.who_can_wait.length > 0, `${label}.who_can_wait must not be empty`);
    invariant(Array.isArray(update.official_sources) && update.official_sources.length > 0, `${label}.official_sources must not be empty`);
    invariant(Array.isArray(update.independent_sources), `${label}.independent_sources must be an array`);
    invariant(typeof update.diagnosis_cta === "boolean", `${label}.diagnosis_cta must be boolean`);
    invariant(!hasForbiddenKey(update), `${label} must not contain image or affiliate fields`);
    for (const item of [...update.who_should_care, ...update.who_can_wait]) {
      invariant(typeof item === "string" && item.trim(), `${label} audience entries must be non-empty strings`);
    }

    const officialHosts = new Set();
    const sourceUrls = new Set(update.official_sources.map(source => {
      invariant(typeof source.label === "string" && source.label.trim(), `${label} official source label is required`);
      invariant(isHttpsUrl(source.url), `${label} official source URL must be HTTPS`);
      officialHosts.add(new URL(source.url).hostname);
      return source.url;
    }));
    invariant(sourceUrls.has(update.official_url), `${label}.official_url must be listed in official_sources`);

    for (const fact of update.official_facts) {
      invariant(typeof fact.statement === "string" && fact.statement.trim(), `${label} official fact statement is required`);
      invariant(["manufacturer_specification", "manufacturer_claim"].includes(fact.evidence_type), `${label} official fact evidence_type is invalid`);
      invariant(Array.isArray(fact.source_urls) && fact.source_urls.length > 0, `${label} official fact source_urls must not be empty`);
      for (const sourceUrl of fact.source_urls) invariant(sourceUrls.has(sourceUrl), `${label} official fact uses an unlisted source URL`);
    }

    const independentHosts = new Set();
    for (const source of update.independent_sources) {
      invariant(typeof source.label === "string" && source.label.trim(), `${label} independent source label is required`);
      invariant(isHttpsUrl(source.url), `${label} independent source URL must be HTTPS`);
      const hostname = new URL(source.url).hostname;
      invariant(!officialHosts.has(hostname), `${label} independent source must not use a manufacturer host`);
      independentHosts.add(hostname);
    }
    if (update.evidence_state === "independent_test_available") {
      invariant(update.independent_sources.length >= 1, `${label} requires an independent source`);
    }
    if (update.evidence_state === "multiple_independent_sources") {
      invariant(independentHosts.size >= 2, `${label} requires multiple independent source hosts`);
    }

    invariant(update.seo && typeof update.seo === "object", `${label}.seo is required`);
    invariant(typeof update.seo.title === "string" && update.seo.title.trim(), `${label}.seo.title is required`);
    invariant(typeof update.seo.description === "string" && update.seo.description.trim(), `${label}.seo.description is required`);
    invariant(!titles.has(update.seo.title), `${label}.seo.title is duplicated`);
    invariant(!descriptions.has(update.seo.description), `${label}.seo.description is duplicated`);
    titles.add(update.seo.title);
    descriptions.add(update.seo.description);
  }

  return updates;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "公式発表では日付特定できず";
  const [year, month, day] = value.split("-");
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

function replaceDelimited(source, startMarker, endMarker, content, fileLabel) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  invariant(start !== -1 && end > start, `${fileLabel} is missing generated-section markers`);
  return `${source.slice(0, start + startMarker.length)}\n${content}\n${source.slice(end)}`;
}

function renderHead({ title, description, canonical, pageSource }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="ja" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="GameFit Lab">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AE%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="../guide.css"><link rel="stylesheet" href="../updates.css">
<script>window.GameFitPageContext=Object.freeze({language:"ja",regionVersion:"jp",pageSource:"${escapeHtml(pageSource)}"});</script>`;
}

function renderIndex(updates) {
  const title = "最新ゲーミングデバイス情報 | GameFit Gear Updates";
  const description = "新しいゲーミングデバイスで何が変わったか、誰に関係するか、今すぐ買い替える必要があるかを公式情報とEvidenceの状態から整理します。";
  const cards = updates.map(update => `<li class="update-card">
        <div class="status-row"><span class="decision-badge" data-state="${escapeHtml(update.decision_state)}">${escapeHtml(update.decision_state)}</span><span class="evidence-badge">${escapeHtml(EVIDENCE_LABELS[update.evidence_state])}</span></div>
        <p class="update-meta">${escapeHtml(update.brand)} / ${escapeHtml(update.category_label)} / 発表 ${escapeHtml(formatDate(update.announcement_date))}</p>
        <h2><a href="./${escapeHtml(update.slug)}.html">${escapeHtml(update.product_name)}</a></h2>
        <p>${escapeHtml(update.change_summary)}</p>
        <a class="text-link" href="./${escapeHtml(update.slug)}.html">何が変わったか・買い替え判断を見る</a>
      </li>`).join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
${renderHead({ title, description, canonical: `${publicBase}/updates/`, pageSource: "updates_index" })}
</head>
<body>
<header class="shell site-header"><a class="brand" href="../">GameFit Lab</a><a class="header-link" href="../diagnose.html">無料診断へ</a></header>
<main class="shell">
  <section class="hero"><p class="eyebrow">GameFit Gear Updates</p><h1>最新ゲーミングデバイス情報</h1><p class="lead">新しい＝買い替えるべき、ではありません。メーカー公式情報と独立したEvidenceを分け、今の機材から替える意味があるかを整理します。</p></section>
  <section class="scope-note" aria-labelledby="updates-policy"><h2 id="updates-policy">ニュース一覧ではなく、買い替え判断の材料です</h2><p>公式情報を再確認でき、GameFitの対象カテゴリに入り、差分を具体的に説明できる製品だけを少数掲載します。新製品であることやAffiliate報酬は推奨理由にしません。</p></section>
  <ul class="update-list">
${cards}
  </ul>
  <aside class="evidence-legend"><h2>Evidence表示</h2><dl><dt>公式仕様のみ</dt><dd>メーカーの仕様・公称値のみ。性能や使い心地の独立検証は未採用です。</dd><dt>独立実測あり</dt><dd>メーカー以外の測定を少なくとも1件確認しています。</dd><dt>複数独立ソース確認済み</dt><dd>複数の独立した測定で主要な傾向を確認しています。</dd></dl></aside>
</main>
<footer class="shell site-footer"><p><a href="../">GameFit Labトップ</a> / <a href="../diagnose.html">無料診断</a></p><p>仕様・販売状況は更新されることがあります。購入前にメーカー公式情報を再確認してください。</p></footer>
</body>
</html>
`;
}

function renderUpdate(update) {
  const canonical = `${publicBase}/updates/${update.slug}.html`;
  const officialFacts = update.official_facts.map(fact => `<li><strong>${fact.evidence_type === "manufacturer_claim" ? "メーカー公称" : "メーカー公式仕様"}：</strong>${escapeHtml(fact.statement)}</li>`).join("\n");
  const shouldCare = update.who_should_care.map(item => `<li>${escapeHtml(item)}</li>`).join("\n");
  const canWait = update.who_can_wait.map(item => `<li>${escapeHtml(item)}</li>`).join("\n");
  const officialSources = update.official_sources.map(source => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join("\n");
  const independentEvidence = update.independent_sources.length
    ? `<ul>${update.independent_sources.map(source => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join("\n")}</ul>`
    : "<p>判断へ採用した独立実測はまだありません。プロ選手の採用例も、性能証明や個人への適合証明として扱っていません。</p>";
  const cta = update.diagnosis_cta ? `<div class="cta-wrap"><p>マウスだけでなく、PC性能・モニター・メモリなども含めて予算の優先順位を比較します。</p><a class="diagnosis-cta" data-source-page="${escapeHtml(update.slug)}" data-content-type="device_update" href="../diagnose.html?utm_source=gamefit&amp;utm_medium=content&amp;utm_campaign=device_radar_v0_1&amp;source=${escapeHtml(update.slug)}">次にどこへ予算を使うか無料診断</a></div>` : "";

  return `<!doctype html>
<html lang="ja">
<head>
${renderHead({ title: update.seo.title, description: update.seo.description, canonical, pageSource: update.slug })}
<script src="../analytics.js"></script><script src="../posthog-init.js"></script><script src="../guide.js" defer></script><script src="../device-updates.js" defer></script>
</head>
<body data-device-update-page data-product-slug="${escapeHtml(update.slug)}" data-brand="${escapeHtml(update.brand)}" data-category="${escapeHtml(update.category)}" data-evidence-state="${escapeHtml(update.evidence_state)}" data-decision-state="${escapeHtml(update.decision_state)}">
<header class="shell site-header"><a class="brand" href="../">GameFit Lab</a><a class="header-link" href="./">Gear Updates一覧</a></header>
<main class="shell">
  <section class="hero"><p class="eyebrow">${escapeHtml(update.brand)} / ${escapeHtml(update.category_label)}</p><h1>${escapeHtml(update.product_name)}</h1><p class="lead">${escapeHtml(update.change_summary)}</p></section>
  <article class="article update-article">
    <div class="status-panel"><div><span class="label">GameFit判断</span><strong class="decision-large">${escapeHtml(update.decision_state)}</strong></div><div><span class="label">Evidence</span><strong>${escapeHtml(EVIDENCE_LABELS[update.evidence_state])}</strong></div></div>
    <dl class="product-meta"><div><dt>ブランド</dt><dd>${escapeHtml(update.brand)}</dd></div><div><dt>カテゴリ</dt><dd>${escapeHtml(update.category_label)}</dd></div><div><dt>発表日</dt><dd><time datetime="${escapeHtml(update.announcement_date)}">${escapeHtml(formatDate(update.announcement_date))}</time></dd></div><div><dt>発売日</dt><dd>${escapeHtml(formatDate(update.release_date))}<br><small>${escapeHtml(update.availability_status)}</small></dd></div><div><dt>最終確認</dt><dd><time datetime="${escapeHtml(update.last_verified_at)}">${escapeHtml(formatDate(update.last_verified_at))}</time></dd></div></dl>
    <p class="note">これはレビューや購入推奨ではありません。メーカー公称値は独立実測と分けて表示し、現在の機材に不満がなければ「買わない」判断も成功として扱います。</p>
    <h2>何が変わった？</h2>
    <p>旧モデル「${escapeHtml(update.previous_model)}」との比較を、公式に確認できる範囲へ限定しています。</p>
    <ul class="fact-list">${officialFacts}</ul>
    <h2>誰に関係する？</h2>
    <ul>${shouldCare}</ul>
    <h2>今すぐ買い替える必要は？</h2>
    <p class="decision-copy"><strong>${escapeHtml(update.decision_state)}：</strong>${escapeHtml(update.decision_reason)}</p>
    <h3>今は待てる人</h3><ul>${canWait}</ul>
    <h2>Evidence</h2>
    <p><strong>${escapeHtml(EVIDENCE_LABELS[update.evidence_state])}。</strong>${escapeHtml(update.evidence_summary)}</p>
    ${independentEvidence}
    <h2>GameFit判断</h2>
    <p>${escapeHtml(update.gamefit_judgment)}</p>
    ${cta}
    <h2>Source</h2>
    <ul class="source-list">${officialSources}</ul>
    <p class="source">外部の文章・画像・表は転載せず、確認した事実をGameFit独自の文章で整理しています。リンクは公式メーカー情報で、Affiliateリンクではありません。</p>
    <aside class="related"><h2>関連ページ</h2><ul><li><a href="./">最新ゲーミングデバイス情報</a></li><li><a href="../guides/upgrade-or-replace.html">買い替えとアップグレード、どっち？</a></li><li><a href="../diagnose.html">無料診断</a></li></ul></aside>
  </article>
</main>
<footer class="shell site-footer"><p><a href="../">GameFit Labトップ</a> / <a href="./">Gear Updates一覧</a></p><p>実際の使い心地や性能は環境・設定・個体差で変わります。最終判断ではメーカーの最新情報と返品条件を確認してください。</p></footer>
</body>
</html>
`;
}

function renderLandingBlock(updates) {
  const items = updates.slice(0, 3).map(update => `### [${update.product_name}](./updates/${update.slug}.html)\n\n${update.category_label} / **${update.decision_state}** / ${EVIDENCE_LABELS[update.evidence_state]}<br>\n${update.change_summary}`).join("\n\n");
  return `## 最新Gear Updates\n\n新しい＝買い替えるべき、ではありません。公式情報とEvidenceの状態から、今の機材を替える意味があるかを整理します。\n\n${items}\n\n[すべて見る](./updates/)`;
}

function renderSitemapBlock(updates) {
  const latest = updates.map(update => update.last_verified_at).sort().at(-1);
  return [`  <url><loc>${publicBase}/updates/</loc><lastmod>${latest}</lastmod></url>`, ...updates.map(update => `  <url><loc>${publicBase}/updates/${update.slug}.html</loc><lastmod>${update.last_verified_at}</lastmod></url>`)].join("\n");
}

function expectedFiles(updates) {
  const indexSource = fs.readFileSync(indexPath, "utf8");
  const sitemapSource = fs.readFileSync(sitemapPath, "utf8");
  const files = new Map([
    [path.join(updatesDirectory, "index.html"), renderIndex(updates)],
    [indexPath, replaceDelimited(indexSource, LANDING_START, LANDING_END, renderLandingBlock(updates), "index.md")],
    [sitemapPath, replaceDelimited(sitemapSource, SITEMAP_START, SITEMAP_END, renderSitemapBlock(updates), "sitemap.xml")]
  ]);
  for (const update of updates) files.set(path.join(updatesDirectory, `${update.slug}.html`), renderUpdate(update));
  return files;
}

function generate({ check = false } = {}) {
  const updates = validateUpdates(JSON.parse(fs.readFileSync(dataPath, "utf8")));
  const files = expectedFiles(updates);

  if (check) {
    for (const [file, expected] of files) {
      invariant(fs.existsSync(file), `${path.relative(projectRoot, file)} is missing; run the generator`);
      invariant(fs.readFileSync(file, "utf8") === expected, `${path.relative(projectRoot, file)} is stale; run the generator`);
    }
    return files;
  }

  fs.mkdirSync(updatesDirectory, { recursive: true });
  for (const [file, content] of files) fs.writeFileSync(file, content, "utf8");
  return files;
}

if (require.main === module) {
  try {
    const check = process.argv.includes("--check");
    const files = generate({ check });
    process.stdout.write(`${check ? "Checked" : "Generated"} ${files.size} Device Radar files.\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { CATEGORIES, DECISION_STATES, EVIDENCE_STATES, EVIDENCE_LABELS, generate, validateUpdates };
