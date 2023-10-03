import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import { deepEquals } from "../../../../helpers";
import { ScorecardChartDrawer } from "../../../../helpers/figures/charts/scorecard_chart";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";

interface Props {
  figure: Figure;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  private canvas = useRef("graphContainer");

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
    const drawer = new ScorecardChartDrawer(
      this.props,
      this.canvas.el as HTMLCanvasElement,
      this.runtime
    );
    drawer.drawChart();
  }
}

ScorecardChart.props = {
  figure: Object,
};
