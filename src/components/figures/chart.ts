import * as owl from "@odoo/owl";
import { Component, hooks, tags } from "@odoo/owl";
import Chart from "chart.js";
import { MenuItemRegistry } from "../../registries/index";
import { _lt } from "../../translation";
import { Figure, SpreadsheetEnv } from "../../types";
import { LIST } from "../icons";
import { Menu, MenuState } from "../menu";
const { useState } = owl;

const { xml, css } = tags;
const { useRef } = hooks;

const TEMPLATE = xml/* xml */ `
<div class="o-chart-container">
  <div class="o-chart-menu" t-on-click="showMenu">${LIST}</div>
  <canvas t-ref="graphContainer"/>
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

    > canvas {
      background-color: white;
    }
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

export class ChartFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Menu };
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  canvas = useRef("graphContainer");
  private chart?: Chart;

  mounted() {
    this.createChart();
  }

  patched() {
    const figure = this.props.figure;
    const chartData = this.env.getters.getChartRuntime(figure.id);
    if (chartData) {
      if (chartData.data && chartData.data.datasets) {
        this.chart!.data = chartData.data;
        this.chart!.config.type = chartData.type;
        if (chartData.options?.title) {
          this.chart!.config.options!.title = chartData.options.title;
        }
      } else {
        this.chart!.data.datasets = undefined;
      }
      this.chart!.update({ duration: 0 });
    } else {
      this.chart && this.chart.destroy();
    }
  }

  private createChart() {
    const figure = this.props.figure;
    const chartData = this.env.getters.getChartRuntime(figure.id);
    if (chartData) {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      this.chart = new window.Chart(ctx, chartData);
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
    this.openContextMenu(ev.currentTarget as HTMLElement, registry);
  }

  private openContextMenu(target: HTMLElement, registry: MenuItemRegistry) {
    const x = target.offsetLeft;
    const y = target.offsetTop;
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = {
      x,
      y,
      height: 400,
      width: this.el!.clientWidth,
    };
  }
}
