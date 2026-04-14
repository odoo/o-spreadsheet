import { Canvas } from "canvas";
import { ChartJSRuntime, Model, SpreadsheetChildEnv, UID } from "../../src";
import { deepCopy } from "../../src/helpers";
import { getChartJSConstructor } from "../../src/helpers/figures/charts";
import { simulateClick } from "./dom_helper";
import { nextTick } from "./helpers";

export function isChartAxisStacked(model: Model, chartId: UID, axis: "x" | "y"): boolean {
  return getChartConfiguration(model, chartId).options?.scales?.[axis]?.stacked;
}

export function getChartConfiguration(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId) as any;
  return runtime.chartJsConfig;
}

export async function openChartConfigSidePanel(model: Model, env: SpreadsheetChildEnv, id: UID) {
  model.dispatch("SELECT_FIGURE", { id });
  env.openSidePanel("ChartPanel");
  await nextTick();
}

export async function openChartDesignSidePanel(
  model: Model,
  env: SpreadsheetChildEnv,
  fixture: HTMLElement,
  id: UID
) {
  if (!fixture.querySelector(".o-chart")) {
    await openChartConfigSidePanel(model, env, id);
  }
  await simulateClick(".o-panel-element.inactive");
}

export function drawChartOnNodeCanvas(runtime: ChartJSRuntime) {
  const config = deepCopy(runtime.chartJsConfig);
  config.plugins = [
    {
      id: "customCanvasBackgroundColor",
      beforeDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = runtime.background || "#ffffff";
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    },
  ];
  config.options!.responsive = false;

  const canvas = new Canvas(400, 400);
  canvas["getAttribute"] = (attribute) => {
    if (attribute === "height") {
      return 400;
    }
    if (attribute === "width") {
      return 400;
    }
    throw new Error(`Attribute ${attribute} not implemented in mock`);
  };
  canvas["style"] = new CSSStyleDeclaration();
  canvas["addEventListener"] = () => {};
  const ctx = canvas.getContext("2d")! as unknown as CanvasRenderingContext2D;
  const Chart = getChartJSConstructor();
  const chart = new Chart(ctx, config);
  chart.draw();
  return canvas.toBuffer("image/png");
}
