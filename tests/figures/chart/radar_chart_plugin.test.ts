import { RadarChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { ChartCreationContext, Model } from "../../../src";
import { RadarChart } from "../../../src/helpers/figures/charts/radar_chart";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartConfiguration,
  getChartLegendLabels,
  getChartTooltipValues,
} from "../../test_helpers/chart_helpers";
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
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      showValues: true,
      funnelColors: [],
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
      hideDataMarkers: false,
      humanize: false,
      annotationText: "This is an annotation text",
      annotationLink: "https://www.odoo.com",
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
        datasetIndex: 0,
      },
      {
        fontColor: "#000000",
        text: "serie_2",
        fillStyle: "#00f",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#00f",
        datasetIndex: 1,
      },
    ]);
  });

  test("Radar chart ticks and tooltip values are formatted with the cells format", () => {
    const model = new Model();
    setCellContent(model, "A2", "1");
    setFormat(model, "A2", `0.0 "écu d'or"`);

    createRadarChart(
      model,
      { fillArea: false, dataSets: [{ dataRange: "A1:A2" }], humanize: false },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    const tickCallback = runtime.chartJsConfig.options?.scales?.r?.["ticks"]?.callback as any;
    expect(tickCallback(1)).toBe("1.0 écu d'or");

    const tooltipItem = { parsed: { x: "Louis", r: 14 }, dataset: { label: "Ds1" } };
    const tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Ds1", label: "14.0 écu d'or" });
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

  test("Radar scale starts at zero for positive numbers", () => {
    const model = new Model();
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    createRadarChart(model, { dataSets: [{ dataRange: "A1:A3" }] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.r?.["beginAtZero"]).toBe(true);
  });

  test("Radar scale starts below the minimum for negative values", () => {
    const model = new Model();
    setCellContent(model, "A2", "4");
    setCellContent(model, "A3", "-7");
    setCellContent(model, "A4", "-1");

    createRadarChart(model, { dataSets: [{ dataRange: "A1:A4" }] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.r?.suggestedMin).toBe(-8);
  });

  test("Radar chart point labels are truncated properly", () => {
    const model = new Model();
    createRadarChart(model, { dataSets: [{ dataRange: "A1:A2" }] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as RadarChartRuntime;
    const callback = (runtime.chartJsConfig.options?.scales?.r as any)?.pointLabels
      ?.callback as Function;

    expect(callback("short", 0)).toBe("short");
    expect(callback("very very long label of radar", 1)).toBe("very very long label…");
  });
});

test("Humanization is taken into account for the axis ticks of a radar chart", async () => {
  const model = new Model();
  createChart(
    model,
    {
      type: "radar",
      labelRange: "A2",
      dataSets: [{ dataRange: "B2" }],
      humanize: false,
    },
    "1"
  );
  let axis = getChartConfiguration(model, "1").options.scales.r;
  const valuesBefore = [1e3, 1e6].map(axis.ticks.callback);
  expect(valuesBefore).toEqual(["1,000", "1,000,000"]);
  updateChart(model, "1", { humanize: true });
  axis = getChartConfiguration(model, "1").options.scales.r;
  const valuesAfter = [1e3, 1e6].map(axis.ticks.callback);
  expect(valuesAfter).toEqual(["1,000", "1,000k"]);
});
