import { contextMenuRegistry, sidePanelRegistry, menuItemRegistry } from "./components/index";
import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { numberToLetters, toXC } from "./helpers/index";
import { pluginRegistry } from "./plugins/index";

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

export const registries = {
  sidePanelRegistry,
  contextMenuRegistry,
  menuItemRegistry,
  functionRegistry,
  pluginRegistry,
};

export const helpers = {
  args,
  toBoolean,
  toNumber,
  toString,
  toXC,
  numberToLetters,
};
