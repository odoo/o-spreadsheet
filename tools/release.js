/**
 * This release script is highly inspired by the release script of https://github.com/odoo/owl (ged-odoo and SimonGenin)
 */
const package = require("../package.json");
const readline = require("readline");
const fs = require("fs");
const exec = require("child_process").exec;
const chalk = require("chalk");

const REL_NOTES_FILE = `release-notes.md`;
const STEPS = 8;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

startRelease().then(() => {
  rl.close();
});

// -----------------------------------------------------------------------------
// Relase Script
// -----------------------------------------------------------------------------

async function startRelease() {
  log(`*** O-spreadsheet release script ***`);
  log(`Current Version: ${package.version}`);

  // ---------------------------------------------------------------------------
  log(`Step 1/${STEPS}: collecting info...`);
  const current = package.version;
  let next = await ask("Next version: ");
  if (next[0] === "v") next = next.substring(1);
  let file = await ask(`Release notes (${REL_NOTES_FILE}): `);
  file = file || REL_NOTES_FILE;
  let content;
  try {
    content = await readFile("./" + file);
    content = content.replace(/`/gm, "'");
  } catch (e) {
    logSubContent(e.message);
    log("Cannot find release notes... Aborting");
    return;
  }
  // ---------------------------------------------------------------------------
  log(`Step 2/${STEPS}: running tests...`);
  const testsResult = await execCommand("npm run test");
  if (testsResult !== 0) {
    log("Test suite does not pass. Aborting.");
    return;
  }

  // ---------------------------------------------------------------------------
  log(`Step 3/${STEPS}: updating package.json...`);
  await replaceInFile("./package.json", current, next);

  // ---------------------------------------------------------------------------
  log(`Step 4/${STEPS}: creating git commit...`);
  const gitResult = await execCommand(`git commit -am "[REL] v${next}\n\n${content}"`);
  if (gitResult !== 0) {
    log("Git commit failed. Aborting.");
    return;
  }

  // ----------------------------------------------------------------------------
  log(`Step 5/${STEPS}: building o-spreadsheet...`);
  await execCommand("npm run prettier");
  const buildResult = await execCommand("npm run build");
  if (buildResult !== 0) {
    log("Build failed. Aborting.");
    return;
  }

  // ---------------------------------------------------------------------------
  log(`Step 6/${STEPS}: pushing on github...`);
  const pushResult = await execCommand("git push");
  if (pushResult !== 0) {
    log("git push failed. Aborting.");
    return;
  }

  // ---------------------------------------------------------------------------
  log(`Step 7/${STEPS}: creating a PR...`);
  const prCreateResult = await execCommand(
    `gh pr create --title "[REL] v${next}" --body "${content}"`
  );
  if (prCreateResult !== 0) {
    log("git push failed. Aborting.");
    return;
  }

  // ---------------------------------------------------------------------------

  log(`Step 8/${STEPS}: Creating the release...`);
  const relaseResult = await execCommand(
    `gh release create v${next} dist/*.js --draft -F release-notes.md`
  );
  if (relaseResult !== 0) {
    log("github release failed. Aborting.");
    return;
  }

  log("o-spreadsheet release process completed! Thank you for your patience");
  await execCommand(`gh release view`);
  await execCommand(`gh release view -w`);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function log(text) {
  console.log(chalk.yellow(formatLog(text)));
}

function formatLog(text) {
  return `[REL] ${text}`;
}

function logSubContent(text) {
  for (let line of text.split("\n")) {
    if (line.trim()) {
      console.log("    " + line);
    }
  }
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (result) => {
      resolve(result);
    });
  });
}

function logStream(stream) {
  stream.on("data", (data) => {
    logSubContent(data);
  });
}

function execCommand(command) {
  return new Promise((resolve) => {
    const childProcess = exec(command, (err, stdout, stderr) => {
      if (err) {
        resolve(err.code);
      }
    });
    childProcess.on("exit", (code) => {
      resolve(code);
    });
    logStream(childProcess.stdout);
    logStream(childProcess.stderr);
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, "utf8", function (err, content) {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

async function replaceInFile(file, from, to) {
  const content = await readFile(file);
  return new Promise((resolve, reject) => {
    const updatedContent = content.replace(new RegExp(from, "g"), to);
    fs.writeFile(file, updatedContent, "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
