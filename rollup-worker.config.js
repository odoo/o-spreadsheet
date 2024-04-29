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
    file: minified
      ? `dist/o-spreadsheet-worker.${format}.min.js`
      : `dist/o-spreadsheet-worker.${format}.js`,
    format,
    name: "o_spreadsheet_worker",
    extend: true,
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

  if (commandLineArgs.configDev) {
    // Only build iife version to improve speed
    input = "build/worker/src-worker/worker.js";
    output = [
      {
        file: `build/o_spreadsheet_worker.js`,
        format: "iife",
        name: "o_spreadsheet_worker",
        extend: true,
        outro,
        banner: bundle.jsBanner(),
      },
    ];
    config = {
      input,
      output,
      plugins,
    };
  } else {
    input = "src-worker/worker.ts";
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
        output,
        plugins,
      },
      {
        input: "dist/types-worker/worker.d.ts",
        output: [{ file: "dist/o-spreadsheet-worker.d.ts", format: "es" }],
        plugins: [dts(), nodeResolve()],
      },
    ];
  }

  return config;
};
