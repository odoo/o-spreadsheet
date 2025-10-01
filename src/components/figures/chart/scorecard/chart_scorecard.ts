import { ScorecardChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/scorecard_chart";
import { Component, useEffect, useRef } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { SpreadsheetChildEnv, UID } from "../../../../types";

interface Props {
  chartId: UID;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  static props = {
    chartId: String,
  };
  private canvas = useRef("chartContainer");

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get title(): string {
    const title = this.env.model.getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.env.model.getters.dynamicTranslate(title) : "";
  }

  setup() {
    useEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return [rect.width, rect.height, this.runtime, this.canvas.el, window.devicePixelRatio];
    });
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const config = getScorecardConfiguration(canvas.getBoundingClientRect(), this.runtime);
    drawScoreChart(config, canvas);
  }
}
