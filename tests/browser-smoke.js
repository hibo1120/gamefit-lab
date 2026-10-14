const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const projectRoot = path.join(__dirname, "..");

function serve() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/gamefit-lab")) pathname = pathname.slice("/gamefit-lab".length) || "/";
    const relative = pathname === "/" ? "index.md"
      : pathname.endsWith("/") ? `${pathname.replace(/^\/+/, "")}index.html`
        : pathname.replace(/^\/+/, "");
    const target = path.resolve(projectRoot, relative);
    if (!target.startsWith(path.resolve(projectRoot))) return response.writeHead(403).end();
    fs.readFile(target, (error, body) => {
      if (error) return response.writeHead(404).end("not found");
      const contentType = target.endsWith(".js") ? "text/javascript; charset=utf-8"
        : target.endsWith(".html") ? "text/html; charset=utf-8"
          : target.endsWith(".xml") ? "application/xml; charset=utf-8"
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

async function verifyViewport(browser, origin, viewport) {
  const context = await browser.newContext({ viewport });
  await context.route(/https:\/\/.*\.posthog\.com\/.*/, route => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: ""
  }));
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__analyticsEvents = [];
    window.posthog = {
      __SV: 1,
      init() {},
      capture(event, properties, options) {
        window.__analyticsEvents.push({ event, properties, options });
      }
    };
    window.__openedShareUrl = "";
    window.__copiedDiagnosisUrl = "";
    window.open = url => {
      window.__openedShareUrl = String(url);
      return null;
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value) {
          window.__copiedDiagnosisUrl = String(value);
          return Promise.resolve();
        }
      }
    });
  });
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("posthog")) errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => {
    if (request.url().startsWith(origin)) errors.push(`request failed: ${request.url()}`);
  });

  const landingResponse = await page.goto(`${origin}/gamefit-lab/en/?utm_source=google&utm_medium=organic&utm_campaign=seo_cro_phase1&source=en_index&email=private%40example.test`, { waitUntil: "networkidle" });
  assert.equal(landingResponse.status(), 200);
  assert.equal(await page.locator(".diagnosis-cta").count(), 1);
  assert.deepEqual(await page.evaluate(() => window.__analyticsEvents.map(item => item.event)), ["landing_page_viewed"]);
  assert.equal(await page.evaluate(() => JSON.stringify(window.__analyticsEvents).includes("private")), false);

  const guideResponse = await page.goto(`${origin}/gamefit-lab/guides/budget-50000.html?utm_source=gamefit&utm_medium=content&utm_campaign=initial_guides&source=budget_50000&email=private%40example.test`, { waitUntil: "networkidle" });
  assert.equal(guideResponse.status(), 200);
  assert.deepEqual(await page.evaluate(() => window.__analyticsEvents.map(item => item.event)), ["guide_page_viewed"]);
  const guideView = await page.evaluate(() => window.__analyticsEvents[0]);
  assert.equal(guideView.properties.content_type, "guide");
  assert.equal(guideView.properties.budget_band, "50000");
  assert.equal(JSON.stringify(guideView).includes("private"), false);
  await page.locator(".diagnosis-cta").evaluate(link => link.addEventListener("click", event => event.preventDefault()));
  await page.locator(".diagnosis-cta").click();
  const guideEvents = await page.evaluate(() => window.__analyticsEvents);
  assert.deepEqual(guideEvents.map(item => item.event), ["guide_page_viewed", "diagnosis_cta_clicked"]);
  assert.deepEqual(guideEvents[1].options, { transport: "sendBeacon", send_instantly: true });

  const updateResponse = await page.goto(`${origin}/gamefit-lab/updates/razer-viper-v4-pro.html?utm_source=google&utm_medium=organic&utm_campaign=device_radar_v0_1&utm_content=private_content&source=search&email=private%40example.test`, { waitUntil: "networkidle" });
  assert.equal(updateResponse.status(), 200);
  assert.equal(await page.locator("img").count(), 0);
  assert.equal(await page.locator(".diagnosis-cta").count(), 1);
  assert.match(await page.locator("body").innerText(), /公式仕様のみ/);
  assert.match(await page.locator("body").innerText(), /WATCH/);
  const updateEvents = await page.evaluate(() => window.__analyticsEvents);
  assert.deepEqual(updateEvents.map(item => item.event), ["device_update_viewed"]);
  assert.deepEqual(updateEvents[0].properties, {
    product_slug: "razer-viper-v4-pro",
    brand: "razer",
    category: "mouse",
    evidence_state: "official_specs_only",
    decision_state: "WATCH",
    utm_source: "google",
    utm_medium: "organic",
    utm_campaign: "device_radar_v0_1",
    source: "search",
    language: "ja",
    region_version: "jp",
    page_source: "razer-viper-v4-pro",
    $geoip_disable: true
  });
  assert.equal(JSON.stringify(updateEvents).includes("private"), false);
  await page.locator(".diagnosis-cta").evaluate(link => link.addEventListener("click", event => event.preventDefault()));
  await page.locator(".diagnosis-cta").click();
  assert.deepEqual(await page.evaluate(() => window.__analyticsEvents.map(item => item.event)), ["device_update_viewed", "diagnosis_cta_clicked"]);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);

  const response = await page.goto(`${origin}/gamefit-lab/diagnose.html`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("#game option").count(), 4);
  assert.equal(await page.locator("#official-source-links a").count(), 4);
  assert.match(await page.locator("body").innerText(), /広告について/);
  assert.match(await page.locator("body").innerText(), /免責事項/);

  for (const game of ["valorant", "apex", "fortnite", "mhwilds"]) {
    await page.selectOption("#game", game);
    await page.fill("#currentFps", game === "mhwilds" ? "30" : "100");
    await page.click("button[type=submit]");
    await page.locator("#ranking .rank-card").first().waitFor();
    assert.equal(await page.locator("#ranking .rank-card").count(), 5, game);
  }

  await page.fill("#hardware", "SECRET CPU / GPU FREE TEXT");
  await page.click("button[type=submit]");
  await page.click("#share-x");
  const openedShareUrl = await page.evaluate(() => window.__openedShareUrl);
  const shareIntent = new URL(openedShareUrl);
  assert.equal(shareIntent.origin, "https://x.com");
  assert.equal(shareIntent.pathname, "/intent/post");
  assert.equal(openedShareUrl.includes("SECRET"), false);
  assert.equal(new URL(shareIntent.searchParams.get("url")).searchParams.get("utm_content"), "result_share");

  await page.click("#copy-diagnosis-url");
  await page.getByText("診断URLをコピーしました。").waitFor();
  const copiedUrl = new URL(await page.evaluate(() => window.__copiedDiagnosisUrl));
  assert.equal(copiedUrl.searchParams.get("utm_content"), "result_copy");
  assert.equal(await page.locator("#share-x").isVisible(), true);
  assert.equal(await page.locator("#copy-diagnosis-url").isVisible(), true);

  assert.equal(await page.locator("#affiliate-recommendations").isHidden(), true);
  await page.fill("#currentFps", "0");
  assert.equal(await page.locator("#currentFps").evaluate(element => element.checkValidity()), false);

  const globalResponse = await page.goto(`${origin}/gamefit-lab/en/diagnose.html?utm_source=x&utm_medium=social&utm_campaign=gamefit_global_test&utm_content=en_x_09&source=en_x_09`, { waitUntil: "networkidle" });
  assert.equal(globalResponse.status(), 200);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator("#game option").count(), 4);
  assert.deepEqual(await page.locator("#budget option").evaluateAll(options => options.map(option => option.value)), ["100", "300", "500", "1000", "1500", "2000"]);
  assert.equal(await page.locator("#official-source-links a").count(), 4);
  assert.match(await page.locator("body").innerText(), /Advertising disclosure/);
  assert.match(await page.locator("body").innerText(), /Limitations/);
  assert.match(await page.locator("body").innerText(), /Privacy/);
  assert.equal(await page.locator('a[lang="ja"][href="../diagnose.html"]').isVisible(), true);

  for (const game of ["valorant", "apex", "fortnite", "mhwilds"]) {
    await page.selectOption("#game", game);
    await page.fill("#currentFps", game === "mhwilds" ? "30" : "100");
    await page.click("button[type=submit]");
    await page.locator("#ranking .rank-card").first().waitFor();
    assert.equal(await page.locator("#ranking .rank-card").count(), 5, `global ${game}`);
    assert.equal(/[ぁ-んァ-ヶ一-龠]/.test(await page.locator("#ranking").innerText()), false, game);
  }

  await page.fill("#hardware", "SECRET GLOBAL CPU / GPU FREE TEXT");
  await page.click("button[type=submit]");
  await page.click("#share-x");
  const globalIntent = new URL(await page.evaluate(() => window.__openedShareUrl));
  assert.equal(globalIntent.pathname, "/intent/post");
  assert.equal(globalIntent.toString().includes("SECRET"), false);
  const globalSharedUrl = new URL(globalIntent.searchParams.get("url"));
  assert.equal(globalSharedUrl.pathname, "/gamefit-lab/en/diagnose.html");
  assert.equal(globalSharedUrl.searchParams.get("utm_campaign"), "gamefit_global_test");
  assert.equal(globalSharedUrl.searchParams.get("utm_content"), "en_result_share");

  await page.click("#copy-diagnosis-url");
  await page.getByText("Diagnosis link copied.").waitFor();
  const globalCopiedUrl = new URL(await page.evaluate(() => window.__copiedDiagnosisUrl));
  assert.equal(globalCopiedUrl.searchParams.get("utm_content"), "en_result_copy");
  assert.equal(await page.locator("#affiliate-recommendations").isHidden(), true);
  await page.fill("#currentFps", "0");
  assert.equal(await page.locator("#currentFps").evaluate(element => element.checkValidity()), false);

  if (viewport.width === 390) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }
  assert.deepEqual(errors, []);
  await context.close();
}

(async () => {
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchBrowser();
    await verifyViewport(browser, origin, { width: 1440, height: 1000 });
    await verifyViewport(browser, origin, { width: 390, height: 844 });
    assert.match(fs.readFileSync(path.join(projectRoot, "index.md"), "utf8"), /href="\.\/diagnose\.html\?/);
    assert.equal((await fetch(`${origin}/gamefit-lab/sitemap.xml`)).status, 200);
    assert.equal((await fetch(`${origin}/gamefit-lab/robots.txt`)).status, 200);
    for (const route of [
      "/gamefit-lab/en/",
      "/gamefit-lab/en/diagnose.html",
      "/gamefit-lab/en/guides/upgrade-or-replace.html",
      "/gamefit-lab/en/guides/gpu-or-monitor.html",
      "/gamefit-lab/en/guides/budget-500.html",
      "/gamefit-lab/en/guides/do-i-need-new-gaming-pc.html",
      "/gamefit-lab/updates/",
      "/gamefit-lab/updates/razer-viper-v4-pro.html"
    ]) assert.equal((await fetch(`${origin}${route}`)).status, 200, route);
    assert.equal((await fetch(`${origin}/gamefit-lab/not-found.html`)).status, 404);
    process.stdout.write("browser smoke: jp+global desktop=ok mobile390=ok games=4 usd=6 invalid=ok share=ok console=clean 404=ok\n");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
