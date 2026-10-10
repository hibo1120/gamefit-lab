const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");

const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"staging","decision-flow-v1.html"),"utf8");
const css=fs.readFileSync(path.join(root,"staging","decision-flow-v1.css"),"utf8");
const js=fs.readFileSync(path.join(root,"staging","decision-flow-v1.js"),"utf8");
const privateHtml=fs.readFileSync(path.join(root,"private","personal-gear.html"),"utf8");
const privateJs=fs.readFileSync(path.join(root,"private","personal-gear.js"),"utf8");
const previewBuilder=fs.readFileSync(path.join(root,"scripts","build-private-preview.js"),"utf8");

test("decision flow staging stays isolated from Private Validation",()=>{
  assert.equal(privateHtml.includes("decision-flow-v1"),false);
  assert.equal(privateJs.includes("decision-flow-v1"),false);
  assert.equal(previewBuilder.includes("decision-flow-v1"),false);
  assert.match(html,/STAGING/);
});

test("initial flow has exactly three visible progress steps",()=>{
  assert.equal((html.match(/data-progress="/g)||[]).length,3);
  assert.match(html,/ゲーム/);
  assert.match(html,/操作方法/);
  assert.match(html,/今の機材/);
});

test("Role weapon style and budget are not required inputs",()=>{
  assert.doesNotMatch(html,/<input[^>]+(?:role|weapon|style|budget)/i);
  assert.doesNotMatch(html,/<select[^>]+(?:role|weapon|style|budget)/i);
  assert.match(html,/ここでは予算やRoleは聞きません/);
  assert.match(html,/Roleや戦闘スタイルは必須にしない/);
});

test("game input mapping is exact and has no default fallback",()=>{
  for(const expected of [
    'valorant:Object.freeze(["mnk"])',
    'apex:Object.freeze(["mnk","controller"])',
    'cs2:Object.freeze(["mnk"])',
    'overwatch2:Object.freeze(["mnk"])',
    'fortnite:Object.freeze(["mnk"])'
  ]) assert.equal(js.includes(expected),true,expected);
  assert.match(js,/if\(!inputs\) throw new Error\("Unsupported game context"\)/);
});

test("primary and secondary gear choices use progressive disclosure",()=>{
  assert.match(html,/<details class="more-gear">/);
  assert.match(html,/その他の機材を見る/);
  assert.match(js,/mnk:Object\.freeze\(\{ primary:Object\.freeze\(\["mouse","keyboard"\]\), secondary:Object\.freeze\(\["mousepad","monitor","audio","network","cable"\]\) \}\)/);
  assert.match(js,/controller:Object\.freeze\(\{ primary:Object\.freeze\(\["controller"\]\), secondary:Object\.freeze\(\["monitor","audio","network","cable"\]\) \}\)/);
});

test("missing current product has a first-class safe path",()=>{
  assert.match(html,/一覧にない製品を使っている/);
  assert.match(js,/value="一覧にない"|value="一覧にない"/);
  assert.doesNotMatch(js,/nearest|similar product|fallbackProduct/i);
});

test("flow hands off to the staging result page",()=>{
  assert.match(html,/href="\.\/decision-result-v1\.html"/);
  assert.match(html,/実推薦エンジンや実ユーザーデータには接続していません/);
});

test("staging uses only local assets",()=>{
  assert.doesNotMatch(html,/https?:\/\//i);
  assert.doesNotMatch(css,/url\s*\(/i);
  assert.match(html,/src="\.\/decision-flow-v1\.js"/);
  assert.match(html,/href="\.\/decision-flow-v1\.css"/);
});

test("mobile layout reduces simultaneous choices",()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.game-grid,\.choice-grid,\.choice-grid-small,\.why-grid\{grid-template-columns:1fr\}/);
  assert.match(css,/\.choice\{min-height:62px\}/);
});

test("primary actions have large touch targets and visible focus",()=>{
  assert.match(css,/\.button\{min-height:48px/);
  assert.match(css,/outline:3px solid #fff/);
});

test("result summary contains no Role or budget field",()=>{
  const summary=html.match(/<dl class="summary-list">[\s\S]*?<\/dl>/)?.[0]||"";
  assert.doesNotMatch(summary,/Role|予算|武器|戦闘スタイル/);
  for(const label of ["ゲーム","操作方法","見直す機材","現在機材"]) assert.equal(summary.includes(label),true,label);
});
