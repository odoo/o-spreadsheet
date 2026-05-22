import { onMounted, onWillUnmount, signal } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { UID } from "../../../../types/misc";
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

  private createChart() {
    const canvas = this.canvas();
    if (!canvas) {
      return;
    }
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const config = getScorecardConfiguration(
      getZoomedRect(1 / zoom, canvas.getBoundingClientRect()),
      this.runtime
    );
    drawScoreChart(config, canvas, zoom);
  }
}
