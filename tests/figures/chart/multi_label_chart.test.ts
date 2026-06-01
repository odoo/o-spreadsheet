import { findGroups } from "../../../src/components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { getCategoryAxisTickLabels, getChartConfiguration } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("findGroups", () => {
  test("empty labels are treated as continuation of previous non-empty category", () => {
    expect(findGroups(["2024", "", "", "2025", ""])).toEqual([
      { start: 0, end: 2, label: "2024" },
      { start: 3, end: 4, label: "2025" },
    ]);
  });

  test("leading empty labels form their own group", () => {
    expect(findGroups(["", "2024", ""])).toEqual([
      { start: 0, end: 0, label: "" },
      { start: 1, end: 2, label: "2024" },
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
      const model = createModelFromGrid({
        A1: "A",
        A2: "B",
        B1: "X1",
        B2: "X2",
        C1: "1",
        C2: "2",
        D1: "10",
        D2: "20",
      });

      createChart(
        model,
        {
          type: chartType,
          dataSource: {
            type: "range",
            dataSets: [{ dataSetId: "0", dataRange: "Sheet1!C1:D2" }],
            dataSetsHaveTitle: false,
            labelRanges: ["Sheet1!A1:A2", "Sheet1!B1:B2"],
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

      const secondaryLabels = config.options.plugins?.chartGroupedLabelsPlugin?.secondaryLabels;
      expect(secondaryLabels).toEqual([["X1", "X2"]]);
    }
  );
});
