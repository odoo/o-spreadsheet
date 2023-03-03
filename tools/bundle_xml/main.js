const bundle = require("./bundle_xml_templates");

const DEFAULT_DIR = "dist";

const outDirFlagIndex = process.argv.findIndex((arg) => arg === "--outDir");
const outDir = outDirFlagIndex !== -1 ? process.argv[outDirFlagIndex + 1] : DEFAULT_DIR;

bundle.writeOwlTemplateBundleToFile(outDir || DEFAULT_DIR);
