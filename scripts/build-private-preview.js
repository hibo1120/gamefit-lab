const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const defaultOutput = path.join(root, "preview-dist");

const STATIC_FILES = Object.freeze([
  "404.html",
  "preference-engine.js",
  "normalization-engine.js",
  "data/game-dna.js",
  "evidence-engine.js",
  "current-gear-delta.js",
  "compatibility-engine.js",
  "fix-before-buy.js",
  "data/decision-briefs.js",
  "decision-brief-engine.js",
  "decision-readiness-engine.js",
  "price-timing-engine.js",
  "personal-gear-engine.js",
  "feedback-engine.js",
  "storage-engine.js",
  "validation-engine.js",
  "private-validation-store.js",
  "data/personal-gear-fixtures.js",
  "ui-copy-ja.js",
  "private/personal-gear.css",
  "private/personal-gear.js"
]);

const PREVIEW_HEADERS = `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
`;

const PREVIEW_REDIRECTS = `/private/validation-console.html /404.html 302
/private/validation-console /404.html 302
`;

const PREVIEW_ROBOTS = `User-agent: *
Disallow: /
`;

function ensureParent(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copy(relative, output) {
  const source = path.join(root, relative);
  const target = path.join(output, relative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Missing preview dependency: ${relative}`);
  }
  ensureParent(target);
  fs.copyFileSync(source, target);
}

function participantHtml() {
  const source = fs.readFileSync(path.join(root, "private", "personal-gear.html"), "utf8");
  const pattern = /\n\s*<aside class="method-note operator-only">[\s\S]*?<\/aside>\s*/m;
  const output = source.replace(pattern, "\n");
  if (output === source) throw new Error("Facilitator-only block was not found in tester HTML");
  for (const forbidden of ["export-validation", "delete-validation", "validation-report-status", "schema-version"]) {
    if (output.includes(`id="${forbidden}"`)) throw new Error(`Facilitator control leaked into preview HTML: ${forbidden}`);
  }
  return output;
}

function buildPreview(outputDir = defaultOutput) {
  const output = path.resolve(outputDir);
  if (output === path.resolve(root)) throw new Error("Refusing to use repository root as preview output");
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  for (const relative of STATIC_FILES) copy(relative, output);

  const testerHtml = path.join(output, "private", "personal-gear.html");
  ensureParent(testerHtml);
  fs.writeFileSync(testerHtml, participantHtml(), "utf8");
  fs.writeFileSync(path.join(output, "_headers"), PREVIEW_HEADERS, "utf8");
  fs.writeFileSync(path.join(output, "_redirects"), PREVIEW_REDIRECTS, "utf8");
  fs.writeFileSync(path.join(output, "robots.txt"), PREVIEW_ROBOTS, "utf8");

  return {
    output,
    files: [...STATIC_FILES, "private/personal-gear.html", "_headers", "_redirects", "robots.txt"]
  };
}

if (require.main === module) {
  const result = buildPreview(process.argv[2] || defaultOutput);
  process.stdout.write(`Built private preview: ${result.output}\n`);
}

module.exports = {
  STATIC_FILES,
  PREVIEW_HEADERS,
  PREVIEW_REDIRECTS,
  PREVIEW_ROBOTS,
  participantHtml,
  buildPreview
};
