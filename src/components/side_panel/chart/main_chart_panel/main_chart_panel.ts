import { Pixel, UID } from "@odoo/o-spreadsheet-engine";
import { Component, useEffect, useRef } from "@odoo/owl";
import { ChartSidePanel, chartSidePanelComponentRegistry } from "..";
import { Store, useLocalStore } from "../../../../store_engine";
import { ChartDefinition, ChartType, Ref, SpreadsheetChildEnv } from "../../../../types/index";
import { Section } from "../../components/section/section";
import { ChartTypePicker } from "../chart_type_picker/chart_type_picker";
interface Props {
  onCloseSidePanel: () => void;
  chartId: UID;
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPanel";
  static components = { Section, ChartTypePicker };
  static props = { onCloseSidePanel: Function, chartId: String };
  private panelContentRef!: Ref<HTMLElement>;
  private scrollPositions: Record<"configuration" | "design", Pixel> = {
    configuration: 0,
    design: 0,
  };

  store!: Store<MainChartPanelStore>;

  get chartId() {
    return this.props.chartId;
  }

  setup(): void {
    this.store = useLocalStore(MainChartPanelStore);
    this.panelContentRef = useRef("panelContent");

    useEffect(
      () => {
        const el = this.panelContentRef.el as HTMLElement;
        const activePanel = this.store.panel;
        if (el) {
          el.scrollTop = this.scrollPositions[activePanel];
        }
      },
      () => [this.store.panel]
    );
  }

  switchPanel(panel: "configuration" | "design") {
    const el = this.panelContentRef.el as HTMLElement;
    if (el) {
      this.scrollPositions[this.store.panel] = el.scrollTop;
    }
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
