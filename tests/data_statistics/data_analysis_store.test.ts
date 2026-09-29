import { Model } from "../../src";
import { DataAnalysisStore } from "../../src/components/side_panel/data_analysis/data_analysis_store";
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
import { createModelFromGrid } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

function occurrences(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  return buildOccurrencesItems(model.getters, cols[0], sheetId);
}

function getNames(items: StatValue[]): string[] {
  return items.map((item) => item.name);
}

describe("data analysis store", () => {
  test("generalStatItems is recomputed when the content of a cell changes", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
      A4: "apple",
      A5: "apple",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A5"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      value: "2",
    });
    setCellContent(model, "A3", "cherry");
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      value: "3",
    });
  });

  test("generalStatItems is recomputed when the selection changes", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "apple", A3: "banana" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      value: "2",
    });
    setSelection(model, ["A1:A2"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      value: "1",
    });
  });

  test("generalStatItems and occurrencesItems are empty when the selection has no data", () => {
    const model = createModelFromGrid({});
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.hasData).toBe(false);
    expect(store.generalStatItems).toEqual([]);
    expect(store.occurrencesItems).toEqual([]);
  });
});

function makeDataAnalysisStore(grid: Record<string, string>, selection: string) {
  const model = createModelFromGrid(grid);
  const { store } = makeStoreWithModel(model, DataAnalysisStore);
  setSelection(model, [selection]);
  return { model, store };
}

describe("data analysis store occurrences", () => {
  const grid = { A1: "banana", A2: "cherry", A3: "cherry", A4: "apple", A5: "apple", A6: "apple" };

  test("general statistics", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    expect(store.generalStatItems).toMatchObject([
      { formula: "=COUNTA(A1:A6)", id: "non_empty", name: "Non-empty cells", value: "6" },
      { formula: "=COUNTUNIQUE(A1:A6)", id: "unique", name: "Unique values", value: "3" },
      { formula: "", id: "sum", name: "Sum", value: "—" },
      { formula: "", id: "median", name: "Median", value: "—" },
      { formula: "", id: "average", name: "Average", value: "—" },
      { formula: "", id: "min", name: "Minimum value", value: "—" },
      { formula: "", id: "max", name: "Maximum value", value: "—" },
    ]);
  });

  test("occurrences are sorted by descending count by default", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["apple", "cherry", "banana"]);
  });

  test("sorting by count cycles between ascending, apparition order and descending", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleOccurrencesSort("value");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["banana", "cherry", "apple"]);
    store.toggleOccurrencesSort("value");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["banana", "cherry", "apple"]);
    expect(store.occurrencesSortType).toEqual({ sortOn: "value", order: "none" });
    store.toggleOccurrencesSort("value");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["apple", "cherry", "banana"]);
  });

  test("sorting by name cycles between alphabetical, reverse alphabetical and apparition order", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleOccurrencesSort("name");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["apple", "banana", "cherry"]);
    store.toggleOccurrencesSort("name");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["cherry", "banana", "apple"]);
    store.toggleOccurrencesSort("name");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["banana", "cherry", "apple"]);
  });

  test("occurrences with the same count are sorted by name", () => {
    const { store } = makeDataAnalysisStore({ A1: "cherry", A2: "apple", A3: "banana" }, "A1:A3");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["apple", "banana", "cherry"]);
  });

  test("the sort is kept when the data changes", () => {
    const { model, store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleOccurrencesSort("name");
    setCellContent(model, "A1", "date");
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["apple", "cherry", "date"]);
    setSelection(model, ["A1:A3"]);
    expect(getNames(store.displayedOccurrencesItems)).toEqual(["cherry", "date"]);
  });

  test("occurrences are displayed by pages of 50", () => {
    const grid: Record<string, string> = {};
    for (let i = 1; i <= 80; i++) {
      grid[`A${i}`] = `value${i}`;
    }
    const { store } = makeDataAnalysisStore(grid, "A1:A80");
    expect(store.displayedOccurrencesItems).toHaveLength(50);
    expect(store.hasMoreOccurrences).toBe(true);
    store.loadMoreOccurrences();
    expect(store.displayedOccurrencesItems).toHaveLength(80);
    expect(store.hasMoreOccurrences).toBe(false);
  });

  test("percentage of the total count are computed in each item", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    expect(store.displayedOccurrencesItems).toMatchObject([
      { name: "apple", percentage: "(50%)" },
      { name: "cherry", percentage: "(33%)" },
      { name: "banana", percentage: "(17%)" },
    ]);
  });

  test("percentages are computed for boolean data", () => {
    const { store } = makeDataAnalysisStore(
      { A1: "TRUE", A2: "FALSE", A3: "TRUE", A4: "TRUE" },
      "A1:A4"
    );
    expect(store.occurrencesItems).toMatchObject([
      { id: "true", percentage: "(75%)" },
      { id: "false", percentage: "(25%)" },
    ]);
  });
});

describe("data analysis for date", () => {
  const grid = { A1: "2023-01-15", A2: "2023-03-10", A3: "2023-03-20", A4: "2024-11-05" };

  test("general statistics", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    expect(store.generalStatItems).toMatchObject([
      { formula: "=COUNTA(A1:A4)", id: "non_empty", name: "Non-empty cells", value: "4" },
      { formula: "=COUNTUNIQUE(A1:A4)", id: "unique", name: "Unique values", value: "4" },
      { formula: "", id: "sum", name: "Sum", value: "—" },
      { formula: "=MEDIAN(A1:A4)", id: "median", name: "Median", value: "2023-03-15" },
      { formula: "=AVERAGE(A1:A4)", id: "average", name: "Average", value: "2023-07-28" },
      { formula: "=MIN(A1:A4)", id: "min", name: "Earliest date", value: "2023-01-15" },
      { formula: "=MAX(A1:A4)", id: "max", name: "Latest date", value: "2024-11-05" },
    ]);
  });

  test("date occurrences are displayed by month in chronological order by default", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    expect(store.dateGranularity).toBe("month");
    expect(store.displayedDateItems.map((item) => item.id)).toEqual([
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
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    store.setDateGranularity("year");
    expect(store.displayedDateItems).toMatchObject([
      { id: "2023", value: "3" },
      { id: "2024", value: "1" },
    ]);
    store.setDateGranularity("day");
    expect(store.displayedDateItems.map((item) => item.id)).toEqual([
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
    const { model, store } = makeDataAnalysisStore(grid, "A1:A4");
    updateLocale(model, FR_LOCALE);
    store.setDateGranularity("day");
    expect(store.displayedDateItems.map((item) => item.id)).toEqual([
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
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    store.setDateGranularity("year");
    store.toggleDateSort();
    expect(store.dateSortType).toBe("desc");
    expect(getNames(store.displayedDateItems)).toEqual(["2023", "2024"]);
    store.toggleDateSort();
    expect(store.dateSortType).toBe("asc");
    expect(getNames(store.displayedDateItems)).toEqual(["2024", "2023"]);
    store.toggleDateSort();
    expect(store.dateSortType).toBe("chrono");
    expect(getNames(store.displayedDateItems)).toEqual(["2023", "2024"]);
  });

  test("months are back in chronological order after cycling through the sorts", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    const chronologicalIds = store.displayedDateItems.map((item) => item.id);
    store.toggleDateSort();
    store.toggleDateSort();
    store.toggleDateSort();
    expect(store.displayedDateItems.map((item) => item.id)).toEqual(chronologicalIds);
  });

  test("the date sort and granularity are kept when the data changes", () => {
    const { model, store } = makeDataAnalysisStore(grid, "A1:A4");
    store.setDateGranularity("year");
    store.toggleDateSort();
    setCellContent(model, "A1", "2024-01-15");
    setCellContent(model, "A2", "2024-03-10");
    expect(store.displayedDateItems).toMatchObject([
      { id: "2024", value: "3" },
      { id: "2023", value: "1" },
    ]);
  });

  test("date percentages are computed on the total number of dates for every granularity", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    expect(store.displayedDateItems.find((item) => item.id === "m2")).toMatchObject({
      value: "2",
      percentage: "(50%)",
    });
    store.setDateGranularity("year");
    expect(store.displayedDateItems).toMatchObject([
      { id: "2023", percentage: "(75%)" },
      { id: "2024", percentage: "(25%)" },
    ]);
  });
});

describe("buildOccurrencesItems", () => {
  test("counts occurrences for a single categorical column", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const items = occurrences(model, "A1:A3");
    expect(items).toMatchObject([
      { name: "apple", value: "2", formula: '=COUNTIF(A1:A3,"apple")' },
      { name: "banana", value: "1", formula: '=COUNTIF(A1:A3,"banana")' },
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
      { name: "Apple", value: "3", formula: '=COUNTIF(A1:A5,"Apple")' },
      { name: "banana", value: "2", formula: '=COUNTIF(A1:A5,"banana")' },
    ]);
  });

  test("occurrences use the formatted value", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2" });
    setFormat(model, "A1:A2", "%0.00");
    const items = occurrences(model, "A1:A2");
    expect(items).toMatchObject([
      { name: "%100.00", value: "1", formula: '=COUNTIF(A1:A2,"1")' },
      { name: "%200.00", value: "1", formula: '=COUNTIF(A1:A2,"2")' },
    ]);
  });
});
