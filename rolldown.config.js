import path from "path";
import { defineConfig } from "rolldown";
import { fileURLToPath } from "url";
import { bundle } from "./tools/bundle.cjs";

const outro = bundle.outro();

const EXTENSION = {
  esm: "esm.js", //TODO Change it to mjs
  cjs: "cjs",
  iife: "iife.js",
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function canvasMockPlugin() {
  const replacement = path.resolve(__dirname, "./tools/empty-module.js");
  return {
    name: "canvas-mock-alias",
    resolveId(source) {
      if (source.endsWith("canvas_mock")) {
        return replacement;
      }
    },
  };
}

/**
 * Get the rolldown config based on the arguments
 * @param {"esm" | "cjs" | "iife"} format format of the bundle
 * @param {boolean} minified should it be minified
 */
function getConfigForFormat(format, minified = false) {
  const extension = EXTENSION[format];
  return {
    file: minified ? `dist/o_spreadsheet.min.${extension}` : `dist/o_spreadsheet.${extension}`,
    format,
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl", "chart.js": "Chart" },
    outro,
    banner: bundle.jsBanner(),
    minify: minified,
  };
}

function getConfigForPerf() {
  return {
    input: "src/index.ts",
    external: ["chart.js", "luxon"],
    checks: {
      circularDependency: true,
    },
    plugins: [canvasMockPlugin()],
    output: [getConfigForFormat("esm")],
  };
}

export default defineConfig((cliArgs) => {
  if (cliArgs.perf) {
    return getConfigForPerf();
  }
  const format = cliArgs.format;
  if (format) {
    const extension = EXTENSION[format];
    // Only build one version to improve speed
    return {
      input: "src/index.ts",
      external: ["@odoo/owl", "chart.js", "luxon"],
      checks: {
        circularDependency: true,
      },
      plugins: [canvasMockPlugin()],
      output: {
        name: "o_spreadsheet",
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl", "chart.js": "Chart", luxon: "luxon" },
        file: `build/o_spreadsheet.${extension}`,
        format,
        sourcemap: true,
      },
      watch: {
        include: ["src/**"],
      },
    };
  }

  // dist build
  return {
    input: "src/index.ts",
    external: ["@odoo/owl", "chart.js", "luxon"],
    checks: {
      circularDependency: true,
    },
    plugins: [canvasMockPlugin()],
    output: [
      getConfigForFormat("esm"),
      getConfigForFormat("cjs"),
      getConfigForFormat("iife"),
      getConfigForFormat("iife", true),
    ],
  };
});
