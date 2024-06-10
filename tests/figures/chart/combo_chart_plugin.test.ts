import { ChartCreationContext, Model } from "../../../src";
import { ComboChartRuntime } from "../../../src/types/chart/combo_chart";
import { createChart, setCellContent, setCellFormat } from "../../test_helpers/commands_helpers";
import { ComboChart } from "./../../../src/helpers/figures/charts/combo_chart";

describe("combo chart", () => {
  test("create combo chart from creation context", () => {
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
    };
    const definition = ComboChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "combo",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      axesDesign: {},
    });
  });

  test("both axis formats are based on their data set", () => {
    const model = new Model();
    setCellContent(model, "A1", "Alice");
    setCellContent(model, "A2", "Bob");

    // first data set
    setCellContent(model, "B1", "1");
    setCellContent(model, "B2", "2");
    setCellFormat(model, "B1", "0.00%");
    setCellFormat(model, "B2", "0.00%");

    // second data set
    setCellContent(model, "C1", "10");
    setCellContent(model, "C2", "20");
    setCellFormat(model, "C1", "0.00[$$]");
    setCellFormat(model, "C2", "0.00[$$]");

    createChart(
      model,
      {
        type: "combo",
        labelRange: "A1:A2",
        dataSets: [
          { dataRange: "B1:B2", yAxisId: "y" },
          { dataRange: "C1:C2", yAxisId: "y1" },
        ],
        dataSetsHaveTitle: false,
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as ComboChartRuntime;
    const index = 0; // because chart.js types expects an index
    const ticks = []; // because chart.js types expects the ticks
    expect(
      runtime.chartJsConfig.options?.scales?.y?.ticks?.callback?.apply(null, [1, index, ticks])
    ).toBe("100.00%");
    expect(
      runtime.chartJsConfig.options?.scales?.y1?.ticks?.callback?.apply(null, [1, index, ticks])
    ).toBe("1.00$");
  });
});
