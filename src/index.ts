import {
  BOTTOMBAR_HEIGHT,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "./constants";
import { toBoolean, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { isFormula, LinkCell } from "./helpers/cells/index";
import {
  computeTextWidth,
  formatDecimal,
  isMarkdownLink,
  markdownLink,
  numberToLetters,
  parseMarkdownLink,
  toCartesian,
  toXC,
  toZone,
  UuidGenerator,
} from "./helpers/index";
import { corePluginRegistry, uiPluginRegistry } from "./plugins/index";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  cellRegistry,
  colMenuRegistry,
  createFullMenuItem,
  inverseCommandRegistry,
  linkMenuRegistry,
  otRegistry,
  rowMenuRegistry,
  sheetMenuRegistry,
  sidePanelRegistry,
  topbarComponentRegistry,
  topbarMenuRegistry,
} from "./registries/index";

/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
export { Revision } from "./collaborative/revisions";
export { Spreadsheet } from "./components/index";
export { DATETIME_FORMAT } from "./constants";
export { DataSource } from "./data_source";
export { functionCache } from "./formulas/compiler";
export { normalize } from "./formulas/index";
export { astToFormula, parse } from "./formulas/parser";
export { DEBUG as __DEBUG__ } from "./helpers/index";
export { Model } from "./model";
export { CorePlugin } from "./plugins/core_plugin";
export { UIPlugin } from "./plugins/ui_plugin";
export { setTranslationMethod } from "./translation";
export { CancelledReason, CommandResult, DispatchResult } from "./types";
export { Client } from "./types/collaborative/session";
export {
  ClientJoinedMessage,
  ClientLeftMessage,
  ClientMovedMessage,
  CollaborationMessage,
  RemoteRevisionMessage,
  RevisionRedoneMessage,
  RevisionUndoneMessage,
  TransportService,
} from "./types/collaborative/transport_service";
export { coreTypes, invalidateEvaluationCommands, readonlyAllowedCommands } from "./types/commands";
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
  linkMenuRegistry,
  functionRegistry,
  uiPluginRegistry,
  corePluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  sheetMenuRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
  otRegistry,
  inverseCommandRegistry,
  cellRegistry,
};
export const cellTypes = {
  LinkCell,
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
  UuidGenerator,
  formatDecimal,
  computeTextWidth,
  isFormula,
  isMarkdownLink,
  parseMarkdownLink,
  markdownLink,
};
