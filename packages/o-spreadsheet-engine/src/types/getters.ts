import { CoreGetters, PluginGetters } from "../index";
import { TableStylePlugin } from "../plugins/core/table_style";
import { EvaluationPlugin } from "../plugins/ui_core_views/cell_evaluation";
import { CellIconPlugin } from "../plugins/ui_core_views/cell_icon_plugin";
import { CustomColorsPlugin } from "../plugins/ui_core_views/custom_colors";
import { DynamicTablesPlugin } from "../plugins/ui_core_views/dynamic_tables";
import { EvaluationChartPlugin } from "../plugins/ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui_core_views/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "../plugins/ui_core_views/evaluation_data_validation";
import { FormulaTrackerPlugin } from "../plugins/ui_core_views/formula_tracker";
import { HeaderSizeUIPlugin } from "../plugins/ui_core_views/header_sizes_ui";
import { PivotUIPlugin } from "../plugins/ui_core_views/pivot_ui";
import { AutofillPlugin } from "../plugins/ui_feature/autofill";
import { AutomaticSumPlugin } from "../plugins/ui_feature/automatic_sum";
import { CellComputedStylePlugin } from "../plugins/ui_feature/cell_computed_style";
import { CheckboxTogglePlugin } from "../plugins/ui_feature/checkbox_toggle";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { DynamicTranslate } from "../plugins/ui_feature/dynamic_translate";
import { GeoFeaturePlugin } from "../plugins/ui_feature/geo_features";
import { HeaderVisibilityUIPlugin } from "../plugins/ui_feature/header_visibility_ui";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { PivotPresencePlugin } from "../plugins/ui_feature/pivot_presence_plugin";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { SplitToColumnsPlugin } from "../plugins/ui_feature/split_to_columns";
import { SubtotalEvaluationPlugin } from "../plugins/ui_feature/subtotal_evaluation";
import { TableComputedStylePlugin } from "../plugins/ui_feature/table_computed_style";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { CarouselUIPlugin } from "../plugins/ui_stateful/carousel_ui";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { FilterEvaluationPlugin } from "../plugins/ui_stateful/filter_evaluation";
import { HeaderPositionsUIPlugin } from "../plugins/ui_stateful/header_positions";
import { GridSelectionPlugin } from "../plugins/ui_stateful/selection";
import { SheetViewPlugin } from "../plugins/ui_stateful/sheetview";
// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

export type CustomGetters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  PluginGetters<typeof AutofillPlugin> &
  PluginGetters<typeof AutomaticSumPlugin> &
  PluginGetters<typeof HistoryPlugin> &
  PluginGetters<typeof ClipboardPlugin> &
  PluginGetters<typeof EvaluationPlugin> &
  PluginGetters<typeof EvaluationChartPlugin> &
  PluginGetters<typeof EvaluationConditionalFormatPlugin> &
  PluginGetters<typeof HeaderVisibilityUIPlugin> &
  PluginGetters<typeof CustomColorsPlugin> &
  PluginGetters<typeof AutomaticSumPlugin> &
  PluginGetters<typeof CollaborativePlugin> &
  PluginGetters<typeof SortPlugin> &
  PluginGetters<typeof UIOptionsPlugin> &
  PluginGetters<typeof SheetUIPlugin> &
  PluginGetters<typeof FilterEvaluationPlugin> &
  PluginGetters<typeof SplitToColumnsPlugin> &
  PluginGetters<typeof SubtotalEvaluationPlugin> &
  PluginGetters<typeof HeaderSizeUIPlugin> &
  PluginGetters<typeof EvaluationDataValidationPlugin> &
  PluginGetters<typeof HeaderPositionsUIPlugin> &
  PluginGetters<typeof TableStylePlugin> &
  PluginGetters<typeof CellComputedStylePlugin> &
  PluginGetters<typeof DynamicTablesPlugin> &
  PluginGetters<typeof PivotUIPlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof GeoFeaturePlugin> &
  PluginGetters<typeof PivotPresencePlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof CheckboxTogglePlugin> &
  PluginGetters<typeof CellIconPlugin> &
  PluginGetters<typeof DynamicTranslate> &
  PluginGetters<typeof FormulaTrackerPlugin> &
  PluginGetters<typeof CarouselUIPlugin>;

export type Getters = CustomGetters &
  PluginGetters<typeof SheetViewPlugin> &
  PluginGetters<typeof GridSelectionPlugin>;
