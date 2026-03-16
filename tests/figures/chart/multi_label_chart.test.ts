import { getCategoryAxisTickLabels } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("multiple label ranges", () => {
  test("Bar chart with multiple label ranges", () => {
    const model = createModelFromGrid({
      A1: "2023",
      A2: "2023",
      A3: "2024",
      A4: "2024",
      B1: "Q1",
      B2: "Q2",
      B3: "Q1",
      B4: "Q2",
      C1: "10",
      C2: "20",
      C3: "30",
      C4: "40",
    });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!C1:C4" }],
        labelRanges: ["Sheet1!A1:A4", "Sheet1!B1:B4"],
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    const labels = getCategoryAxisTickLabels(model, "chartId");
    expect(labels).toEqual([
      ["2023", "Q1"],
      ["2023", "Q2"],
      ["2024", "Q1"],
      ["2024", "Q2"],
    ]);
  });

  test("Line chart with multiple label ranges", () => {
    const model = createModelFromGrid({
      A1: "Project A",
      A2: "Project A",
      B1: "Task 1",
      B2: "Task 2",
      C1: "100",
      C2: "200",
    });
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "Sheet1!C1:C2" }],
        labelRanges: ["Sheet1!A1:A2", "Sheet1!B1:B2"],
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    const labels = getCategoryAxisTickLabels(model, "chartId");
    expect(labels).toEqual([
      ["Project A", "Task 1"],
      ["Project A", "Task 2"],
    ]);
  });

  test("Scatter chart with multiple label ranges", () => {
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
    // For scatter chart, labelRanges can be used for labels on points
    createChart(
      model,
      {
        type: "scatter",
        dataSets: [{ dataRange: "Sheet1!C1:D2" }],
        labelRanges: ["Sheet1!A1:A2", "Sheet1!B1:B2"],
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    const labels = getCategoryAxisTickLabels(model, "chartId");
    expect(labels).toEqual([
      ["A", "X1"],
      ["B", "X2"],
    ]);
  });

  test("Combo chart with multiple label ranges", () => {
    const model = createModelFromGrid({
      A1: "Cat 1",
      B1: "Sub 1",
      C1: "10",
      D1: "20",
    });
    createChart(
      model,
      {
        type: "combo",
        dataSets: [
          { dataRange: "Sheet1!C1", type: "bar" },
          { dataRange: "Sheet1!D1", type: "line" },
        ],
        labelRanges: ["Sheet1!A1", "Sheet1!B1"],
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    const labels = getCategoryAxisTickLabels(model, "chartId");
    expect(labels).toEqual([["Cat 1", "Sub 1"]]);
  });
});
