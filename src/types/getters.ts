import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { FigurePlugin } from "../plugins/core/figures";
import { FiltersPlugin } from "../plugins/core/filters";
import { HeaderSizePlugin } from "../plugins/core/header_size";
import { HeaderVisibilityPlugin } from "../plugins/core/header_visibility";
import { ImagePlugin } from "../plugins/core/image";
import { MergePlugin } from "../plugins/core/merge";
import { RangeAdapter } from "../plugins/core/range";
import { SheetPlugin } from "../plugins/core/sheet";
import { CustomColorsPlugin } from "../plugins/ui_core_views/custom_colors";
import { EvaluationPlugin } from "../plugins/ui_core_views/evaluation";
import { EvaluationChartPlugin } from "../plugins/ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui_core_views/evaluation_conditional_format";
import { FilterEvaluationPlugin } from "../plugins/ui_core_views/filter_evaluation";
import { SheetViewPlugin } from "../plugins/ui_core_views/sheetview";
import { AutofillPlugin } from "../plugins/ui_feature/autofill";
import { AutomaticSumPlugin } from "../plugins/ui_feature/automatic_sum";
import { CellPopoverPlugin } from "../plugins/ui_feature/cell_popovers";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { FindAndReplacePlugin } from "../plugins/ui_feature/find_and_replace";
import { HeaderVisibilityUIPlugin } from "../plugins/ui_feature/header_visibility_ui";
import { HighlightPlugin } from "../plugins/ui_feature/highlight";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { RendererPlugin } from "../plugins/ui_feature/renderer";
import { SelectionInputsManagerPlugin } from "../plugins/ui_feature/selection_inputs_manager";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { EditionPlugin } from "../plugins/ui_stateful/edition";
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

type SheetGetters = Pick<SheetPlugin, GetterNames<typeof SheetPlugin>>;
type HeaderSizeGetters = Pick<HeaderSizePlugin, GetterNames<typeof HeaderSizePlugin>>;
type HeaderVisibilityGetters = Pick<
  HeaderVisibilityPlugin,
  GetterNames<typeof HeaderVisibilityPlugin>
>;
type CellGetters = Pick<CellPlugin, GetterNames<typeof CellPlugin>>;
type MergeGetters = Pick<MergePlugin, GetterNames<typeof MergePlugin>>;
type BordersGetters = Pick<BordersPlugin, GetterNames<typeof BordersPlugin>>;
type ChartGetters = Pick<ChartPlugin, GetterNames<typeof ChartPlugin>>;
type ImageGetters = Pick<ImagePlugin, GetterNames<typeof ImagePlugin>>;
type FigureGetters = Pick<FigurePlugin, GetterNames<typeof FigurePlugin>>;
type RangeAdapterGetters = Pick<RangeAdapter, GetterNames<typeof RangeAdapter>>;
type ConditionalFormatGetters = Pick<
  ConditionalFormatPlugin,
  GetterNames<typeof ConditionalFormatPlugin>
>;
type LocalHistoryGetters = Pick<HistoryPlugin, GetterNames<typeof HistoryPlugin>>;
type FiltersGetters = Pick<FiltersPlugin, GetterNames<typeof FiltersPlugin>>;

export type CoreGetters = SheetGetters &
  HeaderSizeGetters &
  HeaderVisibilityGetters &
  CellGetters &
  MergeGetters &
  BordersGetters &
  ChartGetters &
  ImageGetters &
  ConditionalFormatGetters &
  FigureGetters &
  RangeAdapterGetters &
  FiltersGetters;

type AutofillGetters = Pick<AutofillPlugin, GetterNames<typeof AutofillPlugin>>;
type AutomaticSumGetters = Pick<AutomaticSumPlugin, GetterNames<typeof AutomaticSumPlugin>>;
type ClipboardGetters = Pick<ClipboardPlugin, GetterNames<typeof ClipboardPlugin>>;
type EditionGetters = Pick<EditionPlugin, GetterNames<typeof EditionPlugin>>;
type EvaluationGetters = Pick<EvaluationPlugin, GetterNames<typeof EvaluationPlugin>>;
type EvaluationChartGetters = Pick<
  EvaluationChartPlugin,
  GetterNames<typeof EvaluationChartPlugin>
>;
type EvaluationConditionalFormatGetters = Pick<
  EvaluationConditionalFormatPlugin,
  GetterNames<typeof EvaluationConditionalFormatPlugin>
>;
type FindAndReplaceGetters = Pick<FindAndReplacePlugin, GetterNames<typeof FindAndReplacePlugin>>;
type HeaderVisibilityIUIGetters = Pick<
  HeaderVisibilityUIPlugin,
  GetterNames<typeof HeaderVisibilityUIPlugin>
>;
type HighlightGetters = Pick<HighlightPlugin, GetterNames<typeof HighlightPlugin>>;
type CustomColorsGetters = Pick<CustomColorsPlugin, GetterNames<typeof CustomColorsPlugin>>;
type RendererGetters = Pick<RendererPlugin, GetterNames<typeof RendererPlugin>>;
type SelectionGetters = Pick<GridSelectionPlugin, GetterNames<typeof GridSelectionPlugin>>;
type SelectionInputGetters = Pick<
  SelectionInputsManagerPlugin,
  GetterNames<typeof SelectionInputsManagerPlugin>
>;
type CollaborativeGetters = Pick<CollaborativePlugin, GetterNames<typeof CollaborativePlugin>>;
type SortGetters = Pick<SortPlugin, GetterNames<typeof SortPlugin>>;
type UIOptionsGetters = Pick<UIOptionsPlugin, GetterNames<typeof UIOptionsPlugin>>;
type SheetUIGetters = Pick<SheetUIPlugin, GetterNames<typeof SheetUIPlugin>>;
type ViewportGetters = Pick<SheetViewPlugin, GetterNames<typeof SheetViewPlugin>>;
type CellPopoverPluginGetters = Pick<CellPopoverPlugin, GetterNames<typeof CellPopoverPlugin>>;
type FilterEvaluationGetters = Pick<
  FilterEvaluationPlugin,
  GetterNames<typeof FilterEvaluationPlugin>
>;

export type Getters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & LocalHistoryGetters &
  CoreGetters &
  AutofillGetters &
  AutomaticSumGetters &
  ClipboardGetters &
  EditionGetters &
  EvaluationGetters &
  EvaluationChartGetters &
  EvaluationConditionalFormatGetters &
  FindAndReplaceGetters &
  HighlightGetters &
  CustomColorsGetters &
  RendererGetters &
  SelectionGetters &
  SelectionInputGetters &
  CollaborativeGetters &
  SortGetters &
  UIOptionsGetters &
  SheetUIGetters &
  ViewportGetters &
  CellPopoverPluginGetters &
  FilterEvaluationGetters &
  HeaderVisibilityIUIGetters;
