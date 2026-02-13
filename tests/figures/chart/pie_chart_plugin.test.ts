import { PieChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { ChartCreationContext, Model } from "../../../src";
import { PieChart } from "../../../src/helpers/figures/charts";
import { createChart } from "../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartLegendLabels,
} from "../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("pie chart", () => {
  test("create pie chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
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
      pieHolePercentage: 0,
      showValues: false,
      humanize: false,
      annotationText: "This is an annotation text",
      annotationLink: "https://www.odoo.com",
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
        background: "#000000",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        text: "P1",
        fillStyle: "#4EA7F2",
        lineWidth: 2,
        pointStyle: "rect",
        strokeStyle: "#4EA7F2",
        fontColor: "#FFFFFF",
      },
      {
        text: "P2",
        fillStyle: "#EA6175",
        lineWidth: 2,
        pointStyle: "rect",
        strokeStyle: "#EA6175",
        fontColor: "#FFFFFF",
      },
    ]);
  });

  test("Empty legend items are filtered out", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "",    B1: "1",
      A2: "P2",  B2: "2",
    });

    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        dataSetsHaveTitle: false,
        type: "pie",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toHaveLength(1);
    expect(getChartLegendLabels(model, "1")[0].text).toEqual("P2");
  });

  test("Pie chart hole size", () => {
    const model = new Model();
    createChart(model, { type: "pie", isDoughnut: true, pieHolePercentage: 15 }, "1");

    const runtime = model.getters.getChartRuntime("1") as PieChartRuntime;
    expect(runtime.chartJsConfig.options?.cutout).toEqual("15%");
  });
});
