import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { ChartSidePanel, chartSidePanelComponentRegistry } from "..";
import { BACKGROUND_HEADER_COLOR } from "../../../../constants";
import { getChartDefinitionFromContextCreation, getChartTypes } from "../../../../helpers/charts";
import { ChartDefinition, ChartType, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { css } from "../../../helpers/css";

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

    .o-with-color-picker {
      position: relative;
    }
    .o-with-color-picker > span {
      border-bottom: 4px solid;
    }
  }
`;

interface Props {
  figureId: UID;
  onCloseSidePanel: () => void;
}

interface State {
  panel: "configuration" | "design";
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPanel";

  private state!: State;

  get figureId(): UID {
    return this.props.figureId;
  }

  setup(): void {
    this.state = useState({
      panel: "configuration",
    });

    onWillUpdateProps((nextProps: Props) => {
      if (!this.env.model.getters.isChartDefined(nextProps.figureId)) {
        this.props.onCloseSidePanel();
        return;
      }
    });
  }

  updateChart<T extends ChartDefinition>(updateDefinition: Partial<T>) {
    const definition: T = {
      ...(this.getChartDefinition() as T),
      ...updateDefinition,
    };
    return this.env.model.dispatch("UPDATE_CHART", {
      definition,
      id: this.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  onTypeChange(type: ChartType) {
    const context = this.env.model.getters.getContextCreationChart(this.figureId);
    if (!context) {
      throw new Error("Chart not defined.");
    }
    const definition = getChartDefinitionFromContextCreation(context, type);
    this.env.model.dispatch("UPDATE_CHART", {
      definition,
      id: this.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  get chartPanel(): ChartSidePanel {
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

  private getChartDefinition(figureId: UID = this.figureId): ChartDefinition {
    return this.env.model.getters.getChartDefinition(figureId);
  }

  get chartTypes() {
    return getChartTypes();
  }

  activatePanel(panel: "configuration" | "design") {
    this.state.panel = panel;
  }
}
