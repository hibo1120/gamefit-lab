const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const growthRoot = path.join(projectRoot, "growth");

function read(relative) {
  return fs.readFileSync(path.join(growthRoot, relative), "utf8");
}

function headingIds(markdown, prefix) {
  return [...markdown.matchAll(new RegExp(`^## (${prefix}\\d+)\\b`, "gm"))].map(match => match[1]);
}

test("growth pack contains exactly 12 Shorts, 30 X posts, and 6 note articles", () => {
  const shorts = headingIds(read("youtube-shorts.md"), "yt_s");
  const xPosts = headingIds(read("x-posts.md"), "x_");
  const notes = fs.readdirSync(path.join(growthRoot, "note")).filter(file => file.endsWith(".md"));

  assert.equal(shorts.length, 12);
  assert.equal(new Set(shorts).size, 12);
  assert.equal(xPosts.length, 30);
  assert.equal(new Set(xPosts).size, 30);
  assert.equal(notes.length, 6);
  assert.equal((read("x-posts.md").match(/^- 種類: CTA$/gm) || []).length, 6);
});

test("30-day calendar has the expected platform totals, unique IDs, and draft state", () => {
  const rows = read("content_calendar.csv").trim().split(/\r?\n/).map(line => line.split(","));
  assert.deepEqual(rows[0], ["date_offset", "platform", "content_id", "title", "theme", "target_game", "CTA", "UTM URL", "asset_required", "status"]);
  const body = rows.slice(1);
  assert.equal(body.length, 48);
  assert.equal(body.filter(row => row[1] === "YouTube Shorts").length, 12);
  assert.equal(body.filter(row => row[1] === "X").length, 30);
  assert.equal(body.filter(row => row[1] === "note").length, 6);
  assert.equal(new Set(body.map(row => row[2])).size, 48);
  assert.equal(body.every(row => /^D(?:0[1-9]|[12]\d|30)$/.test(row[0])), true);
  assert.equal(body.every(row => row[9] === "draft"), true);
});

test("calendar URLs follow the platform UTM convention and identify every content item", () => {
  const rows = read("content_calendar.csv").trim().split(/\r?\n/).slice(1).map(line => line.split(","));
  const expected = {
    "YouTube Shorts": ["youtube", "shorts"],
    X: ["x", "social"],
    note: ["note", "article"]
  };

  for (const row of rows) {
    const url = new URL(row[7]);
    assert.equal(url.origin, "https://hibo1120.github.io");
    assert.equal(url.pathname, "/gamefit-lab/diagnose.html");
    assert.equal(url.searchParams.get("utm_source"), expected[row[1]][0], row[2]);
    assert.equal(url.searchParams.get("utm_medium"), expected[row[1]][1], row[2]);
    assert.equal(url.searchParams.get("utm_campaign"), "gamefit_growth_v1", row[2]);
    assert.equal(url.searchParams.get("utm_content"), row[2], row[2]);
    assert.equal(url.searchParams.get("source"), row[2], row[2]);
  }
});

test("each note article ends with its own tracked diagnosis CTA", () => {
  const notes = fs.readdirSync(path.join(growthRoot, "note")).filter(file => file.endsWith(".md")).sort();
  notes.forEach((file, index) => {
    const content = read(path.join("note", file));
    const id = `note_${String(index + 1).padStart(2, "0")}`;
    assert.match(content, /https:\/\/hibo1120\.github\.io\/gamefit-lab\/diagnose\.html\?/);
    assert.match(content, new RegExp(`utm_content=${id}`));
    assert.match(content, /source=note_\d{2}/);
  });
});
