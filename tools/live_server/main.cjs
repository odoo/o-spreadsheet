/**
 * Minimal live-reload static file server for development.
 * Replaces the unmaintained live-server package.
 *
 * Features:
 * - Serves static files from the project root
 * - Injects a Server-Sent Events client into HTML responses
 * - Watches specified paths and notifies connected browsers to reload
 * - Opens the browser on startup
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const watch = require("node-watch");

const PORT = 8080;
const ROOT = path.resolve(__dirname, "../..");
const OPEN_PATH = "/demo";
const WATCH_PATHS = [
  path.join(ROOT, "build/o_spreadsheet.iife.js"),
  path.join(ROOT, "build/o_spreadsheet.xml"),
  path.join(ROOT, "build/o_spreadsheet.css"),
  path.join(ROOT, "demo"),
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

// Server-Sent Events clients waiting for reload signals
const sseClients = new Set();

// Injected into every HTML response to enable live reload
const RELOAD_SNIPPET = `<script>
(function () {
  function connect() {
    var es = new EventSource("/__livereload");
    es.onmessage = function () { location.reload(); };
    es.onerror = function () {
      es.close();
      setTimeout(connect, 2000);
    };
  }
  connect();
})();
</script>`;

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function notifyClients() {
  for (const res of sseClients) {
    res.write("data: reload\n\n");
  }
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Internal server error");
      return;
    }
    const mime = getMime(filePath);
    if (mime.startsWith("text/html")) {
      const html = data.toString().replace("</body>", RELOAD_SNIPPET + "\n</body>");
      res.writeHead(200, { "Content-Type": mime });
      res.end(html);
    } else {
      res.writeHead(200, { "Content-Type": mime });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  // Live reload SSE endpoint
  if (req.url === "/__livereload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  let urlPath = req.url.split("?")[0];
  if (urlPath.endsWith("/")) {
    urlPath += "index.html";
  }

  // Prevent path traversal
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      // Redirect to trailing-slash URL so relative paths in HTML resolve correctly
      res.writeHead(301, { Location: urlPath + "/" });
      res.end();
      return;
    }
    if (!err && stat.isFile()) {
      serveFile(filePath, res);
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
});

// Watch for file changes and notify browsers
watch(WATCH_PATHS, { recursive: true }, (evt, name) => {
  process.stdout.write(`[live-server] changed: ${path.relative(ROOT, name)}\n`);
  notifyClients();
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}${OPEN_PATH}`;
  process.stdout.write(`[live-server] http://localhost:${PORT} — opening ${url}\n`);
  const open =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(open);
});
