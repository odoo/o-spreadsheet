import { version } from "./package.json";
import git from "git-rev-sync";
import terser from "@rollup/plugin-terser";
import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";

let commitHash = "";

try {
  commitHash = git.short();
} catch (_) {}

const OUTRO = `
__info__.version = '${version}';
__info__.date = '${new Date().toISOString()}';
__info__.hash = '${commitHash}';
`;

/**
 * Get the rollup config based on the arguments
 * @param {"esm" | "cjs" | "iife"} format format of the bundle
 * @param {string} generatedFileName generated file name
 * @param {boolean} minified should it be minified
 */
function getConfigForFormat(format, minified = false) {
  return {
    file: minified ? `dist/o-spreadsheet.${format}.min.js` : `dist/o-spreadsheet.${format}.js`,
    format,
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl" },
    outro: OUTRO,
    plugins: minified ? [terser()] : [],
  };
}

export default (commandLineArgs) => {
  let output = [];
  let input = "";
  let plugins = [];
  let config = {};

  if (commandLineArgs.configDev) {
    // Only build iife version to improve speed
    input = "build/js/index.js";
    output = [
      {
        file: `build/o_spreadsheet.js`,
        format: "iife",
        name: "o_spreadsheet",
        extend: true,
        outro: OUTRO,
        globals: { "@odoo/owl": "owl" },
      },
    ];
    config = {
      input,
      external: ["@odoo/owl"],
      output,
      plugins,
    };
  } else {
    input = "src/index.ts";
    output = [
      getConfigForFormat("esm"),
      getConfigForFormat("cjs"),
      getConfigForFormat("iife"),
      getConfigForFormat("iife", true),
    ];
    plugins = [typescript({ useTsconfigDeclarationDir: true })];
    config = [
      {
        input,
        external: ["@odoo/owl"],
        output,
        plugins,
      },
      {
        input: "dist/types/index.d.ts",
        output: [{ file: "dist/o-spreadsheet.d.ts", format: "es" }],
        plugins: [dts()],
      },
    ];
  }

  return config;
};
