import { Registry } from "../registry";
import { BordersPlugin } from "./core/borders";
import { CellPlugin } from "./core/cell";
import { ChartPlugin } from "./core/chart";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { FigurePlugin } from "./core/figures";
import { HeaderSizePlugin } from "./core/header_size";
import { MergePlugin } from "./core/merge";
import { SheetPlugin } from "./core/sheet";
import { CorePluginConstructor } from "./core_plugin";
import { AutofillPlugin } from "./ui/autofill";
import { AutomaticSumPlugin } from "./ui/automatic_sum";
import { ClipboardPlugin } from "./ui/clipboard";
import { EditionPlugin } from "./ui/edition";
import { EvaluationPlugin } from "./ui/evaluation";
import { EvaluationChartPlugin } from "./ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./ui/evaluation_conditional_format";
import { FindAndReplacePlugin } from "./ui/find_and_replace";
import { FormatPlugin } from "./ui/format";
import { HighlightPlugin } from "./ui/highlight";
import { RendererPlugin } from "./ui/renderer";
import { GridSelectionPlugin } from "./ui/selection";
import { SelectionInputsManagerPlugin } from "./ui/selection_inputs_manager";
import { SelectionMultiUserPlugin } from "./ui/selection_multiuser";
import { SortPlugin } from "./ui/sort";
import { UIOptionsPlugin } from "./ui/ui_options";
import { SheetUIPlugin } from "./ui/ui_sheet";
import { ViewportPlugin } from "./ui/viewport";
import { UIPluginConstructor } from "./ui_plugin";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("sheet", SheetPlugin)
  .add("headerSize", HeaderSizePlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("borders", BordersPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin);

export const uiPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("edition", EditionPlugin)
  .add("selectionInputManager", SelectionInputsManagerPlugin)
  .add("highlight", HighlightPlugin)
  .add("viewport", ViewportPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin)
  .add("sort", SortPlugin)
  .add("automatic_sum", AutomaticSumPlugin)
  .add("format", FormatPlugin)
  .add("selection_multiuser", SelectionMultiUserPlugin);
