import type { ChartConfiguration, ChartOptions } from "chart.js";
import { chartShowValuesPlugin } from "../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { waterfallLinesPlugin } from "../../../components/figures/chart/chartJs/chartjs_waterfall_plugin";
import { MAX_CHAR_LABEL } from "../../../constants";
import { Figure } from "../../../types";
import { GaugeChartRuntime, ScorecardChartRuntime } from "../../../types/chart";
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

export function truncateLabel(label: string | undefined): string {
  if (!label) {
    return "";
  }
  if (label.length > MAX_CHAR_LABEL) {
    return label.substring(0, MAX_CHAR_LABEL) + "…";
  }
  return label;
}

export function chartToImage(
  runtime: ChartRuntime,
  figure: Figure,
  type: string
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
  // we have to add the canvas to the DOM otherwise it won't be rendered
  document.body.append(div);
  if ("chartJsConfig" in runtime) {
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const Chart = getChartJSConstructor();
    const chart = new Chart(canvas, config as ChartConfiguration);
    const imgContent = chart.toBase64Image() as string;
    chart.destroy();
    div.remove();
    return imgContent;
  } else if (type === "scorecard") {
    const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
    drawScoreChart(design, canvas);
    const imgContent = canvas.toDataURL();
    div.remove();
    return imgContent;
  } else if (type === "gauge") {
    drawGaugeChart(canvas, runtime as GaugeChartRuntime);
    const imgContent = canvas.toDataURL();
    div.remove();
    return imgContent;
  }
  return undefined;
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
    window.Chart.register(chartShowValuesPlugin);
    window.Chart.register(waterfallLinesPlugin);
  }
  return window.Chart;
}
