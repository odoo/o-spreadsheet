const { version } = require("../../package.json");
const git = require("git-rev-sync");
const bundle = require("./bundle_xml_templates.cjs");
const parseArgs = require("minimist");

const DEFAULT_DIR = "dist";

const argv = parseArgs(process.argv.slice(2));

let commitHash = "";

try {
  commitHash = git.short();
} catch (_) {}

const OUTRO = `
  __info__.version = '${version}';
  __info__.date = '${new Date().toISOString()}';
  __info__.hash = '${commitHash}';
`;

bundle.writeOwlTemplateBundleToFile(argv.outDir || DEFAULT_DIR, OUTRO);
