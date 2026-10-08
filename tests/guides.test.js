const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const guides = [
  "upgrade-or-replace.html",
  "budget-30000.html",
  "budget-50000.html",
  "budget-100000.html",
  "valorant-upgrade.html",
  "apex-upgrade.html",
  "fortnite-upgrade.html",
  "mhwilds-upgrade.html"
];
const expectedContext = {
  "upgrade-or-replace.html": { source: "upgrade_or_replace" },
  "budget-30000.html": { source: "budget_30000", budget: "30000" },
  "budget-50000.html": { source: "budget_50000", budget: "50000" },
  "budget-100000.html": { source: "budget_100000", budget: "100000" },
  "valorant-upgrade.html": { source: "valorant_upgrade", game: "valorant" },
  "apex-upgrade.html": { source: "apex_upgrade", game: "apex" },
  "fortnite-upgrade.html": { source: "fortnite_upgrade", game: "fortnite" },
  "mhwilds-upgrade.html": { source: "mhwilds_upgrade", game: "mhwilds" }
};

function readGuide(file) {
  return fs.readFileSync(path.join(projectRoot, "guides", file), "utf8");
}

function attr(fragment, name) {
  return fragment.match(new RegExp(`${name}="([^"]*)"`))?.[1] || null;
}

function visibleArticleLength(html) {
  const article = html.match(/<article class="article">([\s\S]*?)<\/article>/i)?.[1] || "";
  return article
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[^;]+;/g, "x")
    .replace(/\s+/g, "")
    .length;
}

test("all eight guides have unique, complete SEO metadata and concise content", () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const file of guides) {
    const html = readGuide(file);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    const length = visibleArticleLength(html);

    assert.match(html, /<html lang="ja">/i, file);
    assert.ok(title, `${file}: title missing`);
    assert.ok(description, `${file}: description missing`);
    assert.equal(titles.has(title), false, `${file}: duplicate title`);
    assert.equal(descriptions.has(description), false, `${file}: duplicate description`);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://hibo1120\\.github\\.io/gamefit-lab/guides/${file.replace(".", "\\.")}">`));
    for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
      assert.match(html, new RegExp(`<meta property="${property}"`), `${file}: ${property} missing`);
    }
    assert.match(html, /<meta name="twitter:card" content="summary">/);
    assert.ok(length >= 800 && length <= 1500, `${file}: article length ${length} is outside 800-1500 characters`);
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /class="conclusion"/);
    assert.match(html, /現状維持/);
  }
});

test("every guide CTA preserves campaign parameters and page context", () => {
  for (const file of guides) {
    const html = readGuide(file);
    const match = html.match(/<a class="diagnosis-cta"([^>]*)>([^<]+)<\/a>/i);
    assert.ok(match, `${file}: CTA missing`);
    assert.equal(match[2], "今の環境なら何を変える？無料診断");

    const attributes = match[1];
    const href = attr(attributes, "href").replaceAll("&amp;", "&");
    const url = new URL(href, "https://hibo1120.github.io");
    const context = expectedContext[file];

    assert.equal(url.pathname, "/gamefit-lab/diagnose.html");
    assert.equal(url.searchParams.get("utm_source"), "gamefit");
    assert.equal(url.searchParams.get("utm_medium"), "content");
    assert.equal(url.searchParams.get("utm_campaign"), "initial_guides");
    assert.equal(url.searchParams.get("source"), context.source);
    assert.equal(attr(attributes, "data-source-page"), context.source);
    assert.equal(attr(attributes, "data-content-type"), "guide");
    assert.equal(attr(attributes, "data-game"), context.game || null);
    assert.equal(attr(attributes, "data-budget-band"), context.budget || null);
  }
});

test("guides link to related guides and contain no affiliate destinations", () => {
  const allowedExternalHosts = new Set([
    "playvalorant.com",
    "www.ea.com",
    "www.epicgames.com",
    "store.captown.capcom.com"
  ]);

  for (const file of guides) {
    const html = readGuide(file);
    const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map(match => match[1].replaceAll("&amp;", "&"));
    assert.ok(hrefs.filter(href => href.startsWith("./") && href.endsWith(".html")).length >= 2, `${file}: related links missing`);
    for (const href of hrefs.filter(value => /^https?:/i.test(value))) {
      const url = new URL(href);
      if (url.hostname === "hibo1120.github.io") continue;
      assert.ok(allowedExternalHosts.has(url.hostname), `${file}: unexpected external destination ${url.hostname}`);
    }
  }
});

test("sitemap, robots, index, and diagnosis page expose all acquisition routes", () => {
  const sitemap = fs.readFileSync(path.join(projectRoot, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(projectRoot, "robots.txt"), "utf8");
  const index = fs.readFileSync(path.join(projectRoot, "index.md"), "utf8");
  const diagnosis = fs.readFileSync(path.join(projectRoot, "diagnose.html"), "utf8");

  for (const file of guides) {
    assert.match(sitemap, new RegExp(`https://hibo1120\\.github\\.io/gamefit-lab/guides/${file.replace(".", "\\.")}`));
    assert.match(index, new RegExp(`\\./guides/${file.replace(".", "\\.")}`));
  }
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/hibo1120\.github\.io\/gamefit-lab\/sitemap\.xml/);
  assert.match(diagnosis, /id="guide-heading">判断ガイド/);
  assert.match(diagnosis, /\.\/guides\/budget-50000\.html/);
});

test("all guide, SEO, CTA, and internal asset URLs return HTTP 200 locally", async t => {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname.startsWith("/gamefit-lab")) pathname = pathname.slice("/gamefit-lab".length) || "/";
    const relative = pathname === "/" ? "index.md" : pathname.replace(/^\/+/, "");
    const target = path.resolve(projectRoot, relative);
    if (!target.startsWith(path.resolve(projectRoot))) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(target, (error, body) => {
      if (error) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200).end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const paths = [
    ...guides.map(file => `/gamefit-lab/guides/${file}`),
    "/gamefit-lab/diagnose.html",
    "/gamefit-lab/sitemap.xml",
    "/gamefit-lab/robots.txt"
  ];

  for (const route of paths) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, route);
  }

  const localUrls = new Set();
  for (const file of guides) {
    const html = readGuide(file);
    const base = new URL(`/gamefit-lab/guides/${file}`, origin);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
      const value = match[1].replaceAll("&amp;", "&");
      if (value.startsWith("data:") || value.startsWith("#")) continue;
      const url = new URL(value, base);
      if (url.origin === origin) localUrls.add(url.href);
    }
  }
  const diagnosis = fs.readFileSync(path.join(projectRoot, "diagnose.html"), "utf8");
  const diagnosisBase = new URL("/gamefit-lab/diagnose.html", origin);
  for (const match of diagnosis.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    const value = match[1].replaceAll("&amp;", "&");
    if (value.startsWith("data:") || value.startsWith("#") || /^https?:/i.test(value)) continue;
    localUrls.add(new URL(value, diagnosisBase).href);
  }
  for (const url of localUrls) {
    const response = await fetch(url);
    assert.equal(response.status, 200, url);
  }
  const missing = await fetch(`${origin}/gamefit-lab/does-not-exist.html`);
  assert.equal(missing.status, 404);
});
