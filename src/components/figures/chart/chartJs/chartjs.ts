import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { ComponentsImportance } from "../../../../constants";
import { deepCopy } from "../../../../helpers";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { css } from "../../../helpers";
import { chartJsExtensionRegistry, getChartJSConstructor } from "./chart_js_extension";
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

chartJsExtensionRegistry.add("chartShowValuesPlugin", chartShowValuesPlugin);
chartJsExtensionRegistry.add("waterfallLinesPlugin", waterfallLinesPlugin);
chartJsExtensionRegistry.add("funnelController", (Chart) =>
  Chart.register(getFunnelChartController())
);
chartJsExtensionRegistry.add("funnelElement", (Chart) => Chart.register(getFunnelChartElement()));
chartJsExtensionRegistry.add(
  "funnelTooltipPositioner",
  (Chart) => (Chart.Tooltip.positioners.funnelTooltipPositioner = funnelTooltipPositioner)
);
chartJsExtensionRegistry.add("sunburstLabelsPlugin", sunburstLabelsPlugin);
chartJsExtensionRegistry.add("sunburstHoverPlugin", sunburstHoverPlugin);

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";
  static props = {
    figureUI: Object,
  };

  private canvas = useRef("graphContainer");
  private chart?: Chart;
  private currentRuntime!: ChartJSRuntime;

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
    onMounted(() => {
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
      }
    });
  }

  private createChart(chartData: ChartConfiguration<any>) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const Chart = getChartJSConstructor();
    this.chart = new Chart(ctx, chartData);
  }

  private updateChartJs(chartData: ChartConfiguration<any>) {
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
}
