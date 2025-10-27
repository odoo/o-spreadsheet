import type { ChartConfiguration, ChartOptions } from "chart.js";
import {
  areChartJSExtensionsLoaded,
  registerChartJSExtensions,
  unregisterChartJsExtensions,
} from "../../../components/figures/chart/chartJs/chart_js_extension";
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
  events: ["mousemove", "mouseout", "click", "touchstart", "touchmove", "mouseup"],
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
  let imgContent: string | undefined = undefined;
  let extensionsLoaded = false;
  if ("chartJsConfig" in runtime) {
    extensionsLoaded = areChartJSExtensionsLoaded();
    if (!extensionsLoaded) {
      registerChartJSExtensions();
    }
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const chart = new window.Chart(canvas, config as ChartConfiguration);
    imgContent = chart.toBase64Image() as string;
    chart.destroy();
    div.remove();
  } else if (type === "scorecard") {
    const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
    drawScoreChart(design, canvas);
    imgContent = canvas.toDataURL();
    div.remove();
  } else if (type === "gauge") {
    drawGaugeChart(canvas, runtime as GaugeChartRuntime);
    imgContent = canvas.toDataURL();
    div.remove();
  }
  if (!extensionsLoaded) {
    unregisterChartJsExtensions();
  }
  return imgContent;
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
