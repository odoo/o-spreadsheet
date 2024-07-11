import { createAction, createActions } from "./actions/action";
import { clipboardHandlersRegistries } from "./clipboard_handlers/index";
import { transformRangeData } from "./collaborative/ot/ot_helpers";
import { ComposerFocusStore } from "./components/composer/composer_focus_store";
import { ChartJsComponent } from "./components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./components/figures/chart/scorecard/chart_scorecard";
import { FigureComponent } from "./components/figures/figure/figure";
import { ChartFigure } from "./components/figures/figure_chart/figure_chart";
import { Grid } from "./components/grid/grid";
import { HoveredCellStore } from "./components/grid/hovered_cell_store";
import { GridOverlay } from "./components/grid_overlay/grid_overlay";
import { useDragAndDropListItems } from "./components/helpers/drag_and_drop_hook";
import { useHighlights, useHighlightsOnHover } from "./components/helpers/highlight_hook";
import { Menu } from "./components/menu/menu";
import { Popover } from "./components/popover";
import { CellPopoverStore } from "./components/popover/cell_popover_store";
import { SelectionInput } from "./components/selection_input/selection_input";
import { SelectionInputStore } from "./components/selection_input/selection_input_store";
import {
  BarConfigPanel,
  ChartWithAxisDesignPanel,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  GenericChartConfigPanel,
  LineConfigPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
  chartSidePanelComponentRegistry,
} from "./components/side_panel/chart";
import { ChartDataSeries } from "./components/side_panel/chart/building_blocks/data_series/data_series";
import { ChartErrorSection } from "./components/side_panel/chart/building_blocks/error_section/error_section";
import { ChartLabelRange } from "./components/side_panel/chart/building_blocks/label_range/label_range";
import { ChartTitle } from "./components/side_panel/chart/building_blocks/title/title";
import { ChartTypePicker } from "./components/side_panel/chart/chart_type_picker/chart_type_picker";
import { ChartPanel } from "./components/side_panel/chart/main_chart_panel/main_chart_panel";
import { PieChartDesignPanel } from "./components/side_panel/chart/pie_chart/pie_chart_design_panel";
import { Checkbox } from "./components/side_panel/components/checkbox/checkbox";
import { CogWheelMenu } from "./components/side_panel/components/cog_wheel_menu/cog_wheel_menu";
import { RoundColorPicker } from "./components/side_panel/components/round_color_picker/round_color_picker";
import { Section } from "./components/side_panel/components/section/section";
import { FindAndReplaceStore } from "./components/side_panel/find_and_replace/find_and_replace_store";
import { EditableName } from "./components/side_panel/pivot/editable_name/editable_name";
import { PivotDeferUpdate } from "./components/side_panel/pivot/pivot_defer_update/pivot_defer_update";
import { AddDimensionButton } from "./components/side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { PivotDimension } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension/pivot_dimension";
import { PivotDimensionGranularity } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_granularity/pivot_dimension_granularity";
import { PivotDimensionOrder } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_order/pivot_dimension_order";
import { PivotLayoutConfigurator } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_layout_configurator";
import { PivotSidePanelStore } from "./components/side_panel/pivot/pivot_side_panel/pivot_side_panel_store";
import { PivotTitleSection } from "./components/side_panel/pivot/pivot_title_section/pivot_title_section";
import { SidePanelStore } from "./components/side_panel/side_panel/side_panel_store";
import { ChartTerms } from "./components/translations_terms";
import { ValidationMessages } from "./components/validation_messages/validation_messages";
import {
  BOTTOMBAR_HEIGHT,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  HIGHLIGHT_COLOR,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  PIVOT_TABLE_CONFIG,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "./constants";
import { getFunctionsFromTokens } from "./formulas";
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import { FunctionRegistry, arg, functionRegistry } from "./functions/index";
import {
  chartFontColor,
  getChartAxisTitleRuntime,
  getDefaultChartJsRuntime,
  getFillingMode,
} from "./helpers/figures/charts";
import {
  ColorGenerator,
  UuidGenerator,
  colorToRGBA,
  computeTextWidth,
  createCurrencyFormat,
  deepCopy,
  deepEquals,
  expandZoneOnInsertion,
  formatValue,
  isDefined,
  isInside,
  isMarkdownLink,
  lazy,
  lettersToNumber,
  markdownLink,
  mergeContiguousZones,
  numberToLetters,
  overlap,
  parseMarkdownLink,
  positionToZone,
  reduceZoneOnDeletion,
  rgbaToHex,
  toCartesian,
  toUnboundedZone,
  toXC,
  toZone,
  union,
  unquote,
} from "./helpers/index";
import { openLink, urlRegistry, urlRepresentation } from "./helpers/links";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
  insertTokenAfterArgSeparator,
  insertTokenAfterLeftParenthesis,
  makeFieldProposal,
} from "./helpers/pivot/pivot_composer_helpers";
import { supportedPivotPositionalFormulaRegistry } from "./helpers/pivot/pivot_positional_formula_registry";

import { CellComposerStore } from "./components/composer/composer/cell_composer_store";
import { PivotMeasureDisplayPanelStore } from "./components/side_panel/pivot/pivot_measure_display_panel/pivot_measure_display_panel_store";
import {
  areDomainArgsFieldsValid,
  createPivotFormula,
  getMaxObjectId,
  isDateField,
  parseDimension,
  pivotNormalizationValueRegistry,
  pivotToFunctionValueRegistry,
  toNormalizedPivotValue,
} from "./helpers/pivot/pivot_helpers";
import { getPivotHighlights } from "./helpers/pivot/pivot_highlight";
import { pivotRegistry } from "./helpers/pivot/pivot_registry";
import { pivotSidePanelRegistry } from "./helpers/pivot/pivot_side_panel_registry";
import { pivotTimeAdapter, pivotTimeAdapterRegistry } from "./helpers/pivot/pivot_time_adapter";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import { migrationStepRegistry } from "./migrations/migration_steps";
import {
  corePluginRegistry,
  coreViewsPluginRegistry,
  featurePluginRegistry,
  statefulUIPluginRegistry,
} from "./plugins/index";
import { UNDO_REDO_PIVOT_COMMANDS } from "./plugins/ui_core_views/pivot_ui";
import { clickableCellRegistry } from "./registries/cell_clickable_registry";
import { iconsOnCellRegistry } from "./registries/icons_on_cell_registry";
import {
  autoCompleteProviders,
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  cellPopoverRegistry,
  chartComponentRegistry,
  chartRegistry,
  chartSubtypeRegistry,
  colMenuRegistry,
  figureRegistry,
  inverseCommandRegistry,
  linkMenuRegistry,
  numberFormatMenuRegistry,
  otRegistry,
  rowMenuRegistry,
  topbarComponentRegistry,
  topbarMenuRegistry,
} from "./registries/index";
import {
  genericRepeat,
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "./registries/repeat_commands_registry";
import { sidePanelRegistry } from "./registries/side_panel_registry";
import { useLocalStore, useStore, useStoreProvider } from "./store_engine";
import { DependencyContainer } from "./store_engine/dependency_container";
import { SpreadsheetStore } from "./stores";
import { HighlightStore } from "./stores/highlight_store";
import { ModelStore } from "./stores/model_store";
import { NotificationStore } from "./stores/notification_store";
import { RendererStore } from "./stores/renderer_store";
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
export { tokenColors } from "./components/composer/composer/composer";
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
export { CancelledReason, CommandResult, DispatchResult, addRenderingLayer } from "./types";
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
  autoCompleteProviders,
  autofillModifiersRegistry,
  autofillRulesRegistry,
  cellMenuRegistry,
  colMenuRegistry,
  errorTypes,
  linkMenuRegistry,
  functionRegistry,
  featurePluginRegistry,
  iconsOnCellRegistry,
  statefulUIPluginRegistry,
  coreViewsPluginRegistry,
  corePluginRegistry,
  rowMenuRegistry,
  sidePanelRegistry,
  figureRegistry,
  chartSidePanelComponentRegistry,
  chartComponentRegistry,
  chartRegistry,
  chartSubtypeRegistry,
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
  clipboardHandlersRegistries,
  pivotRegistry,
  pivotTimeAdapterRegistry,
  pivotSidePanelRegistry,
  pivotNormalizationValueRegistry,
  supportedPivotPositionalFormulaRegistry,
  pivotToFunctionValueRegistry,
  migrationStepRegistry,
};
export const helpers = {
  arg,
  isEvaluationError,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toNormalizedPivotValue,
  toXC,
  toZone,
  toUnboundedZone,
  toCartesian,
  numberToLetters,
  lettersToNumber,
  UuidGenerator,
  formatValue,
  createCurrencyFormat,
  ColorGenerator,
  computeTextWidth,
  createEmptyWorkbookData,
  createEmptySheet,
  createEmptyExcelSheet,
  getDefaultChartJsRuntime,
  chartFontColor,
  getChartAxisTitleRuntime,
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
  deepEquals,
  overlap,
  union,
  isInside,
  deepCopy,
  expandZoneOnInsertion,
  reduceZoneOnDeletion,
  unquote,
  getMaxObjectId,
  getFunctionsFromTokens,
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
  parseDimension,
  isDateField,
  makeFieldProposal,
  insertTokenAfterArgSeparator,
  insertTokenAfterLeftParenthesis,
  mergeContiguousZones,
  getPivotHighlights,
  pivotTimeAdapter,
  UNDO_REDO_PIVOT_COMMANDS,
  createPivotFormula,
  areDomainArgsFieldsValid,
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
  RoundColorPicker,
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
  BarConfigPanel,
  PieChartDesignPanel,
  GenericChartConfigPanel,
  ChartWithAxisDesignPanel,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
  ChartTypePicker,
  FigureComponent,
  Menu,
  Popover,
  SelectionInput,
  ValidationMessages,
  AddDimensionButton,
  PivotDimensionGranularity,
  PivotDimensionOrder,
  PivotDimension,
  PivotLayoutConfigurator,
  EditableName,
  PivotDeferUpdate,
  PivotTitleSection,
  CogWheelMenu,
};

export const hooks = {
  useDragAndDropListItems,
  useHighlights,
  useHighlightsOnHover,
};

export const stores = {
  useStoreProvider,
  DependencyContainer,
  CellPopoverStore,
  ComposerFocusStore,
  CellComposerStore,
  FindAndReplaceStore,
  HighlightStore,
  HoveredCellStore,
  ModelStore,
  NotificationStore,
  RendererStore,
  SelectionInputStore,
  SpreadsheetStore,
  useStore,
  useLocalStore,
  SidePanelStore,
  PivotSidePanelStore,
  PivotMeasureDisplayPanelStore,
};

export type { StoreConstructor, StoreParams } from "./store_engine";

export function addFunction(functionName: string, functionDescription: AddFunctionDescription) {
  functionRegistry.add(functionName, functionDescription);
  return {
    addFunction: (fName: string, fDescription: AddFunctionDescription) =>
      addFunction(fName, fDescription),
  };
}

export const constants = {
  DEFAULT_LOCALE,
  HIGHLIGHT_COLOR,
  PIVOT_TABLE_CONFIG,
  ChartTerms,
};

export { PivotRuntimeDefinition } from "./helpers/pivot/pivot_runtime_definition";
export { SpreadsheetPivotTable } from "./helpers/pivot/table_spreadsheet_pivot";

export type { EnrichedToken } from "./formulas/composer_tokenizer";
export type { AST, ASTFuncall } from "./formulas/parser";
export type { Token } from "./formulas/tokenizer";
export type * from "./types";
export type { FunctionRegistry };

export { AbstractCellClipboardHandler } from "./clipboard_handlers/abstract_cell_clipboard_handler";
export { AbstractFigureClipboardHandler } from "./clipboard_handlers/abstract_figure_clipboard_handler";
