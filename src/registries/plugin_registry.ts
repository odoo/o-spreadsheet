import { Registry } from "../registry";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { ConditionalFormatPlugin } from "../plugins/base/conditional_format";
import { CorePlugin } from "../plugins/base/core";
import { EditionPlugin } from "../plugins/ui/edition";
import { EvaluationPlugin } from "../plugins/base/evaluation";
import { FormattingPlugin } from "../plugins/base/formatting";
import { MergePlugin } from "../plugins/base/merge";
import { RendererPlugin } from "../plugins/ui/renderer";
import { SelectionPlugin } from "../plugins/ui/selection";
import { ChartPlugin } from "../plugins/base/chart";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { SelectionInputPlugin } from "../plugins/ui/selection_inputs";
import { FigurePlugin } from "../plugins/base/figures";
import { UIPlugin } from "../plugins/ui/ui_plugin";
import { BasePlugin } from "../plugins/base/base_plugin";
import { MultiUserPlugin } from "../plugins/ui/multiuser";

export const uiPluginRegistry = new Registry<typeof UIPlugin>()
  .add("multiuser", MultiUserPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("selection", SelectionPlugin)
  .add("edition", EditionPlugin)
  .add("highlight", HighlightPlugin)
  .add("selectionInput", SelectionInputPlugin)
  .add("gridrenderer", RendererPlugin)
  .add("autofill", AutofillPlugin);

export const basePluginRegistry = new Registry<typeof BasePlugin>()
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("conditionalformatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin);
