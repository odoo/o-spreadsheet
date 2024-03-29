import { ChartCreationContext } from "../../../src";
import { getChartDefinitionFromContextCreation } from "../../../src/helpers/figures/charts";

describe("combo chart", () => {
  test("create combo chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      background: "#123456",
      title: "hello there",
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
    const definition = getChartDefinitionFromContextCreation(context, "combo");
    expect(definition).toEqual({
      type: "combo",
      background: "#123456",
      title: "hello there",
      dataSets: ["Sheet1!B1:B4"],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      verticalAxisPosition: "right",
      dataSetsHaveTitle: true,
      aggregated: true,
      useBothYAxis: false,
    });
  });
});
