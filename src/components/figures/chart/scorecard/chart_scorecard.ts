import { onMounted, onWillUnmount, signal, useProps } from "@odoo/owl";
import { chartFontColor } from "../../../../helpers/figures/charts/chart_common";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { getZoomedRect } from "../../../../helpers/rectangle";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { useStore } from "../../../../store_engine/store_hooks";
import { ZoomStore } from "../../../../stores/zoom_store";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { Color } from "../../../../types/misc";
import { Rect } from "../../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { types } from "../../../props_validation";

export class ScorecardChart extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";

  protected props = useProps({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
  });
  private canvas = signal.ref(HTMLCanvasElement);
  private zoomStore!: Store<ZoomStore>;

  get runtime(): ScorecardChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as ScorecardChartRuntime;
  }

  get themedRuntime(): ScorecardChartRuntime {
    const runtime = this.runtime;
    const background = runtime.background ?? this.themeBackgroundColor;
    return {
      ...runtime,
      background,
      fontColor: runtime.fontColor ?? chartFontColor(background),
    };
  }

  get themeBackgroundColor(): Color {
    return this.env.model.getters.getSpreadsheetTheme().backgroundColor;
  }

  get title(): string {
    const title = this.env.model.getters.getChartDefinition(this.props.chartId).title.text;
    return title ? this.env.model.getters.dynamicTranslate(title) : "";
  }

  setup() {
    this.zoomStore = useStore(ZoomStore);
    useLayoutEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas();
      if (!canvas) {
        return [];
      }
      const rect = canvas.getBoundingClientRect();
      return [
        rect.width,
        rect.height,
        this.runtime,
        this.themeBackgroundColor,
        canvas,
        window.devicePixelRatio,
      ];
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
    return getScorecardConfiguration(getZoomedRect(1 / zoom, canvasRect), this.themedRuntime);
  }

  private createChart() {
    const canvas = this.canvas();
    if (!canvas) {
      return;
    }
    const zoom = this.zoomStore.zoomLevel;
    const config = this.config(canvas.getBoundingClientRect(), zoom);
    drawScoreChart(config, canvas, zoom);
  }
}
