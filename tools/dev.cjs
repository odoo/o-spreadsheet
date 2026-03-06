/**
 * Wrapper for `npm run dev` that suppresses stray terminal escape sequences.
 *
 * Fish 4.x and iTerm2 query terminal properties (background colour, cursor
 * position, device attributes) around command execution.  The terminal's
 * responses land in stdin and are echoed back to the display by the PTY's
 * built-in echo, producing garbage like:
 *
 *   ^[]11;rgb:0000/0000/0000^[\^[[71;1R^[[?64;…c
 *
 * Disabling local echo for stdin (stty -echo) prevents those responses from
 * being echoed while still forwarding SIGINT / SIGTERM properly.
 */

"use strict";

const { spawnSync, spawn } = require("child_process");

function stty(args) {
  try {
    spawnSync("stty", args, { stdio: ["inherit", "inherit", "ignore"] });
  } catch (_) {}
}

if (process.stdin.isTTY) {
  stty(["-echo"]);
}

function restore() {
  if (process.stdin.isTTY) {
    stty(["echo"]);
  }
}

process.on("exit", restore);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const initial = spawnSync("npm", ["run", "build:dev"], { stdio: "inherit", shell: false });
if (initial.status !== 0) process.exit(initial.status ?? 1);

const child = spawn(
  "npm-run-all",
  ["--print-label", "--parallel", "build:watch", "server", "serve-static"],
  { stdio: "inherit", shell: false, env: { ...process.env, DEV_INITIAL_BUILD_DONE: "1" } }
);

child.on("exit", (code) => process.exit(code ?? 0));
