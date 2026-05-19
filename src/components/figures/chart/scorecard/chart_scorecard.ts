import { onMounted, onWillUnmount, props, signal } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { Rect } from "../../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { getZoomedRect } from "../../../helpers/zoom";
import { types } from "../../../props_validation";

export class ScorecardChart extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";

  protected props = props({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
  });
  private canvas = signal<HTMLCanvasElement | null>(null);

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get title(): string {
    const title = this.env.model.getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.env.model.getters.dynamicTranslate(title) : "";
  }

  setup() {
    useLayoutEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas();
      if (!canvas) {
        return [];
      }
      const rect = canvas.getBoundingClientRect();
      return [rect.width, rect.height, this.runtime, canvas, window.devicePixelRatio];
    });
    const resizeObserver = new ResizeObserver(() => this.createChart());
    onMounted(() => {
      const canvas = this.canvas();
      if (canvas) {
        resizeObserver.observe(canvas);
      }
    });
    onWillUnmount(() => resizeObserver.disconnect());
  }

  config(canvasRect: Rect, zoom: number) {
    return getScorecardConfiguration(getZoomedRect(1 / zoom, canvasRect), this.runtime);
  }

  private createChart() {
    const canvas = this.canvas();
    if (!canvas) {
      return;
    }
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const config = this.config(canvas.getBoundingClientRect(), zoom);
    drawScoreChart(config, canvas, zoom);
  }
}
