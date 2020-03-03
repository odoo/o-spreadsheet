/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

import { toXC, numberToLetters } from "./helpers";
import { args, toBoolean, toNumber, toString, getNumbers } from "./functions/arguments";
import { addFunction } from "./functions/index";

export const __info__ = {};
export { Spreadsheet } from "./ui/spreadsheet";
export const utils = {
  toXC,
  numberToLetters,
  args,
  toBoolean,
  toNumber,
  toString,
  getNumbers,
  addFunction
};
