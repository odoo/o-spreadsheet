import { types, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";
import { DataStatistics } from "./data_statistics";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
    DataStatistics,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get statSection() {
    return this.store.statSection || [];
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.env, definition, ev);
  }
}
