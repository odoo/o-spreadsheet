import { useProps } from "@odoo/owl";
import { provideAndUsePlugin } from "../../../helpers/owl3_helpers";
import { ChartDefinition } from "../../../types/chart/chart";
import { useChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion/chart_suggestion_preview";
import { DataAnalysisPlugin } from "./data_analysis_store";
import { DateSection } from "./data_statistics/date_section";
import { GeneralStatsSection } from "./data_statistics/general_stats_section";
import { OccurrencesStatistics } from "./data_statistics/occurrences_statistics";

export class DataAnalysisPanel extends OSComponent {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
    OccurrencesStatistics,
    GeneralStatsSection,
    DateSection,
  };

  dataAnalysisPlugin = provideAndUsePlugin(DataAnalysisPlugin);

  private chartDnd = useChartDragAndDrop();

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: PointerEvent) {
    if (ev.button !== 0) {
      return;
    }
    this.chartDnd.startChartDragAndDrop(ev, definition);
  }
}
