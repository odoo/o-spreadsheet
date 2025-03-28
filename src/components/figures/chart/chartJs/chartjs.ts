import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { Chart, ChartConfiguration, ChartType, Plugin, Scale } from "chart.js/auto";
import { ComponentsImportance } from "../../../../constants";
import { deepCopy } from "../../../../helpers";
import { TREND_LINE_XAXIS_ID } from "../../../../helpers/figures/charts/chart_common";
import { getChartJSConstructor } from "../../../../helpers/figures/charts/chart_ui_common";
import { Figure, SpreadsheetChildEnv, Zone } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { css } from "../../../helpers";

interface Props {
  figure: Figure;
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

interface ZoomPluginOptions {
  panable?: boolean;
  zoomable?: boolean;
  sliceable?: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    zoomPlugin?: ZoomPluginOptions;
  }
}

export const zoomPlugin: Plugin = {
  id: "zoomPlugin",
};

window.Chart?.register(zoomPlugin);

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
  private startX?: number;
  private endX?: number;
  private clicked: boolean = false;
  private originalAxisLimits: {
    x: { min: number; max: number };
    [TREND_LINE_XAXIS_ID]: { min: number; max: number };
  } = { x: { min: 0, max: 0 }, [TREND_LINE_XAXIS_ID]: { min: 0, max: 0 } };

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  get globalDivStyle() {
    return `
      background-color: ${this.background};
      width:100%;
      height:100%;
    `;
  }

  get containerStyle() {
    const height = this.sliceable ? "85%" : "100%";
    return `
      background-color: ${this.background};
      max-height:${height};
      min-height:${height};
      height:${height};
    `;
  }

  get sliderStyle() {
    if (!this.sliceable) {
      return `display:none;`;
    }
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

  get sliceable(): boolean {
    const runtime = this.chartRuntime;
    if (!runtime.chartJsConfig.options?.plugins?.zoomPlugin?.sliceable) {
      return false;
    }
    return true;
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
    const Chart = getChartJSConstructor();
    this.chart = new Chart(ctx, chartData);
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.updateAxesLimits();
    this.slider = new Chart(sliderCtx, this.getSliderChartConfiguration(chartData));
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
    this.updateAxesLimits();
    this.slider!.update();
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
    this.eventEndX = undefined;
    this.eventStartX = undefined;
  }

  private getPositionOnChart(x: number) {
    if (!this.slider) {
      return 0;
    }
    const { max: xMax, min: xMin } = this.originalAxisLimits.x;
    const { left, right } = this.slider.chartArea;
    return left + ((right - left) * (x - xMin)) / (xMax - xMin);
  }

  private getCoordinateOnAxis(offsetX: number, { min, max }: Scale, { left, right }: Zone): number {
    if (offsetX <= right && offsetX >= left) {
      return Math.abs((offsetX - left) / (right - left)) * Math.abs(max - min) + min;
    }
    return 0;
  }

  private updateTrendLineAxis(xNewMin: number, xNewMax: number) {
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

  onWheel(ev: WheelEvent) {
    if (this.chart) {
      const x = this.chart.scales!["x"];
      const xMin: number = x.min;
      const xMax: number = x.max;
      let xNewMin: number;
      let xNewMax: number;
      if (x.type !== "linear") {
        xNewMin = xMin - (ev.deltaY > 0 ? 1 : -1);
        xNewMax = xMax + (ev.deltaY > 0 ? 1 : -1);
      } else {
        const xMean = this.getCoordinateOnAxis(ev.offsetX, x, this.chart.chartArea);
        const xRange = xMax - xMin;
        const newXRange = xRange * (ev.deltaY < 0 ? 0.975 : 1.025);
        xNewMin = xMean - (xMean - xMin) * (newXRange / xRange);
        xNewMax = xMean + (xMax - xMean) * (newXRange / xRange);
        if (xNewMin < this.originalAxisLimits.x.min) {
          xNewMin = this.originalAxisLimits.x.min;
        }
        if (xNewMax > this.originalAxisLimits.x.max) {
          xNewMax = this.originalAxisLimits.x.max;
        }
      }
      this.chart.config.options!.scales!.x!.min = xNewMin;
      this.chart.config.options!.scales!.x!.max = xNewMax;
      this.updateTrendLineAxis(xNewMin, xNewMax);
      this.chart.update();
      this.eventStartX = this.getPositionOnChart(xNewMin);
      this.eventEndX = this.getPositionOnChart(xNewMax);
      this.slider!.update();
    }
  }

  onPointerDown(ev: PointerEvent) {
    this.clicked = true;
    this.eventStartX = ev.offsetX;
    this.eventEndX = undefined;
    this.startX = this.getCoordinateOnAxis(
      ev.offsetX,
      this.slider!.scales.x,
      this.slider!.chartArea
    );
  }

  onPointerMove(ev: PointerEvent) {
    if (this.clicked && Math.abs(this.eventStartX! - ev.offsetX) > 5) {
      this.eventEndX = ev.offsetX;
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  onPointerUp(ev: PointerEvent) {
    this.clicked = false;
    this.endX = this.getCoordinateOnAxis(ev.offsetX, this.slider!.scales.x, this.slider!.chartArea);
    if (Math.abs(this.eventStartX! - this.eventEndX!) > 5) {
      const xMin = Math.min(this.startX!, this.endX);
      const xMax = Math.max(this.startX!, this.endX);
      this.chart!.config.options!.scales!.x!.min = xMin;
      this.chart!.config.options!.scales!.x!.max = xMax;
      this.updateTrendLineAxis(xMin, xMax);
      this.chart!.update();
    } else {
      this.chart!.config.options!.scales!.x!.min = undefined;
      this.chart!.config.options!.scales!.x!.max = undefined;
      this.chart!.config.options!.scales![TREND_LINE_XAXIS_ID]!.min = undefined;
      this.chart!.config.options!.scales![TREND_LINE_XAXIS_ID]!.max = undefined;
      this.eventStartX = undefined;
      this.eventEndX = undefined;
      this.chart!.update();
    }
    this.slider!.update();
  }
}
