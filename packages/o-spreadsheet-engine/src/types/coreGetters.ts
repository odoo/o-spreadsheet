import { CarouselPlugin } from "../../../../src/plugins/core/carousel";
import { HeaderGroupingPlugin } from "../../../../src/plugins/core/header_grouping";
import { PivotCorePlugin } from "../../../../src/plugins/core/pivot";
import { SettingsPlugin } from "../../../../src/plugins/core/settings";

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
type RangeAdapterGetters = Pick<RangeAdapter, GetterNames<typeof RangeAdapter>>;
export type CoreGetters = PluginGetters<typeof SheetPlugin> &
  PluginGetters<typeof HeaderSizePlugin> &
  PluginGetters<typeof HeaderVisibilityPlugin> &
  PluginGetters<typeof CellPlugin> &
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
