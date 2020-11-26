import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import {
  numberToLetters,
  toXC,
  toZone,
  toCartesian,
  uuidv4,
  formatDecimal,
  computeTextWidth,
} from "./helpers/index";
import { uiPluginRegistry, corePluginRegistry } from "./plugins/index";
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
  otRegistry,
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

/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
export { CorePlugin } from "./plugins/core_plugin";
export { coreTypes } from "./types/commands";
export { UIPlugin } from "./plugins/ui_plugin";
export { Spreadsheet } from "./components/index";
export { Model } from "./model";
export { parse, astToFormula } from "./formulas/parser";
export { normalize } from "./formulas/index";
export { setTranslationMethod } from "./translation";
export { DEBUG as __DEBUG__ } from "./helpers/index";
export { functionCache } from "./formulas/compiler";
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
  uiPluginRegistry,
  corePluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  sheetMenuRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
  otRegistry,
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
  computeTextWidth,
};
