import { ChartJsComponent } from "./components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./components/figures/chart/scorecard/chart_scorecard";
import { ChartFigure } from "./components/figures/figure_chart/figure_chart";
import { Grid } from "./components/grid/grid";
import { GridOverlay } from "./components/grid_overlay/grid_overlay";
import {
  BarConfigPanel,
  chartSidePanelComponentRegistry,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  LineBarPieConfigPanel,
  LineBarPieDesignPanel,
  LineConfigPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
} from "./components/side_panel/chart";
import { ChartPanel } from "./components/side_panel/chart/main_chart_panel/main_chart_panel";
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
  ChartColors,
  chartFontColor,
  getDefaultChartJsRuntime,
  getFillingMode,
} from "./helpers/charts";
import {
  colorToRGBA,
  computeTextWidth,
  deepEquals,
  formatValue,
  isMarkdownLink,
  markdownLink,
  numberToLetters,
  parseMarkdownLink,
  positionToZone,
  rgbaToHex,
  toCartesian,
  toXC,
  toZone,
  UuidGenerator,
} from "./helpers/index";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import { corePluginRegistry, uiPluginRegistry } from "./plugins/index";
import { clickableCellRegistry } from "./registries/cell_clickable_registry";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  cellPopoverRegistry,
  cellRegistry,
  chartComponentRegistry,
  chartRegistry,
  colMenuRegistry,
  createFullMenuItem,
  figureRegistry,
  inverseCommandRegistry,
  linkMenuRegistry,
  otRegistry,
  rowMenuRegistry,
  sheetMenuRegistry,
  sidePanelRegistry,
  topbarComponentRegistry,
  topbarMenuRegistry,
} from "./registries/index";
import { getMenuChildren } from "./registries/menus/helpers";
import { FunctionDescription } from "./types";
import { CellErrorLevel, EvaluationError } from "./types/errors";

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
export { tokenize } from "./formulas/tokenizer";
export { AbstractChart } from "./helpers/charts";
export { findCellInNewZone } from "./helpers/zones";
export { load } from "./migrations/data";
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
export { EvaluationError } from "./types/errors";
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
  figureRegistry,
  sheetMenuRegistry,
  chartSidePanelComponentRegistry,
  chartComponentRegistry,
  chartRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
  clickableCellRegistry,
  otRegistry,
  inverseCommandRegistry,
  cellRegistry,
  cellPopoverRegistry,
};
export const cellTypes = {
  LinkCell,
};
export const helpers = {
  args,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toXC,
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
  createEmptySheet,
  createEmptyExcelSheet,
  getDefaultChartJsRuntime,
  chartFontColor,
  getMenuChildren,
  ChartColors,
  EvaluationError,
  CellErrorLevel,
  getFillingMode,
  rgbaToHex,
  colorToRGBA,
  positionToZone,
  deepEquals,
};
export const components = {
  ChartPanel,
  ChartFigure,
  ChartJsComponent,
  Grid,
  GridOverlay,
  ScorecardChart,
  LineConfigPanel,
  LineBarPieDesignPanel,
  BarConfigPanel,
  LineBarPieConfigPanel,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
};

export function addFunction(functionName: string, functionDescription: FunctionDescription) {
  functionRegistry.add(functionName, functionDescription);
}
