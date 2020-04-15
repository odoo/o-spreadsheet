import { BasePlugin } from "../base_plugin";
import { Registry } from "../registry";
import { ClipboardPlugin } from "./clipboard";
import { ConditionalFormatPlugin } from "./conditional_format";
import { CorePlugin } from "./core";
import { EditionPlugin } from "./edition";
import { EntityPlugin } from "./entity";
import { EvaluationPlugin } from "./evaluation";
import { FormattingPlugin } from "./formatting";
import { MergePlugin } from "./merge";
import { RendererPlugin } from "./renderer";
import { SelectionPlugin } from "./selection";

export const pluginRegistry = new Registry<typeof BasePlugin>()
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("entities", EntityPlugin)
  .add("grid renderer", RendererPlugin);
