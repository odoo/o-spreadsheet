import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import Chart, { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { Figure, SpreadsheetChildEnv } from "../../../types";

interface Props {
  figure: Figure;
}

interface State {
  background: string;
}

export class BasicChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BasicChart";

  canvas = useRef("graphContainer");
  private chart?: Chart;
  private state: State = { background: BACKGROUND_CHART_COLOR };

  get canvasStyle() {
    return `background-color: ${this.state.background}`;
  }

  setup() {
    onMounted(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getBasicChartRuntime(figure.id);
      if (chartData) {
        this.createChart(chartData);
      }
    });

    onPatched(() => {
      const figure = this.props.figure;
      const chartData = this.env.model.getters.getBasicChartRuntime(figure.id);
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
      const def = this.env.model.getters.getBasicChartDefinition(figure.id);
      if (def) {
        this.state.background = def.background;
      }
    });
  }

  private createChart(chartData: ChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);

    const def = this.env.model.getters.getBasicChartDefinition(this.props.figure.id);
    if (def) {
      this.state.background = def.background;
    }
  }
}
