import { ChartCreationContext, Model } from "../../../src";
import { RadarChart } from "../../../src/helpers/figures/charts/radar_chart";
import { RadarChartRuntime } from "../../../src/types/chart/radar_chart";
import { createRadarChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";

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

  test("Dataset is filled if fillArea is set to true", () => {
    const model = new Model();
    setCellContent(model, "A2", "1");
    createRadarChart(model, { fillArea: false, dataSets: [{ dataRange: "A1:A2" }] }, "chartId");
    let runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0]?.backgroundColor).toBeFalsy();
    expect(runtime.chartJsConfig.data.datasets[0]?.["fill"]).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true });
    runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0]?.backgroundColor).toEqual("#4EA7F24D");
    expect(runtime.chartJsConfig.data.datasets[0]?.["fill"]).toEqual("start");
  });
});
