import { HeatmapChart } from "../../../../src/helpers/figures/charts/heatmap_chart";
import { chartDataSourceRegistry } from "../../../../src/registries/chart_data_source_registry";
import { HeatmapChartRuntime } from "../../../../src/types/chart/heatmap_chart";
import { CommandResult } from "../../../../src/types/commands";
import { createHeatmapChart, undo, updateChart } from "../../../test_helpers";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../../test_helpers/helpers";

describe("heatmap chart", () => {
  test("create heatmap chart from creation context", () => {
    const definition = HeatmapChart.getDefinitionFromContextCreation(
      GENERAL_CHART_CREATION_CONTEXT,
      chartDataSourceRegistry.get("range")
    );
    expect(definition).toEqual({
      type: "heatmap",
      background: "#123456",
      title: { text: "hello there" },
      dataRange: "Sheet1!B1:B4",
      columnRange: "Sheet1!A1:A4",
      rowRange: undefined,
      dataSetsHaveTitle: true,
      legendPosition: "left",
      axesDesign: {},
      showValues: false,
      humanize: false,
      annotationText: "This is an annotation text",
      annotationLink: "https://www.odoo.com",
    });
  });

  test("heatmap chart aggregates duplicate row/column pairs by summing values", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Apple",  B3: "Mon", C3: "10",
      A4: "Apple",  B4: "Tue", C4: "2",
      A5: "Banana", B5: "Mon", C5: "3",
      A6: "Banana", B6: "Wed", C6: "4",
    });
    createHeatmapChart(model, { rowRange: "A2:A6", columnRange: "B2:B6", dataRange: "C2:C6" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    // columns and rows keep the first-occurrence order of the source ranges, not sorted
    expect(config.data.labels).toEqual(["Mon", "Tue", "Wed"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["Apple", "Banana"]);
    expect(datasets[0].values).toEqual([11, 2, NaN]); // Apple/Mon = 1 + 10
    expect(datasets[1].values).toEqual([3, NaN, 4]);
  });

  test("a fully numeric row range is cut into bins and aggregated, instead of one row per value", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "Cat", C2: "1",
      A3: "1",  B3: "Cat", C3: "2",
      A4: "10", B4: "Cat", C4: "30",
    });
    createHeatmapChart(model, { rowRange: "A2:A4", columnRange: "B2:B4", dataRange: "C2:C4" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    // 3 samples -> Sturges' formula gives 2 bins covering [0, 10]: [0, 5) and [5, 10]
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    expect(datasets[0].values).toEqual([3]); // rows 0 and 1 both fall in [0, 5) -> 1 + 2
    expect(datasets[1].values).toEqual([30]); // row 10 falls in [5, 10]
  });

  test("fully numeric row AND column ranges are each cut into their own grid of bins", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "0",   C2: "1",
      A3: "1",  B3: "1",   C3: "2",
      A4: "10", B4: "100", C4: "30",
    });
    createHeatmapChart(model, { rowRange: "A2:A4", columnRange: "B2:B4", dataRange: "C2:C4" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    expect(config.data.labels).toEqual(["0 - 50", "50 - 100"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    // rows 0 and 1 both bin into row "0 - 5" and column "0 - 50" -> aggregated together
    expect(datasets[0].values).toEqual([3, NaN]);
    expect(datasets[1].values).toEqual([NaN, 30]);
  });

  test("a header row is excluded from the data when dataSetsHaveTitle is set", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "Row",  B1: "Column", C1: "Value", // header row
      A2: "0",    B2: "Cat",    C2: "1",
      A3: "1",    B3: "Cat",    C3: "2",
      A4: "10",   B4: "Cat",    C4: "30",
    });
    createHeatmapChart(
      model,
      { rowRange: "A1:A4", columnRange: "B1:B4", dataRange: "C1:C4", dataSetsHaveTitle: true },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];

    // the header text "Row" would have made the row range non-numeric and disabled binning;
    // once excluded, the row range is fully numeric again and gets cut into bins as usual
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    expect(datasets[0].values).toEqual([3]);
    expect(datasets[1].values).toEqual([30]);
  });

  test("text rows/columns keep first-occurrence order even if some values are numeric", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "3",    B2: "Mon", C2: "1",
      A3: "text", B3: "Tue", C3: "2",
    });
    createHeatmapChart(model, { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;
    // rows are not all numeric ("text" is not a number), so they keep sheet order
    expect((config.data.datasets as any[]).map((d) => d.label)).toEqual(["3", "text"]);
  });

  test("missing (row, column) combinations use the missing value color", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        columnRange: "B2:B3",
        dataRange: "C2:C3",
        missingValueColor: "#ABCDEF",
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    // Apple/Tue and Banana/Mon are never in the source data
    expect(datasets[0].backgroundColor[1]).toBe("#ABCDEF");
    expect(datasets[1].backgroundColor[0]).toBe("#ABCDEF");
  });

  test("incomplete (row, column, value) triples are dropped when ranges have different lengths", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
      A4: "Cherry", B4: "Wed",
      // no C4: the 3rd row has no value and must be excluded
    });
    createHeatmapChart(model, { rowRange: "A2:A4", columnRange: "B2:B4", dataRange: "C2:C4" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;
    expect(config.data.labels).toEqual(["Mon", "Tue"]);
    expect((config.data.datasets as any[]).map((d) => d.label)).toEqual(["Apple", "Banana"]);
  });

  test("invalid ranges are rejected", () => {
    const model = createModelFromGrid({ A1: "Apple", B1: "Mon", C1: "1" });
    createHeatmapChart(model, { rowRange: "A1", columnRange: "B1", dataRange: "C1" }, "1");

    expect(updateChart(model, "1", { rowRange: "this is not a range" })).toBeCancelledBecause(
      CommandResult.InvalidHeatmapRowRange
    );
    expect(updateChart(model, "1", { columnRange: "this is not a range" })).toBeCancelledBecause(
      CommandResult.InvalidHeatmapColumnRange
    );
    expect(updateChart(model, "1", { dataRange: "this is not a range" })).toBeCancelledBecause(
      CommandResult.InvalidHeatmapDataRange
    );
  });

  test("updating a range can be undone", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple", B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(model, { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3" }, "1");
    updateChart(model, "1", { dataRange: "C2" });
    expect(model.getters.getChartDefinition("1")).toMatchObject({ dataRange: "C2" });

    undo(model);
    expect(model.getters.getChartDefinition("1")).toMatchObject({ dataRange: "C2:C3" });
  });

  test("getDefinitionForExcel returns undefined, heatmap is not exportable to Excel", () => {
    expect(HeatmapChart.getDefinitionForExcel({} as any, {} as any, {} as any)).toBeUndefined();
  });
});
