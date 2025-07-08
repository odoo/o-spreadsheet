import { useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { CHART_ZOOM_SLIDER_HEIGHT } from "../../../../../constants";
import { clip } from "../../../../../helpers";
import {
  isTrendLineAxis,
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
  truncateLabel,
} from "../../../../../helpers/figures/charts/chart_common";
import { Store, useStore } from "../../../../../store_engine";
import { css } from "../../../../helpers";
import { chartJsExtensionRegistry } from "../chart_js_extension";
import { ChartJsComponent } from "../chartjs";
import { ZoomableChartStore } from "./zoomable_chart_store";
import { slidingWindowPlugin } from "./zoomable_chartjs_plugins";

css/* scss */ `
  .o-spreadsheet {
    .o-master-chart-container {
      height: ${CHART_ZOOM_SLIDER_HEIGHT}px;
      margin-left: 0px;
      margin-right: 0px;
      margin-bottom: 0px;
    }
  }
`;

chartJsExtensionRegistry.add("slidingWindowPlugin", {
  register: (Chart) => Chart.register(slidingWindowPlugin),
  unregister: (Chart) => Chart.unregister(slidingWindowPlugin),
});

export class ZoomableChartJsComponent extends ChartJsComponent {
  static template = "o-spreadsheet-ZoomableChartJsComponent";

  private store!: Store<ZoomableChartStore>;

  private sliderCanvas = useRef("graphSlider");
  private slider?: Chart;
  private mode?: "selectInMaster" | "moveInMaster" | "moveInDetail";
  private hasLinearScale?: boolean;
  private isBarChart?: boolean;
  private chartId: string = "";

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
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    return ("zoomable" in definition && definition?.zoomable) ?? false;
  }

  get axisOffset(): number {
    return !this.hasLinearScale && this.isBarChart ? 0.5 : 0;
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
          slidingWindowPlugin: {
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
              callback: (value) => truncateLabel(this.chart?.scales?.x?.getLabelForValue(value), 5),
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
    const xAxis = this.store.currentAxesLimits[this.chartId]?.x;
    const xScale = {
      ...chartData.options.scales?.x,
    };
    if (xAxis?.min !== undefined) {
      xScale.min = this.hasLinearScale ? xAxis.min : Math.ceil(xAxis.min) - this.axisOffset;
    }
    if (xAxis?.max !== undefined) {
      xScale.max = this.hasLinearScale ? xAxis.max : Math.floor(xAxis.max) - this.axisOffset;
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
        scales: {
          ...chartData.options.scales,
          x: xScale,
        },
      },
    };
  }

  protected createChart(chartData: ChartConfiguration<any>) {
    this.isBarChart = chartData.type === "bar";
    const chartType = this.env.model.getters.getChartType(this.props.figureUI.id);
    this.chartId = `${chartType}-${this.props.figureUI.id}`;
    const updatedData = this.getDetailChartConfiguration(chartData);
    super.createChart(updatedData);
    this.hasLinearScale = this.chart?.scales?.x.type === "linear";
    if (!this.sliceable) {
      return;
    }

    this.slider?.destroy();
    const sliderCtx = (this.sliderCanvas!.el as HTMLCanvasElement).getContext("2d")!;
    this.slider = new window.Chart(sliderCtx, this.getSliderConfiguration(chartData));
    this.resetAxesLimits();
  }

  protected updateChartJs(chartData: ChartConfiguration<any>) {
    const chartType = this.env.model.getters.getChartType(this.props.figureUI.id);
    this.chartId = `${chartType}-${this.props.figureUI.id}`;
    this.isBarChart = chartData?.type === "bar";
    this.chartId = `${chartData.type}-${this.props.figureUI.id}`;
    const updatedData = this.getDetailChartConfiguration(chartData);
    super.updateChartJs(updatedData);
    this.hasLinearScale = this.chart?.scales?.x.type === "linear";
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
    const previousAxisLimits = this.store.originalAxisLimits[this.chartId];
    if (previousAxisLimits?.x?.min === undefined && previousAxisLimits?.x?.max === undefined) {
      let scales: { [key: string]: { min: number; max: number } } = this.chart.scales;
      if (!this.hasLinearScale && scales?.x) {
        scales = {
          ...scales,
          x: {
            min: Math.ceil(scales.x.min) - this.axisOffset,
            max: Math.floor(scales.x.max) + this.axisOffset,
          },
        };
      }
      this.store.resetAxisLimits(this.chartId, scales);
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
    this.store.updateTrendLineConfiguration(this.chartId);
    const config = this.store.currentAxesLimits[this.chartId];
    for (const axisId of [TREND_LINE_XAXIS_ID, MOVING_AVERAGE_TREND_LINE_XAXIS_ID]) {
      if (!this.chart?.config.options?.scales?.[axisId] || !config?.[axisId]) {
        continue;
      }
      this.chart.config.options.scales[axisId].min = config[axisId].min;
      this.chart.config.options.scales[axisId].max = config[axisId].max;
    }
  }

  get upperBound(): number | undefined {
    return this.computePosition(this.store.currentAxesLimits[this.chartId]?.x?.max);
  }

  get lowerBound(): number | undefined {
    return this.computePosition(this.store.currentAxesLimits[this.chartId]?.x?.min);
  }

  private computePosition(value: number | undefined): number | undefined {
    if (value === undefined || !this.slider?.scales?.x) {
      return undefined;
    }
    const scale = this.slider.scales.x;
    if (this.hasLinearScale) {
      return scale.getPixelForValue(value);
    }
    if (!this.slider.chartArea) {
      return undefined;
    }
    const { left, right } = this.slider.chartArea;
    const { min, max } = scale;
    const offset = this.axisOffset;
    return left + ((right - left) * (offset + value - min)) / (2 * offset + max - min);
  }

  private computeCoordinate(position: number): number | undefined {
    if (!this.slider) {
      return undefined;
    }
    const scale = this.slider.scales.x;
    if (this.hasLinearScale) {
      const value = scale.getValueForPixel(position);
      if (value === undefined) {
        return undefined;
      }
      return Math.round(value * 100) / 100;
    }
    const { left, right } = this.slider.chartArea;
    const offset = this.axisOffset;
    return (
      scale.min -
      offset +
      ((scale.max + 2 * offset - scale.min) * (position - left)) / (right - left)
    );
  }

  private updateAxisLimits(xMin: number, xMax: number) {
    if (!this.hasLinearScale) {
      this.chart!.config.options!.scales!.x!.min = Math.ceil(xMin);
      this.chart!.config.options!.scales!.x!.max = Math.floor(xMax);
    } else {
      this.chart!.config.options!.scales!.x!.min = xMin;
      this.chart!.config.options!.scales!.x!.max = xMax;
    }
    this.store.updateAxisLimits(this.chartId, { min: xMin, max: xMax });
    this.updateTrendingLineAxes();
    this.slider?.update();
    this.chart?.update();
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    const position = ev.offsetX;
    if (!this.slider?.chartArea || !this.chart?.scales.x) {
      return;
    }
    const { left, right, top, bottom } = this.slider.chartArea;
    const xMax = this.upperBound ?? right;
    const xMin = this.lowerBound ?? left;
    if (position < left - 5 || position > right + 5 || ev.offsetY < top || ev.offsetY > bottom) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    let startingPositionOnChart: number, windowSize: number, startX: number | undefined;
    const startingEventPosition =
      ev.clientX - (this.sliderCanvas.el?.getBoundingClientRect().left ?? 0);
    if ((xMin !== left || xMax !== right) && position > xMin + 5 && position < xMax - 5) {
      startingPositionOnChart = ev.offsetX - xMin;
      this.mode = "moveInMaster";
      const currentLimits = this.store.currentAxesLimits[this.chartId]?.x;
      windowSize =
        (currentLimits?.max ?? this.chart.scales.x.max) -
        (currentLimits?.min ?? this.chart.scales.x.min);
    } else {
      this.mode = "selectInMaster";
      if (Math.abs(position - xMin) < 5) {
        startingPositionOnChart = xMax;
      } else if (Math.abs(position - xMax) < 5) {
        startingPositionOnChart = xMin;
      } else {
        startingPositionOnChart = clip(position, left, right);
      }
      startX = this.computeCoordinate(startingPositionOnChart);
    }
    const originalXMin = this.store.originalAxisLimits[this.chartId].x!.min;
    const originalXMax = this.store.originalAxisLimits[this.chartId].x!.max;

    const computeNewAxisLimits = (position: number) => {
      let xMin: number | undefined, xMax: number | undefined;
      const { left, right } = this.slider!.chartArea;
      if (this.mode === "moveInMaster") {
        xMin = this.computeCoordinate(position - startingPositionOnChart)!;
        if (xMin < originalXMin) {
          xMin = originalXMin;
        } else if (xMin > originalXMax - windowSize) {
          xMin = originalXMax - windowSize;
        }
        xMax = xMin + windowSize;
      } else if (this.mode === "selectInMaster") {
        const upperBound = clip(position, left, right);
        if (Math.abs(startingPositionOnChart - upperBound) > 5) {
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
      if (Math.abs(position - startingEventPosition) < 5) {
        return;
      }
      const { min: xMin, max: xMax } = computeNewAxisLimits(position);
      if (xMin !== undefined && xMax !== undefined) {
        this.updateAxisLimits(xMin, xMax);
      }
    };

    const onPointerUpInMasterChart = (ev: PointerEvent) => {
      const position = ev.clientX - (this.sliderCanvas.el?.getBoundingClientRect().left ?? 0);
      if (Math.abs(position - startingEventPosition) > 5) {
        let { min: xMin, max: xMax } = computeNewAxisLimits(position);
        if (xMin !== undefined && xMax !== undefined) {
          if (!this.hasLinearScale) {
            if (this.mode === "moveInMaster" && windowSize && !this.isBarChart) {
              xMin = Math.round(xMin) - this.axisOffset;
              xMax = xMin + windowSize;
            } else {
              xMin = Math.ceil(xMin) - this.axisOffset;
              xMax = Math.floor(xMax) + this.axisOffset;
            }
          }
          this.updateAxisLimits(xMin, xMax);
        }
      }
      this.mode = undefined;
      window.removeEventListener("pointermove", onDragFromMasterChart, true);
      window.removeEventListener("pointerup", onPointerUpInMasterChart, true);
    };

    window.addEventListener("pointermove", onDragFromMasterChart, true);
    window.addEventListener("pointerup", onPointerUpInMasterChart, true);
  }

  onPointerMoveInMasterChart(ev: PointerEvent) {
    const { offsetX: x, offsetY: y } = ev;
    if (this.mode === undefined) {
      const target = ev.target!;
      if (!this.slider?.chartArea) {
        target["style"].cursor = "default";
        return;
      }
      const { left, right, top, bottom } = this.slider.chartArea;
      const start = this.lowerBound ?? left;
      const end = this.upperBound ?? right;
      if (y < top || y > bottom) {
        target["style"].cursor = "default";
      } else if (Math.abs(start - x) < 5 || Math.abs(end - x) < 5) {
        target["style"].cursor = "e-resize";
      } else if (start < x && x < end && (start !== left || end !== right)) {
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
  }

  onDoubleClickInMasterChart(ev: PointerEvent) {
    this.mode = undefined;
    const position = ev.offsetX;
    if (!this.slider?.chartArea || !this.chart?.scales.x) {
      return;
    }
    const { left, right, top, bottom } = this.slider.chartArea;
    let upperBound = this.upperBound ?? right;
    let lowerBound = this.lowerBound ?? left;
    if (upperBound < lowerBound) {
      [upperBound, lowerBound] = [lowerBound, upperBound];
    }
    if (position < left - 5 || position > right + 5 || ev.offsetY < top || ev.offsetY > bottom) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    let { min: xMin, max: xMax } =
      this.store.currentAxesLimits[this.chartId]?.x ?? this.chart.scales.x;
    const originalAxisLimits = this.store.originalAxisLimits[this.chartId].x;
    if (!originalAxisLimits) {
      return;
    }
    let originalXMin = originalAxisLimits.min;
    let originalXMax = originalAxisLimits.max;
    if (this.hasLinearScale) {
      originalXMin = Math.ceil(originalXMin) - this.axisOffset;
      originalXMax = Math.floor(originalXMax) + this.axisOffset;
    }
    if (Math.abs(position - lowerBound) < 5) {
      // Reset to original min
      xMin = originalXMin;
    } else if (Math.abs(position - upperBound) < 5) {
      xMax = originalXMax;
    } else if (lowerBound < position && position < upperBound) {
      // Reset to original limits
      xMin = originalXMin;
      xMax = originalXMax;
    } else {
      return;
    }
    this.updateAxisLimits(xMin, xMax);
  }
}
