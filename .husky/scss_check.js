import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import process from "process";

const commentPattern = /\/\/.*|\/\*[\s\S]*?\*\//g;
const firstLevelSelectorPattern = /^(?!(\s|\$|\}|\))).+/gm;

// Get scss files in diff
const files = execSync("git diff --name-only --cached")
  .toString()
  .split("\n")
  .filter((file) => file.endsWith(".scss"));

const faultyFiles = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  let content = readFileSync(file, "utf8");

  // Remove content of comments
  content = content.replace(commentPattern, "");
  // look for first level selectors
  const firstLevelSelectors = content.match(firstLevelSelectorPattern) || [];
  if (!firstLevelSelectors.every((line) => line.startsWith(".o-spreadsheet "))) {
    faultyFiles.push(file);
  }
}

if (faultyFiles.length > 0) {
  const fileList = " - " + faultyFiles.join("\n - ");
  console.log(`\x1b[31m
Some scss files are not scoped to .o-spreadsheet. Please fix them before committing.
Faulty files:

${fileList}

Every css selector should be encompassed within .o-spreadsheet. For example:
.o-spreadsheet {
    ...
}
or 
.o-spreadsheet .foo {
    ...
}
\x1b[0m
`);
  process.exit(1);
}
