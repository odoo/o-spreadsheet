import { Model } from "../../src";
import { DataAnalysisStore } from "../../src/components/side_panel/data_analysis/data_analysis_store";
import { analyzeColumns } from "../../src/helpers/data_statistics/data_analysis";
import { buildStatSections } from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import { setCellContent, setSelection } from "../test_helpers/commands_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

function stats(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  const nonEmpty = cols.filter((col) => col.type !== "empty");
  return buildStatSections(model.getters, nonEmpty, sheetId);
}

describe("data analysis store", () => {
  test("statSection is well stored", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.statSections?.[0].items[0]).toMatchObject({ value: "2" });
  });

  test("statSection is recomputed when a cell's content changes", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
      A4: "apple",
      A5: "apple",
    });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A5"]);
    expect(store.statSections?.[0].items[0]).toMatchObject({ value: "2" });
    setCellContent(model, "A3", "cherry");
    expect(store.statSections?.[0].items[0]).toMatchObject({ value: "3" });
  });

  test("statSection is recomputed when the selection changes", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "apple", A3: "banana" });
    const { store } = makeStoreWithModel(model, DataAnalysisStore);
    setSelection(model, ["A1:A3"]);
    expect(store.statSections?.[0].items[0]).toMatchObject({ value: "2" });
    setSelection(model, ["A1:A2"]);
    expect(store.statSections?.[0].items[0]).toMatchObject({ value: "1" });
  });
});

describe("buildStatSections function", () => {
  test("statSection is undefined when the selection has no data", async () => {
    const model = createModelFromGrid({});
    const statSections = stats(model, "A1:A3");
    expect(statSections).toBeUndefined();
  });

  test("statSection is an empty array for a single column whose type has no suggestions yet", async () => {
    const model = createModelFromGrid({ A1: "1/1/2022", A2: "2/2/2022", A3: "3/3/2023" });
    const statSections = stats(model, "A1:A3")!;
    expect(statSections).toEqual([]);
  });

  test("statSection is undefined when several columns are selected", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", B1: "1", B2: "2" });
    const statSections = stats(model, "A1:B2");
    expect(statSections).toBeUndefined();
  });

  test("statSection for a single categorical column", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const statSections = stats(model, "A1:A3")!;
    expect(statSections).toEqual([
      { items: [{ name: "Unique categories", value: "2", formula: "=COUNTUNIQUE(A1:A3)" }] },
      {
        label: "Category occurrences",
        items: [
          { name: "apple", value: "2", formula: '=COUNTIF(A1:A3,"apple")' },
          { name: "banana", value: "1", formula: '=COUNTIF(A1:A3,"banana")' },
        ],
      },
    ]);
  });

  test("sorts the categories by decreasing frequency with secondary alphabetical/numerical sort", () => {
    const model = createModelFromGrid({
      A1: "banana",
      A2: "cherry",
      A3: "cherry",
      A4: "apple",
      A5: "cherry",
    });
    const statSections = stats(model, "A1:A5")!;
    expect(statSections[1].items.map((i) => i.name)).toEqual(["cherry", "apple", "banana"]);
  });
});
