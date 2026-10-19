"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const projectRoot = path.join(__dirname,"..");
const artifactDir = path.join(projectRoot,"artifacts","catalog-review-local-20261019");
const origin = process.env.GAMEFIT_QA_ORIGIN || "http://127.0.0.1:4187";
const debugOrigin = process.env.GAMEFIT_CDP_ORIGIN || "http://127.0.0.1:9229";

function serve() {
  const server = http.createServer((request,response) => {
    const relative = decodeURIComponent(new URL(request.url,origin).pathname).replace(/^\/+/,"") || "index.md";
    const target = path.resolve(projectRoot,relative);
    if (!target.startsWith(path.resolve(projectRoot))) return response.writeHead(403).end();
    fs.readFile(target,(error,body) => {
      if (error) return response.writeHead(404).end("not found");
      const contentType = target.endsWith(".js") ? "text/javascript; charset=utf-8" : target.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
      response.writeHead(200,{ "content-type":contentType }).end(body);
    });
  });
  return new Promise(resolve => server.listen(Number(new URL(origin).port),"127.0.0.1",() => resolve(server)));
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    await new Promise((resolve,reject) => {
      this.socket.addEventListener("open",resolve,{ once:true });
      this.socket.addEventListener("error",reject,{ once:true });
    });
  }
  on(method,handler) {
    if (!this.listeners.has(method)) this.listeners.set(method,[]);
    this.listeners.get(method).push(handler);
  }
  start() {
    this.socket.addEventListener("message",event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      for (const handler of this.listeners.get(message.method) || []) handler(message.params || {});
    });
  }
  send(method,params={}) {
    const id = this.nextId++;
    return new Promise((resolve,reject) => {
      this.pending.set(id,{ resolve,reject,method });
      this.socket.send(JSON.stringify({ id,method,params }));
    });
  }
  close() { this.socket.close(); }
}

async function createTarget() {
  const response = await fetch(`${debugOrigin}/json/new?${encodeURIComponent("about:blank")}`,{ method:"PUT" });
  assert.equal(response.ok,true,`CDP target creation failed: ${response.status}`);
  return response.json();
}

async function evaluate(client,expression) {
  const result = await client.send("Runtime.evaluate",{ expression,awaitPromise:true,returnByValue:true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function waitFor(client,expression,timeoutMs=5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client,expression)) return;
    await new Promise(resolve => setTimeout(resolve,50));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function navigate(client,url) {
  await client.send("Page.navigate",{ url });
  await waitFor(client,"document.readyState === 'complete'");
  await evaluate(client,"new Promise(resolve => setTimeout(resolve, 100))");
}

async function setValue(client,id,value,eventName) {
  await evaluate(client,`(() => { const node=document.getElementById(${JSON.stringify(id)}); node.value=${JSON.stringify(value)}; node.dispatchEvent(new Event(${JSON.stringify(eventName)},{bubbles:true})); return node.value; })()`);
}

async function click(client,id) {
  await evaluate(client,`document.getElementById(${JSON.stringify(id)}).click()`);
  await evaluate(client,"new Promise(resolve => setTimeout(resolve, 50))");
}

async function screenshot(client,name) {
  const result = await client.send("Page.captureScreenshot",{ format:"png",captureBeyondViewport:true });
  fs.mkdirSync(artifactDir,{ recursive:true });
  fs.writeFileSync(path.join(artifactDir,name),Buffer.from(result.data,"base64"));
}

(async () => {
  const server = await serve();
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const externalRequests = [];
  const browserErrors = [];
  await client.open();
  client.start();
  client.on("Network.requestWillBeSent",params => {
    const url = params.request?.url || "";
    if (/^https?:/i.test(url) && !url.startsWith(origin)) externalRequests.push(url);
  });
  client.on("Runtime.exceptionThrown",params => browserErrors.push(params.exceptionDetails?.text || "runtime exception"));
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");

  try {
    await navigate(client,`${origin}/private/personal-gear.html`);
    await setValue(client,"category","audio","change");
    await setValue(client,"product-search","PRO X 2 LIGHTSPEED","input");
    assert.deepEqual(await evaluate(client,"[...document.querySelectorAll('#current-product option')].map(item=>item.value)"),["audio-logitech-pro-x2","not_listed"]);
    assert.equal(await evaluate(client,"document.getElementById('current-product').value"),"audio-logitech-pro-x2");
    assert.match(await evaluate(client,"document.getElementById('product-identity-status').innerText"),/audio-logitech-pro-x-2-lightspeed/);
    assert.match(await evaluate(client,"document.getElementById('product-identity-status').innerText"),/旧ID audio-logitech-pro-x2/);
    assert.match(await evaluate(client,"document.getElementById('product-catalog-status').innerText"),/既存fixtureのテスト用比較データ/);
    await click(client,"to-taste");
    await click(client,"save-taste");
    await click(client,"to-recommend");
    assert.doesNotMatch(await evaluate(client,"document.getElementById('decision-summary').innerText"),/製品名を確認済みです。ただし/);
    const saved = await evaluate(client,"JSON.parse(localStorage.getItem('gamefit.personal_gear.v1'))");
    assert.equal(saved.setup.current_product_id,"audio-logitech-pro-x2");
    await navigate(client,`${origin}/private/personal-gear.html`);
    assert.equal(await evaluate(client,"document.getElementById('current-product').value"),"audio-logitech-pro-x2");
    await evaluate(client,`(() => { const state=JSON.parse(localStorage.getItem('gamefit.personal_gear.v1')); state.setup.current_product_id='audio-logitech-pro-x-2-lightspeed'; localStorage.setItem('gamefit.personal_gear.v1',JSON.stringify(state)); })()`);
    await navigate(client,`${origin}/private/personal-gear.html`);
    assert.equal(await evaluate(client,"document.getElementById('current-product').value"),"audio-logitech-pro-x2");
    await screenshot(client,"headset-canonical-roundtrip.png");

    await evaluate(client,"localStorage.removeItem('gamefit.personal_gear.v1')");
    await navigate(client,`${origin}/private/personal-gear.html`);
    await client.send("Emulation.setDeviceMetricsOverride",{ width:390,height:844,deviceScaleFactor:1,mobile:true });
    await setValue(client,"category","mouse","change");
    await setValue(client,"product-search","RZ01-04620","input");
    assert.deepEqual(await evaluate(client,"[...document.querySelectorAll('#current-product option')].map(item=>item.value)"),["mouse-razer-basilisk-v3-pro","not_listed"]);
    await setValue(client,"product-search","RZ01-0524","input");
    assert.deepEqual(await evaluate(client,"[...document.querySelectorAll('#current-product option')].map(item=>item.value)"),["mouse-razer-basilisk-v3-pro-35k","not_listed"]);
    await setValue(client,"product-search","910-006160","input");
    assert.deepEqual(await evaluate(client,"[...document.querySelectorAll('#current-product option')].map(item=>item.value)"),["mouse-logitech-g502-x-plus","not_listed"]);
    const facts = await evaluate(client,"document.getElementById('product-spec-list').innerText");
    assert.match(facts,/接続方式/);
    assert.match(facts,/確認保留/);
    assert.match(facts,/センサー名 \/ 最大DPI/);
    assert.doesNotMatch(facts,/25000|25,000|25600|25,600|44000|44,000/);
    assert.match(await evaluate(client,"document.getElementById('product-comparison-status').innerText"),/保留項目は比較候補から除外/);
    await click(client,"to-taste");
    await click(client,"save-taste");
    await click(client,"to-recommend");
    assert.match(await evaluate(client,"document.getElementById('decision-summary').innerText"),/推薦に必要な条件が揃っていないため判定を止めました/);
    const g502Saved = await evaluate(client,"JSON.parse(localStorage.getItem('gamefit.personal_gear.v1'))");
    assert.equal(g502Saved.setup.current_product_id,"mouse-logitech-g502-x-plus");
    assert.equal(g502Saved.recommendations.at(-1).decision,"CLARIFY");
    assert.equal(await evaluate(client,"document.documentElement.scrollWidth <= window.innerWidth + 1"),true);
    await screenshot(client,"g502-held-fields-390px.png");

    assert.deepEqual(externalRequests,[]);
    assert.deepEqual(browserErrors,[]);
    process.stdout.write(`${JSON.stringify({
      status:"PASS",
      engine:"existing Chrome headless via CDP; no added dependency",
      storage_scope:"isolated temporary Chrome profile",
      cases:["headset search/save/reload and legacy/canonical restore","fixture recommendation path unchanged","Basilisk regular/35K separation","G502 field HOLD, mobile layout, and CLARIFY path"],
      external_requests:0,
      screenshots:["headset-canonical-roundtrip.png","g502-held-fields-390px.png"]
    },null,2)}\n`);
  } finally {
    try { await client.send("Page.close"); } catch (_) {}
    client.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode=1;
});
