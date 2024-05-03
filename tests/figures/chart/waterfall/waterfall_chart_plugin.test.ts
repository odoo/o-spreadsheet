import { ChartCreationContext, Model, UID } from "../../../../src";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../src/constants";
import { getChartDefinitionFromContextCreation } from "../../../../src/helpers/figures/charts";
import { WaterfallChartRuntime } from "../../../../src/types/chart/waterfall_chart";
import { createWaterfallChart, setCellContent, updateChart } from "../../../test_helpers";

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
      dataSets: [{ dataRange: "A1:A3" }],
      dataSetsHaveTitle: false,
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
      labelRange: "A1:A2",
      dataSets: [{ dataRange: "B1:C2" }],
      dataSetsHaveTitle: false,
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
      labelRange: "A1:A2",
      dataSets: [{ dataRange: "B1:C2" }],
      dataSetsHaveTitle: false,
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
      labelRange: "A1:A4",
      dataSets: [{ dataRange: "B1:B4" }],
      dataSetsHaveTitle: false,
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
      labelRange: "A1:A4",
      dataSets: [{ dataRange: "B1:B4" }],
      dataSetsHaveTitle: false,
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
      dataSets: [{ dataRange: "B1:B2" }],
      firstValueAsSubtotal: true,
      dataSetsHaveTitle: false,
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
      dataSets: [{ dataRange: "A1:A3" }],
      dataSetsHaveTitle: false,
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
    setCellContent(model, "B2", "-40");
    const chartId = createWaterfallChart(model, {
      dataSets: [{ dataRange: "A1:B2" }],
      dataSetsHaveTitle: true,
      showSubTotals: false,
    });
    const runtime = getWaterfallRuntime(chartId);

    let tooltipItem = { raw: [0, 30], dataIndex: 0 };
    expect(
      // @ts-ignore
      runtime.chartJsConfig.options?.plugins?.tooltip?.callbacks?.label?.(tooltipItem)
    ).toEqual("Dataset 1: 30");

    tooltipItem = { raw: [30, -10], dataIndex: 1 };
    expect(
      // @ts-ignore
      runtime.chartJsConfig.options?.plugins?.tooltip?.callbacks?.label?.(tooltipItem)
    ).toEqual("Dataset 2: -40");
  });

  test("Waterfall legend", () => {
    const chartId = createWaterfallChart(model, {});
    let runtime = getWaterfallRuntime(chartId);
    const fontColor = "#000000";
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.({} as any)
    ).toEqual([
      { text: "Positive values", fillStyle: CHART_WATERFALL_POSITIVE_COLOR, fontColor },
      { text: "Negative values", fillStyle: CHART_WATERFALL_NEGATIVE_COLOR, fontColor },
    ]);

    updateChart(model, chartId, { showSubTotals: true });
    runtime = getWaterfallRuntime(chartId);
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.({} as any)
    ).toEqual([
      { text: "Positive values", fillStyle: CHART_WATERFALL_POSITIVE_COLOR, fontColor },
      { text: "Negative values", fillStyle: CHART_WATERFALL_NEGATIVE_COLOR, fontColor },
      { text: "Subtotals", fillStyle: CHART_WATERFALL_SUBTOTAL_COLOR, fontColor },
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
    };
    const definition = getChartDefinitionFromContextCreation(context, "waterfall");
    expect(definition).toEqual({
      type: "waterfall",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
      axesDesign: {},
      verticalAxisPosition: "left",
    });
  });
});
