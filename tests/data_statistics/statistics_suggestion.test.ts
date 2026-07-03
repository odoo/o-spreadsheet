import { Model } from "../../src";
import { analyzeColumns } from "../../src/helpers/data_analysis";
import { buildStatSections } from "../../src/helpers/data_statistics/statistics_suggestion";
import { toZone } from "../../src/helpers/zones";
import { createModelFromGrid } from "../test_helpers/helpers";

function stats(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const cols = analyzeColumns([toZone(xc)], model.getters);
  return buildStatSections(model.getters, cols, sheetId);
}

describe("buildStatSections", () => {
  test("returns undefined when the selection has no data", () => {
    const model = new Model();
    expect(stats(model, "A1:A3")).toBeUndefined();
  });

  test("returns undefined when more than one column is selected", () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", B1: "1", B2: "2" });
    expect(stats(model, "A1:B2")).toBeUndefined();
  });

  test("returns no stat groups yet for a single numeric column", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
    expect(stats(model, "A1:A3")).toEqual([]);
  });

  test("returns no stat groups yet for a single label column", () => {
    const model = createModelFromGrid({ A1: "Alice", A2: "Bob", A3: "Charlie", A4: "Dave" });
    expect(stats(model, "A1:A4")).toEqual([]);
  });

  test("returns no stat groups yet for a single boolean column", () => {
    const model = createModelFromGrid({ A1: "=TRUE", A2: "=FALSE" });
    expect(stats(model, "A1:A2")).toEqual([]);
  });

  test("builds a unique-count summary and a per-category breakdown for a categorical column", () => {
    const model = createModelFromGrid({ A1: "banana", A2: "apple", A3: "banana" });
    expect(stats(model, "A1:A3")).toEqual([
      { items: [{ name: "Unique categories", value: "2", formula: "=COUNTUNIQUE(A1:A3)" }] },
      {
        label: "Category occurrences",
        items: [
          { name: "apple", value: "1", formula: '=COUNTIF(A1:A3,"apple")' },
          { name: "banana", value: "2", formula: '=COUNTIF(A1:A3,"banana")' },
        ],
      },
    ]);
  });

  test("sorts the per-category breakdown alphabetically, regardless of first-seen order", () => {
    const model = createModelFromGrid({ A1: "cherry", A2: "apple", A3: "banana" });
    const groups = stats(model, "A1:A3")!;
    expect(groups[1].items.map((i) => i.name)).toEqual(["apple", "banana", "cherry"]);
  });

  test("excludes error cells from the per-category breakdown", () => {
    const model = createModelFromGrid({ A1: "=1/0", A2: "apple", A3: "banana", A4: "apple" });
    const groups = stats(model, "A1:A4")!;
    expect(groups[1].items.map((i) => i.name)).toEqual(["apple", "banana"]);
  });
});
