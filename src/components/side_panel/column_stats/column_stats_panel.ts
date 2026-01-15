import { formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { numberToLetters } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Checkbox } from "../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { ColumnStatisticsStore } from "./column_stats_store";

interface Props {
  onCloseSidePanel: () => void;
}

interface StatisticItem {
  name: string;
  value: string;
}

interface HistogramData {
  data: number[];
  labels: string[];
  tickLabels?: string[];
}

export class ColumnStatsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColumnStatsPanel";
  static props = { onCloseSidePanel: Function };
  static components = { Checkbox, SidePanelCollapsible, BadgeSelection };

  state = useState({
    currentChart: "count",
    currentFrequencyOrder: "descending",
    ignoreHeader: false,
  });

  store!: Store<ColumnStatisticsStore>;
  private chartCanvas = useRef("columnStatsChart");
  private chart?: Chart;
  private tickLabels?: string[];

  setup() {
    this.store = useStore(ColumnStatisticsStore);
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
    if (typeof cell?.value === "string" && cell.value.trim() !== "") {
      return String(cell.value);
    }
    return _t("Column %s", numberToLetters(this.store.selectedColumn));
  }

  get statItems(): StatisticItem[] {
    const locale = this.env.model.getters.getLocale();
    const localeFormat = { locale, format: this.store.dataFormat };
    return Object.entries(this.store.statisticFnResults).map(([name, fnValue]) => {
      if (fnValue === undefined) {
        return { name, value: "—" };
      }
      return { name, value: formatValue(fnValue(), localeFormat) };
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

  get histogram(): HistogramData | undefined {
    const values = this.store.numericValues;
    if (!values.length) {
      return undefined;
    }

    const barCount = 1 + Math.floor(Math.log2(Math.max(new Set(values).size, 1)));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const step = range / barCount;
    const bins = new Array(barCount).fill(0);

    if (range === 0) {
      bins[0] = values.length;
    } else {
      for (const value of values) {
        const ratio = (value - minValue) / range;
        const rawIndex = Math.floor(ratio * barCount);
        const index = Math.min(barCount - 1, Math.max(0, rawIndex));
        bins[index] += 1;
      }
    }

    const localeFormat = {
      locale: this.env.model.getters.getLocale(),
      format: this.store.dataFormat,
    };

    const tickLabels: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i <= barCount; i++) {
      tickLabels.push(`${formatValue(minValue + i * step, localeFormat)}`);
      if (i !== 0) {
        const value = minValue + (i - 1) * step;
        labels.push(
          `${formatValue(value, localeFormat)}-${formatValue(value + step, localeFormat)}`
        );
      }
    }

    return {
      data: bins,
      labels,
      tickLabels,
    };
  }

  get count(): HistogramData | undefined {
    if (this.store.selectedColumn === undefined) {
      return undefined;
    }
    const values = this.store.numericValues.length ? this.store.numericValues : this.store.values;
    if (!values.length) {
      return undefined;
    }
    const countMap = new Map<number, number>();
    for (const val of values) {
      countMap.set(val, (countMap.get(val) || 0) + 1);
    }
    const data: number[] = [];
    const labels: string[] = [];
    const localeFormat = {
      locale: this.env.model.getters.getLocale(),
      format: this.store.dataFormat,
    };
    Array.from(countMap.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([val, count]) => {
        labels.push(formatValue(val, localeFormat));
        data.push(count);
      });

    return {
      data,
      labels,
    };
  }

  get valueFrequencies(): { value: any; count: number }[] {
    const count = this.count;
    if (!count) {
      return [];
    }
    const orderingCriterion =
      this.state.currentFrequencyOrder === "ascending"
        ? (a, b) => a.count - b.count
        : (a, b) => b.count - a.count;
    const labels = count.labels
      .map((value, index) => ({ value, count: count.data[index] }))
      .sort(orderingCriterion);
    return labels.slice(0, 5);
  }

  private createChart() {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    switch (this.state.currentChart) {
      case "histogram":
        this.createHistogramChart();
        break;
      case "count":
        this.createCountChart();
        break;
    }
  }

  private createCountChart() {
    const count = this.count;
    if (!count) {
      return;
    }

    const canvas = this.chartCanvas.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const chartData: ChartConfiguration<"bar"> = {
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
    this.chart = new globalThis.Chart!(ctx, chartData);
  }

  private createHistogramChart() {
    const histogram = this.histogram;
    if (!histogram) {
      return;
    }
    this.tickLabels = histogram.tickLabels;

    const canvas = this.chartCanvas.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const chartData: ChartConfiguration<"bar" | "line"> = {
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
            max: 2 * histogram.labels.length,
            ticks: {
              callback: (value: any) =>
                Math.floor(value) !== value ? "" : this.tickLabels?.[value] ?? "",
            },
          },
        },
      },
    };
    this.chart = new globalThis.Chart!(ctx, chartData);
  }

  private updateChart() {
    switch (this.state.currentChart) {
      case "histogram":
        this.updateHistogramChart();
        break;
      case "count":
        this.updateCountChart();
        break;
    }
  }

  private updateCountChart() {
    const count = this.count;
    if (!count) {
      this.destroyChart();
      return;
    }
    if (!this.chart) {
      this.createChart();
      return;
    }
    this.chart.data.labels = count.labels;
    if (this.chart.data.datasets[0]) {
      this.chart.data.datasets[0].data = count.data;
    }
    this.chart.update();
  }

  private updateHistogramChart() {
    const histogram = this.histogram;
    if (!histogram) {
      this.destroyChart();
      return;
    }
    if (!this.chart) {
      this.createChart();
      return;
    }
    this.tickLabels = histogram.tickLabels;
    this.chart.data.labels = histogram.labels;
    this.chart.config.options!.scales!["x2"]!.max = histogram.labels.length;
    if (this.chart.data.datasets[0]) {
      this.chart.data.datasets[0].data = histogram.data;
    }
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
    this.state.ignoreHeader = ignoreHeader;
    this.store.updateIgnoreHeader(ignoreHeader);
  }
}
