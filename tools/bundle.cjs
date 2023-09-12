const { readFileSync } = require("fs");
const path = require("path");

const { execSync } = require("child_process");

function outro() {
  return `
__info__.version = "${BUILD_INFOS.version}";
__info__.date = "${BUILD_INFOS.date}";
__info__.hash = "${BUILD_INFOS.hash}";
`;
}

// Use __dirname to make the path relative to the current source
// file instead of process.cwd()
const packageJson = JSON.parse(readFileSync(path.join("__dirname", "../package.json")));
const version = packageJson.version;

const RED = "\x1b[31m%s\x1b[0m";

function tryGetHash() {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch (_) {
    // allow to build outside of a git repo (e.g. in CI)
    console.log(RED, "Unable to get git commit hash");
  }
  return "";
}

const BUILD_INFOS = {
  version,
  date: new Date().toISOString(),
  hash: tryGetHash(),
};

exports.bundle = {
  outro,
};
