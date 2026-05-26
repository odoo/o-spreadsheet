import { createCanvas } from "canvas";
import { Model } from "../../../src";
import { ChartSuggestionPreview } from "../../../src/components/side_panel/data_analysis/chart_suggestion_preview";
import { ComponentConstructor } from "../../../src/owl3_compatibility_layer";
import { ChartDefinition } from "../../../src/types/chart/chart";
import { registerCleanup } from "../../setup/jest.setup";
import { toChartDataSource } from "../../test_helpers/chart_helpers";
import { createModelFromGrid, mountComponent } from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

const ONE_SERIES = toChartDataSource({
  dataSets: [{ dataRange: "B1:B4" }],
  labelRanges: ["A1:A4"],
  dataSetsHaveTitle: false,
});
const TWO_SERIES = toChartDataSource({
  dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
  labelRanges: ["A1:A4"],
  dataSetsHaveTitle: false,
});

async function mountAndScreenshotCanvas<Props extends { [key: string]: any }>(
  component: ComponentConstructor<any>,
  props: Props,
  model: Model,
  size: { width: number; height: number }
): Promise<Buffer> {
  const nodeCanvas = createCanvas(size.width, size.height);

  const getContextSpy = jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement): any {
      const nodeCtx = nodeCanvas.getContext("2d");
      (nodeCtx as any).canvas = this;
      return nodeCtx;
    });

  const unregisterRect = extendMockGetBoundingClientRect({
    "o-suggestion-canvas-wrap": () => {
      return { width: size.width, height: size.height, top: 0, left: 0 };
    },
    CANVAS: () => {
      return { width: size.width, height: size.height, top: 0, left: 0 };
    },
  });

  registerCleanup(() => {
    getContextSpy.mockRestore();
    unregisterRect();
  });

  await mountComponent(component, { props, model });

  return nodeCanvas.toBuffer("image/png");
}

describe("Chart suggestion preview snapshots", () => {
  test.each([
    [
      "Bar chart",
      { type: "bar", ...TWO_SERIES, title: { text: "Monthly sales" }, legendPosition: "top" },
    ],
    [
      "Stacked horizontal bar chart",
      {
        type: "bar",
        ...TWO_SERIES,
        stacked: true,
        horizontal: true,
        title: { text: "Monthly sales" },
        legendPosition: "top",
      },
    ],
    [
      "Line chart",
      { type: "line", ...ONE_SERIES, title: { text: "Trend" }, legendPosition: "top" },
    ],
    [
      "Pie chart",
      { type: "pie", ...ONE_SERIES, title: { text: "Breakdown" }, legendPosition: "top" },
    ],
    [
      "Radar chart",
      { type: "radar", ...ONE_SERIES, title: { text: "Radar" }, legendPosition: "top" },
    ],
    [
      "Funnel chart",
      { type: "funnel", ...ONE_SERIES, title: { text: "Funnel" }, legendPosition: "top" },
    ],
    [
      "Combo chart",
      { type: "combo", ...TWO_SERIES, title: { text: "Combo" }, legendPosition: "top" },
    ],
    [
      "Bubble chart (points scaled down to fit the thumbnail)",
      {
        type: "bubble",
        yRanges: ["B1:B4"],
        xRange: "A1:A4",
        sizeRange: "C1:C4",
        bubbleColor: { color: "multiple" },
        title: { text: "Bubble" },
        legendPosition: "top",
      },
    ],
    [
      "Scorecard (KPI card, forces a legible key value font size)",
      { type: "scorecard", keyValue: "B4", baseline: "B1", title: { text: "" } },
    ],
    [
      "Gauge (hides the chart title)",
      {
        type: "gauge",
        dataRange: "B1",
        title: { text: "Progress" },
        sectionRule: {
          rangeMin: "0",
          rangeMax: "100",
          colors: { lowerColor: "#6aa84f", middleColor: "#f1c232", upperColor: "#cc0000" },
          lowerInflectionPoint: { type: "number", value: "33", operator: "<=" },
          upperInflectionPoint: { type: "number", value: "66", operator: "<=" },
        },
      },
    ],
  ] as [string, ChartDefinition<string>][])("%s preview", async (_title, definition) => {
    const model = createModelFromGrid({
      A1: "Jan",
      A2: "Feb",
      A3: "Mar",
      A4: "Apr",
      B1: "10",
      B2: "25",
      B3: "15",
      B4: "30",
      C1: "5",
      C2: "8",
      C3: "20",
      C4: "12",
    });
    const buffer = await mountAndScreenshotCanvas(
      ChartSuggestionPreview,
      {
        definition,
        description: "test description",
        onPointerDown: () => {},
      },
      model,
      { width: 192, height: 120 }
    );
    expect(buffer).toMatchImageSnapshot();
  });
});
