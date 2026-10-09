const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "private", "personal-gear.html"), "utf8");
const script = fs.readFileSync(path.join(root, "private", "personal-gear.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.md"), "utf8");

test("private MVP exposes the required flow and privacy controls without public linkage", () => {
  for (const label of ["My Setup Lite", "Gear Taste", "Game / Input", "Next Upgrade", "Upgrade Match", "Regret Shield", "Why Not?", "再推薦"]) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), label);
  }
  for (const id of ["export-data", "reset-data", "delete-data", "schema-version", "storage-status"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /共有端末では使用しないでください/);
  assert.equal(index.includes("private/personal-gear.html"), false);
});

test("private MVP has no analytics or network-send path", () => {
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /posthog|analytics\.js/i);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/i);
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
  assert.match(script, /Global learningは無効/);
});
