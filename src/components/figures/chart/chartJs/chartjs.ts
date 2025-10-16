import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { deepCopy, deepEquals } from "../../../../helpers";
import { Store, useStore } from "../../../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { chartJsExtensionRegistry, registerChartJSExtensions } from "./chart_js_extension";
import { ChartAnimationStore } from "./chartjs_animation_store";
import {
  funnelTooltipPositioner,
  getFunnelChartController,
  getFunnelChartElement,
} from "./chartjs_funnel_chart";
import { chartMinorGridPlugin } from "./chartjs_minor_grid_plugin";
import { chartShowValuesPlugin } from "./chartjs_show_values_plugin";
import { sunburstHoverPlugin } from "./chartjs_sunburst_hover_plugin";
import { sunburstLabelsPlugin } from "./chartjs_sunburst_labels_plugin";
import { waterfallLinesPlugin } from "./chartjs_waterfall_plugin";

interface Props {
  chartId: UID;
  isFullScreen?: boolean;
}

chartJsExtensionRegistry.add("chartShowValuesPlugin", {
  register: (Chart) => Chart.register(chartShowValuesPlugin),
  unregister: (Chart) => Chart.unregister(chartShowValuesPlugin),
});
chartJsExtensionRegistry.add("chartMinorGridPlugin", {
  register: (Chart) => Chart.register(chartMinorGridPlugin),
  unregister: (Chart) => Chart.unregister(chartMinorGridPlugin),
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
  // @ts-expect-error
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
        this.currentDevicePixelRatio = window.devicePixelRatio;
        this.updateChartJs(deepCopy(this.currentRuntime));
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
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    if (this.shouldAnimate && this.animationStore) {
      const chartType = this.env.model.getters.getChart(this.props.chartId)?.type;
      if (chartType && this.animationStore.animationPlayed[this.animationChartId] !== chartType) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationChartId, chartType);
      }
    }

    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
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
    this.chart!.config.options = chartData.options;
    this.chart!.update();
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
