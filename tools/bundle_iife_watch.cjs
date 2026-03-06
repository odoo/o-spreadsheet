"use strict";

/**
 * Watch-mode wrapper for the iife bundle.
 *
 * When called from `npm run dev` (DEV_INITIAL_BUILD_DONE=1), the initial build
 * has already been done by `build:dev`, so we skip it and only watch for
 * subsequent changes. This prevents a spurious live-reload on startup.
 *
 * In standalone mode (e.g. `npm run build:watch`), we fall back to the original
 * behavior: wait for the TS output to exist, then run rollup in watch mode
 * (which includes its own initial build).
 */

const path = require("path");
const { spawn } = require("child_process");
const watch = require("node-watch");

const ROOT = path.resolve(__dirname, "..");

if (!process.env.DEV_INITIAL_BUILD_DONE) {
  // Standalone: wait for TS output then hand off to rollup --watch (with initial build)
  const waitOn = require("wait-on");
  waitOn({ resources: [path.join(ROOT, "build/js/src/index.js")] }, (err) => {
    if (err) {
      process.stderr.write(`[bundle:iife] wait-on error: ${err}\n`);
      process.exit(1);
    }
    const proc = spawn("npm", ["run", "bundle:iife", "--", "--watch"], {
      stdio: "inherit",
      shell: false,
      cwd: ROOT,
    });
    proc.on("exit", (code) => process.exit(code ?? 0));
  });
} else {
  // Dev mode: initial build already done — only rebuild on subsequent JS changes
  const WATCH_PATH = path.join(ROOT, "build/js/src");
  let building = false;

  function rebuild() {
    if (building) return;
    building = true;
    const proc = spawn("npm", ["run", "bundle:iife"], {
      stdio: "inherit",
      shell: false,
      cwd: ROOT,
    });
    proc.on("exit", () => {
      building = false;
    });
  }

  const watcher = watch(WATCH_PATH, { recursive: true, filter: /\.js$/ }, rebuild);
  watcher.on("ready", () => process.stdout.write("[bundle:iife] watching for changes...\n"));
  watcher.on("error", (err) => process.stderr.write(`[bundle:iife] watch error: ${err}\n`));
  process.on("SIGINT", () => watcher.close());
}
