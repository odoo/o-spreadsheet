import { Component, useEffect, useRef } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { _t } from "../../../../translation";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";

interface Props {
  figureUI: FigureUI;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  static props = {
    figureUI: Object,
  };
  private canvas = useRef("chartContainer");

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figureUI.id) as ScorecardChartRuntime;
  }

  get title(): string {
    const title =
      this.env.model.getters.getChartDefinition(this.props.figureUI.id).title.text ?? "";
    // chart titles are extracted from .json files and they are translated at runtime here
    return _t(title);
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
