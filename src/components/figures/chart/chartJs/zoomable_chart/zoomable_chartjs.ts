import { MASTER_CHART_HEIGHT } from "@odoo/o-spreadsheet-engine/constants";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { chartJsExtensionRegistry } from "../../../../../../packages/o-spreadsheet-engine/src/helpers/figures/charts/chart_js_extension";
import { clip } from "../../../../../helpers";
import { Store, useStore } from "../../../../../store_engine";
import { ChartJSRuntime } from "../../../../../types";
import { withZoom } from "../../../../helpers/zoom";
import { ChartJsComponent } from "../chartjs";
import { ZoomableChartStore } from "./zoomable_chart_store";
import { zoomWindowPlugin } from "./zoomable_chartjs_plugins";

chartJsExtensionRegistry.add("zoomWindowPlugin", {
  register: (Chart) => Chart.register(zoomWindowPlugin),
  unregister: (Chart) => Chart.unregister(zoomWindowPlugin),
});

export class ZoomableChartJsComponent extends ChartJsComponent {
  static template = "o-spreadsheet-ZoomableChartJsComponent";

  private store!: Store<ZoomableChartStore>;

  private masterChartCanvas = useRef("masterChartCanvas");
  private masterChart?: Chart;
  private mode?: "selectInMaster" | "moveInMaster";
  private hasLinearScale?: boolean;
  private isBarChart?: boolean;
  private chartId: string = "";
  private datasetBoundaries: { xMin: number; xMax: number } = { xMin: 0, xMax: 0 };
  private removeEventListeners = () => {};

  setup() {
    this.store = useStore(ZoomableChartStore);
    super.setup();
  }

  protected unmount() {
    super.unmount();
    this.masterChart?.destroy();
    this.removeEventListeners();
  }

  get containerStyle() {
    const height = this.sliceable ? `calc(100% - ${MASTER_CHART_HEIGHT}px)` : "100%";
    return `
      height:${height};
    `;
  }

  get sliceable(): boolean {
    if (this.props.isFullScreen) {
      return true;
    }
    const definition = this.env.model.getters.getChartDefinition(this.props.chartId);
    return ("zoomable" in definition && definition?.zoomable) ?? false;
  }

  get axisOffset(): number {
    return !this.hasLinearScale && this.isBarChart ? 0.5 : 0;
  }

  private getMasterChartConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    const config = chartData;
    return {
      ...config,
      options: {
        ...config.options,
        plugins: {
          ...config.options.plugins,
          zoomWindowPlugin: {
            getLowerBound: () => this.lowerBound,
            getUpperBound: () => this.upperBound,
          },
        },
      },
    };
  }

  private getDetailChartConfiguration(chartData: ChartConfiguration<any>): ChartConfiguration<any> {
    if (!this.sliceable) {
      return chartData;
    }
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
        scales: {
          ...chartData.options.scales,
          x: xScale,
        },
        layout: {
          ...chartData.options.layout,
          padding: {
            ...chartData.options.layout?.padding,
            bottom: 5,
          },
        },
      },
    };
  }

  private getAxisLimitsFromDataset(chartData: ChartConfiguration<any>): {
    xMin: number;
    xMax: number;
  } {
    const data = chartData.data.datasets.map((ds) => ds.data).flat();
    const xValues = data.map((d, i) => (typeof d === "object" && d !== null ? d.x : i));
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    return { xMin, xMax };
  }

  protected createChart(chartRuntime: ChartJSRuntime) {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    const chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    this.isBarChart = chartData.type === "bar";
    this.chartId = `${chartData.type}-${this.props.chartId}`;
    this.datasetBoundaries = this.getAxisLimitsFromDataset(chartData);

    if (this.sliceable) {
      const updatedData = this.getDetailChartConfiguration(chartData);
      chartRuntime.chartJsConfig = updatedData;
    }

    super.createChart(chartRuntime);
    this.hasLinearScale = this.chart?.scales?.x.type === "linear";
    if (!this.sliceable || !("masterChartConfig" in chartRuntime)) {
      return;
    }

    this.masterChart?.destroy();
    const masterChartCtx = (this.masterChartCanvas!.el as HTMLCanvasElement).getContext("2d")!;

    this.masterChart = new globalThis.Chart(
      masterChartCtx,
      this.getMasterChartConfiguration(chartRuntime["masterChartConfig"] as ChartConfiguration<any>)
    );
    this.resetAxesLimits();
    if (this.chart?.options) {
      this.chart.options.animation = false;
    }
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    const chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    const newDatasetBoundaries = this.getAxisLimitsFromDataset(chartData);
    if (
      this.datasetBoundaries.xMin !== newDatasetBoundaries.xMin ||
      this.datasetBoundaries.xMax !== newDatasetBoundaries.xMax
    ) {
      this.store.clearAxisLimits(this.chartId);
      this.datasetBoundaries = newDatasetBoundaries;
    }
    this.isBarChart = chartData?.type === "bar";
    this.chartId = `${chartData.type}-${this.props.chartId}`;

    if (this.sliceable) {
      const updatedData = this.getDetailChartConfiguration(chartData);
      chartRuntime.chartJsConfig = updatedData;
    }

    super.updateChartJs(chartRuntime);
    this.hasLinearScale = this.chart?.scales?.x.type === "linear";
    if (!this.sliceable || !("masterChartConfig" in chartRuntime)) {
      this.masterChart = undefined;
    } else {
      const masterChartConfig = this.getMasterChartConfiguration(
        chartRuntime["masterChartConfig"] as ChartConfiguration<any>
      );
      if (!this.masterChart) {
        const masterChartCtx = (this.masterChartCanvas!.el as HTMLCanvasElement).getContext("2d")!;
        this.masterChart = new globalThis.Chart(masterChartCtx, masterChartConfig);
      } else {
        this.masterChart.data = masterChartConfig.data;
        this.masterChart.config.options = masterChartConfig.options;
        this.masterChart.update();
      }
    }
    this.resetAxesLimits();
    if (this.chart?.options) {
      this.chart.options.animation = false;
    }
  }

  private resetAxesLimits() {
    if (!this.chart) {
      return;
    }
    const previousAxisLimits = this.store.originalAxisLimits[this.chartId];
    if (previousAxisLimits?.x?.min === undefined && previousAxisLimits?.x?.max === undefined) {
      let scales: { [key: string]: { min: number; max: number } } = this.masterChart
        ? this.masterChart.scales
        : this.chart.scales;
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
    if (!this.masterChart) {
      return;
    }
    this.masterChart.update();
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
    if (value === undefined || !this.masterChart?.scales?.x) {
      return undefined;
    }
    const scale = this.masterChart.scales.x;
    if (this.hasLinearScale) {
      return scale.getPixelForValue(value);
    }
    if (!this.masterChart.chartArea) {
      return undefined;
    }
    const { left, right } = this.masterChart.chartArea;
    const { min, max } = scale;
    const offset = this.axisOffset;
    return left + ((right - left) * (offset + value - min)) / (2 * offset + max - min);
  }

  private computeCoordinate(position: number): number | undefined {
    if (!this.masterChart) {
      return undefined;
    }
    const scale = this.masterChart.scales.x;
    if (this.hasLinearScale) {
      const value = scale.getValueForPixel(position);
      if (value === undefined) {
        return undefined;
      }
      return Math.round(value * 100) / 100;
    }
    const { left, right } = this.masterChart.chartArea;
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
    this.masterChart?.update();
    this.chart?.update();
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    this.removeEventListeners();
    const zoomedEvent = withZoom(this.env, ev, this.masterChartCanvas.el?.getBoundingClientRect());
    const position = zoomedEvent.offsetX;
    if (!this.masterChart?.chartArea || !this.chart?.scales?.x) {
      return;
    }
    const { left, right, top, bottom } = this.masterChart.chartArea;
    const xMax = this.upperBound ?? right;
    const xMin = this.lowerBound ?? left;
    if (
      position < left - 5 ||
      position > right + 5 ||
      zoomedEvent.offsetY < top ||
      zoomedEvent.offsetY > bottom
    ) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    let startingPositionOnChart: number, windowSize: number, startX: number | undefined;
    const startingEventPosition = position;
    if ((xMin !== left || xMax !== right) && position > xMin + 5 && position < xMax - 5) {
      startingPositionOnChart = zoomedEvent.offsetX - xMin;
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
      const { left, right } = this.masterChart!.chartArea;
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
      const zoomedEvent = withZoom(
        this.env,
        ev,
        this.masterChartCanvas.el?.getBoundingClientRect()
      );
      const position = zoomedEvent.offsetX;
      if (Math.abs(position - startingEventPosition) < 5) {
        return;
      }
      const { min: xMin, max: xMax } = computeNewAxisLimits(position);
      if (xMin !== undefined && xMax !== undefined) {
        this.updateAxisLimits(xMin, xMax);
      }
    };

    const onPointerUpInMasterChart = (ev: PointerEvent) => {
      this.removeEventListeners();
      const zoomedEvent = withZoom(
        this.env,
        ev,
        this.masterChartCanvas.el?.getBoundingClientRect()
      );
      const position = zoomedEvent.offsetX;
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
    };
    this.removeEventListeners = () => {
      window.removeEventListener("pointermove", onDragFromMasterChart, true);
      window.removeEventListener("pointerup", onPointerUpInMasterChart, true);
    };

    window.addEventListener("pointermove", onDragFromMasterChart, true);
    window.addEventListener("pointerup", onPointerUpInMasterChart, true);
  }

  onPointerMoveInMasterChart(ev: PointerEvent) {
    const { offsetX: x, offsetY: y } = withZoom(
      this.env,
      ev,
      (ev.target as HTMLElement)?.getBoundingClientRect()
    );
    if (this.mode === undefined) {
      const target = ev.target!;
      if (!this.masterChart?.chartArea) {
        target["style"].cursor = "default";
        return;
      }
      const { left, right, top, bottom } = this.masterChart.chartArea;
      const start = this.lowerBound ?? left;
      const end = this.upperBound ?? right;
      if (y < top || y > bottom) {
        target["style"].cursor = "default";
      } else if (Math.abs(start - x) < 5 || Math.abs(end - x) < 5) {
        target["style"].cursor = "ew-resize";
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
    const zoomedEvent = withZoom(this.env, ev, this.masterChartCanvas.el?.getBoundingClientRect());
    const position = zoomedEvent.offsetX;
    if (!this.masterChart?.chartArea || !this.chart?.scales.x) {
      return;
    }
    const { left, right, top, bottom } = this.masterChart.chartArea;
    let upperBound = this.upperBound ?? right;
    let lowerBound = this.lowerBound ?? left;
    if (upperBound < lowerBound) {
      [upperBound, lowerBound] = [lowerBound, upperBound];
    }
    if (
      position < left - 5 ||
      position > right + 5 ||
      zoomedEvent.offsetY < top ||
      zoomedEvent.offsetY > bottom
    ) {
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
