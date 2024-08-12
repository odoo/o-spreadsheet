import { ChartCreationContext, Model } from "../../../src";
import { LineChart } from "../../../src/helpers/figures/charts";
import { isChartAxisStacked } from "../../test_helpers/chart_helpers";
import { createChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";

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
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#EA617566");
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
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("-1"); // fill until the previous dataset
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#EA617566");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeUndefined();
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
  });

  test("trend line opacity is preserved when choosing a custom color", () => {
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
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toBe("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#A6D4F866");

    updateChart(model, "chartId", {
      dataSets: [
        {
          dataRange: "A1:A3",
          trend: { type: "polynomial", order: 1, display: true, color: "#112233" },
        },
      ],
    });

    runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.data.datasets[1].fill).toBe("origin");
    expect(runtime.chartJsConfig.data.datasets[1].borderColor).toBe("#112233");
    expect(runtime.chartJsConfig.data.datasets[1].backgroundColor).toBe("#11223366");
  });
});
