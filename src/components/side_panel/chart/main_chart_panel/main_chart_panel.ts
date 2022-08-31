import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { ChartSidePanel, chartSidePanelComponentRegistry } from "..";
import { BACKGROUND_HEADER_COLOR } from "../../../../constants";
import { getChartDefinitionFromContextCreation, getChartTypes } from "../../../../helpers/charts";
import { _lt } from "../../../../translation";
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
  onCloseSidePanel: () => void;
}

interface State {
  panel: "configuration" | "design";
  figureId: UID;
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPanel";

  private state!: State;
  private shouldUpdateChart: boolean = true;

  get figureId(): UID {
    return this.state.figureId;
  }

  setup(): void {
    const selectedFigureId = this.env.model.getters.getSelectedFigureId();
    if (!selectedFigureId) {
      throw new Error(_lt("Cannot open the chart side panel while no chart are selected"));
    }
    this.state = useState({
      panel: "configuration",
      figureId: selectedFigureId,
    });

    onWillUpdateProps(() => {
      const selectedFigureId = this.env.model.getters.getSelectedFigureId();
      if (selectedFigureId && selectedFigureId !== this.state.figureId) {
        this.state.figureId = selectedFigureId;
        this.shouldUpdateChart = false;
      } else {
        this.shouldUpdateChart = true;
      }
      if (!this.env.model.getters.isChartDefined(this.figureId)) {
        this.props.onCloseSidePanel();
        return;
      }
    });
  }

  updateChart<T extends ChartDefinition>(updateDefinition: Partial<T>) {
    if (!this.shouldUpdateChart) {
      return;
    }
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
