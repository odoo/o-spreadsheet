import { Component, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UID } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
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

  get title(): string {
    const title = this.env.model.getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.env.model.getters.dynamicTranslate(title) : "";
  }

  setup() {
    const resizeObserver = new ResizeObserver(() => this.createChart());
    onMounted(() => resizeObserver.observe(this.canvas.el as HTMLCanvasElement));
    onWillUnmount(() => resizeObserver.disconnect());
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    if (!canvas) {
      return;
    }
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const config = getScorecardConfiguration(
      getZoomedRect(1 / zoom, canvas.getBoundingClientRect()),
      this.runtime
    );
    drawScoreChart(config, canvas);
  }
}
