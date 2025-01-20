const parseArgs = require("minimist");
const { exit } = require("process");
const { createScssBundle } = require("./scss.cjs");

const argv = parseArgs(process.argv.slice(2));
if (!argv.out) {
  console.log("Missing output file: --out <path>");
  exit(1);
}
createScssBundle(argv.out);
