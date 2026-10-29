import { Model } from "../../src";
import { DataAnalysisStore } from "../../src/components/side_panel/data_analysis/data_analysis_store";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import { getStatIdFromDate, StatValue } from "../../src/helpers/data_statistics/statistics_items";
import {
  buildOccurrencesItems,
  buildSumByCategoryItems,
  buildSumByDateSections,
} from "../../src/helpers/data_statistics/statistics_suggestion";
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
import { makeStoreWithModel } from "../test_helpers/stores";

function occurrences(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  return buildOccurrencesItems(model.getters, [cols[0]], sheetId);
}

function dateSums(model: Model, datesXC: string, valuesXC: string) {
  const sheetId = model.getters.getActiveSheetId();
  const colDates = analyzeColumns([toZone(datesXC)], model.getters);
  const colValues = analyzeColumns([toZone(valuesXC)], model.getters);
  return buildSumByDateSections(model.getters, [colDates[0], colValues[0]], sheetId);
}

function groupSums(model: Model, datesXC: string, valuesXC: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(datesXC), toZone(valuesXC)], model.getters);
  return buildSumByCategoryItems(model.getters, [cols[0], cols[1]], sheetId);
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
      formattedValue: "2",
    });
    setCellContent(model, "A3", "cherry");
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      formattedValue: "3",
    });
  });

  test("generalStatItems is recomputed when the selection changes", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "apple", A3: "banana" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      formattedValue: "2",
    });
    setSelection(model, ["A1:A2"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      formattedValue: "1",
    });
  });

  test("generalStatItems and aggregatedStatItems are empty when the selection has no data", () => {
    const model = createModelFromGrid({});
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.hasData).toBe(false);
    expect(store.generalStatItems).toEqual([]);
    expect(store.aggregatedStatItems).toEqual([]);
  });

  test("no grouped statistics when the selected zones do not span the same rows", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      A2: "Meat",
      A3: "Fruits",
      B2: "100",
      B3: "200",
      B4: "300",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3", "B2:B4"]);
    expect(store.aggregatedStatItems).toEqual([]);
    expect(store.groupingColumnIndex).toBeUndefined();
  });

  test("a general statistic whose formula returns an error is displayed as a dash", () => {
    const model = createModelFromGrid({ A1: "1", A2: "=1/0", A3: "3" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.generalStatItems.find((item) => item.id === "sum")).toMatchObject({
      formattedValue: "—",
    });
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
      {
        formula: "=COUNTA(Sheet1!A1:A6)",
        id: "non_empty",
        name: "Non-empty cells",
        formattedValue: "6",
      },
      {
        formula: "=COUNTUNIQUE(Sheet1!A1:A6)",
        id: "unique",
        name: "Unique values",
        formattedValue: "3",
      },
      { formula: "", id: "sum", name: "Sum", formattedValue: "—" },
      { formula: "", id: "median", name: "Median", formattedValue: "—" },
      { formula: "", id: "average", name: "Average", formattedValue: "—" },
      { formula: "", id: "min", name: "Minimum value", formattedValue: "—" },
      { formula: "", id: "max", name: "Maximum value", formattedValue: "—" },
    ]);
  });

  test("occurrences are sorted by descending count by default", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["apple", "cherry", "banana"]);
  });

  test("sorting by count cycles between ascending, apparition order and descending", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleAggregatedStatSort("value");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["banana", "cherry", "apple"]);
    expect(store.aggregatedStatSortType).toEqual({ sortOn: "value", order: "none" });
    store.toggleAggregatedStatSort("value");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["banana", "cherry", "apple"]);
    expect(store.aggregatedStatSortType).toEqual({ sortOn: "value", order: "asc" });
    store.toggleAggregatedStatSort("value");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["apple", "cherry", "banana"]);
    expect(store.aggregatedStatSortType).toEqual({ sortOn: "value", order: "desc" });
  });

  test("sorting by name cycles between alphabetical, reverse alphabetical and apparition order", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleAggregatedStatSort("name");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["apple", "banana", "cherry"]);
    store.toggleAggregatedStatSort("name");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["cherry", "banana", "apple"]);
    store.toggleAggregatedStatSort("name");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["banana", "cherry", "apple"]);
  });

  test("sorting by name use the same order as grid sorting", () => {
    const { store } = makeDataAnalysisStore(
      { A1: "10", A2: "banana", A3: "9", A4: "-5", A5: "1.5", A6: "Apple", A7: "1.25" },
      "A1:A7"
    );
    store.toggleAggregatedStatSort("name");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual([
      "-5",
      "1.25",
      "1.5",
      "9",
      "10",
      "Apple",
      "banana",
    ]);
    store.toggleAggregatedStatSort("name");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual([
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
    const { store } = makeDataAnalysisStore({ A1: "cherry", A2: "apple", A3: "banana" }, "A1:A3");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["cherry", "apple", "banana"]);
  });

  test("the sort is kept when the data changes", () => {
    const { model, store } = makeDataAnalysisStore(grid, "A1:A6");
    store.toggleAggregatedStatSort("name");
    setCellContent(model, "A1", "date");
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["apple", "cherry", "date"]);
    setSelection(model, ["A1:A3"]);
    expect(getNames(store.displayedAggregatedStatItems)).toEqual(["cherry", "date"]);
  });

  test("occurrences are displayed by pages of 50", () => {
    const grid: Record<string, string> = {};
    for (let i = 1; i <= 80; i++) {
      grid[`A${i}`] = `value${i}`;
    }
    const { store } = makeDataAnalysisStore(grid, "A1:A80");
    expect(store.displayedAggregatedStatItems).toHaveLength(50);
    expect(store.hasMoreAggregatedStatItems).toBe(true);
    store.loadMoreAggregatedStatItems();
    expect(store.displayedAggregatedStatItems).toHaveLength(80);
    expect(store.hasMoreAggregatedStatItems).toBe(false);
  });

  test("percentage of the total count are computed in each item", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A6");
    expect(store.displayedAggregatedStatItems).toMatchObject([
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
    expect(store.aggregatedStatItems).toMatchObject([
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
      {
        formula: "=COUNTA(Sheet1!A1:A4)",
        id: "non_empty",
        name: "Non-empty cells",
        formattedValue: "4",
      },
      {
        formula: "=COUNTUNIQUE(Sheet1!A1:A4)",
        id: "unique",
        name: "Unique values",
        formattedValue: "4",
      },
      { formula: "", id: "sum", name: "Sum", formattedValue: "—" },
      {
        formula: "=MEDIAN(Sheet1!A1:A4)",
        id: "median",
        name: "Median",
        formattedValue: "2023-03-15",
      },
      {
        formula: "=AVERAGE(Sheet1!A1:A4)",
        id: "average",
        name: "Average",
        formattedValue: "2023-07-28",
      },
      {
        formula: "=MIN(Sheet1!A1:A4)",
        id: "min",
        name: "Earliest date",
        formattedValue: "2023-01-15",
      },
      {
        formula: "=MAX(Sheet1!A1:A4)",
        id: "max",
        name: "Latest date",
        formattedValue: "2024-11-05",
      },
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
      { id: "2023", formattedValue: "3" },
      { id: "2024", formattedValue: "1" },
    ]);
    store.setDateGranularity("weekday");
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
    store.setDateGranularity("weekday");
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
    expect(store.dateSortType).toBe("asc");
    expect(getNames(store.displayedDateItems)).toEqual(["2024", "2023"]);
    store.toggleDateSort();
    expect(store.dateSortType).toBe("desc");
    expect(getNames(store.displayedDateItems)).toEqual(["2023", "2024"]);
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
      { id: "2023", formattedValue: "1" },
      { id: "2024", formattedValue: "3" },
    ]);
  });

  test("date occurrences by quarter", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    store.setDateGranularity("quarter");
    expect(store.displayedDateItems).toMatchObject([
      { id: "q1", name: "Quarter 1", formattedValue: "3" },
      { id: "q2", name: "Quarter 2", formattedValue: "0" },
      { id: "q3", name: "Quarter 3", formattedValue: "0" },
      { id: "q4", name: "Quarter 4", formattedValue: "1" },
    ]);
  });

  test("date occurrences by week only show non-empty weeks", () => {
    const { store } = makeDataAnalysisStore(
      { A1: "2023-01-02", A2: "2023-01-03", A3: "2023-01-17" },
      "A1:A3"
    );
    store.setDateGranularity("week");
    expect(store.displayedDateItems).toMatchObject([
      { id: "1", name: "W1", formattedValue: "2" },
      { id: "3", name: "W3", formattedValue: "1" },
    ]);
  });

  test("date occurrences by week across two years", () => {
    const { store } = makeDataAnalysisStore({ A1: "2023-12-28", A2: "2024-01-03" }, "A1:A2");
    store.setDateGranularity("week");
    expect(store.displayedDateItems).toMatchObject([
      { id: "1", name: "W1", formattedValue: "1" },
      { id: "52", name: "W52", formattedValue: "1" },
    ]);
  });

  test("date occurrences by day of month", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    store.setDateGranularity("day");
    const items = store.displayedDateItems;
    expect(items.map((item) => item.id)).toEqual(
      Array.from({ length: 31 }, (_, i) => `dom${i + 1}`)
    );
    expect(items.find((item) => item.id === "dom15")).toMatchObject({
      name: "15",
      formattedValue: "1",
    });
    expect(items.find((item) => item.id === "dom10")).toMatchObject({
      name: "10",
      formattedValue: "1",
    });
    expect(items.find((item) => item.id === "dom1")).toMatchObject({ formattedValue: "0" });
  });

  test("date occurrences by date are formatted, counted and in chronological order", () => {
    const { store } = makeDataAnalysisStore(
      { A1: "2023-03-10", A2: "2023-01-15", A3: "2023-03-10", A4: "2023-01-15 10:00" },
      "A1:A4"
    );
    store.setDateGranularity("date");
    expect(store.displayedDateItems).toMatchObject([
      { name: "1/15/2023", formattedValue: "2", percentage: "(50%)" },
      { name: "3/10/2023", formattedValue: "2", percentage: "(50%)" },
    ]);
  });

  test("date percentages are computed on the total number of dates for every granularity", () => {
    const { store } = makeDataAnalysisStore(grid, "A1:A4");
    expect(store.displayedDateItems.find((item) => item.id === "m2")).toMatchObject({
      formattedValue: "2",
      percentage: "(50%)",
    });
    store.setDateGranularity("year");
    expect(store.displayedDateItems).toMatchObject([
      { id: "2023", percentage: "(75%)" },
      { id: "2024", percentage: "(25%)" },
    ]);
  });

  test("quarter formula does not count blank cells", () => {
    const { model, store } = makeDataAnalysisStore({ A1: "2023-01-15", A2: "2023-03-10" }, "A1:A5");
    store.setDateGranularity("quarter");
    const q4 = store.displayedDateItems.find((item) => item.id === "q4")!;
    expect(q4.formattedValue).toBe("0");
    setCellContent(model, "B1", q4.formula);
    expect(getEvaluatedCell(model, "B1").value).toBe(0);
  });

  test("week formula does not count blank cells", () => {
    const { model, store } = makeDataAnalysisStore({ A1: "2024-12-25", A3: "2024-01-15" }, "A1:A3");
    store.setDateGranularity("week");
    const w52 = store.displayedDateItems.find((item) => item.name === "W52")!;
    expect(w52.formattedValue).toBe("1");
    setCellContent(model, "B1", w52.formula);
    expect(getEvaluatedCell(model, "B1").value).toBe(1);
  });
});

describe("buildOccurrencesItems", () => {
  test("counts occurrences for a single categorical column", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const items = occurrences(model, "A1:A3");
    expect(items).toMatchObject([
      { name: "apple", formattedValue: "2", formula: '=COUNTIF(Sheet1!A1:A3,"apple")' },
      { name: "banana", formattedValue: "1", formula: '=COUNTIF(Sheet1!A1:A3,"banana")' },
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
      { name: "Apple", formattedValue: "3", formula: '=COUNTIF(Sheet1!A1:A5,"Apple")' },
      { name: "banana", formattedValue: "2", formula: '=COUNTIF(Sheet1!A1:A5,"banana")' },
    ]);
  });

  test("occurrences use the formatted value", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2" });
    setFormat(model, "A1:A2", "%0.00");
    const items = occurrences(model, "A1:A2");
    expect(items).toMatchObject([
      { name: "%100.00", formattedValue: "1", formula: "=COUNTIF(Sheet1!A1:A2,1)" },
      { name: "%200.00", formattedValue: "1", formula: "=COUNTIF(Sheet1!A1:A2,2)" },
    ]);
  });

  test("occurrence formula of a boolean counts the boolean values", () => {
    const model = createModelFromGrid({ A1: "TRUE", A2: "apple", A3: "TRUE", A4: "FALSE" });
    const items = occurrences(model, "A1:A4");
    expect(items).toMatchObject([
      {
        name: "TRUE",
        formattedValue: "2",
        formula:
          '=COUNTIF(Sheet1!A1:A4,TRUE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="TRUE"))',
      },
      { name: "apple", formattedValue: "1", formula: '=COUNTIF(Sheet1!A1:A4,"apple")' },
      {
        name: "FALSE",
        formattedValue: "1",
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
        formattedValue: "3",
        formula:
          '=COUNTIF(Sheet1!A1:A4,TRUE)+SUMPRODUCT(ISTEXT(Sheet1!A1:A4)*(Sheet1!A1:A4="TRUE"))',
      },
      {
        name: "FALSE",
        formattedValue: "1",
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
      { name: "null", formattedValue: "2", percentage: "(67%)" },
      { name: "x", formattedValue: "1", percentage: "(33%)" },
    ]);
  });
});

describe("buildSumByDateSections", () => {
  test.each([
    [
      {
        A1: "2026-02-01",
        A2: "2026-02-02",
        A3: "2026-02-02",
        A4: "2026-02-01",
        A5: "2026-02-01",
        B1: "2000$",
        B2: "4000$",
        B3: "16000$",
        B4: "3500$",
        B5: "2500$",
      },
      {
        year: [
          {
            id: "2026",
            name: "2026",
            formula: `=SUMIF(FILTER(YEAR(Sheet1!A1:A5), Sheet1!A1:A5), 2026, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 28000,
          },
        ],
        quarter: [
          {
            id: "q1",
            name: "Quarter 1",
            formula: `=SUMIF(FILTER(QUARTER(Sheet1!A1:A5), Sheet1!A1:A5), 1, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 28000,
          },
        ],
        month: [
          {
            id: "m1",
            name: "February",
            formula: `=SUMIF(FILTER(MONTH(Sheet1!A1:A5), Sheet1!A1:A5), 2, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 28000,
          },
        ],
        week: [
          {
            id: "5",
            name: "W5",
            formula: `=SUMIF(FILTER(ISOWEEKNUM(Sheet1!A1:A5), Sheet1!A1:A5), 5, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 8000,
          },
          {
            id: "6",
            name: "W6",
            formula: `=SUMIF(FILTER(ISOWEEKNUM(Sheet1!A1:A5), Sheet1!A1:A5), 6, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 20000,
          },
        ],
        weekday: [
          {
            id: "d0",
            name: "Sunday",
            formula: `=SUMIF(FILTER(WEEKDAY(Sheet1!A1:A5), Sheet1!A1:A5), 1, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 8000,
          },
          {
            id: "d1",
            name: "Monday",
            formula: `=SUMIF(FILTER(WEEKDAY(Sheet1!A1:A5), Sheet1!A1:A5), 2, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 20000,
          },
        ],
        day: [
          {
            id: "dom1",
            name: "1",
            formula: `=SUMIF(FILTER(DAY(Sheet1!A1:A5), Sheet1!A1:A5), 1, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 8000,
          },
          {
            id: "dom2",
            name: "2",
            formula: `=SUMIF(FILTER(DAY(Sheet1!A1:A5), Sheet1!A1:A5), 2, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 20000,
          },
        ],
        date: [
          {
            id: "46054",
            name: "2/1/2026",
            formula: `=SUMIF(FILTER(INT(Sheet1!A1:A5), Sheet1!A1:A5), 46054, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 8000,
          },
          {
            id: "46055",
            name: "2/2/2026",
            formula: `=SUMIF(FILTER(INT(Sheet1!A1:A5), Sheet1!A1:A5), 46055, FILTER(Sheet1!B1:B5, Sheet1!A1:A5))`,
            rawValue: 20000,
          },
        ],
      },
      [
        {
          A5: "2026-02-01",
          A6: "2026-02-02",
          A7: "2026-02-02",
          A8: "2026-02-01",
          A9: "2026-02-01",
          C5: "2000$",
          C6: "4000$",
          C7: "16000$",
          C8: "3500$",
          C9: "2500$",
        },
        {
          year: [
            {
              id: "2026",
              name: "2026",
              formula: `=SUMIF(FILTER(YEAR(Sheet1!A5:A9), Sheet1!A5:A9), 2026, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 28000,
            },
          ],
          quarter: [
            {
              id: "q1",
              name: "Quarter 1",
              formula: `=SUMIF(FILTER(QUARTER(Sheet1!A5:A9), Sheet1!A5:A9), 1, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 28000,
            },
          ],
          month: [
            {
              id: "m1",
              name: "February",
              formula: `=SUMIF(FILTER(MONTH(Sheet1!A5:A9), Sheet1!A5:A9), 2, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 28000,
            },
          ],
          week: [
            {
              id: "5",
              name: "W5",
              formula: `=SUMIF(FILTER(ISOWEEKNUM(Sheet1!A5:A9), Sheet1!A5:A9), 5, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 8000,
            },
            {
              id: "6",
              name: "W6",
              formula: `=SUMIF(FILTER(ISOWEEKNUM(Sheet1!A5:A9), Sheet1!A5:A9), 6, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 20000,
            },
          ],
          weekday: [
            {
              id: "d0",
              name: "Sunday",
              formula: `=SUMIF(FILTER(WEEKDAY(Sheet1!A5:A9), Sheet1!A5:A9), 1, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 8000,
            },
            {
              id: "d1",
              name: "Monday",
              formula: `=SUMIF(FILTER(WEEKDAY(Sheet1!A5:A9), Sheet1!A5:A9), 2, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 20000,
            },
          ],
          day: [
            {
              id: "dom1",
              name: "1",
              formula: `=SUMIF(FILTER(DAY(Sheet1!A5:A9), Sheet1!A5:A9), 1, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 8000,
            },
            {
              id: "dom2",
              name: "2",
              formula: `=SUMIF(FILTER(DAY(Sheet1!A5:A9), Sheet1!A5:A9), 2, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 20000,
            },
          ],
          date: [
            {
              id: "46054",
              name: "2/1/2026",
              formula: `=SUMIF(FILTER(INT(Sheet1!A5:A9), Sheet1!A5:A9), 46054, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 8000,
            },
            {
              id: "46055",
              name: "2/2/2026",
              formula: `=SUMIF(FILTER(INT(Sheet1!A5:A9), Sheet1!A5:A9), 46055, FILTER(Sheet1!B5:B9, Sheet1!A5:A9))`,
              rawValue: 20000,
            },
          ],
        },
      ],
    ],
  ])(
    "sums are correctly computed in DateSections for available granularities",
    (sheetContent, expectedDateSection) => {
      const model = createModelFromGrid(sheetContent);
      const dateItems = dateSums(model, "A1:A5", "B1:B5");
      const nonEmpty = (items: StatValue[]) => items.filter((item) => item.rawValue !== 0);
      expect(nonEmpty(dateItems.year)).toMatchObject(expectedDateSection.year);
      expect(nonEmpty(dateItems.quarter)).toMatchObject(expectedDateSection.quarter);
      expect(nonEmpty(dateItems.month)).toMatchObject(expectedDateSection.month);
      expect(nonEmpty(dateItems.week)).toMatchObject(expectedDateSection.week);
      expect(nonEmpty(dateItems.weekday)).toMatchObject(expectedDateSection.weekday);
      expect(nonEmpty(dateItems.day)).toMatchObject(expectedDateSection.day);
      expect(nonEmpty(dateItems.date)).toMatchObject(expectedDateSection.date);
    }
  );

  test("generalStatItems is empty when selecting more than 1 column", () => {
    const model = createModelFromGrid({
      A1: "10",
      B1: "20",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);

    setSelection(model, ["A1:B1"]);

    expect(store.generalStatItems).toEqual([]);
  });

  test("aggregatedStatItems is empty when selecting more than 2 columns", () => {
    const model = createModelFromGrid({
      A1: "Category",
      B1: "10",
      C1: "20",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);

    setSelection(model, ["A1:C1"]);

    expect(store.aggregatedStatItems).toEqual([]);
  });

  test("aggregatedStatItems is empty when selecting 2 columns with wrong shape", () => {
    const model = createModelFromGrid({
      A1: "Category",
      B1: "Subcategory",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);

    setSelection(model, ["A1:B1"]);

    expect(store.aggregatedStatItems).toEqual([]);
  });

  test("error is raised when getting an invalid granularity", () => {
    expect(() => {
      getStatIdFromDate(new Date() as any, "fake" as any);
    }).toThrow("Granularity not supported : fake");
  });

  test("adjusts formula ranges when headers are present in selection", () => {
    const model = createModelFromGrid({
      A1: "Date",
      A2: "2026-02-01",
      A3: "2026-02-02",
      B1: "Amount",
      B2: "1000$",
      B3: "2000$",
    });
    const dateItems = dateSums(model, "A1:A3", "B1:B3");

    expect(dateItems.year[0].formula).toBe(
      `=SUMIF(FILTER(YEAR(Sheet1!A2:A3), Sheet1!A2:A3), 2026, FILTER(Sheet1!B2:B3, Sheet1!A2:A3))`
    );
  });

  test("handles empty cells and text in value column", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2026-02-02",
      A3: "2026-02-02",
      B1: "1000$",
      B2: "",
      B3: "N/A",
    });
    const dateItems = dateSums(model, "A1:A3", "B1:B3");

    expect(dateItems.year[0].rawValue).toBe(1000);
  });

  test("correctly computes multiple years across quarters", () => {
    const model = createModelFromGrid({
      A1: "2025-12-31",
      A2: "2026-01-01",
      B1: "1000$",
      B2: "2000$",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(dateItems.year).toHaveLength(2);
    expect(dateItems.year).toMatchObject([
      { id: "2025", rawValue: 1000 },
      { id: "2026", rawValue: 2000 },
    ]);
  });

  test("all sums are 0 when date column has no valid dates", () => {
    const model = createModelFromGrid({
      A1: "Not a date",
      A2: "Hello",
      B1: "100$",
      B2: "200$",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(
      Object.values(dateItems)
        .flat()
        .every((item) => item.rawValue === 0)
    ).toBe(true);
  });

  test("all sums are 0 when value column has no valid numbers", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2026-02-02",
      B1: "Not a number",
      B2: "Invalid",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(
      Object.values(dateItems)
        .flat()
        .every((item) => item.rawValue === 0)
    ).toBe(true);
  });

  test("propagates custom number formatting from value cells to stat items", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2025-04-03",
      B1: "10.00 €",
      B2: "10.00 €",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(dateItems.year).toMatchObject([
      { name: "2025", rawValue: 10, formattedValue: "10.00€" },
      { name: "2026", rawValue: 10, formattedValue: "10.00€" },
    ]);
  });
});

describe("buildSumByCategoryItems", () => {
  test("sums are correctly computed per category", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      A2: "Vegetables",
      A3: "Fruits",
      B1: "1500$",
      B2: "1000$",
      B3: "2500$",
    });
    const categoryItems = groupSums(model, "A1:A6", "B1:B6");

    expect(categoryItems).toMatchObject([
      {
        id: "fruits",
        name: "Fruits",
        formula: `=SUMIF(A1:A6,"Fruits",B1:B6)`,
        rawValue: 4000,
      },
      {
        id: "vegetables",
        name: "Vegetables",
        formula: `=SUMIF(A1:A6,"Vegetables",B1:B6)`,
        rawValue: 1000,
      },
    ]);
  });

  test("adjusts formula ranges when headers are present in selection", () => {
    const model = createModelFromGrid({
      A1: "Category",
      A2: "Fruits",
      A3: "Meat",
      B1: "Amount",
      B2: "1000$",
      B3: "2000$",
    });
    const categoryItems = groupSums(model, "A1:A3", "B1:B3");

    expect(categoryItems[0].formula).toBe(`=SUMIF(A2:A3,"Fruits",B2:B3)`);
  });

  test("handles empty cells and non-numeric values in values column", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      A2: "Fruits",
      A3: "Meat",
      B1: "1000$",
      B2: "N/A",
      B3: "",
    });
    const categoryItems = groupSums(model, "A1:A3", "B1:B3");

    expect(categoryItems).toEqual([
      expect.objectContaining({
        id: "fruits",
        name: "Fruits",
        rawValue: 1000,
      }),
    ]);
  });

  test("sums per boolean category", () => {
    const model = createModelFromGrid({
      A1: "TRUE",
      A2: "FALSE",
      A3: "TRUE",
      B1: "10",
      B2: "20",
      B3: "30",
    });
    const items = groupSums(model, "A1:A3", "B1:B3");
    expect(items).toMatchObject([
      { name: "TRUE", rawValue: 40, formattedValue: "40" },
      { name: "FALSE", rawValue: 20, formattedValue: "20" },
    ]);
    setCellContent(model, "C1", items[0].formula);
    setCellContent(model, "C2", items[1].formula);
    expect(getEvaluatedCell(model, "C1").value).toBe(40);
    expect(getEvaluatedCell(model, "C2").value).toBe(20);
  });
});

describe("locale changes and formatting", () => {
  test("computes correct raw values independently of the active locale", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      B1: "1000",
      A2: "Meat",
      B2: "0",
    });

    updateLocale(model, FR_LOCALE);

    const sheetId = model.getters.getActiveSheetId();
    const colCategories = analyzeColumns([toZone("A1:A2")], model.getters);
    const colValues = analyzeColumns([toZone("B1:B2")], model.getters);

    const categoryItems = buildSumByCategoryItems(
      model.getters,
      [colCategories[0], colValues[0]],
      sheetId
    );

    const fruitsItem = categoryItems.find((item) => item.name === "Fruits");
    expect(fruitsItem?.rawValue).toBe(1000);
  });

  test("formats displayed values dynamically according to the active locale", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      B1: "1000",
    });

    const sheetId = model.getters.getActiveSheetId();

    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [toZone("B1")],
      format: "#,##0",
    });

    const colCategories = analyzeColumns([toZone("A1")], model.getters);
    const colValues = analyzeColumns([toZone("B1")], model.getters);

    // Before FR_LOCALE ("1,000")
    const itemsBefore = buildSumByCategoryItems(
      model.getters,
      [colCategories[0], colValues[0]],
      sheetId
    );
    expect(itemsBefore[0].formattedValue).toBe("1,000");

    // US_LOCALE -> FR_LOCALE
    updateLocale(model, FR_LOCALE);

    // After FR_LOCALE ("1,000")
    const itemsAfter = buildSumByCategoryItems(
      model.getters,
      [colCategories[0], colValues[0]],
      sheetId
    );
    expect(itemsAfter[0].formattedValue).toBe("1 000");
  });
});
