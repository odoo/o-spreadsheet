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
    const initialTop = model.getters.getCol(sheetId, 2)!.start;
    const initialWidth = model.getters.getGridDimension(sheet).width;

    resizeColumns(model, ["B"], model.getters.getCol(sheetId, 1)!.size + 100);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(196);
    expect(model.getters.getCol(sheetId, 2)!.start).toBe(initialTop + 100);
    expect(model.getters.getGridDimension(sheet).width).toBe(initialWidth + 100);

    undo(model);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheetId, 2)!.start).toBe(initialTop);
    expect(model.getters.getGridDimension(sheet).width).toBe(initialWidth);

    redo(model);
    expect(model.getters.getCol(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getCol(sheetId, 2)!.start).toBe(initialTop + 100);
    expect(model.getters.getGridDimension(sheet).width).toBe(initialWidth + 100);
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
    const initialTop = model.getters.getRow(sheetId, 2)!.start;
    const initialHeight = model.getters.getGridDimension(sheet).height;

    resizeRows(model, [1], initialSize + 100);
    expect(model.getters.getRow(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getRow(sheetId, 2)!.start).toBe(initialTop + 100);
    expect(model.getters.getGridDimension(sheet).height).toBe(initialHeight + 100);

    undo(model);
    expect(model.getters.getRow(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheetId, 2)!.start).toBe(initialTop);
    expect(model.getters.getGridDimension(sheet).height).toBe(initialHeight);
  });

  test("Can resize row of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2] = model.getters.getSheets();
    resizeRows(model, [0], 42, sheet2.id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2.id);
    expect(model.getters.getRow(sheet2.id, 0)).toEqual({
      cells: {},
      end: 42,
      size: 42,
      name: "1",
      start: 0,
    });
  });

  test("Can resize column of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2] = model.getters.getSheets();
    resizeColumns(model, ["A"], 42, sheet2.id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2.id);
    expect(model.getters.getCol(sheet2.id, 0)).toEqual({ end: 42, size: 42, name: "A", start: 0 });
  });

  test("changing sheets update the sizes", async () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "42" });
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];

    expect(model.getters.getActiveSheetId()).toBe(sheet2);
    resizeColumns(model, ["B"], model.getters.getCol(sheet2, 1)!.size + 100, sheet2);

    const initialWidth = model.getters.getGridDimension(model.getters.getActiveSheet()).width;

    activateSheet(model, sheet1);
    expect(model.getters.getGridDimension(model.getters.getActiveSheet()).width).toBe(
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
    expect(model.getters.getCol(sheet, 5)!.start).toBe(size * 2 + 100 * 3);
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
    expect(model.getters.getRow(sheet, 5)!.start).toBe(2 * size + 100 * 3);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const { width: initialWidth, height: initialHeight } = model.getters.getGridDimension(sheet);
    resizeColumns(model, ["B"], model.getters.getCol(sheetId, 1)!.size + 100);
    expect(model.getters.getGridDimension(sheet).width).toBe(initialWidth + 100);

    resizeRows(model, [1], model.getters.getRow(sheetId, 1)!.size + 42);
    expect(model.getters.getGridDimension(sheet).height).toBe(initialHeight + 42);
  });
});
