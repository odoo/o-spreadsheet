import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import { bundle } from "../../tools/bundle.cjs";

const outro = bundle.outro();

const EXTENSION = {
  esm: "esm.js", //TODO Change it to mjs
  cjs: "cjs",
  iife: "iife.js",
};

/**
 * Get the rollup config based on the arguments
 * @param {"esm" | "cjs" | "iife"} format format of the bundle
 * @param {string} generatedFileName generated file name
 * @param {boolean} minified should it be minified
 */
function getConfigForFormat(format, minified = false) {
  const extension = EXTENSION[format];
  return {
    file: minified
      ? `../../dist/o-spreadsheet-engine.min.${extension}`
      : `../../dist/o-spreadsheet-engine.${extension}`,
    format,
    name: "o_spreadsheet_engine",
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

  if (commandLineArgs.format) {
    const extension = EXTENSION[commandLineArgs.format];
    // Only build one version to improve speed
    config = {
      input: "build/js/o-spreadsheet-engine/src/index.js",
      external: [],
      output: [
        {
          name: "o_spreadsheet_engine",
          extend: true,
          outro,
          banner: bundle.jsBanner(),
          file: `build/o-spreadsheet-engine.${extension}`,
          format: commandLineArgs.format,
        },
      ],
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
        external: [],
        output,
        plugins,
      },
      {
        input: "./build/js/o-spreadsheet-engine/src/index.d.ts",
        output: [{ file: "../../dist/o-spreadsheet-engine.d.ts", format: "es" }],
        plugins: [dts(), nodeResolve()],
      },
    ];
  }

  return config;
};
