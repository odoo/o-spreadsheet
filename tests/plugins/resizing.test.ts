import { DEFAULT_CELL_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  redo,
  resizeColumns,
  resizeRows,
  undo,
} from "../test_helpers/commands_helpers";
import { DEFAULT_CELL_HEIGHT } from "./../../src/constants";

describe("Model resizer", () => {
  test("Can resize one column, undo, then redo", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const initialSize = model.getters.getColInfo(sheetId, 1)!.size;
    const initialTop = model.getters.getColInfo(sheetId, 2)!.start;
    const initialWidth = model.getters.getMaxViewportSize(sheet).width;

    resizeColumns(model, ["B"], model.getters.getColInfo(sheetId, 1)!.size + 100);
    expect(model.getters.getColInfo(sheetId, 1)!.size).toBe(196);
    expect(model.getters.getColInfo(sheetId, 2)!.start).toBe(initialTop + 100);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    undo(model);
    expect(model.getters.getColInfo(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getColInfo(sheetId, 2)!.start).toBe(initialTop);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth);

    redo(model);
    expect(model.getters.getColInfo(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getColInfo(sheetId, 2)!.start).toBe(initialTop + 100);
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
    const initialSize = model.getters.getRowInfo(sheetId, 1)!.size;
    const initialTop = model.getters.getRowInfo(sheetId, 2)!.start;
    const initialHeight = model.getters.getMaxViewportSize(sheet).height;

    resizeRows(model, [1], initialSize + 100);
    expect(model.getters.getRowInfo(sheetId, 1)!.size).toBe(initialSize + 100);
    expect(model.getters.getRowInfo(sheetId, 2)!.start).toBe(initialTop + 100);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight + 100);

    undo(model);
    expect(model.getters.getRowInfo(sheetId, 1)!.size).toBe(initialSize);
    expect(model.getters.getRowInfo(sheetId, 2)!.start).toBe(initialTop);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight);
  });

  test("Can resize row of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeRows(model, [0], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getRowInfo(sheet2Id, 0)).toEqual({
      end: 42,
      size: 42,
      start: 0,
    });
  });

  test("Can resize column of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeColumns(model, ["A"], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getColInfo(sheet2Id, 0)).toEqual({ end: 42, size: 42, start: 0 });
  });

  test("changing sheets update the sizes", async () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "42" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];

    expect(model.getters.getActiveSheetId()).toBe(sheet2);
    resizeColumns(model, ["B"], model.getters.getColInfo(sheet2, 1)!.size + 100, sheet2);

    const initialWidth = model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width;

    activateSheet(model, sheet1);
    expect(model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width).toBe(
      initialWidth - 100
    );
  });

  test("Can resize multiple columns", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getColInfo(sheet, 0)!.size;

    resizeColumns(model, ["B", "D", "E"], 100);
    expect(model.getters.getColInfo(sheet, 1)!.size).toBe(100);
    expect(model.getters.getColInfo(sheet, 2)!.size).toBe(size);
    expect(model.getters.getColInfo(sheet, 3)!.size).toBe(100);
    expect(model.getters.getColInfo(sheet, 4)!.size).toBe(100);
    expect(model.getters.getColInfo(sheet, 5)!.start).toBe(size * 2 + 100 * 3);
  });

  test("Can resize multiple rows", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getRowInfo(sheet, 0)!.size;

    resizeRows(model, [1, 3, 4], 100);

    expect(model.getters.getRowInfo(sheet, 1)!.size).toBe(100);
    expect(model.getters.getRowInfo(sheet, 2)!.size).toBe(size);
    expect(model.getters.getRowInfo(sheet, 3)!.size).toBe(100);
    expect(model.getters.getRowInfo(sheet, 4)!.size).toBe(100);
    expect(model.getters.getRowInfo(sheet, 5)!.start).toBe(2 * size + 100 * 3);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const { width: initialWidth, height: initialHeight } = model.getters.getMaxViewportSize(sheet);
    resizeColumns(model, ["B"], model.getters.getColInfo(sheetId, 1)!.size + 100);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    resizeRows(model, [1], model.getters.getRowInfo(sheetId, 1)!.size + 42);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight + 42);
  });

  describe("Sheet manipulation keep resized rows/cols", () => {
    let model: Model;
    const sheetId = "id1";
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: sheetId,
            name: sheetId,
            colNumber: 10,
            rowNumber: 10,
            rows: { 2: { size: 20 }, 3: { size: 20 } },
            cols: { 2: { size: 20 }, 3: { size: 20 } },
          },
        ],
      });
    });

    test("Remove columns before", () => {
      deleteColumns(model, ["A", "B"], sheetId);
      expect(model.getters.getColSize(sheetId, 0)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 1)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 2)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 3)).toEqual(DEFAULT_CELL_WIDTH);
    });

    test("Remove columns after", () => {
      deleteColumns(model, ["E", "F"], sheetId);
      expect(model.getters.getColSize(sheetId, 0)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 1)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 2)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 3)).toEqual(20);
    });

    test("Add columns before", () => {
      addColumns(model, "after", "A", 2, sheetId);
      expect(model.getters.getColSize(sheetId, 2)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 3)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 4)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 5)).toEqual(20);
    });

    test("Add columns after", () => {
      addColumns(model, "after", "E", 2, sheetId);
      expect(model.getters.getColSize(sheetId, 2)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 3)).toEqual(20);
      expect(model.getters.getColSize(sheetId, 4)).toEqual(DEFAULT_CELL_WIDTH);
      expect(model.getters.getColSize(sheetId, 5)).toEqual(DEFAULT_CELL_WIDTH);
    });

    test("Remove rows before", () => {
      deleteRows(model, [0, 1], sheetId);
      expect(model.getters.getRowSize(sheetId, 0)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 1)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 2)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 3)).toEqual(DEFAULT_CELL_HEIGHT);
    });

    test("Remove row after", () => {
      deleteRows(model, [4, 5], sheetId);
      expect(model.getters.getRowSize(sheetId, 0)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 1)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 2)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 3)).toEqual(20);
    });

    test("Add row before", () => {
      addRows(model, "after", 0, 2, sheetId);
      expect(model.getters.getRowSize(sheetId, 2)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 3)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 4)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 5)).toEqual(20);
    });

    test("Add rows after", () => {
      addRows(model, "after", 5, 2, sheetId);
      expect(model.getters.getRowSize(sheetId, 2)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 3)).toEqual(20);
      expect(model.getters.getRowSize(sheetId, 4)).toEqual(DEFAULT_CELL_HEIGHT);
      expect(model.getters.getRowSize(sheetId, 5)).toEqual(DEFAULT_CELL_HEIGHT);
    });
  });
});
