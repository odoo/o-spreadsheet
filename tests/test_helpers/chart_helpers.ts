import { TooltipItem } from "chart.js";
import { ChartCreationContext, ChartJSRuntime, Model, SpreadsheetChildEnv, UID } from "../../src";
import { range, toHex } from "../../src/helpers";
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

export async function openChartConfigSidePanel(
  model: Model,
  env: SpreadsheetChildEnv,
  chartId: UID
) {
  const figureId = model.getters.getFigureIdFromChartId(chartId);
  if (!figureId) {
    throw new Error(`No figure found for chart ID: ${chartId}`);
  }
  model.dispatch("SELECT_FIGURE", { figureId });
  env.openSidePanel("ChartPanel");
  await nextTick();
}

export async function openChartDesignSidePanel(
  model: Model,
  env: SpreadsheetChildEnv,
  fixture: HTMLElement,
  chartId: UID
) {
  if (!fixture.querySelector(".o-chart")) {
    await openChartConfigSidePanel(model, env, chartId);
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

export function getChartTooltipItemFromDataset(
  chart: ChartJSRuntime,
  datasetIndex: number,
  dataIndex: number
): Partial<TooltipItem<any>> {
  const datasetPoint = chart.chartJsConfig!.data!.datasets![datasetIndex].data![dataIndex];
  const y = typeof datasetPoint === "number" ? datasetPoint : datasetPoint?.["y"];
  const x = chart.chartJsConfig!.data.labels![dataIndex];
  const point = chart.chartJsConfig.type === "pie" ? y : { x, y };
  return {
    label: "",
    parsed: point,
    raw: point,
    dataset: chart.chartJsConfig.data!.datasets[datasetIndex],
    datasetIndex,
    dataIndex,
  };
}

export function getChartTooltipValues(
  chart: ChartJSRuntime,
  tooltipItem: Partial<TooltipItem<any>>
) {
  const callbacks = chart.chartJsConfig!.options!.plugins!.tooltip!.callbacks! as any;
  return {
    label: callbacks.label(tooltipItem),
    beforeLabel: callbacks.beforeLabel(tooltipItem),
  };
}

export const GENERAL_CHART_CREATION_CONTEXT: Required<ChartCreationContext> = {
  background: "#123456",
  title: { text: "hello there" },
  range: [{ dataRange: "Sheet1!B1:B4" }],
  hierarchicalRanges: [],
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
  showValuesMode: "value",
  hideDataMarkers: false,
  funnelColors: [],
  showLabels: false,
  valuesDesign: {},
  groupColors: [],
  horizontal: false,
  isDoughnut: false,
  pieHolePercentage: 0,
  headerDesign: { bold: false },
  treemapColoringOptions: { type: "categoryColor", colors: [], useValueBasedGradient: true },
  showHeaders: true,
  zoomable: false,
  humanize: false,
};
