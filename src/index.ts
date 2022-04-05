import { ChartFigure } from "./components/figures/figure_chart/figure_chart";
import { BasicChartPanel } from "./components/side_panel/chart/basic_chart_panel/basic_chart_panel";
import { ScorecardChartPanel } from "./components/side_panel/chart/scorecard_chart_panel/scorecard_chart_panel";
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
import { toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import { args, functionRegistry } from "./functions/index";
import { LinkCell } from "./helpers/cells/index";
import {
  computeTextWidth,
  formatValue,
  isMarkdownLink,
  markdownLink,
  numberToLetters,
  parseMarkdownLink,
  toCartesian,
  toXC,
  toZone,
  UuidGenerator,
} from "./helpers/index";
import { createEmptyWorkbookData } from "./migrations/data";
import { corePluginRegistry, uiPluginRegistry } from "./plugins/index";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  cellRegistry,
  colMenuRegistry,
  createFullMenuItem,
  dashboardMenuRegistry,
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
export { compile, functionCache } from "./formulas/compiler";
export { astToFormula, convertAstNodes, parse } from "./formulas/parser";
export { Model } from "./model";
export { CorePlugin } from "./plugins/core_plugin";
export { UIPlugin } from "./plugins/ui_plugin";
export { Registry } from "./registry";
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
  dashboardMenuRegistry,
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
  toJsDate,
  toZone,
  toCartesian,
  numberToLetters,
  createFullMenuItem,
  UuidGenerator,
  formatValue,
  computeTextWidth,
  isMarkdownLink,
  parseMarkdownLink,
  markdownLink,
  createEmptyWorkbookData,
};
export const components = {
  ChartFigure,
  BasicChartPanel,
  ScorecardChartPanel,
};
