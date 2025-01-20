const sass = require("sass");
const { globSync } = require("glob");
const fs = require("fs");
const path = require("path");

const { writeToFile } = require("../utils/files.cjs");
const { bundle } = require("../bundle.cjs");

const forbiddenPatterns = [/\@use\b/, /\@import\b/, /\@forward\b/];
const variablePath = "src/variables.scss";

function createScssBundle(target) {
  const start = Date.now();
  if (!target) {
    throw new Error("Missing target!!");
  }
  const files = globSync("src/components/**/*.scss");
  const banner = bundle.cssBanner();
  const scssContentFiles = [];
  for (const file of files) {
    scssContentFiles.push(`/* Originates from ${file} */`);
    const content = fs.readFileSync(file, "utf8");
    if (forbiddenPatterns.some((pattern) => pattern.test(content))) {
      // We cannot use @use, @import or @forward in the bundle
      throw new Error(`File ${file} contains forbidden patterns (use/import/forward)`);
    }
    scssContentFiles.push(content);
  }
  const scssBundlePath = path.resolve(target, "o_spreadsheet.scss");
  const scssVariablesPath = path.resolve(target, "o_spreadsheet_variables.scss");
  const scssContent = scssContentFiles.join("\n");
  const scssVariables = fs.readFileSync(variablePath, "utf8");
  writeToFile(scssBundlePath, banner + scssContent);
  writeToFile(scssVariablesPath, banner + scssVariables);

  const fullBundle = scssVariables + "\n" + scssContent;

  const { css } = sass.compileString(fullBundle, {
    loadPaths: ["."],
  });
  writeToFile(path.resolve(target, "o_spreadsheet.css"), banner + css);

  const timeSpentSeconds = (Date.now() - start) / 1000;
  console.log(`created ${target}/o_spreadsheet.css in ${timeSpentSeconds.toFixed(2)}s`);
}

exports.createScssBundle = createScssBundle;
