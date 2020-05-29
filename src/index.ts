import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { numberToLetters, toXC, toZone, toCartesian } from "./helpers/index";
import { pluginRegistry } from "./plugins/index";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  createFullMenuItem,
  rowMenuRegistry,
  topbarMenuRegistry,
  sidePanelRegistry,
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
export { Model } from "./model";
export { parse } from "./formulas/parser";
export { setTranslationMethod } from "./translation";

export const registries = {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  functionRegistry,
  pluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  topbarMenuRegistry,
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
};
