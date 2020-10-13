import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { numberToLetters, toXC, toZone, toCartesian, uuidv4, formatDecimal } from "./helpers/index";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  createFullMenuItem,
  rowMenuRegistry,
  topbarMenuRegistry,
  sidePanelRegistry,
  sheetMenuRegistry,
  topbarComponentRegistry,
} from "./registries/index";

import {
  MIN_ROW_HEIGHT,
  MIN_COL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  TOPBAR_HEIGHT,
  BOTTOMBAR_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CELL_HEIGHT,
  SCROLLBAR_WIDTH,
} from "./constants";

import { uiPluginRegistry, basePluginRegistry } from "./registries/plugin_registry";

/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
export { BasePlugin } from "./plugins/base/base_plugin";
export { UIPlugin } from "./plugins/ui/ui_plugin";
export { Spreadsheet } from "./components/index";
export { Model } from "./model";
export { parse, astToFormula } from "./formulas/parser";
export { setTranslationMethod } from "./translation";
export { DEBUG as __DEBUG__ } from "./helpers/index";

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
  rowMenuRegistry,
  sidePanelRegistry,
  sheetMenuRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
  uiPluginRegistry,
  basePluginRegistry,
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
