const bundle = require("./bundle_xml_templates");
const parseArgs = require("minimist");
const { commitHash, date, version } = require("../utils/info");
const DEFAULT_DIR = "dist";

const argv = parseArgs(process.argv.slice(2));

const OUTRO = `
  __info__.version = '${version}';
  __info__.date = '${date}';
  __info__.hash = '${commitHash}';
`;

bundle.writeOwlTemplateBundleToFile(argv.outDir || DEFAULT_DIR, OUTRO);
