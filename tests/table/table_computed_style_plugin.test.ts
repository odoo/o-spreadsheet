import { Model } from "../../src";
import { toXC, toZone } from "../../src/helpers";
import { TABLE_PRESETS } from "../../src/helpers/table_presets";
import { Style, UID } from "../../src/types";
import {
  createTable,
  deleteContent,
  deleteTable,
  foldHeaderGroup,
  groupRows,
  hideColumns,
  hideRows,
  redo,
  setCellContent,
  setStyle,
  setZoneBorders,
  undo,
  unfoldHeaderGroup,
  unhideColumns,
  unhideRows,
  updateFilter,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import { getTable } from "../test_helpers/getters_helpers";
import { toCellPosition } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;

function getCellStyle(xc: string) {
  return model.getters.getCellComputedStyle(toCellPosition(sheetId, xc));
}

function getFullTableStyle(xc: string) {
  const styles: Style[][] = [];
  const zone = toZone(xc);
  for (let row = zone.top; row <= zone.bottom; row++) {
    styles.push([]);
    for (let col = zone.left; col <= zone.right; col++) {
      const cellStyle = getCellStyle(toXC(col, row));
      styles[row - zone.top].push(cellStyle);
    }
  }
  return styles;
}

describe("Table style", () => {
  beforeEach(() => {
    model = Model.BuildSync();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Table cell style", () => {
    const style = TABLE_PRESETS["TableStyleMedium9"];
    const headerColor = style.headerRow!.style!.fillColor;
    const tableBackgroundColor = style.wholeTable!.style!.fillColor;
    const totalColor = style.totalRow!.style!.fillColor;
    const bandedRowColor = style.firstColumnStripe!.style!.fillColor;

    test("Table style is correctly applied", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1:A4", {
        styleId: "TableStyleMedium9",
        numberOfHeaders: 1,
        totalRow: true,
        bandedRows: true,
      });
      expect(getCellStyle("A1")).toMatchObject({ fillColor: headerColor, bold: true });
      expect(getCellStyle("A2")).toMatchObject({ fillColor: bandedRowColor });
      expect(getCellStyle("A3")).toMatchObject({ fillColor: tableBackgroundColor });
      expect(getCellStyle("A4")).toMatchObject({ fillColor: totalColor });
    });

    test("Table style do not overwrite cell style", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1:A4", { styleId: "TableStyleMedium9", numberOfHeaders: 1 });
      setStyle(model, "A1", { fillColor: "#f00" });
      expect(getCellStyle("A1")).toMatchObject({ fillColor: "#f00" });
    });

    test("Falsy cell style do not overwrite table", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1:A4", { styleId: "TableStyleMedium9", numberOfHeaders: 1 });
      setStyle(model, "A1", { fillColor: undefined, bold: false });
      expect(getCellStyle("A1")).toMatchObject({ fillColor: headerColor, bold: true });
    });

    test("Table style is applied correctly with hidden headers", () => {
      createTable(model, "A1:B5");
      updateTableConfig(model, "A1:B5", {
        styleId: "TableStyleMedium9",
        numberOfHeaders: 2,
        bandedRows: true,
        firstColumn: true,
      });
      hideRows(model, [0, 3]);
      hideColumns(model, ["A"]);

      expect(getCellStyle("A1")).toEqual({}); // hidden
      expect(getCellStyle("B1")).toMatchObject({}); // hidden
      expect(getCellStyle("B2")).toMatchObject({ fillColor: headerColor, bold: true }); // Only one header row, the other is hidden
      expect(getCellStyle("B3")).toMatchObject({ fillColor: bandedRowColor });
      expect(getCellStyle("B4")).toEqual({}); // hidden
      expect(getCellStyle("B5")).toMatchObject({ fillColor: tableBackgroundColor }); // banded color is alternating even if a row is hidden
    });
  });

  describe("Table borders", () => {
    const outerBordersTableStyle = {
      styleId: "TableStyleLight8",
      numberOfHeaders: 0,
      bandedRows: false,
    } as const;

    test("Table borders are correct", () => {
      createTable(model, "A7:B9");
      // Style with only outer borders
      updateTableConfig(model, "A7:B9", outerBordersTableStyle);

      const zone = toZone("A7:B9");
      const styleBorderDescr = { style: "thin", color: "#000000" };
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const tableBorder = model.getters.getCellTableBorder({ sheetId, col, row });
          const expected = {};
          expected["top"] = row === zone.top ? styleBorderDescr : undefined;
          expected["bottom"] = row === zone.bottom ? styleBorderDescr : undefined;
          expected["left"] = col === zone.left ? styleBorderDescr : undefined;
          expected["right"] = col === zone.right ? styleBorderDescr : undefined;
          expect(tableBorder).toEqual(expected);
        }
      }
    });

    test("Table borders don't overwrite cell borders", () => {
      setZoneBorders(model, { position: "left", color: "#f00" }, ["A7:A9"]);
      createTable(model, "A7:A9");
      updateTableConfig(model, "A7:B9", outerBordersTableStyle);
      const styleBorderDescr = { style: "thin", color: "#000000" };

      const zone = toZone("A7:A9");
      for (let row = zone.top; row <= zone.bottom; row++) {
        const tableBorder = model.getters.getCellComputedBorder({ sheetId, col: 0, row });
        const expected = {
          top: row === zone.top ? styleBorderDescr : undefined,
          bottom: row === zone.bottom ? styleBorderDescr : undefined,
          left: { style: "thin", color: "#f00" },
          right: styleBorderDescr,
        };
        expect(tableBorder).toEqual(expected);
      }
    });

    test("Outer table borders still appear if the outers col/rows are hidden", () => {
      createTable(model, "A7:E14");
      updateTableConfig(model, "A7:B9", outerBordersTableStyle);
      const styleBorderDescr = { style: "thin", color: "#000000" };

      hideColumns(model, ["E", "A", "B"]);
      hideRows(model, [6, 12, 13]);

      const zone = toZone("C8:D12");
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const tableBorder = model.getters.getCellTableBorder({ sheetId, col, row });
          const expected = {};
          expected["top"] = row === zone.top ? styleBorderDescr : undefined;
          expected["bottom"] = row === zone.bottom ? styleBorderDescr : undefined;
          expected["left"] = col === zone.left ? styleBorderDescr : undefined;
          expected["right"] = col === zone.right ? styleBorderDescr : undefined;
          expect(tableBorder).toEqual(expected);
        }
      }
    });

    test("Cell style is updated when a table is deleted with DELETE_CONTENT", () => {
      createTable(model, "A1:B4");
      expect(getCellStyle("A1")).not.toEqual({});

      deleteContent(model, ["A1:B4"]);
      expect(getTable(model, "A1")).toBeUndefined();
      expect(getCellStyle("A1")).toEqual({});
    });
  });

  describe("Table style is updated when sheet changes", () => {
    beforeEach(() => {
      createTable(model, "A1:B4");
      updateTableConfig(model, "A1:B4", {
        styleId: "TableStyleMedium13",
        numberOfHeaders: 1,
        totalRow: true,
        firstColumn: true,
        lastColumn: true,
      });
    });

    test("Table style is updated when (un)hiding a header", () => {
      const tableStyle = getFullTableStyle("A1:B4");
      hideRows(model, [0]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      unhideRows(model, [0]);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);

      hideColumns(model, ["A"]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      unhideColumns(model, ["A"]);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when (un)folding headers", () => {
      const tableStyle = getFullTableStyle("A1:B4");
      groupRows(model, 0, 2);
      foldHeaderGroup(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      unfoldHeaderGroup(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when (un)filtering headers", () => {
      const tableStyle = getFullTableStyle("A1:B4");
      setCellContent(model, "A2", "test");
      updateFilter(model, "A1", ["test"]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      updateFilter(model, "A1", []);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when updating the evaluation", () => {
      updateFilter(model, "A1", ["test"]);
      setCellContent(model, "A2", "=C1");
      const tableStyle = getFullTableStyle("A1:B4");
      setCellContent(model, "C1", "test");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });

    test("Table style is updated when updating a table", () => {
      const tableStyle = getFullTableStyle("A1:B4");
      updateTableConfig(model, "A1:B4", { styleId: "TableStyleLight1" });
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });

    test("Table style is updated with undo/redo", () => {
      updateTableConfig(model, "A1:B4", { styleId: "TableStyleLight1" });
      const tableStyle = getFullTableStyle("A1:B4");

      undo(model);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      redo(model);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Style is updated when deleting a table", () => {
      setStyle(model, "A1", { fillColor: "#f00" });
      const tableStyle = getFullTableStyle("A1:B4");
      deleteTable(model, "A1:B4");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });
  });
});
