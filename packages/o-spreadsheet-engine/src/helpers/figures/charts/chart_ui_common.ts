import { ChartConfiguration, ChartOptions } from "chart.js";
import { ChartRuntime, ChartType } from "../../../types/chart";
import { Figure } from "../../../types/figure";
import { deepCopy } from "../../misc2";

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
  const canvas = createRenderingSurface(figure.width, figure.height);
  let imageUrl: string | undefined;
  if ("chartJsConfig" in runtime) {
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const chart = new (globalThis as any).Chart(canvas, config as ChartConfiguration);
    try {
      imageUrl = await canvasToObjectUrl(canvas);
    } finally {
      chart.destroy();
    }
  }
  // TODO: make a registry of chart types to their rendering functions
  // else if (type === "scorecard") {
  //   const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
  //   drawScoreChart(design, canvas);
  //   imageUrl = await canvasToObjectUrl(canvas);
  // } else if (type === "gauge") {
  //   drawGaugeChart(canvas, runtime as GaugeChartRuntime, figure);
  //   imageUrl = await canvasToObjectUrl(canvas);
  // }
  return imageUrl;
}

export async function chartToImageFile(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): Promise<File | undefined> {
  const canvas = createRenderingSurface(figure.width, figure.height);
  let chartBlob: Blob | null = null;
  if ("chartJsConfig" in runtime) {
    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    const chart = new (globalThis as any).Chart(canvas, config as ChartConfiguration);
    try {
      chartBlob = await canvasToBlob(canvas);
    } finally {
      chart.destroy();
    }
  }
  // else if (type === "scorecard") { // TODO: uncomment this
  //   const design = getScorecardConfiguration(figure, runtime as ScorecardChartRuntime);
  //   drawScoreChart(design, canvas);
  //   chartBlob = await canvasToBlob(canvas);
  // } else if (type === "gauge") {
  //   drawGaugeChart(canvas, runtime as GaugeChartRuntime, figure);
  //   chartBlob = await canvasToBlob(canvas);
  // }
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

function createRenderingSurface(width: number, height: number): OffscreenCanvas {
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
  if (!URL.createObjectURL)
    throw new Error("URL.createObjectURL is not supported in this environment");
  return URL.createObjectURL(blob);
}
