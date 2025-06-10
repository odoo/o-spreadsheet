import { useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { CHART_ZOOM_SLIDER_HEIGHT } from "../../../../../constants";
import { clip } from "../../../../../helpers";
import {
  isTrendLineAxis,
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../../../../../helpers/figures/charts/chart_common";
import { Store, useStore } from "../../../../../store_engine";
import { css } from "../../../../helpers";
import { isCtrlKey } from "../../../../helpers/dom_helpers";
import { chartJsExtensionRegistry } from "../chart_js_extension";
import { ChartJsComponent } from "../chartjs";
import { ZoomableChartStore } from "./zoomable_chart_store";
import { currentlyShownArea, hoveredPosition } from "./zoomable_chartjs_plugins";

css/* scss */ `
  .o-spreadsheet {
    .o-chart-zoomable-slicer {
      height: ${CHART_ZOOM_SLIDER_HEIGHT}px;
      margin-left: 0px;
      margin-right: 0px;
      margin-bottom: 0px;
    }
  }
`;

chartJsExtensionRegistry.add("currentlyShownArea", {
  register: (Chart) => Chart.register(currentlyShownArea),
  unregister: (Chart) => Chart.unregister(currentlyShownArea),
});
chartJsExtensionRegistry.add("hoveredPosition", {
  register: (Chart) => Chart.register(hoveredPosition),
  unregister: (Chart) => Chart.unregister(hoveredPosition),
});

export class ZoomableChartJsComponent extends ChartJsComponent {
  static template = "o-spreadsheet-ZoomableChartJsComponent";

  private store!: Store<ZoomableChartStore>;

  private sliderCanvas = useRef("graphSlider");
  private slider?: Chart;
  private mode?: "selectInMaster" | "moveInMaster" | "moveInDetail";
  private currentHoverX?: number;
  private hasLinearScale?: boolean;

  setup() {
    this.store = useStore(ZoomableChartStore);
    super.setup();
  }

  get containerStyle() {
    const height = this.sliceable ? `calc(100% - ${CHART_ZOOM_SLIDER_HEIGHT}px)` : "100%";
    return `
      height:${height};
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

  private getSliderConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    return {
      ...chartData,
      data: {
        ...chartData.data,
        datasets: chartData.data.datasets
          .filter((ds) => !isTrendLineAxis(ds.xAxisID))
          .map((ds) => ({
            ...ds,
            pointRadius: Math.min(ds.pointRadius ?? 0, 1.5),
            borderWidth: 1.5,
          })),
      },
      options: {
        ...chartData.options,
        hover: { mode: null },
        plugins: {
          title: { display: false },
          legend: { display: false },
          tooltip: { enabled: false },
          currentlyShownArea: {
            getLowerBound: () => this.lowerBound,
            getUpperBound: () => this.upperBound,
          },
        },
        layout: {
          padding: {
            ...chartData.options.layout?.padding,
            top: 5,
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
    const xAxis = this.store.currentAxisLimits[this.props.figureUI.id];
    let xScale = {
      ...chartData.options.scales?.x,
    };
    if (xAxis?.min !== undefined) {
      xScale = {
        ...xScale,
        min: this.hasLinearScale ? xAxis.min : Math.ceil(xAxis.min) - 0.5,
      };
    }
    if (xAxis?.max !== undefined) {
      xScale = {
        ...xScale,
        max: this.hasLinearScale ? xAxis.max : Math.floor(xAxis.max) - 0.5,
      };
    }
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
        scales: {
          ...chartData.options.scales,
          x: xScale,
        },
      },
    };
  }

  protected createChart(chartData: ChartConfiguration<any>) {
    const allowAnimation =
      this.env.model.getters.isDashboard() &&
      this.animationStore &&
      chartData.options?.plugins?.zoom?.enabled;
    let updatedData = this.getDetailChartConfiguration(chartData);
    if (allowAnimation) {
      updatedData = this.enableAnimationInChartData(updatedData);
      this.animationStore!.enableAnimationForChart(this.animationFigureId);
    }
    super.createChart(updatedData);
    this.hasLinearScale = this.chart!.scales?.x.type === "linear";
    if (!this.sliceable) {
      return;
    }

    this.slider?.destroy();
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.slider = new window.Chart(sliderCtx, this.getSliderConfiguration(chartData));
    this.resetAxesLimits();
  }

  protected updateChartJs(chartData: ChartConfiguration<any>) {
    const allowAnimation =
      this.env.model.getters.isDashboard() &&
      this.animationStore &&
      chartData.options?.plugins?.zoom?.enabled;
    let updatedData = this.getDetailChartConfiguration(chartData);
    if (allowAnimation) {
      updatedData = this.enableAnimationInChartData(updatedData);
      this.animationStore!.enableAnimationForChart(this.animationFigureId);
    }
    super.updateChartJs(updatedData);
    this.hasLinearScale = this.chart!.scales?.x.type === "linear";
    if (!this.sliceable) {
      this.slider = undefined;
    } else {
      const sliderConfig = this.getSliderConfiguration(chartData);
      if (!this.slider) {
        const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
        this.slider = new window.Chart(sliderCtx, sliderConfig);
      } else {
        this.slider.data = sliderConfig.data;
        this.slider.config.options = sliderConfig.options;
        this.slider.update();
      }
    }
    this.resetAxesLimits();
  }

  private resetAxesLimits() {
    if (!this.chart) {
      return;
    }
    const previousAxisLimits = this.store.originalAxisLimits[this.props.figureUI.id];
    if (previousAxisLimits?.x?.min === undefined && previousAxisLimits?.x?.max === undefined) {
      let scales: { [key: string]: { min: number | undefined; max: number | undefined } } =
        this.chart.scales;
      if (!this.hasLinearScale) {
        scales = {
          ...scales,
          x: {
            min: scales?.x?.min !== undefined ? Math.ceil(scales.x.min) - 0.5 : undefined,
            max: scales?.x?.max !== undefined ? Math.floor(scales.x.max) + 0.5 : undefined,
          },
        };
      }
      this.store.resetAxisLimits(this.props.figureUI.id, scales);
      return;
    }
    this.updateTrendingLineAxes();
    this.chart.update();
    if (!this.slider) {
      return;
    }
    this.slider.update();
  }

  private updateTrendingLineAxes() {
    this.store.updateTrendLineConfiguration(this.props.figureUI.id);
    const config = this.store.trendLineAxisLimits[this.props.figureUI.id];
    for (const axisId of [TREND_LINE_XAXIS_ID, MOVING_AVERAGE_TREND_LINE_XAXIS_ID]) {
      if (!this.chart?.config.options?.scales?.[axisId] || !config?.[axisId]) {
        continue;
      }
      this.chart.config.options.scales[axisId].min = config[axisId].min;
      this.chart.config.options.scales[axisId].max = config[axisId].max;
    }
  }

  get upperBound(): number | undefined {
    return this.computePosition(
      this.store.currentAxisLimits[this.props.figureUI.id]?.max,
      this.slider?.chartArea.right
    );
  }

  get lowerBound(): number | undefined {
    return this.computePosition(
      this.store.currentAxisLimits[this.props.figureUI.id]?.min,
      this.slider?.chartArea.left
    );
  }

  private computePosition(
    value: number | undefined,
    defaultValue: number | undefined
  ): number | undefined {
    if (value === undefined || !this.slider?.scales?.x) {
      return defaultValue;
    }
    const scale = this.slider.scales.x;
    if (this.hasLinearScale) {
      return scale.getPixelForValue(value);
    }
    const { left, right } = this.slider!.chartArea;
    const { min, max } = scale;
    return left + ((right - left) * (0.5 + value - min)) / (1 + max - min);
  }

  private computeCoordinate(position: number): number | undefined {
    if (!this.slider) {
      return undefined;
    }
    const scale = this.slider.scales.x;
    if (this.hasLinearScale) {
      return scale.getValueForPixel(position);
    }
    const { left, right } = this.slider.chartArea;
    return scale.min - 0.5 + ((scale.max + 1 - scale.min) * (position - left)) / (right - left);
  }

  private updateAxisLimits(xMin: number, xMax: number) {
    if (!this.hasLinearScale) {
      this.chart!.config.options!.scales!.x!.min = Math.ceil(xMin);
      this.chart!.config.options!.scales!.x!.max = Math.floor(xMax);
    } else {
      this.chart!.config.options!.scales!.x!.min = xMin;
      this.chart!.config.options!.scales!.x!.max = xMax;
    }
    this.store.updateAxisLimits(this.props.figureUI.id, { min: xMin, max: xMax });
    this.updateTrendingLineAxes();
    this.slider?.update();
    this.chart?.update();
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    this.currentHoverX = undefined;
    const position = ev.offsetX;
    const xMax = this.upperBound!;
    const xMin = this.lowerBound!;
    const { left, right, top, bottom } = this.slider!.chartArea;
    if (position < left || position > right || ev.offsetY < top || ev.offsetY > bottom) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    let startingPosition: number, windowSize: number, startX: number | undefined;
    if ((xMin !== left || xMax !== right) && position > xMin + 5 && position < xMax - 5) {
      startingPosition = ev.offsetX - xMin;
      this.mode = "moveInMaster";
      windowSize = this.chart!.scales.x.max - this.chart!.scales.x.min;
    } else {
      this.mode = "selectInMaster";
      if (Math.abs(position - xMin) < 5) {
        startingPosition = xMax;
      } else if (Math.abs(position - xMax) < 5) {
        startingPosition = xMin;
      } else {
        startingPosition = clip(position, left, right);
      }
      startX = this.computeCoordinate(startingPosition);
    }
    const originalXMin = this.store.originalAxisLimits[this.props.figureUI.id].x.min!;
    const originalXMax = this.store.originalAxisLimits[this.props.figureUI.id].x.max!;

    const computeNewAxisLimits = (position: number) => {
      let xMin: number | undefined, xMax: number | undefined;
      const { left, right } = this.slider!.chartArea;
      if (this.mode === "moveInMaster") {
        xMin = this.computeCoordinate(position - startingPosition)!;
        xMax = xMin + windowSize;
        if (!this.hasLinearScale) {
          xMax++;
        }
        if (xMin < originalXMin) {
          const fix = originalXMin - xMin;
          xMin = originalXMin;
          xMax += fix;
        } else if (xMax > originalXMax) {
          const fix = xMax - originalXMax;
          xMax = originalXMax;
          xMin -= fix;
        }
      } else if (this.mode === "selectInMaster") {
        const upperBound = clip(position, left, right);
        if (Math.abs(startingPosition - upperBound) > 5) {
          const endX = this.computeCoordinate(upperBound);
          if (startX === undefined || endX === undefined) {
            return {};
          }
          xMin = Math.min(startX, endX);
          xMax = Math.max(startX, endX);
        }
      }
      return { min: xMin, max: xMax };
    };

    const onDragFromMasterChart = (ev: PointerEvent) => {
      const position = ev.clientX - (this.sliderCanvas.el?.getBoundingClientRect().left ?? 0);
      const { min: xMin, max: xMax } = computeNewAxisLimits(position);
      if (xMin !== undefined && xMax !== undefined) {
        this.updateAxisLimits(xMin, xMax);
      }
    };

    const onPointerUpInMasterChart = (ev: PointerEvent) => {
      let { min: xMin, max: xMax } = computeNewAxisLimits(ev.offsetX);
      if (xMin !== undefined && xMax !== undefined) {
        if (!this.hasLinearScale) {
          xMin = Math.ceil(xMin) - 0.5;
          xMax = Math.floor(xMax) + 0.5;
        }
        this.updateAxisLimits(xMin, xMax);
      }
      this.mode = undefined;
      window.removeEventListener("pointermove", onDragFromMasterChart, true);
      window.removeEventListener("pointerup", onPointerUpInMasterChart, true);
    };

    window.addEventListener("pointermove", onDragFromMasterChart, true);
    window.addEventListener("pointerup", onPointerUpInMasterChart, true);
  }

  onPointerMoveInMasterChart(ev: PointerEvent) {
    const position = ev.offsetX;
    if (this.mode === undefined) {
      const target = ev.target!;
      const { left, right } = this.slider!.chartArea;
      const start = this.lowerBound!;
      const end = this.upperBound!;
      this.currentHoverX = this.computeCoordinate(position);
      this.chart!.update();
      if (Math.abs(start - position) < 5 || Math.abs(end - position) < 5) {
        target["style"].cursor = "e-resize";
      } else if (start < position && position < end && (start !== left || end !== right)) {
        target["style"].cursor = "grab";
      } else {
        target["style"].cursor = "crosshair";
      }
    }
  }

  onMouseLeaveMasterChart(ev: PointerEvent) {
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
    if (panStartX < left || panStartX > right || panStartY < top || panStartY > bottom) {
      return;
    }
    const startingPosition = panStartX;
    const panStartLimits = { min: this.chart!.scales.x.min, max: this.chart!.scales.x.max };
    this.mode = "moveInDetail";
    ev.stopPropagation();
    ev.preventDefault();

    const onDragFromDetailChart = (ev: PointerEvent) => {
      if (!isCtrlKey(ev)) {
        return;
      }
      const panEndX = ev.clientX - (this.sliderCanvas.el?.getBoundingClientRect().left ?? 0);
      if (this.mode !== "moveInDetail") {
        return;
      }
      if (startingPosition !== undefined && Math.abs(startingPosition - panEndX) > 5) {
        const xScale = this.chart!.scales.x;
        const xStart = xScale.getValueForPixel(startingPosition);
        const xEnd = xScale.getValueForPixel(panEndX);
        const delta = xEnd! - xStart!;
        let newXMin = panStartLimits.min - delta;
        let newXMax = panStartLimits.max - delta;
        if (!this.hasLinearScale) {
          newXMin = Math.ceil(newXMin) - 0.5;
          newXMax = Math.floor(newXMax) + 0.5;
        }
        if (
          newXMin >= this.store.originalAxisLimits[this.props.figureUI.id].x.min! &&
          newXMax <= this.store.originalAxisLimits[this.props.figureUI.id].x.max!
        ) {
          this.updateAxisLimits(newXMin, newXMax);
        }
      }
    };

    const onPointerUpInDetailChart = () => {
      this.mode = undefined;
      window.removeEventListener("pointermove", onDragFromDetailChart, true);
      window.removeEventListener("pointerup", onPointerUpInDetailChart, true);
    };

    window.addEventListener("pointermove", onDragFromDetailChart, true);
    window.addEventListener("pointerup", onPointerUpInDetailChart, true);
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
  }

  onWheelOnDetailChart(ev: WheelEvent) {
    if (!isCtrlKey(ev) || this.env.isDashboard()) {
      return;
    }
    const zoomPlugin = this.chart?.config.options?.plugins?.zoom;
    if (!this.chart || !zoomPlugin?.enabled || !zoomPlugin.wheelable) {
      return;
    }

    const xAxis = this.chart.scales!["x"];
    const { min: xMin, max: xMax } = xAxis;
    const xMean = xAxis.getValueForPixel(ev.offsetX)!;
    const xRange = xMax - xMin;
    const newXRange = xRange * (ev.deltaY < 0 ? 0.975 : 1.025);
    const xNewMin = Math.max(
      xMean - (xMean - xMin) * (newXRange / xRange),
      this.store.originalAxisLimits[this.props.figureUI.id].x.min!
    );
    const xNewMax = Math.min(
      xMean + (xMax - xMean) * (newXRange / xRange),
      this.store.originalAxisLimits[this.props.figureUI.id].x.max!
    );

    this.chart.config.options!.scales!.x!.min = xNewMin;
    this.chart.config.options!.scales!.x!.max = xNewMax;
    this.store.updateAxisLimits(this.props.figureUI.id, { min: xNewMin, max: xNewMax });
    this.updateTrendingLineAxes();
    this.chart.update();
    this.slider?.update();

    ev.stopPropagation();
    ev.preventDefault();
  }
}
