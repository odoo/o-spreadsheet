import { Registry } from "../registry";
import { BordersPlugin } from "./core/borders";
import { CarouselPlugin } from "./core/carousel";
import { CellPlugin } from "./core/cell";
import { ChartPlugin } from "./core/chart";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { DataValidationPlugin } from "./core/data_validation";
import { FigurePlugin } from "./core/figures";
import { HeaderGroupingPlugin } from "./core/header_grouping";
import { HeaderSizePlugin } from "./core/header_size";
import { HeaderVisibilityPlugin } from "./core/header_visibility";
import { ImagePlugin } from "./core/image";
import { MergePlugin } from "./core/merge";
import { PivotCorePlugin } from "./core/pivot";
import { SettingsPlugin } from "./core/settings";
import { SheetPlugin } from "./core/sheet";
import { SpreadsheetPivotCorePlugin } from "./core/spreadsheet_pivot";
import { StylePlugin } from "./core/style";
import { TableStylePlugin } from "./core/table_style";
import { TablePlugin } from "./core/tables";
import { CorePluginConstructor } from "./core_plugin";
import { CoreViewPluginConstructor } from "./core_view_plugin";
import { EvaluationPlugin } from "./ui_core_views/cell_evaluation";
import { CellIconPlugin } from "./ui_core_views/cell_icon_plugin";
import { CustomColorsPlugin } from "./ui_core_views/custom_colors";
import { DynamicTablesPlugin } from "./ui_core_views/dynamic_tables";
import { EvaluationChartPlugin } from "./ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./ui_core_views/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "./ui_core_views/evaluation_data_validation";
import { HeaderSizeUIPlugin } from "./ui_core_views/header_sizes_ui";
import { PivotUIPlugin } from "./ui_core_views/pivot_ui";
import { AutofillPlugin } from "./ui_feature/autofill";
import { AutomaticSumPlugin } from "./ui_feature/automatic_sum";
import { CellComputedStylePlugin } from "./ui_feature/cell_computed_style";
import { CheckboxTogglePlugin } from "./ui_feature/checkbox_toggle";
import { CollaborativePlugin } from "./ui_feature/collaborative";
import { DataValidationInsertionPlugin } from "./ui_feature/datavalidation_insertion";
import { DynamicTranslate } from "./ui_feature/dynamic_translate";
import { FormatPlugin } from "./ui_feature/format";
import { GeoFeaturePlugin } from "./ui_feature/geo_features";
import { HeaderVisibilityUIPlugin } from "./ui_feature/header_visibility_ui";
import { InsertPivotPlugin } from "./ui_feature/insert_pivot";
import { HistoryPlugin } from "./ui_feature/local_history";
import { PivotPresencePlugin } from "./ui_feature/pivot_presence_plugin";
import { SortPlugin } from "./ui_feature/sort";
import { SplitToColumnsPlugin } from "./ui_feature/split_to_columns";
import { SubtotalEvaluationPlugin } from "./ui_feature/subtotal_evaluation";
import { TableAutofillPlugin } from "./ui_feature/table_autofill";
import { TableComputedStylePlugin } from "./ui_feature/table_computed_style";
import { TableResizeUI } from "./ui_feature/table_resize_ui";
import { UIOptionsPlugin } from "./ui_feature/ui_options";
import { SheetUIPlugin } from "./ui_feature/ui_sheet";
import { UIPluginConstructor } from "./ui_plugin";
import { CarouselUIPlugin } from "./ui_stateful/carousel_ui";
import { ClipboardPlugin } from "./ui_stateful/clipboard";
import { FilterEvaluationPlugin } from "./ui_stateful/filter_evaluation";
import { HeaderPositionsUIPlugin } from "./ui_stateful/header_positions";
import { HoveredCellPlugin } from "./ui_stateful/hovered_cell_plugin";
import { GridSelectionPlugin } from "./ui_stateful/selection";
import { SheetViewPlugin } from "./ui_stateful/sheetview";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("settings", SettingsPlugin)
  .add("sheet", SheetPlugin)
  .add("header grouping", HeaderGroupingPlugin)
  .add("header visibility", HeaderVisibilityPlugin)
  .add("tables", TablePlugin)
  .add("dataValidation", DataValidationPlugin)
  .add("cell", CellPlugin)
  .add("merge", MergePlugin)
  .add("style", StylePlugin)
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
  .add("carousel_ui", CarouselUIPlugin)
  .add("hovered_cell", HoveredCellPlugin)
  .add("cell_icon", CellIconPlugin);

// Plugins which have a derived state from core data
export const coreViewsPluginRegistry = new Registry<CoreViewPluginConstructor>()
  .add("evaluation", EvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("row_size", HeaderSizeUIPlugin)
  .add("data_validation_ui", EvaluationDataValidationPlugin)
  .add("dynamic_tables", DynamicTablesPlugin)
  .add("custom_colors", CustomColorsPlugin)
  .add("pivot_ui", PivotUIPlugin);
