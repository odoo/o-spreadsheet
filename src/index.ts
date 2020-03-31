/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

import { args } from "./functions/arguments";
import { toBoolean, toNumber, toString } from "./functions/helpers";
import { addFunction, FunctionDescription } from "./functions/index";
import { numberToLetters, toXC } from "./helpers/index";
import { contextMenuRegistry, sidePanelRegistry } from "./ui/index";

class FunctionRegistry {
  add(name: string, descr: FunctionDescription) {
    addFunction(name, descr);
  }
}

const functionRegistry = new FunctionRegistry();

export const __info__ = {};
export { Spreadsheet } from "./ui/index";

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
    functionRegistry
  }
};
