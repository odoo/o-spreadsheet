import { Model, SpreadsheetChildEnv, UID } from "../../src";
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
