import parseArgs from "minimist";
import { xmlBanner } from "../bundle.js";
import { writeOwlTemplateBundleToFile } from "./bundle_xml_templates.js";

const DEFAULT_DIR = "dist";

const argv = parseArgs(process.argv.slice(2));

writeOwlTemplateBundleToFile(argv.outDir || DEFAULT_DIR, xmlBanner());
