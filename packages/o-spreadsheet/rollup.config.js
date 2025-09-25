import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import path from "path";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import { fileURLToPath } from "url";
import { bundle } from "../../tools/bundle.cjs";

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
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default (commandLineArgs) => {
  let output = [];
  let input = "";
  let plugins = [
    alias({
      entries: [
        {
          find: "@odoo/o-spreadsheet-engine",
          replacement: path.resolve(__dirname, "../o-spreadsheet-engine/build/js/o-spreadsheet-engine/src/index.js"),
        },
      ],
    }),
    nodeResolve(),
  ];
  let config = {};

  if (commandLineArgs.format) {
    // Only build one version to improve speed
    config = {
      input: "build/js/o-spreadsheet/src/index.js",
      external: ["@odoo/owl"],
      output: [
        {
          name: "o_spreadsheet",
          extend: true,
          outro,
          banner: bundle.jsBanner(),
          globals: { "@odoo/owl": "owl" },
          file: `build/o-spreadsheet.${commandLineArgs.format}.js`,
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
        external: ["@odoo/owl"],
        output,
        plugins,
      },
      {
        input: "dist/types/o-spreadsheet/src/index.d.ts",
        output: [{ file: "dist/o-spreadsheet.d.ts", format: "es" }],
        plugins: [
          dts(),
          nodeResolve(),
          alias({
            entries: [
              {
                find: "@odoo/o-spreadsheet-engine",
                replacement: path.resolve(
                  __dirname,
                  "../o-spreadsheet-engine/dist/types/index.d.ts"
                ),
              },
            ],
          }),
        ],
      },
    ];
  }

  return config;
};
