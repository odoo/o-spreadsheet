import { defineConfig } from "rolldown";
import { bundle } from "./tools/bundle.cjs";

const outro = bundle.outro();

/**
 * Get the rolldown config based on the arguments
 * @param {"esm" | "cjs" | "iife"} format format of the bundle
 * @param {boolean} minified should it be minified
 */
function getConfigForFormat(format, minified = false) {
  return {
    file: minified ? `dist/o-spreadsheet.${format}.min.js` : `dist/o-spreadsheet.${format}.js`,
    format,
    name: "o_spreadsheet",
    extend: true,
    globals: { "@odoo/owl": "owl", "chart.js": "Chart" },
    outro,
    banner: bundle.jsBanner(),
    minify: minified,
  };
}

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
        file: `build/o-spreadsheet.${format}.js`,
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
