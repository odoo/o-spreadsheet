import { version } from "./package.json";
import git from "git-rev-sync";

export default [{
  input: "dist/js/src/index.js",
  external: ["@odoo/owl"],
  output: {
    file: "dist/o_spreadsheet.js",
    format: "iife",
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl" /*, "chart.js": "chart_js" */ },
    outro: `exports.__info__.version = '${version}';\nexports.__info__.date = '${new Date().toISOString()}';\nexports.__info__.hash = '${git.short()}';`,
  }
},{
  input: "dist/js/src/tools/server.js",
  external: ["cors", "express", "express-ws"],
  output: {
    file: "dist/o_spreadsheet_server.js",
    format: "cjs",
    name: "o_spreadsheet_server",
    extend: true,
    globals: { },
  }
}];
