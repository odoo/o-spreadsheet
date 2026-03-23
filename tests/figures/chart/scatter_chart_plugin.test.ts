import { ChartCreationContext } from "../../../src";
import { createChart, createChartDefinitionFromContext, updateChart } from "../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartConfiguration,
  toChartDataSource,
} from "../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("scatter chart", () => {
  test("create scatter chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
    };
    const definition = createChartDefinitionFromContext("scatter", context);
    expect(definition).toEqual({
      aggregated: true,
      type: "scatter",
      background: "#123456",
      title: { text: "hello there" },
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      legendPosition: "bottom",
      labelsAsText: true,
      axesDesign: {},
      showValues: false,
      humanize: false,
    });
  });

  test("scatter chart runtime reflects axis bounds, scale type and grids", () => {
    const model = createModelFromGrid({
      A1: "x",
      A2: "1",
      A3: "2",
      B1: "Series A",
      B2: "5",
      B3: "15",
    });

    createChart(
      model,
      {
        type: "scatter",
        ...toChartDataSource({
          labelRange: "A2:A3",
          dataSets: [{ dataRange: "B2:B3", yAxisId: "y" }],
        }),
        labelsAsText: false,
      },
      "1"
    );

    updateChart(model, "1", {
      axesDesign: {
        x: { min: 1, max: 3, gridLines: "minor" },
        y: { min: -10, max: 10, gridLines: "both" },
      },
    });

    const scales = getChartConfiguration(model, "1").options?.scales;
    expect(scales.x?.min).toBe(1);
    expect(scales.x?.max).toBe(3);
    expect(scales.x?.grid?.display).toBe(false);
    expect(scales.x?.grid?.minor?.display).toBe(true);
    expect(scales.y?.min).toBe(-10);
    expect(scales.y?.max).toBe(10);
    expect(scales.y?.grid?.display).toBe(true);
    expect(scales.y?.grid?.minor?.display).toBe(true);
  });
});
