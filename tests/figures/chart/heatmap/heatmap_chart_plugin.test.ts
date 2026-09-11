import { Model } from "../../../../src";
import { MainChartPanelStore } from "../../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel_store";
import { HeatmapChart } from "../../../../src/helpers/figures/charts/heatmap_chart";
import { chartDataSourceRegistry } from "../../../../src/registries/chart_data_source_registry";
import { CalendarChartDefinition } from "../../../../src/types/chart/calendar_chart";
import {
  HeatmapChartDefinition,
  HeatmapChartRuntime,
} from "../../../../src/types/chart/heatmap_chart";
import { LineChartDefinition } from "../../../../src/types/chart/line_chart";
import { CommandResult } from "../../../../src/types/commands";
import {
  createCalendarChart,
  createChart,
  createHeatmapChart,
  setCellFormat,
  undo,
  updateChart,
  updateChartDataSource,
} from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import { createModelFromGrid } from "../../../test_helpers/helpers";
import { makeStoreWithModel } from "../../../test_helpers/stores";

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
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A1:A4",
      }),
      dataSetStyles: {},
      rowRange: "Sheet1!C1:C4",
      legendPosition: "bottom",
      colorScale: { minColor: "#ffffff", maxColor: "#ff0000" },
      missingValueColor: "#ff0000",
      axesDesign: {},
      showValues: false,
      humanize: false,
      annotationText: "This is an annotation text",
      annotationLink: "https://www.odoo.com",
    });
  });

  test("legend position is kept as-is from the context, only defaulting to 'left' when unset", () => {
    for (const [contextPosition, expected] of [
      ["right", "right"],
      ["none", "none"],
      ["top", "top"],
      ["bottom", "bottom"],
      [undefined, "left"],
    ] as const) {
      const definition = HeatmapChart.getDefinitionFromContextCreation(
        { ...GENERAL_CHART_CREATION_CONTEXT, legendPosition: contextPosition },
        chartDataSourceRegistry.get("range")
      );
      expect(definition.legendPosition).toBe(expected);
    }
  });

  test("legend position maps to the same corner as the geo chart, reserving space on that edge", () => {
    const model = createModelFromGrid({
      A2: "Apple",
      B2: "Mon",
      C2: "1",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2" }],
          dataSetsHaveTitle: false,
          labelRange: "B2",
        }),
      },
      "1"
    );

    for (const [legendPosition, edge] of [
      ["top", "left"], // top left
      ["right", "right"], // top right
      ["bottom", "right"], // bottom right
      ["left", "left"], // bottom left
    ] as const) {
      updateChart(model, "1", { legendPosition });
      const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
      const colorScaleLegend = runtime.chartJsConfig.options!.plugins!.chartColorScalePlugin;
      expect(colorScaleLegend?.position).toBe(legendPosition);

      const layout = runtime.chartJsConfig.options!.layout as {
        padding: { left: number; right: number };
      };
      if (edge === "left") {
        expect(layout.padding.left).toBeGreaterThan(layout.padding.right);
      } else {
        expect(layout.padding.right).toBeGreaterThan(layout.padding.left);
      }
    }
  });

  test("several dataSets are kept in the definition, but only the first is used for the runtime", () => {
    const model = createModelFromGrid({
      A2: "Apple",
      B2: "Mon",
      C2: "1",
      D2: "10",
      A3: "Banana",
      B3: "Tue",
      C3: "2",
      D3: "20",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [
            { dataRange: "C2:C3", dataSetId: "0" },
            { dataRange: "D2:D3", dataSetId: "1" },
          ],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
    const definition = model.getters.getChartDefinition("1") as HeatmapChartDefinition<string>;
    expect(definition.dataSource).toMatchObject({
      dataSets: [{ dataRange: "C2:C3" }, { dataRange: "D2:D3" }],
    });

    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets.map((d) => d.values)).toEqual([
      [undefined, 2],
      [1, undefined],
    ]);
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A6",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C6", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B6",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    // columns keep the first-occurrence order of the source range, not sorted. Rows are also
    // kept in first-occurrence order, but reversed: chart.js stacks dataset 0 at the bottom of
    // the y range, so the row order is reversed here to make the first row of the grid end up on
    // top, matching its reading order (see "text row labels..." below).
    expect(config.data.labels).toEqual(["Mon", "Tue", "Wed"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["Banana", "Apple"]);
    expect(datasets[0].values).toEqual([3, undefined, 4]); // Banana
    expect(datasets[1].values).toEqual([11, 2, undefined]); // Apple/Mon = 1 + 10
  });

  test("text row labels are displayed top-to-bottom in the same order as the grid", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["Banana", "Apple"]);
  });

  test("without a data range, counts occurrences of each (row, column) pair", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon",
      A3: "Apple",  B3: "Mon",
      A4: "Apple",  B4: "Tue",
      A5: "Banana", B5: "Mon",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A5",
        ...toChartDataSource({ dataSets: [], dataSetsHaveTitle: false, labelRange: "B2:B5" }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    expect(config.data.labels).toEqual(["Mon", "Tue"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["Banana", "Apple"]);
    expect(datasets[0].values).toEqual([1, undefined]); // Banana x Tue never occurs
    expect(datasets[1].values).toEqual([2, 1]); // Apple x Mon occurs twice
  });

  test("a fully numeric row range is cut into bins and aggregated, instead of one row per value", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "Cat", C2: "1",
      A3: "1",  B3: "Cat", C3: "2",
      A4: "10", B4: "Cat", C4: "30",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    expect(config.data.labels).toEqual(["0 - 50", "50 - 100"]);
    const datasets = config.data.datasets as any[];
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    expect(datasets[0].values).toEqual([3, undefined]);
    expect(datasets[1].values).toEqual([undefined, 30]);
  });

  test("numeric bin boundaries with repeating decimals are rounded to 2 decimal places", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",   B2: "0",   C2: "1",
      A3: "0.2", B3: "0.2", C3: "2",
      A4: "0.5", B4: "0.5", C4: "3",
      A5: "1",   B5: "1",   C5: "4",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A5",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C5", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B5",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const scales = runtime.chartJsConfig.options!.scales as any;

    // 3 bins over [0, 1] give a bin size of 1/3 = 0.3333...: without rounding, the boundary at
    // 1/3 and 2/3 would show as "0.3333333333333333"/"0.6666666666666666" instead of "0.33"/"0.67"
    expect([0, 1, 2, 3].map((index) => scales.xBoundary.ticks.callback(undefined, index))).toEqual([
      "0",
      "0.33",
      "0.67",
      "1",
    ]);
    expect([0, 1, 2, 3].map((index) => scales.y.ticks.callback(undefined, index))).toEqual([
      "0",
      "0.33",
      "0.67",
      "1",
    ]);
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
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
    // the callback is keyed by the tick's position in the ticks array (chart.js's second callback
    // argument), which lines up 1:1 with binBoundaryLabels since this axis always generates
    // exactly one tick per boundary (min: 0, stepSize: 1, autoSkip: false)
    expect([0, 1, 2].map((index) => scales.xBoundary.ticks.callback(undefined, index))).toEqual([
      "0",
      "50",
      "100",
    ]);
    expect([0, 1, 2].map((index) => scales.y.ticks.callback(undefined, index))).toEqual([
      "0",
      "5",
      "10",
    ]);

    // bars are positioned exactly as for a plain category axis (no boundary logic involved),
    // since the boundary ticks are drawn by the separate overlay axis instead
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets[0].data).toEqual([1, 1]);
  });

  test("the horizontal axis title is drawn on the boundary axis for numeric tick labels, not between the ticks and the chart", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "0",   C2: "1",
      A3: "1",  B3: "1",   C3: "2",
      A4: "10", B4: "100", C4: "30",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
    updateChart(model, "1", { axesDesign: { x: { title: { text: "Column" } } } });
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const scales = runtime.chartJsConfig.options!.scales as any;

    // the hidden category axis (whose ticks are off) must not carry the title: it would then be
    // stacked between the boundary axis's visible ticks and the chart area
    expect(scales.x.title?.display).toBeFalsy();
    expect(scales.xBoundary.title.display).toBe(true);
    expect(scales.xBoundary.title.text).toBe("Column");
  });

  test("a numeric bin with no matching data point still gets its own column, shown as missing data", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Cat", B2: "0",  C2: "1",
      A3: "Cat", B3: "1",  C3: "2",
      A4: "Cat", B4: "2",  C4: "3",
      A5: "Cat", B5: "99", C5: "4",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A5",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C5", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B5",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;

    // 3 bins (0-33, 33-66, 66-99), the middle one has no data point at all
    expect(config.data.labels).toEqual(["0 - 33", "33 - 66", "66 - 99"]);
    const scales = config.options!.scales as any;
    expect(scales.xBoundary.max).toBe(3);

    const datasets = config.data.datasets as any[];
    expect(datasets[0].values).toEqual([6, undefined, 4]);
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
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
      {
        rowRange: "A1:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C1:C4", dataSetId: "0" }],
          dataSetsHaveTitle: true,
          labelRange: "B1:B4",
        }),
      },
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;
    // rows are not all numeric ("text" is not a number), so they keep sheet order (reversed, so
    // the first row of the grid ends up on top once rendered)
    expect((config.data.datasets as any[]).map((d) => d.label)).toEqual(["text", "3"]);
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
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
        missingValueColor: "#ABCDEF",
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    expect(datasets[0].backgroundColor[0]).toBe("#ABCDEF");
    expect(datasets[1].backgroundColor[1]).toBe("#ABCDEF");
  });

  test("colorscale legend includes the missing-value color when some combinations are missing", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
        missingValueColor: "#ABCDEF",
      },
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
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
        missingValueColor: "#ABCDEF",
      },
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
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    const tooltip = runtime.chartJsConfig.options!.plugins!.tooltip as any;
    // datasets[0] is Banana (reversed grid order)
    expect(tooltip.callbacks.label({ dataset: datasets[0], dataIndex: 0 })).toBe("No Data");
  });

  test("tooltip labels the column value as x and the row value as y", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "0",  B2: "0",   C2: "1",
      A3: "1",  B3: "1",   C3: "2",
      A4: "10", B4: "100", C4: "30",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;
    const datasets = config.data.datasets as any[];
    const tooltip = config.options!.plugins!.tooltip as any;

    // datasets are grouped by row ("0 - 5", "5 - 10"), config.data.labels are the columns ("0 - 50", "50 - 100")
    expect(datasets.map((d) => d.label)).toEqual(["0 - 5", "5 - 10"]);
    expect(config.data.labels).toEqual(["0 - 50", "50 - 100"]);
    expect(
      tooltip.callbacks.beforeLabel({ dataset: datasets[0], label: config.data.labels![1] })
    ).toEqual(["x : 50 - 100", "y : 0 - 5"]);
  });

  test("showValues displays nothing for a missing (row, column) combination", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
        showValues: true,
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const datasets = runtime.chartJsConfig.data.datasets as any[];
    const showValuesPlugin = runtime.chartJsConfig.options!.plugins!.chartShowValuesPlugin as any;
    // datasets[0] is Banana (reversed grid order)
    expect(showValuesPlugin.callback(undefined, { _dataset: datasets[0] }, 0)).toBe(undefined);
  });

  test("incomplete (row, column, value) triples are dropped when ranges have different lengths", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple",  B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
      A4: "Cherry", B4: "Wed",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B4",
        }),
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as HeatmapChartRuntime;
    const config = runtime.chartJsConfig;
    expect(config.data.labels).toEqual(["Mon", "Tue"]);
    expect((config.data.datasets as any[]).map((d) => d.label)).toEqual(["Banana", "Apple"]);
  });

  test("invalid ranges are rejected", () => {
    const model = createModelFromGrid({ A1: "Apple", B1: "Mon", C1: "1" });
    createHeatmapChart(
      model,
      {
        rowRange: "A1",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C1", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B1",
        }),
      },
      "1"
    );

    expect(updateChart(model, "1", { rowRange: "this is not a range" })).toBeCancelledBecause(
      CommandResult.InvalidHeatmapRowRange
    );
    expect(
      updateChartDataSource(model, "1", { labelRange: "this is not a range" })
    ).toBeCancelledBecause(CommandResult.InvalidLabelRange);
    expect(
      updateChartDataSource(model, "1", {
        dataSets: [{ dataRange: "this is not a range", dataSetId: "0" }],
      })
    ).toBeCancelledBecause(CommandResult.InvalidDataSet);
  });

  test("updating a range can be undone", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A2: "Apple", B2: "Mon", C2: "1",
      A3: "Banana", B3: "Tue", C3: "2",
    });
    createHeatmapChart(
      model,
      {
        rowRange: "A2:A3",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C2:C3", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B2:B3",
        }),
      },
      "1"
    );
    updateChartDataSource(model, "1", { dataSets: [{ dataRange: "C2", dataSetId: "0" }] });
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSource: { dataSets: [{ dataRange: "C2" }] },
    });

    undo(model);
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSource: { dataSets: [{ dataRange: "C2:C3" }] },
    });
  });

  test("getDefinitionForExcel returns undefined, heatmap is not exportable to Excel", () => {
    expect(HeatmapChart.getDefinitionForExcel({} as any, {} as any, {} as any)).toBeUndefined();
  });
});

describe("switching chart type between line and heatmap", () => {
  test("line -> heatmap -> line preserves all data series, labelRange and legendPosition", () => {
    const model = new Model();
    const chartId = "chartId";
    createChart(
      model,
      {
        type: "line",
        legendPosition: "bottom",
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
      chartId
    );
    const { store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore);

    chartPanelStore.changeChartType(chartId, "heatmap");
    const heatmapDefinition = model.getters.getChartDefinition(chartId);
    expect(heatmapDefinition.type).toBe("heatmap");

    chartPanelStore.changeChartType(chartId, "line");
    const lineDefinition = model.getters.getChartDefinition(chartId) as LineChartDefinition<string>;
    expect(lineDefinition.type).toBe("line");
    const dataSource = lineDefinition.dataSource as Extract<
      typeof lineDefinition.dataSource,
      { type: "range" }
    >;
    expect(dataSource.dataSets.map((ds) => ds.dataRange)).toEqual(["B1:B4", "C1:C4", "D1:D4"]);
    expect(dataSource.labelRange).toBe("Sheet1!A1:A4");
    expect(lineDefinition.legendPosition).toBe("bottom");
  });

  test("heatmap -> line -> heatmap preserves colorScale and missingValueColor", () => {
    const model = new Model();
    const chartId = "chartId";
    createHeatmapChart(
      model,
      {
        rowRange: "A1:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C1:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B1:B4",
        }),
        colorScale: { minColor: "#000000", maxColor: "#ffffff" },
        missingValueColor: "#ff00ff",
      },
      chartId
    );
    const { store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore);

    chartPanelStore.changeChartType(chartId, "line");
    chartPanelStore.changeChartType(chartId, "heatmap");

    const heatmapDefinition = model.getters.getChartDefinition(
      chartId
    ) as HeatmapChartDefinition<string>;
    expect(heatmapDefinition.colorScale).toEqual({ minColor: "#000000", maxColor: "#ffffff" });
    expect(heatmapDefinition.missingValueColor).toBe("#ff00ff");
  });

  test("switching from a heatmap with a rowRange to line exposes only dataRange as a series, but rowRange survives the round trip back to heatmap", () => {
    const model = new Model();
    const chartId = "chartId";
    createHeatmapChart(
      model,
      {
        rowRange: "A1:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C1:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B1:B4",
        }),
      },
      chartId
    );
    const { store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore);

    chartPanelStore.changeChartType(chartId, "line");

    const lineDefinition = model.getters.getChartDefinition(chartId) as LineChartDefinition<string>;
    expect(lineDefinition.type).toBe("line");
    const dataSource = lineDefinition.dataSource as Extract<
      typeof lineDefinition.dataSource,
      { type: "range" }
    >;
    // rowRange has no equivalent in a line chart, so it doesn't turn into a 2nd series here...
    expect(dataSource.dataSets.map((ds) => ds.dataRange)).toEqual(["C1:C4"]);
    expect(dataSource.labelRange).toBe("B1:B4");

    chartPanelStore.changeChartType(chartId, "heatmap");
    const heatmapDefinition = model.getters.getChartDefinition(
      chartId
    ) as HeatmapChartDefinition<string>;
    // ...but it isn't lost either: it reappears once back on a heatmap.
    expect(heatmapDefinition.rowRange).toBe("A1:A4");
  });
});

describe("switching chart type between calendar and heatmap", () => {
  test("heatmap -> calendar -> heatmap preserves colorScale and missingValueColor", () => {
    const model = new Model();
    const chartId = "chartId";
    createHeatmapChart(
      model,
      {
        rowRange: "A1:A4",
        ...toChartDataSource({
          dataSets: [{ dataRange: "C1:C4", dataSetId: "0" }],
          dataSetsHaveTitle: false,
          labelRange: "B1:B4",
        }),
        colorScale: { minColor: "#000000", maxColor: "#ffffff" },
        missingValueColor: "#ff00ff",
      },
      chartId
    );
    const { store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore);

    chartPanelStore.changeChartType(chartId, "calendar");
    const calendarDefinition = model.getters.getChartDefinition(
      chartId
    ) as CalendarChartDefinition<string>;
    expect(calendarDefinition.colorScale).toEqual({ minColor: "#000000", maxColor: "#ffffff" });
    expect(calendarDefinition.missingValueColor).toBe("#ff00ff");

    chartPanelStore.changeChartType(chartId, "heatmap");
    const heatmapDefinition = model.getters.getChartDefinition(
      chartId
    ) as HeatmapChartDefinition<string>;
    expect(heatmapDefinition.colorScale).toEqual({ minColor: "#000000", maxColor: "#ffffff" });
    expect(heatmapDefinition.missingValueColor).toBe("#ff00ff");
  });

  test("calendar -> heatmap -> calendar preserves colorScale and missingValueColor", () => {
    const model = new Model();
    const chartId = "chartId";
    createCalendarChart(
      model,
      {
        colorScale: { minColor: "#000000", maxColor: "#ffffff" },
        missingValueColor: "#ff00ff",
      },
      chartId
    );
    const { store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore);

    chartPanelStore.changeChartType(chartId, "heatmap");
    chartPanelStore.changeChartType(chartId, "calendar");

    const calendarDefinition = model.getters.getChartDefinition(
      chartId
    ) as CalendarChartDefinition<string>;
    expect(calendarDefinition.colorScale).toEqual({ minColor: "#000000", maxColor: "#ffffff" });
    expect(calendarDefinition.missingValueColor).toBe("#ff00ff");
  });
});
