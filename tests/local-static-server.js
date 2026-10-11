const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const port = Number(process.env.GAMEFIT_TEST_PORT || 8765);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.md";
  const target = path.resolve(projectRoot, relative);
  if (!target.startsWith(path.resolve(projectRoot))) return response.writeHead(403).end();
  fs.readFile(target, (error, body) => {
    if (error) return response.writeHead(404).end("not found");
    const contentType = target.endsWith(".js") ? "text/javascript; charset=utf-8"
      : target.endsWith(".css") ? "text/css; charset=utf-8"
        : target.endsWith(".html") ? "text/html; charset=utf-8"
          : "text/plain; charset=utf-8";
    response.writeHead(200, { "content-type": contentType, "cache-control":"no-store" }).end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`GameFit local smoke server: http://127.0.0.1:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
