import { ChartCreationContext, Model } from "../../../src";
import { LineChart } from "../../../src/helpers/figures/charts";
import { LineChartRuntime } from "../../../src/types/chart";
import { isChartAxisStacked } from "../../test_helpers/chart_helpers";
import { createChart, updateChart } from "../../test_helpers/commands_helpers";

describe("line chart", () => {
  test("create line chart from creation context", () => {
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
      fillArea: true,
    };
    const definition = LineChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "line",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      labelsAsText: true,
      cumulative: true,
      axesDesign: {},
      fillArea: true,
    });
  });

  test("Stacked line chart", () => {
    const model = new Model();
    createChart(model, { type: "line", dataSets: [{ dataRange: "A1" }] }, "chartId");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeUndefined();

    updateChart(model, "chartId", { stacked: true });
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();
  });

  test("Area chart", () => {
    const model = new Model();
    createChart(
      model,
      { type: "line", dataSets: [{ dataRange: "A1" }, { dataRange: "A2" }] },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true });
    runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#1F77B466");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#FF7F0E66");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeUndefined();
  });

  test("Stacked area chart", () => {
    const model = new Model();
    createChart(
      model,
      { type: "line", dataSets: [{ dataRange: "A1" }, { dataRange: "A2" }] },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true, stacked: true });
    runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#1F77B466");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("-1"); // fill until the previous dataset
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#FF7F0E66");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
  });

  test("Line chart legend", () => {
    const model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            A3: { content: "3" },
            A4: { content: "4" },
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "Sheet1!A1:A2", backgroundColor: "#f00", label: "serie_1" },
          { dataRange: "Sheet1!A3:A4", backgroundColor: "#00f", label: "serie_2" },
        ],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    const fakeChart = {
      ...runtime.chartJsConfig,
      isDatasetVisible: (index) => true,
    };
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.(fakeChart as any)
    ).toEqual([
      {
        text: "serie_1",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#f00",
      },
      {
        text: "serie_2",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#00f",
      },
    ]);
  });
});
