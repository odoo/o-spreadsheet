import { ChartCreationContext, Model, SpreadsheetChildEnv, UID } from "../../src";
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

export const TEST_CHART_CREATION_CONTEXT: Required<ChartCreationContext> = {
  background: "#123456",
  title: { text: "hello there" },
  range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
  auxiliaryRange: "Sheet1!A1:A4",
  legendPosition: "bottom",
  cumulative: true,
  labelsAsText: true,
  dataSetsHaveTitle: true,
  aggregated: true,
  stacked: true,
  firstValueAsSubtotal: true,
  showConnectorLines: false,
  showSubTotals: true,
  axesDesign: {},
  fillArea: true,
  showValues: false,
  headerDesign: { bold: false },
  showHeaders: true,
  showLabels: false,
  valuesDesign: { italic: true },
  coloringOptions: { type: "categoryColor", colors: [], highlightBigValues: true },
};
