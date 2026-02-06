import { deepEquals, Model, Style, UID, Zone } from "@odoo/o-spreadsheet-engine";
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
  setSelection,
} from "../test_helpers";
import { target } from "../test_helpers/helpers";

const ALIGN_STYLE: Style = { align: "left" };
const FCOLOR_STYLE = { fillColor: "#abcdef" };
const FCOLOR_STYLE2 = { fillColor: "#a1b2c3" };
const VALIGN_STYLE: Style = { verticalAlign: "top" };
const BOLD_STYLE = { bold: true };
const ITALIC_STYLE = { italic: true };
const FONTSIZE_STYLE = { fontSize: 20 };
const TCOLOR_STYLE = { textColor: "#123456" };
const ROTATION_STYLE = { rotation: 90 };
const MULTI_STYLE = { fillColor: "#abcdef", fontSize: 13, italic: true };
const INVERSE_MULTI_STYLE = { fillColor: "", fontSize: 10, italic: false };

const TEST_STYLES = [
  ALIGN_STYLE,
  FCOLOR_STYLE,
  VALIGN_STYLE,
  BOLD_STYLE,
  ITALIC_STYLE,
  FONTSIZE_STYLE,
  TCOLOR_STYLE,
  ROTATION_STYLE,
  MULTI_STYLE,
];

function getCellStyle(model: Model, xc: string, sheetId: UID = model.getters.getActiveSheetId()) {
  return model.getters.getCellStyle({ sheetId, ...toCartesian(xc) });
}

describe("Default Plugin: Style", () => {
  let model: Model;
  let sheetId: UID;
  beforeEach(() => {
    model = new Model({
      sheets: [{ id: "sh1", colNumber: 25, rowNumber: 20 }],
    });
    sheetId = model.getters.getActiveSheetId();
  });

  const COL = (col) => {
    return { left: col, right: col, top: 0, bottom: 20 };
  };
  const ROW = (row) => {
    return { left: 0, right: 25, top: row, bottom: row };
  };
  const SHEET = { left: 0, right: 25, top: 0, bottom: 20 };

  describe.each(TEST_STYLES)("Style : %s", (style) => {
    test("Can set style on sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(style);
      expect(getCellStyle(model, "D5")).toEqual(style);
    });

    test("Can set style on row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 0, 2)],
        style,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(style);
      expect(getCellStyle(model, "D2")).toEqual(style);
      expect(getCellStyle(model, "D5")).toEqual({});
    });

    test("Can set style on col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 0, 2)],
        style,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(style);
      expect(getCellStyle(model, "B5")).toEqual(style);
      expect(getCellStyle(model, "D5")).toEqual({});
    });
  });

  describe.each([
    [ALIGN_STYLE, BOLD_STYLE],
    [ITALIC_STYLE, ITALIC_STYLE],
    [FCOLOR_STYLE, FCOLOR_STYLE2],
    [MULTI_STYLE, ITALIC_STYLE],
    [FONTSIZE_STYLE, MULTI_STYLE],
  ] as [Style, Style][])("Defaults Combination", (style1, style2) => {
    test("Row after sheet", () => {
      const sheetStyle = style1;
      const rowStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "A2")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Row after col", () => {
      const colStyle = style1;
      const rowStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual(colStyle);
      expect(getCellStyle(model, "A2")).toEqual(rowStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Row after row", () => {
      const rowStyle = style1;
      const rowStyle2 = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle2,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual({});
      expect(getCellStyle(model, "A2")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Row after cell", () => {
      const rowStyle = style2;
      const cellStyle = style1;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });
      expect(model.getters.getCells(sheetId).length).toBe(
        deepEquals(intersectionStyle, rowStyle) ? 0 : 1
      );

      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual({});
      expect(getCellStyle(model, "A2")).toEqual(rowStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Col after sheet", () => {
      const sheetStyle = style1;
      const colStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "A2")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Col after col", () => {
      const colStyle = style1;
      const colStyle2 = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle2,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Col after row", () => {
      const rowStyle = style1;
      const colStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });

      // Check if all keys in rowStyle are the same as the one in intersectionStyle
      expect(model.getters.getCells(sheetId).length).toBe(
        deepEquals(intersectionStyle, { ...intersectionStyle, ...rowStyle }) ? 0 : 1
      );
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual(colStyle);
      expect(getCellStyle(model, "A2")).toEqual(rowStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Col after cell", () => {
      const colStyle = style2;
      const cellStyle = style1;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(
        !deepEquals(colStyle, intersectionStyle) ? 1 : 0
      );
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual(colStyle);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Sheet after sheet", () => {
      const sheetStyle = style1;
      const sheetStyle2 = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle2,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "B1")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "A2")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Sheet after col", () => {
      const colStyle = style1;
      const sheetStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "A2")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Sheet after row", () => {
      const rowStyle = style1;
      const sheetStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(0);
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "A2")).toEqual(intersectionStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Sheet after cell", () => {
      const cellStyle = style1;
      const sheetStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(
        !deepEquals(sheetStyle, intersectionStyle) ? 1 : 0
      );
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "A2")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Cell after sheet", () => {
      const sheetStyle = style1;
      const cellStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: sheetStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(
        deepEquals(sheetStyle, intersectionStyle) ? 0 : 1
      );
      expect(getCellStyle(model, "A1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B1")).toEqual(sheetStyle);
      expect(getCellStyle(model, "A2")).toEqual(sheetStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Cell after col", () => {
      const colStyle = style1;
      const cellStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: colStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(
        deepEquals(colStyle, intersectionStyle) ? 0 : 1
      );
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual(colStyle);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });

    test("Cell after row", () => {
      const rowStyle = style1;
      const cellStyle = style2;
      const intersectionStyle = { ...style1, ...style2 };

      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: rowStyle,
      });
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        style: cellStyle,
      });

      expect(model.getters.getCells(sheetId).length).toBe(
        deepEquals(rowStyle, intersectionStyle) ? 0 : 1
      );
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "B1")).toEqual({});
      expect(getCellStyle(model, "A2")).toEqual(rowStyle);
      expect(getCellStyle(model, "B2")).toEqual(intersectionStyle);
    });
  });

  describe("Sheet Manipulation: Add Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      addColumns(model, "after", "A", 1);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      addColumns(model, "after", "A", 1);
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);

      addColumns(model, "after", "C", 1);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "D2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      addColumns(model, "after", "A", 1);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Remove Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteColumns(model, ["A"]);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteColumns(model, ["A"]);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);

      deleteColumns(model, ["A"]);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      deleteColumns(model, ["A"]);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Move Column", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      moveColumns(model, "D", ["A"], "after");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "D2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      moveColumns(model, "D", ["A"], "after");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(getCellStyle(model, "D2")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);

      moveColumns(model, "D", ["A"], "after");
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(getCellStyle(model, "D2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      moveColumns(model, "D", ["A"], "after");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "D2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Add Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      addRows(model, "after", 0, 1);
      expect(getCellStyle(model, "B2")).toEqual({});
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);

      addRows(model, "after", 2, 1);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B4")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      addRows(model, "after", 0, 1);
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      addRows(model, "after", 0, 1);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Remove Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteRows(model, [0]);
      expect(getCellStyle(model, "A1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);

      deleteRows(model, [0]);
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });
      deleteRows(model, [0]);
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });
      deleteRows(model, [0]);
      expect(getCellStyle(model, "A1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
    });
  });

  describe("Sheet Manipulation: Move Row", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      moveRows(model, 3, [0], "after");
      expect(getCellStyle(model, "A1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "A4")).toEqual({});
      expect(model.getters.getCells(sheetId).length).toBe(0);

      moveRows(model, 3, [0], "after");
      expect(getCellStyle(model, "A1")).toEqual({});
      expect(getCellStyle(model, "A2")).toEqual({});
      expect(getCellStyle(model, "A4")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      moveRows(model, 3, [0], "after");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B4")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      moveRows(model, 3, [0], "after");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "D2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(0);
    });
  });

  describe("Sheet Manipulation: Delete Cell Up", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "B1", "up");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "B1", "up");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B20")).toEqual(INVERSE_MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "B1", "up");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B20")).toEqual(INVERSE_MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });
  });

  describe("Sheet Manipulation: Delete Cell Left", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "A2", "left");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "Y2")).toEqual(INVERSE_MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "A2", "left");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      deleteCells(model, "A2", "left");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "Y2")).toEqual(INVERSE_MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });
  });

  describe("Sheet Manipulation: Insert Cell Down", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "down");
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "down");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B20")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "down");
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B20")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });
  });

  describe("Sheet Manipulation: Insert Cell Right", () => {
    test("Default Row", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getRowsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "right");
      expect(getCellStyle(model, "A2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "Z2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });

    test("Default Col", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getColsZone(sheetId, 1, 1)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "right");
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(1);
    });

    test("Default Sheet", () => {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [model.getters.getSheetZone(sheetId)],
        style: MULTI_STYLE,
      });

      insertCells(model, "B2", "right");
      expect(getCellStyle(model, "B1")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "B2")).toEqual(INVERSE_MULTI_STYLE);
      expect(getCellStyle(model, "B3")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "C2")).toEqual(MULTI_STYLE);
      expect(getCellStyle(model, "Z2")).toEqual(MULTI_STYLE);
      expect(model.getters.getCells(sheetId).length).toBe(2);
    });
  });

  test.each([
    [[COL(2), MULTI_STYLE]],
    [[ROW(2), MULTI_STYLE]],
    [[SHEET, MULTI_STYLE]],
    [
      [ROW(2), FCOLOR_STYLE2],
      [COL(2), FCOLOR_STYLE],
    ],
    [
      [COL(2), FCOLOR_STYLE],
      [ROW(2), FCOLOR_STYLE2],
    ],
    [
      [SHEET, ITALIC_STYLE],
      [COL(2), FCOLOR_STYLE],
      [ROW(2), BOLD_STYLE],
    ],
  ] as [Zone, Style][][])("Clipboard : copy partial sheet", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [command[0]],
        style: command[1],
      });
    }

    const gridState: Style[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellStyle(model, toXC(col, row));
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

    expect(getCellStyle(model, toXC(0, 0))).toEqual({});
    expect(getCellStyle(model, toXC(0, 1))).toEqual({});
    expect(getCellStyle(model, toXC(0, 2))).toEqual({});
    expect(getCellStyle(model, toXC(0, 3))).toEqual({});
    expect(getCellStyle(model, toXC(0, 4))).toEqual({});

    expect(getCellStyle(model, toXC(1, 0))).toEqual({});
    expect(getCellStyle(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellStyle(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellStyle(model, toXC(1, 3))).toEqual(gridState[1][3]);
    expect(getCellStyle(model, toXC(1, 4))).toEqual({});

    expect(getCellStyle(model, toXC(2, 0))).toEqual({});
    expect(getCellStyle(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellStyle(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellStyle(model, toXC(2, 3))).toEqual(gridState[2][3]);
    expect(getCellStyle(model, toXC(2, 4))).toEqual({});

    expect(getCellStyle(model, toXC(3, 0))).toEqual({});
    expect(getCellStyle(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellStyle(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellStyle(model, toXC(3, 3))).toEqual(gridState[3][3]);
    expect(getCellStyle(model, toXC(3, 4))).toEqual({});

    expect(getCellStyle(model, toXC(4, 0))).toEqual({});
    expect(getCellStyle(model, toXC(4, 1))).toEqual({});
    expect(getCellStyle(model, toXC(4, 2))).toEqual({});
    expect(getCellStyle(model, toXC(4, 3))).toEqual({});
    expect(getCellStyle(model, toXC(4, 4))).toEqual({});
  });

  test.each([
    [[COL(2), MULTI_STYLE]],
    [[ROW(2), MULTI_STYLE]],
    [[SHEET, MULTI_STYLE]],
    [
      [ROW(2), FCOLOR_STYLE2],
      [COL(2), FCOLOR_STYLE],
    ],
    [
      [COL(2), FCOLOR_STYLE],
      [ROW(2), FCOLOR_STYLE2],
    ],
    [
      [SHEET, ITALIC_STYLE],
      [COL(2), FCOLOR_STYLE],
      [ROW(2), BOLD_STYLE],
    ],
  ] as [Zone, Style][][])("Clipboard : cut partial sheet", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [command[0]],
        style: command[1],
      });
    }

    const gridState: Style[][] = [];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col - 1][row - 1] = getCellStyle(model, toXC(col, row));
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
        expect(getCellStyle(model, toXC(col, row))).toEqual({});
      }
    }
    expect(getCellStyle(model, toXC(5, 5))).toEqual(gridState[0][0]);
    expect(getCellStyle(model, toXC(5, 6))).toEqual(gridState[0][1]);
    expect(getCellStyle(model, toXC(5, 7))).toEqual(gridState[0][2]);

    expect(getCellStyle(model, toXC(6, 5))).toEqual(gridState[1][0]);
    expect(getCellStyle(model, toXC(6, 6))).toEqual(gridState[1][1]);
    expect(getCellStyle(model, toXC(6, 7))).toEqual(gridState[1][2]);

    expect(getCellStyle(model, toXC(7, 5))).toEqual(gridState[2][0]);
    expect(getCellStyle(model, toXC(7, 6))).toEqual(gridState[2][1]);
    expect(getCellStyle(model, toXC(7, 7))).toEqual(gridState[2][2]);
  });

  test.each([
    [[COL(2), MULTI_STYLE]],
    [[ROW(2), MULTI_STYLE]],
    [[SHEET, MULTI_STYLE]],
    [
      [ROW(2), FCOLOR_STYLE2],
      [COL(2), FCOLOR_STYLE],
    ],
    [
      [COL(2), FCOLOR_STYLE],
      [ROW(2), FCOLOR_STYLE2],
    ],
    [
      [SHEET, ITALIC_STYLE],
      [COL(2), FCOLOR_STYLE],
      [ROW(2), BOLD_STYLE],
    ],
  ] as [Zone, Style][][])("Clipboard : copy whole sheet", (...commands) => {
    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(model.getters, model.dispatch));

    for (const command of commands) {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [command[0]],
        style: command[1],
      });
    }

    const gridState: Style[][] = [[]];
    for (let col = 1; col < 4; col++) {
      gridState.push([]);
      for (let row = 1; row < 4; row++) {
        gridState[col][row] = getCellStyle(model, toXC(col, row));
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

    expect(getCellStyle(model, toXC(1, 1))).toEqual(gridState[1][1]);
    expect(getCellStyle(model, toXC(1, 2))).toEqual(gridState[1][2]);
    expect(getCellStyle(model, toXC(1, 3))).toEqual(gridState[1][3]);

    expect(getCellStyle(model, toXC(2, 1))).toEqual(gridState[2][1]);
    expect(getCellStyle(model, toXC(2, 2))).toEqual(gridState[2][2]);
    expect(getCellStyle(model, toXC(2, 3))).toEqual(gridState[2][3]);

    expect(getCellStyle(model, toXC(3, 1))).toEqual(gridState[3][1]);
    expect(getCellStyle(model, toXC(3, 2))).toEqual(gridState[3][2]);
    expect(getCellStyle(model, toXC(3, 3))).toEqual(gridState[3][3]);
  });

  test.each([
    [[COL(2), MULTI_STYLE]],
    [[ROW(2), MULTI_STYLE]],
    [[SHEET, MULTI_STYLE]],
    [
      [ROW(2), FCOLOR_STYLE2],
      [COL(2), FCOLOR_STYLE],
    ],
    [
      [COL(2), FCOLOR_STYLE],
      [ROW(2), FCOLOR_STYLE2],
    ],
    [
      [SHEET, ITALIC_STYLE],
      [COL(2), FCOLOR_STYLE],
      [ROW(2), BOLD_STYLE],
    ],
  ] as [Zone, Style][][])("Import Export does not create extra cells", (...commands) => {
    for (const command of commands) {
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [command[0]],
        style: command[1],
      });
    }

    const modelImport = new Model(model.exportData());

    expect(getCellStyle(model, toXC(1, 1))).toEqual(getCellStyle(modelImport, toXC(1, 1)));
    expect(getCellStyle(model, toXC(2, 1))).toEqual(getCellStyle(modelImport, toXC(2, 1)));
    expect(getCellStyle(model, toXC(3, 1))).toEqual(getCellStyle(modelImport, toXC(3, 1)));

    expect(getCellStyle(model, toXC(1, 2))).toEqual(getCellStyle(modelImport, toXC(1, 2)));
    expect(getCellStyle(model, toXC(2, 2))).toEqual(getCellStyle(modelImport, toXC(2, 2)));
    expect(getCellStyle(model, toXC(3, 2))).toEqual(getCellStyle(modelImport, toXC(3, 2)));

    expect(getCellStyle(model, toXC(1, 3))).toEqual(getCellStyle(modelImport, toXC(1, 3)));
    expect(getCellStyle(model, toXC(2, 3))).toEqual(getCellStyle(modelImport, toXC(2, 3)));
    expect(getCellStyle(model, toXC(3, 3))).toEqual(getCellStyle(modelImport, toXC(3, 3)));

    expect(model.getters.getCells(sheetId).length).toBe(
      modelImport.getters.getCells(sheetId).length
    );
  });

  test.each([FCOLOR_STYLE, MULTI_STYLE])("Autofill default style from row", (style) => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [model.getters.getRowsZone(sheetId, 1, 1)],
      style,
    });

    setSelection(model, ["B2"]);
    model.dispatch("AUTOFILL_SELECT", toCartesian("B4"));
    model.dispatch("AUTOFILL");

    expect(getCellStyle(model, "B3")).toEqual(style);
    expect(getCellStyle(model, "B4")).toEqual(style);
  });

  test.each([FCOLOR_STYLE, MULTI_STYLE])("Autofill default style from col", (style) => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [model.getters.getColsZone(sheetId, 1, 1)],
      style,
    });

    setSelection(model, ["B2"]);
    model.dispatch("AUTOFILL_SELECT", toCartesian("D2"));
    model.dispatch("AUTOFILL");

    expect(getCellStyle(model, "C2")).toEqual(style);
    expect(getCellStyle(model, "D2")).toEqual(style);
  });
});
