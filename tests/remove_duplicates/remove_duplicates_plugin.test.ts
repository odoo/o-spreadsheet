import { CommandResult, HeaderIndex, Model } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { DataCleanupStore } from "../../src/plugins/ui_feature/data_cleanup";
import { NotificationStore } from "../../src/stores/notification_store";
import { getCellRawContent, getEvaluatedCell } from "../test_helpers";
import { merge, setFormat, setSelection } from "../test_helpers/commands_helpers";
import {
  createModelFromGrid,
  getRangeFormatsAsMatrix,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

export function removeDuplicates(
  model: Model,
  store: DataCleanupStore,
  colsToProcess: HeaderIndex[],
  hasHeader: boolean
) {
  const columns = {};
  for (const col of colsToProcess) {
    columns[col] = true;
  }
  store.setColumns(columns);
  store.setHasHeader(hasHeader);
  return model.dispatch("REMOVE_DUPLICATES", { columns, hasHeader });
}

describe("remove duplicates", () => {
  test("can remove duplicate", () => {
    const grid = { A2: "1", A3: "1", A4: "2", A5: "2" };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A5"]);
    removeDuplicates(model, store, [0], false);
    expect(getRangeValuesAsMatrix(model, "A2:A5")).toEqual([[1], [2], [null], [null]]);
  });

  test("selection is updated after removing duplicates", () => {
    const grid = { A2: "1", A3: "1", A4: "2", A5: "2" };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A5"]);
    removeDuplicates(model, store, [0], false);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A2:A3"));
  });

  test("apply deletion only in selected zone", () => {
    const grid = { A2: "1", A3: "1", A4: "2", A5: "2" };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A4"]);
    removeDuplicates(model, store, [0], false);
    expect(getRangeValuesAsMatrix(model, "A2:A5")).toEqual([[1], [2], [null], [2]]);
  });

  test("remove duplicates based on columns provided", () => {
    // prettier-ignore
    const grid = {
      A2: "1", B2: "la",
      A3: "1", B3: "la",
      A4: "1", B4: "land",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:B4"]);
    // provide column B to analyze
    removeDuplicates(model, store, [1], false);
    expect(getRangeValuesAsMatrix(model, "A2:B4")).toEqual([
      [1, "la"],
      [1, "land"],
      [null, null],
    ]);
  });

  test("if several rows considered identical are found, returns the first row found of these rows", () => {
    // prettier-ignore
    const grid = {
      A2: "1", B2: "B2",
      A3: "1", B3: "B3",
      A4: "1", B4: "B4",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:B4"]);
    // provide column A to analyze
    removeDuplicates(model, store, [0], false);
    expect(getRangeValuesAsMatrix(model, "B2:B4")).toEqual([["B2"], [null], [null]]);
  });

  test("For formula, take into account the evaluated cell value", () => {
    const grid = {
      A2: "42",
      A3: "=21+21",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A3"]);
    removeDuplicates(model, store, [0], false);

    expect(getEvaluatedCell(model, "A2").value).toBe(42);
    expect(getEvaluatedCell(model, "A3").value).toBe(null);
  });

  test("For formula, update the references", () => {
    const grid = {
      A2: "1",
      A3: "1",
      A4: "=A2+1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A4"]);
    removeDuplicates(model, store, [0], false);

    expect(getEvaluatedCell(model, "A2").value).toBe(1);
    expect(getEvaluatedCell(model, "A3").value).toBe(1);
    expect(getCellRawContent(model, "A3")).toBe("=A1+1");
  });

  test("dont take into account the format", () => {
    const grid = {
      B2: "42",
      B3: "42",
      B4: "42",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setFormat(model, "B2", "0.00%");
    setFormat(model, "B4", "#,##0[$€]");

    expect(getRangeValuesAsMatrix(model, "B2:B4")).toEqual([[42], [42], [42]]);
    expect(getRangeFormatsAsMatrix(model, "B2:B4")).toEqual([["0.00%"], [""], ["#,##0[$€]"]]);

    setSelection(model, ["B2:B4"]);
    removeDuplicates(model, store, [1], false);

    expect(getRangeValuesAsMatrix(model, "B2:B4")).toEqual([[42], [null], [null]]);
    expect(getRangeFormatsAsMatrix(model, "B2:B4")).toEqual([["0.00%"], [""], [""]]);
  });

  test("consider empty cell as value to compare", () => {
    const grid = {
      A1: "24",
      A4: "42",
      A6: "242",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A1:A6"]);
    removeDuplicates(model, store, [0], false);
    expect(getRangeValuesAsMatrix(model, "A1:A6")).toEqual([
      [24],
      [null],
      [42],
      [242],
      [null],
      [null],
    ]);
  });

  test("can remove duplicates with header", () => {
    // prettier-ignore
    const grid = {
      A1: "42", B1: "Michel Blanc",
      A2: "24", B2: "Michel Noir",
      A3: "42", B3: "Michel Noir",
      A4: "24", B4: "Michel Blanc",
    };

    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A1:A4"]);
    removeDuplicates(model, store, [0], true);
    expect(getRangeValuesAsMatrix(model, "A1:A4")).toEqual([[42], [24], [42], [null]]);

    setSelection(model, ["B1:B4"]);
    removeDuplicates(model, store, [1], true);
    expect(getRangeValuesAsMatrix(model, "B1:B4")).toEqual([
      ["Michel Blanc"],
      ["Michel Noir"],
      ["Michel Blanc"],
      [null],
    ]);
  });
});

describe("allow dispatch", () => {
  test("cancel if merging zone", () => {
    const grid = {
      A2: "1",
      A3: "1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    merge(model, "A1:A2");
    setSelection(model, ["A1:A3"]);
    expect(store.removeDuplicateErrors).toContain(CommandResult.WillRemoveExistingMerge);
  });

  test("throw error if more than one range selected", () => {
    const grid = {
      A2: "1",
      A3: "1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A3", "A3:A4"]);
    expect(store.removeDuplicateErrors).toContain(CommandResult.MoreThanOneRangeSelected);
  });

  test("throw error if zone doesn't contain values", () => {
    const grid = {
      A2: "1",
      A3: "1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["D10:E11"]);
    store.setColumns({ 0: true });
    store.setHasHeader(false);
    expect(store.removeDuplicateErrors).toContain(CommandResult.EmptySelectedRange);

    setSelection(model, ["C9:E11"]);
    store.setHasHeader(true);
    expect(store.removeDuplicateErrors).toContain(CommandResult.EmptySelectedRange);
  });

  test("throw error if no columns selected", () => {
    const grid = {
      A2: "1",
      A3: "1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A2:A3"]);
    store.setColumns({});
    expect(store.removeDuplicateErrors).toContain(CommandResult.NoColumnsProvided);
  });

  test("throw error if columns aren't in zone", () => {
    const grid = {
      A2: "1",
      A3: "1",
    };
    const { model, store } = makeStoreWithModel(createModelFromGrid(grid), DataCleanupStore);
    setSelection(model, ["A1:B2"]);
    store.setColumns({ 1: true, 3: true });
    expect(store.removeDuplicateErrors).toContain(CommandResult.ColumnsNotIncludedInZone);
  });
});

describe("notify user", () => {
  test("notify when row removed", async () => {
    const grid = {
      A1: "42",
      A2: "42",
    };
    const { model, store, container } = makeStoreWithModel(
      createModelFromGrid(grid),
      DataCleanupStore
    );
    const notificationStore = container.get(NotificationStore);
    const notifyUserTextSpy = jest.spyOn(notificationStore, "notifyUser");
    setSelection(model, ["A1:A2"]);
    removeDuplicates(model, store, [0], false);
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "1 duplicate rows found and removed.\n1 unique rows remain.",
      type: "info",
      sticky: false,
    });
  });

  test("notify when no row removed", async () => {
    const grid = {
      A1: "42",
      A2: "24",
    };
    const { model, store, container } = makeStoreWithModel(
      createModelFromGrid(grid),
      DataCleanupStore
    );
    const notificationStore = container.get(NotificationStore);
    const notifyUserTextSpy = jest.spyOn(notificationStore, "notifyUser");
    setSelection(model, ["A1:A2"]);
    removeDuplicates(model, store, [0], false);
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "0 duplicate rows found and removed.\n2 unique rows remain.",
      type: "info",
      sticky: false,
    });
  });
});
