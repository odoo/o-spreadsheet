import { BordersPlugin } from "../plugins/core/borders";
import { CarouselPlugin } from "../plugins/core/carousel";
import { CellPlugin } from "../plugins/core/cell";
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
import { RangeAdapterPlugin } from "../plugins/core/range";
import { SettingsPlugin } from "../plugins/core/settings";
import { SheetPlugin } from "../plugins/core/sheet";
import { StylePlugin } from "../plugins/core/style";
import { TablePlugin } from "../plugins/core/tables";

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
export type CoreGetters = PluginGetters<typeof SheetPlugin> &
  PluginGetters<typeof HeaderSizePlugin> &
  PluginGetters<typeof HeaderVisibilityPlugin> &
  PluginGetters<typeof CellPlugin> &
  PluginGetters<typeof StylePlugin> &
  PluginGetters<typeof MergePlugin> &
  PluginGetters<typeof BordersPlugin> &
  PluginGetters<typeof ChartPlugin> &
  PluginGetters<typeof ImagePlugin> &
  PluginGetters<typeof CarouselPlugin> &
  PluginGetters<typeof FigurePlugin> &
  RangeAdapterGetters &
  PluginGetters<typeof ConditionalFormatPlugin> &
  PluginGetters<typeof TablePlugin> &
  PluginGetters<typeof SettingsPlugin> &
  PluginGetters<typeof HeaderGroupingPlugin> &
  PluginGetters<typeof DataValidationPlugin> &
  PluginGetters<typeof PivotCorePlugin>;
