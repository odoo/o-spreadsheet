import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import Chart, { ChartConfiguration } from "chart.js";
import { chartComponentRegistry } from "../../../../registries/chart_types";
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

    onPatched(() => {
      const chartData = this.chartRuntime.chartJsConfig;
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
    });
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
  }
}

ChartJsComponent.props = {
  figure: Object,
};

chartComponentRegistry.add("line", ChartJsComponent);
chartComponentRegistry.add("bar", ChartJsComponent);
chartComponentRegistry.add("pie", ChartJsComponent);
chartComponentRegistry.add("gauge", ChartJsComponent);
