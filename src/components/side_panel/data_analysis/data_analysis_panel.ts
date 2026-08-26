import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { Store } from "../../../types/store_engine";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataAnalysisPanel extends SpreadsheetComponent {
  static template = "o-spreadsheet-DataAnalysisPanel";
  static components = {
    Section,
    ChartSuggestionPreview,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.env, definition, ev);
  }
}
