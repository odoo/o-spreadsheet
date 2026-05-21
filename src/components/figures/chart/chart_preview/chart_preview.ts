import { Component, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { registerChartJSExtensions } from "../../../../helpers/figures/charts/chart_js_extension";
import { drawGaugeChart } from "../../../../helpers/figures/charts/gauge_chart_rendering";
import { drawScoreChart } from "../../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../../helpers/figures/charts/scorecard_chart_config_builder";
import { deepCopy } from "../../../../helpers/misc";
import { ChartDefinition, ChartJSRuntime, ChartRuntime } from "../../../../types/chart/chart";
import { GaugeChartRuntime } from "../../../../types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

interface Props {
  definition: ChartDefinition<string>;
}

export class ChartPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartPreview";
  static props = { definition: Object };

  private canvas = useRef("previewCanvas");
  private chart: any = null;

  get runtime(): ChartRuntime {
    return this.env.model.getters.getChartRuntimeFromDefinition(this.props.definition);
  }

  private isChartJSRuntime(runtime: ChartRuntime): runtime is ChartJSRuntime {
    return "chartJsConfig" in runtime;
  }

  private isScorecardRuntime(runtime: ChartRuntime): runtime is ScorecardChartRuntime {
    return "keyValue" in runtime;
  }

  private isGaugeRuntime(runtime: ChartRuntime): runtime is GaugeChartRuntime {
    return "gaugeValue" in runtime;
  }

  setup() {
    onWillUnmount(() => {
      this.chart?.destroy();
      this.chart = null;
    });
    useEffect(
      () => {
        this.renderPreview();
      },
      () => [this.props.definition]
    );
  }

  private renderPreview() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    if (!canvas) {
      return;
    }
    const runtime = this.runtime;
    if (this.isChartJSRuntime(runtime)) {
      this.renderChartJs(canvas, runtime);
    } else if (this.isScorecardRuntime(runtime)) {
      this.chart?.destroy();
      this.chart = null;
      const config = getScorecardConfiguration(canvas.getBoundingClientRect(), runtime);
      drawScoreChart(config, canvas, 1);
    } else if (this.isGaugeRuntime(runtime)) {
      this.chart?.destroy();
      this.chart = null;
      drawGaugeChart(canvas, runtime, 1);
    }
  }

  private renderChartJs(canvas: HTMLCanvasElement, runtime: ChartJSRuntime) {
    if (!globalThis.Chart) {
      return;
    }
    registerChartJSExtensions();
    const ctx = canvas.getContext("2d")!;
    const chartData = deepCopy(runtime.chartJsConfig) as any;
    // Disable animations for previews
    chartData.options = { ...(chartData.options || {}), animation: false, responsive: false };
    if (this.chart) {
      if (this.chart.config.type !== chartData.type) {
        this.chart.destroy();
        this.chart = new globalThis.Chart(ctx, chartData);
      } else {
        this.chart.data = chartData.data;
        this.chart.config.options = chartData.options;
        this.chart.update();
      }
    } else {
      this.chart = new globalThis.Chart(ctx, chartData);
    }
  }
}
