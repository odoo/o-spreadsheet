import { Model, SpreadsheetChildEnv, UID } from "../../src";
<<<<<<< 18.0
import { simulateClick } from "./dom_helper";
||||||| e3cc173c95b85f7769a3a59f27c066e92cf89515
import { Model, UID } from "../../src";
=======
>>>>>>> 64a7f23afb5382ca32f89b6761dfaca832dc6862
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
<<<<<<< 18.0

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
||||||| e3cc173c95b85f7769a3a59f27c066e92cf89515
=======
>>>>>>> 64a7f23afb5382ca32f89b6761dfaca832dc6862
