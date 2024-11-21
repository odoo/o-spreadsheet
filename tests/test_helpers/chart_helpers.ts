import { Model, SpreadsheetChildEnv, UID } from "../../src";
import { range } from "../../src/helpers";
import { simulateClick } from "./dom_helper";
import { nextTick } from "./helpers";

export function isChartAxisStacked(model: Model, chartId: UID, axis: "x" | "y"): boolean {
  return getChartConfiguration(model, chartId).options?.scales?.[axis]?.stacked;
}

export function getChartConfiguration(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId) as any;
  return runtime.chartJsConfig;
}

export function getChartLegendLabels(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId) as any;
  const fakeChart = {
    ...runtime.chartJsConfig,
    isDatasetVisible: (index) => true,
  };
  return runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.(fakeChart as any);
}

export function getCategoryAxisTickLabels(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId) as any;
  const labels = runtime.chartJsConfig.data.labels;
  const fakeChart = {
    // Category axis callback's tick internal value is the index of the label. We use getLabelForValue to get the actual label
    // https://www.chartjs.org/docs/latest/axes/labelling.html#creating-custom-tick-formats
    getLabelForValue: (index: number) => labels[index],
  };

  return range(0, labels.length).map((index) =>
    runtime.chartJsConfig.options.scales.x.ticks.callback.bind(fakeChart)(index)
  );
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
