/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

import { toXC, numberToLetters } from "./helpers";

export const __info__ = {};
export { Spreadsheet } from "./ui/spreadsheet";
export { addFunction } from "./functions/index";
export { args, toBoolean, toNumber, toString, getNumbers } from "./functions/arguments";
export const utils = {
  toXC,
  numberToLetters
};
