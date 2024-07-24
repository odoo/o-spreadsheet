import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import { bundle } from "./tools/bundle.cjs";

const outro = bundle.outro();

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
    outro,
    banner: bundle.jsBanner(),
    plugins: minified ? [terser()] : [],
  };
}

export default (commandLineArgs) => {
  let output = [];
  let input = "";
  let plugins = [nodeResolve()];
  let config = {};

  if (commandLineArgs.configDev || commandLineArgs.configDist) {
    // Only build one version to improve speed
    input = "build/js/index.js";
    output = [
      {
        name: "o_spreadsheet",
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl" },
      },
    ];
    if (commandLineArgs.configDev) {
      output[0].file = `build/o_spreadsheet.dev.js`;
      output[0].format = `iife`;
    } else {
      output[0].file = `build/o_spreadsheet.js`;
      output[0].format = `esm`;
    }
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
    plugins.push(typescript({ useTsconfigDeclarationDir: true }));
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
        plugins: [dts(), nodeResolve()],
      },
    ];
  }

  return config;
};
