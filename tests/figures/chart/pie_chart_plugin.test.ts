import { ChartCreationContext } from "../../../src";
import { getChartDefinitionFromContextCreation } from "../../../src/helpers/figures/charts";

describe("pie chart", () => {
  test("create pie chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      background: "#123456",
      title: { text: "hello there" },
      range: ["Sheet1!B1:B4"],
      auxiliaryRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      verticalAxisPosition: "right",
      cumulative: true,
      labelsAsText: true,
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
    };
    const definition = getChartDefinitionFromContextCreation(context, "pie");
    expect(definition).toEqual({
      type: "pie",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: ["Sheet1!B1:B4"],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
    });
  });
});
