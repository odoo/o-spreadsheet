import * as owl from "@odoo/owl";
import { Component, hooks, tags } from "@odoo/owl";
import Chart, { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../constants";
import { MenuItemRegistry } from "../../registries/index";
import { _lt } from "../../translation";
import { Figure, SpreadsheetEnv } from "../../types";
import { useAbsolutePosition } from "../helpers/position_hook";
import { LIST } from "../icons";
import { Menu, MenuState } from "../menu";
const { useState } = owl;

const { xml, css } = tags;
const { useRef } = hooks;

const TEMPLATE = xml/* xml */ `
<div class="o-chart-container">
  <div class="o-chart-menu" t-on-click="showMenu">${LIST}</div>
  <canvas t-att-style="canvasStyle" t-ref="graphContainer"/>
  <Menu t-if="menuState.isOpen"
    position="menuState.position"
    menuItems="menuState.menuItems"
    t-on-close="menuState.isOpen=false"/>
</div>`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-chart-container {
    width: 100%;
    height: 100%;
    position: relative;

    .o-chart-menu {
      right: 0px;
      display: none;
      position: absolute;
      padding: 5px;
      cursor: pointer;
    }
  }
  .o-figure.active:focus {
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
}

interface State {
  background: string;
}

export class ChartFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Menu };
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  canvas = useRef("graphContainer");
  private chart?: Chart;
  private state: State = { background: BACKGROUND_CHART_COLOR };
  private position = useAbsolutePosition();

  get canvasStyle() {
    return `background-color: ${this.state.background}`;
  }

  mounted() {
    const figure = this.props.figure;
    const chartData = this.env.getters.getChartRuntime(figure.id);
    if (chartData) {
      this.createChart(chartData);
    }
  }

  patched() {
    const figure = this.props.figure;
    const chartData = this.env.getters.getChartRuntime(figure.id);
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
    const def = this.env.getters.getChartDefinition(figure.id);
    if (def) {
      this.state.background = def.background;
    }
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
    const def = this.env.getters.getChartDefinition(this.props.figure.id);
    if (def) {
      this.state.background = def.background;
    }
  }

  showMenu(ev: MouseEvent) {
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
        this.env.dispatch("DELETE_FIGURE", {
          sheetId: this.env.getters.getActiveSheetId(),
          id: this.props.figure.id,
        });
        if (this.props.sidePanelIsOpen) {
          this.env.toggleSidePanel("ChartPanel", { figure: this.props.figure });
        }
        this.trigger("figure-deleted");
      },
    });
    registry.add("refresh", {
      name: _lt("Refresh"),
      sequence: 11,
      action: () => {
        this.env.dispatch("REFRESH_CHART", {
          id: this.props.figure.id,
        });
      },
    });
    this.openContextMenu(ev.currentTarget as HTMLElement, registry);
  }

  private openContextMenu(target: HTMLElement, registry: MenuItemRegistry) {
    const x = target.offsetLeft;
    const y = target.offsetTop;
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = {
      x: this.position.x + x - MENU_WIDTH,
      y: this.position.y + y,
    };
  }
}
