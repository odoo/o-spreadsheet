import { signal, usePlugin, useProps } from "@odoo/owl";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { useEffectAfterPatch } from "../../../../helpers/owl3_helpers";
import { getZoomedRect } from "../../../../helpers/rectangle";
import { DevicePixelRatioPlugin } from "../../../../owl_plugins/device_pixel_ratio_owl_plugin";
import { ZoomPlugin } from "../../../../owl_plugins/zoom_plugin";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { Rect } from "../../../../types/rendering";
import { useElementRect } from "../../../helpers/position_hook";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";

export class ScorecardChart extends OSComponent {
  static template = "o-spreadsheet-ScorecardChart";

  protected props = useProps({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
  });
  private canvas = signal.ref(HTMLCanvasElement);
  private canvasRect = useElementRect(this.canvas);
  private zoomPlugin = usePlugin(ZoomPlugin);
  private devicePixelRatioPlugin = usePlugin(DevicePixelRatioPlugin);

  get runtime(): ScorecardChartRuntime {
    return this.model().getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get title(): string {
    const title = this.model().getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.model().getters.dynamicTranslate(title) : "";
  }

  setup() {
    useEffectAfterPatch(this.createChart.bind(this));
  }

  config(canvasRect: Rect, zoom: number) {
    return getScorecardConfiguration(getZoomedRect(1 / zoom, canvasRect), this.runtime);
  }

  private createChart() {
    const canvas = this.canvas();
    if (!canvas) {
      return;
    }
    const zoom = this.zoomPlugin.zoomLevel();
    const config = this.config(this.canvasRect(), zoom);
    drawScoreChart(config, canvas, this.devicePixelRatioPlugin.devicePixelRatio(), zoom);
  }
}
