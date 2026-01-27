import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import path from "path";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import { fileURLToPath } from "url";
import { bundle } from "./tools/bundle.cjs";

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
    file: minified ? `dist/o_spreadsheet.min.${extension}` : `dist/o_spreadsheet.${extension}`,
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
          replacement: path.resolve(__dirname, "./packages/o-spreadsheet-engine/src"),
        },
        {
          find: "@odoo/o-spreadsheet-engine/*",
          replacement: path.resolve(__dirname, "./packages/o-spreadsheet-engine/src/*"),
        },
        {
          find: /.*canvas_mock$/,
          replacement: path.resolve(__dirname, "./tools/empty-module.js"),
        },
      ],
    }),
    nodeResolve(),
  ];
  let config = {};

  if (commandLineArgs.format) {
    const extension = EXTENSION[commandLineArgs.format];
    // Only build one version to improve speed
    config = {
      input: "build/js/src/index.js",
      external: ["@odoo/owl"],
      output: [
        {
          name: "o_spreadsheet",
          extend: true,
          outro,
          banner: bundle.jsBanner(),
          globals: { "@odoo/owl": "owl" },
          file: `build/o_spreadsheet.${extension}`,
          format: commandLineArgs.format,
        },
      ],
      plugins: [
        alias({
          entries: [
            {
              find: "@odoo/o-spreadsheet-engine",
              replacement: path.resolve(
                __dirname,
                "./packages/o-spreadsheet-engine/build/js/o-spreadsheet-engine/src"
              ),
            },
            {
              find: "@odoo/o-spreadsheet-engine/*",
              replacement: path.resolve(
                __dirname,
                "./packages/o-spreadsheet-engine/build/js/o-spreadsheet-engine/src/*"
              ),
            },
            {
              find: /.*canvas_mock$/,
              replacement: path.resolve(__dirname, "./tools/empty-module.js"),
            },
          ],
        }),
        nodeResolve(),
      ],
      watch: {
        include: ["build/js/**", "./packages/o-spreadsheet-engine/build/**"],
      },
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
        plugins: [
          dts(),
          nodeResolve(),
          alias({
            entries: [
              {
                find: "@odoo/o-spreadsheet-engine",
                replacement: path.resolve(
                  __dirname,
                  "./packages/o-spreadsheet-engine/build/js/o-spreadsheet-engine/src"
                ),
              },
              {
                find: "@odoo/o-spreadsheet-engine/*",
                replacement: path.resolve(
                  __dirname,
                  "./packages/o-spreadsheet-engine/build/js/o-spreadsheet-engine/src/*"
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
