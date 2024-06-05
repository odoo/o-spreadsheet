import { ChartCreationContext, Model } from "../../../src";
import { PyramidChart } from "../../../src/helpers/figures/charts/pyramid_chart";
import { PyramidChartDefinition } from "../../../src/types/chart/pyramid_chart";
import { createChart, setCellContent, setFormat } from "../../test_helpers/commands_helpers";

let model: Model;
describe("population pyramid chart", () => {
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
      stacked: false,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
      axesDesign: {},
    };
    const definition = PyramidChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "pyramid",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      axesDesign: {},
      horizontal: true,
    });
  });

  describe("Pyramid chart definition and runtime", () => {
    beforeEach(() => {
      model = new Model();
    });

    test("We only keep the first two datasets", () => {
      const dataSets = [{ dataRange: "A1" }, { dataRange: "A2" }, { dataRange: "A3" }];
      createChart(model, { type: "pyramid", dataSets }, "id");
      const definition = model.getters.getChartDefinition("id") as PyramidChartDefinition;
      expect(definition.dataSets).toEqual([{ dataRange: "A1" }, { dataRange: "A2" }]);
    });

    test("Runtime is a stacked bar chart, with the second dataset converted to negative values", () => {
      setCellContent(model, "A1", "5");
      setCellContent(model, "A2", "12");
      setCellContent(model, "B1", "10");
      setCellContent(model, "B2", "3");
      const dataSets = [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }];
      createChart(model, { type: "pyramid", dataSets, dataSetsHaveTitle: false }, "id");
      const runtime = model.getters.getChartRuntime("id") as any;
      const data = runtime.chartJsConfig.data;
      expect(data.datasets).toHaveLength(2);
      expect(data.datasets[0]).toMatchObject({ data: [5, 12] });
      expect(data.datasets[1]).toMatchObject({ data: [-10, -3] });
      expect(runtime.chartJsConfig.options?.scales?.x?.stacked).toBe(true);
    });

    test("Negatives values are ignored in the runtime", () => {
      setCellContent(model, "A1", "5");
      setCellContent(model, "A2", "-12");
      setCellContent(model, "B1", "-10");
      setCellContent(model, "B2", "3");
      const dataSets = [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }];
      createChart(model, { type: "pyramid", dataSets, dataSetsHaveTitle: false }, "id");
      const runtime = model.getters.getChartRuntime("id") as any;
      const data = runtime.chartJsConfig.data;
      expect(data.datasets).toHaveLength(2);
      expect(data.datasets[0]).toMatchObject({ data: [5, 0] });
      expect(data.datasets[1]).toMatchObject({ data: [0, -3] });
    });

    test("Axis ticks and tooltips do not show negative values", () => {
      setCellContent(model, "A1", "5");
      setCellContent(model, "A2", "10");
      setFormat(model, "A1:A2", "#,##0[$€]");

      createChart(
        model,
        { type: "pyramid", dataSets: [{ dataRange: "A1" }, { dataRange: "A2" }] },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as any;
      const options = runtime.chartJsConfig.options;
      // Second dataset is converted to negative values for chartJS display, but it should be invisible to the user
      expect(options.scales.x.ticks.callback(-10)).toBe("10€");

      const tooltipTestItem = { parsed: { x: -10, y: "label" }, label: "dataSetLabel" };
      const tooltip = runtime.chartJsConfig.options?.plugins?.tooltip as any;
      expect(tooltip?.callbacks?.label(tooltipTestItem)).toBe("dataSetLabel: 10€");
    });
  });
});
