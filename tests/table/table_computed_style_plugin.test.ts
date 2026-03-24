import { TABLE_PRESETS } from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { Model } from "../../src";
import { toXC, toZone } from "../../src/helpers";
import { Style, UID } from "../../src/types";
import {
  createTable,
  createTableWithFilter,
  deleteContent,
  deleteTable,
  foldAllHeaderGroups,
  foldHeaderGroup,
  foldHeaderGroupsInZone,
  groupRows,
  hideColumns,
  hideRows,
  redo,
  setCellContent,
  setFormatting,
  setZoneBorders,
  undo,
  unfoldAllHeaderGroups,
  unfoldHeaderGroup,
  unfoldHeaderGroupsInZone,
  ungroupHeaders,
  unhideColumns,
  unhideRows,
  updateFilter,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import { getTable } from "../test_helpers/getters_helpers";
import { createModel, toCellPosition } from "../test_helpers/helpers";

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
  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Table cell style", () => {
    const style = TABLE_PRESETS["TableStyleMedium9"];
    const headerColor = style.headerRow!.style!.fillColor;
    const tableBackgroundColor = style.wholeTable!.style!.fillColor;
    const totalColor = style.totalRow!.style!.fillColor;
    const bandedRowColor = style.firstColumnStripe!.style!.fillColor;

    test("Table style is correctly applied", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1:A4", {
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

    test("Table style do not overwrite cell style", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1:A4", { styleId: "TableStyleMedium9", numberOfHeaders: 1 });
      await setFormatting(model, "A1", { fillColor: "#f00" });
      expect(getCellStyle("A1")).toMatchObject({ fillColor: "#f00" });
    });

    test("Falsy cell style do not overwrite table", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1:A4", { styleId: "TableStyleMedium9", numberOfHeaders: 1 });
      await setFormatting(model, "A1", { fillColor: undefined, bold: false });
      expect(getCellStyle("A1")).toMatchObject({ fillColor: headerColor, bold: true });
    });

    test("Table style is applied correctly with hidden headers", async () => {
      await createTable(model, "A1:B5");
      await updateTableConfig(model, "A1:B5", {
        styleId: "TableStyleMedium9",
        numberOfHeaders: 2,
        bandedRows: true,
        firstColumn: true,
      });
      await hideRows(model, [0, 3]);
      await hideColumns(model, ["A"]);

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

    test("Table borders are correct", async () => {
      await createTable(model, "A7:B9");
      // Style with only outer borders
      await updateTableConfig(model, "A7:B9", outerBordersTableStyle);

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

    test("Table borders don't overwrite cell borders", async () => {
      await setZoneBorders(model, { position: "left", color: "#f00" }, ["A7:A9"]);
      await createTable(model, "A7:A9");
      await updateTableConfig(model, "A7:B9", outerBordersTableStyle);
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

    test("Outer table borders still appear if the outers col/rows are hidden", async () => {
      await createTable(model, "A7:E14");
      await updateTableConfig(model, "A7:B9", outerBordersTableStyle);
      const styleBorderDescr = { style: "thin", color: "#000000" };

      await hideColumns(model, ["E", "A", "B"]);
      await hideRows(model, [6, 12, 13]);

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

    test("Cell style is updated when a table is deleted with DELETE_CONTENT", async () => {
      await createTable(model, "A1:B4");
      expect(getCellStyle("A1")).not.toEqual({});

      await deleteContent(model, ["A1:B4"]);
      expect(getTable(model, "A1")).toBeUndefined();
      expect(getCellStyle("A1")).toEqual({});
    });
  });

  describe("Table style is updated when sheet changes", () => {
    beforeEach(async () => {
      await createTable(model, "A1:B4");
      await updateTableConfig(model, "A1:B4", {
        styleId: "TableStyleMedium13",
        numberOfHeaders: 1,
        totalRow: true,
        firstColumn: true,
        lastColumn: true,
      });
    });

    test("Table style is updated when (un)hiding a header", async () => {
      const tableStyle = getFullTableStyle("A1:B4");
      await hideRows(model, [0]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await unhideRows(model, [0]);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);

      await hideColumns(model, ["A"]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await unhideColumns(model, ["A"]);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when (un)folding headers", async () => {
      const tableStyle = getFullTableStyle("A1:B4");
      await groupRows(model, 0, 2);
      await foldHeaderGroup(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await unfoldHeaderGroup(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);

      await foldHeaderGroupsInZone(model, "ROW", "B1:B2");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await unfoldHeaderGroupsInZone(model, "ROW", "B1:B2");
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);

      await foldAllHeaderGroups(model, "ROW");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await unfoldAllHeaderGroups(model, "ROW");
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when removing a header group", async () => {
      const tableStyle = getFullTableStyle("A1:B4");
      await groupRows(model, 0, 2);
      await foldHeaderGroup(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await ungroupHeaders(model, "ROW", 0, 2);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when (un)filtering headers", async () => {
      model = await createModel();
      await createTableWithFilter(model, "A1:B4");
      const tableStyle = getFullTableStyle("A1:B4");
      await setCellContent(model, "A2", "test");
      await updateFilter(model, "A1", ["test"]);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await updateFilter(model, "A1", []);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Table style is updated when updating the evaluation", async () => {
      await updateFilter(model, "A1", ["test"]);
      await setCellContent(model, "A2", "=C1");
      const tableStyle = getFullTableStyle("A1:B4");
      await setCellContent(model, "C1", "test");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });

    test("Table style is updated when updating a table", async () => {
      const tableStyle = getFullTableStyle("A1:B4");
      await updateTableConfig(model, "A1:B4", { styleId: "TableStyleLight1" });
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });

    test("Table style is updated with undo/redo", async () => {
      await updateTableConfig(model, "A1:B4", { styleId: "TableStyleLight1" });
      const tableStyle = getFullTableStyle("A1:B4");

      await undo(model);
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
      await redo(model);
      expect(getFullTableStyle("A1:B4")).toEqual(tableStyle);
    });

    test("Style is updated when deleting a table", async () => {
      await setFormatting(model, "A1", { fillColor: "#f00" });
      const tableStyle = getFullTableStyle("A1:B4");
      await deleteTable(model, "A1:B4");
      expect(getFullTableStyle("A1:B4")).not.toEqual(tableStyle);
    });
  });
});
