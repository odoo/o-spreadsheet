import "./dom_mock"; // for node.js environment

import { createAction, createActions } from "./actions/action";
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
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
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
  PIVOT_INSERT_TABLE_STYLE_ID,
  PIVOT_STATIC_TABLE_CONFIG,
  SCROLLBAR_WIDTH,
} from "./constants";
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import {
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
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
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import {
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
  ColorGenerator,
  DateTime,
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
  isDateTimeFormat,
  isDefined,
  isFormula,
  isInside,
  isMarkdownLink,
  isNumber,
  jsDateToNumber,
  lazy,
  lettersToNumber,
  markdownLink,
  mergeContiguousZones,
  numberToJsDate,
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
  insertTokenAfterArgSeparator,
  insertTokenAfterLeftParenthesis,
  makeFieldProposal,
} from "./helpers/pivot/pivot_composer_helpers";
import { supportedPivotPositionalFormulaRegistry } from "./helpers/pivot/pivot_positional_formula_registry";

import { CellComposerStore } from "./components/composer/composer/cell_composer_store";
import { ClickableCellSortIcon } from "./components/dashboard/clickable_cell_sort_icon/clickable_cell_sort_icon";
import { ZoomableChartJsComponent } from "./components/figures/chart/chartJs/zoomable_chart/zoomable_chartjs";
import { ChartDashboardMenu } from "./components/figures/chart/chart_dashboard_menu/chart_dashboard_menu";
import { GaugeChartComponent } from "./components/figures/chart/gauge/gauge_chart_component";
import { FullScreenFigure } from "./components/full_screen_figure/full_screen_figure";
import { NumberInput } from "./components/number_input/number_input";
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
import { arg } from "./functions/arguments";
import { functionRegistry } from "./functions/function_registry";
import * as CHART_HELPERS from "./helpers/figures/charts";
import { chartJsExtensionRegistry } from "./helpers/figures/charts/chart_js_extension";
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
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import {
  periodYearToComparable,
  pivotTimeAdapter,
  pivotTimeAdapterRegistry,
} from "./helpers/pivot/pivot_time_adapter";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import { migrationStepRegistry } from "./migrations/migration_steps";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { pivotTimeAdapter, pivotTimeAdapterRegistry } from "./helpers/pivot/pivot_time_adapter";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import { migrationStepRegistry } from "./migrations/migration_steps";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import "./plugins";
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
import { chartComponentRegistry } from "./registries/chart_component_registry";
import { chartRegistry } from "./registries/chart_registry";
import { figureRegistry } from "./registries/figures_registry";
import { iconsOnCellRegistry } from "./registries/icons_on_cell_registry";
import "./registries/interactive_icon_on_cell_registry";
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
import { genericRepeat } from "./registries/repeat_commands_registry";
import {
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "./registries/repeat_transform_registry";
import { errorTypes } from "./types/errors";

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
import { AddFunctionDescription, isMatrix, schemeToColorScale } from "./types";
import { DEFAULT_LOCALE } from "./types/locale";

/**
 * We export here all entities that needs to be accessed publicly by Odoo.
 *
 * Note that the __info__ key is actually completed by the build process (see
 * the rollup.config.js file)
 */

export const __info__ = {};
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58

export { LocalTransportService } from "./collaborative/local_transport_service";
export { Revision } from "./collaborative/revisions";
export { ClientDisconnectedError } from "./collaborative/session";
export { Spreadsheet } from "./components/index";
export { setDefaultSheetViewSize, tokenColors } from "./constants";
export { CompiledFormula, functionCache } from "./formulas/compiler";
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
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
export { LocalTransportService } from "@odoo/o-spreadsheet-engine/collaborative/local_transport_service";
export { Revision } from "@odoo/o-spreadsheet-engine/collaborative/revisions";
export { ClientDisconnectedError } from "@odoo/o-spreadsheet-engine/collaborative/session";
export { setDefaultSheetViewSize, tokenColors } from "@odoo/o-spreadsheet-engine/constants";
export {
  compile,
  compileTokens,
  functionCache,
} from "@odoo/o-spreadsheet-engine/formulas/compiler";
export { astToFormula } from "@odoo/o-spreadsheet-engine/formulas/formula_formatter";
export {
  convertAstNodes,
  iterateAstNodes,
  parse,
  parseTokens,
} from "@odoo/o-spreadsheet-engine/formulas/parser";
export { tokenize } from "@odoo/o-spreadsheet-engine/formulas/tokenizer";
export { findCellInNewZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
export { load } from "@odoo/o-spreadsheet-engine/migrations/data";
export { Model } from "@odoo/o-spreadsheet-engine/model";
export { CorePlugin } from "@odoo/o-spreadsheet-engine/plugins/core_plugin";
export { CoreViewPlugin } from "@odoo/o-spreadsheet-engine/plugins/core_view_plugin";
export { UIPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_plugin";
export { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
export { setTranslationMethod } from "@odoo/o-spreadsheet-engine/translation";
export { Client } from "@odoo/o-spreadsheet-engine/types/collaborative/session";
=======

export { LocalTransportService } from "./collaborative/local_transport_service";
export { Revision } from "./collaborative/revisions";
export { ClientDisconnectedError } from "./collaborative/session";
export { Spreadsheet } from "./components/index";
export { setDefaultSheetViewSize, tokenColors } from "./constants";
export { functionCache } from "./formulas/compiler";
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
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
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
  canExecuteInReadonly,
  coreTypes,
  invalidateCFEvaluationCommands,
  invalidateChartEvaluationCommands,
  invalidateDependenciesCommands,
  invalidateEvaluationCommands,
  isCoreCommand,
  isSheetDependent,
  lockedSheetAllowedCommands,
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

import "./registries/chart_types";

<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import "./clipboard_handlers";
import { Composer } from "./components/composer/composer/composer";
import { Select } from "./components/select/select";
import { TopBar } from "./components/top_bar/top_bar";
import { parseFormat } from "./helpers/format/format_parser";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "./helpers/pivot/pivot_composer_helpers";
import { domainToColRowDomain } from "./helpers/pivot/pivot_domain_helpers";
import { chartSubtypeRegistry } from "./registries/chart_subtype_registry";
import { clipboardHandlersRegistries } from "./registries/clipboardHandlersRegistries";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { parseFormat } from "@odoo/o-spreadsheet-engine/helpers/format/format_parser";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_composer_helpers";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import "./clipboard_handlers";
import { Composer } from "./components/composer/composer/composer";
import { TopBar } from "./components/top_bar/top_bar";
=======
import "./clipboard_handlers";
import { Composer } from "./components/composer/composer/composer";
import { TopBar } from "./components/top_bar/top_bar";
import { getFunctionsFromTokens } from "./formulas/helpers";
import { parseFormat } from "./helpers/format/format_parser";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "./helpers/pivot/pivot_composer_helpers";
import { chartSubtypeRegistry } from "./registries/chart_subtype_registry";
import { clipboardHandlersRegistries } from "./registries/clipboardHandlersRegistries";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db

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
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
  parseDimension,
  isDateOrDatetimeField,
  makeFieldProposal,
  periodYearToComparable,
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
  schemeToColorScale,
  isDateTimeFormat,
  jsDateToNumber,
  numberToJsDate,
  DateTime,
  parseFormat,
  isFormula,
  domainToColRowDomain,
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
  Select,
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
  GaugeChartComponent,
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
  FullScreenFigure,
  NumberInput,
  TopBar,
  Composer,
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

export { createAutocompleteArgumentsProvider } from "./functions/autocomplete_arguments_provider";
export { categories } from "./functions/function_registry";
export type { FunctionRegistry } from "./functions/function_registry";
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
  PIVOT_STATIC_TABLE_CONFIG,
  PIVOT_INSERT_TABLE_STYLE_ID,
  ChartTerms,
  FIGURE_ID_SPLITTER,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
};

export const chartHelpers = { ...CHART_HELPERS, ...CHART_RUNTIME_HELPERS };

export { SpreadsheetPivotTable } from "./helpers/pivot/table_spreadsheet_pivot";

export type { EnrichedToken } from "./formulas/composer_tokenizer";
export type { AST, ASTFuncall } from "./formulas/parser";
export type * from "./types";
export { DEFAULT_LOCALE, DEFAULT_LOCALES } from "./types";

export { AbstractCellClipboardHandler } from "./clipboard_handlers/abstract_cell_clipboard_handler";
export { AbstractFigureClipboardHandler } from "./clipboard_handlers/abstract_figure_clipboard_handler";
export { PivotRuntimeDefinition } from "./helpers/pivot/pivot_runtime_definition";
