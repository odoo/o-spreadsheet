import { ChartCreationContext, Model } from "../../../src";
import { RadarChart } from "../../../src/helpers/figures/charts/radar_chart";
import { RadarChartRuntime } from "../../../src/types/chart/radar_chart";
import { createChart } from "../../test_helpers/commands_helpers";

describe("radar chart", () => {
  test("create radar chart from creation context", () => {
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
    const definition = RadarChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "radar",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      fillArea: true,
      stacked: true,
    });
  });

  test("Radar chart legend", () => {
    const model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            A3: { content: "3" },
            A4: { content: "4" },
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "Sheet1!A1:A2", backgroundColor: "#f00", label: "serie_1" },
          { dataRange: "Sheet1!A3:A4", backgroundColor: "#00f", label: "serie_2" },
        ],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as RadarChartRuntime;
    const fakeChart = {
      ...runtime.chartJsConfig,
      isDatasetVisible: (index) => true,
    };
    expect(
      runtime.chartJsConfig.options?.plugins?.legend?.labels?.generateLabels?.(fakeChart as any)
    ).toEqual([
      {
        color: "#000000",
        fontColor: "#000000",
        text: "serie_1",
        fillStyle: "#f00",
        hidden: false,
        lineWidth: 3,
        pointStyle: "rect",
        strokeStyle: "#FFFFFF",
      },
      {
        color: "#000000",
        fontColor: "#000000",
        text: "serie_2",
        fillStyle: "#00f",
        hidden: false,
        lineWidth: 3,
        pointStyle: "rect",
        strokeStyle: "#FFFFFF",
      },
    ]);
  });
});
