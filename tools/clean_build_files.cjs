const fs = require("fs");

fs.rmSync("build/o_spreadsheet.iife.js", { force: true });
fs.rmSync("build/o_spreadsheet.xml", { force: true });
fs.rmSync("build/o_spreadsheet.css", { force: true });
