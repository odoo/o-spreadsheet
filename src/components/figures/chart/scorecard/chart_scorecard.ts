import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import { deepEquals } from "../../../../helpers";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { ScorecardChartDesigner } from "../../../../helpers/figures/charts/scorecard_chart_designer";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";

interface Props {
  figure: Figure;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  private canvas = useRef("chartContainer");

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figure.id) as ScorecardChartRuntime;
  }

  setup() {
    onMounted(() => {
      this.createChart();
    });

    let previousRuntime = this.runtime;
    let previousWidth = this.props.figure.width;
    let previousHeight = this.props.figure.height;
    onPatched(() => {
      const runtime = this.runtime;
      const figure = this.props.figure;
      if (
        deepEquals(runtime, previousRuntime) &&
        previousHeight === figure.height &&
        previousWidth === figure.width
      ) {
        return;
      }
      this.createChart();
      previousRuntime = runtime;
      previousHeight = figure.height;
      previousWidth = figure.width;
    });
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const design = new ScorecardChartDesigner(this.props.figure, this.runtime).computeDesign();
    drawScoreChart(design, canvas);
  }
}

ScorecardChart.props = {
  figure: Object,
};
