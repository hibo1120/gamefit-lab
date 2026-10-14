const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const updates = require("../data/device-updates.json");
const { isHttpsUrl, isIsoDate, renderSitemapBlock, validateUpdates } = require("../scripts/generate-device-updates.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function independentSource(id, overrides = {}) {
  return {
    source_id: id,
    label: `Independent ${id}`,
    url: `https://${id}.review.example/test`,
    provider_id: id,
    origin_provider_id: id,
    source_origin_id: `${id}-origin`,
    publisher_group: `${id}-publisher`,
    source_type: "independent_lab",
    independence_status: "confirmed",
    methodology_family: `${id}-method`,
    claim_scopes: ["click_latency"],
    adoption_status: "adopted",
    reviewed_at: "2026-10-15",
    republication_of_source_id: null,
    ...overrides
  };
}

test("Device Radar data validates and generated files are current", () => {
  assert.equal(validateUpdates(clone(updates)).length, 1);
  const result = spawnSync(process.execPath, ["scripts/generate-device-updates.js", "--check"], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("schema rejects missing sources or facts, duplicate slugs, and invalid states", () => {
  const cases = [
    update => { update[0].official_url = ""; },
    update => { update[0].official_facts = []; },
    update => { update.push(clone(update[0])); update[1].id = "another-id"; },
    update => { update[0].decision_state = "BUY_NOW"; },
    update => { update[0].evidence_state = "reviewed"; }
  ];

  for (const mutate of cases) {
    const candidate = clone(updates);
    mutate(candidate);
    assert.throws(() => validateUpdates(candidate), /Device update validation failed/);
  }
});

test("calendar dates require a real UTC round-trip date", () => {
  for (const value of ["2026-02-30", "2025-02-29", "2026-04-31", "2026-13-01", "2026-00-10", 20261015, null]) {
    assert.equal(isIsoDate(value), false, String(value));
  }
  for (const value of ["2024-02-29", "2026-02-28", "2026-04-30", "2026-12-31"]) {
    assert.equal(isIsoDate(value), true, value);
  }
  const invalid = clone(updates);
  invalid[0].announcement_date = "2026-02-30";
  assert.throws(() => validateUpdates(invalid), /announcement_date/);
});

test("source URLs reject credentials and unnecessary local or IP forms", () => {
  assert.equal(isHttpsUrl("https://dummy:secret@example.test/report"), false);
  assert.equal(isHttpsUrl("https://127.0.0.1/report"), false);
  assert.equal(isHttpsUrl("https://localhost/report"), false);
  assert.equal(isHttpsUrl("https://localhost./report"), false);
  assert.equal(isHttpsUrl("https://example.local./report"), false);
  assert.equal(isHttpsUrl("https://example.test:8443/report"), false);
  assert.equal(isHttpsUrl("https://example.test:443/report"), false);
  assert.equal(isHttpsUrl("https://example.test:0443/report"), false);
  assert.equal(isHttpsUrl("https://example.test/report"), true);

  const withUserInfo = clone(updates);
  withUserInfo[0].official_url = "https://dummy:password@www.razer.com/report";
  withUserInfo[0].official_sources[0].url = withUserInfo[0].official_url;
  assert.throws(() => validateUpdates(withUserInfo), /safe HTTPS/);
});

test("official-only evidence cannot become a strong purchase candidate", () => {
  const candidate = clone(updates);
  candidate[0].decision_state = "UPGRADE_CANDIDATE";
  assert.throws(() => validateUpdates(candidate), /official specifications alone/);

  const withDiscoveredReview = clone(updates);
  validateUpdates(withDiscoveredReview);
  assert.equal(withDiscoveredReview[0].decision_state, "WATCH");
});

test("independent evidence labels require matching independent sources", () => {
  const oneSourceMissing = clone(updates);
  oneSourceMissing[0].evidence_state = "independent_test_available";
  assert.throws(() => validateUpdates(oneSourceMissing), /requires one adopted, confirmed independent source/);

  const manufacturerAsIndependent = clone(updates);
  manufacturerAsIndependent[0].evidence_state = "independent_test_available";
  manufacturerAsIndependent[0].independent_sources = [independentSource("brand-review", {
    url: "https://reviews.razer.com/review",
    provider_id: "razer",
    origin_provider_id: "razer",
    publisher_group: "razer"
  })];
  assert.throws(() => validateUpdates(manufacturerAsIndependent), /manufacturer-controlled/);

  const manufacturerAlias = clone(updates);
  manufacturerAlias[0].evidence_state = "independent_test_available";
  manufacturerAlias[0].independent_sources = [independentSource("brand-alias", {
    url: "https://reviews.razer.com/review",
    provider_id: "Razer Inc.",
    origin_provider_id: "RAZER",
    publisher_group: "Razer Incorporated"
  })];
  assert.throws(() => validateUpdates(manufacturerAlias), /manufacturer-controlled/);

  const mirroredReport = clone(updates);
  mirroredReport[0].evidence_state = "multiple_independent_sources";
  mirroredReport[0].independent_sources = [
    independentSource("mirror-a", { url: "https://a.review.example/report", source_origin_id: "same-report", origin_provider_id: "same-provider", publisher_group: "same-publisher" }),
    independentSource("mirror-b", { url: "https://b.review.example/report", source_origin_id: "same-report", origin_provider_id: "same-provider", publisher_group: "same-publisher", republication_of_source_id: "mirror-a" })
  ];
  assert.throws(() => validateUpdates(mirroredReport), /republications cannot be adopted|requires a pair with independent source origins/);

  const samePublisherGroup = clone(updates);
  samePublisherGroup[0].evidence_state = "multiple_independent_sources";
  samePublisherGroup[0].independent_sources = [
    independentSource("lab-a", { publisher_group: "Shared Media Group" }),
    independentSource("lab-b", { publisher_group: "shared-media-group" })
  ];
  assert.throws(() => validateUpdates(samePublisherGroup), /pair with independent source origins/);

  const noIndependentPair = clone(updates);
  noIndependentPair[0].evidence_state = "multiple_independent_sources";
  noIndependentPair[0].independent_sources = [
    independentSource("matrix-a", { source_origin_id: "o1", origin_provider_id: "p1", publisher_group: "g1" }),
    independentSource("matrix-b", { source_origin_id: "o2", origin_provider_id: "p2", publisher_group: "g1" }),
    independentSource("matrix-c", { source_origin_id: "o2", origin_provider_id: "p1", publisher_group: "g2" })
  ];
  assert.throws(() => validateUpdates(noIndependentPair), /pair with independent source origins/);

  const duplicateUrl = clone(updates);
  duplicateUrl[0].evidence_state = "multiple_independent_sources";
  duplicateUrl[0].independent_sources = [
    independentSource("url-a", { url: "https://same.review.example/report" }),
    independentSource("url-b", { url: "https://same.review.example/report" })
  ];
  assert.throws(() => validateUpdates(duplicateUrl), /source URL is duplicated/);

  const republished = clone(updates);
  republished[0].evidence_state = "multiple_independent_sources";
  republished[0].independent_sources = [
    independentSource("original"),
    independentSource("republication", { republication_of_source_id: "original" })
  ];
  assert.throws(() => validateUpdates(republished), /republications cannot be adopted/);

  const duplicatedId = clone(updates);
  duplicatedId[0].evidence_state = "multiple_independent_sources";
  duplicatedId[0].independent_sources = [independentSource("same"), independentSource("other", { source_id: "same" })];
  assert.throws(() => validateUpdates(duplicatedId), /source_id is duplicated/);

  const genuinelySeparate = clone(updates);
  genuinelySeparate[0].evidence_state = "multiple_independent_sources";
  genuinelySeparate[0].independent_sources = [independentSource("lab-a"), independentSource("lab-b")];
  assert.doesNotThrow(() => validateUpdates(genuinelySeparate));
});

test("claim vocabulary and republication references are closed and acyclic", () => {
  const unknownClaim = clone(updates);
  unknownClaim[0].decision_state = "UPGRADE_CANDIDATE";
  unknownClaim[0].evidence_state = "independent_test_available";
  unknownClaim[0].decision_claim_scopes = ["totally_made_up"];
  unknownClaim[0].independent_sources = [independentSource("lab-a", { claim_scopes: ["totally_made_up"] })];
  assert.throws(() => validateUpdates(unknownClaim), /known claims/);

  const missingParent = clone(updates);
  missingParent[0].independent_sources[0].republication_of_source_id = "missing";
  assert.throws(() => validateUpdates(missingParent), /source does not exist/);

  const selfReference = clone(updates);
  selfReference[0].independent_sources[0].republication_of_source_id = selfReference[0].independent_sources[0].source_id;
  assert.throws(() => validateUpdates(selfReference), /cannot reference itself/);

  const cycle = clone(updates);
  cycle[0].independent_sources[0].republication_of_source_id = cycle[0].independent_sources[1].source_id;
  cycle[0].independent_sources[1].republication_of_source_id = cycle[0].independent_sources[0].source_id;
  assert.throws(() => validateUpdates(cycle), /chain is cyclic/);
});

test("evidence state and purchase claims cannot contradict adopted evidence", () => {
  const officialOnlyWithAdopted = clone(updates);
  officialOnlyWithAdopted[0].independent_sources = [independentSource("lab-a")];
  assert.throws(() => validateUpdates(officialOnlyWithAdopted), /official_specs_only cannot contain adopted/);

  const unrelatedUpgradeEvidence = clone(updates);
  unrelatedUpgradeEvidence[0].decision_state = "UPGRADE_CANDIDATE";
  unrelatedUpgradeEvidence[0].evidence_state = "independent_test_available";
  unrelatedUpgradeEvidence[0].decision_claim_scopes = ["battery_runtime"];
  unrelatedUpgradeEvidence[0].independent_sources = [independentSource("lab-a", { claim_scopes: ["click_sound"] })];
  assert.throws(() => validateUpdates(unrelatedUpgradeEvidence), /requires adopted evidence for a decision claim/);
});

test("Update index and detail pages have unique SEO metadata and no copied image dependency", () => {
  const pages = ["updates/index.html", ...updates.map(update => `updates/${update.slug}.html`)];
  const titles = new Set();
  const descriptions = new Set();

  for (const file of pages) {
    const html = read(file);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    assert.match(html, /<html lang="ja">/i, file);
    assert.ok(title, `${file}: title missing`);
    assert.ok(description, `${file}: description missing`);
    assert.equal(titles.has(title), false, `${file}: duplicate title`);
    assert.equal(descriptions.has(description), false, `${file}: duplicate description`);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, /<link rel="canonical" href="https:\/\/hibo1120\.github\.io\/gamefit-lab\/updates\//i, file);
    for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
      assert.match(html, new RegExp(`<meta property="${property}"`), `${file}: ${property} missing`);
    }
    assert.match(html, /<meta name="twitter:card" content="summary">/i, file);
    assert.doesNotMatch(html, /<img\b|background-image\s*:|url\(\s*["']?https?:/i, `${file}: external image dependency`);
    assert.doesNotMatch(html, /amazon|rakuten|affiliate_clicked/i, `${file}: affiliate destination or tracking found`);
  }
});

test("detail pages disclose evidence limits, one diagnosis CTA, and official-only sources", () => {
  for (const update of updates) {
    const html = read(`updates/${update.slug}.html`);
    assert.match(html, /何が変わった？/);
    assert.match(html, /誰に関係する？/);
    assert.match(html, /今すぐ買い替える必要は？/);
    assert.match(html, /世界ローンチ日/);
    assert.match(html, /国内発売日/);
    assert.match(html, /国内予約開始日/);
    assert.match(html, /記事の実質更新日/);
    assert.match(html, /GameFit判断/);
    assert.match(html, /世の中に独立レビューが存在しないという意味ではありません/);
    assert.match(html, /確認済み・判断には未採用の原著レビュー/);
    assert.match(html, /クリック遅延/);
    assert.doesNotMatch(html, /click_latency|sensor_latency|build_quality|tracking_consistency/);
    assert.match(html, /Viper V4 Proの形状や、あなたの手への適合は判定しません/);
    assert.match(html, /PC側の予算優先度を確認する/);
    assert.doesNotMatch(html, />WATCH</);
    assert.doesNotMatch(html, />Evidence</);
    assert.doesNotMatch(html, />Source</);
    assert.doesNotMatch(html, /NO RUSH/);
    assert.equal((html.match(/class="diagnosis-cta"/g) || []).length, update.diagnosis_cta ? 1 : 0);
    assert.match(html, /data-content-type="device_update"/);
    assert.match(html, /utm_campaign=device_radar_v0_1/);

    const externalUrls = [...html.matchAll(/href="(https:[^"]+)"/gi)].map(match => new URL(match[1]));
    assert.ok(externalUrls.length >= 1);
    for (const url of externalUrls) assert.ok(["www.razer.com", "mysupport.razer.com", "www.rtings.com", "www.pcgamer.com", "hibo1120.github.io"].includes(url.hostname), `unexpected source ${url.hostname}`);
  }
});

test("sitemap lastmod follows substantive content updates, not verification-only checks", () => {
  const current = renderSitemapBlock(clone(updates));
  const verificationOnly = clone(updates);
  verificationOnly[0].last_verified_at = "2026-10-16";
  verificationOnly[0].sales_status_verified_at = "2026-10-16";
  assert.equal(renderSitemapBlock(verificationOnly), current);
  const substantive = clone(updates);
  substantive[0].content_updated_at = "2026-10-16";
  assert.notEqual(renderSitemapBlock(substantive), current);
});

test("landing and sitemap expose no more than three data-backed Update routes", () => {
  const landing = read("index.md");
  const sitemap = read("sitemap.xml");
  const block = landing.match(/<!-- DEVICE_UPDATES_START -->([\s\S]*?)<!-- DEVICE_UPDATES_END -->/)?.[1] || "";
  assert.ok(updates.length <= 3);
  assert.equal((block.match(/^### \[/gm) || []).length, updates.length);
  assert.match(block, /新しい＝買い替えるべき、ではありません/);

  for (const update of updates) {
    assert.match(block, new RegExp(`\\.\\/updates\\/${update.slug}\\.html`));
    assert.match(sitemap, new RegExp(`https://hibo1120\\.github\\.io/gamefit-lab/updates/${update.slug}\\.html`));
  }
  assert.match(sitemap, /https:\/\/hibo1120\.github\.io\/gamefit-lab\/updates\/<\/loc>/);
});

test("Update routes and every local asset resolve to files while a missing route stays absent", () => {
  const files = ["updates/index.html", ...updates.map(update => `updates/${update.slug}.html`)];
  for (const file of files) {
    const absolute = path.join(projectRoot, file);
    assert.equal(fs.existsSync(absolute), true, file);
    const html = read(file);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
      const value = match[1].replaceAll("&amp;", "&");
      if (value.startsWith("data:") || value.startsWith("#") || /^https?:/i.test(value)) continue;
      const pathname = value.split("?", 1)[0];
      const resolved = path.resolve(path.dirname(absolute), pathname);
      const localPath = pathname.endsWith("/")
        ? (resolved === projectRoot ? path.join(projectRoot, "index.md") : path.join(resolved, "index.html"))
        : resolved;
      assert.equal(fs.existsSync(localPath), true, `${file}: ${value}`);
    }
  }
  assert.equal(fs.existsSync(path.join(projectRoot, "updates", "not-found.html")), false);
});
