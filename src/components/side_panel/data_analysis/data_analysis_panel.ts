import { onWillUnmount, proxy, signal } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH, HIGHLIGHT_COLOR } from "../../../constants";
import { lightenColor } from "../../../helpers/color";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import {
  categorizeColumns,
  getSmartChartDefinition,
} from "../../../helpers/figures/charts/smart_chart_engine";
import { clipTextWithEllipsis } from "../../../helpers/text_helper";
import { UuidGenerator } from "../../../helpers/uuid";
import { toZone, zoneToXc } from "../../../helpers/zones";
import { Component, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { Highlight, UID, Zone } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { useHighlights } from "../../helpers/highlight_hook";
import { NumberInput } from "../../number_input/number_input";
import { SelectionInput } from "../../selection_input/selection_input";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { DataAnalysisStore } from "./data_analysis_store";

interface Props {
  onCloseSidePanel: () => void;
  zones: Zone[];
}

const CURRENT_SELECTION_COLOR = lightenColor(HIGHLIGHT_COLOR, 0.25);

export class DataAnalysisPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  static props = { onCloseSidePanel: Function, zones: Array };
  static components = {
    NumberInput,
    SidePanelCollapsible,
    BadgeSelection,
    Section,
    SelectionInput,
  };

  state = proxy({
    currentChart: "count",
    currentFrequencyOrder: "descending",
    highlightPositions: [] as { row: number; col: number }[],
    pendingRanges: [] as string[],
  });

  store!: Store<DataAnalysisStore>;
  private chartCanvasRef = signal<HTMLCanvasElement | null>(null);
  private chartDivRef = signal<HTMLDivElement | null>(null);
  private chart?: Chart;
  private sheetId?: UID;

  setup() {
    this.sheetId = this.env.model.getters.getActiveSheetId();
    const initialRanges = this.props.zones.map(zoneToXc);
    this.state.pendingRanges = initialRanges;
    this.store = useLocalStore(DataAnalysisStore, initialRanges);
    useHighlights(this);
    onWillUnmount(() => this.destroyChart());
    useLayoutEffect(
      () => {
        this.updateChart();
      },
      () => [this.store.countChartData, this.state.currentChart]
    );
  }

  get charts() {
    return [
      { value: "count", label: _t("Count"), icon: "o-spreadsheet-Icon.COUNT_CHART" },
      { value: "histogram", label: _t("Distribution"), icon: "o-spreadsheet-Icon.COUNT_CHART" },
    ];
  }

  get frequencyOrders() {
    return [
      { value: "descending", label: _t("Descending"), icon: "o-spreadsheet-Icon.DESCENDING_SORT" },
      { value: "ascending", label: _t("Ascending"), icon: "o-spreadsheet-Icon.ASCENDING_SORT" },
    ];
  }

  get shouldShowChart(): boolean {
    if (this.state.currentChart === "histogram") {
      return this.store.numericValues.length > 0;
    } else if (this.state.currentChart === "count") {
      return this.store.values.length > 0;
    }
    return false;
  }

  get chartErrorMessage(): string | null {
    if (this.state.currentChart === "histogram" && this.store.numericValues.length === 0) {
      return _t("No numeric values to display.");
    }
    if (this.state.currentChart === "count" && this.store.values.length === 0) {
      return _t("No values to display.");
    }
    return null;
  }

  get zonesType() {
    return categorizeColumns(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }

  get smartChartDefinition() {
    return getSmartChartDefinition(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }

  private getChartConfiguration(): ChartConfiguration | null {
    const getters = this.env.model.getters;
    const activeSheetId = getters.getActiveSheetId();
    const chart = SpreadsheetChart.fromStrDefinition(
      getters,
      activeSheetId,
      this.smartChartDefinition
    );
    const runtime = chart.getRuntime(getters, "myChart");
    if (!("chartJsConfig" in runtime)) {
      return null;
    }
    let config = runtime.chartJsConfig;
    const canvas = this.chartCanvasRef();
    const ctx2d = canvas?.getContext("2d") ?? null;
    config = {
      ...config,
      options: {
        ...config.options,
        plugins: {
          ...config.options?.plugins,
          legend: {
            ...config.options?.plugins?.legend,
            labels: {
              ...(config.options?.plugins?.legend as any)?.labels,
              font: { size: 9 },
            },
          },
          tooltip: { enabled: false },
        },
        events: [],
        animation: false,
        scales: {
          ...config.options?.scales,
          x: {
            ...config.options?.scales?.x,
            ticks: {
              ...(config.options?.scales?.x as any)?.ticks,
              font: { size: 9 },
              callback: function (value: any) {
                if (Math.floor(value) !== value) {
                  return "";
                }
                const label = (this as any).getLabelForValue(value) as string | undefined;
                if (!label) {
                  return "";
                }
                if (!ctx2d) {
                  return label;
                }
                return clipTextWithEllipsis(ctx2d, label, 50);
              },
              //maxRotation: 90,
              //minRotation: 90,
            },
          },
          y: {
            ...config.options?.scales?.y,
            ticks: {
              ...(config.options?.scales?.y as any)?.ticks,
              font: { size: 9 },
            },
          },
        },
      },
    };
    return config;
  }

  startDragAndDrop(ev: MouseEvent) {
    const canvas = this.chartCanvasRef();
    if (!canvas) {
      return;
    }
    const div = this.chartDivRef();
    if (!div) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const { position, left, top } = getComputedStyle(div);
    const offsetX = ev.clientX - rect.left;
    const offsetY = ev.clientY - rect.top;
    const onMouseMove = (moveEvent: MouseEvent) => {
      div.style.position = "absolute";
      div.style.left = `${moveEvent.clientX - offsetX}px`;
      div.style.top = `${moveEvent.clientY - offsetY}px`;
    };
    const onMouseUp = (mouseEvent: MouseEvent) => {
      //get grid-overlay dimensions
      const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
      if (!gridOverlay) {
        return;
      }
      const gridRect = gridOverlay.getBoundingClientRect();
      if (
        mouseEvent.clientX > gridRect.left &&
        mouseEvent.clientX < gridRect.right &&
        mouseEvent.clientY > gridRect.top &&
        mouseEvent.clientY < gridRect.bottom
      ) {
        const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
        const x = mouseEvent.clientX - gridRect.left - offsetX + scrollX;
        const y = mouseEvent.clientY - gridRect.top - offsetY + scrollY;

        const { col, row, offset } = this.env.model.getters.getPositionAnchorOffset({ x, y });

        this.env.model.dispatch("CREATE_CHART", {
          chartId: UuidGenerator.smallUuid(),
          figureId: UuidGenerator.smallUuid(),
          sheetId: this.env.model.getters.getActiveSheetId(),
          size: { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT },
          definition: this.smartChartDefinition,
          col,
          row,
          offset,
        });
      }
      div.style.position = position;
      div.style.left = left;
      div.style.top = top;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  private createChart() {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    const canvas = this.chartCanvasRef();
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const config = this.getChartConfiguration();
    if (!config) {
      return;
    }
    //@ts-ignore
    this.chart = new globalThis.Chart!(ctx, config);
  }

  private updateChart() {
    const config = this.getChartConfiguration();
    if (!config) {
      this.destroyChart();
      return;
    }
    if (!this.chart) {
      this.createChart();
      return;
    }
    this.chart.config.options = config.options;
    this.chart.data = config.data;
    this.chart.update();
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = undefined;
  }

  switchChart(chartType: string) {
    this.state.currentChart = chartType;
  }

  onRangeUpdate(ranges: string[]) {
    this.state.pendingRanges = ranges;
  }

  onRangeConfirmed() {
    this.store.updateRanges(this.state.pendingRanges);
    this.updateChart();
  }

  switchFrequencyOrder(order: string) {
    this.state.currentFrequencyOrder = order;
  }

  get valueFrequencies(): { value: string; count: number }[] {
    const orderingCriterion =
      this.state.currentFrequencyOrder === "ascending"
        ? (a: { count: number }, b: { count: number }) => a.count - b.count
        : (a: { count: number }, b: { count: number }) => b.count - a.count;
    return this.store.valueFrequencies.sort(orderingCriterion).slice(0, 5);
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (sheetId !== this.sheetId) {
      return [];
    }
    return (
      this.store.ranges?.map((range) => ({
        range: this.env.model.getters.getRangeFromSheetXC(sheetId, range),
        color: CURRENT_SELECTION_COLOR,
        interactive: false,
      })) ?? []
    );
  }

  highlightFrequencyPositions(positions: { row: number; col: number }[]) {
    this.state.highlightPositions = positions;
  }

  clearHighlights() {
    this.state.highlightPositions = [];
  }
}
