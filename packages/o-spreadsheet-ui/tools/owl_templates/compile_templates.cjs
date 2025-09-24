const fs = require("fs");
const path = require("path");
const { getParsedOwlTemplateBundle } = require("../bundle_xml/bundle_xml_templates.cjs");

const TEMPLATE_FILE_PATH = path.join(__dirname, "./_compiled/owl_compiled_templates.cjs");

function importOwl() {
  // Owl need some web globals to work properly. Import them from JSDOM if we are in node and that JSDOM is not loaded.
  if (global.window) {
    return require("@odoo/owl");
  }
  const jsdom = require("jsdom");
  const defaultHtml =
    '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
  const document = new jsdom.JSDOM(defaultHtml, {});

  const window = document.window;
  global.window = document.window;
  global.document = window.document;
  global.Element = window.Element;
  global.DOMTokenList = window.DOMTokenList;
  global.Node = window.Node;
  global.CharacterData = window.CharacterData;
  global.DOMParser = window.DOMParser;
  window.requestAnimationFrame = () => {};

  return require("@odoo/owl");
}

// Taken from OWL repo
// https://github.com/odoo/owl/blob/398df543feb0349ec5c7b38824c6a51d00ab6a45/tools/compile_xml.js#L54
const a = "·-_,:;";
const p = new RegExp(a.split("").join("|"), "g");
function slugify(str) {
  return str
    .replace(/\//g, "") // remove /
    .replace(/\./g, "_") // Replace . with _
    .replace(p, (c) => "_") // Replace special characters
    .replace(/&/g, "_and_") // Replace & with ‘and’
    .replace(/[^\w\-]+/g, ""); // Remove all non-word characters
}

function compileTemplates() {
  const owl = importOwl();
  const parsedXMl = getParsedOwlTemplateBundle();
  const app = new owl.App(owl.Component, { test: true });
  const compiledTemplates = {};
  for (const template of parsedXMl.querySelectorAll("[t-name]")) {
    const name = template.getAttribute("t-name");
    compiledTemplates[name] = app._compileTemplate(name, template);
  }

  return compiledTemplates;
}

function writeCompiledTemplatesToFile() {
  const templates = compileTemplates();
  const templatesStr = [];
  for (const tName in templates) {
    const fnName = slugify(tName);
    const fnString = templates[tName].toString().replace("anonymous", fnName);
    const str = `"${tName}": ${fnString},\n`;
    templatesStr.push(str);
  }

  const templateFileStr = `exports.templates = {\n ${templatesStr.join("\n")} \n}`;

  const dir = path.dirname(TEMPLATE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TEMPLATE_FILE_PATH, templateFileStr);
}

function getCompiledTemplates() {
  if (!fs.existsSync(TEMPLATE_FILE_PATH)) {
    writeCompiledTemplatesToFile();
  }

  const { templates } = require(TEMPLATE_FILE_PATH);
  return templates;
}

function deleteCompiledTemplatesFile() {
  fs.unlinkSync(TEMPLATE_FILE_PATH);
}

exports.writeTemplatesToFile = writeCompiledTemplatesToFile;
exports.getCompiledTemplates = getCompiledTemplates;
exports.deleteCompiledTemplatesFile = deleteCompiledTemplatesFile;
