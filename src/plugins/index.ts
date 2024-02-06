import { Registry } from "../registries/registry";
import {
  BordersPlugin,
  CellPlugin,
  ChartPlugin,
  ConditionalFormatPlugin,
  DataValidationPlugin,
  FigurePlugin,
  HeaderSizePlugin,
  HeaderVisibilityPlugin,
  ImagePlugin,
  MergePlugin,
  SheetPlugin,
  TablePlugin,
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
import { DynamicTablesPlugin } from "./ui_core_views/dynamic_tables";
import { HeaderSizeUIPlugin } from "./ui_core_views/header_sizes_ui";
import {
  AutofillPlugin,
  AutomaticSumPlugin,
  CollaborativePlugin,
  DataCleanupPlugin,
  FindAndReplacePlugin,
  FormatPlugin,
  HeaderVisibilityUIPlugin,
  SheetUIPlugin,
  SortPlugin,
  UIOptionsPlugin,
} from "./ui_feature";
import { HistoryPlugin } from "./ui_feature/local_history";
import { SplitToColumnsPlugin } from "./ui_feature/split_to_columns";
import { TableAutofillPlugin } from "./ui_feature/table_autofill";
import { TableStylePlugin } from "./ui_feature/table_style";
import { UIPluginConstructor } from "./ui_plugin";
import {
  ClipboardPlugin,
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
  .add("tables", TablePlugin)
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
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin)
  .add("sort", SortPlugin)
  .add("automatic_sum", AutomaticSumPlugin)
  .add("format", FormatPlugin)
  .add("split_to_columns", SplitToColumnsPlugin)
  .add("collaborative", CollaborativePlugin)
  .add("history", HistoryPlugin)
  .add("data_cleanup", DataCleanupPlugin)
  .add("table_autofill", TableAutofillPlugin);

// Plugins which have a state, but which should not be shared in collaborative
export const statefulUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("evaluation_filter", FilterEvaluationPlugin)
  .add("header_visibility_ui", HeaderVisibilityUIPlugin)
  .add("table_style", TableStylePlugin)
  .add("header_positions", HeaderPositionsUIPlugin)
  .add("viewport", SheetViewPlugin)
  .add("clipboard", ClipboardPlugin);

// Plugins which have a derived state from core data
export const coreViewsPluginRegistry = new Registry<UIPluginConstructor>()
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("row_size", HeaderSizeUIPlugin)
  .add("data_validation_ui", EvaluationDataValidationPlugin)
  .add("dynamic_tables", DynamicTablesPlugin)
  .add("custom_colors", CustomColorsPlugin);
