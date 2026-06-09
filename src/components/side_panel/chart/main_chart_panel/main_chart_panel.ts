import { props } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../../store_engine/store_hooks";
import { ChartDefinition, ChartType } from "../../../../types/chart/chart";
import { UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { types } from "../../../props_validation";
import { Section } from "../../components/section/section";
import { ChartSidePanel, chartSidePanelComponentRegistry } from "../chart_side_panel_registry";
import { ChartTypePicker } from "../chart_type_picker/chart_type_picker";
import { MainChartPanelStore } from "./main_chart_panel_store";

export class ChartPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPanel";
  static components = { Section, ChartTypePicker };

  protected props = props({
    onCloseSidePanel: types.function(),
    chartId: types.UID(),
  });

  store!: Store<MainChartPanelStore>;

  get chartId() {
    return this.props.chartId;
  }

  setup(): void {
    this.store = useLocalStore(MainChartPanelStore);
  }

  switchPanel(panel: "configuration" | "design") {
    this.store.activatePanel(panel);
  }

  updateChart<T extends ChartDefinition>(chartId: UID, updateDefinition: Partial<T>) {
    const figureId = this.env.model.getters.getFigureIdFromChartId(chartId);
    if (chartId !== this.chartId) {
      return;
    }
    const definition: T = {
      ...(this.getChartDefinition(this.chartId) as T),
      ...updateDefinition,
    };
    return this.env.model.dispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId,
      sheetId: this.env.model.getters.getFigureSheetId(figureId)!,
    });
  }

  canUpdateChart<T extends ChartDefinition>(chartId: UID, updateDefinition: Partial<T>) {
    const figureId = this.env.model.getters.getFigureIdFromChartId(chartId);
    if (chartId !== this.chartId || !this.env.model.getters.isChartDefined(chartId)) {
      return;
    }
    const definition: T = {
      ...(this.getChartDefinition(this.chartId) as T),
      ...updateDefinition,
    };
    return this.env.model.canDispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId,
      sheetId: this.env.model.getters.getFigureSheetId(figureId)!,
    });
  }

  onTypeChange(type: ChartType) {
    if (!this.chartId) {
      return;
    }
    this.store.changeChartType(this.chartId, type);
  }

  get chartPanel(): ChartSidePanel {
    if (!this.chartId) {
      throw new Error("Chart not defined.");
    }
    const type = this.env.model.getters.getChartType(this.chartId);
    if (!type) {
      throw new Error("Chart not defined.");
    }
    const chartPanel = chartSidePanelComponentRegistry.get(type);
    if (!chartPanel) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return chartPanel;
  }

  private getChartDefinition(chartId: UID): ChartDefinition {
    return this.env.model.getters.getChartDefinition(chartId);
  }
}
