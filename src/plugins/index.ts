import { Registry } from "../registry";
import { BordersPlugin } from "./core/borders";
import { CellPlugin } from "./core/cell";
import { ChartPlugin } from "./core/chart";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { FigurePlugin } from "./core/figures";
import { MergePlugin } from "./core/merge";
import { SheetPlugin } from "./core/sheet";
import { CorePluginConstructor } from "./core_plugin";
import { AutofillPlugin } from "./ui/autofill";
import { ClipboardPlugin } from "./ui/clipboard";
import { EditionPlugin } from "./ui/edition";
import { EvaluationPlugin } from "./ui/evaluation";
import { EvaluationChartPlugin } from "./ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./ui/evaluation_conditional_format";
import { FindAndReplacePlugin } from "./ui/find_and_replace";
import { HighlightPlugin } from "./ui/highlight";
import { RendererPlugin } from "./ui/renderer";
import { SelectionPlugin } from "./ui/selection";
import { SelectionInputPlugin } from "./ui/selection_inputs";
import { SortPlugin } from "./ui/sort";
import { UIOptionsPlugin } from "./ui/ui_options";
import { SheetUIPlugin } from "./ui/ui_sheet";
import { UIPluginConstructor } from "./ui_plugin";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("sheet", SheetPlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("borders", BordersPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin);

export const uiPluginRegistry = new Registry<UIPluginConstructor>()
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("selection", SelectionPlugin)
  .add("edition", EditionPlugin)
  .add("highlight", HighlightPlugin)
  .add("selectionInput", SelectionInputPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin)
  .add("sort", SortPlugin);
