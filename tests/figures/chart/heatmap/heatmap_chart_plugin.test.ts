import { HeatmapChart } from "../../../../src/helpers/figures/charts/heatmap_chart";
import { chartDataSourceRegistry } from "../../../../src/registries/chart_data_source_registry";
import { HeatmapChartRuntime } from "../../../../src/types/chart/heatmap_chart";
import { CommandResult } from "../../../../src/types/commands";
import { createHeatmapChart, setCellFormat, undo, updateChart } from "../../../test_helpers";
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
      columnRange: "Sheet1!B1:B4",
      dataRange: undefined,
      rowRange: "Sheet1!A1:A4",
      dataSetsHaveTitle: true,
      legendPosition: "left",
      axesDesign: {},
      showValues: false,
      humanize: false,
      annotationText: "This is an annotation text",
      annotationLink: "https://www.odoo.com",
    });
  });

  test("with a label range and a single data series, uses them as (rowRange, columnRange) and leaves dataRange empty", () => {
    const definition = HeatmapChart.getDefinitionFromContextCreation(
      {
        ...GENERAL_CHART_CREATION_CONTEXT,
        dataSource: {
          type: "range",
          dataSets: [{ dataRange: "Sheet1!B1:B4", dataSetId: "0" }],
          labelRange: "Sheet1!A1:A4",
          dataSetsHaveTitle: true,
        },
      },
      chartDataSourceRegistry.get("range")
    );
    expect(definition).toMatchObject({
      rowRange: "Sheet1!A1:A4",
      columnRange: "Sheet1!B1:B4",
      dataRange: undefined,
    });
  });

  test("with a label range and 2 data series, uses them as (columnRange, rowRange, dataRange)", () => {
    const definition = HeatmapChart.getDefinitionFromContextCreation(
      {
        ...GENERAL_CHART_CREATION_CONTEXT,
        dataSource: {
          type: "range",
          dataSets: [
            { dataRange: "Sheet1!B1:B4", dataSetId: "0" },
            { dataRange: "Sheet1!C1:C4", dataSetId: "1" },
          ],
          labelRange: "Sheet1!A1:A4",
          dataSetsHaveTitle: true,
        },
      },
      chartDataSourceRegistry.get("range")
    );
    expect(definition).toMatchObject({
      rowRange: "Sheet1!A1:A4",
      columnRange: "Sheet1!B1:B4",
      dataRange: "Sheet1!C1:C4",
    });
  });

  test("with no label range and 3 data series, uses them as (columnRange, rowRange, dataRange)", () => {
    const definition = HeatmapChart.getDefinitionFromContextCreation(
      {
        ...GENERAL_CHART_CREATION_CONTEXT,
        dataSource: {
          type: "range",
          dataSets: [
            { dataRange: "Sheet1!A1:A4", dataSetId: "0" },
            { dataRange: "Sheet1!B1:B4", dataSetId: "1" },
            { dataRange: "Sheet1!C1:C4", dataSetId: "2" },
          ],
          labelRange: undefined,
          dataSetsHaveTitle: true,
        },
      },
      chartDataSourceRegistry.get("range")
    );
    expect(definition).toMatchObject({
      rowRange: "Sheet1!A1:A4",
      columnRange: "Sheet1!B1:B4",
      dataRange: "Sheet1!C1:C4",
    });
  });

  test("with a label range and 3+ data series, only the first 2 series are used", () => {
    const definition = HeatmapChart.getDefinitionFromContextCreation(
      {
        ...GENERAL_CHART_CREATION_CONTEXT,
        dataSource: {
          type: "range",
          dataSets: [
            { dataRange: "Sheet1!B1:B4", dataSetId: "0" },
            { dataRange: "Sheet1!C1:C4", dataSetId: "1" },
            { dataRange: "Sheet1!D1:D4", dataSetId: "2" },
          ],
          labelRange: "Sheet1!A1:A4",
          dataSetsHaveTitle: true,
        },
      },
      chartDataSourceRegistry.get("range")
    );
    expect(definition).toMatchObject({
      rowRange: "Sheet1!A1:A4",
      columnRange: "Sheet1!B1:B4",
      dataRange: "Sheet1!C1:C4",
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

  test("without a data range, counts occurrences of each (row, column) pair", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon",
      A3: "Apple",  B3: "Mon",
      A4: "Apple",  B4: "Tue",
      A5: "Banana", B5: "Mon",
    });
    createHeatmapChart(model, { rowRange: "A2:A5", columnRange: "B2:B5" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    expect(config.data.labels).toEqual(["Mon", "Tue"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["Apple", "Banana"]);
    expect(datasets[0].values).toEqual([2, 1]); // Apple x Mon occurs twice
    expect(datasets[1].values).toEqual([1, NaN]); // Banana x Tue never occurs
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

    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    expect(datasets[0].values).toEqual([3]);
    expect(datasets[1].values).toEqual([30]);
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
    expect(datasets[0].values).toEqual([3, NaN]);
    expect(datasets[1].values).toEqual([NaN, 30]);
  });

  test("numeric bin labels keep the format of the row/column range", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "0",   C2: "1",
      A3: "1",  B3: "1",   C3: "2",
      A4: "10", B4: "100", C4: "30",
    });
    setCellFormat(model, "A2", "0%");
    setCellFormat(model, "A3", "0%");
    setCellFormat(model, "A4", "0%");
    createHeatmapChart(model, { rowRange: "A2:A4", columnRange: "B2:B4", dataRange: "C2:C4" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];

    expect(datasets.map((d) => d.label)).toEqual(["0% - 500%", "500% - 1000%"]);
  });

  test("numeric row and column ranges show bin boundaries on the axes instead of per-bin ranges", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "0",   C2: "1",
      A3: "1",  B3: "1",   C3: "2",
      A4: "10", B4: "100", C4: "30",
    });
    createHeatmapChart(model, { rowRange: "A2:A4", columnRange: "B2:B4", dataRange: "C2:C4" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const scales = runtime.chartJsConfig.options!.scales as any;

    // one boundary tick per bin edge (2 bins -> 3 boundaries), instead of one range label per bin.
    // The real "x" (bar-index) axis stays an ordinary hidden category axis; a separate overlay
    // axis draws the boundary ticks on top of it.
    expect(scales.x.type).toBeUndefined();
    expect(scales.x.ticks.display).toBe(false);
    expect(scales.xBoundary.type).toBe("linear");
    expect(scales.xBoundary.min).toBe(0);
    expect(scales.xBoundary.max).toBe(2);
    // a linear scale defaults to reserving half a step of margin on each side (meant for
    // scatter/line axes), which would inset its domain from the chartArea and desync it from
    // the category axis below, whose bars fill the chartArea edge to edge
    expect(scales.xBoundary.offset).toBe(false);
    // the callback is keyed by the tick's own value (chart.js's first callback argument for a
    // linear scale), not its position in the ticks array, since autoSkip can drop ticks and shift
    // positions without changing the underlying values
    expect([0, 1, 2].map((value) => scales.xBoundary.ticks.callback(value))).toEqual([
      "0",
      "50",
      "100",
    ]);
    expect([0, 1, 2].map((value) => scales.y.ticks.callback(value))).toEqual(["0", "5", "10"]);

    // bars are positioned exactly as for a plain category axis (no boundary logic involved),
    // since the boundary ticks are drawn by the separate overlay axis instead
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets[0].data).toEqual([1, 1]);
  });

  test("a numeric bin with no matching data point still gets its own column, shown as missing data", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Cat", B2: "0",  C2: "1",
      A3: "Cat", B3: "1",  C3: "2",
      A4: "Cat", B4: "2",  C4: "3",
      A5: "Cat", B5: "99", C5: "4",
    });
    createHeatmapChart(model, { rowRange: "A2:A5", columnRange: "B2:B5", dataRange: "C2:C5" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    // 3 bins (0-33, 33-66, 66-99), the middle one has no data point at all
    expect(config.data.labels).toEqual(["0 - 33", "33 - 66", "66 - 99"]);
    const scales = config.options!.scales as any;
    expect(scales.xBoundary.max).toBe(3);

    const datasets = config.data.datasets as any[];
    expect(datasets[0].values).toEqual([6, NaN, 4]);
    // the empty bin still gets a bar position (transparent/missing-data fill), instead of being
    // dropped and collapsing the grid, which would desync the columns from the boundary ticks
    expect(datasets[0].data).toEqual([1, 1, 1]);
  });

  test("text-based row and column ranges keep a plain category axis, unaffected by boundary logic", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(model, { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const scales = runtime.chartJsConfig.options!.scales as any;
    expect(scales.x.type).toBeUndefined();

    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets[0].data).toEqual([1, 1]);
  });

  test("a header row is excluded from the data when dataSetsHaveTitle is set", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "Row",  B1: "Column", C1: "Value",
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
    expect(datasets[0].backgroundColor[1]).toBe("#ABCDEF");
    expect(datasets[1].backgroundColor[0]).toBe("#ABCDEF");
  });

  test("colorscale legend includes the missing-value color when some combinations are missing", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3", missingValueColor: "#ABCDEF" },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const colorScaleLegend = runtime.chartJsConfig.options!.plugins!.chartColorScalePlugin as any;
    expect(colorScaleLegend.missingValueColor).toBe("#ABCDEF");
  });

  test("colorscale legend has no missing-value color when every combination has a value", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Apple",  B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3", missingValueColor: "#ABCDEF" },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const colorScaleLegend = runtime.chartJsConfig.options!.plugins!.chartColorScalePlugin as any;
    expect(colorScaleLegend.missingValueColor).toBeUndefined();
  });

  test("tooltip shows 'No Data' for a missing (row, column) combination", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(model, { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3" }, "1");
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    const tooltip = runtime.chartJsConfig.options!.plugins!.tooltip as any;
    expect(tooltip.callbacks.label({ dataset: datasets[0], dataIndex: 1 })).toBe("No Data");
  });

  test("showValues displays nothing for a missing (row, column) combination", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      { rowRange: "A2:A3", columnRange: "B2:B3", dataRange: "C2:C3", showValues: true },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    const showValuesPlugin = runtime.chartJsConfig.options!.plugins!.chartShowValuesPlugin as any;
    expect(showValuesPlugin.callback(undefined, { _dataset: datasets[0] }, 1)).toBe("");
  });

  test("incomplete (row, column, value) triples are dropped when ranges have different lengths", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
      A4: "Cherry", B4: "Wed",
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
