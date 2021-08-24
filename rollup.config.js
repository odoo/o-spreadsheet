import { version } from "./package.json";
import git from "git-rev-sync";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "dist/js/src/index.js",
    external: ["@odoo/owl"],
    plugins: [nodeResolve()],
    output: {
      file: "dist/o_spreadsheet.js",
      format: "iife",
      name: "o_spreadsheet",
      extend: true,
      globals: { "@odoo/owl": "owl" /*, "chart.js": "chart_js" */ },
      outro: `exports.__info__.version = '${version}';\nexports.__info__.date = '${new Date().toISOString()}';\nexports.__info__.hash = '${git.short()}';`,
    },
  },
  {
    input: "dist/js/src/index.d.ts",
    output: [{ file: "dist/o_spreadsheet.d.ts", format: "es" }],
    plugins: [dts()],
  },
];
