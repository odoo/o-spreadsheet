import { DEFAULT_CELL_WIDTH } from "../../src/constants";
import { getDefaultCellHeight } from "../../src/helpers";
import { Model } from "../../src/model";
import { Cell, CommandResult, Sheet } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  merge,
  redo,
  resizeColumns,
  resizeRows,
  setCellContent,
  setStyle,
  undo,
  unMerge,
} from "../test_helpers/commands_helpers";
import { DEFAULT_CELL_HEIGHT } from "./../../src/constants";

describe("Model resizer", () => {
  test("Can resize one column, undo, then redo", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const initialSize = model.getters.getColSize(sheetId, 1);
    const initialWidth = model.getters.getMaxViewportSize(sheet).width;

    resizeColumns(model, ["B"], model.getters.getColSize(sheetId, 1) + 100);
    expect(model.getters.getColSize(sheetId, 1)).toBe(196);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    undo(model);
    expect(model.getters.getColSize(sheetId, 1)).toBe(initialSize);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth);

    redo(model);
    expect(model.getters.getColSize(sheetId, 1)).toBe(initialSize + 100);
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
    const initialSize = model.getters.getRowSize(sheetId, 1);
    const initialHeight = model.getters.getMaxViewportSize(sheet).height;

    resizeRows(model, [1], initialSize + 100);
    expect(model.getters.getRowSize(sheetId, 1)).toBe(initialSize + 100);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight + 100);

    undo(model);
    expect(model.getters.getRowSize(sheetId, 1)).toBe(initialSize);
    expect(model.getters.getMaxViewportSize(sheet).height).toBe(initialHeight);
  });

  test("Can resize row of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeRows(model, [0], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getRowSize(sheet2Id, 0)).toEqual(42);
  });

  test("Can resize column of inactive sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeColumns(model, ["A"], 42, sheet2Id);
    expect(model.getters.getActiveSheetId()).not.toBe(sheet2Id);
    expect(model.getters.getColSize(sheet2Id, 0)).toEqual(42);
  });

  test("changing sheets update the sizes", async () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "42" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];

    expect(model.getters.getActiveSheetId()).toBe(sheet2);
    resizeColumns(model, ["B"], model.getters.getColSize(sheet2, 1) + 100, sheet2);

    const initialWidth = model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width;

    activateSheet(model, sheet1);
    expect(model.getters.getMaxViewportSize(model.getters.getActiveSheet()).width).toBe(
      initialWidth - 100
    );
  });

  test("Can resize multiple columns", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getColSize(sheet, 0);

    resizeColumns(model, ["B", "D", "E"], 100);
    expect(model.getters.getColSize(sheet, 1)).toBe(100);
    expect(model.getters.getColSize(sheet, 2)).toBe(size);
    expect(model.getters.getColSize(sheet, 3)).toBe(100);
    expect(model.getters.getColSize(sheet, 4)).toBe(100);
  });

  test("Can resize multiple rows", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const size = model.getters.getRowSize(sheet, 0);

    resizeRows(model, [1, 3, 4], 100);

    expect(model.getters.getRowSize(sheet, 1)).toBe(100);
    expect(model.getters.getRowSize(sheet, 2)).toBe(size);
    expect(model.getters.getRowSize(sheet, 3)).toBe(100);
    expect(model.getters.getRowSize(sheet, 4)).toBe(100);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    const sheetId = sheet.id;
    const { width: initialWidth, height: initialHeight } = model.getters.getMaxViewportSize(sheet);
    resizeColumns(model, ["B"], model.getters.getColSize(sheetId, 1) + 100);
    expect(model.getters.getMaxViewportSize(sheet).width).toBe(initialWidth + 100);

    resizeRows(model, [1], model.getters.getRowSize(sheetId, 1) + 42);
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

  describe("resize rows when changing font", () => {
    let model: Model;
    let sheet: Sheet;
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: "1",
            colNumber: 10,
            rowNumber: 10,
            rows: { 6: { size: 40 } },
            cells: {
              A1: { content: "A1", evaluated: { value: "A1" } },
              B1: { content: "B1", evaluated: { value: "B1" } },
              A4: { content: "A4", evaluated: { value: "A4" }, style: 1 },
            },
          },
        ],
        styles: { 1: { fontSize: 36 } },
      });
      sheet = model.getters.getActiveSheet();
    });

    test("After import, the rows are resized based on the font size", () => {
      expect(model.getters.getRowSize(sheet.id, 6)).toBe(40);

      expect(model.getters.getRowSize(sheet.id, 3)).toBe(
        getDefaultCellHeight({
          content: "A4",
          evaluated: { value: "A4" },
          style: { fontSize: 36 },
        } as Cell)
      );
    });

    test("Row sizes that were automatically computed based on font size are not exported", () => {
      setStyle(model, "A1", { fontSize: 36 });
      const exportedData = model.exportData();
      expect(exportedData.sheets[0].rows["0"]).toBeUndefined();
    });

    test("changing the font size change the row height", () => {
      setStyle(model, "A1", { fontSize: 22 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "A1",
          evaluated: { value: "A1" },
          style: { fontSize: 22 },
        } as Cell)
      );

      setStyle(model, "A1", { fontSize: 11 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("changing the font size don't modify row height if there is a bigger cell", () => {
      setStyle(model, "A1", { fontSize: 36 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "A1",
          evaluated: { value: "A1" },
          style: { fontSize: 36 },
        } as Cell)
      );

      setStyle(model, "B1", { fontSize: 26 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "A1",
          evaluated: { value: "A1" },
          style: { fontSize: 36 },
        } as Cell)
      );
    });

    test("changing the font size cannot set row height below default", () => {
      const style = { fontSize: 7.5 };
      setStyle(model, "A1", style);
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test.each([10, 50])(
      "changing the font size don't modify row height if the height was set manually",
      (rowSize) => {
        resizeRows(model, [0], rowSize);

        setStyle(model, "A1", { fontSize: 36 });
        expect(model.getters.getRowSize(sheet.id, 0)).toBe(rowSize);
      }
    );

    test("adding content to an empty cell update the row size", () => {
      setStyle(model, "C1", { fontSize: 36 });
      setCellContent(model, "C1", "B1");

      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "C1",
          evaluated: { value: "C1" },
          style: { fontSize: 36 },
        } as Cell)
      );
    });

    test("deleting tallest cell in the row update row height", () => {
      setStyle(model, "A1", { fontSize: 36 });
      deleteCells(model, "A1", "left");
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("deleting col with tallest cell in the row update row height", () => {
      setStyle(model, "A1", { fontSize: 36 });
      deleteColumns(model, ["A"], sheet.id);
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("deleting col with tallest cell in the row update row height", () => {
      setStyle(model, "A1", { fontSize: 36 });
      deleteColumns(model, ["A"], sheet.id);
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("adding a merge overwriting the the tallest cell in a row update row height", () => {
      setStyle(model, "A2", { fontSize: 36 });
      merge(model, "A1:A2");
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("adding a merge with top left being the the tallest cell in a row update row height", () => {
      setStyle(model, "A1", { fontSize: 36 });
      merge(model, "A1:A2");
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("adding style to merge with more than one row don't auto-resize the row", () => {
      merge(model, "A1:A2");
      setStyle(model, "A1", { fontSize: 36 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(DEFAULT_CELL_HEIGHT);
    });

    test("adding style to a single-row merge merge auto-resize the row", () => {
      merge(model, "A1:B1");
      setStyle(model, "A1", { fontSize: 36 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "A1",
          evaluated: { value: "A1" },
          style: { fontSize: 36 },
        } as Cell)
      );
    });

    test("auto-resize the row take the size of the highest single-row cell when the tallest cell is removed ", () => {
      setStyle(model, "A1", { fontSize: 36 });
      merge(model, "B1:C1");
      setStyle(model, "B1", { fontSize: 26 });
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "A1",
          evaluated: { value: "A1" },
          style: { fontSize: 36 },
        } as Cell)
      );
      deleteColumns(model, ["A"]);
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "B1",
          evaluated: { value: "B1" },
          style: { fontSize: 26 },
        } as Cell)
      );
    });

    test("removing a merge with a font height will update the row height", () => {
      merge(model, "A1:A2");
      setStyle(model, "A1", { fontSize: 36 });
      unMerge(model, "A1:A2");
      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "B1",
          evaluated: { value: "B1" },
          style: { fontSize: 36 },
        } as Cell)
      );
    });

    test("merge style don't influence auto-resizing of rows", () => {
      merge(model, "A1:A2");
      setStyle(model, "A1", { fontSize: 36 });

      setCellContent(model, "B1", "B1");
      setStyle(model, "B1", { fontSize: 18 });

      expect(model.getters.getRowSize(sheet.id, 0)).toBe(
        getDefaultCellHeight({
          content: "B1",
          evaluated: { value: "B1" },
          style: { fontSize: 18 },
        } as Cell)
      );
    });
  });
});
