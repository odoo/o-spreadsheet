import {
  AbstractCellClipboardHandler,
  Border,
  ClipboardPasteTarget,
  Model,
  UID,
  Zone,
} from "../../src";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { getClipboardDataPositions } from "../../src/helpers/clipboard/clipboard_helpers";
import { toCartesian, toXC } from "../../src/helpers/coordinates";
import { toZone, zoneToXc } from "../../src/helpers/zones";
import { clipboardHandlersRegistries } from "../../src/registries/clipboardHandlersRegistries";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import {
  activateSheet,
  addColumns,
  addRows,
  clearFormatting,
  copy,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  duplicateSheet,
  insertCells,
  moveColumns,
  moveRows,
  paste,
  redo,
  setBordersOnTarget,
  setZoneBorders,
  undo,
} from "../test_helpers";
import { target } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

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
    makeStoreWithModel(model, ClipboardStore);
    sheetId = model.getters.getActiveSheetId();
  });

  describe.each(TEST_BORDERS)("Border : %s", (border) => {
    test("Can set border on sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], border);

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
      setBordersOnTarget(model, ["A3:Z3"], border);

      expect(getCellBorder(model, "A3")).toEqual(border);
      expect(getCellBorder(model, "D3")).toEqual(border);
      expect(getCellBorder(model, "Y3")).toEqual(border);
      expect(getCellBorder(model, "D5")).toBeNull();
    });

    test("Can set border on col", () => {
      setBordersOnTarget(model, ["C1:C20"], border);

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
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Row after col", () => {
      const colBorder = border1;
      const rowBorder = border2;
      setBordersOnTarget(model, ["B1:B20"], colBorder);
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Row after row", () => {
      const rowBorder = border1;
      const rowBorder2 = border2;
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);
      setBordersOnTarget(model, ["A2:Z2"], rowBorder2);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder2);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder2);
    });

    test("Row after cell", () => {
      const rowBorder = border2;
      const cellBorder = border1;
      setBordersOnTarget(model, ["B2"], cellBorder);
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(rowBorder);
    });

    test("Col after sheet", () => {
      const sheetBorder = border1;
      const colBorder = border2;
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);
      setBordersOnTarget(model, ["B1:B20"], colBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Col after col", () => {
      const colBorder = border1;
      const colBorder2 = border2;
      setBordersOnTarget(model, ["B1:B20"], colBorder);
      setBordersOnTarget(model, ["B1:B20"], colBorder2);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder2);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(colBorder2);
    });

    test("Col after row", () => {
      const rowBorder = border1;
      const colBorder = border2;
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);
      setBordersOnTarget(model, ["B1:B20"], colBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Col after cell", () => {
      const colBorder = border2;
      const cellBorder = border1;
      setBordersOnTarget(model, ["B2"], cellBorder);
      setBordersOnTarget(model, ["B1:B20"], colBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(colBorder);
    });

    test("Sheet after sheet", () => {
      const sheetBorder = border1;
      const sheetBorder2 = border2;
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder2);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder2);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder2);
    });

    test("Sheet after col", () => {
      const colBorder = border1;
      const sheetBorder = border2;
      setBordersOnTarget(model, ["B1:B20"], colBorder);
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Sheet after row", () => {
      const rowBorder = border1;
      const sheetBorder = border2;
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Sheet after cell", () => {
      const cellBorder = border1;
      const sheetBorder = border2;
      setBordersOnTarget(model, ["B2"], cellBorder);
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(sheetBorder);
    });

    test("Cell after sheet", () => {
      const sheetBorder = border1;
      const cellBorder = border2;
      setBordersOnTarget(model, ["A1:Z20"], sheetBorder);
      setBordersOnTarget(model, ["B2"], cellBorder);

      expect(getCellBorder(model, "A1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B1")).toEqual(sheetBorder);
      expect(getCellBorder(model, "A2")).toEqual(sheetBorder);
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });

    test("Cell after col", () => {
      const colBorder = border1;
      const cellBorder = border2;
      setBordersOnTarget(model, ["B1:B20"], colBorder);
      setBordersOnTarget(model, ["B2"], cellBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toEqual(colBorder);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });

    test("Cell after row", () => {
      const rowBorder = border1;
      const cellBorder = border2;
      setBordersOnTarget(model, ["A2:Z2"], rowBorder);
      setBordersOnTarget(model, ["B2"], cellBorder);

      expect(getCellBorder(model, "A1")).toBeNull();
      expect(getCellBorder(model, "B1")).toBeNull();
      expect(getCellBorder(model, "A2")).toEqual(rowBorder);
      expect(getCellBorder(model, "B2")).toEqual(cellBorder);
    });
  });

  describe("Sheet Manipulation: Add Column", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], ALL_BORDER);
      addColumns(model, "after", "A", 1);
      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], ALL_BORDER);
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
      setBordersOnTarget(model, ["A1:Z20"], ALL_BORDER);
      addColumns(model, "after", "A", 1);
      expect(getCellBorder(model, "A2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });

    test("The bottom border is kept when the bordered zone spans the whole sheet height", () => {
      const model = new Model({ sheets: [{ id: "sh1", colNumber: 10, rowNumber: 3 }] });
      setZoneBorders(model, { position: "all" }, ["A1:B3"]);

      addColumns(model, "after", "A", 1);

      expect(getCellBorder(model, "A3")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B3")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C3")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "D3")).toBeNull();
    });

    test("borders.ts:812 — inserting a column keeps a sheet-wide border as a sheet default, not per-cell borders", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A1:Z100"]);

      addColumns(model, "after", "A", 1);

      expect(getCellBorder(model, "B50")).toEqual(ALL_BORDER);
      expect(model.exportData().sheets[0].borders).toEqual({});
    });

    test("borders.ts:771 — columns added after the last column do not inherit a row default that did not reach it", () => {
      const model = new Model();
      setZoneBorders(model, { position: "top" }, ["A1:Z1"]);
      setZoneBorders(model, { position: "left" }, ["A1:P1"]);

      addColumns(model, "after", "Z", 5);

      expect(getCellBorder(model, "AC1")).toBeNull();
    });

    test("borders.ts:771 — a column added after the last column does not inherit a left border the old last column did not have", () => {
      const model = new Model();
      setZoneBorders(model, { position: "left" }, ["A1:A100", "B1:B100"]);
      addColumns(model, "after", "A", 40);

      addColumns(model, "after", "BN", 1);

      expect(getCellBorder(model, "BN5")).toBeNull();
      expect(getCellBorder(model, "BO5")).toBeNull();
    });
  });

  describe("Sheet Manipulation: Remove Column", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();

      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      deleteColumns(model, ["A"]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Removing several non-consecutive columns keeps the borders of the other columns", () => {
      setZoneBorders(model, { position: "all" }, ["D1"]);

      deleteColumns(model, ["A", "C"]);

      // D1 is shifted left by the two removed columns
      expect(getCellBorder(model, "B1")).toEqual(ALL_BORDER);
    });

    test("Removing the column right of a bordered column keeps its right border", () => {
      setZoneBorders(model, { position: "all" }, ["B1:B20"]);

      deleteColumns(model, ["C"]);

      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });
  });

  describe("Sheet Manipulation: Move Column", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "D2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
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
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      moveColumns(model, "D", ["A"], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "D2")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Add Row", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "A3")).toEqual(TOP_BORDER);

      addRows(model, "after", 2, 1);
      expect(getCellBorder(model, "A3")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A4")).toBeNull();
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B3")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      addRows(model, "after", 0, 1);
      expect(getCellBorder(model, "A1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });

    test("The right border is kept when the bordered zone spans the whole sheet width", () => {
      const model = new Model({ sheets: [{ id: "sh1", colNumber: 3, rowNumber: 10 }] });
      setZoneBorders(model, { position: "all" }, ["A1:C2"]);

      addRows(model, "after", 0, 1);

      expect(getCellBorder(model, "C1")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C3")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C4")).toBeNull();
    });

    test("Adding a row on a sheet with a large number of cell borders does not overflow the stack", () => {
      // The bordered zone must stay under half of the sheet in both dimensions,
      // so that its borders are stored per cell rather than as column/row defaults.
      const model = new Model({ sheets: [{ id: "sh1", colNumber: 1000, rowNumber: 1000 }] });
      setZoneBorders(model, { position: "all" }, ["A1:OJ400"]);

      expect(() => addRows(model, "before", 500, 1)).not.toThrow();
    });

    test("borders.ts:771 — rows added after the last row do not inherit a column default that did not reach it", () => {
      const model = new Model();
      setZoneBorders(model, { position: "left" }, ["A1:A60"]);

      addRows(model, "after", 99, 20);

      expect(getCellBorder(model, "A100")).toBeNull();
      expect(getCellBorder(model, "A110")).toBeNull();
    });
  });

  describe("Sheet Manipulation: Remove Row", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      deleteRows(model, [0]);
      expect(getCellBorder(model, "A1")).toEqual(TOP_BORDER);

      deleteRows(model, [0]);
      expect(getCellBorder(model, "A1")).toBeNull();
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      deleteRows(model, [1]);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      deleteRows(model, [1]);
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
    });

    test("Removing several non-consecutive rows keeps the borders of the other rows", () => {
      setZoneBorders(model, { position: "all" }, ["A4"]);

      deleteRows(model, [0, 2]);

      // A4 is shifted up by the two removed rows
      expect(getCellBorder(model, "A2")).toEqual(ALL_BORDER);
    });

    test("Removing the row below a bordered row keeps its bottom border", () => {
      setZoneBorders(model, { position: "all" }, ["A2:Z2"]);

      deleteRows(model, [2]);

      expect(getCellBorder(model, "B2")).toEqual(ALL_BORDER);
    });

    test("borders.ts:859 — deleting a row inside a bordered column keeps the line between the rows around it", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A1:A100"]);

      deleteRows(model, [49]);

      expect(getCellBorder(model, "A49")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "A50")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "A51")).toEqual(ALL_BORDER);
    });
  });

  describe("Sheet Manipulation: Move Row", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "A2")).toBeNull();
      expect(getCellBorder(model, "A4")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B4")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      moveRows(model, 3, [1], "after");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "A4")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Delete Cell Up", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      deleteCells(model, "B1", "up");
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B19")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Delete Cell Left", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B1")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toBeNull();
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      deleteCells(model, "A2", "left");
      expect(getCellBorder(model, "A2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "B2")).toEqual(TOP_BORDER);
      expect(getCellBorder(model, "Z2")).toBeNull();
    });
  });

  describe("Sheet Manipulation: Insert Cell Down", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B3")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B21")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
      insertCells(model, "B2", "down");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "B21")).toEqual(TOP_BORDER);
    });
  });

  describe("Sheet Manipulation: Insert Cell Right", () => {
    test("Default Row", () => {
      setBordersOnTarget(model, ["A2:Z2"], TOP_BORDER);
      insertCells(model, "B2", "right");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(TOP_BORDER);
    });

    test("Default Col", () => {
      setBordersOnTarget(model, ["B1:B20"], TOP_BORDER);
      insertCells(model, "B2", "right");
      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toEqual(TOP_BORDER);
    });

    test("Default Sheet", () => {
      setBordersOnTarget(model, ["A1:Z20"], TOP_BORDER);
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
      setBordersOnTarget(model, [zoneToXc(zone)], border);
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
      setBordersOnTarget(model, [zoneToXc(command[0])], command[1]);
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

  describe("Clear Formatting", () => {
    test("Clearing a zone overlapping several default columns clears all of them", () => {
      setZoneBorders(model, { position: "all" }, ["C1:C20", "F1:F20", "I1:I20"]);

      clearFormatting(model, "A5:J7");

      for (const col of ["C", "F", "I"]) {
        expect(getCellBorder(model, `${col}5`)).toBeNull();
        expect(getCellBorder(model, `${col}6`)).toBeNull();
        expect(getCellBorder(model, `${col}7`)).toBeNull();
        // the rest of the column is untouched
        expect(getCellBorder(model, `${col}1`)).toEqual(ALL_BORDER);
        expect(getCellBorder(model, `${col}4`)).toEqual({
          top: DEFAULT_BORDER_DESC,
          left: DEFAULT_BORDER_DESC,
          right: DEFAULT_BORDER_DESC,
        });
        expect(getCellBorder(model, `${col}8`)).toEqual({
          bottom: DEFAULT_BORDER_DESC,
          left: DEFAULT_BORDER_DESC,
          right: DEFAULT_BORDER_DESC,
        });
        expect(getCellBorder(model, `${col}20`)).toEqual(ALL_BORDER);
      }
    });

    test("Clearing a zone smaller than the sheet clears the sheet default border", () => {
      setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

      clearFormatting(model, "B2:C3");

      expect(getCellBorder(model, "B2")).toBeNull();
      expect(getCellBorder(model, "C2")).toBeNull();
      expect(getCellBorder(model, "B3")).toBeNull();
      expect(getCellBorder(model, "C3")).toBeNull();
      // the surrounding cells keep the borders they own
      expect(getCellBorder(model, "A1")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B1")).toEqual({
        top: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
      expect(getCellBorder(model, "A2")).toEqual({
        top: DEFAULT_BORDER_DESC,
        bottom: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
      });
      expect(getCellBorder(model, "D2")).toEqual({
        top: DEFAULT_BORDER_DESC,
        bottom: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
      expect(getCellBorder(model, "B4")).toEqual({
        bottom: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
      expect(getCellBorder(model, "D4")).toEqual(ALL_BORDER);
    });

    test("Clearing a whole column of a sheet-wide border clears its left and right borders", () => {
      setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

      clearFormatting(model, "C1:C20");

      expect(getCellBorder(model, "C3")).toBeNull();
    });

    test("Clearing a whole row of a sheet-wide border clears its top and bottom borders", () => {
      setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

      clearFormatting(model, "A3:Z3");

      expect(getCellBorder(model, "C3")).toBeNull();
    });

    test("borders.ts:686 — clearing a cell inside a sheet-wide border keeps the sides of its neighbours", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A1:Z100"]);

      clearFormatting(model, "B2");

      expect(getCellBorder(model, "A2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B1")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "C2")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "B3")).toEqual(ALL_BORDER);
    });

    test("borders.ts:596 — clearing the end of a bordered column keeps the bottom of the cell above", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A1:A100"]);

      clearFormatting(model, "A10:A100");

      expect(getCellBorder(model, "A9")).toEqual(ALL_BORDER);
    });
  });

  test("a border on a row-wide zone does not leak a right border onto the last column", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, ["A1:P1"]);

    expect(getCellBorder(model, "P1")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "Z1")).toBeNull();
  });

  test("a border on a column-wide zone does not leak a bottom border onto the last row", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, ["A1:A60"]);

    expect(getCellBorder(model, "A60")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "A100")).toBeNull();
  });

  test("a sheet-default border does not leak onto the last row and column", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, ["B2:Y99"]);

    expect(getCellBorder(model, "Y99")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "Z99")).toBeNull();
    expect(getCellBorder(model, "B100")).toBeNull();
    expect(getCellBorder(model, "Z100")).toBeNull();
  });

  test("inner borders on the whole sheet do not add a bottom/right border on the last cell", () => {
    const model = new Model();
    setZoneBorders(model, { position: "hv" }, ["A1:Z100"]);

    expect(getCellBorder(model, "Z100")).toEqual({
      left: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("Clipboard : a cleared row is still cleared once pasted", () => {
    setZoneBorders(model, { position: "all" }, ["A1:Z20"]);
    clearFormatting(model, "A3:Z3");

    copy(model, "A2:C4");
    paste(model, "E10");

    // E11:G11 is the pasted copy of the cleared row 3
    expect(getCellBorder(model, "E11")).toBeNull();
    expect(getCellBorder(model, "F11")).toBeNull();
    expect(getCellBorder(model, "G11")).toBeNull();
    // the rows around it are still bordered
    expect(getCellBorder(model, "F10")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "F12")).toEqual(ALL_BORDER);
  });

  test("Clipboard : a zone inheriting a sheet-wide border is pasted with its four sides", () => {
    setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

    copy(model, "B2:C3");
    paste(model, "E5");

    expect(getCellBorder(model, "E5")).toEqual(ALL_BORDER);
  });

  test("An explicit null border overrides the inherited default border", () => {
    setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

    setBordersOnTarget(model, ["C3"], { top: null, bottom: null, left: null, right: null });

    expect(getCellBorder(model, "C3")).toBeNull();
    expect(getCellBorder(new Model(model.exportData()), "C3")).toBeNull();
  });

  test("Clipboard does not generates a bunch of commands", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: [],
          dataValidationRules: [],
          figures: [],
          tables: [],
          isVisible: true,
        },
      ],
    });
    makeStoreWithModel(model, ClipboardStore);
    setZoneBorders(model, { position: "all" }, ["A1:AN40"]);
    copy(model, "A1:AN40");

    const borderCommands: string[] = [];
    model.on("command-dispatched", null, (cmd: any) => {
      if (cmd.type.includes("BORDER")) {
        borderCommands.push(cmd.type);
      }
    });

    paste(model, "A60");
    expect(borderCommands.length).toBeLessThan(10);
  });

  test("borders_clipboard.ts:86 — pasting a cell with an inner vertical sheet border on another sheet copies the exact cell border", () => {
    const model = new Model();
    makeStoreWithModel(model, ClipboardStore);
    setZoneBorders(model, { position: "v" }, ["A1:Z100"]);
    createSheet(model, { sheetId: "s2" });
    expect(getCellBorder(model, "C3")).toEqual(VERTICAL_BORDER);

    copy(model, "C3");
    activateSheet(model, "s2");
    paste(model, "D5");

    expect(getCellBorder(model, "D5")).toEqual(VERTICAL_BORDER);
  });

  test("borders_clipboard.ts:86 — pasting a cell with a sheet-wide left border on another sheet only pastes a left border", () => {
    const model = new Model();
    makeStoreWithModel(model, ClipboardStore);
    setBordersOnTarget(model, ["A1:Z100"], LEFT_BORDER);
    createSheet(model, { sheetId: "s2" });

    copy(model, "C3");
    activateSheet(model, "s2");
    paste(model, "D5");

    expect(getCellBorder(model, "D5")).toEqual(LEFT_BORDER);
  });

  test("borders_clipboard.ts:86 — pasting a cell with a sheet-wide bottom border on another sheet pastes a bottom border, not a top one", () => {
    const model = new Model();
    makeStoreWithModel(model, ClipboardStore);
    setBordersOnTarget(model, ["A1:Z100"], BOTTOM_BORDER);
    createSheet(model, { sheetId: "s2" });

    copy(model, "B2");
    activateSheet(model, "s2");
    paste(model, "D5");

    expect(getCellBorder(model, "D5")).toEqual(BOTTOM_BORDER);
  });

  test("borders_clipboard.ts:97 — pasting many full-width bordered rows does not dispatch one command per row", () => {
    const model = new Model();
    makeStoreWithModel(model, ClipboardStore);
    setZoneBorders(model, { position: "all" }, ["A1:Z50"]);
    copy(model, "A1:Z50");

    const borderCommands: string[] = [];
    model.on("command-dispatched", null, (cmd: any) => {
      if (cmd.type === "SET_BORDERS_ON_TARGET") {
        borderCommands.push(cmd.type);
      }
    });
    paste(model, "A60");

    expect(borderCommands.length).toBeLessThan(10);
  });

  test("borders_clipboard.ts:97 — pasted full-width bordered rows keep all their sides", () => {
    const model = new Model();
    makeStoreWithModel(model, ClipboardStore);
    setZoneBorders(model, { position: "all" }, ["A1:Z50"]);

    copy(model, "A1:Z50");
    paste(model, "A51");

    expect(getCellBorder(model, "C20")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "C70")).toEqual(ALL_BORDER);
  });

  describe("Undo/Redo", () => {
    test("Setting a column default border can be undone and redone", () => {
      setBordersOnTarget(model, ["C1:C20"], ALL_BORDER);

      undo(model);
      expect(getCellBorder(model, "C5")).toBeNull();

      redo(model);
      expect(getCellBorder(model, "C5")).toEqual(ALL_BORDER);
    });

    test("Undoing the removal of a column restores its default border", () => {
      setBordersOnTarget(model, ["C1:C20"], ALL_BORDER);

      deleteColumns(model, ["C"]);
      expect(getCellBorder(model, "C5")).toBeNull();

      undo(model);
      expect(getCellBorder(model, "B5")).toBeNull();
      expect(getCellBorder(model, "C5")).toEqual(ALL_BORDER);
      expect(getCellBorder(model, "D5")).toBeNull();
    });

    test("A sheet default border can be undone and redone", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A1:Z100"]);
      expect(getCellBorder(model, "C5")).toEqual(ALL_BORDER);

      undo(model);
      expect(getCellBorder(model, "C5")).toBeNull();

      redo(model);
      expect(getCellBorder(model, "C5")).toEqual(ALL_BORDER);
    });

    test("A row default border can be undone and redone", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["A3:Z3"]);
      expect(getCellBorder(model, "C3")).toEqual(ALL_BORDER);

      undo(model);
      expect(getCellBorder(model, "C3")).toBeNull();

      redo(model);
      expect(getCellBorder(model, "C3")).toEqual(ALL_BORDER);
    });

    test("An explicit null override inside a column default can be undone and redone", () => {
      const model = new Model();
      setZoneBorders(model, { position: "all" }, ["C1:C100"]);
      setBordersOnTarget(model, ["C5"], { top: null, bottom: null, left: null, right: null });
      expect(getCellBorder(model, "C5")).toBeNull();

      undo(model);
      expect(getCellBorder(model, "C5")).toEqual(ALL_BORDER);

      redo(model);
      expect(getCellBorder(model, "C5")).toBeNull();
    });
  });

  test("A duplicated sheet does not share its default borders with the original sheet", () => {
    setBordersOnTarget(model, ["C1:C20"], ALL_BORDER);
    duplicateSheet(model, sheetId, "copy");
    expect(getCellBorder(model, "C5", "copy")).toEqual(ALL_BORDER);

    addColumns(model, "before", "A", 1, sheetId);

    expect(getCellBorder(model, "D5", sheetId)).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "C5", "copy")).toEqual(ALL_BORDER);
    expect(getCellBorder(model, "D5", "copy")).toBeNull();
  });

  test("The colors of a column default border are part of the sheet border colors", () => {
    setBordersOnTarget(model, ["C1:C20"], { top: { style: "thin", color: "#FF0000" } });

    expect(model.getters.getBordersColors(sheetId)).toEqual(["#FF0000"]);
  });

  describe("Import/Export", () => {
    test("Sheet-wide default border with internal border should not change on import/export", () => {
      setBordersOnTarget(model, ["A1:Z20"], {
        left: { style: "thin", color: "#000000" },
      });
      expect(getCellBorder(model, "C3")).toEqual({ left: { style: "thin", color: "#000000" } });

      const imported = new Model(model.exportData());

      expect(getCellBorder(imported, "C3")).toEqual({ left: { style: "thin", color: "#000000" } });
    });

    test("Sheet-wide default border on all sides keeps its right and bottom on import/export", () => {
      setZoneBorders(model, { position: "all" }, ["A1:Z20"]);

      const imported = new Model(model.exportData());

      expect(getCellBorder(imported, "C3")).toEqual(ALL_BORDER);
    });

    test("Column default border with only a top side does not gain a bottom on import/export", () => {
      setBordersOnTarget(model, ["C1:C20"], TOP_BORDER);

      const imported = new Model(model.exportData());

      expect(getCellBorder(imported, "C5")).toEqual(TOP_BORDER);
    });

    test("Row default border with only a left side does not gain a right on import/export", () => {
      setBordersOnTarget(model, ["A3:Z3"], LEFT_BORDER);

      const imported = new Model(model.exportData());

      expect(getCellBorder(imported, "C3")).toEqual(LEFT_BORDER);
    });

    test("A column cleared from a sheet-wide border is still cleared after import/export", () => {
      setZoneBorders(model, { position: "all" }, ["A1:Z20"]);
      clearFormatting(model, "C1:C20");

      const imported = new Model(model.exportData());

      expect(getCellBorder(imported, "C5")).toBeNull();
    });
  });
});
