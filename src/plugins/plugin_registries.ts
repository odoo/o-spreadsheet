import { Registry } from "../registries/registry";
import { BordersPlugin } from "./core/borders";
import { CarouselPlugin } from "./core/carousel";
import { CellPlugin } from "./core/cell";
import { ChartPlugin } from "./core/chart";
import { ConditionalFormatPlugin } from "./core/conditional_format";
import { DataValidationPlugin } from "./core/data_validation";
import { DefaultPlugin } from "./core/default";
import { FigurePlugin } from "./core/figures";
import { HeaderGroupingPlugin } from "./core/header_grouping";
import { HeaderSizePlugin } from "./core/header_size";
import { HeaderVisibilityPlugin } from "./core/header_visibility";
import { ImagePlugin } from "./core/image";
import { MergePlugin } from "./core/merge";
import { NamedRangesPlugin } from "./core/named_range";
import { PivotCorePlugin } from "./core/pivot";
import { SettingsPlugin } from "./core/settings";
import { SheetPlugin } from "./core/sheet";
import { SpreadsheetPivotCorePlugin } from "./core/spreadsheet_pivot";
import { TableStylePlugin } from "./core/table_style";
import { TablePlugin } from "./core/tables";
import { CorePluginConstructor } from "./core_plugin";
import { CellEvaluationPlugin } from "./evaluation/cell_evaluation/cell_evaluation_plugin";
import { CustomColorsPlugin } from "./evaluation/custom_colors";
import { DynamicTablesPlugin } from "./evaluation/dynamic_tables";
import { DynamicTranslate } from "./evaluation/dynamic_translate";
import { EvaluationChartPlugin } from "./evaluation/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "./evaluation/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "./evaluation/evaluation_data_validation";
import { FingerprintPlugin } from "./evaluation/fingerprint";
import { FormulaTrackerPlugin } from "./evaluation/formula_tracker";
import { GeoLoaderEvaluation } from "./evaluation/geo_loader";
import { HeaderSizeUIPlugin } from "./evaluation/header_sizes_ui";
import { PivotPresencePlugin } from "./evaluation/pivot_presence_plugin";
import { PivotUIPlugin } from "./evaluation/pivot_ui";
import { EvaluationPluginConstructor } from "./evaluation_plugin";
import { ChartUIPlugin } from "./ui_feature/chart_ui";
import { CollaborativePlugin } from "./ui_feature/collaborative";
import { ColorThemeUIPlugin } from "./ui_feature/color_theme";
import { DataValidationInsertionPlugin } from "./ui_feature/datavalidation_insertion";
import { FormatPlugin } from "./ui_feature/format";
import { GeoFeaturePlugin } from "./ui_feature/geo_features";
import { InsertPivotPlugin } from "./ui_feature/insert_pivot";
import { HistoryPlugin } from "./ui_feature/local_history";
import { LockSheetPlugin } from "./ui_feature/lock_sheet";
import { SortPlugin } from "./ui_feature/sort";
import { SubtotalEvaluationPlugin } from "./ui_feature/subtotal_evaluation";
import { UIOptionsPlugin } from "./ui_feature/ui_options";
import { SheetUIPlugin } from "./ui_feature/ui_sheet";
import { UIPluginConstructor } from "./ui_plugin";
import { CarouselUIPlugin } from "./ui_stateful/carousel_ui";
import { CellComputedStylePlugin } from "./ui_stateful/cell_computed_style";
import { CellIconPlugin } from "./ui_stateful/cell_icon_plugin";
import { ClipboardPlugin } from "./ui_stateful/clipboard";
import { FigureUIPlugin } from "./ui_stateful/figure";
import { FilterEvaluationPlugin } from "./ui_stateful/filter_evaluation";
import { HeaderPositionsUIPlugin } from "./ui_stateful/header_positions";
import { HeaderVisibilityUIPlugin } from "./ui_stateful/header_visibility_ui";
import { GridSelectionPlugin } from "./ui_stateful/selection";
import { TableComputedStylePlugin } from "./ui_stateful/table_computed_style";

export const corePluginRegistry = new Registry<CorePluginConstructor>()
  .add("settings", SettingsPlugin)
  .add("sheet", SheetPlugin)
  .add("header grouping", HeaderGroupingPlugin)
  .add("header visibility", HeaderVisibilityPlugin)
  .add("tables", TablePlugin)
  .add("dataValidation", DataValidationPlugin)
  .add("cell", CellPlugin)
  .add("default", DefaultPlugin)
  .add("merge", MergePlugin)
  .add("headerSize", HeaderSizePlugin)
  .add("borders", BordersPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin)
  .add("carousel", CarouselPlugin)
  .add("image", ImagePlugin)
  .add("named_ranges", NamedRangesPlugin)
  .add("pivot_core", PivotCorePlugin)
  .add("spreadsheet_pivot_core", SpreadsheetPivotCorePlugin)
  .add("tableStyle", TableStylePlugin);

// Plugins which handle a specific feature, without handling any core commands
export const featurePluginRegistry = new Registry<UIPluginConstructor>()
  .add("ui_sheet", SheetUIPlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("sort", SortPlugin)
  .add("format", FormatPlugin)
  .add("insert_pivot", InsertPivotPlugin)
  .add("subtotal_evaluation", SubtotalEvaluationPlugin)
  .add("collaborative", CollaborativePlugin)
  .add("history", HistoryPlugin)
  .add("datavalidation_insert", DataValidationInsertionPlugin)
  .add("geo_features", GeoFeaturePlugin)
  .add("color_theme", ColorThemeUIPlugin)
  .add("lock_sheet", LockSheetPlugin)
  .add("chart_ui", ChartUIPlugin);

// Plugins which have a state, but which should not be shared in collaborative
export const statefulUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("selection", GridSelectionPlugin)
  .add("evaluation_filter", FilterEvaluationPlugin)
  .add("header_visibility_ui", HeaderVisibilityUIPlugin)
  .add("cell_computed_style", CellComputedStylePlugin)
  .add("table_computed_style", TableComputedStylePlugin)
  .add("header_positions", HeaderPositionsUIPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("carousel_ui", CarouselUIPlugin)
  .add("cell_icon", CellIconPlugin)
  .add("figure_ui", FigureUIPlugin);

// Plugins which have a derived state from core data
export const evaluationPluginRegistry = new Registry<EvaluationPluginConstructor>()
  .add("evaluation", CellEvaluationPlugin)
  .add("evaluation_chart", EvaluationChartPlugin)
  .add("fingerprints", FingerprintPlugin)
  .add("evaluation_cf", EvaluationConditionalFormatPlugin)
  .add("row_size", HeaderSizeUIPlugin)
  .add("data_validation_ui", EvaluationDataValidationPlugin)
  .add("dynamic_tables", DynamicTablesPlugin)
  .add("custom_colors", CustomColorsPlugin)
  .add("pivot_ui", PivotUIPlugin)
  .add("pivot_presence", PivotPresencePlugin)
  .add("dynamic_translate", DynamicTranslate)
  .add("geo_loader", GeoLoaderEvaluation)
  .add("formula_tracker", FormulaTrackerPlugin);

// Plugins which are UI plugins but on which evaluation plugins depend on
export const evaluationUIPluginRegistry = new Registry<UIPluginConstructor>()
  .add("header_visibility_ui", HeaderVisibilityUIPlugin)
  .add("filter_evaluation", FilterEvaluationPlugin)
  .add("ui_sheet", SheetUIPlugin)
  .add("color_theme", ColorThemeUIPlugin)
  .add("cell_computed_style", CellComputedStylePlugin)
  .add("ui_options", UIOptionsPlugin)
  .add("selection", GridSelectionPlugin);
