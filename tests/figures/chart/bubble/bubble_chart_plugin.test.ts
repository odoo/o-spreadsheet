import { ChartCreationContext } from "../../../../src";
import { DEFAULT_BUBBLE_RADIUS } from "../../../../src/constants";
import { FIRST_CHART_COLOR } from "../../../../src/helpers";
import { BubbleChart } from "../../../../src/helpers/figures/charts/bubble_chart";
import { BubbleChartRuntime } from "../../../../src/types/chart/bubble_chart";
import { createBubbleChart, updateChart } from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartLegendLabels,
  getChartTooltipItemFromDataset,
  getChartTooltipValues,
} from "../../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../../test_helpers/helpers";

describe("bubble chart", () => {
  test("create bubble chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
    };
    const definition = BubbleChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "bubble",
      background: "#123456",
      title: { text: "hello there" },
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      axesDesign: {},
      showValues: false,
      humanize: false,
      bubbleColor: { color: FIRST_CHART_COLOR },
      sizeRange: "Sheet1!A1:A4",
      xRange: "Sheet1!A1:A4",
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      dataSetsHaveTitle: true,
      labelsAsText: true,
    });
  });

  test("Bubble chart legend", () => {
    //prettier-ignore
    const model = createModelFromGrid({
      A1: "A", B1: "1", C1: "2",
      A2: "B", B2: "2", C2: "3",
      A3: "C", B3: "3", C3: "4",
      A4: "D", B4: "4", C4: "5",
    });
    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        xRange: "B1:B4",
        labelRange: "A1:A4",
        bubbleColor: { color: "multiple" },
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        datasetIndex: 0,
        fillStyle: "#4EA7F2",
        fontColor: "#000000",
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "A",
      },
      {
        datasetIndex: 1,
        fillStyle: "#EA6175",
        fontColor: "#000000",
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "B",
      },
      {
        datasetIndex: 2,
        fillStyle: "#43C5B1",
        fontColor: "#000000",
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "C",
      },
      {
        datasetIndex: 3,
        fillStyle: "#F4A261",
        fontColor: "#000000",
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "D",
      },
    ]);
  });

  test("Bubble chart legend with single color mode", () => {
    //prettier-ignore
    const model = createModelFromGrid({
      A1: "A", B1: "1", C1: "2",
      A2: "B", B2: "2", C2: "3",
      A3: "C", B3: "3", C3: "4",
      A4: "D", B4: "4", C4: "5",
    });
    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        xRange: "B1:B4",
        labelRange: "A1:A4",
        bubbleColor: { color: "#FF0000" },
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).not.toBeDefined();
  });

  test("bubble chart runtime uses dedicated ranges and color modes", () => {
    // prettier-ignore
    const model = createModelFromGrid({
        A1: "X", B1: "Y",  C1: "Label", D1: "Size",
        A2: "1", B2: "10", C2: "Alpha", D2: "26",
        A3: "2", B3: "20", C3: "Beta",  D3: "16",
        A4: "3", B4: "15", C4: "Gamma", D4: "11",
        A5: "4", B5: "30", C5: "Delta", D5: "6",
      });

    createBubbleChart(
      model,
      {
        type: "bubble",
        dataSets: [{ dataRange: "B2:B5" }],
        xRange: "A2:A5",
        labelRange: "C2:C5",
        sizeRange: "D2:D5",
        bubbleColor: { color: "multiple" },
      },
      "1"
    );

    let runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    expect(runtime.chartJsConfig.type).toBe("line");
    let dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    expect(dataset.data).toHaveLength(4);
    const xValues = dataset.data.map((point: any) => point.x);
    const yValues = dataset.data.map((point: any) => point.y);
    expect(xValues).toEqual(["1", "2", "3", "4"]); // as string, will be interpreted as numbers by Chart.js
    expect(yValues).toEqual([10, 20, 15, 30]);
    expect(dataset.pointRadius).toEqual([30, 20, 15, 10]);
    expect(Array.isArray(dataset.backgroundColor)).toBeTruthy();
    expect(dataset.backgroundColor).toHaveLength(4);

    const tooltipItem = getChartTooltipItemFromDataset(runtime, 0, 0);
    const tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues.beforeLabel).toBe("Alpha");
    expect(tooltipValues.label).toBe("(1, 10)→ 26");

    updateChart(model, "1", { bubbleColor: { color: "#4EA7F2" } });
    runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    expect(typeof dataset.backgroundColor).toBe("string");
  });

  test("bubble chart uses default radius when no sizeRange is set", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "1", B2: "10",
      A3: "2", B3: "20",
      A4: "3", B4: "15",
    });

    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B4" }],
        xRange: "A2:A4",
        // no sizeRange provided
      },
      "1"
    );

    const runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    const dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    expect(dataset.pointRadius).toEqual([
      DEFAULT_BUBBLE_RADIUS,
      DEFAULT_BUBBLE_RADIUS,
      DEFAULT_BUBBLE_RADIUS,
    ]);
  });

  test("bubble chart uses default radius when sizeRange is empty", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "1", B2: "10",
      A3: "2", B3: "20",
      A4: "3", B4: "15",
    });

    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B4" }],
        xRange: "A2:A4",
        sizeRange: "C2:C4", // empty size range
      },
      "1"
    );

    const runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    const dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    expect(dataset.pointRadius).toEqual([
      DEFAULT_BUBBLE_RADIUS,
      DEFAULT_BUBBLE_RADIUS,
      DEFAULT_BUBBLE_RADIUS,
    ]);
  });

  test("bubble chart hides bubbles whose size is undefined when sizeRange has mixed values", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "1", B2: "10", C2: "5",
      A3: "2", B3: "20", C3: "15",
      A4: "3", B4: "15",
      A5: "4", B5: "30",
    });

    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B5" }],
        xRange: "A2:A5",
        sizeRange: "C2:C5",
      },
      "1"
    );

    const runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    const dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    // C2=5 and C3=15 have size values → positive radius
    expect(dataset.pointRadius[0]).toBeGreaterThan(0);
    expect(dataset.pointRadius[1]).toBeGreaterThan(0);
    // C4 and C5 are empty → radius 0 (bubble hidden)
    expect(dataset.pointRadius[2]).toBe(0);
    expect(dataset.pointRadius[3]).toBe(0);
  });

  test("bubble chart data points are sorted by descending size", () => {
    // prettier-ignore
    const model = createModelFromGrid({
        A2: "1", B2: "10", C2:  "6",  D2: "A",
        A3: "2", B3: "20", C3: "16", D3: "B",
        A4: "3", B4: "15", C4: "11", D4: "C",
        A5: "4", B5: "30", C5: "26", D5: "D",
      });

    createBubbleChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B5" }],
        xRange: "A2:A5",
        sizeRange: "C2:C5",
        labelRange: "D2:D5",
      },
      "1"
    );

    const runtime = model.getters.getChartRuntime("1") as BubbleChartRuntime;
    const dataset = runtime.chartJsConfig.data?.datasets?.[0] as any;
    const xValues = dataset.data.map((point: any) => point.x);
    const yValues = dataset.data.map((point: any) => point.y);
    expect(xValues).toEqual(["4", "2", "3", "1"]); // sorted by descending size (C5=20, C3=15, C4=10, C2=5)
    expect(yValues).toEqual([30, 20, 15, 10]);
    expect(dataset.pointRadius).toEqual([30, 20, 15, 10]);
  });
});
