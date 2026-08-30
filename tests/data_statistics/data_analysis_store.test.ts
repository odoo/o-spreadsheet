import { DataAnalysisStore } from "../../src/components/side_panel/data_analysis/data_analysis_store";
import { setCellContent, setSelection } from "../test_helpers";
import { createModelFromGrid, mountSpreadsheet } from "../test_helpers/helpers";

test("statSection is undefined when the selection has no data", async () => {
  const model = createModelFromGrid({});
  const { env } = await mountSpreadsheet({ model });
  const store = env.getStore(DataAnalysisStore);
  setSelection(model, ["A1:A3"]);
  expect(store.statSection).toBeUndefined();
});

test("statSection is an empty array for a single column whose type has no suggestions yet", async () => {
  const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
  const { env } = await mountSpreadsheet({ model });
  const store = env.getStore(DataAnalysisStore);
  setSelection(model, ["A1:A3"]);
  expect(store.statSection).toEqual([]);
});

test("statSection is undefined when several columns are selected", async () => {
  const model = createModelFromGrid({ A1: "apple", A2: "banana", B1: "1", B2: "2" });
  const { env } = await mountSpreadsheet({ model });
  const store = env.getStore(DataAnalysisStore);
  setSelection(model, ["A1:B2"]);
  expect(store.statSection).toBeUndefined();
});

test("statSection contains the category breakdown for a single categorical column", async () => {
  const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
  const { env } = await mountSpreadsheet({ model });
  const store = env.getStore(DataAnalysisStore);
  setSelection(model, ["A1:A3"]);
  expect(store.statSection).toMatchObject([
    { items: [{ name: "Unique categories", value: "2" }] },
    { label: "Category occurrences" },
  ]);
});

test("statSection is recomputed when a cell's content changes", async () => {
  const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
  const { env } = await mountSpreadsheet({ model });
  const store = env.getStore(DataAnalysisStore);
  setSelection(model, ["A1:A3"]);
  expect(store.statSection?.[0].items[0].value).toBe("2");
  setCellContent(model, "A3", "cherry");
  expect(store.statSection?.[0].items[0].value).toBe("3");
});
