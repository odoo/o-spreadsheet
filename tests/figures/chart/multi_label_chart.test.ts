import { getCategoryAxisTickLabels, getChartConfiguration } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

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
          dataSets: [{ dataRange: "Sheet1!C1:D2" }],
          labelRanges: ["Sheet1!A1:A2", "Sheet1!B1:B2"],
          dataSetsHaveTitle: false,
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
