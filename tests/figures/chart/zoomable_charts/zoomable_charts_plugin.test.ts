import { LineChartRuntime, ScatterChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { Scale } from "chart.js";
import { Model } from "../../../../src";
import { TREND_LINE_XAXIS_ID } from "../../../../src/helpers/figures/charts";
import { createChart, setCellContent } from "../../../test_helpers/commands_helpers";
import { createModel } from "../../../test_helpers/helpers";

let model: Model;

beforeEach(async () => {
  model = await createModel();
});

describe("Zoomable chart configuration tests", () => {
  test("Master charts do not contain title/legend/tooltips", async () => {
    await createChart(
      model,
      { type: "line", legendPosition: "top", title: { text: "myTitle" }, showValues: true },
      "chartId"
    );

    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;

    expect(runtime.masterChartConfig?.options?.plugins?.legend?.display).toBe(false);
    expect(runtime.masterChartConfig?.options?.plugins?.title?.display).toBe(false);
    expect(runtime.masterChartConfig?.options?.plugins?.tooltip?.enabled).toBe(false);
    expect(runtime.masterChartConfig?.options?.plugins?.chartShowValuesPlugin).toBe(undefined);
  });

  test("Master chart do not have Y axis", async () => {
    await setCellContent(model, "B2", "5");
    await setCellContent(model, "C2", "10");
    await createChart(
      model,
      { type: "line", dataSets: [{ dataRange: "B1:B5" }, { dataRange: "C1:C5", yAxisId: "y1" }] },
      "chartId"
    );

    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;

    expect(runtime.chartJsConfig.options?.scales?.y?.display).toBe(undefined); // chartJS default is display=true
    expect(runtime.chartJsConfig.options?.scales?.y1?.display).toBe(undefined);

    expect(runtime.masterChartConfig?.options?.scales?.y?.display).toBe(false);
    expect(runtime.masterChartConfig?.options?.scales?.y1?.display).toBe(false);
  });

  test("Master chart X axis does not have a title and labels are truncated", async () => {
    await setCellContent(model, "A2", "Long label 1");
    await setCellContent(model, "B2", "5");
    await createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B5" }],
        labelRange: "A1:A5",
        axesDesign: { x: { title: { text: "axis title" } } },
      },
      "chartId"
    );

    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;

    expect(runtime.masterChartConfig?.options?.scales?.x?.title).toBe(undefined);
    const labels = runtime.chartJsConfig.data.labels;
    const fakeScale = {
      getLabelForValue: (index: number) => labels?.[index],
    } as Scale;
    const callback = runtime.masterChartConfig?.options?.scales?.x?.ticks?.callback;
    expect(callback?.call(fakeScale, 0, 0, [])).toBe("Long …");
  });

  test("Trend lines are not present in master charts", async () => {
    await setCellContent(model, "B2", "5");
    await setCellContent(model, "B3", "10");
    await createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B5", trend: { display: true, type: "logarithmic" } }],
      },
      "chartId"
    );

    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;

    expect(runtime.chartJsConfig.data.datasets.length).toBe(2);
    expect(runtime.masterChartConfig?.data.datasets.length).toBe(1);

    expect(runtime.chartJsConfig.options?.scales?.[TREND_LINE_XAXIS_ID]).toBeDefined();
    expect(runtime.masterChartConfig?.options?.scales?.[TREND_LINE_XAXIS_ID]).toBeUndefined();
  });

  test("Scatter chart master chart does not show lines and has smaller point size", async () => {
    await createChart(model, { type: "scatter", dataSets: [{ dataRange: "A1:A5" }] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as ScatterChartRuntime;

    expect(runtime.chartJsConfig.data.datasets[0].showLine).toBe(false);
    expect(runtime.chartJsConfig.data.datasets[0].pointRadius).toBe(3);

    expect(runtime.masterChartConfig?.data.datasets[0].showLine).toBe(false);
    expect(runtime.masterChartConfig?.data.datasets[0].pointRadius).toBe(2);
  });
});
