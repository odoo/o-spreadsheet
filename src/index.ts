import { ChartJsComponent } from "./components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./components/figures/chart/scorecard/chart_scorecard";
import { FigureComponent } from "./components/figures/figure/figure";
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
import { arg, functionRegistry } from "./functions/index";
import {
  ChartColors,
  chartFontColor,
  getDefaultChartJsRuntime,
  getFillingMode,
} from "./helpers/figures/charts";
import {
  colorToRGBA,
  computeTextWidth,
  deepEquals,
  formatValue,
  isDefined,
  isMarkdownLink,
  lazy,
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
import { openLink, urlRegistry, urlRepresentation } from "./helpers/links";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import {
  corePluginRegistry,
  coreViewsPluginRegistry,
  featurePluginRegistry,
  statefulUIPluginRegistry,
} from "./plugins/index";
import { clickableCellRegistry } from "./registries/cell_clickable_registry";
import {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  cellPopoverRegistry,
  chartComponentRegistry,
  chartRegistry,
  colMenuRegistry,
  figureRegistry,
  inverseCommandRegistry,
  linkMenuRegistry,
  numberFormatMenuRegistry,
  otRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  topbarComponentRegistry,
  topbarMenuRegistry,
} from "./registries/index";
import {
  genericRepeat,
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "./registries/repeat_commands_registry";
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
export { setDefaultSheetViewSize } from "./constants";
export { compile, functionCache } from "./formulas/compiler";
export { astToFormula, convertAstNodes, parse } from "./formulas/parser";
export { tokenize } from "./formulas/tokenizer";
export { AbstractChart } from "./helpers/figures/charts";
export { findCellInNewZone } from "./helpers/zones";
export { load } from "./migrations/data";
export { Model } from "./model";
export { CorePlugin } from "./plugins/core_plugin";
export { UIPlugin } from "./plugins/ui_plugin";
export { Registry } from "./registries/registry";
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
  featurePluginRegistry,
  statefulUIPluginRegistry,
  coreViewsPluginRegistry,
  corePluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  figureRegistry,
  chartSidePanelComponentRegistry,
  chartComponentRegistry,
  chartRegistry,
  topbarMenuRegistry,
  topbarComponentRegistry,
  clickableCellRegistry,
  otRegistry,
  inverseCommandRegistry,
  urlRegistry,
  cellPopoverRegistry,
  numberFormatMenuRegistry,
  repeatLocalCommandTransformRegistry,
  repeatCommandTransformRegistry,
};
export const helpers = {
  arg,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toXC,
  toZone,
  toCartesian,
  numberToLetters,
  UuidGenerator,
  formatValue,
  computeTextWidth,
  createEmptyWorkbookData,
  createEmptySheet,
  createEmptyExcelSheet,
  getDefaultChartJsRuntime,
  chartFontColor,
  ChartColors,
  EvaluationError,
  CellErrorLevel,
  getFillingMode,
  rgbaToHex,
  colorToRGBA,
  positionToZone,
  isDefined,
  lazy,
  genericRepeat,
  deepEquals,
};

export const links = {
  isMarkdownLink,
  parseMarkdownLink,
  markdownLink,
  openLink,
  urlRepresentation,
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
  FigureComponent,
};

export function addFunction(functionName: string, functionDescription: FunctionDescription) {
  functionRegistry.add(functionName, functionDescription);
}
