import { ChartConfiguration, ChartOptions } from "chart.js";
import { DOMDimension } from "../../..";
import {
  ChartRuntime,
  ChartType,
  GaugeChartRuntime,
  ScorecardChartRuntime,
} from "../../../types/chart";
import { Figure } from "../../../types/figure";
import { deepCopy } from "../../misc";
import {
  areChartJSExtensionsLoaded,
  registerChartJSExtensions,
  unregisterChartJsExtensions,
} from "./chart_js_extension";
import { drawGaugeChart } from "./gauge_chart_rendering";
import { drawScoreChart } from "./scorecard_chart";
import { getScorecardConfiguration } from "./scorecard_chart_config_builder";

export const CHART_COMMON_OPTIONS = {
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
} satisfies ChartOptions;

export async function chartToImageUrl(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): Promise<string | undefined> {
  try {
    const canvas = createRenderingSurface(figure.width, figure.height);
    const cleanup = drawChartOnCanvas(canvas, runtime, figure, type);
    const imageUrl = await canvasToObjectUrl(canvas);
    cleanup();
    return imageUrl;
  } catch (error) {
    console.log("Error exporting chart to image URL: " + error.message);
  }
  return undefined;
}

export async function chartToImageFile(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): Promise<Blob | null> {
  try {
    const canvas = createRenderingSurface(figure.width, figure.height);
    const cleanup = drawChartOnCanvas(canvas, runtime, figure, type);
    const chartBlob = await canvasToBlob(canvas);
    cleanup();
    return chartBlob;
  } catch (error) {
    console.log("Error exporting chart to image file: " + error.message);
  }
  return null;
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

function createRenderingSurface(width: number, height: number): OffscreenCanvas {
  if (!globalThis.OffscreenCanvas) {
    throw new Error(
      `converting a chart to an image using OffscreenCanvas is not supported in this environment`
    );
  }
  return new OffscreenCanvas(width, height);
}

async function canvasToBlob(canvas: OffscreenCanvas): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/png" });
  }
  return new Promise((resolve) => (canvas as HTMLCanvasElement).toBlob(resolve, "image/png"));
}

async function canvasToObjectUrl(canvas: OffscreenCanvas): Promise<string | undefined> {
  const blob = await canvasToBlob(canvas);
  if (!blob) {
    return undefined;
  }
  return new Promise((resolve) => {
    const f = new FileReader();
    f.addEventListener("load", () => {
      resolve(f.result as string);
    });
    f.readAsDataURL(blob);
  });
}

/**
 * Draw the given chart on the canvas.
 *
 * @returns a cleanup function to be called after the drawing is no longer needed (to free Chart.js resources)
 */
export function drawChartOnCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  runtime: ChartRuntime,
  size: DOMDimension,
  type: ChartType
): () => void {
  if ("chartJsConfig" in runtime) {
    if (!globalThis.Chart) {
      throw new Error("Chart.js library is not loaded");
    }
    const extensionsLoaded = areChartJSExtensionsLoaded();
    if (!extensionsLoaded) {
      registerChartJSExtensions();
    }

    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    if (!globalThis.Chart.registry.controllers.get(config.type)) {
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
      throw new Error(`Chart of type "${config.type}" is not registered in Chart.js library.`);
    }

    const chart = new globalThis.Chart(
      canvas as unknown as HTMLCanvasElement,
      config as ChartConfiguration
    );
    return () => {
      chart.destroy();
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
    };
  }
  // TODO: make a registry of chart types to their rendering functions
  else {
    if (type === "scorecard") {
      const design = getScorecardConfiguration(size, runtime as ScorecardChartRuntime);
      drawScoreChart(design, canvas);
    } else if (type === "gauge") {
      drawGaugeChart(canvas, runtime as GaugeChartRuntime, size);
    }
  }

  return () => {};
}
