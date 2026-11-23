import { Model } from "../../src";
import { DataAnalysisPlugin } from "../../src/components/side_panel/data_analysis/data_analysis_store";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import { StatValue } from "../../src/helpers/data_statistics/statistics_items";
import { buildOccurrencesItems } from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import {
  setCellContent,
  setFormat,
  setSelection,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";

function occurrences(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  return buildOccurrencesItems(model.getters, cols[0], sheetId);
}

function createDataAnalysisPlugin(model: Model) {
  return makeOwlPluginManager([DataAnalysisPlugin], { model }).getPlugin(DataAnalysisPlugin);
}

function getNames(items: StatValue[]): string[] {
  return items.map((item) => item.name);
}

describe("data analysis plugin", () => {
  test("generalStatItems is recomputed when the content of a cell changes", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
      A4: "apple",
      A5: "apple",
    });
    const plugin = createDataAnalysisPlugin(model);
    setSelection(model, ["A1:A5"]);
    expect(plugin.generalStatItems().find((item) => item.id === "unique")).toMatchObject({
      value: "2",
    });
    setCellContent(model, "A3", "cherry");
    expect(plugin.generalStatItems().find((item) => item.id === "unique")).toMatchObject({
      value: "3",
    });
  });

  test("generalStatItems is recomputed when the selection changes", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "apple", A3: "banana" });
    const plugin = createDataAnalysisPlugin(model);
    setSelection(model, ["A1:A3"]);
    expect(plugin.generalStatItems().find((item) => item.id === "unique")).toMatchObject({
      value: "2",
    });
    setSelection(model, ["A1:A2"]);
    expect(plugin.generalStatItems().find((item) => item.id === "unique")).toMatchObject({
      value: "1",
    });
  });

  test("generalStatItems and occurrencesItems are empty when the selection has no data", () => {
    const model = createModelFromGrid({});
    const plugin = createDataAnalysisPlugin(model);
    setSelection(model, ["A1:A3"]);
    expect(plugin.hasData()).toBe(false);
    expect(plugin.generalStatItems()).toEqual([]);
    expect(plugin.occurrencesItems()).toEqual([]);
  });

  test("generalStatItems and occurrencesItems are empty when several columns are selected", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", B1: "1", B2: "2" });
    const plugin = createDataAnalysisPlugin(model);
    setSelection(model, ["A1:B2"]);
    expect(plugin.generalStatItems()).toEqual([]);
    expect(plugin.occurrencesItems()).toEqual([]);
  });
});

function setupDataAnalysis(grid: Record<string, string>, selection: string) {
  const model = createModelFromGrid(grid);
  const plugin = createDataAnalysisPlugin(model);
  setSelection(model, [selection]);
  return { model, plugin };
}

describe("data analysis plugin occurrences", () => {
  const grid = {
    A1: "banana",
    A2: "cherry",
    A3: "cherry",
    A4: "apple",
    A5: "apple",
    A6: "apple",
    A7: '=""',
  };

  test("general statistics", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A7");
    expect(plugin.generalStatItems()).toMatchObject([
      {
        formula: '=COUNTIF(Sheet1!A1:A7,"<>")',
        id: "non_empty",
        name: "Non-empty cells",
        value: "6",
      },
      { formula: "=COUNTUNIQUE(Sheet1!A1:A7)", id: "unique", name: "Unique values", value: "3" },
      { formula: "", id: "sum", name: "Sum", value: "—" },
      { formula: "", id: "median", name: "Median", value: "—" },
      { formula: "", id: "average", name: "Average", value: "—" },
      { formula: "", id: "min", name: "Minimum value", value: "—" },
      { formula: "", id: "max", name: "Maximum value", value: "—" },
    ]);
  });

  test("occurrences are sorted by descending count by default", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A6");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["apple", "cherry", "banana"]);
  });

  test("sorting by count cycles between ascending, apparition order and descending", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A6");
    plugin.toggleOccurrencesSort("value");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["banana", "cherry", "apple"]);
    expect(plugin.occurrencesSortType()).toEqual({ sortOn: "value", order: "none" });
    plugin.toggleOccurrencesSort("value");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["banana", "cherry", "apple"]);
    expect(plugin.occurrencesSortType()).toEqual({ sortOn: "value", order: "asc" });
    plugin.toggleOccurrencesSort("value");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["apple", "cherry", "banana"]);
    expect(plugin.occurrencesSortType()).toEqual({ sortOn: "value", order: "desc" });
  });

  test("sorting by name cycles between alphabetical, reverse alphabetical and apparition order", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A6");
    plugin.toggleOccurrencesSort("name");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["apple", "banana", "cherry"]);
    plugin.toggleOccurrencesSort("name");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["cherry", "banana", "apple"]);
    plugin.toggleOccurrencesSort("name");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["banana", "cherry", "apple"]);
  });

  test("sorting by name use the same order as grid sorting", () => {
    const { plugin } = setupDataAnalysis(
      { A1: "10", A2: "banana", A3: "9", A4: "-5", A5: "1.5", A6: "Apple", A7: "1.25" },
      "A1:A7"
    );
    plugin.toggleOccurrencesSort("name");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual([
      "-5",
      "1.25",
      "1.5",
      "9",
      "10",
      "Apple",
      "banana",
    ]);
    plugin.toggleOccurrencesSort("name");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual([
      "banana",
      "Apple",
      "10",
      "9",
      "1.5",
      "1.25",
      "-5",
    ]);
  });

  test("occurrences with the same count are sorted by apparition order", () => {
    const { plugin } = setupDataAnalysis({ A1: "cherry", A2: "apple", A3: "banana" }, "A1:A3");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["cherry", "apple", "banana"]);
  });

  test("the sort is kept when the data changes", () => {
    const { model, plugin } = setupDataAnalysis(grid, "A1:A6");
    plugin.toggleOccurrencesSort("name");
    setCellContent(model, "A1", "date");
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["apple", "cherry", "date"]);
    setSelection(model, ["A1:A3"]);
    expect(getNames(plugin.displayedOccurrencesItems())).toEqual(["cherry", "date"]);
  });

  test("occurrences are displayed by pages of 50", () => {
    const grid: Record<string, string> = {};
    for (let i = 1; i <= 80; i++) {
      grid[`A${i}`] = `value${i}`;
    }
    const { plugin } = setupDataAnalysis(grid, "A1:A80");
    expect(plugin.displayedOccurrencesItems()).toHaveLength(50);
    expect(plugin.hasMoreOccurrences()).toBe(true);
    plugin.loadMoreOccurrences();
    expect(plugin.displayedOccurrencesItems()).toHaveLength(80);
    expect(plugin.hasMoreOccurrences()).toBe(false);
  });

  test("percentage of the total count are computed in each item", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A7");
    expect(plugin.displayedOccurrencesItems()).toMatchObject([
      { name: "apple", percentage: "(50%)" },
      { name: "cherry", percentage: "(33%)" },
      { name: "banana", percentage: "(17%)" },
    ]);
  });

  test("percentages are computed for boolean data", () => {
    const { plugin } = setupDataAnalysis(
      { A1: "TRUE", A2: "FALSE", A3: "TRUE", A4: "TRUE" },
      "A1:A4"
    );
    expect(plugin.occurrencesItems()).toMatchObject([
      { id: "true", percentage: "(75%)" },
      { id: "false", percentage: "(25%)" },
    ]);
  });
});

describe("data analysis for date", () => {
  const grid = {
    A1: "2023-01-15",
    A2: "2023-03-10",
    A3: "2023-03-20",
    A4: "2024-11-05",
    A5: '=""',
  };

  test("general statistics", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A5");
    expect(plugin.generalStatItems()).toMatchObject([
      {
        formula: '=COUNTIF(Sheet1!A1:A5,"<>")',
        id: "non_empty",
        name: "Non-empty cells",
        value: "4",
      },
      { formula: "=COUNTUNIQUE(Sheet1!A1:A5)", id: "unique", name: "Unique values", value: "4" },
      { formula: "", id: "sum", name: "Sum", value: "—" },
      { formula: "=MEDIAN(Sheet1!A1:A5)", id: "median", name: "Median", value: "2023-03-15" },
      { formula: "=AVERAGE(Sheet1!A1:A5)", id: "average", name: "Average", value: "2023-07-28" },
      { formula: "=MIN(Sheet1!A1:A5)", id: "min", name: "Earliest date", value: "2023-01-15" },
      { formula: "=MAX(Sheet1!A1:A5)", id: "max", name: "Latest date", value: "2024-11-05" },
    ]);
  });

  test("date occurrences are displayed by month in chronological order by default", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A5");
    expect(plugin.dateGranularity()).toBe("month");
    expect(plugin.displayedDateItems().map((item) => item.id)).toEqual([
      "m0",
      "m1",
      "m2",
      "m3",
      "m4",
      "m5",
      "m6",
      "m7",
      "m8",
      "m9",
      "m10",
      "m11",
    ]);
  });

  test("date granularity can be changed", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    plugin.setDateGranularity("year");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "2023", value: "3" },
      { id: "2024", value: "1" },
    ]);
    plugin.setDateGranularity("weekday");
    expect(plugin.displayedDateItems().map((item) => item.id)).toEqual([
      "d0",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
    ]);
  });

  test("date granularity adapt to local", () => {
    const { model, plugin } = setupDataAnalysis(grid, "A1:A4");
    updateLocale(model, FR_LOCALE);
    plugin.setDateGranularity("weekday");
    expect(plugin.displayedDateItems().map((item) => item.id)).toEqual([
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
      "d0",
    ]);
  });

  test("date sort cycles between descending, ascending and chronological order", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    plugin.setDateGranularity("year");
    plugin.toggleDateSort();
    expect(plugin.dateOccurenceSortType()).toBe("asc");
    expect(getNames(plugin.displayedDateItems())).toEqual(["2024", "2023"]);
    plugin.toggleDateSort();
    expect(plugin.dateOccurenceSortType()).toBe("desc");
    expect(getNames(plugin.displayedDateItems())).toEqual(["2023", "2024"]);
    plugin.toggleDateSort();
    expect(plugin.dateOccurenceSortType()).toBe("chrono");
    expect(getNames(plugin.displayedDateItems())).toEqual(["2023", "2024"]);
  });

  test("months are back in chronological order after cycling through the sorts", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    const chronologicalIds = plugin.displayedDateItems().map((item) => item.id);
    plugin.toggleDateSort();
    plugin.toggleDateSort();
    plugin.toggleDateSort();
    expect(plugin.displayedDateItems().map((item) => item.id)).toEqual(chronologicalIds);
  });

  test("the date sort and granularity are kept when the data changes", () => {
    const { model, plugin } = setupDataAnalysis(grid, "A1:A4");
    plugin.setDateGranularity("year");
    plugin.toggleDateSort();
    setCellContent(model, "A1", "2024-01-15");
    setCellContent(model, "A2", "2024-03-10");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "2023", value: "1" },
      { id: "2024", value: "3" },
    ]);
  });

  test("date occurrences by quarter", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    plugin.setDateGranularity("quarter");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "q1", name: "Quarter 1", value: "3" },
      { id: "q2", name: "Quarter 2", value: "0" },
      { id: "q3", name: "Quarter 3", value: "0" },
      { id: "q4", name: "Quarter 4", value: "1" },
    ]);
  });

  test("date occurrences by week only show non-empty weeks", () => {
    const { plugin } = setupDataAnalysis(
      { A1: "2023-01-02", A2: "2023-01-03", A3: "2023-01-17" },
      "A1:A3"
    );
    plugin.setDateGranularity("week");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "1", name: "W1", value: "2" },
      { id: "3", name: "W3", value: "1" },
    ]);
  });

  test("date occurrences by week across two years", () => {
    const { plugin } = setupDataAnalysis({ A1: "2023-12-28", A2: "2024-01-03" }, "A1:A2");
    plugin.setDateGranularity("week");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "1", name: "W1", value: "1" },
      { id: "52", name: "W52", value: "1" },
    ]);
  });

  test("date occurrences by day of month", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    plugin.setDateGranularity("day");
    const items = plugin.displayedDateItems();
    expect(items.map((item) => item.id)).toEqual(
      Array.from({ length: 31 }, (_, i) => `dom${i + 1}`)
    );
    expect(items.find((item) => item.id === "dom15")).toMatchObject({ name: "15", value: "1" });
    expect(items.find((item) => item.id === "dom10")).toMatchObject({ name: "10", value: "1" });
    expect(items.find((item) => item.id === "dom1")).toMatchObject({ value: "0" });
  });

  test("date occurrences by date are formatted, counted and in chronological order", () => {
    const { plugin } = setupDataAnalysis(
      { A1: "2023-03-10", A2: "2023-01-15", A3: "2023-03-10", A4: "2023-01-15 10:00" },
      "A1:A4"
    );
    plugin.setDateGranularity("date");
    expect(plugin.displayedDateItems()).toMatchObject([
      { name: "2023-01-15", value: "2", percentage: "(50%)" },
      { name: "2023-03-10", value: "2", percentage: "(50%)" },
    ]);
  });

  test("date occurrences by date are named with the formatted value of the cells", () => {
    const model = createModelFromGrid({ A1: "2023-03-10", A2: "2023-01-15" });
    setFormat(model, "A1:A2", "dddd d mmmm yyyy");
    const plugin = createDataAnalysisPlugin(model);
    setSelection(model, ["A1:A2"]);
    plugin.setDateGranularity("date");
    expect(getNames(plugin.displayedDateItems())).toEqual([
      "Sunday 15 January 2023",
      "Friday 10 March 2023",
    ]);
  });

  test("date percentages are computed on the total number of dates for every granularity", () => {
    const { plugin } = setupDataAnalysis(grid, "A1:A4");
    expect(plugin.displayedDateItems().find((item) => item.id === "m2")).toMatchObject({
      value: "2",
      percentage: "(50%)",
    });
    plugin.setDateGranularity("year");
    expect(plugin.displayedDateItems()).toMatchObject([
      { id: "2023", percentage: "(75%)" },
      { id: "2024", percentage: "(25%)" },
    ]);
  });

  test("quarter formula does not count blank cells", () => {
    const { model, plugin } = setupDataAnalysis({ A1: "2023-01-15", A2: "2023-03-10" }, "A1:A5");
    plugin.setDateGranularity("quarter");
    const q4 = plugin.displayedDateItems().find((item) => item.id === "q4")!;
    expect(q4.value).toBe("0");
    setCellContent(model, "B1", q4.formula);
    expect(getEvaluatedCell(model, "B1").value).toBe(0);
  });

  test("week formula does not count blank cells", () => {
    const { model, plugin } = setupDataAnalysis({ A1: "2024-12-25", A3: "2024-01-15" }, "A1:A3");
    plugin.setDateGranularity("week");
    const w52 = plugin.displayedDateItems().find((item) => item.name === "W52")!;
    expect(w52.value).toBe("1");
    setCellContent(model, "B1", w52.formula);
    expect(getEvaluatedCell(model, "B1").value).toBe(1);
  });
});

describe("buildOccurrencesItems", () => {
  test("counts occurrences for a single categorical column", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const items = occurrences(model, "A1:A3");
    expect(items).toMatchObject([
      { name: "apple", value: "2", formula: '=COUNTIF(Sheet1!A1:A3,"apple")' },
      { name: "banana", value: "1", formula: '=COUNTIF(Sheet1!A1:A3,"banana")' },
    ]);
  });

  test("categories are stocked by apparition order", () => {
    const model = createModelFromGrid({
      A1: "banana",
      A2: "cherry",
      A3: "cherry",
      A4: "apple",
      A5: "cherry",
    });
    const items = occurrences(model, "A1:A5");
    expect(items.map((item) => item.name)).toEqual(["banana", "cherry", "apple"]);
  });

  test("occurrences are case-insensitive", () => {
    const model = createModelFromGrid({
      A1: "Apple",
      A2: "apple",
      A3: "APPLE",
      A4: "banana",
      A5: "Banana",
    });
    const items = occurrences(model, "A1:A5");
    expect(items).toMatchObject([
      { name: "Apple", value: "3", formula: '=COUNTIF(Sheet1!A1:A5,"Apple")' },
      { name: "banana", value: "2", formula: '=COUNTIF(Sheet1!A1:A5,"banana")' },
    ]);
  });

  test("occurrences use the formatted value", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2" });
    setFormat(model, "A1:A2", "%0.00");
    const items = occurrences(model, "A1:A2");
    expect(items).toMatchObject([
      { name: "%100.00", value: "1", formula: "=COUNTIF(Sheet1!A1:A2,1)" },
      { name: "%200.00", value: "1", formula: "=COUNTIF(Sheet1!A1:A2,2)" },
    ]);
  });

  test("occurrence formula of a boolean counts the boolean values", () => {
    const model = createModelFromGrid({ A1: "TRUE", A2: "apple", A3: "TRUE", A4: "FALSE" });
    const items = occurrences(model, "A1:A4");
    expect(items).toMatchObject([
      {
        name: "TRUE",
        value: "2",
        formula:
          '=COUNTIF(Sheet1!A1:A4,TRUE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="TRUE"))',
      },
      { name: "apple", value: "1", formula: '=COUNTIF(Sheet1!A1:A4,"apple")' },
      {
        name: "FALSE",
        value: "1",
        formula:
          '=COUNTIF(Sheet1!A1:A4,FALSE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="FALSE"))',
      },
    ]);
    setCellContent(model, "B1", items[0].formula);
    setCellContent(model, "B2", items[2].formula);
    expect(getEvaluatedCell(model, "B1").value).toBe(2);
    expect(getEvaluatedCell(model, "B2").value).toBe(1);
  });

  test("boolean occurrences count both boolean and string values", () => {
    const model = createModelFromGrid({ A1: "TRUE", A2: '="TRUE"', A3: "TRUE", A4: "FALSE" });
    const expectedResult = [
      {
        name: "TRUE",
        value: "3",
        formula:
          '=COUNTIF(Sheet1!A1:A4,TRUE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="TRUE"))',
      },
      {
        name: "FALSE",
        value: "1",
        formula:
          '=COUNTIF(Sheet1!A1:A4,FALSE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="FALSE"))',
      },
    ];
    expect(occurrences(model, "A1:A4")).toMatchObject(expectedResult);
  });

  test('empty cells are not counted as the text "null"', () => {
    const model = createModelFromGrid({ A1: "null", A4: "x", A5: "null" });
    const items = occurrences(model, "A1:A5");
    expect(items).toMatchObject([
      { name: "null", value: "2", percentage: "(67%)" },
      { name: "x", value: "1", percentage: "(33%)" },
    ]);
  });
});
