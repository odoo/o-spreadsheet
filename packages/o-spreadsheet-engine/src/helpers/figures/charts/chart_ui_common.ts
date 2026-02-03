import { ChartConfiguration, ChartOptions } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  ChartRuntime,
  ChartType,
  GaugeChartRuntime,
  GaugeChartStyle,
  ScorecardChartRuntime,
  ScorecardChartStyle,
} from "../../../types/chart";
import { Figure } from "../../../types/figure";
import { deepCopy } from "../../misc";
import { chartFontColor } from "./chart_common";
import {
  areChartJSExtensionsLoaded,
  registerChartJSExtensions,
  unregisterChartJsExtensions,
} from "./chart_js_extension";
import { drawGaugeChart } from "./gauge_chart_rendering";
import { drawScoreChart } from "./scorecard_chart";
import { getScorecardConfiguration } from "./scorecard_chart_config_builder";

const DEFAULT_SCORECARD_STYLE: ScorecardChartStyle = {
  background: BACKGROUND_CHART_COLOR,
  fontColor: chartFontColor(BACKGROUND_CHART_COLOR),
};

const DEFAULT_GAUGE_STYLE: GaugeChartStyle = {
  background: BACKGROUND_CHART_COLOR,
};

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
    if (!globalThis.Chart) {
      console.log("Chart.js library is not loaded");
      return imageUrl;
    }
    const extensionsLoaded = areChartJSExtensionsLoaded();
    if (!extensionsLoaded) {
      registerChartJSExtensions();
    }

    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    if (!globalThis.Chart.registry.controllers.get(config.type)) {
      console.log(`Chart of type "${config.type}" is not registered in Chart.js library.`);
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
      return imageUrl;
    }

    const chart = new globalThis.Chart(
      canvas as unknown as HTMLCanvasElement,
      config as ChartConfiguration
    );
    try {
      imageUrl = await canvasToObjectUrl(canvas);
    } finally {
      chart.destroy();
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
    }
  }
  // TODO: make a registry of chart types to their rendering functions
  else {
    if (!globalThis.OffscreenCanvas) {
      throw new Error(
        `converting a ${type} chart to an image using OffscreenCanvas is not supported in this environment`
      );
    }
    if (type === "scorecard") {
      const design = getScorecardConfiguration(
        figure,
        runtime as ScorecardChartRuntime,
        DEFAULT_SCORECARD_STYLE
      );
      drawScoreChart(design, canvas);
      imageUrl = await canvasToObjectUrl(canvas);
    } else if (type === "gauge") {
      drawGaugeChart(canvas, runtime as GaugeChartRuntime, DEFAULT_GAUGE_STYLE, figure);
      imageUrl = await canvasToObjectUrl(canvas);
    }
  }
  return imageUrl;
}

export async function chartToImageFile(
  runtime: ChartRuntime,
  figure: Figure,
  type: ChartType
): Promise<Blob | null> {
  const canvas = createRenderingSurface(figure.width, figure.height);
  let chartBlob: Blob | null = null;
  if ("chartJsConfig" in runtime) {
    if (!globalThis.Chart) {
      console.log("Chart.js library is not loaded");
      return chartBlob;
    }
    const extensionsLoaded = areChartJSExtensionsLoaded();
    if (!extensionsLoaded) {
      registerChartJSExtensions();
    }

    const config = deepCopy(runtime.chartJsConfig);
    config.plugins = [backgroundColorChartJSPlugin];
    if (!globalThis.Chart.registry.controllers.get(config.type)) {
      console.log(`Chart of type "${config.type}" is not registered in Chart.js library.`);
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
      return chartBlob;
    }

    const chart = new globalThis.Chart(
      canvas as unknown as HTMLCanvasElement,
      config as ChartConfiguration
    );
    try {
      chartBlob = await canvasToBlob(canvas);
    } finally {
      chart.destroy();
      if (!extensionsLoaded) {
        unregisterChartJsExtensions();
      }
    }
  } else {
    if (!globalThis.OffscreenCanvas) {
      throw new Error(
        `converting a ${type} chart to an image using OffscreenCanvas is not supported in this environment`
      );
    }
    if (type === "scorecard") {
      const design = getScorecardConfiguration(
        figure,
        runtime as ScorecardChartRuntime,
        DEFAULT_SCORECARD_STYLE
      );
      drawScoreChart(design, canvas);
      chartBlob = await canvasToBlob(canvas);
    } else if (type === "gauge") {
      drawGaugeChart(canvas, runtime as GaugeChartRuntime, DEFAULT_GAUGE_STYLE, figure);
      chartBlob = await canvasToBlob(canvas);
    }
  }
  return chartBlob;
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
  return new Promise((resolve) => {
    const f = new FileReader();
    f.addEventListener("load", () => {
      resolve(f.result as string);
    });
    f.readAsDataURL(blob);
  });
}
