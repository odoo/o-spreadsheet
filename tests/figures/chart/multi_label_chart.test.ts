import { findGroups } from "../../../src/components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { getCategoryAxisTickLabels, getChartConfiguration } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("findGroups", () => {
  test("empty labels are treated as is", () => {
    expect(findGroups(["2024", "", "", "2025", ""])).toEqual([
      { start: 0, end: 0, label: "2024" },
      { start: 1, end: 2, label: "" },
      { start: 3, end: 3, label: "2025" },
      { start: 4, end: 4, label: "" },
    ]);
  });

  test("contiguous identical labels are grouped", () => {
    expect(findGroups(["A", "A", "B", "B"])).toEqual([
      { start: 0, end: 1, label: "A" },
      { start: 2, end: 3, label: "B" },
    ]);
  });
});

describe("multiple label ranges", () => {
  test.each(["line", "bar", "scatter", "combo"] as const)(
    "%s chart with multiple label ranges",
    (chartType) => {
      // prettier-ignore
      const model = createModelFromGrid({
        A1: "A", B1: "X1", C1: "1", D1: "10",
        A2: "B", B2: "X2", C2: "2", D2: "20",
      });

      createChart(
        model,
        {
          type: chartType,
          dataSource: {
            type: "range",
            dataSets: [{ dataSetId: "0", dataRange: "Sheet1!C1:D2" }],
            dataSetsHaveTitle: false,
            labelRanges: ["Sheet1!B1:B2", "Sheet1!A1:A2"],
          },
          dataSetStyles: {},
        },
        "chartId"
      );

      const ticksLabels = getCategoryAxisTickLabels(model, "chartId");
      expect(ticksLabels).toEqual(["A", "B"]);

      const config = getChartConfiguration(model, "chartId");
      const labels = config.data.labels;
      expect(labels).toEqual(["A", "B"]);

      const parentCategories = config.options.plugins?.chartGroupedLabelsPlugin?.parentCategories;
      expect(parentCategories).toEqual([["X1", "X2"]]);
    }
  );

  test("horizontal bar chart with multiple label ranges draws secondary labels on the y-axis", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "A", B1: "X1", C1: "2",
      A2: "B", B2: "X2", C2: "2",
    });

    createChart(
      model,
      {
        type: "bar",
        horizontal: true,
        dataSource: {
          type: "range",
          dataSets: [{ dataSetId: "0", dataRange: "Sheet1!C1:C2" }],
          dataSetsHaveTitle: false,
          labelRanges: ["Sheet1!B1:B2", "Sheet1!A1:A2"],
        },
        dataSetStyles: {},
      },
      "chartId"
    );

    const config = getChartConfiguration(model, "chartId");
    const plugin = config.options.plugins?.chartGroupedLabelsPlugin;
    expect(plugin?.indexAxis).toBe("y");
    expect(plugin?.parentCategories).toEqual([["X1", "X2"]]);
  });
});
