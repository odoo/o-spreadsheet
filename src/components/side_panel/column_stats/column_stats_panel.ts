import { Highlight } from "@odoo/o-spreadsheet-engine";
import { formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { numberToLetters } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { useHighlights } from "../../helpers/highlight_hook";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Checkbox } from "../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ColumnStatisticsStore } from "./column_stats_store";

interface Props {
  onCloseSidePanel: () => void;
}

interface StatisticItem {
  name: string;
  value: string;
}

export class ColumnStatsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColumnStatsPanel";
  static props = { onCloseSidePanel: Function };
  static components = { Checkbox, SidePanelCollapsible, BadgeSelection, Section };

  state = useState({
    currentChart: "count",
    currentFrequencyOrder: "descending",
    highlightPositions: [] as { row: number; col: number }[],
  });

  store!: Store<ColumnStatisticsStore>;
  private chartCanvas = useRef("columnStatsChart");
  private chart?: Chart;

  setup() {
    this.store = useStore(ColumnStatisticsStore);
    useHighlights(this);
    onMounted(() => this.createChart());
    onWillUnmount(() => this.destroyChart());
    useEffect(() => {
      this.updateChart();
    });
  }

  get columnLabel(): string {
    if (this.store.selectedColumn === undefined) {
      return "";
    }
    const cell = this.env.model.getters.getEvaluatedCell({
      sheetId: this.env.model.getters.getActiveSheetId(),
      col: this.store.selectedColumn,
      row: 0,
    });
    if (cell?.type === "text" && cell.value.trim() !== "") {
      return cell.value;
    }
    return _t("Column %s", numberToLetters(this.store.selectedColumn));
  }

  get statItems(): StatisticItem[] {
    const localeFormat = this.store.localeFormat;
    return Object.entries(this.store.statisticFnResults).map(([name, fnValue]) => {
      if (fnValue?.value === undefined) {
        return { name, value: "—" };
      }
      return {
        name,
        value: formatValue(fnValue.value(), {
          locale: localeFormat.locale,
          format: fnValue.format ?? localeFormat.format,
        }),
      };
    });
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

  private getChartConfiguration(): ChartConfiguration<"bar" | "line"> | null {
    switch (this.state.currentChart) {
      case "histogram":
        return this.getHistogramChartConfiguration();
      case "count":
        return this.getCountChartConfiguration();
    }
    return null;
  }

  private createChart() {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    const canvas = this.chartCanvas.el as HTMLCanvasElement | null;
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
    this.chart = new globalThis.Chart!(ctx, config);
  }

  private getCountChartConfiguration(): ChartConfiguration<"bar"> | null {
    const count = this.store.countChartData;
    if (!count) {
      return null;
    }

    return {
      type: "bar",
      data: {
        labels: count.labels,
        datasets: [
          {
            type: "bar",
            data: count.data,
            backgroundColor: "#5B9BD5",
            borderSkipped: false,
            borderWidth: 1,
            barPercentage: 1,
            categoryPercentage: 1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: { display: true },
          y: { display: true, beginAtZero: true },
        },
      },
    };
  }

  private getHistogramChartConfiguration(): ChartConfiguration<"bar" | "line"> | null {
    const histogram = this.store.histogramData;
    if (!histogram) {
      return null;
    }
    return {
      type: "line",
      data: {
        labels: histogram.labels,
        datasets: [
          {
            type: "bar",
            data: histogram.data,
            backgroundColor: "#5B9BD5",
            borderSkipped: false,
            borderWidth: 1,
            barPercentage: 1,
            categoryPercentage: 1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: { display: false, stacked: true, position: "top" },
          y: { display: true },
          x2: {
            type: "linear",
            position: "bottom",
            display: true,
            min: 0,
            max: histogram.labels.length,
            ticks: {
              callback: (value: any) =>
                Math.floor(value) !== value ? "" : histogram.tickLabels?.[value] ?? "",
            },
          },
        },
      },
    };
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
    this.destroyChart();
    this.createChart();
  }

  switchFrequencyOrder(order: string) {
    this.state.currentFrequencyOrder = order;
  }

  toggleIgnoreHeader(ignoreHeader: boolean) {
    this.store.updateIgnoreHeader(ignoreHeader);
  }

  get valueFrequencies(): { value: any; count: number }[] {
    const orderingCriterion =
      this.state.currentFrequencyOrder === "ascending"
        ? (a: { count: number }, b: { count: number }) => a.count - b.count
        : (a: { count: number }, b: { count: number }) => b.count - a.count;
    return this.store.valueFrequencies.sort(orderingCriterion).slice(0, 5);
  }

  get highlights(): Highlight[] {
    const column = this.store.selectedColumn;
    if (column === undefined) {
      return [];
    }
    return [
      {
        range: this.env.model.getters.getRangeFromZone(this.env.model.getters.getActiveSheetId(), {
          top: 0,
          left: column,
          bottom: undefined,
          right: column,
        }),
        color: "#a3e9a39a",
        interactive: false,
      },
      ...this.state.highlightPositions.map((pos) => ({
        range: this.env.model.getters.getRangeFromZone(this.env.model.getters.getActiveSheetId(), {
          top: pos.row,
          left: pos.col,
          bottom: pos.row,
          right: pos.col,
        }),
        color: "#ffeb3b9a",
        interactive: false,
      })),
    ];
  }

  highlightFrequencyPositions(positions: { row: number; col: number }[]) {
    this.state.highlightPositions = positions;
  }

  clearHighlights() {
    this.state.highlightPositions = [];
  }
}
