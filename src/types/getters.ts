import { TableStylePlugin } from "../plugins/core/table_style";
import { EvaluationPlugin } from "../plugins/ui_core_views/cell_evaluation/evaluation_plugin";
import { CellIconPlugin } from "../plugins/ui_core_views/cell_icon_plugin";
import { CustomColorsPlugin } from "../plugins/ui_core_views/custom_colors";
import { DynamicTablesPlugin } from "../plugins/ui_core_views/dynamic_tables";
import { EvaluationChartPlugin } from "../plugins/ui_core_views/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui_core_views/evaluation_conditional_format";
import { EvaluationDataValidationPlugin } from "../plugins/ui_core_views/evaluation_data_validation";
import { FilterEvaluationPlugin } from "../plugins/ui_core_views/filter_evaluation";
import { FingerprintPlugin } from "../plugins/ui_core_views/fingerprint";
import { FormulaTrackerPlugin } from "../plugins/ui_core_views/formula_tracker";
import { HeaderSizeUIPlugin } from "../plugins/ui_core_views/header_sizes_ui";
import { PivotPresencePlugin } from "../plugins/ui_core_views/pivot_presence_plugin";
import { PivotUIPlugin } from "../plugins/ui_core_views/pivot_ui";
import { CollaborativePlugin } from "../plugins/ui_feature/collaborative";
import { ColorThemeUIPlugin } from "../plugins/ui_feature/color_theme";
import { DynamicTranslate } from "../plugins/ui_feature/dynamic_translate";
import { GeoFeaturePlugin } from "../plugins/ui_feature/geo_features";
import { HistoryPlugin } from "../plugins/ui_feature/local_history";
import { SortPlugin } from "../plugins/ui_feature/sort";
import { SubtotalEvaluationPlugin } from "../plugins/ui_feature/subtotal_evaluation";
import { UIOptionsPlugin } from "../plugins/ui_feature/ui_options";
import { SheetUIPlugin } from "../plugins/ui_feature/ui_sheet";
import { CarouselUIPlugin } from "../plugins/ui_stateful/carousel_ui";
import { CellComputedStylePlugin } from "../plugins/ui_stateful/cell_computed_style";
import { ClipboardPlugin } from "../plugins/ui_stateful/clipboard";
import { FigureUIPlugin } from "../plugins/ui_stateful/figure";
import { HeaderPositionsUIPlugin } from "../plugins/ui_stateful/header_positions";
import { HeaderVisibilityUIPlugin } from "../plugins/ui_stateful/header_visibility_ui";
import { LockSheetPlugin } from "../plugins/ui_stateful/lock_sheet";
import { GridSelectionPlugin } from "../plugins/ui_stateful/selection";
import { TableComputedStylePlugin } from "../plugins/ui_stateful/table_computed_style";
import { CoreGetters, PluginGetters } from "./core_getters";
// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

/**
 * Getters available to formula evaluation. Restricted to core and core view
 * plugins so the evaluation layer cannot depend on any UIPlugin.
 */
export type EvaluationGetters = CoreGetters &
  PluginGetters<typeof CellIconPlugin> &
  PluginGetters<typeof CustomColorsPlugin> &
  PluginGetters<typeof DynamicTablesPlugin> &
  PluginGetters<typeof EvaluationChartPlugin> &
  PluginGetters<typeof EvaluationConditionalFormatPlugin> &
  PluginGetters<typeof EvaluationDataValidationPlugin> &
  PluginGetters<typeof EvaluationPlugin> &
  PluginGetters<typeof FilterEvaluationPlugin> &
  PluginGetters<typeof FingerprintPlugin> &
  PluginGetters<typeof FormulaTrackerPlugin> &
  PluginGetters<typeof HeaderSizeUIPlugin> &
  PluginGetters<typeof PivotPresencePlugin> &
  PluginGetters<typeof PivotUIPlugin>;

/**
 * The getters that can be used in the rendering-related stores and helpers. The SheetView and Selection getters should
 * not be used in those, they should use the values in the GridRenderingContext instead.
 */
export type RenderingGetters = {
  isReadonly: () => boolean;
  isDashboard: () => boolean;
} & CoreGetters &
  EvaluationGetters &
  PluginGetters<typeof HistoryPlugin> &
  PluginGetters<typeof ClipboardPlugin> &
  PluginGetters<typeof HeaderVisibilityUIPlugin> &
  PluginGetters<typeof CollaborativePlugin> &
  PluginGetters<typeof SortPlugin> &
  PluginGetters<typeof UIOptionsPlugin> &
  PluginGetters<typeof SheetUIPlugin> &
  PluginGetters<typeof SubtotalEvaluationPlugin> &
  PluginGetters<typeof HeaderPositionsUIPlugin> &
  PluginGetters<typeof TableStylePlugin> &
  PluginGetters<typeof CellComputedStylePlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof GeoFeaturePlugin> &
  PluginGetters<typeof TableComputedStylePlugin> &
  PluginGetters<typeof DynamicTranslate> &
  PluginGetters<typeof LockSheetPlugin> &
  PluginGetters<typeof CarouselUIPlugin> &
  PluginGetters<typeof ColorThemeUIPlugin> &
  PluginGetters<typeof FigureUIPlugin>;

export type Getters = RenderingGetters & PluginGetters<typeof GridSelectionPlugin>;
