const sass = require("sass");
const parseArgs = require("minimist");
const { globSync } = require("glob");

const { writeToFile } = require("./utils/files");
const { commitHash, date, version } = require("./utils/info");
const { exit } = require("process");

const start = Date.now();

const files = globSync("src/components/**/*.scss");

// Build a fake index.scss file that imports all the components
// scss files
const index = files.map((file) => `@use "${file}";`).join("\n");
const { css } = sass.compileString(index, {
  loadPaths: ["."],
});

const OUTRO = `
/**
 * version: ${version}
 * date: ${date}
 * commit: ${commitHash}
 */
`;
const argv = parseArgs(process.argv.slice(2));
if (!argv.out) {
  console.log("Missing output file: --out <path>");
  exit(1);
}
writeToFile(argv.out, css + OUTRO);

const timeSpentSeconds = (Date.now() - start) / 1000;
console.log(`created ${argv.out} in ${timeSpentSeconds.toFixed(2)}s`);
