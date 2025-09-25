import { createAction, createActions } from "./actions/action";
import { clipboardHandlersRegistries } from "./clipboard_handlers/index";
import { transformRangeData } from "./collaborative/ot/ot_helpers";
import { ComposerFocusStore } from "./components/composer/composer_focus_store";
import { ChartJsComponent } from "./components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "./components/figures/chart/scorecard/chart_scorecard";
import { FigureComponent } from "./components/figures/figure/figure";
import { ChartFigure } from "./components/figures/figure_chart/figure_chart";
import { DelayedHoveredCellStore } from "./components/grid/delayed_hovered_cell_store";
import { Grid } from "./components/grid/grid";
import { GridOverlay } from "./components/grid_overlay/grid_overlay";
import { useDragAndDropListItems } from "./components/helpers/drag_and_drop_dom_items_hook";
import { useHighlights, useHighlightsOnHover } from "./components/helpers/highlight_hook";
import { MenuPopover } from "./components/menu_popover/menu_popover";
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
import { ChartTitle } from "./components/side_panel/chart/building_blocks/chart_title/chart_title";
import { ChartDataSeries } from "./components/side_panel/chart/building_blocks/data_series/data_series";
import { ChartErrorSection } from "./components/side_panel/chart/building_blocks/error_section/error_section";
import { ChartLabelRange } from "./components/side_panel/chart/building_blocks/label_range/label_range";
import { ChartTypePicker } from "./components/side_panel/chart/chart_type_picker/chart_type_picker";
import { ChartPanel } from "./components/side_panel/chart/main_chart_panel/main_chart_panel";
import { PieChartDesignPanel } from "./components/side_panel/chart/pie_chart/pie_chart_design_panel";
import { Checkbox } from "./components/side_panel/components/checkbox/checkbox";
import { CogWheelMenu } from "./components/side_panel/components/cog_wheel_menu/cog_wheel_menu";
import { RoundColorPicker } from "./components/side_panel/components/round_color_picker/round_color_picker";
import { Section } from "./components/side_panel/components/section/section";
import { FindAndReplaceStore } from "./components/side_panel/find_and_replace/find_and_replace_store";
import { PivotDeferUpdate } from "./components/side_panel/pivot/pivot_defer_update/pivot_defer_update";
import { AddDimensionButton } from "./components/side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { PivotDimension } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension/pivot_dimension";
import { PivotDimensionGranularity } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_granularity/pivot_dimension_granularity";
import { PivotDimensionOrder } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_dimension_order/pivot_dimension_order";
import { PivotLayoutConfigurator } from "./components/side_panel/pivot/pivot_layout_configurator/pivot_layout_configurator";
import { PivotSidePanelStore } from "./components/side_panel/pivot/pivot_side_panel/pivot_side_panel_store";
import { PivotTitleSection } from "./components/side_panel/pivot/pivot_title_section/pivot_title_section";
import { SidePanelStore } from "./components/side_panel/side_panel/side_panel_store";
import { ValidationMessages } from "./components/validation_messages/validation_messages";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DESKTOP_BOTTOMBAR_HEIGHT,
  FIGURE_ID_SPLITTER,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  HIGHLIGHT_COLOR,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  PIVOT_TABLE_CONFIG,
  SCROLLBAR_WIDTH,
} from "./constants";
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

import { CellComposerStore } from "./components/composer/composer/cell_composer_store";
import { ClickableCellSortIcon } from "./components/dashboard/clickable_cell_sort_icon/clickable_cell_sort_icon";
import { chartJsExtensionRegistry } from "./components/figures/chart/chartJs/chart_js_extension";
import { ZoomableChartJsComponent } from "./components/figures/chart/chartJs/zoomable_chart/zoomable_chartjs";
import { ChartDashboardMenu } from "./components/figures/chart/chart_dashboard_menu/chart_dashboard_menu";
import { FullScreenChart } from "./components/full_screen_chart/full_screen_chart";
import { PivotHTMLRenderer } from "./components/pivot_html_renderer/pivot_html_renderer";
import { ComboChartDesignPanel } from "./components/side_panel/chart/combo_chart/combo_chart_design_panel";
import { FunnelChartDesignPanel } from "./components/side_panel/chart/funnel_chart_panel/funnel_chart_design_panel";
import { GeoChartDesignPanel } from "./components/side_panel/chart/geo_chart_panel/geo_chart_design_panel";
import { GeoChartRegionSelectSection } from "./components/side_panel/chart/geo_chart_panel/geo_chart_region_select_section";
import { LineChartDesignPanel } from "./components/side_panel/chart/line_chart/line_chart_design_panel";
import { RadarChartDesignPanel } from "./components/side_panel/chart/radar_chart/radar_chart_design_panel";
import { SunburstChartDesignPanel } from "./components/side_panel/chart/sunburst_chart/sunburst_chart_design_panel";
import { TreeMapChartDesignPanel } from "./components/side_panel/chart/treemap_chart/treemap_chart_design_panel";
import { WaterfallChartDesignPanel } from "./components/side_panel/chart/waterfall_chart/waterfall_chart_design_panel";
import { GenericZoomableChartDesignPanel } from "./components/side_panel/chart/zoomable_chart/design_panel";
import { SidePanelCollapsible } from "./components/side_panel/components/collapsible/side_panel_collapsible";
import { RadioSelection } from "./components/side_panel/components/radio_selection/radio_selection";
import { PivotMeasureDisplayPanelStore } from "./components/side_panel/pivot/pivot_measure_display_panel/pivot_measure_display_panel_store";
import { HoveredTableStore } from "./components/tables/hovered_table_store";
import { TextInput } from "./components/text_input/text_input";
import { ChartTerms } from "./components/translations_terms";
import * as CHART_HELPERS from "./helpers/figures/charts";
import * as CHART_RUNTIME_HELPERS from "./helpers/figures/charts/runtime";
import {
  areDomainArgsFieldsValid,
  createCustomFields,
  createPivotFormula,
  getMaxObjectId,
  isDateOrDatetimeField,
  parseDimension,
  pivotNormalizationValueRegistry,
  pivotToFunctionValueRegistry,
  toFunctionPivotValue,
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
import { autoCompleteProviders } from "./registries/auto_completes";
import { autofillModifiersRegistry } from "./registries/autofill_modifiers";
import { autofillRulesRegistry } from "./registries/autofill_rules";
import { clickableCellRegistry } from "./registries/cell_clickable_registry";
import { cellPopoverRegistry } from "./registries/cell_popovers_registry";
import {
  chartComponentRegistry,
  chartRegistry,
  chartSubtypeRegistry,
} from "./registries/chart_types";
import { figureRegistry } from "./registries/figures_registry";
import { iconsOnCellRegistry } from "./registries/icons_on_cell_registry";
import { inverseCommandRegistry } from "./registries/inverse_command_registry";
import {
  cellMenuRegistry,
  colMenuRegistry,
  linkMenuRegistry,
  numberFormatMenuRegistry,
  rowMenuRegistry,
  topbarMenuRegistry,
} from "./registries/menus";
import { otRegistry } from "./registries/ot_registry";
import {
  genericRepeat,
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "./registries/repeat_commands_registry";
import { sidePanelRegistry } from "./registries/side_panel_registry";
import { topbarComponentRegistry } from "./registries/topbar_component_registry";
import { useLocalStore, useStore, useStoreProvider } from "./store_engine";
import { DependencyContainer } from "./store_engine/dependency_container";
import { SpreadsheetStore } from "./stores";
import { ClientFocusStore } from "./stores/client_focus_store";
import { GridRenderer } from "./stores/grid_renderer_store";
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
export { LocalTransportService } from "./collaborative/local_transport_service";
export { Revision } from "./collaborative/revisions";
export { ClientDisconnectedError } from "./collaborative/session";
export { Spreadsheet } from "./components/index";
export { setDefaultSheetViewSize, tokenColors } from "./constants";
export { compile, compileTokens, functionCache } from "./formulas/compiler";
export { astToFormula } from "./formulas/formula_formatter";
export { convertAstNodes, iterateAstNodes, parse, parseTokens } from "./formulas/parser";
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
  invalidateChartEvaluationCommands,
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
  DESKTOP_BOTTOMBAR_HEIGHT,
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
  chartJsExtensionRegistry,
};
export const helpers = {
  arg,
  isEvaluationError,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toNormalizedPivotValue,
  toFunctionPivotValue,
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
  createCustomFields,
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
  ClickableCellSortIcon,
  ZoomableChartJsComponent,
  Grid,
  GridOverlay,
  ScorecardChart,
  LineConfigPanel,
  BarConfigPanel,
  PieChartDesignPanel,
  GenericChartConfigPanel,
  ChartWithAxisDesignPanel,
  GenericZoomableChartDesignPanel,
  LineChartDesignPanel,
  GaugeChartConfigPanel,
  GaugeChartDesignPanel,
  ScorecardChartConfigPanel,
  ScorecardChartDesignPanel,
  GeoChartDesignPanel,
  RadarChartDesignPanel,
  WaterfallChartDesignPanel,
  ComboChartDesignPanel,
  FunnelChartDesignPanel,
  SunburstChartDesignPanel,
  TreeMapChartDesignPanel,
  ChartTypePicker,
  FigureComponent,
  MenuPopover,
  Popover,
  SelectionInput,
  ValidationMessages,
  AddDimensionButton,
  PivotDimensionGranularity,
  PivotDimensionOrder,
  PivotDimension,
  PivotLayoutConfigurator,
  PivotHTMLRenderer,
  PivotDeferUpdate,
  PivotTitleSection,
  CogWheelMenu,
  TextInput,
  SidePanelCollapsible,
  RadioSelection,
  GeoChartRegionSelectSection,
  ChartDashboardMenu,
  FullScreenChart,
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
  DelayedHoveredCellStore,
  HoveredTableStore,
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
  ClientFocusStore,
  GridRenderer,
};

export { getCaretDownSvg, getCaretUpSvg } from "./components/icons/icons";

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
  FIGURE_ID_SPLITTER,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
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

export * from "@odoo/o-spreadsheet-engine";
