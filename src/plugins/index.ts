import { Registry } from "../registries/registry";
import {
  BordersPlugin,
  CellPlugin,
  ChartPlugin,
  ConditionalFormatPlugin,
  DataValidationPlugin,
  FigurePlugin,
  FiltersPlugin,
  HeaderSizePlugin,
  HeaderVisibilityPlugin,
  ImagePlugin,
  MergePlugin,
  SheetPlugin,
} from "./core";
import { HeaderGroupingPlugin } from "./core/header_grouping";
import { SettingsPlugin } from "./core/settings";
import { CorePluginConstructor } from "./core_plugin";
import {
  CustomColorsPlugin,
  EvaluationChartPlugin,
  EvaluationConditionalFormatPlugin,
  EvaluationDataValidationPlugin,
  EvaluationPlugin,
} from "./ui_core_views";
import { HeaderSizeUIPlugin } from "./ui_core_views/header_sizes_ui";
import {
  AutofillPlugin,
  AutomaticSumPlugin,
  CellPopoverPlugin,
  CollaborativePlugin,
  DataCleanupPlugin,
  FindAndReplacePlugin,
  FormatPlugin,
  HeaderVisibilityUIPlugin,
  HighlightPlugin,
  RendererPlugin,
  SheetUIPlugin,
  SortPlugin,
  UIOptionsPlugin,
} from "./ui_feature";
import { HistoryPlugin } from "./ui_feature/local_history";
import { SplitToColumnsPlugin } from "./ui_feature/split_to_columns";
import { UIPluginConstructor } from "./ui_plugin";
import {
  ClipboardPlugin,
  EditionPlugin,
  FilterEvaluationPlugin,
  GridSelectionPlugin,
  SheetViewPlugin,
} from "./ui_stateful";
import { HeaderPositionsUIPlugin } from "./ui_stateful/header_positions";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("settings", SettingsPlugin)
  .add("sheet", SheetPlugin)
  .add("header grouping", HeaderGroupingPlugin)
  .add("header visibility", HeaderVisibilityPlugin)
  .add("filters", FiltersPlugin)
  .add("dataValidation", DataValidationPlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("headerSize", HeaderSizePlugin)
  .add("borders", BordersPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin)
  .add("image", ImagePlugin);

// Plugins which handle a specific feature, without handling any core commands
export const featurePluginRegistry = new Registry<UIPluginConstructor>()
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("highlight", HighlightPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin)
  .add("sort", SortPlugin)
  .add("automatic_sum", AutomaticSumPlugin)
  .add("format", FormatPlugin)
  .add("split_to_columns", SplitToColumnsPlugin)
  .add("cell_popovers", CellPopoverPlugin)
  .add("collaborative", CollaborativePlugin)
  .add("history", HistoryPlugin)
  .add("data_cleanup", DataCleanupPlugin);

// Plugins which have a state, but which should not be shared in collaborative
export const statefulUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("evaluation_filter", FilterEvaluationPlugin)
  .add("header_visibility_ui", HeaderVisibilityUIPlugin)
  .add("header_positions", HeaderPositionsUIPlugin)
  .add("viewport", SheetViewPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("edition", EditionPlugin);

// Plugins which have a derived state from core data
export const coreViewsPluginRegistry = new Registry<UIPluginConstructor>()
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("row_size", HeaderSizeUIPlugin)
  .add("custom_colors", CustomColorsPlugin)
  .add("data_validation_ui", EvaluationDataValidationPlugin);
