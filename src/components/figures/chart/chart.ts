import { Component, onMounted, onPatched, useRef, useState } from "@odoo/owl";
import Chart, { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../../constants";
import { MenuItemRegistry } from "../../../registries/index";
import { _lt } from "../../../translation";
import { DOMCoordinates, Figure, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { useAbsolutePosition } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-chart-container {
    width: 100%;
    height: 100%;
    position: relative;

    .o-chart-menu {
      right: 0px;
      display: none;
      position: absolute;
      padding: 5px;
    }

    .o-chart-menu-item {
      cursor: pointer;
    }
  }
  .o-figure.active:focus,
  .o-figure:hover {
    .o-chart-container {
      .o-chart-menu {
        display: flex;
      }
    }
  }
`;

interface Props {
  figure: Figure;
  sidePanelIsOpen: boolean;
  onFigureDeleted: () => void;
}

interface State {
  background: string;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartFigure";
  static components = { Menu };
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  canvas = useRef("graphContainer");
  private chartContainerRef = useRef("chartContainer");
  private menuButtonRef = useRef("menuButton");
  private menuButtonPosition = useAbsolutePosition(this.menuButtonRef);
  private chart?: Chart;
  private state: State = { background: BACKGROUND_CHART_COLOR };
  private position = useAbsolutePosition(this.chartContainerRef);

  get canvasStyle() {
    return `background-color: ${this.state.background}`;
  }

  setup() {
    onMounted(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getChartRuntime(figure.id);
      if (chartData) {
        this.createChart(chartData);
      }
    });

    onPatched(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getChartRuntime(figure.id);
      if (chartData) {
        if (chartData.type !== this.chart!.config.type) {
          // Updating a chart type requires to update its options accordingly, if feasible at all.
          // Since we trust Chart.js to generate most of its options, it is safer to just start from scratch.
          // See https://www.chartjs.org/docs/latest/developers/updates.html
          // and https://stackoverflow.com/questions/36949343/chart-js-dynamic-changing-of-chart-type-line-to-bar-as-example
          this.chart && this.chart.destroy();
          this.createChart(chartData);
        } else if (chartData.data && chartData.data.datasets) {
          this.chart!.data = chartData.data;
          if (chartData.options?.title) {
            this.chart!.config.options!.title = chartData.options.title;
          }
        } else {
          this.chart!.data.datasets = undefined;
        }
        this.chart!.config.options!.legend = chartData.options?.legend;
        this.chart!.config.options!.scales = chartData.options?.scales;
        this.chart!.update({ duration: 0 });
      } else {
        this.chart && this.chart.destroy();
      }
      const def = this.env.model.getters.getChartDefinition(figure.id);
      if (def) {
        this.state.background = def.background;
      }
    });
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
    const def = this.env.model.getters.getChartDefinition(this.props.figure.id);
    if (def) {
      this.state.background = def.background;
    }
  }

  private getMenuItemRegistry(): MenuItemRegistry {
    const registry = new MenuItemRegistry();
    registry.add("edit", {
      name: _lt("Edit"),
      sequence: 1,
      action: () => this.env.openSidePanel("ChartPanel", { figure: this.props.figure }),
    });
    registry.add("delete", {
      name: _lt("Delete"),
      sequence: 10,
      action: () => {
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: this.props.figure.id,
        });
        if (this.props.sidePanelIsOpen) {
          this.env.toggleSidePanel("ChartPanel", { figure: this.props.figure });
        }
        this.props.onFigureDeleted();
      },
    });
    registry.add("refresh", {
      name: _lt("Refresh"),
      sequence: 11,
      action: () => {
        this.env.model.dispatch("REFRESH_CHART", {
          id: this.props.figure.id,
        });
      },
    });
    return registry;
  }

  onContextMenu(ev: MouseEvent) {
    const position = {
      x: this.position.x + ev.offsetX,
      y: this.position.y + ev.offsetY,
    };
    this.openContextMenu(position);
  }

  showMenu() {
    const position = {
      x: this.menuButtonPosition.x - MENU_WIDTH,
      y: this.menuButtonPosition.y,
    };
    this.openContextMenu(position);
  }

  private openContextMenu(position: DOMCoordinates) {
    const registry = this.getMenuItemRegistry();
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = position;
  }
}
