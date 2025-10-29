import { ORIGINAL_BLUE } from "@odoo/o-spreadsheet-engine/helpers/color";
import { ChartCreationContext } from "@odoo/o-spreadsheet-engine/types/chart";
import { BubbleChart } from "../../../../src/helpers/figures/charts/bubble_chart";
import { createBubbleChart } from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartLegendLabels,
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
      bubbleColor: { color: ORIGINAL_BLUE },
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
        fillStyle: "#4EA7F280",
        fontColor: "#000000",
        hidden: false,
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "A",
      },
      {
        datasetIndex: 1,
        fillStyle: "#EA617580",
        fontColor: "#000000",
        hidden: false,
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "B",
      },
      {
        datasetIndex: 2,
        fillStyle: "#43C5B180",
        fontColor: "#000000",
        hidden: false,
        lineWidth: 8,
        pointStyle: "circle",
        strokeStyle: "#ffffff",
        text: "C",
      },
      {
        datasetIndex: 3,
        fillStyle: "#F4A26180",
        fontColor: "#000000",
        hidden: false,
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
});
