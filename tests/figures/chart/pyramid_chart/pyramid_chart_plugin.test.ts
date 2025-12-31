import { ChartCreationContext, ChartJSRuntime, Model } from "../../../../src";
import { PyramidChart } from "../../../../src/helpers/figures/charts/pyramid_chart";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartConfiguration,
  getChartTooltipValues,
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import {
  createChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../../test_helpers/commands_helpers";

let model: Model;
describe("population pyramid chart", () => {
  test("create pyramid chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A1:A4",
      }),
    };
    const definition = PyramidChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "pyramid",
      background: "#123456",
      title: { text: "hello there" },
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      legendPosition: "bottom",
      aggregated: true,
      stacked: true,
      axesDesign: {},
      horizontal: true,
      showValues: false,
      humanize: false,
    });
  });

  describe("Pyramid chart definition and runtime", () => {
    beforeEach(() => {
      model = new Model();
    });

    test("Runtime is a stacked bar chart, with the second dataset converted to negative values", () => {
      setCellContent(model, "A1", "5");
      setCellContent(model, "A2", "12");
      setCellContent(model, "B1", "10");
      setCellContent(model, "B2", "3");
      const dataSets = [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }];
      const dataSource = toChartDataSource({ dataSets, dataSetsHaveTitle: false });
      createChart(model, { type: "pyramid", ...dataSource }, "id");
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
      const dataSource = toChartDataSource({ dataSets, dataSetsHaveTitle: false });
      createChart(model, { type: "pyramid", ...dataSource }, "id");
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
        {
          type: "pyramid",
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "A2" }],
            dataSetsHaveTitle: false,
          }),
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as any;
      const options = runtime.chartJsConfig.options;
      // Second dataset is converted to negative values for chartJS display, but it should be invisible to the user
      expect(options.scales.x.ticks.callback(-10)).toBe("10€");

      const tooltipTestItem = {
        parsed: { x: -10, y: "label" },
        label: "dataSetLabel",
        dataset: { xAxisID: "x" },
      };
      const tooltipValues = getChartTooltipValues(runtime, tooltipTestItem);
      expect(tooltipValues).toEqual({ beforeLabel: "dataSetLabel", label: "10€" });
    });

    test("The negative and positive values have the same max value", () => {
      setCellContent(model, "A1", "5");
      setCellContent(model, "A2", "33");

      createChart(
        model,
        {
          type: "pyramid",
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "A2" }],
            dataSetsHaveTitle: false,
          }),
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as ChartJSRuntime;
      const options = runtime.chartJsConfig.options;
      expect(options?.scales?.x?.suggestedMin).toBe(-33);
      expect(options?.scales?.x?.suggestedMax).toBe(33);
    });

    test("Pyramid chart showValues plugin does not display negative or zero values", () => {
      createChart(
        model,
        {
          type: "pyramid",
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1:A2" }, { dataRange: "A3:A4" }],
          }),
        },
        "43"
      );

      const config = getChartConfiguration(model, "43");
      const plugin = config.options?.plugins?.chartShowValuesPlugin;

      expect(plugin.callback(10, "x")).toBe("10");
      expect(plugin.callback(-10, "x")).toBe("10");
      expect(plugin.callback(0, "x")).toBe("");
    });
  });
});

test("Humanization is taken into account for the axis ticks of a pyramid chart", async () => {
  model = new Model();
  createChart(
    model,
    {
      type: "pyramid",
      ...toChartDataSource({
        dataSets: [{ dataRange: "B2" }],
        labelRange: "A2",
      }),
      humanize: false,
    },
    "1"
  );
  let axis = getChartConfiguration(model, "1").options.scales.x;
  const valuesBefore = [1e3, 1e6].map(axis.ticks.callback);
  expect(valuesBefore).toEqual(["1,000", "1,000,000"]);
  updateChart(model, "1", { humanize: true });
  axis = getChartConfiguration(model, "1").options.scales.x;
  const valuesAfter = [1e3, 1e6].map(axis.ticks.callback);
  expect(valuesAfter).toEqual(["1,000", "1,000k"]);
});
