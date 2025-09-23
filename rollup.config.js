import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import { bundle } from "./tools/bundle.cjs";

const outro = bundle.outro();

function getConfigForFormat({ input, name, external, baseName }) {
  return [
    // ESM
    {
      input,
      external,
      output: {
        name,
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl" },
        file: `dist/${baseName}.esm.js`,
        format: "esm",
      },
      plugins: [nodeResolve(), typescript({ useTsconfigDeclarationDir: true })],
    },
    // CJS
    {
      input,
      external,
      output: {
        name,
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl" },
        file: `dist/${baseName}.cjs.js`,
        format: "cjs",
      },
      plugins: [nodeResolve(), typescript({ useTsconfigDeclarationDir: true })],
    },
    // IIFE
    {
      input,
      external,
      output: {
        name,
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl" },
        file: `dist/${baseName}.iife.js`,
        format: "iife",
      },
      plugins: [nodeResolve(), typescript({ useTsconfigDeclarationDir: true })],
    },
    // IIFE minified
    {
      input,
      external,
      output: {
        name,
        extend: true,
        outro,
        banner: bundle.jsBanner(),
        globals: { "@odoo/owl": "owl" },
        file: `dist/${baseName}.iife.min.js`,
        format: "iife",
      },
      plugins: [nodeResolve(), typescript({ useTsconfigDeclarationDir: true }), terser()],
    },
  ];
}

export default () => {
  // UI bundle (depends on OWL)
  const uiConfigs = getConfigForFormat({
    input: "src/index.ts",
    name: "o_spreadsheet_ui",
    external: ["@odoo/owl"],
    baseName: "o-spreadsheet-ui",
  });

  // Engine bundle (no OWL dependency)
  const engineConfigs = getConfigForFormat({
    input: "src/engine/SpreadsheetEngine.ts",
    name: "o_spreadsheet_engine",
    external: [],
    baseName: "o-spreadsheet-engine",
  });

  // DTS for UI
  const dtsUi = {
    input: "dist/types/index.d.ts",
    output: { file: "dist/o-spreadsheet-ui.d.ts", format: "es" },
    plugins: [dts(), nodeResolve()],
  };
  // DTS for Engine
  const dtsEngine = {
    input: "dist/types/engine/SpreadsheetEngine.d.ts",
    output: { file: "dist/o-spreadsheet-engine.d.ts", format: "es" },
    plugins: [dts(), nodeResolve()],
  };

  return [...uiConfigs, ...engineConfigs, dtsUi, dtsEngine];
};
