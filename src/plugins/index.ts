import { Registry } from "../registry";
import { ClipboardPlugin } from "./ui/clipboard";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { CellPlugin } from "./core/cell";
import { EditionPlugin } from "./ui/edition";
import { EvaluationPlugin } from "./ui/evaluation";
import { FormattingPlugin } from "./core/formatting";
import { MergePlugin } from "./core/merge";
import { RendererPlugin } from "./ui/renderer";
import { SelectionPlugin } from "./ui/selection";
import { ChartPlugin } from "./core/chart";
import { AutofillPlugin } from "./ui/autofill";
import { HighlightPlugin } from "./ui/highlight";
import { SelectionInputPlugin } from "./ui/selection_inputs";
import { FigurePlugin } from "./core/figures";
import { SheetPlugin } from "./core/sheet";
import { EvaluationChartPlugin } from "./ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./ui/evaluation_conditional_format";
import { FindAndReplacePlugin } from "./ui/find_and_replace";
import { SheetUIPlugin } from "./ui/ui_sheet";
import { UIOptionsPlugin } from "./ui/ui_options";
import { CorePluginConstructor } from "./core_plugin";
import { UIPluginConstuctor } from "./ui_plugin";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("sheet", SheetPlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin);

export const uiPluginRegistry = new Registry<UIPluginConstuctor>()
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
  .add("find_and_replace", FindAndReplacePlugin);
