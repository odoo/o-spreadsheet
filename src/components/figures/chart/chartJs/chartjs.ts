import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { ComponentsImportance } from "../../../../constants";
import { deepCopy, deepEquals } from "../../../../helpers";
import { Store, useStore } from "../../../../store_engine";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { css } from "../../../helpers";
import { chartJsExtensionRegistry, registerChartJSExtensions } from "./chart_js_extension";
import { ChartAnimationStore } from "./chartjs_animation_store";
import {
  funnelTooltipPositioner,
  getFunnelChartController,
  getFunnelChartElement,
} from "./chartjs_funnel_chart";
import { chartShowValuesPlugin } from "./chartjs_show_values_plugin";
import { sunburstHoverPlugin } from "./chartjs_sunburst_hover_plugin";
import { sunburstLabelsPlugin } from "./chartjs_sunburst_labels_plugin";
import { waterfallLinesPlugin } from "./chartjs_waterfall_plugin";

interface Props {
  figureUI: FigureUI;
  isFullScreen?: boolean;
}

css/* scss */ `
  .o-spreadsheet {
    .o-chart-custom-tooltip {
      font-size: 12px;
      background-color: #fff;
      z-index: ${ComponentsImportance.FigureTooltip};
    }
  }
`;

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
    figureUI: Object,
    isFullScreen: { type: Boolean, optional: true },
  };

  private canvas = useRef("graphContainer");
  private chart?: Chart;
  private currentRuntime!: ChartJSRuntime;
  private animationStore: Store<ChartAnimationStore> | undefined;

  private currentDevicePixelRatio = window.devicePixelRatio;

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  get chartRuntime(): ChartJSRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figureUI.id);
    if (!("chartJsConfig" in runtime)) {
      throw new Error("Unsupported chart runtime");
    }
    return runtime;
  }

  setup() {
    if (this.env.model.getters.isDashboard()) {
      this.animationStore = useStore(ChartAnimationStore);
    }
    onMounted(() => {
      registerChartJSExtensions();
      const runtime = this.chartRuntime;
      this.currentRuntime = runtime;
      // Note: chartJS modify the runtime in place, so it's important to give it a copy
      this.createChart(deepCopy(runtime.chartJsConfig));
    });
    onWillUnmount(() => this.chart?.destroy());
    useEffect(() => {
      const runtime = this.chartRuntime;
      if (runtime !== this.currentRuntime) {
        if (runtime.chartJsConfig.type !== this.currentRuntime.chartJsConfig.type) {
          this.chart?.destroy();
          this.createChart(deepCopy(runtime.chartJsConfig));
        } else {
          this.updateChartJs(deepCopy(runtime.chartJsConfig));
        }
        this.currentRuntime = runtime;
      } else if (this.currentDevicePixelRatio !== window.devicePixelRatio) {
        this.currentDevicePixelRatio = window.devicePixelRatio;
        this.updateChartJs(deepCopy(this.currentRuntime.chartJsConfig));
      }
    });
  }

  private createChart(chartData: ChartConfiguration<any>) {
    if (this.env.model.getters.isDashboard() && this.animationStore) {
      const chartType = this.env.model.getters.getChart(this.props.figureUI.id)?.type;
      if (chartType && this.animationStore.animationPlayed[this.animationFigureId] !== chartType) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationFigureId, chartType);
      }
    }

    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
  }

  private updateChartJs(chartData: ChartConfiguration<any>) {
    if (this.env.model.getters.isDashboard()) {
      const chartType = this.env.model.getters.getChart(this.props.figureUI.id)?.type;
      if (chartType && this.hasChartDataChanged() && this.animationStore) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationFigureId, chartType);
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
      this.currentRuntime.chartJsConfig.data,
      this.chartRuntime.chartJsConfig.data
    );
  }

  private enableAnimationInChartData(chartData: ChartConfiguration<any>) {
    return {
      ...chartData,
      options: { ...chartData.options, animation: { animateRotate: true } },
    };
  }

  get animationFigureId() {
    return this.props.isFullScreen
      ? this.props.figureUI.id + "-fullscreen"
      : this.props.figureUI.id;
  }
}
