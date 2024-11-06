import { ChartCreationContext } from "../../../src";
import { PieChart } from "../../../src/helpers/figures/charts";
import { createChart } from "../../test_helpers";
import { getChartLegendLabels } from "../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("pie chart", () => {
  test("create pie chart from creation context", () => {
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
    const definition = PieChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "pie",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      isDoughnut: false,
      showValues: false,
    });
  });

  test("Pie chart legend", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "P1",  B1: "1",  C1: "3",
      A2: "P2",  B2: "2",  C2: "4",
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B2" }, { dataRange: "Sheet1!C1:C2" }],
        labelRange: "Sheet1!A1:A2",
        dataSetsHaveTitle: false,
        type: "pie",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        text: "P1",
        fillStyle: "#4EA7F2",
        hidden: false,
        lineWidth: 2,
        pointStyle: "rect",
        strokeStyle: "#4EA7F2",
      },
      {
        text: "P2",
        fillStyle: "#EA6175",
        hidden: false,
        lineWidth: 2,
        pointStyle: "rect",
        strokeStyle: "#EA6175",
      },
    ]);
  });
});
