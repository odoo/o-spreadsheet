const parseArgs = require("minimist");
const { exit } = require("process");
const { globSync } = require("glob");
const fs = require("fs");
const path = require("path");

const iconsPath = "icons";

function bundleIcons(target) {
  const start = Date.now();
  if (!target) {
    throw new Error("Missing target!!");
  }
  const files = globSync(`${iconsPath}/*.{woff2,css}`);
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) {
    fs.copyFileSync(file, path.resolve(target, path.basename(file)));
  }

  const timeSpentSeconds = (Date.now() - start) / 1000;
  console.log(`copied ${files.length} icon files to ${target} in ${timeSpentSeconds.toFixed(2)}s`);
}

const argv = parseArgs(process.argv.slice(2));
if (!argv.outDir) {
  console.log("Missing output file: --outDir <path>");
  exit(1);
}
bundleIcons(argv.outDir);
