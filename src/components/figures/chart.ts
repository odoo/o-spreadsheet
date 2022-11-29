import { Component, hooks, tags } from "@odoo/owl";
import Chart from "chart.js";
import { ChartDefinition, Figure, SpreadsheetEnv } from "../../types";

const { xml, css } = tags;
const { useRef } = hooks;

const TEMPLATE = xml/* xml */ `
<div class="o-chart-container">
    <canvas t-ref="graphContainer" />
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
  }
`;

interface Props {
  figure: Figure<ChartDefinition>;
}

export class ChartFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = {};

  private canvas = useRef("graphContainer");
  private chart?: Chart;

  mounted() {
    this.createChart();
  }

  patched() {
    const figure = this.props.figure;
    const chartData = this.env.getters.getChartRuntime(figure.id);
    if (chartData) {
      if (chartData.data && chartData.data.datasets) {
        Object.assign(this.chart!.data!.datasets!, chartData.data.datasets);
        Object.assign(this.chart!.data.labels!, chartData.data.labels);
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
    const charData = this.env.getters.getChartRuntime(figure.id);
    if (charData) {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      this.chart = new window.Chart(ctx, charData);
    }
  }
}
