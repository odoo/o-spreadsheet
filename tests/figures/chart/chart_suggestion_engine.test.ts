import { Model } from "../../../src";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../src/helpers/figures/charts/chart_suggestion_engine";
import { toZone } from "../../../src/helpers/zones";
import { ChartDefinition } from "../../../src/types/chart/chart";
import { GaugeChartRuntime } from "../../../src/types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../src/types/chart/scorecard_chart";
import { createChart, setCellContent, setFormat } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

function suggestions(model: Model, xcs: string | string[]): ChartSuggestion[] {
  const zones = (Array.isArray(xcs) ? xcs : [xcs]).map(toZone);
  return getChartSuggestions(zones, model.getters);
}

function suggestionTypes(model: Model, xcs: string | string[]): string[] {
  return suggestions(model, xcs).map((s) => s.definition.type);
}

let chartCounter = 0;
function runtimeFor(
  model: Model,
  xcs: string | string[],
  predicate: (definition: ChartDefinition) => boolean
) {
  const zones = (Array.isArray(xcs) ? xcs : [xcs]).map(toZone);
  const suggestions = getChartSuggestions(zones, model.getters);
  const s = suggestions.find((x) => predicate(x.definition));
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
      const runtime = runtimeFor(
        model,
        "A1",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("42");
      expect(runtime.baselineDisplay).toBe("");
      expect(suggestionTypes(model, "A1")).not.toContain("bar");
    });

    test("2 rows → KPI shows last value, bar chart contains both values", () => {
      const model = createModelFromGrid({ A1: "10", A2: "20" });
      const kpiRuntime = runtimeFor(
        model,
        "A1:A2",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(kpiRuntime.keyValue).toBe("20");
      const barRuntime = runtimeFor(model, "A1:A2", (d) => d.type === "bar") as any;
      expect(barRuntime.chartJsConfig.type).toBe("bar");
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([10, 20]);
    });

    test("3 rows → gauge spans min/max range, trend line is unfilled, area chart is filled, no KPI", () => {
      const model = createModelFromGrid({ A1: "0", A2: "100", A3: "50" });
      const gaugeRuntime = runtimeFor(
        model,
        "A1:A3",
        (d) => d.type === "gauge"
      ) as GaugeChartRuntime;
      expect(gaugeRuntime.minValue).toMatchObject({ value: 0 });
      expect(gaugeRuntime.maxValue).toMatchObject({ value: 100 });
      expect(gaugeRuntime.gaugeValue).toMatchObject({ value: 50 });
      expect((runtimeFor(model, "A1:A3", (d) => d.type === "bar") as any).chartJsConfig.type).toBe(
        "bar"
      );
      expect(
        (runtimeFor(model, "A1:A3", (d) => d.type === "line" && !d.fillArea) as any).chartJsConfig
          .data.datasets[0].fill
      ).toBeFalsy();
      expect(
        (runtimeFor(model, "A1:A3", (d) => d.type === "line" && !!d.fillArea) as any).chartJsConfig
          .data.datasets[0].fill
      ).toBeTruthy();
      expect(suggestionTypes(model, "A1:A3")).not.toContain("scorecard");
    });

    test(">3 rows → bar chart carries all values, area chart is filled, no KPI or gauge", () => {
      const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3", A4: "4" });
      const barRuntime = runtimeFor(model, "A1:A4", (d) => d.type === "bar") as any;
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([1, 2, 3, 4]);
      expect(
        (runtimeFor(model, "A1:A4", (d) => d.type === "line" && !!d.fillArea) as any).chartJsConfig
          .data.datasets[0].fill
      ).toBeTruthy();
      const types = suggestionTypes(model, "A1:A4");
      expect(types).not.toContain("scorecard");
      expect(types).not.toContain("gauge");
    });

    test("header + 1 data row — KPI shows data value with no baseline", () => {
      const model = createModelFromGrid({ A1: "Revenue", A2: "42" });
      const runtime = runtimeFor(
        model,
        "A1:A2",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("42");
      expect(runtime.baselineDisplay).toBe("");
    });

    test("header + 2 data rows — KPI shows latest value and a non-empty baseline", () => {
      const model = createModelFromGrid({ A1: "Revenue", A2: "10", A3: "20" });
      const runtime = runtimeFor(
        model,
        "A1:A3",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("20");
      expect(runtime.baselineDisplay).not.toBe("");
    });

    test("header + 3 data rows — gauge min/max come from data rows, not the header", () => {
      const model = createModelFromGrid({ A1: "Value", A2: "0", A3: "100", A4: "50" });
      const runtime = runtimeFor(model, "A1:A4", (d) => d.type === "gauge") as GaugeChartRuntime;
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
      const kpiRuntime = runtimeFor(
        model,
        "A1",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(kpiRuntime.keyValue).toBe("75%");
      const gaugeRuntime = runtimeFor(model, "A1", (d) => d.type === "gauge") as GaugeChartRuntime;
      expect(gaugeRuntime.minValue).toMatchObject({ value: 0 });
      expect(gaugeRuntime.maxValue).toMatchObject({ value: 1 });
      expect(gaugeRuntime.gaugeValue).toMatchObject({ value: 0.75 });
    });

    test(">1 percentage rows → donut chart and bar chart produced", () => {
      const model = new Model();
      setCellContent(model, "A1", "0.3");
      setCellContent(model, "A2", "0.5");
      setFormat(model, "A1:A2", "0%");
      expect(
        (runtimeFor(model, "A1:A2", (d) => d.type === "pie" && !!d.isDoughnut) as any).chartJsConfig
          .type
      ).toBe("doughnut");
      expect((runtimeFor(model, "A1:A2", (d) => d.type === "bar") as any).chartJsConfig.type).toBe(
        "bar"
      );
    });
  });

  // Pattern C — single date column
  describe("Pattern C — single date column", () => {
    test("1 row → KPI card is the only suggestion", () => {
      const model = new Model();
      setCellContent(model, "A1", "1/1/2024");
      setFormat(model, "A1", "mm/dd/yyyy");
      expect(suggestionTypes(model, "A1")).toEqual(["scorecard"]);
    });

    test(">1 row → no suggestions yet (date-bucketing not supported)", () => {
      const model = new Model();
      setCellContent(model, "A1", "1/1/2024");
      setCellContent(model, "A2", "2/1/2024");
      setFormat(model, "A1:A2", "mm/dd/yyyy");
      expect(suggestions(model, "A1:A2")).toHaveLength(0);
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
      expect(
        (runtimeFor(model, "A1:A5", (d) => d.type === "pie" && !d.isDoughnut) as any).chartJsConfig
          .type
      ).toBe("pie");
      expect(
        (runtimeFor(model, "A1:A5", (d) => d.type === "pie" && !!d.isDoughnut) as any).chartJsConfig
          .type
      ).toBe("doughnut");
      expect((runtimeFor(model, "A1:A5", (d) => d.type === "bar") as any).chartJsConfig.type).toBe(
        "bar"
      );
    });

    test("boolean column → pie, donut, and bar (count) charts produced", () => {
      const model = createModelFromGrid({
        A1: "TRUE",
        A2: "FALSE",
        A3: "TRUE",
        A4: "FALSE",
        A5: "TRUE",
      });
      expect(
        (runtimeFor(model, "A1:A5", (d) => d.type === "pie" && !d.isDoughnut) as any).chartJsConfig
          .type
      ).toBe("pie");
      expect(
        (runtimeFor(model, "A1:A5", (d) => d.type === "pie" && !!d.isDoughnut) as any).chartJsConfig
          .type
      ).toBe("doughnut");
      expect((runtimeFor(model, "A1:A5", (d) => d.type === "bar") as any).chartJsConfig.type).toBe(
        "bar"
      );
    });
  });

  // Pattern E — single label column
  describe("Pattern E — single label column", () => {
    test("1 row → KPI card shows the label, is the only suggestion", () => {
      const model = createModelFromGrid({ A1: "Alice" });
      expect(suggestionTypes(model, "A1")).toEqual(["scorecard"]);
      const runtime = runtimeFor(
        model,
        "A1",
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("Alice");
      expect(runtime.title.text).toBe("");
    });

    test(">1 row → no suggestions yet", () => {
      const model = createModelFromGrid({ A1: "Alice", A2: "Bob" });
      expect(suggestions(model, "A1:A2")).toHaveLength(0);
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
      const barRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "bar" && !d.horizontal
      ) as any;
      expect(barRuntime.chartJsConfig.data.datasets[0].data).toEqual([15, 30]);
      const hBarRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "bar" && !!d.horizontal
      ) as any;
      expect(hBarRuntime.chartJsConfig.options.indexAxis).toBe("y");
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "pie") as any).chartJsConfig.type
      ).toBe("pie");
    });

    test("No title if there is no header", () => {
      const model = createModelFromGrid({
        A1: "apple",
        A2: "apple",
        A3: "cherry",
        B1: "10",
        B2: "5",
        B3: "30",
      });
      const defs = suggestions(model, ["A1:A3", "B1:B3"]).map((s) => s.definition);
      expect(defs[0].title.text).toBe("");
    });

    test("number column has a header → title combines it with the category's first value", () => {
      const model = createModelFromGrid({
        A1: "apple",
        A2: "apple",
        A3: "cherry",
        B1: "Sales",
        B2: "10",
        B3: "5",
        B4: "30",
      });
      const defs = suggestions(model, ["A1:A3", "B1:B4"]).map((s) => s.definition);
      expect(defs[0].title.text).toBe("Sales by apple");
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
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "line" && !d.fillArea) as any)
          .chartJsConfig.type
      ).toBe("line");
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "line" && !!d.fillArea) as any)
          .chartJsConfig.data.datasets[0].fill
      ).toBeTruthy();
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "bar") as any).chartJsConfig.type
      ).toBe("bar");
      expect(
        (runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "calendar") as any).chartJsConfig
          .type
      ).toBe("calendar");
    });
  });

  // Pattern H — number + number
  describe("Pattern H — number + number", () => {
    test(">2 rows — exactly one grouped bar suggestion", () => {
      const model = createModelFromGrid({
        A1: "1",
        A2: "2",
        A3: "3",
        B1: "4",
        B2: "5",
        B3: "6",
      });
      const barSuggestions = getChartSuggestions(
        [toZone("A1:A3"), toZone("B1:B3")],
        model.getters
      ).filter((s) => s.definition.type === "bar");
      expect(barSuggestions).toHaveLength(1);
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
      const scatterRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "scatter"
      ) as any;
      expect(scatterRuntime.chartJsConfig.data.datasets[0].showLine).toBe(false);
      expect(runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "combo")).toBeDefined();
    });

    test("1 row → KPI shows second column as value, baseline is non-empty", () => {
      const model = createModelFromGrid({ A1: "10", B1: "20" });
      const runtime = runtimeFor(
        model,
        ["A1", "B1"],
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
      expect(runtime.keyValue).toBe("20");
      expect(runtime.baselineDisplay).not.toBe("");
    });
  });

  // Pattern I — categorical + percentage
  describe("Pattern I — categorical + percentage", () => {
    test("3 rows → bar, horizontal bar, pie and radar charts produced", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "South",
        A3: "North",
        B1: "0.3",
        B2: "0.5",
        B3: "0.2",
      });
      setFormat(model, "B1:B3", "0%");
      const types = suggestionTypes(model, ["A1:A3", "B1:B3"]);
      expect(types.filter((t) => t === "bar")).toHaveLength(2);
      expect(types).toContain("pie");
      expect(types).toContain("radar");
      expect(types).toHaveLength(4);
      const hBarRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "bar" && !!d.horizontal
      ) as any;
      expect(hBarRuntime.chartJsConfig.options.indexAxis).toBe("y");
    });

    test("2 rows → no radar chart (needs > 2 rows)", () => {
      const model = createModelFromGrid({ A1: "North", A2: "South", B1: "0.3", B2: "0.5" });
      setFormat(model, "B1:B2", "0%");
      expect(suggestionTypes(model, ["A1:A2", "B1:B2"])).not.toContain("radar");
    });

    test("No title if there is no header", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "South",
        A3: "North",
        B1: "0.3",
        B2: "0.5",
        B3: "0.2",
      });
      setFormat(model, "B1:B3", "0%");
      const defs = suggestions(model, ["A1:A3", "B1:B3"]).map((s) => s.definition);
      expect(defs[0].title.text).toBe("");
    });
  });

  // Pattern K — label + number
  describe("Pattern K — label + number", () => {
    test("1 row → KPI shows numeric value", () => {
      const model = createModelFromGrid({ A1: "Alice", B1: "42" });
      const runtime = runtimeFor(
        model,
        ["A1", "B1"],
        (d) => d.type === "scorecard"
      ) as ScorecardChartRuntime;
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
      const hBarRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "bar" && !!d.horizontal
      ) as any;
      expect(hBarRuntime.chartJsConfig.options.indexAxis).toBe("y");
      const barRuntime = runtimeFor(
        model,
        ["A1:A3", "B1:B3"],
        (d) => d.type === "bar" && !d.horizontal
      ) as any;
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
      const radarRuntime = runtimeFor(model, ["A1:A3", "B1:B3"], (d) => d.type === "radar") as any;
      expect(radarRuntime.chartJsConfig.type).toBe("radar");
    });
  });

  // Pattern M — categorical + multiple numbers (3+ number columns; exactly 2 is Pattern R instead)
  describe("Pattern M — categorical + multiple numbers", () => {
    test("3 rows, 3 number columns → grouped bar, stacked bar, line, filled line and radar produced", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "South",
        A3: "North",
        B1: "10",
        B2: "20",
        B3: "30",
        C1: "1",
        C2: "2",
        C3: "3",
        D1: "5",
        D2: "6",
        D3: "7",
      });
      const types = suggestionTypes(model, ["A1:A3", "B1:B3", "C1:C3", "D1:D3"]);
      expect(types).toEqual(["bar", "bar", "line", "line", "radar"]);
    });

    test("2 rows → no radar chart (needs > 2 rows)", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "South",
        B1: "10",
        B2: "20",
        C1: "1",
        C2: "2",
        D1: "5",
        D2: "6",
      });
      expect(suggestionTypes(model, ["A1:A2", "B1:B2", "C1:C2", "D1:D2"])).not.toContain("radar");
    });

    test("no header at all → no chart title", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "South",
        A3: "North",
        B1: "10",
        B2: "20",
        B3: "30",
        C1: "1",
        C2: "2",
        C3: "3",
        D1: "5",
        D2: "6",
        D3: "7",
      });
      const defs = suggestions(model, ["A1:A3", "B1:B3", "C1:C3", "D1:D3"]).map(
        (s) => s.definition
      );
      expect(defs[0].title).toBeUndefined;
    });
  });

  // Pattern N — date + multiple numbers
  describe("Pattern N — date + multiple numbers", () => {
    test("date + 2 number columns → line, filled line, combo and bar produced", () => {
      const model = new Model();
      setCellContent(model, "A1", "1/1/2024");
      setCellContent(model, "A2", "2/1/2024");
      setCellContent(model, "A3", "3/1/2024");
      setFormat(model, "A1:A3", "mm/dd/yyyy");
      setCellContent(model, "B1", "10");
      setCellContent(model, "B2", "20");
      setCellContent(model, "B3", "30");
      setCellContent(model, "C1", "1");
      setCellContent(model, "C2", "2");
      setCellContent(model, "C3", "3");
      const types = suggestionTypes(model, ["A1:A3", "B1:B3", "C1:C3"]);
      expect(types).toEqual(["line", "line", "combo", "bar"]);
    });
  });

  // Pattern O — categorical + categorical + number
  describe("Pattern O — categorical + categorical + number", () => {
    test("two categorical columns + number → sunburst, treemap, grouped bar and stacked bar produced", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "North",
        A3: "South",
        A4: "South",
        B1: "Apples",
        B2: "Pears",
        B3: "Apples",
        B4: "Pears",
        C1: "10",
        C2: "20",
        C3: "30",
        C4: "40",
      });
      const types = suggestionTypes(model, ["A1:A4", "B1:B4", "C1:C4"]);
      expect(types).toEqual(["sunburst", "treemap", "bar", "bar"]);
    });
  });

  // Pattern P — categorical + date + number
  describe("Pattern P — categorical + date + number", () => {
    test("categorical + date + number → line, filled line, bar and stacked bar produced", () => {
      const model = new Model();
      setCellContent(model, "A1", "North");
      setCellContent(model, "A2", "South");
      setCellContent(model, "A3", "North");
      setCellContent(model, "B1", "1/1/2024");
      setCellContent(model, "B2", "1/1/2024");
      setCellContent(model, "B3", "2/1/2024");
      setFormat(model, "B1:B3", "mm/dd/yyyy");
      setCellContent(model, "C1", "10");
      setCellContent(model, "C2", "20");
      setCellContent(model, "C3", "30");
      const types = suggestionTypes(model, ["A1:A3", "B1:B3", "C1:C3"]);
      expect(types).toEqual(["line", "line", "bar", "bar"]);
    });

    test("no category header, number column has a header → title uses the category's first value", () => {
      const model = new Model();
      setCellContent(model, "A1", "Direction");
      setCellContent(model, "A2", "South");
      setCellContent(model, "A3", "North");
      setCellContent(model, "A4", "South");
      setCellContent(model, "A5", "South");
      setCellContent(model, "B1", "1/1/2024");
      setCellContent(model, "B2", "1/1/2024");
      setCellContent(model, "B3", "2/1/2024");
      setCellContent(model, "B4", "3/1/2024");
      setFormat(model, "B1:B4", "mm/dd/yyyy");
      setCellContent(model, "C1", "Sales");
      setCellContent(model, "C2", "10");
      setCellContent(model, "C3", "20");
      setCellContent(model, "C4", "30");
      const defs = suggestions(model, ["A1:A5", "B1:B4", "C1:C4"]).map((s) => s.definition);
      expect(defs[0].title.text).toBe("Sales by Direction over Time");
    });
  });

  // Pattern Q — label + multiple numbers
  describe("Pattern Q — label + multiple numbers", () => {
    test("label + 2 numbers, 3 rows → radar and scatter produced, no bubble", () => {
      const model = createModelFromGrid({
        A1: "Alice",
        A2: "Bob",
        A3: "Charlie",
        B1: "10",
        B2: "20",
        B3: "30",
        C1: "1",
        C2: "2",
        C3: "3",
      });
      const types = suggestionTypes(model, ["A1:A3", "B1:B3", "C1:C3"]);
      expect(types).toContain("radar");
      expect(types).toContain("scatter");
      expect(types).not.toContain("bubble");
    });

    test("label + 3 numbers → bubble produced, no scatter", () => {
      const model = createModelFromGrid({
        A1: "Alice",
        A2: "Bob",
        A3: "Charlie",
        B1: "10",
        B2: "20",
        B3: "30",
        C1: "1",
        C2: "2",
        C3: "3",
        D1: "5",
        D2: "8",
        D3: "3",
      });
      const types = suggestionTypes(model, ["A1:A3", "B1:B3", "C1:C3", "D1:D3"]);
      expect(types).toContain("bubble");
      expect(types).not.toContain("scatter");
    });
  });

  // Pattern R — categorical + two numbers (population pyramid heuristic)
  describe("Pattern R — categorical + two numbers", () => {
    test("pyramid-keyword headers on the number columns → pyramid chart produced, no stacked bar", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "North",
        A3: "South",
        A4: "South",
        B1: "Male",
        B2: "10",
        B3: "20",
        B4: "15",
        C1: "Female",
        C2: "12",
        C3: "18",
        C4: "20",
      });
      const defs = suggestions(model, ["A1:A4", "B1:B4", "C1:C4"]).map((s) => s.definition);
      expect(defs.some((d) => d.type === "pyramid")).toBe(true);
      expect(defs.some((d) => d.type === "bar" && (d as any).stacked)).toBe(false);
      expect(defs[0].title.text).toBe("Male vs Female by North");
    });

    test("no headers at all → no title", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "North",
        A3: "South",
        A4: "South",
        B1: "10",
        B2: "20",
        B3: "15",
        B4: "5",
        C1: "12",
        C2: "18",
        C3: "20",
        C4: "8",
      });
      const defs = suggestions(model, ["A1:A4", "B1:B4", "C1:C4"]).map((s) => s.definition);
      expect(defs[0].title.text).toBe("");
    });

    test("non-pyramid headers → no pyramid chart, stacked bar produced instead", () => {
      const model = createModelFromGrid({
        A1: "North",
        A2: "North",
        A3: "South",
        A4: "South",
        B1: "Q1",
        B2: "10",
        B3: "20",
        B4: "15",
        C1: "Q2",
        C2: "12",
        C3: "18",
        C4: "20",
      });
      const defs = suggestions(model, ["A1:A4", "B1:B4", "C1:C4"]).map((s) => s.definition);
      expect(defs.some((d) => d.type === "pyramid")).toBe(false);
      expect(defs.some((d) => d.type === "bar" && (d as any).stacked)).toBe(true);
    });
  });

  // Pattern S — 3+ all-numeric columns
  describe("Pattern S — many number columns", () => {
    test("3 numeric columns → grouped bar has one dataset per column", () => {
      const model = createModelFromGrid({ A1: "1", B1: "2", C1: "3" });
      const runtime = runtimeFor(
        model,
        ["A1", "B1", "C1"],
        (d) => d.type === "bar" && !d.stacked
      ) as any;
      expect(runtime.chartJsConfig.type).toBe("bar");
      expect(runtime.chartJsConfig.data.datasets).toHaveLength(3);
    });

    test("3 single-cell numeric columns → gauge uses first as min, second as max, third as value", () => {
      const model = createModelFromGrid({ A1: "0", B1: "100", C1: "50" });
      const runtime = runtimeFor(
        model,
        ["A1", "B1", "C1"],
        (d) => d.type === "gauge"
      ) as GaugeChartRuntime;
      expect(runtime.minValue).toMatchObject({ value: 0 });
      expect(runtime.maxValue).toMatchObject({ value: 100 });
      expect(runtime.gaugeValue).toMatchObject({ value: 50 });
    });
  });
});
