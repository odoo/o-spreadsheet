import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import Chart, { ChartConfiguration } from "chart.js";
import { deepEquals } from "../../../../helpers";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { GaugeChartOptions } from "../../../../types/chart/gauge_chart";

interface Props {
  figure: Figure;
}

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";

  private canvas = useRef("graphContainer");
  private chart?: Chart;

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
      this.createChart(runtime.chartJsConfig);
    });

    let previousRuntime = this.chartRuntime;
    onPatched(() => {
      const chartRuntime = this.chartRuntime;
      if (deepEquals(previousRuntime, chartRuntime)) {
        return;
      }
      this.updateChartJs(chartRuntime);
      previousRuntime = chartRuntime;
    });
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
  }

  private updateChartJs(chartRuntime: ChartJSRuntime) {
    const chartData = chartRuntime.chartJsConfig;
    if (chartData.data && chartData.data.datasets) {
      this.chart!.data = chartData.data;
      if (chartData.options?.title) {
        this.chart!.config.options!.title = chartData.options.title;
      }
      if (chartData.options && "valueLabel" in chartData.options) {
        if (chartData.options?.valueLabel) {
          (this.chart!.config.options! as GaugeChartOptions).valueLabel =
            chartData.options.valueLabel;
        }
      }
    } else {
      this.chart!.data.datasets = undefined;
    }
    this.chart!.config.options!.legend = chartData.options?.legend;
    this.chart!.config.options!.scales = chartData.options?.scales;
    this.chart!.update({ duration: 0 });
  }
}

ChartJsComponent.props = {
  figure: Object,
};
