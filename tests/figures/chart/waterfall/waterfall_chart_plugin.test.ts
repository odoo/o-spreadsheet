import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import { WaterfallChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/waterfall_chart";
import { ChartMeta } from "chart.js";
import { ChartCreationContext, Model, UID } from "../../../../src";
import { WaterfallChart } from "../../../../src/helpers/figures/charts";
import {
  createWaterfallChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartConfiguration,
  getChartTooltipValues,
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import { nextTick } from "../../../test_helpers/helpers";

let model: Model;

function getWaterfallRuntime(chartId: UID): WaterfallChartRuntime {
  return model.getters.getChartRuntime(chartId) as WaterfallChartRuntime;
}

describe("Waterfall chart", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Waterfall runtime with single dataset", () => {
    setCellContent(model, "A1", "10");
    setCellContent(model, "A2", "-20");
    setCellContent(model, "A3", "30");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: false,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [0, 10],
      [10, -10],
      [-10, 20],
    ]);
  });

  test("Waterfall runtime with multiple datasets", () => {
    setCellContent(model, "A1", "Value 1");
    setCellContent(model, "A2", "Value 2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    setCellContent(model, "C1", "30");
    setCellContent(model, "C2", "-40");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A2",
        dataSets: [{ dataRange: "B1:C2" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: false,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [0, 10],
      [10, -10],
      [-10, 20],
      [20, -20],
    ]);
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.labels).toEqual([
      "Value 1",
      "Value 2",
      "Value 1",
      "Value 2",
    ]);
  });

  test("Waterfall runtime with subtotals ", () => {
    setCellContent(model, "A1", "Value 1");
    setCellContent(model, "A2", "Value 2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    setCellContent(model, "C1", "30");
    setCellContent(model, "C2", "-40");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A2",
        dataSets: [{ dataRange: "B1:C2" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: true,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [0, 10],
      [10, -10],
      [0, -10], //subtotal
      [-10, 20],
      [20, -20],
      [0, -20], //subtotal
    ]);
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.labels).toEqual([
      "Value 1",
      "Value 2",
      "Subtotal",
      "Value 1",
      "Value 2",
      "Subtotal",
    ]);
  });

  test("Waterfall runtime with empty values", () => {
    setCellContent(model, "A1", "label1");
    setCellContent(model, "A2", "label2");
    setCellContent(model, "A3", "label3");
    setCellContent(model, "A4", "label4");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B3", "30");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A4",
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: true,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [0, 10],
      [10, 10],
      [10, 40],
      [40, 40],
      [0, 40], // subtotal
    ]);
  });

  test("Waterfall runtime with aggregate", () => {
    setCellContent(model, "A1", "label1");
    setCellContent(model, "A2", "label2");
    setCellContent(model, "A3", "label1");
    setCellContent(model, "A4", "label2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    setCellContent(model, "B3", "20");
    setCellContent(model, "B4", "10");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A4",
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: false,
      aggregated: true,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [0, 30], // 10 + 20
      [30, 20], // -20 + 10
    ]);
  });

  test("Runtime with showConnectorLines", () => {
    const chartId = createWaterfallChart(model, { showConnectorLines: true });
    expect(
      (getWaterfallRuntime(chartId).chartJsConfig.options?.plugins as any).waterfallLinesPlugin
    ).toEqual({
      showConnectorLines: true,
    });

    updateChart(model, chartId, { showConnectorLines: false });
    expect(
      (getWaterfallRuntime(chartId).chartJsConfig.options?.plugins as any).waterfallLinesPlugin
    ).toEqual({
      showConnectorLines: false,
    });
  });

  test("Runtime with firstValueAsSubtotal, the first bar have the subtotal color", () => {
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
      }),
      firstValueAsSubtotal: true,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].backgroundColor).toEqual([
      CHART_WATERFALL_SUBTOTAL_COLOR,
      CHART_WATERFALL_NEGATIVE_COLOR,
    ]);
  });

  test("Waterfall bar colors change for negative, positive and subtotals ", () => {
    setCellContent(model, "A1", "20");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "-20");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showSubTotals: true,
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].backgroundColor).toEqual([
      CHART_WATERFALL_POSITIVE_COLOR,
      CHART_WATERFALL_POSITIVE_COLOR,
      CHART_WATERFALL_NEGATIVE_COLOR,
      CHART_WATERFALL_SUBTOTAL_COLOR,
    ]);

    updateChart(model, chartId, {
      positiveValuesColor: "#FF0000",
      negativeValuesColor: "#00FF00",
      subTotalValuesColor: "#0000FF",
    });
    expect(getWaterfallRuntime(chartId).chartJsConfig.data.datasets[0].backgroundColor).toEqual([
      "#FF0000",
      "#FF0000",
      "#00FF00",
      "#0000FF",
    ]);
  });

  test("Waterfall bar tooltip", () => {
    setCellContent(model, "A1", "Dataset 1");
    setCellContent(model, "B1", "Dataset 2");
    setCellContent(model, "A2", "30");
    setFormat(model, "A2", "0[$€]");
    setCellContent(model, "B2", "-40");
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:B2" }],
        dataSetsHaveTitle: true,
      }),
      showSubTotals: false,
    });
    const runtime = getWaterfallRuntime(chartId);

    let tooltipItem = { raw: [0, 30], dataIndex: 0, dataset: { xAxisID: "x" } };
    let tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Dataset 1", label: "30€" });

    tooltipItem = { raw: [30, -10], dataIndex: 1, dataset: { xAxisID: "x" } };
    tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Dataset 2", label: "-40€" });
  });

  test("Waterfall legend", () => {
    const chartId = createWaterfallChart(model, {});
    let runtime = getWaterfallRuntime(chartId);
    const fontColor = "#000000";
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.({} as any)
    ).toEqual([
      {
        text: "Positive values",
        fillStyle: CHART_WATERFALL_POSITIVE_COLOR,
        fontColor,
        pointStyle: "rect",
        strokeStyle: CHART_WATERFALL_POSITIVE_COLOR,
      },
      {
        text: "Negative values",
        fillStyle: CHART_WATERFALL_NEGATIVE_COLOR,
        fontColor,
        pointStyle: "rect",
        strokeStyle: CHART_WATERFALL_NEGATIVE_COLOR,
      },
    ]);

    updateChart(model, chartId, { showSubTotals: true });
    runtime = getWaterfallRuntime(chartId);
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.({} as any)
    ).toEqual([
      {
        text: "Positive values",
        fillStyle: CHART_WATERFALL_POSITIVE_COLOR,
        fontColor,
        pointStyle: "rect",
        strokeStyle: CHART_WATERFALL_POSITIVE_COLOR,
      },
      {
        text: "Negative values",
        fillStyle: CHART_WATERFALL_NEGATIVE_COLOR,
        fontColor,
        pointStyle: "rect",
        strokeStyle: CHART_WATERFALL_NEGATIVE_COLOR,
      },
      {
        text: "Subtotals",
        fillStyle: CHART_WATERFALL_SUBTOTAL_COLOR,
        fontColor,
        pointStyle: "rect",
        strokeStyle: CHART_WATERFALL_SUBTOTAL_COLOR,
      },
    ]);

    updateChart(model, chartId, {
      positiveValuesColor: "#FF0000",
      negativeValuesColor: "#00FF00",
      subTotalValuesColor: "#0000FF",
    });
    runtime = getWaterfallRuntime(chartId);
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.({} as any)
    ).toMatchObject([{ fillStyle: "#FF0000" }, { fillStyle: "#00FF00" }, { fillStyle: "#0000FF" }]);
  });

  test("Waterfall legend is displayed even if there is no labels", () => {
    const chartId = createWaterfallChart(model, {});
    let runtime = getWaterfallRuntime(chartId);
    expect(runtime.chartJsConfig.options?.plugins?.legend?.display).not.toEqual(false);

    updateChart(model, chartId, { legendPosition: "none" });
    runtime = getWaterfallRuntime(chartId);
    expect(runtime.chartJsConfig.options?.plugins?.legend?.display).toEqual(false);
  });

  test("create waterfall chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A1:A4",
      }),
    };
    const definition = WaterfallChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "waterfall",
      background: "#123456",
      title: { text: "hello there" },
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      legendPosition: "bottom",
      aggregated: true,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
      axesDesign: {},
      verticalAxisPosition: "left",
      showValues: false,
      zoomable: false,
      humanize: false,
    });
  });

  test("Waterfall show value is displayed as delta", () => {
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A4" }],
      }),
      showSubTotals: true,
    });
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    setCellContent(model, "A4", "-15");
    setFormat(model, "A1:A3", "0$");
    const runtime = getWaterfallRuntime(chartId);
    const dataset = runtime.chartJsConfig.data.datasets[0];
    const mockDataset = { _dataset: dataset, yAxisID: "y" } as unknown as ChartMeta;
    const callback = runtime.chartJsConfig.options?.plugins?.chartShowValuesPlugin?.callback as any;
    expect(callback(0, mockDataset, 0)).toEqual("+10$");
    expect(callback(0, mockDataset, 1)).toEqual("+20$");
    expect(callback(0, mockDataset, 2)).toEqual("-15$");
    expect(callback(0, mockDataset, 3)).toEqual("15$");
  });

  test("Humanization is taken into account for the axis ticks of a waterfall chart", async () => {
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A4" }],
      }),
      showSubTotals: true,
      humanize: false,
    });
    await nextTick();
    let axis = getChartConfiguration(model, chartId).options.scales.y;
    const valuesBefore = [1e3, 1e6, 1e9, 1e12].map(axis.ticks.callback);
    expect(valuesBefore).toEqual(["1,000", "1,000,000", "1,000,000,000", "1,000,000,000,000"]);
    updateChart(model, chartId, { humanize: true });
    await nextTick();
    axis = getChartConfiguration(model, chartId).options.scales.y;
    const valuesAfter = [1e3, 1e6, 1e9, 1e12].map(axis.ticks.callback);
    expect(valuesAfter).toEqual(["1,000", "1,000k", "1,000m", "1,000b"]);
  });

  test("Waterfall chart showValues plugin takes humanization into account", async () => {
    const chartId = createWaterfallChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A4" }],
      }),
      showSubTotals: true,
      humanize: false,
    });
    setCellContent(model, "A2", "1000");
    setCellContent(model, "A3", "1000000");
    setCellContent(model, "A4", "1000000000");

    const runtime = getWaterfallRuntime(chartId);
    const dataset = runtime.chartJsConfig.data.datasets[0];
    const ds = { _dataset: dataset, yAxisID: "y" } as unknown as ChartMeta;
    let plugin = getChartConfiguration(model, chartId).options?.plugins?.chartShowValuesPlugin;
    expect(plugin.callback(0, ds, 0)).toEqual("+1,000");
    expect(plugin.callback(0, ds, 1)).toEqual("+1,000,000");
    expect(plugin.callback(0, ds, 2)).toEqual("+1,000,000,000");
    updateChart(model, chartId, { humanize: true });
    await nextTick();
    plugin = getChartConfiguration(model, chartId).options?.plugins?.chartShowValuesPlugin;
    expect(plugin.callback(0, ds, 0)).toEqual("+1,000");
    expect(plugin.callback(0, ds, 1)).toEqual("+1,000k");
    expect(plugin.callback(0, ds, 2)).toEqual("+1,000m");
  });
});
