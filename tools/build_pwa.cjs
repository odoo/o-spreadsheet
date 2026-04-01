#!/usr/bin/env node
/**
 * Build script for the o-spreadsheet PWA.
 * Assembles pwa/ from build/ and node_modules/, rewrites HTML/JS paths,
 * injects SW registration, and generates pwa/sw.js.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "pwa");

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version;
const CACHE_NAME = `o-spreadsheet-v${VERSION}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  [skip] ${src} does not exist`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      cpDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyAsset(src, destName) {
  const dest = path.join(OUT, destName);
  console.log(`  ${path.relative(ROOT, src)} → pwa/${destName}`);
  cp(src, dest);
}

function copyDir(src, destDir) {
  const dest = path.join(OUT, destDir);
  console.log(`  ${path.relative(ROOT, src)}/ → pwa/${destDir}/`);
  cpDir(src, dest);
}

// ---------------------------------------------------------------------------
// Collect all files that will be precached (relative to pwa/)
// ---------------------------------------------------------------------------

/** Recursively list all relative paths under a directory. */
function listRelative(dir, base) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listRelative(path.join(dir, entry.name), rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\nBuilding PWA → pwa/  (cache: ${CACHE_NAME})\n`);

// Clean output directory
if (fs.existsSync(OUT)) {
  fs.rmSync(OUT, { recursive: true });
}
fs.mkdirSync(OUT, { recursive: true });

// Copy flat assets
copyAsset(path.join(ROOT, "build/o_spreadsheet.iife.js"), "o_spreadsheet.iife.js");
copyAsset(path.join(ROOT, "build/o_spreadsheet.css"), "o_spreadsheet.css");
copyAsset(path.join(ROOT, "build/o_spreadsheet.xml"), "o_spreadsheet.xml");
copyAsset(path.join(ROOT, "node_modules/@odoo/owl/dist/owl.iife.js"), "owl.iife.js");
copyAsset(path.join(ROOT, "node_modules/jszip/dist/jszip.min.js"), "jszip.min.js");
copyAsset(path.join(ROOT, "node_modules/file-saver/dist/FileSaver.min.js"), "FileSaver.min.js");
copyAsset(path.join(ROOT, "node_modules/chart.js/dist/chart.umd.js"), "chart.umd.js");
copyAsset(
  path.join(ROOT, "node_modules/chartjs-chart-geo/build/index.umd.js"),
  "chartjs-chart-geo.umd.js"
);
copyAsset(path.join(ROOT, "node_modules/luxon/build/global/luxon.js"), "luxon.js");
copyAsset(
  path.join(ROOT, "node_modules/chartjs-adapter-luxon/dist/chartjs-adapter-luxon.umd.js"),
  "chartjs-adapter-luxon.umd.js"
);
copyAsset(
  path.join(ROOT, "node_modules/bootstrap/dist/css/bootstrap.min.css"),
  "bootstrap.min.css"
);
copyAsset(
  path.join(ROOT, "node_modules/font-awesome/css/font-awesome.min.css"),
  "font-awesome.min.css"
);

// Copy directories
copyDir(path.join(ROOT, "node_modules/font-awesome/fonts"), "fonts");
copyDir(path.join(ROOT, "demo/geo_json"), "geo_json");
copyDir(path.join(ROOT, "demo/lib"), "lib");

// Copy demo assets
copyAsset(path.join(ROOT, "demo/currencies.js"), "currencies.js");
copyAsset(path.join(ROOT, "demo/data.js"), "data.js");
copyAsset(path.join(ROOT, "demo/pivot.js"), "pivot.js");
copyAsset(path.join(ROOT, "demo/file_store.js"), "file_store.js");
copyAsset(path.join(ROOT, "demo/transport.js"), "transport.js");
copyAsset(path.join(ROOT, "demo/favicon.png"), "favicon.png");
copyAsset(path.join(ROOT, "demo/icon.svg"), "icon.svg");
copyAsset(path.join(ROOT, "demo/manifest.json"), "manifest.json");
copyAsset(path.join(ROOT, "demo/main.css"), "main.css");

// ---------------------------------------------------------------------------
// Patch and copy main.js
// ---------------------------------------------------------------------------
console.log("\n  Patching main.js...");
let mainJs = fs.readFileSync(path.join(ROOT, "demo/main.js"), "utf8");
mainJs = mainJs.replace(
  /fetch\(["']\.\.\/build\/o_spreadsheet\.xml["']\)/g,
  'fetch("./o_spreadsheet.xml")'
);
fs.writeFileSync(path.join(OUT, "main.js"), mainJs);

// ---------------------------------------------------------------------------
// Patch and copy index.html
// ---------------------------------------------------------------------------
console.log("  Patching index.html...");
let html = fs.readFileSync(path.join(ROOT, "demo/index.html"), "utf8");

// Rewrite ../build/ paths
html = html.replace(/\.\.\/build\//g, "./");
// Rewrite ../node_modules/ paths
html = html.replace(/\.\.\/node_modules\/@odoo\/owl\/dist\/owl\.iife\.js/g, "./owl.iife.js");
html = html.replace(/\.\.\/node_modules\/jszip\/dist\/jszip\.min\.js/g, "./jszip.min.js");
html = html.replace(
  /\.\.\/node_modules\/file-saver\/dist\/FileSaver\.min\.js/g,
  "./FileSaver.min.js"
);
html = html.replace(/\.\.\/node_modules\/chart\.js\/dist\/chart\.umd\.js/g, "./chart.umd.js");
html = html.replace(
  /\.\.\/node_modules\/chartjs-chart-geo\/build\/index\.umd\.js/g,
  "./chartjs-chart-geo.umd.js"
);
html = html.replace(/\.\.\/node_modules\/luxon\/build\/global\/luxon\.js/g, "./luxon.js");
html = html.replace(
  /\.\.\/node_modules\/chartjs-adapter-luxon\/dist\/chartjs-adapter-luxon\.umd\.js/g,
  "./chartjs-adapter-luxon.umd.js"
);
html = html.replace(
  /\.\.\/node_modules\/bootstrap\/dist\/css\/bootstrap\.min\.css/g,
  "./bootstrap.min.css"
);
html = html.replace(
  /\.\.\/node_modules\/font-awesome\/css\/font-awesome\.min\.css/g,
  "./font-awesome.min.css"
);

// Inject SW registration before </body>
const swScript = `  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
    }
  </script>
`;
html = html.replace("</body>", `${swScript}</body>`);

fs.writeFileSync(path.join(OUT, "index.html"), html);

// ---------------------------------------------------------------------------
// Collect all asset paths for precache manifest
// ---------------------------------------------------------------------------
const staticAssets = [
  "./",
  "./index.html",
  "./main.js",
  "./currencies.js",
  "./data.js",
  "./pivot.js",
  "./file_store.js",
  "./transport.js",
  "./main.css",
  "./o_spreadsheet.iife.js",
  "./o_spreadsheet.css",
  "./o_spreadsheet.xml",
  "./owl.iife.js",
  "./jszip.min.js",
  "./FileSaver.min.js",
  "./chart.umd.js",
  "./chartjs-chart-geo.umd.js",
  "./luxon.js",
  "./chartjs-adapter-luxon.umd.js",
  "./bootstrap.min.css",
  "./font-awesome.min.css",
  "./favicon.png",
  "./icon.svg",
  "./manifest.json",
];

// Add fonts/
const fontFiles = listRelative(path.join(OUT, "fonts"), "fonts");
for (const f of fontFiles) {
  staticAssets.push(`./${f}`);
}

// Add geo_json/
const geoFiles = listRelative(path.join(OUT, "geo_json"), "geo_json");
for (const f of geoFiles) {
  staticAssets.push(`./${f}`);
}

// Add lib/
const libFiles = listRelative(path.join(OUT, "lib"), "lib");
for (const f of libFiles) {
  staticAssets.push(`./${f}`);
}

// ---------------------------------------------------------------------------
// Generate sw.js
// ---------------------------------------------------------------------------
console.log("  Generating sw.js...");
const assetsJson = JSON.stringify(staticAssets, null, 2);
const sw = `// Generated by tools/build_pwa.cjs — do not edit manually.
const CACHE = '${CACHE_NAME}';
const ASSETS = ${assetsJson};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches
      .match(e.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(e.request))
  );
});
`;
fs.writeFileSync(path.join(OUT, "sw.js"), sw);

console.log(`\nDone. ${OUT}\n`);
