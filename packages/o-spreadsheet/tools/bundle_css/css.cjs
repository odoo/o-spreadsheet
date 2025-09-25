const { globSync } = require("glob");
const fs = require("fs");
const path = require("path");

const { writeToFile } = require("../utils/files.cjs");
const { bundle } = require("../../../../tools/bundle.cjs");

const variablePath = "src/variables.css";

function createCSSBundle(target) {
  const start = Date.now();
  if (!target) {
    throw new Error("Missing target!!");
  }
  const files = globSync("src/components/**/*.css");
  const banner = bundle.cssBanner();
  const cssContentFiles = [];
  for (const file of files) {
    cssContentFiles.push(`/* Originates from ${file} */`);
    const content = fs.readFileSync(file, "utf8");
    cssContentFiles.push(content);
  }
  const cssVariables = fs.readFileSync(variablePath, "utf8");
  const cssContent = cssVariables + "\n" + cssContentFiles.join("\n");

  writeToFile(path.resolve(target, "o_spreadsheet.css"), banner + cssContent);

  const timeSpentSeconds = (Date.now() - start) / 1000;
  console.log(`created ${target}/o_spreadsheet.css in ${timeSpentSeconds.toFixed(2)}s`);
}

exports.createCSSBundle = createCSSBundle;
