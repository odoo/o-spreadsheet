import { Component } from "@odoo/owl";
import { ChartSidePanel, chartSidePanelComponentRegistry } from "..";
import { BACKGROUND_HEADER_COLOR } from "../../../../constants";
import { Store, useLocalStore } from "../../../../store_engine";
import { ChartDefinition, ChartType, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { css } from "../../../helpers/css";
import { Section } from "../../components/section/section";
import { ChartTypePicker } from "../chart_type_picker/chart_type_picker";
import { MainChartPanelStore } from "./main_chart_panel_store";

css/* scss */ `
  .o-chart {
    .o-panel {
      display: flex;
      .o-panel-element {
        flex: 1 0 auto;
        padding: 8px 0px;
        text-align: center;
        cursor: pointer;
        border-right: 1px solid darkgray;
        &.inactive {
          background-color: ${BACKGROUND_HEADER_COLOR};
          border-bottom: 1px solid darkgray;
        }
        .fa {
          margin-right: 4px;
        }
      }
      .o-panel-element:last-child {
        border-right: none;
      }
    }
  }
`;

interface Props {
  onCloseSidePanel: () => void;
  figureId: UID;
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPanel";
  static components = { Section, ChartTypePicker };
  static props = { onCloseSidePanel: Function, figureId: String };

  store!: Store<MainChartPanelStore>;

  get figureId() {
    return this.props.figureId;
  }

  setup(): void {
    this.store = useLocalStore(MainChartPanelStore);
  }

  updateChart<T extends ChartDefinition>(figureId: UID, updateDefinition: Partial<T>) {
    if (figureId !== this.figureId) {
      return;
    }
    const definition: T = {
      ...(this.getChartDefinition(this.figureId) as T),
      ...updateDefinition,
    };
    return this.env.model.dispatch("UPDATE_CHART", {
      definition,
      id: figureId,
      sheetId: this.env.model.getters.getFigureSheetId(figureId)!,
    });
  }

  canUpdateChart<T extends ChartDefinition>(figureId: UID, updateDefinition: Partial<T>) {
    if (figureId !== this.figureId || !this.env.model.getters.isChartDefined(figureId)) {
      return;
    }
    const definition: T = {
      ...(this.getChartDefinition(this.figureId) as T),
      ...updateDefinition,
    };
    return this.env.model.canDispatch("UPDATE_CHART", {
      definition,
      id: figureId,
      sheetId: this.env.model.getters.getFigureSheetId(figureId)!,
    });
  }

  onTypeChange(type: ChartType) {
    if (!this.figureId) {
      return;
    }
    this.store.changeChartType(this.figureId, type);
  }

  get chartPanel(): ChartSidePanel {
    if (!this.figureId) {
      throw new Error("Chart not defined.");
    }
    const type = this.env.model.getters.getChartType(this.figureId);
    if (!type) {
      throw new Error("Chart not defined.");
    }
    const chartPanel = chartSidePanelComponentRegistry.get(type);
    if (!chartPanel) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return chartPanel;
  }

  private getChartDefinition(figureId: UID): ChartDefinition {
    return this.env.model.getters.getChartDefinition(figureId);
  }
}
