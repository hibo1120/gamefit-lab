const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "staging", "decision-result-v1.html"), "utf8");
const css = fs.readFileSync(path.join(root, "staging", "decision-result-v1.css"), "utf8");
const previewBuilder = fs.readFileSync(path.join(root, "scripts", "build-private-preview.js"), "utf8");
const privateHtml = fs.readFileSync(path.join(root, "private", "personal-gear.html"), "utf8");
const privateJs = fs.readFileSync(path.join(root, "private", "personal-gear.js"), "utf8");

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value,16) / 255).map(value =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a,b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}

test("staging result page is isolated from Private Validation and preview bundle", () => {
  assert.equal(privateHtml.includes("decision-result-v1"), false);
  assert.equal(privateJs.includes("decision-result-v1"), false);
  assert.equal(previewBuilder.includes("staging/decision-result-v1"), false);
  assert.match(html, /STAGING \/ 非公開設計検証/);
});

test("layout is result-first and keeps Role and Pro out of entry decision", () => {
  const decisionIndex = html.indexOf('id="decision"');
  const proIndex = html.indexOf("Proの使用例を見る");
  const roleIndex = html.indexOf("Roleで絞る");
  assert.ok(decisionIndex >= 0);
  assert.ok(proIndex > decisionIndex);
  assert.ok(roleIndex > proIndex);
  assert.match(html, /細かなRoleや戦闘スタイルは最初に聞きません/);
});

test("DONT-style decision is neutral rather than danger", () => {
  const block = html.match(/<section id="decision"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(block, /今は買い替えを急がなくてよさそうです/);
  assert.doesNotMatch(block, /danger|error|failed|失敗/);
});

test("details use vertical disclosure instead of horizontal tabs", () => {
  assert.ok((html.match(/<details/g) || []).length >= 3);
  assert.doesNotMatch(html, /role="tab"/i);
  assert.match(html, /必要な人だけ、詳しく見る/);
});

test("Current Gear Delta precedes Pro reference and is marked synthetic", () => {
  const deltaIndex = html.indexOf("CURRENT GEAR DELTA");
  const proIndex = html.indexOf("Proの使用例を見る");
  assert.ok(deltaIndex >= 0 && deltaIndex < proIndex);
  assert.match(html, /合成例/);
  assert.match(html, /Evidenceが確認できた属性だけ/);
});

test("Pro reference declares ranking isolation", () => {
  assert.match(html, /Pro使用は推薦順位に使っていません/);
  assert.match(html, /Roleは診断入力には入れず/);
  assert.match(html, /synthetic/);
});

test("staging has no external assets or scripts", () => {
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(css, /url\s*\(/i);
});

test("interactive targets and mobile hierarchy are explicit", () => {
  assert.match(css, /\.button\{min-height:48px/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /\.decision-card__headline\{grid-template-columns:1fr\}/);
});

test("core color pairs meet WCAG AA normal-text contrast", () => {
  const pairs = [
    ["#f4f7fb","#080b11","main text/background"],
    ["#a9b4c5","#080b11","muted/background"],
    ["#f4f7fb","#111722","main text/surface"],
    ["#7cf6c4","#111722","brand/surface"],
    ["#06291d","#7cf6c4","primary button"],
    ["#ffd479","#302713","warning"],
    ["#ff8d9b","#080b11","danger"]
  ];
  for (const pair of pairs) {
    const ratio = contrast(pair[0], pair[1]);
    assert.ok(ratio >= 4.5, pair[2] + " contrast=" + ratio.toFixed(2));
  }
});

test("GameFit differentiation remains visible", () => {
  const phrases = ["高い製品を優先しない","Affiliateは順位に不使用","「買わない」も正式な答え","FIX BEFORE BUY","CURRENT GEAR DELTA"];
  for (const phrase of phrases) assert.equal(html.includes(phrase), true, phrase);
});
