import { Session } from "../collaborative/session";
import { LocalHistory } from "../history/local_history";
import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { FigurePlugin } from "../plugins/core/figures";
import { FiltersPlugin } from "../plugins/core/filters";
import { HeaderSizePlugin } from "../plugins/core/header_size";
import { HeaderVisibilityPlugin } from "../plugins/core/header_visibility";
import { MergePlugin } from "../plugins/core/merge";
import { RangeAdapter } from "../plugins/core/range";
import { SheetPlugin } from "../plugins/core/sheet";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { AutomaticSumPlugin } from "../plugins/ui/automatic_sum";
import { CellPopoverPlugin } from "../plugins/ui/cell_popovers";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { CustomColorsPlugin } from "../plugins/ui/custom_colors";
import { EditionPlugin } from "../plugins/ui/edition";
import { EvaluationPlugin } from "../plugins/ui/evaluation";
import { EvaluationChartPlugin } from "../plugins/ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui/evaluation_conditional_format";
import { FilterEvaluationPlugin } from "../plugins/ui/filter_evaluation";
import { FindAndReplacePlugin } from "../plugins/ui/find_and_replace";
import { HeaderVisibilityUIPlugin } from "../plugins/ui/header_visibility_ui";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { RendererPlugin } from "../plugins/ui/renderer";
import { GridSelectionPlugin } from "../plugins/ui/selection";
import { SelectionInputsManagerPlugin } from "../plugins/ui/selection_inputs_manager";
import { SelectionMultiUserPlugin } from "../plugins/ui/selection_multiuser";
import { SheetViewPlugin } from "../plugins/ui/sheetview";
import { SortPlugin } from "../plugins/ui/sort";
import { UIOptionsPlugin } from "../plugins/ui/ui_options";
import { SheetUIPlugin } from "../plugins/ui/ui_sheet";
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
type FigureGetters = Pick<FigurePlugin, GetterNames<typeof FigurePlugin>>;
type RangeAdapterGetters = Pick<RangeAdapter, GetterNames<typeof RangeAdapter>>;
type ConditionalFormatGetters = Pick<
  ConditionalFormatPlugin,
  GetterNames<typeof ConditionalFormatPlugin>
>;
type LocalHistoryGetters = {
  canUndo: LocalHistory["canUndo"];
  canRedo: LocalHistory["canRedo"];
};
type FiltersGetters = Pick<FiltersPlugin, GetterNames<typeof FiltersPlugin>>;

export type CoreGetters = SheetGetters &
  HeaderSizeGetters &
  HeaderVisibilityGetters &
  CellGetters &
  MergeGetters &
  BordersGetters &
  ChartGetters &
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
type SelectionMultiUserGetters = Pick<
  SelectionMultiUserPlugin,
  GetterNames<typeof SelectionMultiUserPlugin>
>;
type SortGetters = Pick<SortPlugin, GetterNames<typeof SortPlugin>>;
type UIOptionsGetters = Pick<UIOptionsPlugin, GetterNames<typeof UIOptionsPlugin>>;
type SheetUIGetters = Pick<SheetUIPlugin, GetterNames<typeof SheetUIPlugin>>;
type ViewportGetters = Pick<SheetViewPlugin, GetterNames<typeof SheetViewPlugin>>;
type SessionGetters = {
  getClient: Session["getClient"];
  getConnectedClients: Session["getConnectedClients"];
  isFullySynchronized: Session["isFullySynchronized"];
};
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
  SessionGetters &
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
  SelectionMultiUserGetters &
  SortGetters &
  UIOptionsGetters &
  SheetUIGetters &
  ViewportGetters &
  CellPopoverPluginGetters &
  FilterEvaluationGetters &
  HeaderVisibilityIUIGetters;
