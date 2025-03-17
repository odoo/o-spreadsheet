import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration, ChartType, Plugin, Scale } from "chart.js/auto";
import { ComponentsImportance } from "../../../../constants";
import { deepCopy } from "../../../../helpers";
import { TREND_LINE_XAXIS_ID } from "../../../../helpers/figures/charts/chart_common";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { css } from "../../../helpers";
import { FunnelChartController, FunnelChartElement } from "./chartjs_funnel_chart";
import { chartShowValuesPlugin } from "./chartjs_show_values_plugin";
import { waterfallLinesPlugin } from "./chartjs_waterfall_plugin";

interface Props {
  figure: Figure;
}

window.Chart?.register(waterfallLinesPlugin);
window.Chart?.register(chartShowValuesPlugin);
window.Chart?.register(FunnelChartController, FunnelChartElement);

css/* scss */ `
  .o-spreadsheet {
    .o-chart-custom-tooltip {
      font-size: 12px;
      background-color: #fff;
      z-index: ${ComponentsImportance.FigureTooltip};
    }
  }
`;

interface TestPluginOptions {
  eventStartX: () => number | undefined;
  eventEndX: () => number | undefined;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    testPlugin?: TestPluginOptions;
  }
}

export const testPlugin: Plugin = {
  id: "testPlugin",
  afterDatasetsDraw: function (chart, args, options: TestPluginOptions) {
    if (!options.eventStartX || !options.eventEndX) {
      return;
    }
    const ctx = chart.ctx;
    const eventStartX = options.eventStartX();
    const eventEndX = options.eventEndX();
    if (eventStartX !== undefined && eventEndX !== undefined) {
      const xMin = Math.min(eventStartX, eventEndX);
      const xMax = Math.max(eventStartX, eventEndX);
      const yTop = chart.chartArea.top ?? 0;
      const xLeft = chart.chartArea.left ?? 0;
      const xRight = chart.chartArea.right ?? 0;
      const yBottom = chart.chartArea.bottom ?? 0;
      ctx.fillStyle = "rgba(225,225,225,0.6)";
      ctx.beginPath();
      ctx.rect(xLeft, yBottom, xMin - xLeft, yTop - yBottom);
      ctx.rect(xMax, yBottom, xRight - xMax, yTop - yBottom);
      ctx.fill();
    }
  },
};

window.Chart?.register(testPlugin);

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";
  static props = {
    figure: Object,
  };

  private canvas = useRef("graphContainer");
  private sliderCanvas = useRef("graphSlider");
  private chart?: Chart;
  private slider?: Chart;
  private currentRuntime!: ChartJSRuntime;
  private eventStartX: number | undefined = undefined;
  private eventEndX: number | undefined = undefined;
  private startX: { x?: number; [TREND_LINE_XAXIS_ID]?: number } = {};
  private endX: { x?: number; [TREND_LINE_XAXIS_ID]?: number } = {};
  private clicked: boolean = false;
  private originalAxisLimits: {
    x: { min: number; max: number };
    [TREND_LINE_XAXIS_ID]: { min: number; max: number };
  } = { x: { min: 0, max: 0 }, [TREND_LINE_XAXIS_ID]: { min: 0, max: 0 } };

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background};`;
  }

  get globalDivStyle() {
    return `
      background-color: ${this.background};
      width:100%;
      height:100%;
    `;
  }

  get containerStyle() {
    return `
      background-color: ${this.background};
      max-height:calc(85%);
      min-height:calc(85%);
      height:calc(85%);
    `;
  }

  get sliderStyle() {
    return `
      background-color: ${this.background};
      max-height:15%;
      min-height:15%;
      height:15%;
      max-width:100%;
      min-width:100%;
      width:100%;
      margin-left:0px;
      margin-right:0px;
      margin-bottom:0px;
      border:1px solid black;
    `;
  }

  get chartRuntime(): ChartJSRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figure.id);
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

  private getSliderChartConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    return {
      ...chartData,
      data: {
        ...chartData.data,
        datasets: chartData.data.datasets.filter((ds) => ds.xAxisID !== TREND_LINE_XAXIS_ID),
      },
      options: {
        ...chartData.options,
        hover: { mode: null },
        plugins: {
          title: { display: false },
          legend: { display: false },
          tooltip: { enabled: false },
          testPlugin: { eventStartX: () => this.eventStartX, eventEndX: () => this.eventEndX },
        },
        scales: {
          ...chartData.options.scales,
          y: {
            display: false,
          },
          y1: {
            display: false,
          },
          x: {
            ...chartData.options.scales?.x,
            title: undefined,
          },
        },
      },
    };
  }

  private createChart(chartData: ChartConfiguration<any>) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    this.chart = new window.Chart(ctx, chartData);
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.slider = new window.Chart(sliderCtx, this.getSliderChartConfiguration(chartData));
    this.updateAxesLimits();
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
    const sliderConfig = this.getSliderChartConfiguration(chartData);
    this.slider!.data = sliderConfig.data;
    this.slider!.config.options = sliderConfig.options;
    this.slider!.update();
    this.updateAxesLimits();
  }

  private updateAxesLimits() {
    if (!this.chart) {
      return;
    }
    this.originalAxisLimits.x.min = this.chart.scales.x.min;
    this.originalAxisLimits.x.max = this.chart.scales.x.max;
    if (this.chart.scales[TREND_LINE_XAXIS_ID]) {
      this.originalAxisLimits[TREND_LINE_XAXIS_ID].min = this.chart.scales[TREND_LINE_XAXIS_ID].min;
      this.originalAxisLimits[TREND_LINE_XAXIS_ID].max = this.chart.scales[TREND_LINE_XAXIS_ID].max;
    }
  }

  private getCoordinates(ev) {
    if (!this.slider) {
      return {};
    }
    const { left, right } = this.slider.chartArea;
    const axes = {};
    for (const axis of ["x", TREND_LINE_XAXIS_ID]) {
      const scale = this.slider.scales[axis];
      if (scale) {
        axes[axis] = this.getCoordinateOnAxis(ev.offsetX, scale, left, right);
      }
    }
    return axes;
  }

  private getPositionOnChart(x: number) {
    //TODO : compute the position on the chart to get rid of eventStartX and eventEndX in the drawing plugin
    if (!this.slider) {
      return 0;
    }
    const { left, right } = this.slider.chartArea;
    return (x - left) / (right - left);
  }

  private getCoordinateOnAxis(offsetX: number, { min, max }: Scale, left: number, right: number) {
    if (offsetX <= right && offsetX >= left) {
      return Math.abs((offsetX - left) / (right - left)) * Math.abs(max - min) + min;
    }
    return 0;
  }

  private updateTrendLineAxis(xNewMin, xNewMax) {
    if (this.chart?.config.options?.scales?.[TREND_LINE_XAXIS_ID]) {
      const realRange = this.originalAxisLimits.x.max - this.originalAxisLimits.x.min;
      const trendOriginalRange =
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].max -
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].min;
      const conversionSlope = trendOriginalRange / realRange;
      const conversionIntercept =
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].min -
        this.originalAxisLimits.x.min * conversionSlope;
      const newTrendMin = xNewMin * conversionSlope + conversionIntercept;
      const newTrendMax = xNewMax * conversionSlope + conversionIntercept;
      this.chart.config.options.scales[TREND_LINE_XAXIS_ID].min = newTrendMin;
      this.chart.config.options.scales[TREND_LINE_XAXIS_ID].max = newTrendMax;
    }
  }

  onWheel(ev) {
    if (this.chart) {
      const x = this.chart.scales!["x"];
      const xMin: number = x.min;
      const xMax: number = x.max;
      if (x.type !== "linear") {
        const xNewMin = xMin - (ev.deltaY > 0 ? 1 : -1);
        const xNewMax = xMax + (ev.deltaY > 0 ? 1 : -1);
        this.chart.config.options!.scales!.x!.min = xNewMin;
        this.chart.config.options!.scales!.x!.max = xNewMax;
        this.updateTrendLineAxis(xNewMin, xNewMax);
        this.chart.update();
        return;
      }
      const xRange = xMax - xMin;
      const xZoom = xRange * 0.025;
      const xNewMin = xMin - (ev.deltaY > 0 ? xZoom : -xZoom);
      const xNewMax = xMax + (ev.deltaY > 0 ? xZoom : -xZoom);
      this.chart.config.options!.scales!.x!.min = xNewMin;
      this.chart.config.options!.scales!.x!.max = xNewMax;
      this.updateTrendLineAxis(xNewMin, xNewMax);
      this.chart.update();
    }
  }

  onPointerDown(ev) {
    this.clicked = true;
    this.eventStartX = ev.offsetX;
    this.eventEndX = undefined;
    this.startX = this.getCoordinates(ev);
  }

  onPointerMove(ev) {
    if (this.clicked && Math.abs(this.eventStartX! - ev.offsetX) > 5) {
      this.eventEndX = ev.offsetX;
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  onPointerUp(ev) {
    this.clicked = false;
    this.endX = this.getCoordinates(ev);
    if (Math.abs(this.eventStartX! - this.eventEndX!) > 5) {
      for (const axis of ["x", TREND_LINE_XAXIS_ID]) {
        if (this.startX[axis] !== undefined && this.endX[axis] !== undefined) {
          if (this.startX[axis] > this.endX[axis]) {
            this.chart!.config.options!.scales![axis]!.min = this.endX[axis];
            this.chart!.config.options!.scales![axis]!.max = this.startX[axis];
          } else {
            this.chart!.config.options!.scales![axis]!.min = this.startX[axis];
            this.chart!.config.options!.scales![axis]!.max = this.endX[axis];
          }
        }
      }
      this.chart!.update();
    } else {
      for (const axis of ["x", TREND_LINE_XAXIS_ID]) {
        if (this.chart?.config.options?.scales?.[axis]) {
          this.chart!.config.options!.scales![axis]!.min = undefined;
          this.chart!.config.options!.scales![axis]!.max = undefined;
        }
      }
      this.eventStartX = undefined;
      this.eventEndX = undefined;
      this.chart!.update();
    }
    this.slider!.update();
  }
}
