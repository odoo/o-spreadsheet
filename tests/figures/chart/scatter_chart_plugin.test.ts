import { ChartCreationContext } from "../../../src";
import { ScatterChart } from "../../../src/helpers/figures/charts/scatter_chart";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../test_helpers/chart_helpers";

describe("scatter chart", () => {
  test("create scatter chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
    };
    const definition = ScatterChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      aggregated: true,
      type: "scatter",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      labelsAsText: true,
      axesDesign: {},
      showValues: false,
      humanize: false,
    });
  });
});
