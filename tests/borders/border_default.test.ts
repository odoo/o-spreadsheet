import {
  AbstractCellClipboardHandler,
  Border,
  ClipboardPasteTarget,
  Model,
  UID,
  Zone,
} from "../../src";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { toCartesian, toXC, toZone } from "../../src/helpers";
import { getClipboardDataPositions } from "../../src/helpers/clipboard/clipboard_helpers";
import { clipboardHandlersRegistries } from "../../src/registries/clipboardHandlersRegistries";
import {
  addColumns,
  addRows,
  deleteCells,
  deleteColumns,
  deleteRows,
  insertCells,
  moveColumns,
  moveRows,
} from "../test_helpers";
import { target } from "../test_helpers/helpers";

const TOP_BORDER = { top: DEFAULT_BORDER_DESC };
const TOP_BORDER_ALT = { top: { style: "dotted" as const, color: "red" } };
const BOTTOM_BORDER = { bottom: DEFAULT_BORDER_DESC };
const LEFT_BORDER = { left: DEFAULT_BORDER_DESC };
const RIGHT_BORDER = { right: DEFAULT_BORDER_DESC };
const RIGHT_BORDER_ALT = { right: { style: "thick" as const, color: "blue" } };
const VERTICAL_BORDER = { left: DEFAULT_BORDER_DESC, right: DEFAULT_BORDER_DESC };
const HORIZONTAL_BORDER = { top: DEFAULT_BORDER_DESC, bottom: DEFAULT_BORDER_DESC };
const ALL_BORDER = {
  top: DEFAULT_BORDER_DESC,
  bottom: DEFAULT_BORDER_DESC,
  left: DEFAULT_BORDER_DESC,
  right: DEFAULT_BORDER_DESC,
};

const TEST_BORDERS: Border[] = [
  TOP_BORDER,
  BOTTOM_BORDER,
  LEFT_BORDER,
  RIGHT_BORDER,
  VERTICAL_BORDER,
  HORIZONTAL_BORDER,
  TOP_BORDER_ALT,
  RIGHT_BORDER_ALT,
];

function getCellBorder(model: Model, xc: string, sheetId: UID = model.getters.getActiveSheetId()) {
  return model.getters.getCellBorder({ sheetId, ...toCartesian(xc) });
}

describe("Default Borders", () => {
  let model: Model;
  let sheetId: UID;
  beforeEach(() => {
    model = new Model({
      sheets: [{ id: "sh1", colNumber: 26, rowNumber: 20 }],
    });
    sheetId = model.getters.getActiveSheetId();
  });

  describe.each(TEST_BORDERS)("Border : %s", (border) => {
    test("Can set border on sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border,
      });

      expect(getCellBorder(model, "A1")).toEqual(border);
      expect(getCellBorder(model, "A5")).toEqual(border);
      expect(getCellBorder(model, "A20")).toEqual(border);
      expect(getCellBorder(model, "D1")).toEqual(border);
      expect(getCellBorder(model, "D5")).toEqual(border);
      expect(getCellBorder(model, "D20")).toEqual(border);
      expect(getCellBorder(model, "Z1")).toEqual(border);
      expect(getCellBorder(model, "Z5")).toEqual(border);
      expect(getCellBorder(model, "Z20")).toEqual(border);
    });

    test("Can set border on row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 2, 2)],
        border,
      });

      expect(getCellBorder(model, "A3")).toEqual(border);
      expect(getCellBorder(model, "D3")).toEqual(border);
      expect(getCellBorder(model, "Y3")).toEqual(border);
      expect(getCellBorder(model, "D5")).toBeNull();
    });

    test("Can set border on col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 2, 2)],
        border,
      });

      expect(getCellBorder(model, "C1")).toEqual(border);
      expect(getCellBorder(model, "C3")).toEqual(border);
      expect(getCellBorder(model, "C20")).toEqual(border);
      expect(getCellBorder(model, "A5")).toBeNull();
    });
  });

  describe.each([
    [TOP_BORDER, TOP_BORDER_ALT],
    [TOP_BORDER_ALT, TOP_BORDER_ALT],
  ])("Defaults Combination", (border1, border2) => {
    test("Row after sheet", () => {
      const sheetBorder = border1;
      const rowBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Row after col", () => {
      const colBorder = border1;
      const rowBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Row after row", () => {
      const rowBorder = border1;
      const rowBorder2 = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder2,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder2);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder2);
    });

    test("Row after cell", () => {
      const rowBorder = border2;
      const cellBorder = border1;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Col after sheet", () => {
      const sheetBorder = border1;
      const colBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Col after col", () => {
      const colBorder = border1;
      const colBorder2 = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder2,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder2);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(colBorder2);
    });

    test("Col after row", () => {
      const rowBorder = border1;
      const colBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Col after cell", () => {
      const colBorder = border2;
      const cellBorder = border1;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Sheet after sheet", () => {
      const sheetBorder = border1;
      const sheetBorder2 = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder2,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder2);
    });

    test("Sheet after col", () => {
      const colBorder = border1;
      const sheetBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Sheet after row", () => {
      const rowBorder = border1;
      const sheetBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Sheet after cell", () => {
      const cellBorder = border1;
      const sheetBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Cell after sheet", () => {
      const sheetBorder = border1;
      const cellBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: sheetBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });

    test("Cell after col", () => {
      const colBorder = border1;
      const cellBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: colBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });

    test("Cell after row", () => {
      const rowBorder = border1;
      const cellBorder = border2;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: rowBorder,
      });
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: target("B2"),
        border: cellBorder,
      });

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });
  });

  describe("Sheet Manipulation: Add Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: ALL_BORDER,
      });
      addColumns(model, "after", "A", 1);
      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: ALL_BORDER,
      });
      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C2")).toBeNull();

      addColumns(model, "after", "A", 1);
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(ALL_BORDER);

      addColumns(model, "after", "C", 1);
      expect(getCellBorder(model, "C2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "D2")).toBeNull();
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: ALL_BORDER,
      });
      addColumns(model, "after", "A", 1);
      expect(getCellBorder(model, "A2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });
  });

  describe("Sheet Manipulation: Remove Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();

      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Move Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "D2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "D2")).toBeNull();

      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "D2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "D2")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Add Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "A3")).toEqual(TOP_BORDER);

      addRows(model, "after", 2, 1);
      expect(getCellBorder(model, "A3")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A4")).toBeNull();
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B3")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "A1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Remove Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteRows(model, [0]);
      expect(getCellBorder(model, "A1")).toEqual(TOP_BORDER);

      deleteRows(model, [0]);
      expect(getCellBorder(model, "A1")).toBeNull();
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteRows(model, [1]);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      deleteRows(model, [1]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Move Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "A4")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B4")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A4")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Delete Cell Up", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B19")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Delete Cell Left", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "Z2")).toBeNull();
    });
  });

  describe("Sheet Manipulation: Insert Cell Down", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B3")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B21")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B21")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Insert Cell Right", () => {
    test("Default Row", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "right");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "right");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        border: TOP_BORDER,
      });
      insertCells(model, "B2", "right");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(TOP_BORDER);
    });
  });

  const COL = (col) => ({ left: col, right: col, top: 0, bottom: 19 });
  const ROW = (row) => ({ left: 0, right: 25, top: row, bottom: row });
  const SHEET = { left: 0, right: 25, top: 0, bottom: 19 };

  test.each([
    [[COL(2), TOP_BORDER]],
    [[ROW(2), TOP_BORDER]],
    [[SHEET, TOP_BORDER]],
    [
      [ROW(2), TOP_BORDER_ALT],
      [COL(2), TOP_BORDER],
    ],
    [
      [COL(2), TOP_BORDER],
      [ROW(2), TOP_BORDER_ALT],
    ],
    [
      [SHEET, TOP_BORDER_ALT],
      [COL(2), TOP_BORDER],
      [ROW(2), TOP_BORDER],
    ],
  ] as [Zone, Border][][])("Clipboard : copy partial sheet (border) > %s", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers.getKeys().map((handlerName) => {
      const handler = clipboardHandlersRegistries.cellHandlers.get(handlerName);
      return [handlerName, new handler(model.getters, model.dispatch)] as [
        string,
        AbstractCellClipboardHandler<any, any>
      ];
    });
    for (const command of commands) {
      const [zone, border] = command;
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [zone],
        border,
      });
    }

    const gridState: (Border | null)[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellBorder(model, toXC(col, row));
      }
    }
    gridState.push([]);

    const copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [toZone("B2:D4")]);
    for (const [handlerName, handler] of handlers) {
      copiedData[handlerName] = handler.copy(clipboardData, false);
    }

    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: [model.getters.getSheetZone(sheetId)],
    });

    const pasteTarget: ClipboardPasteTarget = { sheetId, zones: target("B2") };
    for (const [handlerName, handler] of handlers) {
      handler.paste(pasteTarget, copiedData[handlerName], { isCutOperation: false });
    }

    expect(getCellBorder(model, toXC(0, 0))).toBeNull();
    expect(getCellBorder(model, toXC(0, 1))).toBeNull();
    expect(getCellBorder(model, toXC(0, 2))).toBeNull();
    expect(getCellBorder(model, toXC(0, 3))).toBeNull();
    expect(getCellBorder(model, toXC(0, 4))).toBeNull();

    expect(getCellBorder(model, toXC(1, 0))).toBeNull();
    expect(getCellBorder(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellBorder(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellBorder(model, toXC(1, 3))).toEqual(gridState[1][3]);
    expect(getCellBorder(model, toXC(1, 4))).toBeNull();

    expect(getCellBorder(model, toXC(2, 0))).toBeNull();
    expect(getCellBorder(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellBorder(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellBorder(model, toXC(2, 3))).toEqual(gridState[2][3]);
    expect(getCellBorder(model, toXC(2, 4))).toBeNull();

    expect(getCellBorder(model, toXC(3, 0))).toBeNull();
    expect(getCellBorder(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellBorder(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellBorder(model, toXC(3, 3))).toEqual(gridState[3][3]);
    expect(getCellBorder(model, toXC(3, 4))).toBeNull();

    expect(getCellBorder(model, toXC(4, 0))).toBeNull();
    expect(getCellBorder(model, toXC(4, 1))).toBeNull();
    expect(getCellBorder(model, toXC(4, 2))).toBeNull();
    expect(getCellBorder(model, toXC(4, 3))).toBeNull();
    expect(getCellBorder(model, toXC(4, 4))).toBeNull();
  });

  test.each([
    [[COL(2), TOP_BORDER]],
    [[ROW(2), TOP_BORDER]],
    [[SHEET, TOP_BORDER]],
    [
      [ROW(2), TOP_BORDER_ALT],
      [COL(2), TOP_BORDER],
    ],
    [
      [COL(2), TOP_BORDER],
      [ROW(2), TOP_BORDER_ALT],
    ],
    [
      [SHEET, TOP_BORDER_ALT],
      [COL(2), TOP_BORDER],
      [ROW(2), TOP_BORDER],
    ],
  ] as [Zone, Border][][])("Clipboard : copy whole sheet (border) > %s", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      model.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        target: [command[0]],
        border: command[1],
      });
    }

    const gridState: (Border | null)[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellBorder(model, toXC(col, row));
      }
    }
    gridState.push([]);

    let copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [toZone("A1:Y20")]);
    for (const handler of handlers) {
      copiedData = { ...copiedData, ...handler.copy(clipboardData, false) };
    }

    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: [model.getters.getSheetZone(sheetId)],
    });

    const pasteTarget: ClipboardPasteTarget = { sheetId, zones: target("A1") };
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, { isCutOperation: false });
    }

    expect(getCellBorder(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellBorder(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellBorder(model, toXC(1, 3))).toEqual(gridState[1][3]);

    expect(getCellBorder(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellBorder(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellBorder(model, toXC(2, 3))).toEqual(gridState[2][3]);

    expect(getCellBorder(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellBorder(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellBorder(model, toXC(3, 3))).toEqual(gridState[3][3]);
  });
});
