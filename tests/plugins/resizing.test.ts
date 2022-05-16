import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  createSheet,
  redo,
  resizeColumns,
  resizeRows,
  undo,
} from "../test_helpers/commands_helpers";

describe("Model resizer", () => {
  test("Can resize one column, undo, then redo", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const initialSize = model.getters.getCol(sheetId, 1)!.size;
    const initialWidth = model.getters.getMaxViewportSize(sheet).width;

    resizeColumns(model, ["B"], model.getters.getCol(sheetId, 1)!.size + 100);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(196);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    undo(model);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth);

    redo(model);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);
  });

  test("Cannot resize column in invalid sheet", async () => {
    const model = new Model();
    expect(resizeColumns(model, ["B"], 100, "invalid")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });
  test("Cannot resize row in invalid sheet", async () => {
    const model = new Model();
    expect(resizeRows(model, [1], 100, "invalid")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });
  test("Cannot auto resize column in invalid sheet", async () => {
    const model = new Model();
    expect(
      model.dispatch("AUTORESIZE_COLUMNS", {
        sheetId: "invalid",
        cols: [10],
      })
    ).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });
  test("Cannot auto resize row in invalid sheet", async () => {
    const model = new Model();
    expect(
      model.dispatch("AUTORESIZE_ROWS", {
        sheetId: "invalid",
        rows: [10],
      })
    ).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("Can resize one row, then undo", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const initialSize = model.getters.getRow(sheetId, 1)!.size;
    const initialHeight = model.getters.getMaxViewportSize(sheet).height;

    resizeRows(model, [1], initialSize + 100);
    expect(model.getters.getRow(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight + 100);

    undo(model);
    expect(model.getters.getRow(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight);
  });

  test("Can resize row of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeRows(model, [0], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getRow(sheet2Id, 0)).toEqual({
      cells: {},
      size: 42,
      name: "1",
    });
  });

  test("Can resize column of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeColumns(model, ["A"], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getCol(sheet2Id, 0)).toEqual({ size: 42, name: "A" });
  });

  test("changing sheets update the sizes", async () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "42" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];

    expect(model.getters.getActiveSheetId()).toBe(sheet2);
    resizeColumns(model, ["B"], model.getters.getCol(sheet2, 1)!.size + 100, sheet2);

    const initialWidth = model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width;

    activateSheet(model, sheet1);
    expect(model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width).toBe(
      initialWidth - 100
    );
  });

  test("Can resize multiple columns", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getCol(sheet, 0)!.size;

    resizeColumns(model, ["B", "D", "E"], 100);
    expect(model.getters.getCol(sheet, 1)!.size).toBe(100);
    expect(model.getters.getCol(sheet, 2)!.size).toBe(size);
    expect(model.getters.getCol(sheet, 3)!.size).toBe(100);
    expect(model.getters.getCol(sheet, 4)!.size).toBe(100);
  });

  test("Can resize multiple rows", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getRow(sheet, 0)!.size;

    resizeRows(model, [1, 3, 4], 100);

    expect(model.getters.getRow(sheet, 1)!.size).toBe(100);
    expect(model.getters.getRow(sheet, 2)!.size).toBe(size);
    expect(model.getters.getRow(sheet, 3)!.size).toBe(100);
    expect(model.getters.getRow(sheet, 4)!.size).toBe(100);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const { width: initialWidth, height: initialHeight } = model.getters.getMaxViewportSize(sheet);
    resizeColumns(model, ["B"], model.getters.getCol(sheetId, 1)!.size + 100);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    resizeRows(model, [1], model.getters.getRow(sheetId, 1)!.size + 42);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight + 42);
  });
});
