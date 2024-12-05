import { Model, SpreadsheetChildEnv, UID } from "../../src";
import { toHex } from "../../src/helpers";
import { click, simulateClick } from "./dom_helper";
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

export function getColorPickerValue(fixture: HTMLElement, selector: string) {
  const color = fixture
    .querySelector<HTMLElement>(selector)!
    .querySelector<HTMLElement>(".o-round-color-picker-button")?.style.background;
  return toHex(color ?? "");
}

export async function editColorPicker(fixture: HTMLElement, selector: string, color: string) {
  await click(fixture.querySelector(selector + " .o-round-color-picker-button")!);
  await click(fixture, `.o-color-picker-line-item[data-color='${color}'`);
}
