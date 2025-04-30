import { useRef } from "@odoo/owl";
import { Chart, ChartConfiguration, Scale } from "chart.js/auto";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../../../../../helpers/figures/charts/chart_common";
import { Zone } from "../../../../../types";
import { isCtrlKey } from "../../../../helpers/dom_helpers";
import { chartJsExtensionRegistry, getChartJSConstructor } from "../chart_js_extension";
import { ChartJsComponent } from "../chartjs";
import { currentlyShownArea, hoveredPosition } from "./zoomable_chartjs_plugins";

chartJsExtensionRegistry
  .add("currentlyShownArea", currentlyShownArea)
  .add("hoveredPosition", hoveredPosition);

export class ZoomableChartJsComponent extends ChartJsComponent {
  static template = "o-spreadsheet-ZoomableChartJsComponent";

  private sliderCanvas = useRef("graphSlider");
  private slider?: Chart;
  private _eventStartX: number | undefined = undefined;
  private _eventEndX: number | undefined = undefined;
  private _eventMoveX: number | undefined = undefined;
  private panStartX?: number;
  private panStartLimits?: { x: { min: number; max: number } };
  private clicked?: "selectInMaster" | "moveInMaster" | "moveInDetail";
  private currentHoverX?: number;
  private originalAxisLimits: {
    x: { min: number; max: number };
    [TREND_LINE_XAXIS_ID]: { min: number; max: number };
    [MOVING_AVERAGE_TREND_LINE_XAXIS_ID]: { min: number; max: number };
  } = {
    x: { min: 0, max: 0 },
    [TREND_LINE_XAXIS_ID]: { min: 0, max: 0 },
    [MOVING_AVERAGE_TREND_LINE_XAXIS_ID]: { min: 0, max: 0 },
  };

  get containerStyle() {
    const height = this.sliceable ? "calc(100% - 70px)" : "100%";
    return `
      height:${height};
    `;
  }

  get sliderStyle() {
    return `
      height:70px;
      margin-left:0px;
      margin-right:0px;
      margin-bottom:0px;
      border:1px solid #BBB;
    `;
  }

  get sliceable(): boolean {
    const runtime = this.chartRuntime;
    const zoomPlugin = runtime.chartJsConfig.options?.plugins?.zoom;
    if (!zoomPlugin?.enabled || !zoomPlugin.sliceable) {
      return false;
    }
    return true;
  }

  get eventStartX() {
    return this._eventStartX ?? this.slider?.chartArea.left;
  }

  get eventEndX() {
    return this._eventEndX ?? this.slider?.chartArea.right;
  }

  private getSliderConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    return {
      ...chartData,
      data: {
        ...chartData.data,
        datasets: chartData.data.datasets.filter(
          (ds) =>
            ds.xAxisID !== TREND_LINE_XAXIS_ID && ds.xAxisID !== MOVING_AVERAGE_TREND_LINE_XAXIS_ID
        ),
      },
      options: {
        ...chartData.options,
        hover: { mode: null },
        plugins: {
          title: { display: false },
          legend: { display: false },
          tooltip: { enabled: false },
          currentlyShownArea: {
            getLowerBound: (chart) => this.eventStartX ?? chart.chartArea.left,
            getUpperBound: (chart) => this.eventEndX ?? chart.chartArea.right,
          },
        },
        layout: {
          padding: {
            ...chartData.options.layout?.padding,
            top: 10,
            bottom: 10,
          },
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
            ticks: {
              ...chartData.options.scales?.x?.ticks,
              padding: 0,
              font: {
                size: 9,
              },
            },
          },
        },
      },
    };
  }

  private getDetailChartConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    return {
      ...chartData,
      options: {
        ...chartData.options,
        layout: {
          padding: {
            ...chartData.options.layout?.padding,
            bottom: 5,
          },
        },
        plugins: {
          ...chartData.options.plugins,
          hoveredPosition: {
            position: () => this.currentHoverX,
          },
        },
      },
    };
  }

  protected createChart(chartData: ChartConfiguration<any>) {
    super.createChart(this.getDetailChartConfiguration(chartData));
    if (!this.sliceable) {
      return;
    }
    this.resetAxesLimits();

    const Chart = getChartJSConstructor();
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.slider = new Chart(sliderCtx, this.getSliderConfiguration(chartData));
  }

  protected updateChartJs(chartData: ChartConfiguration<any>) {
    super.updateChartJs(this.getDetailChartConfiguration(chartData));
    if (!this.sliceable) {
      this.slider = undefined;
      return;
    }
    this.resetAxesLimits();

    const sliderConfig = this.getSliderConfiguration(chartData);
    if (!this.slider) {
      const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
      this.slider = new (getChartJSConstructor())(sliderCtx, sliderConfig);
    } else {
      this.slider.data = sliderConfig.data;
      this.slider.config.options = sliderConfig.options;
      this.slider.update();
    }
  }

  private resetAxesLimits() {
    if (!this.chart) {
      return;
    }
    for (const axisId in this.originalAxisLimits) {
      if (this.chart.scales[axisId]) {
        this.originalAxisLimits[axisId].min = this.chart.scales[axisId].min;
        this.originalAxisLimits[axisId].max = this.chart.scales[axisId].max;
      }
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

  private clipXCoordinate(x: number): number | undefined {
    if (!this.slider) {
      return undefined;
    }
    const { left, right } = this.slider.chartArea;
    if (x < left) {
      return left;
    } else if (x > right) {
      return right;
    }
    return x;
  }

  private clipDeltaInsideChart(delta: number): number | undefined {
    if (!this.slider) {
      return undefined;
    }
    if (delta > 0) {
      return Math.min(delta, this.panStartLimits?.x.min! - this.slider!.chartArea.left);
    }
    return Math.max(delta, this.panStartLimits?.x.max! - this.slider!.chartArea.right);
  }

  private getCoordinateOnAxis(offsetX: number, { min, max }: Scale, { left, right }: Zone): number {
    if (offsetX < left) {
      return min;
    } else if (offsetX > right) {
      return max;
    }
    return Math.abs((offsetX - left) / (right - left)) * Math.abs(max - min) + min;
  }

  private updateTrendingLineAxes() {
    for (const axisId of [TREND_LINE_XAXIS_ID, MOVING_AVERAGE_TREND_LINE_XAXIS_ID]) {
      if (!this.chart?.config.options?.scales?.[axisId]) {
        continue;
      }

      const realRange = this.originalAxisLimits.x.max - this.originalAxisLimits.x.min;
      const trendingRange =
        this.originalAxisLimits[axisId].max - this.originalAxisLimits[axisId].min;
      const slope = trendingRange / realRange;
      const intercept = this.originalAxisLimits[axisId].min - this.originalAxisLimits.x.min * slope;

      const newXMin = this.chart?.config.options?.scales?.x?.min;
      this.chart.config.options.scales[axisId].min =
        newXMin !== undefined ? (newXMin as number) * slope + intercept : undefined;

      const newXMax = this.chart?.config.options?.scales?.x?.max;
      this.chart.config.options.scales[axisId].max =
        newXMax !== undefined ? (newXMax as number) * slope + intercept : undefined;
    }
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    this.currentHoverX = undefined;
    let startX = ev.offsetX;
    const xMin = Math.min(this.eventStartX!, this.eventEndX!);
    const xMax = Math.max(this.eventStartX!, this.eventEndX!);
    const { left, right } = this.slider!.chartArea;
    if (
      (this.eventStartX !== left || this.eventEndX !== right) &&
      startX > xMin + 5 &&
      startX < xMax - 5
    ) {
      this._eventMoveX = startX;
      this.clicked = "moveInMaster";
      this.panStartLimits = {
        x: { min: xMin, max: xMax },
      };
      return;
    }
    this.clicked = "selectInMaster";
    if (Math.abs(startX - this.eventStartX!) < 5) {
      this._eventStartX = this.eventEndX;
    } else if (Math.abs(startX - this.eventEndX!) < 5) {
      if (this._eventStartX === undefined) {
        this._eventStartX = this.eventStartX;
      }
    } else {
      this._eventStartX = this.clipXCoordinate(startX);
    }
    this._eventEndX = undefined;
  }

  onPointerMoveInMasterChart(ev: PointerEvent) {
    if (this.clicked === "selectInMaster" && Math.abs(this.eventStartX! - ev.offsetX) > 5) {
      this._eventEndX = this.clipXCoordinate(ev.offsetX);
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    } else if (this.clicked === "moveInMaster" && Math.abs(this._eventMoveX! - ev.offsetX) > 5) {
      const delta = this.clipDeltaInsideChart(this._eventMoveX! - ev.offsetX)!;
      this._eventStartX = this.clipXCoordinate(this.panStartLimits?.x.min! - delta);
      this._eventEndX = this.clipXCoordinate(this.panStartLimits?.x.max! - delta);
      this.slider!.update();
      ev.stopPropagation();
      ev.preventDefault();
    }
    const { top, bottom, left, right } = this.slider!.chartArea;
    const start = Math.min(this.eventStartX!, this.eventEndX!);
    const end = Math.max(this.eventStartX!, this.eventEndX!);
    this.currentHoverX =
      ev.offsetX < start || ev.offsetX > end || ev.offsetY < top || ev.offsetY > bottom
        ? undefined
        : this.getCoordinateOnAxis(ev.offsetX, this.slider!.scales.x, this.slider!.chartArea);
    this.chart!.update();
    const target = ev.target;
    if (!target) {
      return;
    }
    if (Math.abs(start - ev.offsetX) < 5 || Math.abs(end - ev.offsetX) < 5) {
      target["style"].cursor = "e-resize";
    } else if (start < ev.offsetX && ev.offsetX < end && (start !== left || end !== right)) {
      target["style"].cursor = "grab";
    } else {
      target["style"].cursor = "crosshair";
    }
  }

  onPointerUpInMasterChart(ev: PointerEvent) {
    if (!this.clicked) {
      return;
    }
    let xMin: number | undefined = undefined;
    let xMax: number | undefined = undefined;
    if (this.clicked === "moveInMaster") {
      const delta = this.clipDeltaInsideChart(this._eventMoveX! - ev.offsetX)!;
      this._eventStartX = this.clipXCoordinate(this.panStartLimits?.x.min! - delta);
      this._eventEndX = this.clipXCoordinate(this.panStartLimits?.x.max! - delta);
    } else {
      this._eventEndX = this.clipXCoordinate(ev.offsetX);
    }
    if (this.clicked === "selectInMaster" && Math.abs(this._eventStartX! - this._eventEndX!) <= 5) {
      this._eventStartX = this.slider!.chartArea.left;
      this._eventEndX = this.slider!.chartArea.right;
    } else {
      const startX = this.getCoordinateOnAxis(
        this._eventStartX!,
        this.slider!.scales.x,
        this.slider!.chartArea
      );
      const endX = this.getCoordinateOnAxis(
        this._eventEndX!,
        this.slider!.scales.x,
        this.slider!.chartArea
      );
      xMin = Math.min(startX, endX);
      xMax = Math.max(startX, endX);
    }
    this.chart!.config.options!.scales!.x!.min = xMin;
    this.chart!.config.options!.scales!.x!.max = xMax;
    this.updateTrendingLineAxes();
    this.chart!.update();
    this.slider!.update();
    this.clicked = undefined;
  }

  onMouseLeaveMasterChart(ev: PointerEvent) {
    if (this.clicked) {
      this.onPointerUpInMasterChart(ev);
    }
    const target = ev.target;
    if (!target) {
      return;
    }
    target["style"].cursor = "default";
    this.currentHoverX = undefined;
    this.chart?.update();
  }

  onPointerDownInDetailChart(ev: PointerEvent) {
    if (!isCtrlKey(ev)) {
      return;
    }
    const { left, right, bottom, top } = this.chart!.chartArea;
    const panStartX = ev.offsetX;
    const panStartY = ev.offsetY;
    if (panStartX >= left && panStartX <= right && panStartY >= top && panStartY <= bottom) {
      this.panStartX = panStartX;
      this.panStartLimits = {
        x: { min: this.chart!.scales.x.min, max: this.chart!.scales.x.max },
      };
      this.clicked = "moveInDetail";
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  onPointerMoveInDetailChart(ev: PointerEvent) {
    if (!isCtrlKey(ev)) {
      ev.target!["style"].cursor = "default";
      return;
    }
    const { left, right, bottom, top } = this.chart!.chartArea;
    const panEndY = ev.offsetY;
    const panEndX = ev.offsetX;
    if (panEndX >= left && panEndX <= right && panEndY >= top && panEndY <= bottom) {
      if (this.sliceable) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.target!["style"].cursor = "move";
      } else {
        ev.target!["style"].cursor = "default";
      }
    }
    if (this.clicked !== "moveInDetail") {
      return;
    }
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
        this.updateTrendingLineAxes();
        this.chart!.update();
        this._eventStartX = this.getPositionOnChart(newXMin);
        this._eventEndX = this.getPositionOnChart(newXMax);
        this.slider?.update();
      }
    }
  }

  onPointerUpInDetailChart() {
    this.panStartX = undefined;
    this.clicked = undefined;
    const target = this.canvas.el;
    if (!target) {
      return;
    }
    target["style"].cursor = "default";
  }

  onWheelOnDetailChart(ev: WheelEvent) {
    if (!isCtrlKey(ev)) {
      return;
    }
    const zoomPlugin = this.chart?.config.options?.plugins?.zoom;
    if (!this.chart || !zoomPlugin?.enabled || !zoomPlugin.wheelable) {
      return;
    }

    const xAxis = this.chart.scales!["x"];
    const { min: xMin, max: xMax } = xAxis;
    const xMean = this.getCoordinateOnAxis(ev.offsetX, xAxis, this.chart.chartArea);
    const xRange = xMax - xMin;
    const newXRange = xRange * (ev.deltaY < 0 ? 0.975 : 1.025);
    const xNewMin = Math.max(
      xMean - (xMean - xMin) * (newXRange / xRange),
      this.originalAxisLimits.x.min
    );
    const xNewMax = Math.min(
      xMean + (xMax - xMean) * (newXRange / xRange),
      this.originalAxisLimits.x.max
    );

    this.chart.config.options!.scales!.x!.min = xNewMin;
    this.chart.config.options!.scales!.x!.max = xNewMax;
    this.updateTrendingLineAxes();
    this.chart.update();

    this._eventStartX = this.getPositionOnChart(xNewMin);
    this._eventEndX = this.getPositionOnChart(xNewMax);
    this.slider?.update();

    ev.stopPropagation();
    ev.preventDefault();
  }
}
