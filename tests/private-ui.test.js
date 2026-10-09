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
  assert.ok(html.indexOf("decision-readiness-engine.js") < html.indexOf("personal-gear-engine.js"));
  assert.ok(html.indexOf("price-timing-engine.js") < html.indexOf("personal-gear-engine.js"));
  assert.equal(index.includes("private/personal-gear.html"), false);
  for (const id of ["tester-id","tester-consent","begin-validation","session-review","finish-validation","export-validation","delete-validation"]) assert.match(html,new RegExp(`id="${id}"`),id);
  assert.match(script,/使っている製品が一覧にない/);
  assert.match(script,/特になし/);
  assert.match(consoleHtml,/担当者専用/);
  assert.equal(index.includes("private/validation-console.html"),false);
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
  for (const value of ["SAFE / FAMILIAR","BETTER_FIT","VALUE_ALTERNATIVE","EXPLORE","AVOID","DONT_UPGRADE","CLARIFY"]) {
    assert.ok(copy.maps.decision[value], value);
    assert.equal(html.includes(`>${value}<`), false, value);
  }
  for (const value of ["meaningful_change","limited_change","small_change","unknown"]) assert.ok(copy.maps.delta[value], value);
});

test("participant data deletion does not remove the cohort record", () => {
  const handler = script.match(/byId\("delete-data"\)[\s\S]*?byId\("reset-data"\)/)?.[0] || "";
  assert.match(handler,/storageApi\.deleteAll\(storage\)/);
  assert.doesNotMatch(handler,/validationStore\.deleteAll\(storage\)/);
  assert.match(html,/匿名テスト記録は担当者が別画面で管理します/);
});
