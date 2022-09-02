import { Registry } from "../registry";
import { BordersPlugin } from "./core/borders";
import { CellPlugin } from "./core/cell";
import { ChartPlugin } from "./core/chart";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { FigurePlugin } from "./core/figures";
import { HeaderSizePlugin } from "./core/header_size";
import { HeaderVisibilityPlugin } from "./core/header_visibility";
import { MergePlugin } from "./core/merge";
import { SheetPlugin } from "./core/sheet";
import { CorePluginConstructor } from "./core_plugin";
import { CustomColorsPlugin } from "./core_views_plugins/custom_colors";
import { EvaluationPlugin } from "./core_views_plugins/evaluation";
import { EvaluationChartPlugin } from "./core_views_plugins/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./core_views_plugins/evaluation_conditional_format";
import { ViewportPlugin } from "./core_views_plugins/viewport";
import { AutofillPlugin } from "./feature_plugins/autofill";
import { AutomaticSumPlugin } from "./feature_plugins/automatic_sum";
import { CellPopoverPlugin } from "./feature_plugins/cell_popovers";
import { FindAndReplacePlugin } from "./feature_plugins/find_and_replace";
import { FormatPlugin } from "./feature_plugins/format";
import { HighlightPlugin } from "./feature_plugins/highlight";
import { RendererPlugin } from "./feature_plugins/renderer";
import { SelectionInputsManagerPlugin } from "./feature_plugins/selection_inputs_manager";
import { SelectionMultiUserPlugin } from "./feature_plugins/selection_multiuser";
import { SortPlugin } from "./feature_plugins/sort";
import { UIOptionsPlugin } from "./feature_plugins/ui_options";
import { SheetUIPlugin } from "./feature_plugins/ui_sheet";
import { ClipboardPlugin } from "./stateful_ui_plugins/clipboard";
import { EditionPlugin } from "./stateful_ui_plugins/edition";
import { GridSelectionPlugin } from "./stateful_ui_plugins/selection";
import { UIPluginConstructor } from "./ui_plugin";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("sheet", SheetPlugin)
  .add("header visibility", HeaderVisibilityPlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("headerSize", HeaderSizePlugin)
  .add("borders", BordersPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin);

export const featurePluginRegistry = new Registry<UIPluginConstructor>()
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("selectionInputManager", SelectionInputsManagerPlugin)
  .add("highlight", HighlightPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin)
  .add("sort", SortPlugin)
  .add("automatic_sum", AutomaticSumPlugin)
  .add("format", FormatPlugin)
  .add("cell_popovers", CellPopoverPlugin)
  .add("selection_multiuser", SelectionMultiUserPlugin);

export const statefulUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("edition", EditionPlugin);

export const coreViewsPluginRegistry = new Registry<UIPluginConstructor>()
  .add("custom_colors", CustomColorsPlugin)
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("viewport", ViewportPlugin);
