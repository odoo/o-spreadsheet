import { onWillUnmount, signal, useOnChange, usePlugin, useProps } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import {
  chartJsExtensionRegistry,
  registerChartJSExtensions,
} from "../../../../helpers/figures/charts/chart_js_extension";
import { deepCopy, deepEquals } from "../../../../helpers/misc";
import { DevicePixelRatioPlugin } from "../../../../owl_plugins/device_pixel_ratio_owl_plugin";
import { useStore } from "../../../../store_engine/store_hooks";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { Store } from "../../../../types/store_engine";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { ChartAnimationStore } from "./chartjs_animation_store";
import { chartBackgroundPlugin } from "./chartjs_background_plugin";
import { getCalendarChartController } from "./chartjs_calendar_chart";
import { chartColorScalePlugin } from "./chartjs_colorscale_plugin";
import {
  funnelTooltipPositioner,
  getFunnelChartController,
  getFunnelChartElement,
} from "./chartjs_funnel_chart";
import { geoChartPlugin } from "./chartjs_geo_plugin";
import { chartMinorGridPlugin } from "./chartjs_minor_grid_plugin";
import { chartShowValuesPlugin } from "./chartjs_show_values_plugin";
import { sunburstHoverPlugin } from "./chartjs_sunburst_hover_plugin";
import { sunburstLabelsPlugin } from "./chartjs_sunburst_labels_plugin";
import { waterfallLinesPlugin } from "./chartjs_waterfall_plugin";
import { zoomWindowPlugin } from "./zoomable_chart/zoomable_chartjs_plugins";

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
chartJsExtensionRegistry.add("chartBackgroundPlugin", {
  register: (Chart) => Chart.register(chartBackgroundPlugin),
  unregister: (Chart) => Chart.unregister(chartBackgroundPlugin),
});
chartJsExtensionRegistry.add("geoChartPlugin", {
  register: (Chart) => Chart.register(geoChartPlugin),
  unregister: (Chart) => Chart.unregister(geoChartPlugin),
});

export class ChartJsComponent extends OSComponent {
  static template = "o-spreadsheet-ChartJsComponent";

  protected props = useProps({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
    runtime: types.object<ChartJSRuntime>(),
  });

  protected canvas = signal.ref(HTMLCanvasElement);
  protected chart?: Chart;
  protected currentRuntime!: ChartJSRuntime;
  protected animationStore: Store<ChartAnimationStore> | undefined;

  devicePixelRatioPlugin = usePlugin(DevicePixelRatioPlugin);
  private currentDevicePixelRatio = this.devicePixelRatioPlugin.devicePixelRatio();

  get effectDependencies() {
    return [this.canvas(), this.props.runtime, this.devicePixelRatioPlugin.devicePixelRatio()];
  }

  setup() {
    if (this.shouldAnimate) {
      this.animationStore = useStore(ChartAnimationStore);
    }
    onWillUnmount(this.unmount.bind(this));

    // ADRM TODO: doesn't work because of the whole master/detail chart thing ()
    // Either 1) go back to the useEffect hack to do everything in the onPatched
    // 2) have a separate effect for both the master and detail charts. In either case, should probably a hook that does everything

    // We need to listen to a change of props, and not a change in the model signal to update the chart only when the
    // component is rendered. A simple effect on the model would run BEFORE the render, and the render could afterward
    // delete the component to create a new one, making the effect wrong/useless.
    useOnChange(
      () => this.effectDependencies,
      () => {
        console.log("useOnChange");
        if (!this.canvas()) {
          return;
        }

        if (!this.currentRuntime) {
          registerChartJSExtensions();
          this.currentRuntime = this.props.runtime;
          // Note: chartJS modify the runtime in place, so it's important to give it a copy
          this.createChart(deepCopy(this.currentRuntime));
          return;
        }
        const runtime = this.props.runtime;

        if (
          runtime !== this.currentRuntime &&
          (!("errorMessage" in this.props.runtime) || !this.props.runtime.errorMessage)
        ) {
          if (runtime.chartJsConfig.type !== this.currentRuntime.chartJsConfig.type) {
            this.chart?.destroy();
            this.createChart(deepCopy(runtime));
          } else {
            this.updateChartJs(deepCopy(runtime));
          }
          this.currentRuntime = runtime;
        } else if (
          this.currentDevicePixelRatio !== this.devicePixelRatioPlugin.devicePixelRatio()
        ) {
          this.currentDevicePixelRatio = this.devicePixelRatioPlugin.devicePixelRatio();
          this.updateChartJs(deepCopy(this.currentRuntime));
        }
      }
    );
  }

  protected unmount() {
    this.chart?.destroy();
  }

  private get shouldAnimate(): boolean {
    return this.model().getters.isDashboard() || true;
  }

  protected createChart(chartRuntime: ChartJSRuntime) {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    if (this.shouldAnimate && this.animationStore) {
      const chartType = this.model().getters.getChartDefinition(this.props.chartId)?.type;
      if (chartType && this.animationStore.animationPlayed[this.animationChartId] !== chartType) {
        chartData = this.enableAnimationInChartData(chartData);
        this.animationStore.disableAnimationForChart(this.animationChartId, chartType);
      }
    }

    const canvas = this.canvas();
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    this.chart = new globalThis.Chart(ctx, chartData);
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    let chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    if (this.shouldAnimate) {
      const chartType = this.model().getters.getChartDefinition(this.props.chartId)?.type;
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
      this.getChartDataInRuntime(this.props.runtime)
    );
  }

  protected enableAnimationInChartData(
    chartData: ChartConfiguration<any>
  ): ChartConfiguration<any> {
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
        labelsAndValues: dataset.labelsAndValues,
      })),
    };
  }

  get animationChartId() {
    return this.props.isFullScreen ? this.props.chartId + "-fullscreen" : this.props.chartId;
  }
}
