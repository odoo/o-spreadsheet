import { version } from "./package.json";
// import { nodeResolve } from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs'
import git from "git-rev-sync";

export default {
  input: "dist/js/src/index.js",
  external: ["@odoo/owl", "yjs"],
  // external: ["@odoo/owl", "yjs"],
  output: {
    file: "dist/o_spreadsheet.js",
    format: "iife",
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl", "yjs": "yjs" },
    // paths: path => {
    //   if (/^lib0\//.test(path)) {
    //     return `lib0/dist/${path.slice(5, -3)}.cjs`
    //   }
    //   return path
    // },
    outro: `exports.__info__.version = '${version}';\nexports.__info__.date = '${new Date().toISOString()}';\nexports.__info__.hash = '${git.short()}';`,
  },
  plugins: []
};
