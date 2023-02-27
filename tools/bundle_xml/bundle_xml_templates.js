import fs from "fs";
import path from "path";
import prettier from "prettier";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const config = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url)));

/**
 * Returns a bundle of all the xml templates, as a parsed xml Document
 */
export async function getParsedOwlTemplateBundle() {
  const xml = await getOwlTemplatesBundle();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  return doc;
}

/**
 * Returns a bundle of all the xml templates, as a string
 *
 * @param {boolean} removeRootTags : remove the unnecessary <templates> root tags for export to Odoo. Slightly slower.
 */
async function getOwlTemplatesBundle(removeRootTags = false) {
  const srcPath = fileURLToPath(new URL("../../src", import.meta.url));
  const files = await getXmlTemplatesFiles(srcPath);
  const templateBundle = await createOwlTemplateBundle(files, removeRootTags);
  return templateBundle;
}

async function getXmlTemplatesFiles(dir) {
  let xmls = [];
  const files = await fs.promises.readdir(dir);
  const filesStats = await Promise.all(files.map((file) => fs.promises.stat(dir + "/" + file)));
  for (let i in files) {
    const name = dir + "/" + files[i];
    if (filesStats[i].isDirectory()) {
      xmls = xmls.concat(await getXmlTemplatesFiles(name));
    } else {
      if (name.endsWith(".xml")) {
        xmls.push(name);
      }
    }
  }
  return xmls;
}

async function createOwlTemplateBundle(files, removeRootTags) {
  const xmls = await Promise.all(files.map((file) => fs.promises.readFile(file, "utf8")));
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
export async function writeOwlTemplateBundleToFile() {
  process.stdout.write("Building xml template bundle...");
  let templateBundle = await getOwlTemplatesBundle(true);
  templateBundle = prettify(templateBundle);
  const filePath = fileURLToPath(new URL("../../dist/o_spreadsheet.xml", import.meta.url));
  writeToFile(filePath, templateBundle);
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

function writeToFile(filepath, data) {
  if (!fs.existsSync(path.dirname(filepath))) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
  }
  fs.writeFile(filepath, data, (err) => {
    if (err) {
      process.stdout.write(`Error while writing file ${filepath}: ${err}`);
      return;
    }
  });
}
