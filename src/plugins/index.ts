import { BasePlugin } from "../base_plugin";
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
import { AutofillPlugin } from "./autofill";
import { HighlightPlugin } from "./highlight";

export const pluginRegistry = new Registry<typeof BasePlugin>()
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("highlight", HighlightPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin);
