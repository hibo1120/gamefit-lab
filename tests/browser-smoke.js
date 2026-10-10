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

async function verifyPrivateGearViewport(browser, origin, viewport) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!request.url().startsWith(origin)) externalRequests.push(request.url());
  });
  page.on("requestfailed", request => errors.push(`request failed: ${request.url()}`));

  const response = await page.goto(`${origin}/gamefit-lab/private/personal-gear.html`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,nofollow,noarchive");
  assert.match(await page.locator("body").innerText(), /共有端末では使用しないでください/);
  assert.match(await page.locator("body").innerText(), /外部送信: なし/);
  assert.equal(await page.locator("#schema-version").innerText(), "1");
  assert.equal(await page.locator("#current-product option").count(), 6);

  await page.click("#to-taste");
  await page.selectOption("#avoid-attribute", "hump");
  await page.selectOption("#avoid-value", "rear");
  await page.check("#hard-avoid");
  await page.click("#save-taste");
  await page.selectOption("#input-method", "controller");
  await page.click("#to-recommend");
  assert.equal(await page.locator("#context-warning").isVisible(), true);
  assert.match(await page.locator("#context-warning").innerText(), /流用しません/);
  await page.selectOption("#input-method", "mnk");
  await page.click("#to-recommend");
  assert.equal(await page.locator("#recommendations .card").count(), 5);
  assert.match(await page.locator("#decision-summary").innerText(), /判断材料の多さはテスト用データによる仮評価/);

  await page.click("#to-feedback");
  await page.check('input[name="verdict"][value="disagree"]');
  await page.check('input[name="reason_code"][value="shape"]');
  await page.check('input[name="direction_code"][value="lower_hump"]');
  await page.click("#rerank");
  assert.match(await page.locator("#feedback-status").innerText(), /他の利用者の判定へ反映されることはありません/);
  assert.equal(await page.locator("#reranked .card").count(), 5);
  assert.equal(await page.locator("#accept-rerank").isVisible(), true);
  await page.click("#accept-rerank");
  assert.match(await page.locator("#feedback-status").innerText(), /見直した候補の方が合う/);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gamefit.personal_gear.v1")));
  assert.equal(saved.schema_version, 1);
  assert.equal(saved.user_id, undefined);
  assert.equal(saved.feedback.length, 2);
  assert.equal(saved.rerank_events.length, 1);

  const downloadPromise = page.waitForEvent("download");
  await page.click("#export-data");
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "gamefit-personal-gear-export.json");

  await page.evaluate(() => localStorage.setItem("gamefit.personal_gear.v1", "{broken"));
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator("#storage-status").innerText(), /保存内容を読み取れません/);
  const recoveryDownloadPromise = page.waitForEvent("download");
  await page.click("#export-data");
  const recoveryDownload = await recoveryDownloadPromise;
  assert.equal(recoveryDownload.suggestedFilename(), "gamefit-personal-gear-recovery.txt");
  assert.equal(fs.readFileSync(await recoveryDownload.path(), "utf8"), "{broken");
  page.once("dialog", dialog => dialog.accept());
  await page.click("#reset-data");
  assert.match(await page.locator("#storage-status").innerText(), /初期状態に戻しました/);
  await page.evaluate(() => {
    localStorage.setItem("other.application.key", "keep");
    localStorage.setItem("gamefit.private_validation.v1", "keep-validation");
  });
  page.once("dialog", dialog => dialog.accept());
  await page.click("#delete-data");
  assert.equal(await page.evaluate(() => localStorage.getItem("gamefit.personal_gear.v1")), null);
  assert.equal(await page.evaluate(() => localStorage.getItem("other.application.key")), "keep");
  assert.equal(await page.evaluate(() => localStorage.getItem("gamefit.private_validation.v1")), "keep-validation");

  if (viewport.width === 390) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }
  assert.deepEqual(externalRequests, []);
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
    await verifyPrivateGearViewport(browser, origin, { width: 1440, height: 1000 });
    await verifyPrivateGearViewport(browser, origin, { width: 390, height: 844 });
    assert.match(fs.readFileSync(path.join(projectRoot, "index.md"), "utf8"), /\(\.\/diagnose\.html\)/);
    assert.equal((await fetch(`${origin}/gamefit-lab/sitemap.xml`)).status, 200);
    assert.equal((await fetch(`${origin}/gamefit-lab/robots.txt`)).status, 200);
    const notFoundPage = await fetch(`${origin}/gamefit-lab/404.html`);
    assert.equal(notFoundPage.status, 200);
    assert.match(await notFoundPage.text(), /ページが見つかりません/);
    for (const route of [
      "/gamefit-lab/en/",
      "/gamefit-lab/en/diagnose.html",
      "/gamefit-lab/en/guides/upgrade-or-replace.html",
      "/gamefit-lab/en/guides/gpu-or-monitor.html",
      "/gamefit-lab/en/guides/budget-500.html",
      "/gamefit-lab/en/guides/do-i-need-new-gaming-pc.html"
    ]) assert.equal((await fetch(`${origin}${route}`)).status, 200, route);
    assert.equal((await fetch(`${origin}/gamefit-lab/not-found.html`)).status, 404);
    process.stdout.write("browser smoke: jp+global+private-PGI desktop=ok mobile390=ok games=4 usd=6 privacy=ok rerank=ok external=none console=clean 404=ok\n");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
