import { PluginConstuctor } from "../base_plugin";
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
import { FindAndReplacePlugin } from "./ui/find_and_replace";
import { SheetUIPlugin } from "./ui/ui_sheet";
import { UIOptionsPlugin } from "./ui/ui_options";

export const pluginRegistry = new Registry<PluginConstuctor>()
  .add("sheet", SheetPlugin)
  .add("cell", CellPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("ui_sheet", SheetUIPlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("selection", SelectionPlugin)
  .add("edition", EditionPlugin)
  .add("highlight", HighlightPlugin)
  .add("selectionInput", SelectionInputPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin);
