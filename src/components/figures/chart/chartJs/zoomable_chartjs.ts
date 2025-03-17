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
    const { top, left, right, bottom } = chart.chartArea;
    const eventStartX = options.eventStartX() || left;
    const eventEndX = options.eventEndX() || right;
    const xMin = Math.min(eventStartX, eventEndX);
    const xMax = Math.max(eventStartX, eventEndX);
    ctx.fillStyle = "rgba(225,225,225,0.6)";
    ctx.beginPath();
    ctx.rect(left, bottom, xMin - left, top - bottom);
    ctx.rect(xMax, bottom, right - xMax, top - bottom);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.rect(xMin, bottom, xMax - xMin, top - bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.rect(xMin - 4, (bottom + top) / 2 - 7, 8, 14);
    ctx.rect(xMax - 4, (bottom + top) / 2 - 7, 8, 14);
    ctx.fill();
    ctx.stroke();
  },
};

window.Chart?.register(testPlugin);

interface TestPlugin2Options {
  hoverPosition?: () => number;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    testPlugin2?: TestPlugin2Options;
  }
}

export const testPlugin2: Plugin = {
  id: "testPlugin2",
  afterDatasetsDraw: function (chart, args, options: TestPlugin2Options) {
    if (options.hoverPosition?.() === undefined) {
      return;
    }
    const ctx = chart.ctx;
    const { left, right, top, bottom } = chart.chartArea;
    const hoverCoordinate = options.hoverPosition() ?? 0;
    const chartWidth = right - left;
    const { min, max } = chart.scales.x;
    if (hoverCoordinate < min || hoverCoordinate > max) {
      return;
    }
    const hoverPosition = left + (chartWidth * (hoverCoordinate - min)) / (max - min);
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.moveTo(hoverPosition, top);
    ctx.lineTo(hoverPosition, bottom);
    ctx.stroke();
  },
};

window.Chart?.register(testPlugin2);

interface ZoomPluginOptions {
  enabled?: boolean;
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

export class ZoomableChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ZoomableChartJsComponent";
  static props = {
    figure: Object,
  };

  private canvas = useRef("graphContainer");
  private sliderCanvas = useRef("graphSlider");
  private chart?: Chart;
  private slider?: Chart;
  private currentRuntime!: ChartJSRuntime;
  private _eventStartX: number | undefined = undefined;
  private _eventEndX: number | undefined = undefined;
  private _eventMoveX: number | undefined = undefined;
  private panStartX?: number;
  private panStartLimits?: { x: { min: number; max: number } };
  private startX?: number;
  private endX?: number;
  private clicked?: "select" | "move";
  private currentHoverX?: number;
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
    const config = {
      ...chartData,
      options: {
        ...chartData.options,
        plugins: {
          ...chartData.options.plugins,
          testPlugin2: {
            hoverPosition: () => this.currentHoverX,
          },
        },
      },
    };
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const Chart = getChartJSConstructor();
    this.chart = new Chart(ctx, config);
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.updateAxesLimits();
    this.slider = new Chart(sliderCtx, this.getSliderChartConfiguration(chartData));
    this._eventStartX = undefined;
    this._eventEndX = undefined;
  }

  private updateChartJs(chartData: ChartConfiguration<any>) {
    if (chartData.data && chartData.data.datasets) {
      this.chart!.data = chartData.data;
    } else {
      this.chart!.data.datasets = [];
    }
    const plugins = {
      ...chartData.options.plugins,
      testPlugin2: {
        hoverPosition: () => this.currentHoverX,
      },
    };
    this.chart!.config.options = {
      ...chartData.options,
      plugins,
    };
    this.chart!.update();
    const sliderConfig = this.getSliderChartConfiguration(chartData);
    this.slider!.data = sliderConfig.data;
    this.slider!.config.options = sliderConfig.options;
    this.updateAxesLimits();
    this.slider!.update();
    this._eventStartX = undefined;
    this._eventEndX = undefined;
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
    this._eventEndX = undefined;
    this._eventStartX = undefined;
  }

  private getPositionOnChart(x: number) {
    if (!this.slider) {
      return 0;
    }
    const { max: xMax, min: xMin } = this.originalAxisLimits.x;
    const { left, right } = this.slider.chartArea;
    return left + ((right - left) * (x - xMin)) / (xMax - xMin);
  }

  private clipXCoordinate(x: number) {
    if (!this.slider) {
      return 0;
    }
    const { left, right } = this.slider.chartArea;
    return Math.min(right, Math.max(left, x));
  }

  private getCoordinateOnAxis(offsetX: number, { min, max }: Scale, { left, right }: Zone): number {
    if (offsetX <= right && offsetX >= left) {
      return Math.abs((offsetX - left) / (right - left)) * Math.abs(max - min) + min;
    }
    return 0;
  }

  private updateTrendLineAxis() {
    const xNewMin = this.chart?.config.options?.scales?.x?.min;
    const xNewMax = this.chart?.config.options?.scales?.x?.max;
    if (this.chart?.config.options?.scales?.[TREND_LINE_XAXIS_ID]) {
      const realRange = this.originalAxisLimits.x.max - this.originalAxisLimits.x.min;
      const trendOriginalRange =
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].max -
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].min;
      const conversionSlope = trendOriginalRange / realRange;
      const conversionIntercept =
        this.originalAxisLimits[TREND_LINE_XAXIS_ID].min -
        this.originalAxisLimits.x.min * conversionSlope;
      if (xNewMin !== undefined) {
        const newTrendMin = (xNewMin as number) * conversionSlope + conversionIntercept;
        this.chart.config.options.scales[TREND_LINE_XAXIS_ID].min = newTrendMin;
      } else {
        this.chart.config.options.scales[TREND_LINE_XAXIS_ID].min = undefined;
      }
      if (xNewMax !== undefined) {
        const newTrendMax = (xNewMax as number) * conversionSlope + conversionIntercept;
        this.chart.config.options.scales[TREND_LINE_XAXIS_ID].max = newTrendMax;
      } else {
        this.chart.config.options.scales[TREND_LINE_XAXIS_ID].max = undefined;
      }
    }
  }

  onWheelOnDetailChart(ev: WheelEvent) {
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
      this.updateTrendLineAxis();
      this.chart.update();
      this._eventStartX = this.getPositionOnChart(xNewMin);
      this._eventEndX = this.getPositionOnChart(xNewMax);
      this.slider!.update();
    }
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    this.clicked = "select";
    this.currentHoverX = undefined;
    let startX = ev.offsetX;
    const xMin = Math.min(this.eventStartX!, this.eventEndX!);
    const xMax = Math.max(this.eventStartX!, this.eventEndX!);
    if (
      (this._eventStartX !== undefined || this._eventEndX !== undefined) &&
      startX > xMin + 5 &&
      startX < xMax - 5
    ) {
      this._eventMoveX = startX;
      this.clicked = "move";
      this.panStartLimits = {
        x: { min: xMin, max: xMax },
      };
      return;
    }
    if (this.eventStartX !== undefined && Math.abs(startX - this.eventStartX) < 5) {
      this._eventStartX = this.eventEndX;
    } else if (this._eventEndX === undefined || Math.abs(startX - this._eventEndX) > 5) {
      this._eventStartX = this.clipXCoordinate(startX);
    }
    this._eventEndX = undefined;
    this.startX = this.getCoordinateOnAxis(
      this.eventStartX!,
      this.slider!.scales.x,
      this.slider!.chartArea
    );
  }

  onPointerMoveInMasterChart(ev: PointerEvent) {
    if (this.clicked === "select" && Math.abs(this.eventStartX! - ev.offsetX) > 5) {
      this._eventEndX = this.clipXCoordinate(ev.offsetX);
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    } else if (this.clicked === "move" && Math.abs(this._eventMoveX! - ev.offsetX) > 5) {
      const delta = this._eventMoveX! - ev.offsetX;
      this._eventStartX = this.clipXCoordinate(this.panStartLimits?.x.min! - delta);
      this._eventEndX = this.clipXCoordinate(this.panStartLimits?.x.max! - delta);
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    }
    if (this.chart && this.clicked !== "select") {
      const { top, bottom } = this.slider!.chartArea;
      const left = Math.min(this.eventStartX!, this.eventEndX!);
      const right = Math.max(this.eventStartX!, this.eventEndX!);
      this.currentHoverX =
        ev.offsetX < left || ev.offsetX > right || ev.offsetY < top || ev.offsetY > bottom
          ? undefined
          : this.getCoordinateOnAxis(ev.offsetX, this.slider!.scales.x, this.slider!.chartArea);
      this.chart.update();
    }
    const target = ev.target;
    if (!target) {
      return;
    }
    if (
      (this.eventStartX && Math.abs(this.eventStartX - ev.offsetX) < 5) ||
      (this.eventEndX && Math.abs(this.eventEndX - ev.offsetX) < 5)
    ) {
      //@ts-ignore
      target.style.cursor = "e-resize";
    } else {
      //@ts-ignore
      target.style.cursor = "crosshair";
    }
  }

  onPointerUpInMasterChart(ev: PointerEvent) {
    if (!this.clicked) {
      return;
    }
    if (this.clicked === "move") {
      let delta = ev.offsetX - this._eventMoveX!;
      if (delta < 0) {
        delta = Math.max(delta, this.panStartLimits?.x.min! - this.slider!.chartArea.left);
      } else {
        delta = Math.min(delta, this.slider!.chartArea.right - this.panStartLimits?.x.max!);
      }
      this._eventStartX = this.clipXCoordinate(this.panStartLimits?.x.min! - delta);
      this._eventEndX = this.clipXCoordinate(this.panStartLimits?.x.max! - delta);
      this.startX = this.getCoordinateOnAxis(
        this._eventStartX!,
        this.slider!.scales.x,
        this.slider!.chartArea
      );
      this.endX = this.getCoordinateOnAxis(
        this._eventEndX!,
        this.slider!.scales.x,
        this.slider!.chartArea
      );
      this.chart!.config.options!.scales!.x!.min = this.startX;
      this.chart!.config.options!.scales!.x!.max = this.endX;
      this.clicked = undefined;
    } else {
      this.endX = this.getCoordinateOnAxis(
        ev.offsetX,
        this.slider!.scales.x,
        this.slider!.chartArea
      );
      if (Math.abs(this._eventStartX! - this._eventEndX!) > 5) {
        const xMin = Math.min(this.startX!, this.endX);
        const xMax = Math.max(this.startX!, this.endX);
        this.chart!.config.options!.scales!.x!.min = xMin;
        this.chart!.config.options!.scales!.x!.max = xMax;
      } else {
        this.chart!.config.options!.scales!.x!.min = undefined;
        this.chart!.config.options!.scales!.x!.max = undefined;
        this._eventStartX = this.slider!.chartArea.left;
        this._eventEndX = this.slider!.chartArea.right;
      }
    }
    this.updateTrendLineAxis();
    this.chart!.update();
    this.slider!.update();
    this.clicked = undefined;
  }

  onMouseLeaveInMasterChart(ev: PointerEvent) {
    if (this.clicked) {
      this.onPointerUpInMasterChart(ev);
    }
    const target = ev.target;
    if (!target) {
      return;
    }
    //@ts-ignore
    ev.target.style.cursor = "default";
    this.currentHoverX = undefined;
    this.chart?.update();
  }

  onPointerDownInDetailChart(ev: PointerEvent) {
    this.panStartX = ev.offsetX;
    this.panStartLimits = {
      x: { min: this.chart!.scales.x.min, max: this.chart!.scales.x.max },
    };
  }

  onPointerMoveInDetailChart(ev: PointerEvent) {
    const panEndX = ev.offsetX;
    if (this.panStartX !== undefined && Math.abs(this.panStartX - panEndX) > 5) {
      const x = this.chart!.scales.x;
      const xMin = this.panStartLimits!.x.min;
      const xMax = this.panStartLimits!.x.max;
      const xStart = this.getCoordinateOnAxis(this.panStartX, x, this.chart!.chartArea);
      const xEnd = this.getCoordinateOnAxis(panEndX, x, this.chart!.chartArea);
      const delta = xEnd - xStart;
      const newXMin = xMin - delta;
      const newXMax = xMax - delta;
      if (newXMin >= this.originalAxisLimits.x.min && newXMax <= this.originalAxisLimits.x.max) {
        this.chart!.config.options!.scales!.x!.min = newXMin;
        this.chart!.config.options!.scales!.x!.max = newXMax;
        this.updateTrendLineAxis();
        this.chart!.update();
        this._eventStartX = this.getPositionOnChart(newXMin);
        this._eventEndX = this.getPositionOnChart(newXMax);
        this.slider!.update();
      }
    }
    const { left, right, bottom, top } = this.chart!.chartArea;
    const panEndY = ev.offsetY;
    if (panEndX >= left && panEndX <= right && panEndY >= top && panEndY <= bottom) {
      if (this.sliceable) {
        ev.stopPropagation();
        ev.preventDefault();
        //@ts-ignore
        ev.target.style.cursor = "move";
      } else {
        //@ts-ignore
        ev.target.style.cursor = "default";
      }
    }
  }

  get eventStartX() {
    return this._eventStartX ?? this.slider?.chartArea.left;
  }

  get eventEndX() {
    return this._eventEndX ?? this.slider?.chartArea.right;
  }

  onPointerUpInDetailChart() {
    this.panStartX = undefined;
  }
}
