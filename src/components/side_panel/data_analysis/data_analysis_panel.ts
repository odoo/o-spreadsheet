import { props, proxy, types } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = props({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.env, definition, ev);
  }
}
