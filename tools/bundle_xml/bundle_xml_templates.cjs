const prettier = require("prettier");
const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const config = require("../../package.json");
const { writeToFile } = require("../utils/files.cjs");

/**
 * Returns a bundle of all the xml templates, as a parsed xml Document
 */
function getParsedOwlTemplateBundle() {
  const xml = getOwlTemplatesBundle();
  const parser = new DOMParser();
  return parser.parseFromString(xml, "text/xml");
}

/**
 * Returns a bundle of all the xml templates, as a string
 *
 * @param {boolean} removeRootTags : remove the unnecessary <templates> root tags for export to Odoo. Slightly slower.
 */
function getOwlTemplatesBundle(removeRootTags = false) {
  const srcPath = path.join(__dirname, "../../src");
  const files = getXmlTemplatesFiles(srcPath);
  return createOwlTemplateBundle(files, removeRootTags);
}

function getXmlTemplatesFiles(dirPath) {
  const pattern = path.join(dirPath, "**", "*.xml");
  return globSync("src/**/*.xml");
}

function createOwlTemplateBundle(files, removeRootTags) {
  const xmls = files.map((file) => {
    const xml = fs.readFileSync(file, "utf8");
    if (xml.includes('owl="1"')) {
      const message = `owl="1" is no longer required in xml templates. Please remove it from ${file}`;
      throw new Error(message);
    }
    return xml;
  });
  let xml = xmls.join("\n");
  // individual xml files need a root tag but we can remove them in the bundle
  if (removeRootTags) {
    xml = xml.replace(/<templates>/g, "");
    xml = xml.replace(/<\/templates>/g, "");
  }
  return "<odoo>\n" + xml + "</odoo>";
}

/**
 * Write the xml bundle to the `dist` directory
 */
async function writeOwlTemplateBundleToFile(dir, banner = "") {
  process.stdout.write(`Building xml template bundle in "${dir}/" ...`);
  let templateBundle = await getOwlTemplatesBundle(true);
  if (banner) {
    templateBundle = banner + "\n" + templateBundle;
  }
  templateBundle = prettify(templateBundle);
  writeToFile(path.join(__dirname, `../../${dir}/o_spreadsheet.xml`), templateBundle);
  process.stdout.write("done\n");
}

function prettify(xmlString) {
  try {
    return prettier.format(xmlString, { ...config["prettier"], parser: "xml" });
  } catch (error) {
    console.error("Could not prettify xml, probably because of a syntax error.");
    return xmlString;
  }
}

exports.getParsedOwlTemplateBundle = getParsedOwlTemplateBundle;
exports.writeOwlTemplateBundleToFile = writeOwlTemplateBundleToFile;
