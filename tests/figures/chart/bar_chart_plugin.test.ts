import { ChartCreationContext, Model } from "../../../src";
import { BarChart } from "../../../src/helpers/figures/charts";
import { BarChartRuntime } from "../../../src/types/chart";
import { isChartAxisStacked } from "../../test_helpers/chart_helpers";
import {
  createChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../test_helpers/commands_helpers";

let model: Model;
describe("bar chart", () => {
  test("create bar chart from creation context", () => {
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
    const definition = BarChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "bar",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      axesDesign: {},
      showValues: false,
    });
  });

  test("Stacked bar", () => {
    const model = new Model();
    createChart(model, { type: "bar", stacked: false }, "chartId");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeFalsy();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeFalsy();

    updateChart(model, "chartId", { stacked: true });
    expect(isChartAxisStacked(model, "chartId", "x")).toBe(true);
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
  });

  describe("Horizontal bar chart", () => {
    beforeEach(() => {
      model = new Model();
    });

    test("Chart is set as horizontal in chartJS runtime", () => {
      createChart(model, { horizontal: true, type: "bar" }, "id");
      const runtime = model.getters.getChartRuntime("id") as BarChartRuntime;
      expect(runtime.chartJsConfig.options?.indexAxis).toBe("y");
    });

    test("Axis and tooltips are correctly setup for horizontal chart", () => {
      setCellContent(model, "A1", "5");
      setFormat(model, "A1", "#,##0[$€]");

      createChart(
        model,
        {
          horizontal: true,
          type: "bar",
          dataSets: [{ dataRange: "A1", yAxisId: "y" }],
          axesDesign: { x: { title: { text: "xAxis" } }, y: { title: { text: "yAxis" } } },
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as BarChartRuntime;
      const options = runtime.chartJsConfig.options as any;
      expect(options.scales.x.title.text).toBe("xAxis");
      expect(options.scales.x.ticks.callback(5)).toBe("5€");
      expect(options.scales.y.title.text).toBe("yAxis");
      expect(options.scales.y.ticks.callback).toBeUndefined();

      const tooltipTestItem = {
        parsed: { x: 5, y: "label" },
        label: "dataSetLabel",
        dataset: { xAxisID: "x" },
      };
      const tooltip = runtime.chartJsConfig.options?.plugins?.tooltip as any;
      expect(tooltip?.callbacks?.label(tooltipTestItem)).toBe("dataSetLabel: 5€");
    });

    test("Horizontal bar chart cannot have datasets on the right", () => {
      const model = new Model({
        sheets: [
          {
            name: "Sheet1",
            colNumber: 10,
            rowNumber: 10,
            rows: {},
            cells: {
              B1: { content: "first column dataset" },
              B2: { content: "10" },
              B3: { content: "11" },
              B4: { content: "12" },
            },
          },
        ],
      });
      // Note: this is a chartJS limitation, it bugs when trying to display an horizontal bar chart with datasets with
      // axis on both right and left sides
      createChart(
        model,
        {
          horizontal: true,
          type: "bar",
          dataSets: [{ dataRange: "B1:B4", yAxisId: "y1" }],
          axesDesign: { x: { title: { text: "xAxis" } }, y1: { title: { text: "yAxis" } } },
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as any;
      expect(runtime.chartJsConfig.options?.scales?.y1).toBe(undefined);
      expect(runtime.chartJsConfig.data.datasets[0].yAxisID).toBe("y");
    });
  });
});
