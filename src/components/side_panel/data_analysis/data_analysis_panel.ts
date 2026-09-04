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

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = useProps({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
    SidePanelCollapsible,
  };

  store!: Store<DataAnalysisStore>;

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    startChartDragAndDrop(this.env, definition, ev);
  }

  get statSectionComponent() {
    const numberOfColumns = this.store.shape.length;
    if (numberOfColumns === 1) {
      switch (this.store.shape[0]) {
        case "categorical":
        case "label":
          return statisticsRegistry.get("categorical")?.Body;
        case "boolean":
          return statisticsRegistry.get("boolean")?.Body;
        case "date":
          return statisticsRegistry.get("date")?.Body;
        case "number":
        case "percentage":
          return statisticsRegistry.get("number")?.Body;
        default:
          return undefined;
      }
    }
    return undefined;
  }

  get componentProps() {
    const numberOfColumns = this.store.shape.length;
    if (numberOfColumns === 1) {
      switch (this.store.shape[0]) {
        case "categorical":
        case "label":
          return { statSections: this.store.statSections };
        case "date":
          return { statSections: this.store.statSections };
        case "boolean":
        case "number":
        case "percentage":
          return { section: this.store.statSections?.[0] };
        default:
          return {};
      }
    }
    return {};
  }
}
