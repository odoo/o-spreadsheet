const prettier = require("prettier");
const fs = require("fs");
const path = require("path");

const config = require("../../package.json");
const { writeToFile } = require("../utils/files");

/**
 * Returns a bundle of all the xml templates, as a parsed xml Document
 */
function getParsedOwlTemplateBundle() {
  const xml = getOwlTemplatesBundle();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  return doc;
}

/**
 * Returns a bundle of all the xml templates, as a string
 *
 * @param {boolean} removeRootTags : remove the unnecessary <templates> root tags for export to Odoo. Slightly slower.
 */
function getOwlTemplatesBundle(removeRootTags = false) {
  const srcPath = path.join(__dirname, "../../src");
  const files = getXmlTemplatesFiles(srcPath);
  const templateBundle = createOwlTemplateBundle(files, removeRootTags);
  return templateBundle;
}

function getXmlTemplatesFiles(dir) {
  let xmls = [];
  const files = fs.readdirSync(dir);
  const filesStats = files.map((file) => fs.statSync(dir + "/" + file));
  for (let i in files) {
    const name = dir + "/" + files[i];
    if (filesStats[i].isDirectory()) {
      xmls = xmls.concat(getXmlTemplatesFiles(name));
    } else {
      if (name.endsWith(".xml")) {
        xmls.push(name);
      }
    }
  }
  return xmls;
}

function createOwlTemplateBundle(files, removeRootTags) {
  const xmls = files.map((file) => fs.readFileSync(file, "utf8"));
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
async function writeOwlTemplateBundleToFile(dir, outro = "") {
  process.stdout.write(`Building xml template bundle in "${dir}/" ...`);
  let templateBundle = await getOwlTemplatesBundle(true);
  if (outro) {
    templateBundle += "<!--" + outro + "-->";
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
