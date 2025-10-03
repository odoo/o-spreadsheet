import { useRef } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { MASTER_CHART_HEIGHT } from "../../../../../constants";
import { clip } from "../../../../../helpers";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../../../../../helpers/figures/charts/chart_common";
import { Store, useStore } from "../../../../../store_engine";
import { ChartJSRuntime } from "../../../../../types";
import { FullScreenChartStore } from "../../../../full_screen_chart/full_screen_chart_store";
import { css } from "../../../../helpers";
import { chartJsExtensionRegistry } from "../chart_js_extension";
import { ChartJsComponent } from "../chartjs";
import { ZoomableChartStore } from "./zoomable_chart_store";
import { zoomWindowPlugin } from "./zoomable_chartjs_plugins";

css/* scss */ `
  .o-spreadsheet {
    .o-master-chart-container {
      height: ${MASTER_CHART_HEIGHT}px;
    }
  }
`;

chartJsExtensionRegistry.add("zoomWindowPlugin", {
  register: (Chart) => Chart.register(zoomWindowPlugin),
  unregister: (Chart) => Chart.unregister(zoomWindowPlugin),
});

interface Boundaries {
  min: number;
  max: number;
}

export class ZoomableChartJsComponent extends ChartJsComponent {
  static template = "o-spreadsheet-ZoomableChartJsComponent";

  private store!: Store<ZoomableChartStore>;
  private fullScreenChartStore!: Store<FullScreenChartStore>;

  private masterChartCanvas = useRef("masterChartCanvas");
  private masterChart?: Chart;
  private mode?: "selectInMaster" | "moveInMaster";
  private hasLinearScale?: boolean;
  private isBarChart?: boolean;
  private chartId: string = "";
  private datasetBoundaries: Boundaries = { min: 0, max: 0 };
  private removeEventListeners = () => {};

  setup() {
    this.store = useStore(ZoomableChartStore);
    this.fullScreenChartStore = useStore(FullScreenChartStore);
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

  get masterChartContainerStyle() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as ChartJSRuntime;
    if (runtime && !runtime.chartJsConfig.data.datasets.some((ds) => ds.data.length > 1)) {
      return "opacity: 0.3;";
    }
    return "";
  }

  get sliceable(): boolean {
    if (this.env.isDashboard()) {
      const fullScreenFigureId = this.fullScreenChartStore.fullScreenFigure?.id;
      const chartFigureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
      if (fullScreenFigureId === chartFigureId) {
        return true;
      }
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
    return {
      ...chartData,
      options: {
        ...chartData.options,
        scales: {
          ...chartData.options.scales,
          x: {
            ...chartData.options.scales?.x,
            ...this.computeMinMaxFromStore(),
          },
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

  private getAxisLimitsFromDataset(chartData: ChartConfiguration<any>): Boundaries {
    const data = chartData.data.datasets.map((ds) => ds.data).flat();
    const xValues = data.map((d, i) => (typeof d === "object" && d !== null ? d.x : i));
    const min = Math.min(...xValues);
    const max = Math.max(...xValues);
    return { min, max };
  }

  protected get shouldAnimate() {
    return this.env.model.getters.isDashboard() && !this.sliceable;
  }

  protected createChart(chartRuntime: ChartJSRuntime) {
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

    this.masterChart = new window.Chart(
      masterChartCtx,
      this.getMasterChartConfiguration(chartRuntime["masterChartConfig"] as ChartConfiguration<any>)
    );
    this.resetAxesLimits();
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    const chartData = chartRuntime.chartJsConfig as ChartConfiguration<any>;
    const { min, max } = this.getAxisLimitsFromDataset(chartData);
    if (this.datasetBoundaries.min !== min || this.datasetBoundaries.max !== max) {
      this.store.clearAxisLimits(this.chartId);
      this.datasetBoundaries = { min, max };
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
        this.masterChart = new window.Chart(masterChartCtx, masterChartConfig);
      } else {
        this.masterChart.data = masterChartConfig.data;
        this.masterChart.config.options = masterChartConfig.options;
        this.masterChart.update();
      }
    }
    this.resetAxesLimits();
  }

  private resetAxesLimits() {
    if (!this.chart) {
      return;
    }
    const storedLimits = this.store.originalAxisLimits[this.chartId]?.x;
    if (!storedLimits) {
      let scales: { [key: string]: Boundaries } = this.masterChart
        ? this.masterChart.scales
        : this.chart.scales;
      if (!this.hasLinearScale && scales?.x) {
        scales = {
          ...scales,
          x: this.computeMinMaxFromScale(scales.x),
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

  /* Compute min and max from the store, adjusting them if needed for non linear scales.
   * Getting the value from the store, we have to ensure that the values are integers for
   * non linear scales (bar and category), otherwise the zooming will be off. After rounding,
   * we have to adjust the values:
   *
   * When computing from the store, we adjust both min and max by substracting the axis offset,
   * because we stored the real displayed boundaries on the master chart (i.e. the greyed zone).
   * To select a bar in the chart, we have to include the whole bar, which means that for the
   * i-th bar, the selected min should be <= i and the selected max should be >= i, so using the
   * Math.floor and Math.ceil functions is the right way to do it.
   *
   * When computing from the scale, we adjust the min by substracting the axis offset, but we
   * add it to the max, because when computing from the scale, chartJs use integer values as
   * the limits for non linear scales. If we have a min value of 1, it means we want to start
   * displaying from 0.5, and if we have a max value of 4, it means we want to display until 4.5.
   */

  private computeMinMaxFromStore(): { min: number | undefined; max: number | undefined } {
    let { min, max } = this.store.currentAxesLimits[this.chartId]?.x ?? {};
    if (min !== undefined && max !== undefined && !this.hasLinearScale) {
      min = Math.ceil(min);
      max = Math.floor(max);
    }
    return { min, max };
  }

  private computeMinMaxFromScale({ min, max }: Boundaries): Boundaries {
    if (!this.hasLinearScale) {
      min = Math.ceil(min) - this.axisOffset;
      max = Math.floor(max) + this.axisOffset;
    }
    return { min, max };
  }

  private updateAxisLimits(xMin: number, xMax: number) {
    if (xMin === xMax) {
      return;
    }
    this.store.updateAxisLimits(this.chartId, { min: xMin, max: xMax });
    const { min, max } = this.computeMinMaxFromStore();
    if (max! > min! || (this.isBarChart! && max === min)) {
      this.chart!.config.options!.scales!.x!.min = min;
      this.chart!.config.options!.scales!.x!.max = max;
      this.updateTrendingLineAxes();
      this.chart?.update();
    }
    this.masterChart?.update();
  }

  onPointerDownInMasterChart(ev: PointerEvent) {
    this.removeEventListeners();
    const position = ev.offsetX;
    if (!this.masterChart?.chartArea || !this.chart?.scales.x) {
      return;
    }
    const { left, right, top, bottom } = this.masterChart.chartArea;
    const upperBound = this.upperBound ?? right;
    const lowerBound = this.lowerBound ?? left;
    if (position < left - 5 || position > right + 5 || ev.offsetY < top || ev.offsetY > bottom) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    let startingPositionOnChart: number, windowSize: number, startX: number | undefined;
    const startingEventPosition =
      ev.clientX - (this.masterChartCanvas.el?.getBoundingClientRect().left ?? 0);
    if (
      (lowerBound !== left || upperBound !== right) &&
      position > lowerBound + 5 &&
      position < upperBound - 5
    ) {
      startingPositionOnChart = ev.offsetX - lowerBound;
      this.mode = "moveInMaster";
      const currentLimits = this.store.currentAxesLimits[this.chartId]?.x;
      windowSize =
        (currentLimits?.max ?? this.chart.scales.x.max) -
        (currentLimits?.min ?? this.chart.scales.x.min);
    } else {
      this.mode = "selectInMaster";
      if (Math.abs(position - lowerBound) < 5) {
        startingPositionOnChart = upperBound;
      } else if (Math.abs(position - upperBound) < 5) {
        startingPositionOnChart = lowerBound;
      } else {
        startingPositionOnChart = clip(position, left, right);
      }
      startX = this.computeCoordinate(startingPositionOnChart);
    }
    const storedMin = this.store.originalAxisLimits[this.chartId].x!.min;
    const storedMax = this.store.originalAxisLimits[this.chartId].x!.max;

    const computeNewAxisLimits = (position: number) => {
      let min: number | undefined, max: number | undefined;
      if (this.mode === "moveInMaster") {
        min = this.computeCoordinate(position - startingPositionOnChart)!;
        if (min < storedMin) {
          min = storedMin;
        } else if (min > storedMax - windowSize) {
          min = storedMax - windowSize;
        }
        max = min + windowSize;
      } else if (this.mode === "selectInMaster") {
        const upperBound = clip(position, left, right);
        if (Math.abs(startingPositionOnChart - upperBound) > 5) {
          const endX = this.computeCoordinate(upperBound);
          if (startX === undefined || endX === undefined) {
            return {};
          }
          min = Math.min(startX, endX);
          max = Math.max(startX, endX);
        }
      }
      return { min, max };
    };

    const onDragFromMasterChart = (ev: PointerEvent) => {
      const position = ev.clientX - (this.masterChartCanvas.el?.getBoundingClientRect().left ?? 0);
      if (Math.abs(position - startingEventPosition) < 5) {
        return;
      }
      const { min, max } = computeNewAxisLimits(position);
      if (min !== undefined && max !== undefined) {
        this.updateAxisLimits(min, max);
      }
    };

    const onPointerUpInMasterChart = (ev: PointerEvent) => {
      this.removeEventListeners();
      let { min, max } = this.chart!.scales.x!;
      if (!this.hasLinearScale) {
        if (this.mode === "moveInMaster") {
          min = Math.round(min) - this.axisOffset;
          max = min + windowSize;
        } else {
          ({ min, max } = this.computeMinMaxFromScale({ min, max }));
        }
      }
      this.updateAxisLimits(min, max);
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
    const { offsetX: x, offsetY: y, target } = ev;
    if (!target) {
      return;
    }
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as ChartJSRuntime;
    if (runtime && !runtime.chartJsConfig.data.datasets.some((ds) => ds.data.length > 1)) {
      target["style"].cursor = "not-allowed";
      return;
    }
    if (this.mode === undefined) {
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
    const position = ev.offsetX;
    if (!this.masterChart?.chartArea || !this.chart?.scales.x) {
      return;
    }
    const { left, right, top, bottom } = this.masterChart.chartArea;
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
    let { min, max } = this.store.currentAxesLimits[this.chartId]?.x ?? this.chart.scales.x;
    const originalAxisLimits = this.store.originalAxisLimits[this.chartId].x;
    if (!originalAxisLimits) {
      return;
    }
    if (Math.abs(position - lowerBound) < 5) {
      min = originalAxisLimits.min;
    } else if (Math.abs(position - upperBound) < 5) {
      max = originalAxisLimits.max;
    } else if (lowerBound < position && position < upperBound) {
      min = originalAxisLimits.min;
      max = originalAxisLimits.max;
    } else {
      return;
    }
    this.updateAxisLimits(min, max);
  }
}
