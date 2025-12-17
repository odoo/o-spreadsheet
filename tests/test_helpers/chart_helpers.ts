import { ComboChartDataSetStyle } from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { TooltipItem } from "chart.js";
import {
  ChartCreationContext,
  ChartJSRuntime,
  ChartRangeDataSource,
  CustomizedDataSet,
  DataSetStyle,
  Model,
  UID,
} from "../../src";
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

interface CoucouInput {
  dataSets?: (CustomizedDataSet & {
    dataRange: string;
    dataSetId?: UID;
    type?: "bar" | "line"; // for combo charts
  })[];
  labelRange?: string;
}

interface CoucouInputWithTitle extends CoucouInput {
  dataSetsHaveTitle: boolean;
}

interface CoucouOutput {
  dataSource: ChartRangeDataSource;
  dataSetStyles: Record<string, CustomizedDataSet>;
}

interface CoucouOutputWithTitle {
  dataSource: ChartRangeDataSource;
  dataSetStyles: DataSetStyle | ComboChartDataSetStyle;
}

export function toChartDataSource(args: CoucouInput): CoucouOutput;
export function toChartDataSource(args: CoucouInputWithTitle): CoucouOutputWithTitle;
export function toChartDataSource(
  args: CoucouInput | CoucouInputWithTitle
): CoucouOutput | CoucouOutputWithTitle {
  let { dataSets, labelRange } = args;
  if (!dataSets) {
    dataSets = [];
  }
  for (let i = 0; i < dataSets.length; i++) {
    if (!dataSets[i].dataSetId) {
      dataSets[i].dataSetId = i.toString();
    }
  }
  const dataSetStyles: Record<string, CustomizedDataSet> = {};
  for (const { dataSetId, dataRange, ...style } of dataSets) {
    if (Object.keys(style).length !== 0) {
      dataSetStyles[dataSetId!] = style;
    }
  }
  const result: CoucouOutput | CoucouOutputWithTitle = {
    dataSource: {
      // @ts-ignore
      dataSets: dataSets.map(({ dataRange, dataSetId }) => ({
        dataRange,
        dataSetId,
      })),
    },
    dataSetStyles,
  };
  if ("dataSetsHaveTitle" in args && args.dataSetsHaveTitle !== undefined) {
    result.dataSource = {
      ...result.dataSource,
      dataSetsHaveTitle: args.dataSetsHaveTitle,
    };
  }
  if (labelRange !== undefined) {
    result.dataSource = {
      ...result.dataSource,
      labelRange,
    };
  }
  return result;
}
// export function toChartDataSource({
//   dataSets,
//   labelRange,
// }: {
//   dataSets: (CustomizedDataSet | ComboChartDataSet)[];
//   labelRange?: string;
// }): {
//   dataSets: (CustomizedDataSet | ComboChartDataSet)[];
//   labelRange?: string;
// };
// export function toChartDataSource({
//   dataSets,
//   labelRange,
// }: {
//   dataSets: (CustomizedDataSet | ComboChartDataSet)[];
//   labelRange?: string;
//   dataSetsHaveTitle: boolean;
// }): {
//   dataSets: (CustomizedDataSet | ComboChartDataSet)[];
//   labelRange?: string;
//   dataSetsHaveTitle: boolean;
// };
// export function toChartDataSource({
//   dataSets,
//   labelRange,
//   dataSetsHaveTitle,
// }: {
//   dataSets: (CustomizedDataSet | ComboChartDataSet)[];
//   labelRange?: string;
//   dataSetsHaveTitle: boolean;
// }) {
//   const result = { dataSets, dataSetsHaveTitle, labelRange };
//   if (labelRange === undefined) {
//     delete result.labelRange;
//   }
//   if (dataSetsHaveTitle === undefined) {
//     // @ts-ignore
//     delete result.dataSetsHaveTitle;
//   }
//   return result;
// }

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
  await simulateClick(".o-sidePanel-tab.inactive");
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
  ...toChartDataSource({
    dataSets: [{ dataRange: "Sheet1!B1:B4" }],
    dataSetsHaveTitle: true,
  }),
  hierarchicalDataSource: {
    dataSets: [],
    dataSetsHaveTitle: true,
  },
  auxiliaryRange: "Sheet1!A1:A4",
  legendPosition: "bottom",
  cumulative: true,
  labelsAsText: true,
  aggregated: true,
  stacked: true,
  firstValueAsSubtotal: true,
  showConnectorLines: false,
  showSubTotals: true,
  axesDesign: {},
  fillArea: true,
  showValues: false,
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
