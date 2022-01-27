import { Session } from "../collaborative/session";
import { LocalHistory } from "../history/local_history";
import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { FigurePlugin } from "../plugins/core/figures";
import { MergePlugin } from "../plugins/core/merge";
import { RangeAdapter } from "../plugins/core/range";
import { SheetPlugin } from "../plugins/core/sheet";
import { SortPlugin } from "../plugins/core/sort";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { AutomaticSumPlugin } from "../plugins/ui/automatic_sum";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { EditionPlugin } from "../plugins/ui/edition";
import { EvaluationPlugin } from "../plugins/ui/evaluation";
import { EvaluationChartPlugin } from "../plugins/ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui/evaluation_conditional_format";
import { FindAndReplacePlugin } from "../plugins/ui/find_and_replace";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { RendererPlugin } from "../plugins/ui/renderer";
import { SelectionPlugin } from "../plugins/ui/selection";
import { SelectionInputPlugin } from "../plugins/ui/selection_inputs";
import { SelectionMultiUserPlugin } from "../plugins/ui/selection_multiuser";
import { UIOptionsPlugin } from "../plugins/ui/ui_options";
import { SheetUIPlugin } from "../plugins/ui/ui_sheet";
import { ViewportPlugin } from "../plugins/ui/viewport";
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

export type CoreGetters = { isReadonly: () => boolean } & LocalHistoryGetters &
  SheetGetters &
  CellGetters &
  MergeGetters &
  BordersGetters &
  ChartGetters &
  ConditionalFormatGetters &
  FigureGetters &
  RangeAdapterGetters;

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
type HighlightGetters = Pick<HighlightPlugin, GetterNames<typeof HighlightPlugin>>;
type RendererGetters = Pick<RendererPlugin, GetterNames<typeof RendererPlugin>>;
type SelectionGetters = Pick<SelectionPlugin, GetterNames<typeof SelectionPlugin>>;
type SelectionInputGetters = Pick<SelectionInputPlugin, GetterNames<typeof SelectionInputPlugin>>;
type SelectionMultiUserGetters = Pick<
  SelectionMultiUserPlugin,
  GetterNames<typeof SelectionMultiUserPlugin>
>;
type SortGetters = Pick<SortPlugin, GetterNames<typeof SortPlugin>>;
type UIOptionsGetters = Pick<UIOptionsPlugin, GetterNames<typeof UIOptionsPlugin>>;
type SheetUIGetters = Pick<SheetUIPlugin, GetterNames<typeof SheetUIPlugin>>;
type ViewportGetters = Pick<ViewportPlugin, GetterNames<typeof ViewportPlugin>>;
type SessionGetters = {
  getClient: Session["getClient"];
  getConnectedClients: Session["getConnectedClients"];
  isFullySynchronized: Session["isFullySynchronized"];
};

export type Getters = CoreGetters &
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
  RendererGetters &
  SelectionGetters &
  SelectionInputGetters &
  SelectionMultiUserGetters &
  SortGetters &
  UIOptionsGetters &
  SheetUIGetters &
  ViewportGetters;
