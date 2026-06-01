import { onMounted, onWillUnmount, props, signal } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
} from "../../../constants";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import { registerChartJSExtensions } from "../../../helpers/figures/charts/chart_js_extension";
import { drawGaugeChart } from "../../../helpers/figures/charts/gauge_chart_rendering";
import { drawScoreChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../../helpers/uuid";
import { Component, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { GaugeChartRuntime } from "../../../types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";

export class ChartSuggestionPreview extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartSuggestionPreview";
  protected props = props({
    definition: types.ChartDefinition(),
    title: types.string(),
    rationale: types.string(),
    isRecommended: types.boolean(),
  });

  private chartCanvasRef = signal<HTMLCanvasElement | null>(null);
  private chartDivRef = signal<HTMLDivElement | null>(null);
  private chart?: Chart;

  setup() {
    onMounted(() => registerChartJSExtensions());
    onWillUnmount(() => this.destroyChart());
    useLayoutEffect(
      () => {
        this.updateChart();
      },
      () => [this.props.definition]
    );
  }

  private getChartConfiguration(): ChartConfiguration | null {
    const getters = this.env.model.getters;
    const activeSheetId = getters.getActiveSheetId();
    const chart = SpreadsheetChart.fromStrDefinition(getters, activeSheetId, this.props.definition);
    const runtime = chart.getRuntime(getters, "myChart");
    if (!("chartJsConfig" in runtime)) {
      return null;
    }
    let config = runtime.chartJsConfig;
    const existingScales = config.options?.scales ?? {};
    config = {
      ...config,
      options: {
        ...config.options,
        plugins: {
          ...config.options?.plugins,
          legend: { display: false },
          title: { display: false },
          tooltip: { enabled: false },
        },
        events: [],
        animation: false,
        scales: {
          ...existingScales,
          ...("x" in existingScales
            ? {
                x: {
                  ...existingScales.x,
                  ticks: { display: false },
                  border: { display: false },
                },
              }
            : {}),
          ...("y" in existingScales
            ? {
                y: {
                  ...existingScales.y,
                  ticks: { display: false },
                  border: { display: false },
                },
              }
            : {}),
          ...("r" in existingScales
            ? {
                r: {
                  ...(existingScales as any).r,
                  ticks: { display: false },
                  pointLabels: { display: false },
                },
              }
            : {}),
        },
      },
    };
    return config;
  }

  startDragAndDrop(ev: MouseEvent) {
    const canvas = this.chartCanvasRef();
    const div = this.chartDivRef();
    if (!div) {
      return;
    }
    const target = canvas ?? div;
    const rect = target.getBoundingClientRect();
    const { position, left, top } = getComputedStyle(div);
    const offsetX = ev.clientX - rect.left;
    const offsetY = ev.clientY - rect.top;
    const onMouseMove = (moveEvent: MouseEvent) => {
      div.style.position = "absolute";
      div.style.left = `${moveEvent.clientX - offsetX}px`;
      div.style.top = `${moveEvent.clientY - offsetY}px`;
    };
    const onMouseUp = (mouseEvent: MouseEvent) => {
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
        const isScoreCard = this.props.definition.type === "scorecard";
        this.env.model.dispatch("CREATE_CHART", {
          chartId: UuidGenerator.smallUuid(),
          figureId: UuidGenerator.smallUuid(),
          sheetId: this.env.model.getters.getActiveSheetId(),
          size: {
            width: isScoreCard ? DEFAULT_SCORECARD_WIDTH : DEFAULT_FIGURE_WIDTH,
            height: isScoreCard ? DEFAULT_SCORECARD_HEIGHT : DEFAULT_FIGURE_HEIGHT,
          },
          definition: this.props.definition,
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

  private updateChart() {
    this.destroyChart();
    const config = this.getChartConfiguration();
    if (!config) {
      this.drawNativeChart();
      return;
    }
    const canvas = this.chartCanvasRef();
    const ctx = canvas?.getContext("2d");
    if (!ctx || !globalThis.Chart) {
      return;
    }
    //@ts-ignore
    this.chart = new globalThis.Chart!(ctx, config);
  }

  private drawNativeChart() {
    const canvas = this.chartCanvasRef();
    if (!canvas) {
      return;
    }
    const getters = this.env.model.getters;
    const chart = SpreadsheetChart.fromStrDefinition(
      getters,
      getters.getActiveSheetId(),
      this.props.definition
    );
    const runtime = chart.getRuntime(getters, "myChart");
    const { type } = this.props.definition;
    if (type === "scorecard") {
      const rect = canvas.getBoundingClientRect();
      const config = getScorecardConfiguration(
        { width: rect.width || 130, height: rect.height || 120 },
        runtime as ScorecardChartRuntime
      );
      drawScoreChart(config, canvas);
    } else if (type === "gauge") {
      let gaugeRuntime = runtime as GaugeChartRuntime;
      if (gaugeRuntime.title) {
        gaugeRuntime = {
          ...gaugeRuntime,
          title: { text: "" },
        };
      }
      drawGaugeChart(canvas, gaugeRuntime, 1, undefined, { labelFontSize: 8 });
    }
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = undefined;
  }
}
