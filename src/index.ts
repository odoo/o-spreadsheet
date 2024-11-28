import { createAction, createActions } from "./actions/action";
import { clipboardHandlersRegistries } from "./clipboard_handlers/index";
import { transformRangeData } from "./collaborative/ot/ot_helpers";
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
} from "./constants";
import { ComposerFocusStore } from "./current_components/composer/composer_focus_store";
import { ChartJsComponent } from "./current_components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./current_components/figures/chart/scorecard/chart_scorecard";
import { FigureComponent } from "./current_components/figures/figure/figure";
import { ChartFigure } from "./current_components/figures/figure_chart/figure_chart";
import { Grid } from "./current_components/grid/grid";
import { HoveredCellStore } from "./current_components/grid/hovered_cell_store";
import { GridOverlay } from "./current_components/grid_overlay/grid_overlay";
import { useDragAndDropListItems } from "./current_components/helpers/drag_and_drop_hook";
import { useHighlights, useHighlightsOnHover } from "./current_components/helpers/highlight_hook";
import { Menu } from "./current_components/menu/menu";
import { Popover } from "./current_components/popover";
import { CellPopoverStore } from "./current_components/popover/cell_popover_store";
import { SelectionInput } from "./current_components/selection_input/selection_input";
import { SelectionInputStore } from "./current_components/selection_input/selection_input_store";
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
} from "./current_components/side_panel/chart";
import { ChartDataSeries } from "./current_components/side_panel/chart/building_blocks/data_series/data_series";
import { ChartErrorSection } from "./current_components/side_panel/chart/building_blocks/error_section/error_section";
import { ChartLabelRange } from "./current_components/side_panel/chart/building_blocks/label_range/label_range";
import { ChartTitle } from "./current_components/side_panel/chart/building_blocks/title/title";
import { ChartTypePicker } from "./current_components/side_panel/chart/chart_type_picker/chart_type_picker";
import { ChartPanel } from "./current_components/side_panel/chart/main_chart_panel/main_chart_panel";
import { PieChartDesignPanel } from "./current_components/side_panel/chart/pie_chart/pie_chart_design_panel";
import { Checkbox } from "./current_components/side_panel/components/checkbox/checkbox";
import { CogWheelMenu } from "./current_components/side_panel/components/cog_wheel_menu/cog_wheel_menu";
import { RoundColorPicker } from "./current_components/side_panel/components/round_color_picker/round_color_picker";
import { Section } from "./current_components/side_panel/components/section/section";
import { FindAndReplaceStore } from "./current_components/side_panel/find_and_replace/find_and_replace_store";
import { PivotDeferUpdate } from "./current_components/side_panel/pivot/pivot_defer_update/pivot_defer_update";
import { AddDimensionButton } from "./current_components/side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { PivotDimension } from "./current_components/side_panel/pivot/pivot_layout_configurator/pivot_dimension/pivot_dimension";
import { PivotDimensionGranularity } from "./current_components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_granularity/pivot_dimension_granularity";
import { PivotDimensionOrder } from "./current_components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_order/pivot_dimension_order";
import { PivotLayoutConfigurator } from "./current_components/side_panel/pivot/pivot_layout_configurator/pivot_layout_configurator";
import { PivotSidePanelStore } from "./current_components/side_panel/pivot/pivot_side_panel/pivot_side_panel_store";
import { PivotTitleSection } from "./current_components/side_panel/pivot/pivot_title_section/pivot_title_section";
import { SidePanelStore } from "./current_components/side_panel/side_panel/side_panel_store";
import { ValidationMessages } from "./current_components/validation_messages/validation_messages";
import { getFunctionsFromTokens } from "./formulas";
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import { FunctionRegistry, arg, functionRegistry } from "./functions/index";
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
  getUniqueText,
  isDateTime,
  isDefined,
  isInside,
  isMarkdownLink,
  isNumber,
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
  sanitizeSheetName,
  splitReference,
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

import { CellComposerStore } from "./current_components/composer/composer/cell_composer_store";
import { ComboChartDesignPanel } from "./current_components/side_panel/chart/combo_chart/combo_chart_design_panel";
import { RadarChartDesignPanel } from "./current_components/side_panel/chart/radar_chart/radar_chart_design_panel";
import { WaterfallChartDesignPanel } from "./current_components/side_panel/chart/waterfall_chart/waterfall_chart_design_panel";
import { SidePanelCollapsible } from "./current_components/side_panel/components/collapsible/side_panel_collapsible";
import { RadioSelection } from "./current_components/side_panel/components/radio_selection/radio_selection";
import { PivotMeasureDisplayPanelStore } from "./current_components/side_panel/pivot/pivot_measure_display_panel/pivot_measure_display_panel_store";
import { TextInput } from "./current_components/text_input/text_input";
import { ChartTerms } from "./current_components/translations_terms";
import * as CHART_HELPERS from "./helpers/figures/charts";
import * as CHART_RUNTIME_HELPERS from "./helpers/figures/charts/runtime";
import {
  areDomainArgsFieldsValid,
  createPivotFormula,
  getMaxObjectId,
  isDateOrDatetimeField,
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
export { Spreadsheet } from "./components/index";
export { setDefaultSheetViewSize } from "./constants";
export { tokenColors } from "./current_components/composer/composer/abstract_composer_store";
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
export { CoreViewPlugin } from "./plugins/core_view_plugin";
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
  isDateOrDatetimeField,
  makeFieldProposal,
  insertTokenAfterArgSeparator,
  insertTokenAfterLeftParenthesis,
  mergeContiguousZones,
  getPivotHighlights,
  pivotTimeAdapter,
  UNDO_REDO_PIVOT_COMMANDS,
  createPivotFormula,
  areDomainArgsFieldsValid,
  splitReference,
  sanitizeSheetName,
  getUniqueText,
  isNumber,
  isDateTime,
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
  RadarChartDesignPanel,
  WaterfallChartDesignPanel,
  ComboChartDesignPanel,
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
  PivotDeferUpdate,
  PivotTitleSection,
  CogWheelMenu,
  TextInput,
  SidePanelCollapsible,
  RadioSelection,
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

export const chartHelpers = { ...CHART_HELPERS, ...CHART_RUNTIME_HELPERS };

export { PivotRuntimeDefinition } from "./helpers/pivot/pivot_runtime_definition";
export { SpreadsheetPivotTable } from "./helpers/pivot/table_spreadsheet_pivot";

export type { EnrichedToken } from "./formulas/composer_tokenizer";
export type { AST, ASTFuncall } from "./formulas/parser";
export type { Token } from "./formulas/tokenizer";
export type * from "./types";
export type { FunctionRegistry };

export { AbstractCellClipboardHandler } from "./clipboard_handlers/abstract_cell_clipboard_handler";
export { AbstractFigureClipboardHandler } from "./clipboard_handlers/abstract_figure_clipboard_handler";
