/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

import { args, functionRegistry } from "./functions/index";
import { toBoolean, toNumber, toString } from "./functions/helpers";
import { numberToLetters, toXC } from "./helpers/index";
import { contextMenuRegistry, sidePanelRegistry } from "./ui/index";
import { pluginRegistry } from "./model";

export const __info__ = {};
export { Spreadsheet } from "./ui/index";

export const registries = {
  sidePanelRegistry,
  contextMenuRegistry,
  functionRegistry,
  pluginRegistry
};

export { Model } from "./model";
export { BasePlugin } from "./base_plugin";

export const helpers = {
  args,
  toBoolean,
  toNumber,
  toString,
  toXC,
  numberToLetters
};
