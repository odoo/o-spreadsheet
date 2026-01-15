import {
  chartJsExtensionRegistry,
  registerChartJSExtensions,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_js_extension";
import { ChartJSRuntime } from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { deepCopy, deepEquals } from "../../../../helpers";
import { Store, useStore } from "../../../../store_engine";
import { UID } from "../../../../types";
import { ChartAnimationStore } from "./chartjs_animation_store";
import { getCalendarChartController } from "./chartjs_calendar_chart";
import { chartColorScalePlugin } from "./chartjs_colorscale_plugin";
import {
  funnelTooltipPositioner,
  getFunnelChartController,
  getFunnelChartElement,
} from "./chartjs_funnel_chart";
import { chartShowValuesPlugin } from "./chartjs_show_values_plugin";
import { sunburstHoverPlugin } from "./chartjs_sunburst_hover_plugin";
import { sunburstLabelsPlugin } from "./chartjs_sunburst_labels_plugin";
import { waterfallLinesPlugin } from "./chartjs_waterfall_plugin";
import { zoomWindowPlugin } from "./zoomable_chart/zoomable_chartjs_plugins";

interface Props {
  chartId: UID;
  isFullScreen?: boolean;
}

chartJsExtensionRegistry.add("chartShowValuesPlugin", {
  register: (Chart) => Chart.register(chartShowValuesPlugin),
  unregister: (Chart) => Chart.unregister(chartShowValuesPlugin),
});
chartJsExtensionRegistry.add("waterfallLinesPlugin", {
  register: (Chart) => Chart.register(waterfallLinesPlugin),
  unregister: (Chart) => Chart.unregister(waterfallLinesPlugin),
});
chartJsExtensionRegistry.add("funnelController", {
  register: (Chart) => Chart.register(getFunnelChartController()),
  unregister: (Chart) => Chart.unregister(getFunnelChartController()),
});
chartJsExtensionRegistry.add("funnelElement", {
  register: (Chart) => Chart.register(getFunnelChartElement()),
  unregister: (Chart) => Chart.unregister(getFunnelChartElement()),
});
chartJsExtensionRegistry.add("funnelTooltipPositioner", {
  register: (Chart) =>
    (Chart.Tooltip.positioners.funnelTooltipPositioner = funnelTooltipPositioner),
  unregister: (Chart) => (Chart.Tooltip.positioners.funnelTooltipPositioner = undefined),
});
chartJsExtensionRegistry.add("sunburstLabelsPlugin", {
  register: (Chart) => Chart.register(sunburstLabelsPlugin),
  unregister: (Chart) => Chart.unregister(sunburstLabelsPlugin),
});
chartJsExtensionRegistry.add("sunburstHoverPlugin", {
  register: (Chart) => Chart.register(sunburstHoverPlugin),
  unregister: (Chart) => Chart.unregister(sunburstHoverPlugin),
});
chartJsExtensionRegistry.add("chartColorScalePlugin", {
  register: (Chart) => Chart.register(chartColorScalePlugin),
  unregister: (Chart) => Chart.unregister(chartColorScalePlugin),
});
chartJsExtensionRegistry.add("calendarController", {
  register: (Chart) => Chart.register(getCalendarChartController()),
  unregister: (Chart) => Chart.unregister(getCalendarChartController()),
});
chartJsExtensionRegistry.add("zoomWindowPlugin", {
  register: (Chart) => Chart.register(zoomWindowPlugin),
  unregister: (Chart) => Chart.unregister(zoomWindowPlugin),
});

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";
  static props = {
    chartId: String,
    isFullScreen: { type: Boolean, optional: true },
  };

  protected canvas = useRef("graphContainer");
  protected chart?: Chart;
  protected currentRuntime!: ChartJSRuntime;
  protected animationStore: Store<ChartAnimationStore> | undefined;

  private currentDevicePixelRatio = window.devicePixelRatio;
  private currentZoomLevel = this.env.model.getters.getViewportZoomLevel();

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  get chartRuntime(): ChartJSRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId);
    if (!("chartJsConfig" in runtime)) {
      throw new Error("Unsupported chart runtime");
    }
    return runtime;
  }

  setup() {
    if (this.shouldAnimate) {
      this.animationStore = useStore(ChartAnimationStore);
    }
    onMounted(() => {
      registerChartJSExtensions();
      const runtime = this.chartRuntime;
      this.currentRuntime = runtime;
      // Note: chartJS modify the runtime in place, so it's important to give it a copy
      this.createChart(deepCopy(runtime));
    });
    onWillUnmount(this.unmount.bind(this));
    useEffect(() => {
      // @ts-ignore
      window.truc = this.chart;
      const runtime = this.chartRuntime;
      if (runtime !== this.currentRuntime) {
        if (runtime.chartJsConfig.type !== this.currentRuntime.chartJsConfig.type) {
          this.chart?.destroy();
          this.createChart(deepCopy(runtime));
        } else {
          this.updateChartJs(deepCopy(runtime));
        }
        this.currentRuntime = runtime;
      } else if (this.currentDevicePixelRatio !== window.devicePixelRatio) {
        this.updateChartJs(deepCopy(this.currentRuntime));
        this.currentDevicePixelRatio = window.devicePixelRatio;
        // @ts-ignore
        this.chart.currentDevicePixelRatio = window.devicePixelRatio * this.currentZoomLevel;
      }
      this.currentZoomLevel = this.env.model.getters.getViewportZoomLevel();
      // @ts-ignore
      this.chart.currentDevicePixelRatio = window.devicePixelRatio * this.currentZoomLevel;
      if (this.chart && this.currentZoomLevel !== this.env.model.getters.getViewportZoomLevel()) {
      }
    });
  }

  protected unmount() {
    this.chart?.destroy();
  }

  private get shouldAnimate(): boolean {
    return this.env.model.getters.isDashboard();
  }

  protected createChart(chartRuntime: ChartJSRuntime) {
    console.log("Creating Chart.js chart");
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    // const zoomLevel = this.env.model.getters.getViewportZoomLevel();
    // chartData.options.devicePixelRatio = window.devicePixelRatio * zoomLevel;
    if (this.shouldAnimate && this.animationStore) {
      const chartType = this.env.model.getters.getChart(this.props.chartId)?.type;
      if (chartType && this.animationStore.animationPlayed[this.animationChartId] !== chartType) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationChartId, chartType);
      }
    }

    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    chartData.options.devicePixelRatio = window.devicePixelRatio;
    this.chart = new globalThis.Chart(ctx, chartData);
    // const zoomLevel = this.env.model.getters.getViewportZoomLevel();
    // @ts-ignore
    // this.chart.currentDevicePixelRatio = window.devicePixelRatio * zoomLevel;
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    // const zoomLevel = this.env.model.getters.getViewportZoomLevel();
    // chartData.options.devicePixelRatio = window.devicePixelRatio * zoomLevel;
    if (this.shouldAnimate) {
      const chartType = this.env.model.getters.getChart(this.props.chartId)?.type;
      if (chartType && this.hasChartDataChanged() && this.animationStore) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationChartId, chartType);
      }
    }

    if (chartData.data && chartData.data.datasets) {
      this.chart!.data = chartData.data;
      if (chartData.options?.plugins?.title) {
        this.chart!.config.options!.plugins!.title = chartData.options.plugins.title;
      }
    } else {
      this.chart!.data.datasets = [];
    }
    chartData.options.devicePixelRatio = window.devicePixelRatio;
    this.chart!.config.options = chartData.options;

    // const zoomLevel = this.env.model.getters.getViewportZoomLevel();
    // @ts-ignore
    // this.chart.currentDevicePixelRatio = window.devicePixelRatio * zoomLevel;
    this.chart!.update();
    console.log("Chart updated ", this.chart!.currentDevicePixelRatio);
  }

  private hasChartDataChanged() {
    return !deepEquals(
      this.getChartDataInRuntime(this.currentRuntime),
      this.getChartDataInRuntime(this.chartRuntime)
    );
  }

  protected enableAnimationInChartData(chartData: ChartConfiguration<any>) {
    return {
      ...chartData,
      options: { ...chartData.options, animation: { animateRotate: true } },
    };
  }

  private getChartDataInRuntime(runtime: ChartJSRuntime) {
    const data = runtime.chartJsConfig.data;
    return {
      labels: data.labels,
      dataset: data.datasets.map((dataset) => ({
        data: dataset.data,
        label: dataset.label,
        tree: dataset.tree,
      })),
    };
  }

  get animationChartId() {
    return this.props.isFullScreen ? this.props.chartId + "-fullscreen" : this.props.chartId;
  }
}
