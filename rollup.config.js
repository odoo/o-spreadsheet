import { nodeResolve } from "@rollup/plugin-node-resolve";
import git from "git-rev-sync";
import dts from "rollup-plugin-dts";
import { version } from "./package.json";

let commitHash = "";

try {
  commitHash = git.short();
} catch (_) {}

export default [
  {
    input: "dist/js/index.js",
    external: ["@odoo/owl"],
    plugins: [nodeResolve()],
    output: {
      file: "dist/o_spreadsheet.js",
      format: "iife",
      name: "o_spreadsheet",
      extend: true,
      globals: { "@odoo/owl": "owl" /*, "chart.js": "chart_js" */ },
      outro: `exports.__info__.version = '${version}';\nexports.__info__.date = '${new Date().toISOString()}';\nexports.__info__.hash = '${commitHash}';`,
    },
  },
  {
    input: "dist/js/index.d.ts",
    output: [{ file: "dist/o_spreadsheet.d.ts", format: "es" }],
    plugins: [dts()],
  },
];
