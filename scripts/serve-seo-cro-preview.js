const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..", ".seo-cro-preview-dist");
const port = Number(process.env.GAMEFIT_PREVIEW_PORT || 4173);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith("/gamefit-lab/")) pathname = pathname.slice("/gamefit-lab".length);
  const relative = pathname === "/" ? "index.html"
    : pathname.endsWith("/") ? `${pathname.slice(1)}index.html`
      : pathname.replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root)) return response.writeHead(403).end("forbidden");
  fs.readFile(target, (error, body) => {
    if (error) return response.writeHead(404).end("not found");
    const contentType = target.endsWith(".html") ? "text/html; charset=utf-8"
      : target.endsWith(".js") ? "text/javascript; charset=utf-8"
        : target.endsWith(".css") ? "text/css; charset=utf-8"
          : target.endsWith(".json") ? "application/json; charset=utf-8"
            : "text/plain; charset=utf-8";
    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow, noarchive"
    }).end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`SEO/CRO preview server: http://127.0.0.1:${port}/\n`);
});
