import { ChartCreationContext, Model } from "../../../src";
import { LineChart } from "../../../src/helpers/figures/charts";
import { getChartLegendLabels, isChartAxisStacked } from "../../test_helpers/chart_helpers";
import { createChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

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
      showValues: false,
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
      showValues: false,
    });
  });

  test("Stacked line chart", () => {
    const model = createModelFromGrid({
      B1: "first column dataset",
      B2: "10",
      B3: "11",
      B4: "12",
    });
    createChart(model, { type: "line", dataSets: [{ dataRange: "Sheet1!B1:B4" }] }, "chartId");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeFalsy();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeFalsy();

    updateChart(model, "chartId", { stacked: true });
    const runtime = model.getters.getChartRuntime("chartId") as any;
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();
  });

  test("Area chart", () => {
    const model = createModelFromGrid({
      B1: "first column dataset",
      B2: "10",
      B3: "11",
      B4: "12",
      C1: "second column dataset",
      C2: "13",
      C3: "14",
      C4: "15",
    });
    createChart(
      model,
      { type: "line", dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }] },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true });
    runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#EA617566");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeFalsy();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeFalsy();
  });

  test("Stacked area chart", () => {
    const model = createModelFromGrid({
      B1: "first column dataset",
      B2: "10",
      B3: "11",
      B4: "12",
      C1: "second column dataset",
      C2: "13",
      C3: "14",
      C4: "15",
    });
    createChart(
      model,
      { type: "line", dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }] },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true, stacked: true });
    runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("-1"); // fill until the previous dataset
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#EA617566");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
  });

  test("Trend lines have no fill color in area chart", () => {
    const model = new Model();
    setCellContent(model, "A1", "data");
    setCellContent(model, "A2", "3");
    setCellContent(model, "A3", "4");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "A1:A3", trend: { type: "polynomial", order: 1, display: true } }],
        fillArea: true,
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[0].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe(false);
  });

  test("Line chart legend", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "4",
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
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        fontColor: "#000000",
        fillStyle: "#f00",
        text: "serie_1",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#f00",
      },
      {
        fontColor: "#000000",
        fillStyle: "#00f",
        text: "serie_2",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#00f",
      },
    ]);
  });
});
