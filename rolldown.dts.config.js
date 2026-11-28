import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

/**
 * Bundles the declarations emitted by `tsc` (dist/types) into a single
 * dist/o_spreadsheet.d.ts file.
 */
export default defineConfig({
  input: { o_spreadsheet: "dist/types/index.d.ts" },
  external: ["@odoo/owl", "chart.js", "luxon"],
  treeshake: false,
  plugins: [dts({ dtsInput: true, emitDtsOnly: true })],
  output: {
    dir: "dist",
    format: "esm",
  },
});
