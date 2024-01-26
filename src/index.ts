import { createAction, createActions } from "./actions/action";
import { transformRangeData } from "./collaborative/ot/ot_helpers";
import { ChartJsComponent } from "./components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./components/figures/chart/scorecard/chart_scorecard";
import { FigureComponent } from "./components/figures/figure/figure";
import { ChartFigure } from "./components/figures/figure_chart/figure_chart";
import { Grid } from "./components/grid/grid";
import { GridOverlay } from "./components/grid_overlay/grid_overlay";
import { useDragAndDropListItems } from "./components/helpers/drag_and_drop_hook";
import { Menu } from "./components/menu/menu";
import { SelectionInput } from "./components/selection_input/selection_input";
import {
  BarConfigPanel,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  LineBarPieConfigPanel,
  LineBarPieDesignPanel,
  LineConfigPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
  chartSidePanelComponentRegistry,
} from "./components/side_panel/chart";
import { ChartColor } from "./components/side_panel/chart/building_blocks/color/color";
import { ChartDataSeries } from "./components/side_panel/chart/building_blocks/data_series/data_series";
import { ChartErrorSection } from "./components/side_panel/chart/building_blocks/error_section/error_section";
import { ChartLabelRange } from "./components/side_panel/chart/building_blocks/label_range/label_range";
import { ChartTitle } from "./components/side_panel/chart/building_blocks/title/title";
import { ChartPanel } from "./components/side_panel/chart/main_chart_panel/main_chart_panel";
import { Checkbox } from "./components/side_panel/components/checkbox/checkbox";
import { Section } from "./components/side_panel/components/section/section";
import { ValidationMessages } from "./components/validation_messages/validation_messages";
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
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import { FunctionRegistry, arg, functionRegistry } from "./functions/index";
import {
  ChartColors,
  chartFontColor,
  getDefaultChartJsRuntime,
  getFillingMode,
} from "./helpers/figures/charts";
import {
  UuidGenerator,
  colorToRGBA,
  computeTextWidth,
  createCurrencyFormat,
  formatValue,
  isDefined,
  isMarkdownLink,
  lazy,
  lettersToNumber,
  markdownLink,
  numberToLetters,
  parseMarkdownLink,
  positionToZone,
  rgbaToHex,
  toCartesian,
  toUnboundedZone,
  toXC,
  toZone,
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
import { AddFunctionDescription, isMatrix } from "./types";
import { errorTypes } from "./types/errors";
import { DEFAULT_LOCALE } from "./types/locale";

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
export { compile, compileTokens, functionCache } from "./formulas/compiler";
export {
  astToFormula,
  convertAstNodes,
  iterateAstNodes,
  parse,
  parseTokens,
} from "./formulas/parser";
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
export {
  coreTypes,
  invalidateCFEvaluationCommands,
  invalidateDependenciesCommands,
  invalidateEvaluationCommands,
  readonlyAllowedCommands,
} from "./types/commands";
export { CellErrorType, EvaluationError } from "./types/errors";

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
  errorTypes,
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
  isEvaluationError,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toXC,
  toZone,
  toUnboundedZone,
  toCartesian,
  numberToLetters,
  lettersToNumber,
  UuidGenerator,
  formatValue,
  createCurrencyFormat,
  computeTextWidth,
  createEmptyWorkbookData,
  createEmptySheet,
  createEmptyExcelSheet,
  getDefaultChartJsRuntime,
  chartFontColor,
  ChartColors,
  getFillingMode,
  rgbaToHex,
  colorToRGBA,
  positionToZone,
  isDefined,
  isMatrix,
  lazy,
  genericRepeat,
  createAction,
  createActions,
  transformRangeData,
};

export const links = {
  isMarkdownLink,
  parseMarkdownLink,
  markdownLink,
  openLink,
  urlRepresentation,
};
export const components = {
  Checkbox,
  Section,
  ChartColor,
  ChartDataSeries,
  ChartErrorSection,
  ChartLabelRange,
  ChartTitle,
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
  Menu,
  SelectionInput,
  ValidationMessages,
};

export const hooks = {
  useDragAndDropListItems,
};

export function addFunction(functionName: string, functionDescription: AddFunctionDescription) {
  functionRegistry.add(functionName, functionDescription);
  return {
    addFunction: (fName: string, fDescription: AddFunctionDescription) =>
      addFunction(fName, fDescription),
  };
}

export const constants = {
  DEFAULT_LOCALE,
};

export type { EnrichedToken } from "./formulas/composer_tokenizer";
export type { AST, ASTFuncall } from "./formulas/parser";
export type { Token } from "./formulas/tokenizer";
export type {
  AddFunctionDescription,
  Arg,
  Cell,
  CellPosition,
  EvalContext,
  FPayload,
} from "./types";
export type { FunctionRegistry };
