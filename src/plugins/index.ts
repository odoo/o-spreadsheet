import { CarouselPlugin } from "@odoo/o-spreadsheet-engine/plugins/core/carousel";
import { HeaderGroupingPlugin } from "@odoo/o-spreadsheet-engine/plugins/core/header_grouping";
import { PivotCorePlugin } from "@odoo/o-spreadsheet-engine/plugins/core/pivot";
import { SettingsPlugin } from "@odoo/o-spreadsheet-engine/plugins/core/settings";
import { SpreadsheetPivotCorePlugin } from "@odoo/o-spreadsheet-engine/plugins/core/spreadsheet_pivot";
import { TableStylePlugin } from "@odoo/o-spreadsheet-engine/plugins/core/table_style";
import { CorePluginConstructor } from "@odoo/o-spreadsheet-engine/plugins/core_plugin";
import { CoreViewPluginConstructor } from "@odoo/o-spreadsheet-engine/plugins/core_view_plugin";
import { CellIconPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/cell_icon_plugin";
import { DynamicTablesPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/dynamic_tables";
import { HeaderSizeUIPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/header_sizes_ui";
import { PivotUIPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/pivot_ui";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
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
import {
  CustomColorsPlugin,
  EvaluationChartPlugin,
  EvaluationConditionalFormatPlugin,
  EvaluationDataValidationPlugin,
  EvaluationPlugin,
} from "./ui_core_views";
import {
  AutofillPlugin,
  AutomaticSumPlugin,
  CollaborativePlugin,
  DataCleanupPlugin,
  FormatPlugin,
  GeoFeaturePlugin,
  HeaderVisibilityUIPlugin,
  InsertPivotPlugin,
  SheetUIPlugin,
  SortPlugin,
  UIOptionsPlugin,
} from "./ui_feature";
import { CellComputedStylePlugin } from "./ui_feature/cell_computed_style";
import { CheckboxTogglePlugin } from "./ui_feature/checkbox_toggle";
import { DataValidationInsertionPlugin } from "./ui_feature/datavalidation_insertion";
import { DynamicTranslate } from "./ui_feature/dynamic_translate";
import { HistoryPlugin } from "./ui_feature/local_history";
import { PivotPresencePlugin } from "./ui_feature/pivot_presence_plugin";
import { SplitToColumnsPlugin } from "./ui_feature/split_to_columns";
import { SubtotalEvaluationPlugin } from "./ui_feature/subtotal_evaluation";
import { TableAutofillPlugin } from "./ui_feature/table_autofill";
import { TableComputedStylePlugin } from "./ui_feature/table_computed_style";
import { TableResizeUI } from "./ui_feature/table_resize_ui";
import { UIPluginConstructor } from "./ui_plugin";
import {
  ClipboardPlugin,
  FilterEvaluationPlugin,
  GridSelectionPlugin,
  SheetViewPlugin,
} from "./ui_stateful";
import { CarouselUIPlugin } from "./ui_stateful/carousel_ui";
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
  .add("carousel", CarouselPlugin)
  .add("image", ImagePlugin)
  .add("pivot_core", PivotCorePlugin)
  .add("spreadsheet_pivot_core", SpreadsheetPivotCorePlugin)
  .add("tableStyle", TableStylePlugin);

// Plugins which handle a specific feature, without handling any core commands
export const featurePluginRegistry = new Registry<UIPluginConstructor>()
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("autofill", AutofillPlugin)
  .add("sort", SortPlugin)
  .add("automatic_sum", AutomaticSumPlugin)
  .add("format", FormatPlugin)
  .add("insert_pivot", InsertPivotPlugin)
  .add("pivot_presence", PivotPresencePlugin)
  .add("split_to_columns", SplitToColumnsPlugin)
  .add("subtotal_evaluation", SubtotalEvaluationPlugin)
  .add("collaborative", CollaborativePlugin)
  .add("history", HistoryPlugin)
  .add("data_cleanup", DataCleanupPlugin)
  .add("table_autofill", TableAutofillPlugin)
  .add("table_ui_resize", TableResizeUI)
  .add("datavalidation_insert", DataValidationInsertionPlugin)
  .add("checkbox_toggle", CheckboxTogglePlugin)
  .add("dynamic_translate", DynamicTranslate)
  .add("geo_features", GeoFeaturePlugin);

// Plugins which have a state, but which should not be shared in collaborative
export const statefulUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("evaluation_filter", FilterEvaluationPlugin)
  .add("header_visibility_ui", HeaderVisibilityUIPlugin)
  .add("cell_computed_style", CellComputedStylePlugin)
  .add("table_computed_style", TableComputedStylePlugin)
  .add("header_positions", HeaderPositionsUIPlugin)
  .add("viewport", SheetViewPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("carousel_ui", CarouselUIPlugin);

// Plugins which have a derived state from core data
export const coreViewsPluginRegistry = new Registry<CoreViewPluginConstructor>()
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("row_size", HeaderSizeUIPlugin)
  .add("data_validation_ui", EvaluationDataValidationPlugin)
  .add("dynamic_tables", DynamicTablesPlugin)
  .add("custom_colors", CustomColorsPlugin)
  .add("pivot_ui", PivotUIPlugin)
  .add("cell_icon", CellIconPlugin);
