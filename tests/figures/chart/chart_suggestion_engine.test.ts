import { Model } from "../../../src";
import { getSuggestedCharts } from "../../../src/helpers/figures/charts/chart_suggestion_engine";
import { toZone } from "../../../src/helpers/zones";
import { SuggestedChart } from "../../../src/types/chart/chart";
import { GaugeChartDefinition } from "../../../src/types/chart/gauge_chart";
import { ScorecardChartDefinition } from "../../../src/types/chart/scorecard_chart";
import { Zone } from "../../../src/types/misc";
import { setCellContent, setFormat, setSelection } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

function suggestionsForSelection(model: Model, xc: string): SuggestedChart[] {
  setSelection(model, [xc]);
  const zones = model.getters.getSelectedZones();
  return getSuggestedCharts(zones, model.getters);
}

function suggestionsForZone(model: Model, zone: Zone): SuggestedChart[] {
  return getSuggestedCharts([zone], model.getters);
}

describe("getSuggestedCharts — single column", () => {
  test("single number column → scorecard first, then gauge, line, bar, area", () => {
    const model = createModelFromGrid({ A1: "10", A2: "20", A3: "30" });
    const suggestions = suggestionsForSelection(model, "A1:A3");
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions[0].definition.type).toBe("scorecard");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("gauge");
    expect(types).toContain("line");
    expect(types).toContain("bar");
  });

  test("single number column with only one row → no scorecard (needs baseline)", () => {
    const model = createModelFromGrid({ A1: "42" });
    const suggestions = suggestionsForSelection(model, "A1");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("scorecard");
    expect(types).toContain("line");
  });

  test("single percentage column → scorecard first, gauge, bar and pie/doughnut", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.5");
    setCellContent(model, "A2", "0.75");
    setCellContent(model, "A3", "0.9");
    setFormat(model, "A1:A3", "0%");
    const suggestions = suggestionsForSelection(model, "A1:A3");
    expect(suggestions[0].definition.type).toBe("scorecard");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("gauge");
    expect(types).toContain("bar");
    expect(types).toContain("pie");
  });

  test("single percentage column without format (value range 0-1) → classified as percentage", () => {
    const model = createModelFromGrid({ A1: "0.5", A2: "0.75", A3: "0.9" });
    const suggestions = suggestionsForSelection(model, "A1:A3");
    // Should have gauge (indicating percentage was detected)
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("gauge");
    expect(types).toContain("bar");
    // Should have pie (doughnut for percentage pattern)
    expect(types).toContain("pie");
  });

  test("single date column → line and bar", () => {
    const model = new Model();
    setCellContent(model, "A1", "01/01/2024");
    setCellContent(model, "A2", "01/02/2024");
    setCellContent(model, "A3", "01/03/2024");
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("line");
    expect(types).toContain("bar");
  });

  test("single categorical column → pie, doughnut, bar, funnel, treemap", () => {
    // 2 unique values in 6 rows → uniqueRatio = 0.33 < 0.5 → categorical
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
    });
    const suggestions = suggestionsForSelection(model, "A1:A6");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("pie");
    expect(types).toContain("bar");
    expect(types).toContain("treemap");
    expect(types).toContain("funnel");
    // doughnut is a pie with isDoughnut
    const doughnut = suggestions.find(
      (s) => s.definition.type === "pie" && (s.definition as { isDoughnut?: boolean }).isDoughnut
    );
    expect(doughnut).toBeDefined();
  });

  test("single categorical column with > 8 unique values → no pie", () => {
    // 10 unique values repeated 3 times = 30 rows → uniqueRatio = 10/30 ≈ 0.33 < 0.5 → categorical
    // uniqueCount = 10 > 8 → pie suppressed
    const values: Record<string, string> = {};
    const cats = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    for (let i = 0; i < 30; i++) {
      values[`A${i + 1}`] = cats[i % 10];
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:A30");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("pie");
    expect(types).toContain("bar");
  });

  test("single categorical column with > 10 rows → no funnel", () => {
    // 2 unique values in 12 rows → categorical, but rowCount=12 > 10
    const values: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      values[`A${i}`] = i % 2 === 0 ? "North" : "South";
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:A12");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("funnel");
    expect(types).toContain("bar");
  });

  test("single hierarchy column → sunburst and treemap", () => {
    const model = createModelFromGrid({
      A1: "Europe > France",
      A2: "Europe > Germany",
      A3: "Europe > France > Paris",
      A4: "Asia > Japan",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("sunburst");
    expect(types).toContain("treemap");
    expect(types).not.toContain("bar");
  });

  test("hierarchy using backslash separator → sunburst and treemap", () => {
    const model = createModelFromGrid({
      A1: "Electronics\\Phones",
      A2: "Electronics\\Laptops",
      A3: "Electronics\\Phones\\Smartphones",
      A4: "Furniture\\Chairs",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("sunburst");
    expect(types).toContain("treemap");
  });

  test("single label column (all unique text) → no suggestions", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      A4: "Diana",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    expect(suggestions).toHaveLength(0);
  });

  test("boolean column → treated as categorical (pie and bar)", () => {
    const model = new Model();
    setCellContent(model, "A1", "=TRUE()");
    setCellContent(model, "A2", "=FALSE()");
    setCellContent(model, "A3", "=TRUE()");
    setCellContent(model, "A4", "=FALSE()");
    const suggestions = suggestionsForSelection(model, "A1:A4");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
  });
});

describe("getSuggestedCharts — two columns", () => {
  test("categorical + number → bar, horizontal bar, pie, treemap", () => {
    // 2 unique values in 6 rows → uniqueRatio = 0.33 < 0.5 → categorical
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
      B1: "10",
      B2: "20",
      B3: "30",
      B4: "15",
      B5: "25",
      B6: "35",
    });
    const suggestions = suggestionsForSelection(model, "A1:B6");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("pie");
    expect(types).toContain("treemap");
    // The bar chart datasource should use column A as label and column B as data
    const barSuggestion = suggestions.find(
      (s) => s.definition.type === "bar" && s.definition.dataSource?.type === "range"
    )!;
    expect(barSuggestion).toBeDefined();
    const ds = barSuggestion.definition.dataSource as { labelRange?: string };
    expect(ds.labelRange).toContain("A");
    // Categorical columns with repeated values must aggregate so each category appears once
    expect(barSuggestion.definition).toMatchObject({ aggregated: true });
    const pieSuggestion = suggestions.find((s) => s.definition.type === "pie")!;
    expect(pieSuggestion.definition).toMatchObject({ aggregated: true });
  });

  test("categorical + number → funnel included (rowCount ≤ 10)", () => {
    // 2 unique values in 6 rows → rowCount = 6 ≤ 10 → funnel included
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
      B1: "10",
      B2: "20",
      B3: "30",
      B4: "15",
      B5: "25",
      B6: "35",
    });
    const suggestions = suggestionsForSelection(model, "A1:B6");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("funnel");
  });

  test("categorical + number → no funnel when rowCount > 10", () => {
    const values: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      values[`A${i}`] = i % 2 === 0 ? "North" : "South";
      values[`B${i}`] = String(i * 10);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:B12");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("funnel");
  });

  test("categorical + number → no pie when > 8 unique categories", () => {
    // 9 unique categories in 20 rows → uniqueRatio = 9/20 = 0.45 < 0.5 → categorical
    // uniqueCount = 9 > 8 → pie suppressed
    const values: Record<string, string> = {};
    const cats = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    for (let i = 0; i < 20; i++) {
      values[`A${i + 1}`] = cats[i % 9];
      values[`B${i + 1}`] = String((i + 1) * 10);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:B20");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("pie");
    expect(types).toContain("bar");
  });

  test("date + number → line first, then area and bar", () => {
    const model = new Model();
    setCellContent(model, "A1", "01/01/2024");
    setCellContent(model, "A2", "01/02/2024");
    setCellContent(model, "A3", "01/03/2024");
    setCellContent(model, "B1", "100");
    setCellContent(model, "B2", "200");
    setCellContent(model, "B3", "150");
    const suggestions = suggestionsForSelection(model, "A1:B3");
    expect(suggestions[0].definition.type).toBe("line");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
  });

  test("date + number with many rows → includes calendar heatmap", () => {
    const model = new Model();
    for (let i = 1; i <= 10; i++) {
      setCellContent(model, `A${i}`, `01/0${i}/2024`);
      setCellContent(model, `B${i}`, String(i * 10));
    }
    const suggestions = suggestionsForSelection(model, "A1:B10");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("calendar");
  });

  test("number + number → scatter first, then bar, combo, stacked area, radar", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      B1: "10",
      B2: "20",
      B3: "30",
    });
    const suggestions = suggestionsForSelection(model, "A1:B3");
    expect(suggestions[0].definition.type).toBe("scatter");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("combo");
    expect(types).toContain("radar");
  });

  test("number + number with > 12 rows → no radar", () => {
    const values: Record<string, string> = {};
    for (let i = 1; i <= 13; i++) {
      values[`A${i}`] = String(i);
      values[`B${i}`] = String(i * 10);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:B13");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("radar");
  });

  test("categorical + percentage → horizontal bar first, with radar", () => {
    const model = new Model();
    // 2 unique values in 6 rows → categorical
    setCellContent(model, "A1", "North");
    setCellContent(model, "A2", "South");
    setCellContent(model, "A3", "North");
    setCellContent(model, "A4", "South");
    setCellContent(model, "A5", "North");
    setCellContent(model, "A6", "South");
    setCellContent(model, "B1", "0.5");
    setCellContent(model, "B2", "0.75");
    setCellContent(model, "B3", "0.9");
    setCellContent(model, "B4", "0.3");
    setCellContent(model, "B5", "0.6");
    setCellContent(model, "B6", "0.8");
    setFormat(model, "B1:B6", "0%");
    const suggestions = suggestionsForSelection(model, "A1:B6");
    expect(suggestions[0].definition.type).toBe("bar");
    const barDef = suggestions[0].definition as { horizontal?: boolean };
    expect(barDef.horizontal).toBe(true);
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("radar");
  });

  test("label + number → horizontal bar first, with radar", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      A4: "Diana",
      B1: "100",
      B2: "200",
      B3: "150",
      B4: "300",
    });
    const suggestions = suggestionsForSelection(model, "A1:B4");
    expect(suggestions[0].definition.type).toBe("bar");
    const barDef = suggestions[0].definition as { horizontal?: boolean };
    expect(barDef.horizontal).toBe(true);
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("radar");
  });

  test("label + number with > 12 rows → no radar", () => {
    const values: Record<string, string> = {};
    for (let i = 1; i <= 13; i++) {
      values[`A${i}`] = `Person${i}`;
      values[`B${i}`] = String(i * 10);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:B13");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("radar");
    expect(types).toContain("bar");
  });

  test("categorical + categorical → sunburst first", () => {
    // Both columns need uniqueRatio < 0.5; use 2 unique values each
    const model = createModelFromGrid({
      A1: "Europe",
      A2: "Europe",
      A3: "Asia",
      A4: "Europe",
      A5: "Asia",
      A6: "Asia",
      B1: "France",
      B2: "France",
      B3: "Japan",
      B4: "France",
      B5: "Japan",
      B6: "Japan",
    });
    const suggestions = suggestionsForSelection(model, "A1:B6");
    expect(suggestions[0].definition.type).toBe("sunburst");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("treemap");
    expect(types).toContain("bar");
  });

  test("hierarchy + number → sunburst first, with leaf and top-level bar suggestions", () => {
    const model = createModelFromGrid({
      A1: "Europe > France",
      A2: "Europe > Germany",
      A3: "Europe > France > Paris",
      A4: "Asia > Japan",
      B1: "100",
      B2: "200",
      B3: "150",
      B4: "300",
    });
    const suggestions = suggestionsForSelection(model, "A1:B4");
    expect(suggestions[0].definition.type).toBe("sunburst");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("treemap");
    expect(types).toContain("bar");
    // Two bar suggestions: leaf-level and top-level
    const barSuggestions = suggestions.filter((s) => s.definition.type === "bar");
    expect(barSuggestions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getSuggestedCharts — three or more columns", () => {
  test("categorical + number + number → grouped bar, stacked bar, line, stacked area, radar", () => {
    // 2 unique values in 6 rows → categorical
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
      B1: "10",
      B2: "20",
      B3: "30",
      B4: "15",
      B5: "25",
      B6: "35",
      C1: "5",
      C2: "8",
      C3: "12",
      C4: "7",
      C5: "9",
      C6: "14",
    });
    const suggestions = suggestionsForSelection(model, "A1:C6");
    expect(suggestions[0].definition.type).toBe("bar");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("line");
    expect(types).toContain("radar");
    const stackedBar = suggestions.find(
      (s) => s.definition.type === "bar" && (s.definition as { stacked?: boolean }).stacked
    );
    expect(stackedBar).toBeDefined();
    // stacked area
    const stackedArea = suggestions.find(
      (s) =>
        s.definition.type === "line" &&
        (s.definition as { stacked?: boolean; fillArea?: boolean }).stacked &&
        (s.definition as { stacked?: boolean; fillArea?: boolean }).fillArea
    );
    expect(stackedArea).toBeDefined();
  });

  test("categorical + number + number with many rows → no radar", () => {
    const values: Record<string, string> = {};
    const cats = ["A", "B"];
    for (let i = 1; i <= 14; i++) {
      values[`A${i}`] = cats[i % 2];
      values[`B${i}`] = String(i);
      values[`C${i}`] = String(i * 2);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:C14");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("radar");
  });

  test("date + number + number → line first, then stacked area, bar, combo", () => {
    const model = new Model();
    setCellContent(model, "A1", "01/01/2024");
    setCellContent(model, "A2", "01/02/2024");
    setCellContent(model, "A3", "01/03/2024");
    setCellContent(model, "B1", "100");
    setCellContent(model, "B2", "200");
    setCellContent(model, "B3", "150");
    setCellContent(model, "C1", "50");
    setCellContent(model, "C2", "80");
    setCellContent(model, "C3", "60");
    const suggestions = suggestionsForSelection(model, "A1:C3");
    expect(suggestions[0].definition.type).toBe("line");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("combo");
  });

  test("categorical + categorical + number (pattern O) → sunburst first, with stacked bar", () => {
    // Both cat columns need uniqueRatio < 0.5; use 2 unique values each
    const model = createModelFromGrid({
      A1: "Europe",
      A2: "Europe",
      A3: "Asia",
      A4: "Europe",
      A5: "Asia",
      A6: "Asia",
      B1: "France",
      B2: "France",
      B3: "Japan",
      B4: "France",
      B5: "Japan",
      B6: "Japan",
      C1: "100",
      C2: "200",
      C3: "150",
      C4: "300",
      C5: "250",
      C6: "180",
    });
    const suggestions = suggestionsForSelection(model, "A1:C6");
    expect(suggestions[0].definition.type).toBe("sunburst");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("treemap");
    const stackedBar = suggestions.find(
      (s) => s.definition.type === "bar" && (s.definition as { stacked?: boolean }).stacked
    );
    expect(stackedBar).toBeDefined();
  });

  test("multiple number columns → bar and radar (rowCount ≤ 12)", () => {
    const model = createModelFromGrid({
      A1: "10",
      A2: "20",
      A3: "30",
      B1: "15",
      B2: "25",
      B3: "35",
      C1: "5",
      C2: "8",
      C3: "12",
    });
    const suggestions = suggestionsForSelection(model, "A1:C3");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("radar");
  });

  test("multiple number columns with > 12 rows → no radar", () => {
    const values: Record<string, string> = {};
    for (let i = 1; i <= 13; i++) {
      values[`A${i}`] = String(i);
      values[`B${i}`] = String(i * 2);
      values[`C${i}`] = String(i * 3);
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:C13");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("radar");
  });

  test("pattern P: categorical + date + number → line and bar suggestions", () => {
    const model = new Model();
    // 2 unique values in 6 rows → categorical
    setCellContent(model, "A1", "North");
    setCellContent(model, "A2", "South");
    setCellContent(model, "A3", "North");
    setCellContent(model, "A4", "South");
    setCellContent(model, "A5", "North");
    setCellContent(model, "A6", "South");
    setCellContent(model, "B1", "01/01/2024");
    setCellContent(model, "B2", "01/02/2024");
    setCellContent(model, "B3", "01/03/2024");
    setCellContent(model, "B4", "01/04/2024");
    setCellContent(model, "B5", "01/05/2024");
    setCellContent(model, "B6", "01/06/2024");
    setCellContent(model, "C1", "100");
    setCellContent(model, "C2", "200");
    setCellContent(model, "C3", "150");
    setCellContent(model, "C4", "120");
    setCellContent(model, "C5", "180");
    setCellContent(model, "C6", "90");
    const suggestions = suggestionsForSelection(model, "A1:C6");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("line");
    expect(types).toContain("bar");
  });

  test("pattern Q: label + multiple numbers → radar first, then horizontal bar, bar", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      A4: "Diana",
      B1: "100",
      B2: "200",
      B3: "150",
      B4: "300",
      C1: "80",
      C2: "90",
      C3: "70",
      C4: "110",
    });
    const suggestions = suggestionsForSelection(model, "A1:C4");
    expect(suggestions[0].definition.type).toBe("radar");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
  });

  test("pattern Q: label + exactly 2 numbers → includes scatter", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      B1: "100",
      B2: "200",
      B3: "150",
      C1: "80",
      C2: "90",
      C3: "70",
    });
    const suggestions = suggestionsForSelection(model, "A1:C3");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("scatter");
  });

  test("pattern Q: label + exactly 3 numbers → includes bubble", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      B1: "100",
      B2: "200",
      B3: "150",
      C1: "80",
      C2: "90",
      C3: "70",
      D1: "50",
      D2: "60",
      D3: "40",
    });
    const suggestions = suggestionsForSelection(model, "A1:D3");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bubble");
  });

  test("pattern R: categorical + two numbers with negative values → pyramid first", () => {
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
      B1: "-10",
      B2: "-20",
      B3: "-30",
      B4: "-15",
      B5: "-25",
      B6: "-35",
      C1: "10",
      C2: "20",
      C3: "30",
      C4: "15",
      C5: "25",
      C6: "35",
    });
    const suggestions = suggestionsForSelection(model, "A1:C6");
    expect(suggestions[0].definition.type).toBe("pyramid");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("combo");
  });

  test("pattern R: categorical + two numbers with antonym headers → pyramid first", () => {
    const model = new Model();
    // Headers: Region, Male, Female
    setCellContent(model, "A1", "Region");
    setCellContent(model, "B1", "Male");
    setCellContent(model, "C1", "Female");
    // 2 unique values in 6 data rows → categorical
    for (let i = 1; i <= 6; i++) {
      setCellContent(model, `A${i + 1}`, i % 2 === 0 ? "North" : "South");
      setCellContent(model, `B${i + 1}`, String(i * 10));
      setCellContent(model, `C${i + 1}`, String(i * 12));
    }
    const suggestions = suggestionsForZone(model, toZone("A1:C7"));
    expect(suggestions[0].definition.type).toBe("pyramid");
  });
});

describe("getSuggestedCharts — header handling", () => {
  test("column header is reflected in suggestion title", () => {
    const model = createModelFromGrid({
      A1: "Revenue",
      A2: "100",
      A3: "200",
      A4: "300",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    expect(suggestions.some((s) => s.title.includes("Revenue"))).toBe(true);
  });

  test("categorical + number with headers → titles use header names", () => {
    // A1 is a text header; rows 2-6 have 2 unique values → categorical after stripping header
    const model = createModelFromGrid({
      A1: "Region",
      A2: "North",
      A3: "South",
      A4: "North",
      A5: "South",
      A6: "North",
      B1: "Sales",
      B2: "100",
      B3: "200",
      B4: "150",
      B5: "120",
      B6: "180",
    });
    const suggestions = suggestionsForSelection(model, "A1:B6");
    expect(suggestions.some((s) => s.title.includes("Sales") && s.title.includes("Region"))).toBe(
      true
    );
  });
});

describe("getSuggestedCharts — sunburst suppression (>3 levels or >50 leaves)", () => {
  test("hierarchy column with ≤3 depth levels → sunburst included", () => {
    const model = createModelFromGrid({
      A1: "Europe > France",
      A2: "Europe > Germany",
      A3: "Europe > France > Paris",
      A4: "Asia > Japan",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("sunburst");
  });

  test("hierarchy column with >3 depth levels → no sunburst (suppressed)", () => {
    // 4-level deep hierarchy: depth = 4 > 3
    const model = createModelFromGrid({
      A1: "A > B > C > D",
      A2: "A > B > C > E",
      A3: "A > B > F > G",
      A4: "A > H > I > J",
    });
    const suggestions = suggestionsForSelection(model, "A1:A4");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("sunburst");
    expect(types).not.toContain("treemap");
  });

  test("categorical + categorical with >50 unique leaves → no sunburst", () => {
    // Create 51 unique values in cat1 column
    const values: Record<string, string> = {};
    for (let i = 1; i <= 52; i++) {
      values[`A${i}`] = "Parent";
      values[`B${i}`] = `Child${i}`;
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:B52");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("sunburst");
    expect(types).toContain("bar");
  });
});

describe("getSuggestedCharts — empty / edge cases", () => {
  test("entirely empty selection → fallback bar and line", () => {
    const model = new Model();
    const suggestions = suggestionsForZone(model, toZone("A1:B6"));
    const types = suggestions.map((s) => s.definition.type);
    expect(types).toContain("bar");
    expect(types).toContain("line");
  });

  test("empty columns ignored when other columns have data", () => {
    const model = createModelFromGrid({
      A1: "10",
      A2: "20",
      A3: "30",
      // B column is empty
      C1: "5",
      C2: "8",
      C3: "12",
    });
    // A and C are numbers; empty B is stripped → patternH (number+number)
    const suggestions = suggestionsForZone(model, toZone("A1:C3"));
    expect(suggestions[0].definition.type).toBe("scatter");
  });

  test("single cell with number → no scorecard (needs at least 2 rows)", () => {
    const model = createModelFromGrid({ B3: "42" });
    const suggestions = suggestionsForSelection(model, "B3");
    const types = suggestions.map((s) => s.definition.type);
    expect(types).not.toContain("scorecard");
  });
});

describe("getSuggestedCharts — scorecard cell references", () => {
  test("scorecard keyValue is the last cell, baseline is one above", () => {
    const model = createModelFromGrid({ A1: "100", A2: "200", A3: "300" });
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const scorecard = suggestions.find((s) => s.definition.type === "scorecard")!;
    expect(scorecard).toBeDefined();
    const scorecardDef = scorecard.definition as ScorecardChartDefinition<string>;
    expect(scorecardDef.keyValue).toBe("A3");
    expect(scorecardDef.baseline).toBe("A2");
  });
});

describe("getSuggestedCharts — carousel suggestions", () => {
  test("single number column → includes KPI+Trend carousel (carouselDefinitions has scorecard + line)", () => {
    const model = createModelFromGrid({ A1: "10", A2: "20", A3: "30" });
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    expect(carousel).toBeDefined();
    expect(carousel!.carouselDefinitions!.length).toBeGreaterThanOrEqual(2);
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes).toContain("scorecard");
    expect(carouselTypes).toContain("line");
  });

  test("single percentage column → includes Progress carousel (scorecard + gauge)", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.2");
    setCellContent(model, "A2", "0.75");
    setCellContent(model, "A3", "0.9");
    setFormat(model, "A1:A3", "0%");
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes).toContain("scorecard");
    expect(carouselTypes).toContain("gauge");
  });

  test("date + number → includes KPI+Trend carousel (scorecard + line)", () => {
    const model = new Model();
    for (let i = 1; i <= 5; i++) {
      setCellContent(model, `A${i}`, `01/0${i}/2024`);
      setCellContent(model, `B${i}`, String(i * 10));
    }
    const suggestions = suggestionsForSelection(model, "A1:B5");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes).toContain("scorecard");
    expect(carouselTypes).toContain("line");
  });

  test("date + percentage → includes KPI+Trend carousel (scorecard + line)", () => {
    const model = new Model();
    for (let i = 1; i <= 5; i++) {
      setCellContent(model, `A${i}`, `01/0${i}/2024`);
      setCellContent(model, `B${i}`, String((i * 10) / 100));
    }
    setFormat(model, "B1:B5", "0%");
    const suggestions = suggestionsForSelection(model, "A1:B5");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes).toContain("scorecard");
    expect(carouselTypes).toContain("line");
  });

  test("categorical + multiple numbers → includes Overview carousel (scorecards + grouped bar)", () => {
    const model = createModelFromGrid({
      A1: "North",
      A2: "South",
      A3: "North",
      A4: "South",
      A5: "North",
      A6: "South",
      B1: "10",
      B2: "20",
      B3: "30",
      B4: "15",
      B5: "25",
      B6: "35",
      C1: "5",
      C2: "8",
      C3: "12",
      C4: "7",
      C5: "9",
      C6: "14",
    });
    const suggestions = suggestionsForSelection(model, "A1:C6");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length >= 3
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    // Two scorecards (one per numeric column) + grouped bar
    expect(carouselTypes.filter((t) => t === "scorecard").length).toBeGreaterThanOrEqual(2);
    expect(carouselTypes).toContain("bar");
  });

  test("date + multiple numbers → includes KPI+Trend carousel (scorecards + multi-line)", () => {
    const model = new Model();
    for (let i = 1; i <= 5; i++) {
      setCellContent(model, `A${i}`, `01/0${i}/2024`);
      setCellContent(model, `B${i}`, String(i * 10));
      setCellContent(model, `C${i}`, String(i * 5));
    }
    const suggestions = suggestionsForSelection(model, "A1:C5");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length >= 2
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes).toContain("scorecard");
    expect(carouselTypes).toContain("line");
  });

  test("multiple number columns (pattern S) → KPI Scorecard carousel is first suggestion", () => {
    const model = createModelFromGrid({
      A1: "10",
      A2: "20",
      A3: "30",
      B1: "15",
      B2: "25",
      B3: "35",
      C1: "5",
      C2: "8",
      C3: "12",
    });
    const suggestions = suggestionsForSelection(model, "A1:C3");
    // Pattern S should include a carousel with scorecards + bar
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    expect(carousel).toBeDefined();
    const carouselTypes = carousel!.carouselDefinitions!.map((d) => d.type);
    expect(carouselTypes.filter((t) => t === "scorecard").length).toBeGreaterThanOrEqual(2);
    expect(carouselTypes).toContain("bar");
  });

  test("carousel definition count is at most 8", () => {
    // Pattern M with 6 numeric columns → carousel should have ≤ 6 scorecards + 1 bar = 7 items
    const values: Record<string, string> = {};
    const cats = ["A", "B"];
    for (let i = 1; i <= 6; i++) {
      values[`A${i}`] = cats[i % 2];
      for (let col = 1; col <= 7; col++) {
        values[`${String.fromCharCode(64 + col + 1)}${i}`] = String(i * col);
      }
    }
    const model = createModelFromGrid(values);
    const suggestions = suggestionsForSelection(model, "A1:I6");
    const carousel = suggestions.find(
      (s) => s.carouselDefinitions && s.carouselDefinitions.length > 0
    );
    if (carousel && carousel.carouselDefinitions) {
      expect(carousel.carouselDefinitions.length).toBeLessThanOrEqual(8);
    }
  });
});

describe("getSuggestedCharts — gauge suggestions", () => {
  test("single number column gauge uses column min/max as range", () => {
    const model = createModelFromGrid({ A1: "10", A2: "50", A3: "100" });
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const gauge = suggestions.find((s) => s.definition.type === "gauge")!;
    expect(gauge).toBeDefined();
    const gaugeDef = gauge.definition as GaugeChartDefinition<string>;
    expect(gaugeDef.sectionRule.rangeMin).toBe("10");
    expect(gaugeDef.sectionRule.rangeMax).toBe("100");
    // dataRange should point to the last cell
    expect(gaugeDef.dataRange).toBe("A3");
  });

  test("single percentage column gauge uses 0 and 1 as fixed range", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.2");
    setCellContent(model, "A2", "0.75");
    setCellContent(model, "A3", "0.9");
    setFormat(model, "A1:A3", "0%");
    const suggestions = suggestionsForSelection(model, "A1:A3");
    const gauge = suggestions.find((s) => s.definition.type === "gauge")!;
    expect(gauge).toBeDefined();
    const gaugeDef = gauge.definition as GaugeChartDefinition<string>;
    expect(gaugeDef.sectionRule.rangeMin).toBe("0");
    expect(gaugeDef.sectionRule.rangeMax).toBe("1");
  });
});
