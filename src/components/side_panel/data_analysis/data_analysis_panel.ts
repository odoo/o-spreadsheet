import { props, types } from "@odoo/owl";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { toZone } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = props({ onCloseSidePanel: types.function() });
  static components = {
    SidePanelCollapsible,
    Section,
    ChartSuggestionPreview,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get hasData(): boolean {
    return this.store.values.length > 0;
  }

  get chartSuggestions(): ChartSuggestion[] {
    return getChartSuggestions(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }
}
