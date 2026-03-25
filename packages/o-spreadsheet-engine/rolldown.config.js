import { defineConfig } from "rolldown";
import { bundle } from "../../tools/bundle.cjs";

const outro = bundle.outro();

const EXTENSION = {
  esm: "esm.js", //TODO Change it to mjs
  cjs: "cjs",
  iife: "iife.js",
};

/**
 * Get the rolldown config based on the arguments
 * @param {"esm" | "cjs" | "iife"} format format of the bundle
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
    minify: minified,
  };
}

export default defineConfig((cliArgs) => {
  const format = cliArgs.format;
  if (format) {
    const extension = EXTENSION[format];
    // Only build one version to improve speed
    return {
      input: "build/js/o-spreadsheet-engine/src/index.js",
      external: [],
      checks: {
        circularDependency: true,
      },
      output: {
        name: "o_spreadsheet_engine",
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        file: `build/o-spreadsheet-engine.${extension}`,
        format,
      },
    };
  }

  // dist build
  return {
    input: "src/index.ts",
    external: [],
    checks: {
      circularDependency: true,
    },
    output: [
      getConfigForFormat("esm"),
      getConfigForFormat("cjs"),
      getConfigForFormat("iife"),
      getConfigForFormat("iife", true),
    ],
  };
});
