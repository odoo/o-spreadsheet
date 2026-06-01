import { Model } from "../../../src";
import {
  analyzeColumns,
  ChartSuggestion,
  getChartSuggestions,
} from "../../../src/helpers/figures/charts/chart_suggestion_engine";
import { toZone } from "../../../src/helpers/zones";
import { GaugeChartRuntime } from "../../../src/types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../src/types/chart/scorecard_chart";
import { createChart, setCellContent, setFormat } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

function suggestions(model: Model, xc: string): ChartSuggestion[] {
  return getChartSuggestions([toZone(xc)], model.getters);
}

function suggestionTitles(model: Model, xc: string): string[] {
  return suggestions(model, xc).map((s) => s.title);
}

function columnType(model: Model, xc: string): string {
  return analyzeColumns([toZone(xc)], model.getters)[0].type;
}

let chartCounter = 0;
function runtimeFor(model: Model, xcs: string | string[], title: string) {
  const zones = (Array.isArray(xcs) ? xcs : [xcs]).map(toZone);
  const s = getChartSuggestions(zones, model.getters).find((x) => x.title === title);
  if (!s) {
    return undefined;
  }
  const chartId = `test-chart-${++chartCounter}`;
  createChart(model, s.definition, chartId);
  return model.getters.getChartRuntime(chartId);
}

beforeEach(() => {
  chartCounter = 0;
});

// ---------------------------------------------------------------------------
// analyzeColumns — column type inference
// ---------------------------------------------------------------------------

describe("analyzeColumns", () => {
  test("empty column", () => {
    const model = new Model();
    expect(columnType(model, "A1:A3")).toBe("empty");
  });

  test("all-error column", () => {
    const model = createModelFromGrid({ A1: "=1/0", A2: "=1/0" });
    expect(columnType(model, "A1:A2")).toBe("error");
  });

  test("numeric column", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
    expect(columnType(model, "A1:A3")).toBe("number");
  });

  test("date column", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2024");
    setCellContent(model, "A2", "2/1/2024");
    setFormat(model, "A1:A2", "mm/dd/yyyy");
    expect(columnType(model, "A1:A2")).toBe("date");
  });

  test("percentage column — explicit format", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.3");
    setCellContent(model, "A2", "0.5");
    setFormat(model, "A1:A2", "0%");
    expect(columnType(model, "A1:A2")).toBe("percentage");
  });

  test("categorical column — low unique ratio", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
      A4: "banana",
      A5: "apple",
    });
    expect(columnType(model, "A1:A5")).toBe("categorical");
  });

  test("label column — high unique ratio", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      A4: "Dave",
    });
    expect(columnType(model, "A1:A4")).toBe("label");
  });

  test("boolean column", () => {
    const model = createModelFromGrid({ A1: "=TRUE", A2: "=FALSE" });
    expect(columnType(model, "A1:A2")).toBe("boolean");
  });

  test("header detection — first text cell, rest numeric", () => {
    const model = createModelFromGrid({ A1: "Revenue", A2: "100", A3: "200" });
    const col = analyzeColumns([toZone("A1:A3")], model.getters)[0];
    expect(col.hasHeader).toBe(true);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(2); // only data rows, not header
  });

  test("no header when first cell is numeric", () => {
    const model = createModelFromGrid({ A1: "100", A2: "200", A3: "300" });
    const col = analyzeColumns([toZone("A1:A3")], model.getters)[0];
    expect(col.hasHeader).toBe(false);
    expect(col.rowCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getChartSuggestions — per-pattern smoke tests
// ---------------------------------------------------------------------------

describe("getChartSuggestions", () => {
  test("returns empty for empty selection", () => {
    const model = new Model();
    expect(suggestions(model, "A1:A3")).toHaveLength(0);
  });

  test("returns empty for all-error selection", () => {
    const model = createModelFromGrid({ A1: "=1/0", A2: "=1/0" });
    expect(suggestions(model, "A1:A2")).toHaveLength(0);
  });

  // Pattern A — single number column
  describe("Pattern A — single number column", () => {
    test("1 row → KPI card shows cell value, no bar chart suggested", () => {
      const model = createModelFromGrid({ A1: "42" });
      const runtime = runtimeFor(model, "A1", "KPI Card") as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("42");
      expect(runtime.baselineDisplay).toBe("");
      expect(suggestionTitles(model, "A1")).not.toContain("Bar Chart");
    });

    test("2 rows → KPI shows last value, bar chart contains both values", () => {
      const model = createModelFromGrid({ A1: "10", A2: "20" });
      const kpiRuntime = runtimeFor(model, "A1:A2", "KPI Card") as ScorecardChartRuntime;
      expect(kpiRuntime.keyValue).toBe("20");
      const barRuntime = runtimeFor(model, "A1:A2", "Bar Chart") as any;
      expect(barRuntime.chartJsConfig.type).toBe("bar");
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([10, 20]);
    });

    test("3 rows → gauge spans min/max range, trend line is unfilled, area chart is filled, no KPI", () => {
      const model = createModelFromGrid({ A1: "0", A2: "100", A3: "50" });
      const gaugeRuntime = runtimeFor(model, "A1:A3", "Gauge") as GaugeChartRuntime;
      expect(gaugeRuntime.minValue).toMatchObject({ value: 0 });
      expect(gaugeRuntime.maxValue).toMatchObject({ value: 100 });
      expect(gaugeRuntime.gaugeValue).toMatchObject({ value: 50 });
      expect((runtimeFor(model, "A1:A3", "Bar Chart") as any).chartJsConfig.type).toBe("bar");
      expect(
        (runtimeFor(model, "A1:A3", "Trend Line") as any).chartJsConfig.data.datasets[0].fill
      ).toBeFalsy();
      expect(
        (runtimeFor(model, "A1:A3", "Area Chart") as any).chartJsConfig.data.datasets[0].fill
      ).toBeTruthy();
      expect(suggestionTitles(model, "A1:A3")).not.toContain("KPI Card");
    });

    test(">3 rows → bar chart carries all values, area chart is filled, no KPI or gauge", () => {
      const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3", A4: "4" });
      const barRuntime = runtimeFor(model, "A1:A4", "Bar Chart") as any;
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([1, 2, 3, 4]);
      expect(
        (runtimeFor(model, "A1:A4", "Area Chart") as any).chartJsConfig.data.datasets[0].fill
      ).toBeTruthy();
      const titles = suggestionTitles(model, "A1:A4");
      expect(titles).not.toContain("KPI Card");
      expect(titles).not.toContain("Gauge");
    });

    test("header + 1 data row — KPI shows data value with no baseline", () => {
      const model = createModelFromGrid({ A1: "Revenue", A2: "42" });
      const runtime = runtimeFor(model, "A1:A2", "KPI Card") as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("42");
      expect(runtime.baselineDisplay).toBe("");
    });

    test("header + 2 data rows — KPI shows latest value and a non-empty baseline", () => {
      const model = createModelFromGrid({ A1: "Revenue", A2: "10", A3: "20" });
      const runtime = runtimeFor(model, "A1:A3", "KPI Card") as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("20");
      expect(runtime.baselineDisplay).not.toBe("");
    });

    test("header + 3 data rows — gauge min/max come from data rows, not the header", () => {
      const model = createModelFromGrid({ A1: "Value", A2: "0", A3: "100", A4: "50" });
      const runtime = runtimeFor(model, "A1:A4", "Gauge") as GaugeChartRuntime;
      expect(runtime.minValue).toMatchObject({ value: 0 });
      expect(runtime.maxValue).toMatchObject({ value: 100 });
      expect(runtime.gaugeValue).toMatchObject({ value: 50 });
    });
  });

  // Pattern B — single percentage column
  describe("Pattern B — single percentage column", () => {
    test("1 percentage row → KPI shows formatted percent, gauge uses 0–1 range", () => {
      const model = new Model();
      setCellContent(model, "A1", "0.75");
      setFormat(model, "A1", "0%");
      const kpiRuntime = runtimeFor(model, "A1", "KPI Card") as ScorecardChartRuntime;
      expect(kpiRuntime.keyValue).toBe("75%");
      const gaugeRuntime = runtimeFor(model, "A1", "Gauge") as GaugeChartRuntime;
      expect(gaugeRuntime.minValue).toMatchObject({ value: 0 });
      expect(gaugeRuntime.maxValue).toMatchObject({ value: 1 });
      expect(gaugeRuntime.gaugeValue).toMatchObject({ value: 0.75 });
    });

    test(">1 percentage rows → donut chart and bar chart produced", () => {
      const model = new Model();
      setCellContent(model, "A1", "0.3");
      setCellContent(model, "A2", "0.5");
      setFormat(model, "A1:A2", "0%");
      expect((runtimeFor(model, "A1:A2", "Donut Chart") as any).chartJsConfig.type).toBe(
        "doughnut"
      );
      expect((runtimeFor(model, "A1:A2", "Bar Chart") as any).chartJsConfig.type).toBe("bar");
    });
  });

  // Pattern D — single categorical column
  describe("Pattern D — single categorical column", () => {
    test("categorical column → pie, donut, and bar (count) charts produced", () => {
      const model = createModelFromGrid({
        A1: "apple",
        A2: "banana",
        A3: "apple",
        A4: "banana",
        A5: "apple",
      });
      expect((runtimeFor(model, "A1:A5", "Pie Chart") as any).chartJsConfig.type).toBe("pie");
      expect((runtimeFor(model, "A1:A5", "Donut Chart") as any).chartJsConfig.type).toBe(
        "doughnut"
      );
      expect((runtimeFor(model, "A1:A5", "Bar (count)") as any).chartJsConfig.type).toBe("bar");
    });
  });

  // Pattern F — categorical + number
  describe("Pattern F — categorical + number", () => {
    test("bar chart carries numeric values, horizontal bar uses y-axis, pie chart produced", () => {
      const model = createModelFromGrid({
        A1: "apple",
        A2: "apple",
        A3: "cherry",
        B1: "10",
        B2: "5",
        B3: "30",
      });
      const barRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Bar Chart") as any;
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([15, 30]);
      const hBarRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Horizontal Bar") as any;
      expect(hBarRuntime.chartJsConfig.options.indexAxis).toBe("y");
      expect((runtimeFor(model, ["A1:A3", "B1:B3"], "Pie Chart") as any).chartJsConfig.type).toBe(
        "pie"
      );
    });
  });

  // Pattern G — date + number
  describe("Pattern G — date + number", () => {
    test("line and bar charts produced, area chart is filled, calendar chart produced", () => {
      const model = new Model();
      setCellContent(model, "A1", "1/1/2024");
      setCellContent(model, "A2", "2/1/2024");
      setCellContent(model, "A3", "3/1/2024");
      setFormat(model, "A1:A3", "mm/dd/yyyy");
      setCellContent(model, "B1", "10");
      setCellContent(model, "B2", "20");
      setCellContent(model, "B3", "30");
      expect((runtimeFor(model, ["A1:A3", "B1:B3"], "Line Chart") as any).chartJsConfig.type).toBe(
        "line"
      );
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], "Area Chart") as any).chartJsConfig.data.datasets[0]
          .fill
      ).toBeTruthy();
      expect((runtimeFor(model, ["A1:A3", "B1:B3"], "Bar Chart") as any).chartJsConfig.type).toBe(
        "bar"
      );
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], "Calendar Heatmap") as any).chartJsConfig.type
      ).toBe("calendar");
    });
  });

  // Pattern H — number + number
  describe("Pattern H — number + number", () => {
    test(">2 rows — exactly one 'Grouped Bar' suggestion", () => {
      const model = createModelFromGrid({
        A1: "1",
        A2: "2",
        A3: "3",
        B1: "4",
        B2: "5",
        B3: "6",
      });
      const titles = getChartSuggestions([toZone("A1:A3"), toZone("B1:B3")], model.getters).map(
        (s) => s.title
      );
      expect(titles.filter((t) => t === "Grouped Bar")).toHaveLength(1);
    });

    test(">2 rows → scatter uses lines-off mode, combo chart produced", () => {
      const model = createModelFromGrid({
        A1: "1",
        A2: "2",
        A3: "3",
        B1: "4",
        B2: "5",
        B3: "6",
      });
      const scatterRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Scatter Plot") as any;
      expect(scatterRuntime.chartJsConfig.data.datasets[0].showLine).toBe(false);
      expect(runtimeFor(model, ["A1:A3", "B1:B3"], "Combo Chart")).toBeDefined();
    });

    test("1 row → KPI shows second column as value, baseline is non-empty", () => {
      const model = createModelFromGrid({ A1: "10", B1: "20" });
      const runtime = runtimeFor(model, ["A1", "B1"], "KPI Card") as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("20");
      expect(runtime.baselineDisplay).not.toBe("");
    });
  });

  // Pattern K — label + number
  describe("Pattern K — label + number", () => {
    test("1 row → KPI shows numeric value", () => {
      const model = createModelFromGrid({ A1: "Alice", B1: "42" });
      const runtime = runtimeFor(model, ["A1", "B1"], "KPI Card") as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("42");
    });

    test("2-10 rows → horizontal bar uses y-axis, bar chart is vertical", () => {
      const model = createModelFromGrid({
        A1: "Alice",
        A2: "Bob",
        A3: "Charlie",
        B1: "10",
        B2: "20",
        B3: "30",
      });
      const hBarRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Horizontal Bar") as any;
      expect(hBarRuntime.chartJsConfig.options.indexAxis).toBe("y");
      const barRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Bar Chart") as any;
      expect(barRuntime.chartJsConfig.type).toBe("bar");
    });

    test("3-10 rows → radar chart produced", () => {
      const model = createModelFromGrid({
        A1: "Alice",
        A2: "Bob",
        A3: "Charlie",
        B1: "10",
        B2: "20",
        B3: "30",
      });
      const radarRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], "Radar") as any;
      expect(radarRuntime.chartJsConfig.type).toBe("radar");
    });
  });

  // Pattern S — 3+ all-numeric columns
  describe("Pattern S — many number columns", () => {
    test("3 numeric columns → grouped bar has one dataset per column", () => {
      const model = createModelFromGrid({ A1: "1", B1: "2", C1: "3" });
      const runtime = runtimeFor(model, ["A1", "B1", "C1"], "Grouped Bar") as any;
      expect(runtime.chartJsConfig.type).toBe("bar");
      expect(runtime.chartJsConfig.data.datasets).toHaveLength(3);
    });

    test("3 single-cell numeric columns → gauge uses first as min, second as max, third as value", () => {
      const model = createModelFromGrid({ A1: "0", B1: "100", C1: "50" });
      const runtime = runtimeFor(model, ["A1", "B1", "C1"], "Gauge") as GaugeChartRuntime;
      expect(runtime.minValue).toMatchObject({ value: 0 });
      expect(runtime.maxValue).toMatchObject({ value: 100 });
      expect(runtime.gaugeValue).toMatchObject({ value: 50 });
    });
  });
});
