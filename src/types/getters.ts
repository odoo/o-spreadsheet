import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { CellProtectionPlugin } from "../plugins/core/cell_protection";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { DataValidationPlugin } from "../plugins/core/data_validation";
import { FigurePlugin } from "../plugins/core/figures";
import { HeaderGroupingPlugin } from "../plugins/core/header_grouping";
import { HeaderSizePlugin } from "../plugins/core/header_size";
import { HeaderVisibilityPlugin } from "../plugins/core/header_visibility";
import { ImagePlugin } from "../plugins/core/image";
import { MergePlugin } from "../plugins/core/merge";
import { PivotCorePlugin } from "../plugins/core/pivot";
import { RangeAdapter } from "../plugins/core/range";
import { SettingsPlugin } from "../plugins/core/settings";
import { SheetPlugin } from "../plugins/core/sheet";
import { TableStylePlugin } from "../plugins/core/table_style";
import { TablePlugin } from "../plugins/core/tables";
import { EvaluationDataValidationPlugin } from "../plugins/ui_core_views";
import { EvaluationPlugin } from "../plugins/ui_core_views/cell_evaluation";
import { CustomColorsPlugin } from "../plugins/ui_core_views/custom_colors";
import { DynamicTablesPlugin } from "../plugins/ui_core_views/dynamic_tables";
import { EvaluationChartPlugin } from "../plugins/ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui_core_views/evaluation_conditional_format";
import { HeaderSizeUIPlugin } from "../plugins/ui_core_views/header_sizes_ui";
import { PivotUIPlugin } from "../plugins/ui_core_views/pivot_ui";
import { AutofillPlugin } from "../plugins/ui_feature/autofill";
import { AutomaticSumPlugin } from "../plugins/ui_feature/automatic_sum";
import { CellComputedStylePlugin } from "../plugins/ui_feature/cell_computed_style";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { HeaderVisibilityUIPlugin } from "../plugins/ui_feature/header_visibility_ui";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { SplitToColumnsPlugin } from "../plugins/ui_feature/split_to_columns";
import { TableComputedStylePlugin } from "../plugins/ui_feature/table_computed_style";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { FilterEvaluationPlugin } from "../plugins/ui_stateful/filter_evaluation";
import { HeaderPositionsUIPlugin } from "../plugins/ui_stateful/header_positions";
import { GridSelectionPlugin } from "../plugins/ui_stateful/selection";
import { SheetViewPlugin } from "../plugins/ui_stateful/sheetview";
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
type PluginGetters<Plugin extends { new (...args: unknown[]): any; getters: readonly string[] }> =
  Pick<InstanceType<Plugin>, GetterNames<Plugin>>;

type RangeAdapterGetters = Pick<RangeAdapter, GetterNames<typeof RangeAdapter>>;

export type CoreGetters = PluginGetters<typeof SheetPlugin> &
  PluginGetters<typeof HeaderSizePlugin> &
  PluginGetters<typeof HeaderVisibilityPlugin> &
  PluginGetters<typeof CellPlugin> &
  PluginGetters<typeof MergePlugin> &
  PluginGetters<typeof BordersPlugin> &
  PluginGetters<typeof ChartPlugin> &
  PluginGetters<typeof ImagePlugin> &
  PluginGetters<typeof FigurePlugin> &
  RangeAdapterGetters &
  PluginGetters<typeof ConditionalFormatPlugin> &
  PluginGetters<typeof TablePlugin> &
  PluginGetters<typeof SettingsPlugin> &
  PluginGetters<typeof HeaderGroupingPlugin> &
  PluginGetters<typeof DataValidationPlugin> &
  PluginGetters<typeof CellProtectionPlugin> &
  PluginGetters<typeof PivotCorePlugin>;

export type Getters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  PluginGetters<typeof AutofillPlugin> &
  PluginGetters<typeof AutomaticSumPlugin> &
  PluginGetters<typeof HistoryPlugin> &
  PluginGetters<typeof ClipboardPlugin> &
  PluginGetters<typeof EvaluationPlugin> &
  PluginGetters<typeof EvaluationChartPlugin> &
  PluginGetters<typeof EvaluationConditionalFormatPlugin> &
  PluginGetters<typeof HeaderVisibilityUIPlugin> &
  PluginGetters<typeof CustomColorsPlugin> &
  PluginGetters<typeof AutomaticSumPlugin> &
  PluginGetters<typeof GridSelectionPlugin> &
  PluginGetters<typeof CollaborativePlugin> &
  PluginGetters<typeof SortPlugin> &
  PluginGetters<typeof UIOptionsPlugin> &
  PluginGetters<typeof SheetUIPlugin> &
  PluginGetters<typeof SheetViewPlugin> &
  PluginGetters<typeof FilterEvaluationPlugin> &
  PluginGetters<typeof SplitToColumnsPlugin> &
  PluginGetters<typeof HeaderSizeUIPlugin> &
  PluginGetters<typeof EvaluationDataValidationPlugin> &
  PluginGetters<typeof HeaderPositionsUIPlugin> &
  PluginGetters<typeof TableStylePlugin> &
  PluginGetters<typeof CellComputedStylePlugin> &
  PluginGetters<typeof DynamicTablesPlugin> &
  PluginGetters<typeof PivotUIPlugin> &
  PluginGetters<typeof TableComputedStylePlugin>;
