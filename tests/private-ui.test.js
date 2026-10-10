const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "private", "personal-gear.html"), "utf8");
const script = fs.readFileSync(path.join(root, "private", "personal-gear.js"), "utf8");
const consoleHtml = fs.readFileSync(path.join(root, "private", "validation-console.html"), "utf8");
const consoleScript = fs.readFileSync(path.join(root, "private", "validation-console.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.md"), "utf8");
const copy = require("../ui-copy-ja.js");

test("private MVP exposes the required flow and privacy controls without public linkage", () => {
  for (const label of ["現在の機材", "好みと苦手", "ゲームと入力方法", "次に見直すもの", "結果は合っていますか？", "回答を保存"]) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), label);
  }
  for (const id of ["export-data", "reset-data", "delete-data", "schema-version", "storage-status"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /共有端末では使用しないでください/);
  assert.match(html,/GameFitのテスト版です/);
  assert.match(html,/購入する必要はありません。入力中に内容が自動送信されることはありません/);
  assert.match(html,/参加者番号、カテゴリ、ゲーム、入力方法、判定、操作時間、選択式回答/);
  assert.match(html,/配信事業者がIPアドレスなど通常のアクセス情報を処理することがあります/);
  assert.ok(html.indexOf("decision-readiness-engine.js") < html.indexOf("personal-gear-engine.js"));
  assert.ok(html.indexOf("price-timing-engine.js") < html.indexOf("personal-gear-engine.js"));
  assert.equal(index.includes("private/personal-gear.html"), false);
  for (const id of ["tester-id","tester-consent","begin-validation","session-review","finish-validation","export-session","export-validation","delete-validation"]) assert.match(html,new RegExp(`id="${id}"`),id);
  assert.match(script,/使っている製品が一覧にない/);
  assert.match(script,/特になし/);
  assert.match(consoleHtml,/担当者専用/);
  assert.equal(index.includes("private/validation-console.html"),false);
  assert.match(script,/testerSlotFromHash/);
  assert.match(script,/window\.location\.hash/);
  assert.doesNotMatch(script,/URLSearchParams|location\.search/);
});

test("preview headers prohibit indexing, embedding, caching, and network sends",()=>{
  const headers=fs.readFileSync(path.join(root,"_headers"),"utf8");
  const robots=fs.readFileSync(path.join(root,"robots.txt"),"utf8");
  assert.match(headers,/\/private\/\*/);
  assert.match(headers,/X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.match(headers,/Cache-Control: no-store/);
  assert.match(headers,/connect-src 'none'/);
  assert.match(headers,/frame-ancestors 'none'/);
  assert.match(robots,/Disallow: \/private\//);
});

test("private MVP has no analytics or network-send path", () => {
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /posthog|analytics\.js/i);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/i);
  assert.doesNotMatch(consoleScript, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/i);
  for (const source of [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1])) {
    assert.equal(source.startsWith("."), true, source);
  }
});

test("feedback UX includes every required reason and desired direction code", () => {
  for (const code of ["shape", "size", "weight", "click", "price", "brand", "game_fit", "durability", "software", "current_gear_delta_small", "other"]) {
    assert.match(script, new RegExp(`\\["${code}"|,"${code}"`), code);
  }
  for (const code of ["lighter", "heavier", "smaller", "larger", "lower_hump", "cheaper", "same_brand", "different_brand", "higher_performance", "safer_familiar", "do_not_upgrade"]) {
    assert.match(script, new RegExp(`\\["${code}"|,"${code}"`), code);
  }
  assert.match(script, /この回答が他の利用者の判定へ反映されることはありません/);
  assert.match(script, /user_facing_explanation/);
  assert.doesNotMatch(script, /update\.delta/);
});

test("internal recommendation enums have Japanese display labels", () => {
  for (const value of ["SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","EXPLORE","AVOID","DONT_UPGRADE","CLARIFY","CONSIDER_UPGRADE"]) {
    assert.ok(copy.maps.decision[value], value);
    assert.equal(html.includes(`>${value}<`), false, value);
  }
  for (const value of ["meaningful_change","limited_change","small_change","unknown"]) assert.ok(copy.maps.delta[value], value);
});

test("participant data deletion does not remove the cohort record", () => {
  const handler = script.match(/byId\("delete-data"\)[\s\S]*?byId\("reset-data"\)/)?.[0] || "";
  assert.match(handler,/storageApi\.deleteAll\(storage\)/);
  assert.doesNotMatch(handler,/validationStore\.deleteAll\(storage\)/);
  assert.match(html,/参加者番号付きテスト記録は担当者が別画面で管理します/);
});

test("facilitator console imports validated participant files and stays off the preview route", () => {
  const redirects=fs.readFileSync(path.join(root,"_redirects"),"utf8");
  assert.match(consoleHtml,/id="import-tester-file"/);
  assert.match(consoleHtml,/同じbuild/);
  assert.match(consoleScript,/store\.importTesterExport\(storage,await file\.text\(\)\)/);
  assert.match(redirects,/\/private\/validation-console\.html \/404\.html 302/);
  assert.match(redirects,/\/private\/validation-console \/404\.html 302/);
});
