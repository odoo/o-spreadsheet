import type { ChartConfiguration, ChartOptions } from "chart.js";
import {
  funnelTooltipPositioner,
  getFunnelChartController,
  getFunnelChartElement,
} from "../../../components/figures/chart/chartJs/chartjs_funnel_chart";
import { chartShowValuesPlugin } from "../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { sunburstHoverPlugin } from "../../../components/figures/chart/chartJs/chartjs_sunburst_hover_plugin";
import { sunburstLabelsPlugin } from "../../../components/figures/chart/chartJs/chartjs_sunburst_labels_plugin";
import { waterfallLinesPlugin } from "../../../components/figures/chart/chartJs/chartjs_waterfall_plugin";
import { treeMapColorsPlugin } from "../../../components/figures/chart/chartJs/tree_map_colors_plugin";
import { Figure } from "../../../types";
import { ChartType, GaugeChartRuntime, ScorecardChartRuntime } from "../../../types/chart";
import { ChartRuntime } from "../../../types/chart/chart";
import { deepCopy } from "../../misc";
import { drawGaugeChart } from "./gauge_chart_rendering";
import { drawScoreChart } from "./scorecard_chart";
import { getScorecardConfiguration } from "./scorecard_chart_config_builder";

export const CHART_COMMON_OPTIONS: ChartOptions = {
  // https://www.chartjs.org/docs/latest/general/responsive.html
  responsive: true, // will resize when its container is resized
  maintainAspectRatio: false, // doesn't maintain the aspect ratio (width/height =2 by default) so the user has the choice of the exact layout
  elements: {
    line: {
      fill: false, // do not fill the area under line charts
    },
    point: {
      hitRadius: 15, // increased hit radius to display point tooltip when hovering nearby
    },
  },
  animation: false,
};

export function chartToImageUrl(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): string | undefined {
  // wrap the canvas in a div with a fixed size because chart.js would
  // fill the whole page otherwise
  const div = document.createElement("div");
  div.style.width = `${figure.width}px`;
  div.style.height = `${figure.height}px`;
  const canvas = document.createElement("canvas");
  div.append(canvas);
  canvas.setAttribute("width", figure.width.toString());
  canvas.setAttribute("height", figure.height.toString());
  let imageContent: string | undefined;
  // we have to add the canvas to the DOM otherwise it won't be rendered
  document.body.append(div);
  if ("chartJsConfig" in runtime) {
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const chart = new window.Chart(canvas, config as ChartConfiguration);
    imageContent = chart.toBase64Image() as string;
    chart.destroy();
  } else if (type === "scorecard") {
    const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
    drawScoreChart(design, canvas);
    imageContent = canvas.toDataURL();
  } else if (type === "gauge") {
    drawGaugeChart(canvas, runtime as GaugeChartRuntime);
    imageContent = canvas.toDataURL();
  }
  div.remove();
  return imageContent;
}

export async function chartToImageFile(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): Promise<File | undefined> {
  // wrap the canvas in a div with a fixed size because chart.js would
  // fill the whole page otherwise
  const div = document.createElement("div");
  div.style.width = `${figure.width}px`;
  div.style.height = `${figure.height}px`;
  const canvas = document.createElement("canvas");
  div.append(canvas);
  canvas.setAttribute("width", figure.width.toString());
  canvas.setAttribute("height", figure.height.toString());
  // we have to add the canvas to the DOM otherwise it won't be rendered
  document.body.append(div);
  let chartBlob: Blob | null = null;
  if ("chartJsConfig" in runtime) {
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const Chart = getChartJSConstructor();
    const chart = new Chart(canvas, config as ChartConfiguration);
    chartBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    chart.destroy();
  } else if (type === "scorecard") {
    const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
    drawScoreChart(design, canvas);
    chartBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } else if (type === "gauge") {
    drawGaugeChart(canvas, runtime as GaugeChartRuntime);
    chartBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  div.remove();
  return chartBlob ? new File([chartBlob], "chart.png", { type: "image/png" }) : undefined;
}

/**
 * Custom chart.js plugin to set the background color of the canvas
 * https://github.com/chartjs/Chart.js/blob/8fdf76f8f02d31684d34704341a5d9217e977491/docs/configuration/canvas-background.md
 */
const backgroundColorChartJSPlugin = {
  id: "customCanvasBackgroundColor",
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

/** Return window.Chart, making sure all our extensions are loaded in ChartJS */
export function getChartJSConstructor() {
  if (window.Chart && !window.Chart?.registry.plugins.get("chartShowValuesPlugin")) {
    window.Chart.register(
      chartShowValuesPlugin,
      waterfallLinesPlugin,
      getFunnelChartController(),
      getFunnelChartElement(),
      sunburstLabelsPlugin,
      sunburstHoverPlugin,
      treeMapColorsPlugin
    );
    window.Chart.Tooltip.positioners.funnelTooltipPositioner = funnelTooltipPositioner;
  }
  return window.Chart;
}
