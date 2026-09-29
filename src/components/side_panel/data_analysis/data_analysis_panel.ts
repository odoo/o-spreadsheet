import { types, useProps } from "@odoo/owl";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { Store } from "../../../types/store_engine";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { OSComponent } from "../../os_component";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion/chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";
import { DateSection } from "./data_statistics/date_section";
import { GeneralStatsSection } from "./data_statistics/general_stats_section";
import { Occurrences } from "./data_statistics/occurrences_statistics";
import { GroupedSums } from "./data_statistics/grouped_sum";

export class DataAnalysisPanel extends OSComponent {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
    Occurrences,
    GroupedSums,
    GeneralStatsSection,
    DateSection,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.spEnv, definition, ev);
  }
}
