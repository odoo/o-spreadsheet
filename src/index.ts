/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
export { Spreadsheet } from "./components/spreadsheet";
export { addFunction } from "./functions/index";
