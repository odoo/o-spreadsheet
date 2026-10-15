import { Model } from "../../src";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import {
  buildCategorySumItems,
  buildGroupedDateSections,
} from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import { createModelFromGrid } from "../test_helpers/helpers";

function dateSums(model: Model, datesXC: string, valuesXC: string) {
  const sheetId = model.getters.getActiveSheetId();
  const colDates = analyzeColumns([toZone(datesXC)], model.getters);
  const colValues = analyzeColumns([toZone(valuesXC)], model.getters);
  return buildGroupedDateSections(model.getters, colDates[0], colValues[0], sheetId);
}

function groupSums(model: Model, datesXC: string, valuesXC: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(datesXC), toZone(valuesXC)], model.getters);
  return buildCategorySumItems(model.getters, cols[0], cols[1], sheetId);
}

describe("buildDateStatSections : Two-columns selection case", () => {
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
            formula: `=SUMIF(YEAR(A1:A5), 2026, B1:B5)`,
            rawValue: "28000",
          },
        ],
        quarter: [
          {
            id: "q1",
            name: "Quarter 1",
            formula: `=SUMIF(QUARTER(A1:A5), 1, B1:B5)`,
            rawValue: "28000",
          },
        ],
        month: [
          {
            id: "m1",
            name: "February",
            formula: `=SUMIF(MONTH(A1:A5), 2, B1:B5)`,
            rawValue: "28000",
          },
        ],
        week: [
          {
            id: "5",
            name: "5",
            formula: `=SUMIF(ISOWEEKNUM(A1:A5), 5, B1:B5)`,
            rawValue: "8000",
          },
          {
            id: "6",
            name: "6",
            formula: `=SUMIF(ISOWEEKNUM(A1:A5), 6, B1:B5)`,
            rawValue: "20000",
          },
        ],
        weekday: [
          {
            id: "d0",
            name: "Sunday",
            formula: `=SUMIF(WEEKDAY(A1:A5), 1, B1:B5)`,
            rawValue: "8000",
          },
          {
            id: "d1",
            name: "Monday",
            formula: `=SUMIF(WEEKDAY(A1:A5), 2, B1:B5)`,
            rawValue: "20000",
          },
        ],
        day: [
          {
            id: "d1",
            name: "1",
            formula: `=SUMIF(DAY(A1:A5), 1, B1:B5)`,
            rawValue: "8000",
          },
          {
            id: "d2",
            name: "2",
            formula: `=SUMIF(DAY(A1:A5), 2, B1:B5)`,
            rawValue: "20000",
          },
        ],
        date: [
          {
            id: "46054",
            name: "2/1/2026",
            formula: `=SUMIF(A1:A5, 46054, B1:B5)`,
            rawValue: "8000",
          },
          {
            id: "46055",
            name: "2/2/2026",
            formula: `=SUMIF(A1:A5, 46055, B1:B5)`,
            rawValue: "20000",
          },
        ],
      },
    ],
  ])(
    "sums are correctly computed in DateSections for available granularities",
    (sheetContent, expectedDateSection) => {
      const model = createModelFromGrid(sheetContent);
      const dateItems = dateSums(model, "A1:A5", "B1:B5");
      expect(dateItems.year).toMatchObject(expectedDateSection.year);
      expect(dateItems.quarter).toMatchObject(expectedDateSection.quarter);
      expect(dateItems.month).toMatchObject(expectedDateSection.month);
      expect(dateItems.week).toMatchObject(expectedDateSection.week);
      expect(dateItems.weekday).toMatchObject(expectedDateSection.weekday);
      expect(dateItems.day).toMatchObject(expectedDateSection.day);
      expect(dateItems.date).toMatchObject(expectedDateSection.date);
    }
  );

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

    expect(dateItems.year[0].formula).toBe(`=SUMIF(YEAR(A2:A3), 2026, B2:B3)`);
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

    expect(dateItems.year[0].rawValue).toBe("1000");
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
      { id: "2025", rawValue: "1000" },
      { id: "2026", rawValue: "2000" },
    ]);
  });

  test("returns empty sections when date column has no valid dates", () => {
    const model = createModelFromGrid({
      A1: "Not a date",
      A2: "Hello",
      B1: "100$",
      B2: "200$",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(dateItems).toEqual({
      year: [],
      quarter: [],
      month: [],
      week: [],
      weekday: [],
      day: [],
      date: [],
    });
  });

  test("returns empty sections when value column has no valid numbers", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2026-02-02",
      B1: "Not a number",
      B2: "Invalid",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(dateItems).toEqual({
      year: [],
      quarter: [],
      month: [],
      week: [],
      weekday: [],
      day: [],
      date: [],
    });
  });

  // TODO : problem is that formula is waiting for a range and here we juste check with "range" of 1 cells => crash
  test("propagates custom number formatting from value cells to stat items", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2025-04-03",
      B1: "10.00 €",
      B2: "10.00 €",
    });
    const dateItems = dateSums(model, "A1:A2", "B1:B2");

    expect(dateItems.year[0].rawValue).toBe("10");
    expect(dateItems.year[0].value).toContain("€");
  });

  test("returns empty sections when date and value columns have different range heights", () => {
    const model = createModelFromGrid({
      A1: "2026-02-01",
      A2: "2026-02-02",
      A3: "2026-02-02",
      A4: "2026-02-01",
      B1: "1000$",
      B2: "2000$",
      B3: "3000$",
    });
    const sheetId = model.getters.getActiveSheetId();

    const colDates = analyzeColumns([toZone("A1:A4")], model.getters);
    const colValues = analyzeColumns([toZone("B1:B3")], model.getters);

    const dateItems = buildGroupedDateSections(model.getters, colDates[0], colValues[0], sheetId);

    expect(dateItems).toEqual({
      year: [],
      quarter: [],
      month: [],
      week: [],
      weekday: [],
      day: [],
      date: [],
    });
  });
});

describe("buildCategorySumItems : Two-columns selection case", () => {
  test.each([
    [
      {
        A1: "Fruits",
        A2: "Vegetables",
        A3: "Fruits",
        A4: "Vegetables",
        A5: "Meat",
        A6: "Meat",
        B1: "1500$",
        B2: "1000$",
        B3: "2500$",
        B4: "4000$",
        B5: "2500$",
        B6: "3500$",
      },
      [
        {
          id: "fruits",
          name: "Fruits",
          formula: `=SUMIF(A1:A6,"Fruits",B1:B6)`,
          rawValue: "4000",
        },
        {
          id: "vegetables",
          name: "Vegetables",
          formula: `=SUMIF(A1:A6,"Vegetables",B1:B6)`,
          rawValue: "5000",
        },
        {
          id: "meat",
          name: "Meat",
          formula: `=SUMIF(A1:A6,"Meat",B1:B6)`,
          rawValue: "6000",
        },
      ],
    ],
  ])("sums are correctly computed per category", (sheetContent, expectedCategoryItems) => {
    const model = createModelFromGrid(sheetContent);
    const categoryItems = groupSums(model, "A1:A6", "B1:B6");

    expect(categoryItems).toMatchObject(expectedCategoryItems);
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
        rawValue: "1000",
      }),
    ]);
  });

  test("returns empty array when category and value ranges have different heights", () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      A2: "Meat",
      A3: "Fruits",
      B1: "1000$",
      B2: "2000$",
    });
    const sheetId = model.getters.getActiveSheetId();
    const colCategories = analyzeColumns([toZone("A1:A3")], model.getters);
    const colValues = analyzeColumns([toZone("B1:B2")], model.getters);

    const result = buildCategorySumItems(model.getters, colCategories[0], colValues[0], sheetId);

    expect(result).toEqual([]);
  });

  test("returns empty array if one column analysis is missing", () => {
    const model = createModelFromGrid({ A1: "Fruits" });
    const sheetId = model.getters.getActiveSheetId();
    const colCategories = analyzeColumns([toZone("A1")], model.getters);

    const result = buildCategorySumItems(
      model.getters,
      colCategories[0],
      undefined as any,
      sheetId
    );

    expect(result).toEqual([]);
  });
});
