import { Format, Model, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { getClipboardDataPositions } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { toCartesian, toXC } from "@odoo/o-spreadsheet-engine/helpers/coordinates";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import { ClipboardPasteTarget } from "../../src";
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

const DATE_FORMAT = "yy/mm/dd";
const PERCENT_FORMAT = "0%";

const TEST_FORMATS = [DATE_FORMAT, PERCENT_FORMAT];

function getCellFormat(model: Model, xc: string, sheetId: UID = model.getters.getActiveSheetId()) {
  return model.getters.getCellFormat({ sheetId, ...toCartesian(xc) });
}

describe("Default Plugin: Format", () => {
  let model: Model;
  let sheetId: UID;
  beforeEach(() => {
    model = new Model({
      sheets: [{ id: "sh1", colNumber: 25, rowNumber: 20 }],
    });
    sheetId = model.getters.getActiveSheetId();
  });

  describe.each(TEST_FORMATS)("Format : %s", (format) => {
    test("Can set format on sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellFormat(model, "A1")).toEqual(format);
      expect(getCellFormat(model, "D5")).toEqual(format);
    });

    test("Can set format on row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 0, 2)],
        format,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellFormat(model, "A1")).toEqual(format);
      expect(getCellFormat(model, "D2")).toEqual(format);
      expect(getCellFormat(model, "D5")).toBeUndefined();
    });

    test("Can set format on col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 0, 2)],
        format,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellFormat(model, "A1")).toEqual(format);
      expect(getCellFormat(model, "B5")).toEqual(format);
      expect(getCellFormat(model, "D5")).toBeUndefined();
    });
  });

  describe.each([
    [DATE_FORMAT, PERCENT_FORMAT],
    [PERCENT_FORMAT, PERCENT_FORMAT],
  ])("Defaults Combination", (format1, format2) => {
    test("Row after sheet", () => {
      const sheetFormat = format1;
      const rowFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "A2")).toEqual(rowFormat);
      expect(getCellFormat(model, "B2")).toEqual(rowFormat);
    });

    test("Row after col", () => {
      const colFormat = format1;
      const rowFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toEqual(colFormat);
      expect(getCellFormat(model, "A2")).toEqual(rowFormat);
      expect(getCellFormat(model, "B2")).toEqual(rowFormat);
    });

    test("Row after row", () => {
      const rowFormat = format1;
      const rowFormat2 = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat2,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toBeUndefined();
      expect(getCellFormat(model, "A2")).toEqual(rowFormat2);
      expect(getCellFormat(model, "B2")).toEqual(rowFormat2);
    });

    test("Row after cell", () => {
      const rowFormat = format2;
      const cellFormat = format1;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toBeUndefined();
      expect(getCellFormat(model, "A2")).toEqual(rowFormat);
      expect(getCellFormat(model, "B2")).toEqual(rowFormat);
    });

    test("Col after sheet", () => {
      const sheetFormat = format1;
      const colFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(colFormat);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B2")).toEqual(colFormat);
    });

    test("Col after col", () => {
      const colFormat = format1;
      const colFormat2 = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat2,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toEqual(colFormat2);
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "B2")).toEqual(colFormat2);
    });

    test("Col after row", () => {
      const rowFormat = format1;
      const colFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toEqual(colFormat);
      expect(getCellFormat(model, "A2")).toEqual(rowFormat);
      expect(getCellFormat(model, "B2")).toEqual(colFormat);
    });

    test("Col after cell", () => {
      const colFormat = format2;
      const cellFormat = format1;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toEqual(colFormat);
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "B2")).toEqual(colFormat);
    });

    test("Sheet after sheet", () => {
      const sheetFormat = format1;
      const sheetFormat2 = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat2,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat2);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat2);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat2);
      expect(getCellFormat(model, "B2")).toEqual(sheetFormat2);
    });

    test("Sheet after col", () => {
      const colFormat = format1;
      const sheetFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B2")).toEqual(sheetFormat);
    });

    test("Sheet after row", () => {
      const rowFormat = format1;
      const sheetFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B2")).toEqual(sheetFormat);
    });

    test("Sheet after cell", () => {
      const cellFormat = format1;
      const sheetFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B2")).toEqual(sheetFormat);
    });

    test("Cell after sheet", () => {
      const sheetFormat = format1;
      const cellFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: sheetFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });

      expect(getCellFormat(model, "A1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B1")).toEqual(sheetFormat);
      expect(getCellFormat(model, "A2")).toEqual(sheetFormat);
      expect(getCellFormat(model, "B2")).toEqual(cellFormat);
    });

    test("Cell after col", () => {
      const colFormat = format1;
      const cellFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: colFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toEqual(colFormat);
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "B2")).toEqual(cellFormat);
    });

    test("Cell after row", () => {
      const rowFormat = format1;
      const cellFormat = format2;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: rowFormat,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: target("B2"),
        format: cellFormat,
      });

      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(getCellFormat(model, "B1")).toBeUndefined();
      expect(getCellFormat(model, "A2")).toEqual(rowFormat);
      expect(getCellFormat(model, "B2")).toEqual(cellFormat);
    });
  });

  describe("Sheet Manipulation: Add Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      addColumns(model, "after", "A", 1);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      addColumns(model, "after", "A", 1);
      expect(getCellFormat(model, "B2")).toBeUndefined();
      expect(getCellFormat(model, "C2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);

      addColumns(model, "after", "C", 1);
      expect(getCellFormat(model, "C2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "D2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      addColumns(model, "after", "A", 1);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Remove Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteColumns(model, ["A"]);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteColumns(model, ["A"]);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toBeUndefined();
      expect(model.getters.getCells(sheetId).length).toBe(0);

      deleteColumns(model, ["A"]);
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "B2")).toBeUndefined();
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      deleteColumns(model, ["A"]);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Move Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "D2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toBeUndefined();
      expect(getCellFormat(model, "D2")).toBeUndefined();
      expect(model.getters.getCells(sheetId).length).toBe(0);

      moveColumns(model, "D", ["A"], "after");
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "B2")).toBeUndefined();
      expect(getCellFormat(model, "D2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      moveColumns(model, "D", ["A"], "after");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "D2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Add Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      addRows(model, "after", 0, 1);
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "A3")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);

      addRows(model, "after", 2, 1);
      expect(getCellFormat(model, "A3")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "A4")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      addRows(model, "after", 0, 1);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B3")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      addRows(model, "after", 0, 1);
      expect(getCellFormat(model, "A1")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Remove Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteRows(model, [0]);
      expect(getCellFormat(model, "A1")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);

      deleteRows(model, [0]);
      expect(getCellFormat(model, "A1")).toBeUndefined();
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteRows(model, [1]);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      deleteRows(model, [1]);
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Move Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellFormat(model, "A2")).toBeUndefined();
      expect(getCellFormat(model, "A4")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B4")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      moveRows(model, 3, [1], "after");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "A4")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Delete Cell Up", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "B1", "up");
      expect(getCellFormat(model, "B1")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual("");
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "B1", "up");
      expect(getCellFormat(model, "B1")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "B1", "up");
      expect(getCellFormat(model, "B1")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B19")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Delete Cell Left", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "A2", "left");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "A2", "left");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B1")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual("");
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      deleteCells(model, "A2", "left");
      expect(getCellFormat(model, "A2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "Y2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Insert Cell Down", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "down");
      expect(getCellFormat(model, "B2")).toEqual("");
      expect(getCellFormat(model, "B3")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "down");
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT); // ??
      expect(getCellFormat(model, "B21")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "down");
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT);
      expect(getCellFormat(model, "B21")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1); // ??
    });
  });

  describe("Sheet Manipulation: Insert Cell Right", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "right");
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT); // ??
      expect(getCellFormat(model, "C2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "right");
      expect(getCellFormat(model, "B2")).toEqual("");
      expect(getCellFormat(model, "C2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        format: DATE_FORMAT,
      });
      insertCells(model, "B2", "right");
      expect(getCellFormat(model, "B2")).toEqual(DATE_FORMAT); // ??
      expect(getCellFormat(model, "C2")).toEqual(DATE_FORMAT);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });
  });

  const COL = (col) => ({ left: col, right: col, top: 0, bottom: 20 });
  const ROW = (row) => ({ left: 0, right: 25, top: row, bottom: row });
  const SHEET = { left: 0, right: 25, top: 0, bottom: 20 };

  test.each([
    [[COL(2), DATE_FORMAT]],
    [[ROW(2), DATE_FORMAT]],
    [[SHEET, DATE_FORMAT]],
    [
      [ROW(2), PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
    ],
    [
      [COL(2), DATE_FORMAT],
      [ROW(2), PERCENT_FORMAT],
    ],
    [
      [SHEET, PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
      [ROW(2), DATE_FORMAT],
    ],
  ] as [Zone, Format][][])("Clipboard : copy partial sheet (format)", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));
    for (const command of commands) {
      const [zone, format] = command;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [zone],
        format,
      });
    }

    const gridState: (Format | undefined)[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellFormat(model, toXC(col, row));
      }
    }
    gridState.push([]);

    let copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [toZone("B2:D4")]);
    for (const handler of handlers) {
      copiedData = { ...copiedData, ...handler.copy(clipboardData, false) };
    }

    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: [model.getters.getSheetZone(sheetId)],
    });

    const pasteTarget: ClipboardPasteTarget = { sheetId: "sh2", zones: target("B2") };
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, { isCutOperation: false });
    }

    expect(getCellFormat(model, toXC(0, 0))).toBeUndefined();
    expect(getCellFormat(model, toXC(0, 1))).toBeUndefined();
    expect(getCellFormat(model, toXC(0, 2))).toBeUndefined();
    expect(getCellFormat(model, toXC(0, 3))).toBeUndefined();
    expect(getCellFormat(model, toXC(0, 4))).toBeUndefined();

    expect(getCellFormat(model, toXC(1, 0))).toBeUndefined();
    expect(getCellFormat(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellFormat(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellFormat(model, toXC(1, 3))).toEqual(gridState[1][3]);
    expect(getCellFormat(model, toXC(1, 4))).toBeUndefined();

    expect(getCellFormat(model, toXC(2, 0))).toBeUndefined();
    expect(getCellFormat(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellFormat(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellFormat(model, toXC(2, 3))).toEqual(gridState[2][3]);
    expect(getCellFormat(model, toXC(2, 4))).toBeUndefined();

    expect(getCellFormat(model, toXC(3, 0))).toBeUndefined();
    expect(getCellFormat(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellFormat(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellFormat(model, toXC(3, 3))).toEqual(gridState[3][3]);
    expect(getCellFormat(model, toXC(3, 4))).toBeUndefined();

    expect(getCellFormat(model, toXC(4, 0))).toBeUndefined();
    expect(getCellFormat(model, toXC(4, 1))).toBeUndefined();
    expect(getCellFormat(model, toXC(4, 2))).toBeUndefined();
    expect(getCellFormat(model, toXC(4, 3))).toBeUndefined();
    expect(getCellFormat(model, toXC(4, 4))).toBeUndefined();
  });

  test.each([
    [[COL(2), DATE_FORMAT]],
    [[ROW(2), DATE_FORMAT]],
    [[SHEET, DATE_FORMAT]],
    [
      [ROW(2), PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
    ],
    [
      [COL(2), DATE_FORMAT],
      [ROW(2), PERCENT_FORMAT],
    ],
    [
      [SHEET, PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
      [ROW(2), DATE_FORMAT],
    ],
  ] as [Zone, Format][][])("Clipboard : cut partial sheet (format)", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      const [zone, format] = command;
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [zone],
        format,
      });
    }

    const gridState: (Format | undefined)[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col - 1][row - 1] = getCellFormat(model, toXC(col, row));
      }
    }

    let copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [toZone("B2:D4")]);
    for (const handler of handlers) {
      copiedData = { ...copiedData, ...handler.copy(clipboardData, true) };
    }

    const pasteTarget: ClipboardPasteTarget = { sheetId: "sh2", zones: target("F6") };
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, { isCutOperation: true });
    }

    for (let col = 1; col < 4; col++) {
      for (let row = 1; row < 4; row++) {
        expect(getCellFormat(model, toXC(col, row))).toBeUndefined();
      }
    }
    expect(getCellFormat(model, toXC(5, 5))).toEqual(gridState[0][0]);
    expect(getCellFormat(model, toXC(5, 6))).toEqual(gridState[0][1]);
    expect(getCellFormat(model, toXC(5, 7))).toEqual(gridState[0][2]);

    expect(getCellFormat(model, toXC(6, 5))).toEqual(gridState[1][0]);
    expect(getCellFormat(model, toXC(6, 6))).toEqual(gridState[1][1]);
    expect(getCellFormat(model, toXC(6, 7))).toEqual(gridState[1][2]);

    expect(getCellFormat(model, toXC(7, 5))).toEqual(gridState[2][0]);
    expect(getCellFormat(model, toXC(7, 6))).toEqual(gridState[2][1]);
    expect(getCellFormat(model, toXC(7, 7))).toEqual(gridState[2][2]);
  });

  test.each([
    [[COL(2), DATE_FORMAT]],
    [[ROW(2), DATE_FORMAT]],
    [[SHEET, DATE_FORMAT]],
    [
      [ROW(2), PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
    ],
    [
      [COL(2), DATE_FORMAT],
      [ROW(2), PERCENT_FORMAT],
    ],
    [
      [SHEET, PERCENT_FORMAT],
      [COL(2), DATE_FORMAT],
      [ROW(2), DATE_FORMAT],
    ],
  ] as [Zone, Format][][])("Clipboard : copy whole sheet (format)", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [command[0]],
        format: command[1],
      });
    }

    const gridState: (Format | undefined)[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellFormat(model, toXC(col, row));
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

    const pasteTarget: ClipboardPasteTarget = { sheetId: "sh2", zones: target("A1") };
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, { isCutOperation: false });
    }

    expect(getCellFormat(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellFormat(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellFormat(model, toXC(1, 3))).toEqual(gridState[1][3]);

    expect(getCellFormat(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellFormat(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellFormat(model, toXC(2, 3))).toEqual(gridState[2][3]);

    expect(getCellFormat(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellFormat(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellFormat(model, toXC(3, 3))).toEqual(gridState[3][3]);
  });
});
