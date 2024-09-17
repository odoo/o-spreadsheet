const { bundle } = require("../bundle.cjs");
const xmlBundle = require("./bundle_xml_templates.cjs");
const parseArgs = require("minimist");

const DEFAULT_DIR = "dist";

const argv = parseArgs(process.argv.slice(2));

xmlBundle.writeOwlTemplateBundleToFile(argv.outDir || DEFAULT_DIR, bundle.xmlBanner());
