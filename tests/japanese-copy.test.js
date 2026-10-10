const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname,"..");
const read = relative => fs.readFileSync(path.join(root,relative),"utf8");
const guideFiles = fs.readdirSync(path.join(root,"guides")).filter(file=>file.endsWith(".html"));

test("Japanese UI does not expose former English workflow labels or point scores",()=>{
  const visible = [read("diagnose.html"),read("private/personal-gear.html"),read("private/validation-console.html"),...guideFiles.map(file=>read(path.join("guides",file)))].join("\n");
  for (const phrase of ["My Setup Lite","Gear Taste","Game / Input","Next Upgrade","Upgrade Match","Regret Shield","Why Not?","01 INPUT","02 RESULT","FACILITATOR ONLY","upgrade guide","yen upgrade guide"]) {
    assert.equal(visible.includes(phrase),false,phrase);
  }
  assert.doesNotMatch(read("diagnose-page.js"),/score\}\s*pt|score\s*\+\s*["']\s*pt/i);
});

test("Japanese terminology and guide disclosures stay consistent",()=>{
  const guides = guideFiles.map(file=>read(path.join("guides",file))).join("\n");
  assert.doesNotMatch(guides,/PC買替|\bRAM\b|モニターHz|当サイトは今後アフィリエイト広告を利用/);
  for (const file of guideFiles) {
    const html=read(path.join("guides",file));
    assert.match(html,/現在、このページに広告リンクはありません/);
    assert.match(html,/報酬の有無/);
    assert.match(html,/PostHogへ送信/);
    assert.match(html,/氏名や入力内容は送信しません/);
  }
});

test("privacy, retention, and local analytics copy match implementation boundaries",()=>{
  const privateHtml=read("private/personal-gear.html");
  const privateScript=read("private/personal-gear.js");
  const consoleHtml=read("private/validation-console.html");
  const posthog=read("posthog-init.js");
  assert.match(privateHtml,/現在の機材や好みは削除するまでこのブラウザ内に保存/);
  assert.match(privateHtml,/判定・回答の履歴は365日を過ぎたものから次に保存したときに削除/);
  assert.match(privateHtml,/参加者番号付き記録は、30日を過ぎて次にこのページを開いたときに削除/);
  assert.match(privateHtml,/担当者が受領したことを確認してからご自身で削除/);
  assert.match(consoleHtml,/このブラウザ内の参加者番号付き記録は、30日を過ぎて次にこの画面を開いたときに削除/);
  assert.match(consoleHtml,/書き出したファイルは自動削除されない/);
  assert.match(privateHtml,/担当者が受領したファイルは、10人テストの終了後30日以内に手動で削除/);
  assert.match(consoleHtml,/10人テストの終了後30日以内に担当者が削除/);
  assert.doesNotMatch(privateHtml,/30日以内に削除|30日で自動削除/);
  assert.match(privateScript,/製品名と型番を担当者へ伝えてください/);
  assert.match(posthog,/\["localhost", "127\.0\.0\.1"\]/);
});

test("copy rules are documented for future screens",()=>{
  const guide=read("docs/ui-copy-ja.md");
  for (const phrase of ["結論 → 主な理由 → 必要な人向けの詳細","PCの買い替え","メモリ（RAM）","判断材料の多さ","内部enum","390px"]) assert.match(guide,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});
