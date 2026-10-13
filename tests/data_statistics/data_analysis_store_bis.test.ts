import { Model } from "../../src";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import { buildGroupedDateSections } from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import { createModelFromGrid } from "../test_helpers/helpers";

function dateSums(model: Model, datesXC: string, valuesXC: string) {
  const sheetId = model.getters.getActiveSheetId();
  const colDates = analyzeColumns([toZone(datesXC)], model.getters);
  const colValues = analyzeColumns([toZone(valuesXC)], model.getters);
  return buildGroupedDateSections(model.getters, colDates[0], colValues[0], sheetId);
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
            formula: `=SUMIF(YEAR(A1:A5), "2026", "B1:B5")`,
            computedValue: "",
            rawValue: "40000",
            format: "",
          },
        ],
        quarter: [],
        month: [],
        week: [],
        weekday: [],
        day: [],
        date: [],
      },
    ],
  ])(
    "sums are correctly computed in DateSections for avalaibles granularities",
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
});
