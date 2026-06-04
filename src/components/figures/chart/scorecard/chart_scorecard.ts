import { onMounted, onWillUnmount, props, signal, types } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { getZoomedRect } from "../../../helpers/zoom";
import { useModel } from "../../../owl_plugins/model_plugin";

export class ScorecardChart extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";

  protected props = props({
    chartId: types.string(),
    "isFullScreen?": types.boolean(),
  });
  private canvas = signal<HTMLCanvasElement | null>(null);

  private model = useModel();

  get runtime(): ScorecardChartRuntime {
    return this.model().getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get title(): string {
    const title = this.model().getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.model().getters.dynamicTranslate(title) : "";
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
    const zoom = this.model().getters.getViewportZoomLevel();
    const config = getScorecardConfiguration(
      getZoomedRect(1 / zoom, canvas.getBoundingClientRect()),
      this.runtime
    );
    drawScoreChart(config, canvas, zoom);
  }
}
