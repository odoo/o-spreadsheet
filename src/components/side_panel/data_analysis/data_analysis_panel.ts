import { types, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { statisticsRegistry } from "../../../registries/data_statistics_registry";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion/chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";
import { DateSection } from "./data_statistics/date_section";
import { GeneralStatsSection } from "./data_statistics/general_stats_section";
import { Occurencies } from "./data_statistics/occurencies";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
    Occurencies,
    GeneralStatsSection,
    DateSection,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.env, definition, ev);
  }

  get sortFunction() {
    switch (this.store.shape[0]) {
      case "categorical":
      case "label":
        return statisticsRegistry.get("categorical")?.sortItems;
      case "number":
      case "percentage":
        return statisticsRegistry.get("number")?.sortItems;
      default:
        return undefined;
    }
  }
}
