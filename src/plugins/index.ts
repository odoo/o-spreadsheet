import { BasePlugin } from "../base_plugin";
import { Registry } from "../registry";
import { AutofillPlugin } from "./autofill";
import { ChartPlugin } from "./chart";
import { ClipboardPlugin } from "./clipboard";
import { ConditionalFormatPlugin } from "./conditional_format";
import { CorePlugin } from "./core";
import { EditionPlugin } from "./edition";
import { EvaluationPlugin } from "./evaluation";
import { FigurePlugin } from "./figures";
import { FormattingPlugin } from "./formatting";
import { HighlightPlugin } from "./highlight";
import { MergePlugin } from "./merge";
import { RendererPlugin } from "./renderer";
import { SelectionPlugin } from "./selection";
import { SelectionInputPlugin } from "./selection_inputs";

export const pluginRegistry = new Registry<typeof BasePlugin>()
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("highlight", HighlightPlugin)
  .add("selectionInput", SelectionInputPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin);
