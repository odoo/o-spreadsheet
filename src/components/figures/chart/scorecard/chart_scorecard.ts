import {
  drawScoreChart,
  ScorecardChart as ScorecardChartClass,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/scorecard_chart_config_builder";
import {
  ScorecardChartRuntime,
  ScorecardChartStyle,
} from "@odoo/o-spreadsheet-engine/types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { UID } from "../../../../types";
import { getZoomedRect } from "../../../helpers/zoom";

interface Props {
  chartId: UID;
  isFullScreen?: Boolean;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  static props = {
    chartId: String,
    isFullScreen: { type: Boolean, optional: true },
  };
  private canvas = useRef("chartContainer");

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get style(): ScorecardChartStyle {
    const chart = this.env.model.getters.getChart(this.props.chartId) as ScorecardChartClass;
    return this.env.model.getters.getStyleOfSingleCellChart(chart.background, chart.keyValue);
  }

  get title(): string {
    const title = this.env.model.getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.env.model.getters.dynamicTranslate(title) : "";
  }

  setup() {
    useEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return [
        rect.width,
        rect.height,
        this.runtime,
        this.style,
        this.canvas.el,
        window.devicePixelRatio,
      ];
    });
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const config = getScorecardConfiguration(
      getZoomedRect(1 / zoom, canvas.getBoundingClientRect()),
      this.runtime,
      this.style
    );
    drawScoreChart(config, canvas);
  }
}
