import { Model } from "../../src";
import { DataAnalysisStore } from "../../src/components/side_panel/data_analysis/data_analysis_store";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import { buildOccurenciesItems } from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import { setCellContent, setSelection, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { createModelFromGrid } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

function occurencies(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  const nonEmpty = cols.filter((col) => col.type !== "empty");
  return buildOccurenciesItems(model.getters, nonEmpty[0], sheetId);
}

describe("data analysis store", () => {
  test("generalStatItems is well stored", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.generalStatItems.find((item) => item.id === "unique")).toMatchObject({
      value: "2",
    });
  });

  test("generalStatItems is recomputed when a cell's content changes", () => {
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

  test("generalStatItems and occurenciesItems are empty when the selection has no data", () => {
    const model = createModelFromGrid({});
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.hasData).toBe(false);
    expect(store.generalStatItems).toEqual([]);
    expect(store.occurenciesItems).toEqual([]);
  });

  test("generalStatItems and occurenciesItems are empty when several columns are selected", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", B1: "1", B2: "2" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:B2"]);
    expect(store.generalStatItems).toEqual([]);
    expect(store.occurenciesItems).toEqual([]);
  });

  test("dateStatSections year range does not depend on the locale's date format", () => {
    const model = createModelFromGrid({ A1: "1/15/2022", A2: "6/20/2023" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A2"]);
    updateLocale(model, FR_LOCALE);
    const yearSection = store.dateStatSections[0];
    expect(yearSection.items.map((item) => item.name)).toEqual(["2022", "2023"]);
  });
});

describe("buildOccurenciesItems", () => {
  test("counts occurrences for a single categorical column", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const items = occurencies(model, "A1:A3");
    expect(items).toMatchObject([
      { name: "apple", value: "2", formula: '=COUNTIF(A1:A3,"apple")' },
      { name: "banana", value: "1", formula: '=COUNTIF(A1:A3,"banana")' },
    ]);
  });

  test("sorts the categories by decreasing frequency with secondary alphabetical sort", () => {
    const model = createModelFromGrid({
      A1: "banana",
      A2: "cherry",
      A3: "cherry",
      A4: "apple",
      A5: "cherry",
    });
    const items = occurencies(model, "A1:A5");
    expect(items.map((item) => item.name)).toEqual(["cherry", "apple", "banana"]);
  });
});
