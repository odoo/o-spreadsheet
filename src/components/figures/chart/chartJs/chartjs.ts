import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { deepCopy } from "../../../../helpers";
import { getChartJSConstructor } from "../../../../helpers/figures/charts/chart_ui_common";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";

interface Props {
  figure: Figure;
}

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";
  static props = {
    figure: Object,
  };

  private canvas = useRef("graphContainer");
  private chart?: Chart;
  private currentRuntime!: ChartJSRuntime;

  private currentDevicePixelRatio = window.devicePixelRatio;

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  get chartRuntime(): ChartJSRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figure.id);
    if (!("chartJsConfig" in runtime)) {
      throw new Error("Unsupported chart runtime");
    }
    return runtime;
  }

  setup() {
    onMounted(() => {
      const runtime = this.chartRuntime;
      this.currentRuntime = runtime;
      // Note: chartJS modify the runtime in place, so it's important to give it a copy
      this.createChart(deepCopy(runtime.chartJsConfig));
    });
    onWillUnmount(() => this.chart?.destroy());
    useEffect(() => {
      const runtime = this.chartRuntime;
      if (runtime !== this.currentRuntime) {
        if (runtime.chartJsConfig.type !== this.currentRuntime.chartJsConfig.type) {
          this.chart?.destroy();
          this.createChart(deepCopy(runtime.chartJsConfig));
        } else {
          this.updateChartJs(deepCopy(runtime));
        }
        this.currentRuntime = runtime;
      } else if (this.currentDevicePixelRatio !== window.devicePixelRatio) {
        this.currentDevicePixelRatio = window.devicePixelRatio;
        this.updateChartJs(deepCopy(this.currentRuntime));
      }
    });
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const Chart = getChartJSConstructor();
    this.chart = new Chart(ctx, chartData as ChartConfiguration);
  }

  private updateChartJs(chartRuntime: ChartJSRuntime) {
    const chartData = chartRuntime.chartJsConfig;
    if (chartData.data && chartData.data.datasets) {
      this.chart!.data = chartData.data;
      if (chartData.options?.plugins?.title) {
        this.chart!.config.options!.plugins!.title = chartData.options.plugins.title;
      }
    } else {
      this.chart!.data.datasets = [];
    }
    this.chart!.config.options = chartData.options;
    this.chart!.update();
  }
}
