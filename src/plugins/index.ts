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
import { ArtifactPlugin } from "./artifact";
import { AutofillPlugin } from "./autofill";

export const pluginRegistry = new Registry<typeof BasePlugin>()
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("chart", ArtifactPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin);
