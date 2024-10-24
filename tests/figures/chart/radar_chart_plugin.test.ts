import { ChartCreationContext, Model } from "../../../src";
import { RadarChart } from "../../../src/helpers/figures/charts/radar_chart";
import { RadarChartRuntime } from "../../../src/types/chart/radar_chart";
import { getChartLegendLabels } from "../../test_helpers/chart_helpers";
import {
  createChart,
  createRadarChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

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
      showValues: true,
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
      showValues: true,
    });
  });

  test("Dataset is filled if fillArea is set to true", () => {
    const model = new Model();
    setCellContent(model, "A2", "1");
    createRadarChart(model, { fillArea: false, dataSets: [{ dataRange: "A1:A2" }] }, "chartId");
    let runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0]?.["fill"]).toBeFalsy();

    updateChart(model, "chartId", { fillArea: true });
    runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0]?.backgroundColor).toEqual("#4EA7F266");
    expect(runtime.chartJsConfig.data.datasets[0]?.["fill"]).toEqual("start");
  });

  test("Radar chart legend", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "4",
    });
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "Sheet1!A1:A2", backgroundColor: "#f00", label: "serie_1" },
          { dataRange: "Sheet1!A3:A4", backgroundColor: "#00f", label: "serie_2" },
        ],
        labelRange: "Sheet1!A2:A4",
        type: "radar",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        fontColor: "#000000",
        text: "serie_1",
        fillStyle: "#f00",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#f00",
      },
      {
        fontColor: "#000000",
        text: "serie_2",
        fillStyle: "#00f",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#00f",
      },
    ]);
  });

  test("Radar chart ticks and tooltip values are formatted with the cells format", () => {
    const model = new Model();
    setCellContent(model, "A2", "1");
    setFormat(model, "A2", `0.0 "écu d'or"`);

    createRadarChart(model, { fillArea: false, dataSets: [{ dataRange: "A1:A2" }] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    const tickCallback = runtime.chartJsConfig.options?.scales?.r?.ticks?.callback as any;
    expect(tickCallback(1)).toBe("1.0 écu d'or");

    const tooltipLabel = runtime.chartJsConfig.options?.plugins?.tooltip?.callbacks?.label as any;
    expect(tooltipLabel({ parsed: { x: "Louis", r: 14 }, dataset: { label: "Ds1" } })).toBe(
      "Ds1: 14.0 écu d'or"
    );
  });

  test("Radar point color depend on the chart background", () => {
    const model = new Model();
    createRadarChart(model, {}, "chartId");

    let runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.r?.["pointLabels"]?.color).toBe("#000000");

    updateChart(model, "chartId", { background: "#000000" });
    runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.r?.["pointLabels"]?.color).toBe("#FFFFFF");
  });
});
