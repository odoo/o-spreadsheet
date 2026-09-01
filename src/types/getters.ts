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
import { CellComputedStylePlugin } from "../plugins/evaluation/cell_computed_style";
import { CellEvaluationPlugin } from "../plugins/evaluation/cell_evaluation/cell_evaluation_plugin";
import { CustomColorsPlugin } from "../plugins/evaluation/custom_colors";
import { DynamicTablesPlugin } from "../plugins/evaluation/dynamic_tables";
import { DynamicTranslate } from "../plugins/evaluation/dynamic_translate";
import { EvaluationChartPlugin } from "../plugins/evaluation/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/evaluation/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "../plugins/evaluation/evaluation_data_validation";
import { FilterEvaluationPlugin } from "../plugins/evaluation/filter_evaluation";
import { FingerprintPlugin } from "../plugins/evaluation/fingerprint";
import { FormulaTrackerPlugin } from "../plugins/evaluation/formula_tracker";
import { GeoLoaderEvaluation } from "../plugins/evaluation/geo_loader";
import { HeaderSizeUIPlugin } from "../plugins/evaluation/header_sizes_ui";
import { HeaderVisibilityEvaluationPlugin } from "../plugins/evaluation/header_visibility_evaluation";
import { PivotPresencePlugin } from "../plugins/evaluation/pivot_presence_plugin";
import { PivotUIPlugin } from "../plugins/evaluation/pivot_ui";
import { SubtotalEvaluationPlugin } from "../plugins/evaluation/subtotal_evaluation";
import { TableComputedStylePlugin } from "../plugins/evaluation/table_computed_style";
import { ChartUIPlugin } from "../plugins/ui_feature/chart_ui";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { ColorThemeUIPlugin } from "../plugins/ui_feature/color_theme";
import { GeoFeaturePlugin } from "../plugins/ui_feature/geo_features";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { LockSheetPlugin } from "../plugins/ui_feature/lock_sheet";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { CarouselUIPlugin } from "../plugins/ui_stateful/carousel_ui";
import { CellIconPlugin } from "../plugins/ui_stateful/cell_icon_plugin";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { FigureUIPlugin } from "../plugins/ui_stateful/figure";
import { HeaderPositionsUIPlugin } from "../plugins/ui_stateful/header_positions";
import { GridSelectionPlugin } from "../plugins/ui_stateful/selection";
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
  PluginGetters<typeof TableStylePlugin> &
  PluginGetters<typeof TablePlugin> &
  PluginGetters<typeof SettingsPlugin> &
  PluginGetters<typeof HeaderGroupingPlugin> &
  PluginGetters<typeof DataValidationPlugin> &
  PluginGetters<typeof NamedRangesPlugin> &
  PluginGetters<typeof PivotCorePlugin>;

export type EvaluationGetters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  PluginGetters<typeof CellEvaluationPlugin> &
  PluginGetters<typeof EvaluationChartPlugin> &
  PluginGetters<typeof EvaluationConditionalFormatPlugin> &
  PluginGetters<typeof EvaluationDataValidationPlugin> &
  PluginGetters<typeof FilterEvaluationPlugin> &
  PluginGetters<typeof CustomColorsPlugin> &
  PluginGetters<typeof FingerprintPlugin> &
  PluginGetters<typeof HeaderSizeUIPlugin> &
  PluginGetters<typeof PivotUIPlugin> &
  PluginGetters<typeof DynamicTablesPlugin> &
  PluginGetters<typeof PivotPresencePlugin> &
  PluginGetters<typeof HeaderVisibilityEvaluationPlugin> &
  PluginGetters<typeof CellComputedStylePlugin> &
  PluginGetters<typeof SubtotalEvaluationPlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof GeoLoaderEvaluation> &
  PluginGetters<typeof DynamicTranslate> &
  PluginGetters<typeof FormulaTrackerPlugin>;
/**
 * The getters that can be used in the rendering-related stores and helpers. The SheetView and Selection getters should
 * not be used in those, they should use the values in the GridRenderingContext instead.
 */
export type RenderingGetters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  EvaluationGetters &
  PluginGetters<typeof HistoryPlugin> &
  PluginGetters<typeof ClipboardPlugin> &
  PluginGetters<typeof CollaborativePlugin> &
  PluginGetters<typeof SortPlugin> &
  PluginGetters<typeof UIOptionsPlugin> &
  PluginGetters<typeof SheetUIPlugin> &
  PluginGetters<typeof HeaderPositionsUIPlugin> &
  PluginGetters<typeof PivotUIPlugin> &
  PluginGetters<typeof CellIconPlugin> &
  PluginGetters<typeof GeoFeaturePlugin> &
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
