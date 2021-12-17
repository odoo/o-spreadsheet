import {
  BOTTOMBAR_HEIGHT,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "./constants";
import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { formatDecimal, numberToLetters, toCartesian, toXC, toZone, uuidv4 } from "./helpers/index";
import { pluginRegistry } from "./plugins/index";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  createFullMenuItem,
  rowMenuRegistry,
  sheetMenuRegistry,
  sidePanelRegistry,
  topbarComponentRegistry,
  topbarMenuRegistry,
} from "./registries/index";

/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
export { BasePlugin } from "./base_plugin";
export { Spreadsheet } from "./components/index";
export { functionCache } from "./formulas/compiler";
export { normalize } from "./formulas/index";
export { astToFormula, parse } from "./formulas/parser";
export { DEBUG as __DEBUG__ } from "./helpers/index";
export { Model } from "./model";
export { setTranslationMethod } from "./translation";

export const SPREADSHEET_DIMENSIONS = {
  MIN_ROW_HEIGHT,
  MIN_COL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  TOPBAR_HEIGHT,
  BOTTOMBAR_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CELL_HEIGHT,
  SCROLLBAR_WIDTH,
};

export const registries = {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  functionRegistry,
  pluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  sheetMenuRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
};

export const helpers = {
  args,
  toBoolean,
  toNumber,
  toString,
  toXC,
  toZone,
  toCartesian,
  numberToLetters,
  createFullMenuItem,
  uuidv4,
  formatDecimal,
};
