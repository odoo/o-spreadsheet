import { ChartCreationContext } from "../../../src";
import { LineChart } from "../../../src/helpers/figures/charts";

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
    });
  });
});
