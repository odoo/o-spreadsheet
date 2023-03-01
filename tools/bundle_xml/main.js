const bundle = require("./bundle_xml_templates");

const outDirAgIndex = process.argv.findIndex((arg) => arg === "--outDir") + 1;
const outDir = process.argv[outDirAgIndex] || "dist";

bundle.writeOwlTemplateBundleToFile(outDir);
