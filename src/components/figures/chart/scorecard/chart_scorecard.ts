import { Component, useEffect, useRef } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";

interface Props {
  figureId: UID;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  private canvas = useRef("chartContainer");

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figureId) as ScorecardChartRuntime;
  }

  setup() {
    useEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return [rect.width, rect.height, this.runtime, this.canvas.el];
    });
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const config = getScorecardConfiguration(canvas.getBoundingClientRect(), this.runtime);
    drawScoreChart(config, canvas);
  }
}

ScorecardChart.props = {
  figureId: String,
};
