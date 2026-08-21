import { BordersPlugin } from "../plugins/core/borders";
import { CarouselPlugin } from "../plugins/core/carousel";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { DataValidationPlugin } from "../plugins/core/data_validation";
import { DefaultPlugin } from "../plugins/core/default";
import { FigurePlugin } from "../plugins/core/figures";
import { FormulaProviderAggregator } from "../plugins/core/formulas_provider";
import { HeaderGroupingPlugin } from "../plugins/core/header_grouping";
import { HeaderSizePlugin } from "../plugins/core/header_size";
import { HeaderVisibilityPlugin } from "../plugins/core/header_visibility";
import { ImagePlugin } from "../plugins/core/image";
import { MergePlugin } from "../plugins/core/merge";
import { NamedRangesPlugin } from "../plugins/core/named_range";
import { PivotCorePlugin } from "../plugins/core/pivot";
import { RangeAdapterPlugin } from "../plugins/core/range";
import { SettingsPlugin } from "../plugins/core/settings";
import { SheetPlugin } from "../plugins/core/sheet";
import { TableStylePlugin } from "../plugins/core/table_style";
import { TablePlugin } from "../plugins/core/tables";
import { EvaluationPlugin } from "../plugins/ui_core_views/cell_evaluation/evaluation_plugin";
import { CellIconPlugin } from "../plugins/ui_core_views/cell_icon_plugin";
import { CustomColorsPlugin } from "../plugins/ui_core_views/custom_colors";
import { DynamicTablesPlugin } from "../plugins/ui_core_views/dynamic_tables";
import { EvaluationChartPlugin } from "../plugins/ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui_core_views/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "../plugins/ui_core_views/evaluation_data_validation";
import { FingerprintPlugin } from "../plugins/ui_core_views/fingerprint";
import { FormulaTrackerPlugin } from "../plugins/ui_core_views/formula_tracker";
import { HeaderSizeUIPlugin } from "../plugins/ui_core_views/header_sizes_ui";
import { PivotUIPlugin } from "../plugins/ui_core_views/pivot_ui";
import { ChartUIPlugin } from "../plugins/ui_feature/chart_ui";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { ColorThemeUIPlugin } from "../plugins/ui_feature/color_theme";
import { DynamicTranslate } from "../plugins/ui_feature/dynamic_translate";
import { GeoFeaturePlugin } from "../plugins/ui_feature/geo_features";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { LockSheetPlugin } from "../plugins/ui_feature/lock_sheet";
import { PivotPresencePlugin } from "../plugins/ui_feature/pivot_presence_plugin";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { SubtotalEvaluationPlugin } from "../plugins/ui_feature/subtotal_evaluation";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { CarouselUIPlugin } from "../plugins/ui_stateful/carousel_ui";
import { CellComputedStylePlugin } from "../plugins/ui_stateful/cell_computed_style";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { FigureUIPlugin } from "../plugins/ui_stateful/figure";
import { FilterEvaluationPlugin } from "../plugins/ui_stateful/filter_evaluation";
import { HeaderPositionsUIPlugin } from "../plugins/ui_stateful/header_positions";
import { HeaderVisibilityUIPlugin } from "../plugins/ui_stateful/header_visibility_ui";
import { GridSelectionPlugin } from "../plugins/ui_stateful/selection";
import { TableComputedStylePlugin } from "../plugins/ui_stateful/table_computed_style";
// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

/**
 * Union of all getter names of a plugin.
 *
 * e.g. With the following plugin
 * ```ts
 * class MyPlugin {
 *   static getters = [
 *     "getCell",
 *     "getCellValue",
 *   ] as const;
 *   getCell() { ... }
 *   getCellValue() { ... }
 * }
 * ```
 * `type Names = GetterNames<typeof MyPlugin>` is equivalent to
 * `type Names = "getCell" | "getCellValue"`
 *
 * Some technical comments:
 *
 * - Since the getter names are in a static array, the type of the plugin must
 *   be given, not the class itself.
 *
 * - we need to index the getters array with every index:
 *   `Plugin["getters"][0] | Plugin["getters"][1] | Plugin["getters"][2] | ...`
 *   which is equivalent to `Plugin["getters"][0 | 1 | 2 | ...]`.
 *   This can be generalized because the union of all indices `0 | 1 | 2 | 3 | ...`
 *   is actually the type `number`.
 */
type GetterNames<Plugin extends { getters: readonly string[] }> = Plugin["getters"][number];
/**
 * Extract getter methods from a plugin, based on its `getters` static array.
 * @example
 * class MyPlugin {
 *   static getters = [
 *     "getCell",
 *     "getCellValue",
 *   ] as const;
 *   getCell() { ... }
 *   getCellValue() { ... }
 * }
 * type MyPluginGetters = PluginGetters<typeof MyPlugin>;
 * // MyPluginGetters is equivalent to:
 * // {
 * //   getCell: () => ...,
 * //   getCellValue: () => ...,
 * // }
 */
export type PluginGetters<
  Plugin extends { new (...args: unknown[]): any; getters: readonly string[] }
> = Pick<InstanceType<Plugin>, GetterNames<Plugin>>;
type RangeAdapterGetters = Pick<RangeAdapterPlugin, GetterNames<typeof RangeAdapterPlugin>>;
type FormulasGetters = Pick<
  FormulaProviderAggregator,
  GetterNames<typeof FormulaProviderAggregator>
>;

export type CoreGetters = PluginGetters<typeof SheetPlugin> &
  PluginGetters<typeof HeaderSizePlugin> &
  PluginGetters<typeof HeaderVisibilityPlugin> &
  PluginGetters<typeof CellPlugin> &
  PluginGetters<typeof DefaultPlugin> &
  PluginGetters<typeof MergePlugin> &
  PluginGetters<typeof BordersPlugin> &
  PluginGetters<typeof ChartPlugin> &
  PluginGetters<typeof ImagePlugin> &
  PluginGetters<typeof CarouselPlugin> &
  PluginGetters<typeof FigurePlugin> &
  RangeAdapterGetters &
  FormulasGetters &
  PluginGetters<typeof ConditionalFormatPlugin> &
  PluginGetters<typeof TablePlugin> &
  PluginGetters<typeof SettingsPlugin> &
  PluginGetters<typeof HeaderGroupingPlugin> &
  PluginGetters<typeof DataValidationPlugin> &
  PluginGetters<typeof NamedRangesPlugin> &
  PluginGetters<typeof PivotCorePlugin>;

/**
 * The getters that can be used in the rendering-related stores and helpers. The SheetView and Selection getters should
 * not be used in those, they should use the values in the GridRenderingContext instead.
 */
export type RenderingGetters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  PluginGetters<typeof HistoryPlugin> &
  PluginGetters<typeof ClipboardPlugin> &
  PluginGetters<typeof EvaluationPlugin> &
  PluginGetters<typeof EvaluationChartPlugin> &
  PluginGetters<typeof EvaluationConditionalFormatPlugin> &
  PluginGetters<typeof HeaderVisibilityUIPlugin> &
  PluginGetters<typeof CustomColorsPlugin> &
  PluginGetters<typeof CollaborativePlugin> &
  PluginGetters<typeof SortPlugin> &
  PluginGetters<typeof UIOptionsPlugin> &
  PluginGetters<typeof SheetUIPlugin> &
  PluginGetters<typeof FilterEvaluationPlugin> &
  PluginGetters<typeof FingerprintPlugin> &
  PluginGetters<typeof SubtotalEvaluationPlugin> &
  PluginGetters<typeof HeaderSizeUIPlugin> &
  PluginGetters<typeof EvaluationDataValidationPlugin> &
  PluginGetters<typeof HeaderPositionsUIPlugin> &
  PluginGetters<typeof TableStylePlugin> &
  PluginGetters<typeof CellComputedStylePlugin> &
  PluginGetters<typeof DynamicTablesPlugin> &
  PluginGetters<typeof PivotUIPlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof GeoFeaturePlugin> &
  PluginGetters<typeof PivotPresencePlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof CellIconPlugin> &
  PluginGetters<typeof DynamicTranslate> &
  PluginGetters<typeof FormulaTrackerPlugin> &
  PluginGetters<typeof LockSheetPlugin> &
  PluginGetters<typeof CarouselUIPlugin> &
  PluginGetters<typeof ColorThemeUIPlugin> &
  PluginGetters<typeof ChartUIPlugin> &
  PluginGetters<typeof FigureUIPlugin>;

export type Getters = RenderingGetters & PluginGetters<typeof GridSelectionPlugin>;

export interface ViewportsGetters {
  getColDimensions: Getters["getColDimensions"];
  getRowDimensions: Getters["getRowDimensions"];
  findLastVisibleColRowIndex: Getters["findLastVisibleColRowIndex"];
  isReadonly: Getters["isReadonly"];
  getMainCellPosition: Getters["getMainCellPosition"];
  getNextVisibleCellPosition: Getters["getNextVisibleCellPosition"];
  getColRowOffset: Getters["getColRowOffset"];
  isColHidden: Getters["isColHidden"];
  isRowHidden: Getters["isRowHidden"];
  isHeaderHidden: Getters["isHeaderHidden"];
  getNumberHeaders: Getters["getNumberHeaders"];
  getHeaderSize: Getters["getHeaderSize"];
  getColSize: Getters["getColSize"];
  getRowSize: Getters["getRowSize"];
  getSheetIds: Getters["getSheetIds"];
  tryGetSheet: Getters["tryGetSheet"];
  getNumberCols: Getters["getNumberCols"];
  getNumberRows: Getters["getNumberRows"];
  getSheetZone: Getters["getSheetZone"];
  getFigures: Getters["getFigures"];
}
