import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import Chart from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { Figure, GaugeChartConfiguration, SpreadsheetChildEnv } from "../../../types";

interface Props {
  figure: Figure;
}

export class GaugeChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BasicChart";

  canvas = useRef("graphContainer");
  private chart?: Chart;

  get background(): string {
    const def = this.env.model.getters.getGaugeChartDefinition(this.props.figure.id);
    return def ? def.background : BACKGROUND_CHART_COLOR;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  setup() {
    onMounted(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getGaugeChartRuntime(figure.id);
      if (chartData) {
        this.createChart(chartData);
      }
    });

    onPatched(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getGaugeChartRuntime(figure.id);
      if (chartData) {
        if (chartData.data && chartData.data.datasets) {
          this.chart!.data = chartData.data;
          if (chartData.options?.title) {
            this.chart!.config.options!.title = chartData.options.title;
          }
          if (chartData.options?.valueLabel) {
            (this.chart!.config.options! as any).valueLabel = chartData.options.valueLabel;
          }
        } else {
          this.chart!.data.datasets = undefined;
        }
        this.chart!.update({ duration: 0 });
      } else {
        this.chart && this.chart.destroy();
      }
    });
  }

  private createChart(chartData: GaugeChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
  }
}
