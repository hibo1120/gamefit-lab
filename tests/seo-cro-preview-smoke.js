const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const previewRoot = path.join(__dirname, "..", ".seo-cro-preview-dist");

function servePreview() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const target = path.resolve(previewRoot, relative);
    if (!target.startsWith(path.resolve(previewRoot))) return response.writeHead(403).end();
    fs.readFile(target, (error, body) => {
      if (error) return response.writeHead(404).end("not found");
      const contentType = target.endsWith(".html") ? "text/html; charset=utf-8"
        : target.endsWith(".js") ? "text/javascript; charset=utf-8"
          : target.endsWith(".css") ? "text/css; charset=utf-8"
            : "text/plain; charset=utf-8";
      response.writeHead(200, { "content-type": contentType }).end(body);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (firstError) {
    try {
      return await chromium.launch({ headless: true, channel: "msedge" });
    } catch (_) {
      throw firstError;
    }
  }
}

async function checkViewport(browser, origin, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => errors.push(`request failed: ${request.url()}`));

  const response = await page.goto(`${origin}/?utm_source=google&utm_medium=organic&utm_campaign=seo_cro_phase1&source=index&email=private%40example.test`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  const body = await page.locator("body").innerText();
  assert.match(body, /GameFit SEO\/CRO Preview/);
  assert.match(body, /今のPC環境に、次の1円をどこへ使うべきか？/);
  assert.match(body, /FPS不足、GPU交換、PC買い替え。/);
  assert.match(body, /現在は無料の簡易診断と判断ガイドを公開しています。/);
  assert.match(body, /最新Gear Updates/);
  assert.match(body, /Razer Viper V4 Pro/);
  assert.match(body, /追加検証を待つ/);
  assert.match(body, /判断根拠は公式仕様のみ/);
  assert.doesNotMatch(body, /現在は公開テスト準備中です。/);
  assert.equal((body.match(/FPS不足、GPU交換、PC買い替え。/g) || []).length, 1);
  assert.equal(await page.locator(".diagnosis-cta").count(), 1);
  assert.equal(await page.locator('script[src^="./analytics.js"]').count(), 1);
  assert.equal(await page.locator('script[src^="./posthog-init.js"]').count(), 1);
  assert.equal(await page.locator('script[src^="./guide.js"]').count(), 1);
  assert.equal(await page.locator('link[href="./assets/css/style.css"]').count(), 1);
  assert.match(await page.locator("body").innerText(), /Gear Updates・診断の閲覧/);
  assert.deepEqual(await page.evaluate(() => window.GameFitPreviewAnalytics.events().map(item => item.event)), ["landing_page_viewed"]);
  assert.equal(await page.evaluate(() => JSON.stringify(window.GameFitPreviewAnalytics.events()).includes("private")), false);

  const cta = page.locator(".diagnosis-cta");
  const ctaUrl = new URL(await cta.getAttribute("href"), origin);
  assert.equal(ctaUrl.searchParams.get("utm_campaign"), "seo_cro_phase1");
  await cta.evaluate(link => link.addEventListener("click", event => event.preventDefault()));
  await cta.click();
  const events = await page.evaluate(() => window.GameFitPreviewAnalytics.events());
  assert.deepEqual(events.map(item => item.event), ["landing_page_viewed", "diagnosis_cta_clicked"]);
  assert.deepEqual(events[1].options, { transport: "sendBeacon", send_instantly: true });

  if (viewport.width === 390) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }
  assert.deepEqual(errors, []);
  await context.close();
}

async function checkQaFlow(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => errors.push(`request failed: ${request.url()}`));

  let response = await page.goto(`${origin}/updates/index.html?qa=1`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  const detail = page.locator(".update-card a").first();
  assert.equal(new URL(await detail.getAttribute("href"), origin).searchParams.get("qa"), "1");
  await detail.click();
  await page.waitForLoadState("networkidle");
  assert.equal(new URL(page.url()).searchParams.get("qa"), "1");
  const external = page.locator('.source-list a[href^="https://"]').first();
  assert.equal(new URL(await external.getAttribute("href")).searchParams.has("qa"), false);
  const cta = page.locator(".diagnosis-cta");
  assert.equal(new URL(await cta.getAttribute("href"), origin).searchParams.get("qa"), "1");
  await cta.click();
  await page.waitForLoadState("networkidle");
  const diagnosisUrl = new URL(page.url());
  assert.equal(diagnosisUrl.pathname, "/diagnose.html");
  assert.equal(diagnosisUrl.searchParams.get("qa"), "1");
  assert.equal(await page.locator("#diagnosis-form").count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  assert.deepEqual(errors, []);
  await context.close();
}

(async () => {
  assert.equal(fs.existsSync(path.join(previewRoot, "index.html")), true, "run build-seo-cro-preview.js first");
  const server = await servePreview();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchBrowser();
    await checkViewport(browser, origin, { width: 1440, height: 1000 });
    await checkViewport(browser, origin, { width: 390, height: 844 });
    await checkQaFlow(browser, origin);
    assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /Disallow: \//);
    assert.equal((await fetch(`${origin}/assets/css/style.css`)).status, 200);
    assert.equal((await fetch(`${origin}/updates/index.html`)).status, 200);
    assert.equal((await fetch(`${origin}/updates/razer-viper-v4-pro.html`)).status, 200);
    assert.equal((await fetch(`${origin}/not-found.html`)).status, 404);
    const manifest = await (await fetch(`${origin}/preview-manifest.json`)).json();
    assert.equal(manifest.source_remote_head, "46f96d18289c2c89d32838dbd53af222dc315c2b");
    assert.equal(manifest.source_tree, "08588b7d8c4bfa3ad310ebba16068807afbc01ab");
    assert.equal(manifest.files.some(file => file.path === "assets/css/style.css"), true);
    assert.equal(manifest.files.some(file => /(?:^|\/)(?:growth|scripts|settings-notebook|tests)(?:\/|$)/.test(file.path)), false);
    process.stdout.write("SEO/CRO preview smoke: desktop=ok mobile390=ok landing-event=ok CTA-beacon=ok privacy=ok console=clean 404=ok\n");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
