const { version } = require("../../package.json");
const git = require("git-rev-sync");

let commitHash = "";

try {
  commitHash = git.short();
} catch (_) {}

exports.commitHash = commitHash;
exports.date = new Date().toISOString();
exports.version = version;
