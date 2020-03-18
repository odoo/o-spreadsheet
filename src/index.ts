/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

import { toXC, numberToLetters } from "./helpers";
import { args, toBoolean, toNumber, toString } from "./functions/arguments";
import { addFunction } from "./functions/index";
import { sidePanelRegistry, contextMenuRegistry } from "./ui/registries";

export const __info__ = {};
export { Spreadsheet } from "./ui/spreadsheet";

export const helpers = {
  functions: {
    args,
    toBoolean,
    toNumber,
    toString
  },
  utils: {
    toXC,
    numberToLetters
  },
  registry: {
    sidePanelRegistry,
    contextMenuRegistry,
    newFunction: addFunction
  }
};
