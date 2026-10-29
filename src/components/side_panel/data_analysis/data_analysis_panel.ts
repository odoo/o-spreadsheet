import { useProps } from "@odoo/owl";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { ChartDefinition } from "../../../types/chart/chart";
import { Store } from "../../../types/store_engine";
import { useChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion/chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";
import { AggregatedStatistics } from "./data_statistics/aggregated_statistics";
import { DateSection } from "./data_statistics/date_section";
import { GeneralStatsSection } from "./data_statistics/general_stats_section";

export class DataAnalysisPanel extends OSComponent {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
    AggregatedStatistics,
    GeneralStatsSection,
    DateSection,
  };

  store!: Store<DataAnalysisStore>;

  private chartDnd = useChartDragAndDrop();

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: PointerEvent) {
    if (ev.button !== 0) {
      return;
    }
    this.chartDnd.startChartDragAndDrop(ev, definition);
  }

  sectionTitle(): string {
    return this.store.shape.length === 2 ? _t("Sums") : _t("Occurrences");
  }
}
