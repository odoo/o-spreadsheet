import { onMounted, onWillUnmount, signal, useProps } from "@odoo/owl";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import { registerChartJSExtensions } from "../../../helpers/figures/charts/chart_js_extension";
import { limitChartConfigDataPoints } from "../../../helpers/figures/charts/chart_ui_common";
import { drawGaugeChart } from "../../../helpers/figures/charts/gauge_chart_rendering";
import { drawScoreChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { Component, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { GaugeChartRuntime } from "../../../types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";

const PREVIEW_BUBBLE_RADIUS_RATIO = 0.3;
const MIN_PREVIEW_BUBBLE_RADIUS = 1;

export class ChartSuggestionPreview extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartSuggestionPreview";
  protected props = useProps({
    definition: types.ChartDefinition(),
    description: types.string(),
    onPointerDown: types.function(),
  });

  private chartCanvasRef = signal.ref(HTMLCanvasElement);
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
    const runtime = chart.getRuntime(
      getters,
      "myChart",
      getters.getSpreadsheetTheme().colorThemeName
    );
    if (!("chartJsConfig" in runtime)) {
      return null;
    }
    let config: ChartConfiguration<any> = runtime.chartJsConfig;
    const existingScales = config.options?.scales ?? {};
    config = {
      ...config,
      data:
        this.props.definition.type === "bubble"
          ? {
              ...config.data,
              datasets: (config.data?.datasets || []).map((dataset) => ({
                ...dataset,
                pointRadius: this.scaleBubblePointRadius(dataset.pointRadius),
                pointHoverRadius: this.scaleBubblePointRadius(dataset.pointHoverRadius),
              })),
            }
          : config.data,
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
        scales: this.getScalesCongif(existingScales),
      },
    };
    return limitChartConfigDataPoints(config);
  }

  private getScalesCongif(scales) {
    if (scales.x) {
      scales.x = {
        ...scales.x,
        ticks: { display: false },
        border: { display: false },
      };
    }

    if (scales.y) {
      scales.y = {
        ...scales.y,
        ticks: { display: false },
        border: { display: false },
      };
    }

    if (scales.r) {
      scales.r = {
        ...scales.r,
        ticks: { display: false },
        pointLabels: { display: false },
      };
    }
    return scales;
  }

  private scaleBubblePointRadius(pointRadius: number | number[] | undefined): number | number[] {
    if (Array.isArray(pointRadius)) {
      return pointRadius.map((radius) =>
        radius <= 0
          ? radius
          : Math.max(MIN_PREVIEW_BUBBLE_RADIUS, radius * PREVIEW_BUBBLE_RADIUS_RATIO)
      );
    }
    if (typeof pointRadius === "number") {
      return pointRadius <= 0
        ? pointRadius
        : Math.max(MIN_PREVIEW_BUBBLE_RADIUS, pointRadius * PREVIEW_BUBBLE_RADIUS_RATIO);
    }
    return pointRadius ?? MIN_PREVIEW_BUBBLE_RADIUS;
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
    let runtime = chart.getRuntime(
      getters,
      "myChart",
      getters.getSpreadsheetTheme().colorThemeName
    );
    const { type } = this.props.definition;
    if (type === "scorecard") {
      const rect = canvas.getBoundingClientRect();
      runtime = {
        ...runtime,
        keyValueStyle: {
          ...(runtime as ScorecardChartRuntime).keyValueStyle,
          fontSize: 16,
        },
      };
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
