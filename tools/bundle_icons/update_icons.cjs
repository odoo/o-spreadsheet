/**
 * Sync the Material Symbols icon font with Odoo.
 *
 * o-spreadsheet uses the same icon font as Odoo to keep a consistent look. This
 * script downloads the font subset and its stylesheet from a given Odoo branch.
 *
 * Usage: node tools/bundle_icons/update_icons.cjs [branch]
 *
 *   branch: the Odoo branch to fetch the font from (default: master)
 */

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const BASE_URL =
  "https://raw.githubusercontent.com/odoo/odoo/{branch}/addons/web/static/src/libs/materialsymbols";

const FONT_FILE = "material_symbols_outlined_subset.woff2";
const CSS_FILE = "material_symbols_outlined.css";

const ICONS_DIR = path.resolve(__dirname, "../../icons");

async function download(url) {
  console.log(`Fetching ${url}`);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(`could not fetch ${url} (${error.message})`);
  }
  if (!response.ok) {
    fail(`could not fetch ${url} (${response.status} ${response.statusText})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Adapt the Odoo stylesheet to the o-spreadsheet layout.
 *
 * Odoo serves the font from an absolute url and declares a woff1 fallback for
 * wkhtmltopdf. Here the font sits next to the css file, and only the woff2 is
 * shipped.
 */
function adaptCss(css) {
  css = css.replace(/\s*\/\* WOFF1 fallback[\s\S]*?\*\//g, "");
  css = css.replace(/src:[^;]*;/g, `src: url('./${FONT_FILE}') format('woff2');`);
  if (css.includes("/web/static")) {
    fail(`unexpected content in ${CSS_FILE}, it must be updated manually:\n${css}`);
  }
  return css;
}

/**
 * The css file is not prettier-ignored, keep it formatted like the rest of the repo.
 * Prettier also normalizes the line endings, so no CRLF sneaks in on Windows.
 */
function formatCss(css, filePath) {
  const options = prettier.resolveConfig.sync(filePath) || {};
  return prettier.format(css, { ...options, filepath: filePath });
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  const branch = process.argv[2] || "master";
  const baseUrl = BASE_URL.replace("{branch}", branch);

  // Download everything before writing anything, to avoid a half update.
  const font = await download(`${baseUrl}/${FONT_FILE}`);
  const css = adaptCss((await download(`${baseUrl}/${CSS_FILE}`)).toString("utf-8"));

  const cssPath = path.join(ICONS_DIR, CSS_FILE);
  fs.writeFileSync(path.join(ICONS_DIR, FONT_FILE), font);
  fs.writeFileSync(cssPath, formatCss(css, cssPath), "utf-8");

  console.log(`Updated ${FONT_FILE} and ${CSS_FILE} from odoo/${branch}`);
}

main();
