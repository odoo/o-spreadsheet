import { PluginConstuctor } from "../base_plugin";
import { Registry } from "../registry";
import { ClipboardPlugin } from "./clipboard";
import { ConditionalFormatPlugin } from "./conditional_format";
import { CorePlugin } from "./core";
import { EditionPlugin } from "./edition";
import { EvaluationPlugin } from "./evaluation";
import { FormattingPlugin } from "./formatting";
import { MergePlugin } from "./merge";
import { RendererPlugin } from "./renderer";
import { SelectionPlugin } from "./selection";
import { ChartPlugin } from "./chart";
import { AutofillPlugin } from "./autofill";
import { HighlightPlugin } from "./highlight";
import { SelectionInputPlugin } from "./selection_inputs";
import { FigurePlugin } from "./figures";

export const pluginRegistry = new Registry<PluginConstuctor>()
  .add("core", CorePlugin)
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
  .add("autofill", AutofillPlugin);
