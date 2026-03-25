import { defineConfig } from "rolldown";
import { fileURLToPath } from "url";
import { bundle } from "./tools/bundle.cjs";

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
    file: minified ? `dist/o_spreadsheet.${format}.min.js` : `dist/o_spreadsheet.${format}.js`,
    format,
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl", "chart.js": "Chart" },
    outro,
    banner: bundle.jsBanner(),
    minify: minified,
  };
}
const __dirname = fileURLToPath(new URL(".", import.meta.url));

function onLog(level, log, defaultHandler) {
  if (level === "warn") {
    // escalate all warnings to errors
    defaultHandler("error", log);
  } else {
    defaultHandler(level, log);
  }
}

export default defineConfig((cliArgs) => {
  const format = cliArgs.format;
  if (format) {
    // Only build one version to improve speed
    return {
      input: "src/index.ts",
      external: ["@odoo/owl", "chart.js", "luxon"],
      checks: {
        circularDependency: true,
      },
      onLog,
      plugins: [],
      output: {
        name: "o_spreadsheet",
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl", "chart.js": "Chart", luxon: "luxon" },
        file: `build/o_spreadsheet.${format}.js`,
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
    plugins: [],
    onLog,
    output: [
      getConfigForFormat("esm"),
      getConfigForFormat("cjs"),
      getConfigForFormat("iife"),
      getConfigForFormat("iife", true),
    ],
  };
});
