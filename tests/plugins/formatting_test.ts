import { Model } from "../../src/model";
import { getCell, getCellContent } from "../helpers";

import "../canvas.mock";
import { setCellContent } from "../helpers";
import { PADDING_AUTORESIZE, DEFAULT_FONT_SIZE } from "../../src/constants";
import { fontSizeMap } from "../../src/fonts";
import { toZone } from "../../src/helpers";
import { CancelledReason, UID, Cell } from "../../src/types";
import { SheetUIPlugin } from "../../src/plugins/ui/ui_sheet";

function setFormat(model: Model, format: string) {
  model.dispatch("SET_FORMATTER", {
    sheetId: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    formatter: format,
  });
}

function setDecimal(model: Model, step: number) {
  model.dispatch("SET_DECIMAL", {
    sheetId: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    step: step,
  });
}

describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    expect(getCellContent(model, "A1")).toBe("3");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "3 14 2014");
    expect(getCellContent(model, "A1")).toBe("3 14 2014");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    expect(getCellContent(model, "A1")).toBe("1");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2000");
    expect(getCellContent(model, "A1")).toBe("1/1/2000");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("");
    setCellContent(model, "A1", "0.431");
    expect(getCellContent(model, "A1")).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new Model();
    setCellContent(model, "A1", "0");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
    expect(getCellContent(model, "A1")).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBeDefined();
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setFormat(model, "");
    expect(getCellContent(model, "A1")).toBe("3");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("does not format errors", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setCellContent(model, "A1", "=A1");
    expect(getCellContent(model, "A1")).toBe("#CYCLE");
  });

  test("Can set number format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Can set date format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Cannot set format in invalid sheet", () => {
    const model = new Model();
    expect(
      model.dispatch("SET_FORMATTING", {
        sheetId: "invalid sheet Id",
        target: [toZone("A1")],
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });
});

describe("formatting values (when change decimal)", () => {
  test("Can't change decimal format of a cell that isn't 'number' type", () => {
    const model = new Model();
    setCellContent(model, "A1", "kikou");
    expect(getCellContent(model, "A1")).toBe("kikou");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(undefined);
    expect(getCellContent(model, "A1")).toBe("kikou");
  });

  test("Can't change decimal format of a cell when value not exist", () => {
    const model = new Model();
    setCellContent(model, "A1", "42%");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A1")!.format).toBe("0%");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0%");
  });

  test("Can change decimal format of a cell that already has format", () => {
    const model = new Model();

    setCellContent(model, "A1", "42");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.0%");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0.00%");

    setCellContent(model, "A2", "42");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.0%");
    setDecimal(model, -1);
    expect(getCell(model, "A2")!.format).toBe("0%");

    setCellContent(model, "A3", "42");
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    setFormat(model, "0%");
    setDecimal(model, 1);
    expect(getCell(model, "A3")!.format).toBe("0.0%");

    setCellContent(model, "A4", "42");
    model.dispatch("SELECT_CELL", { col: 0, row: 3 });
    setFormat(model, "0%");
    setDecimal(model, -1);
    expect(getCell(model, "A4")!.format).toBe("0%");

    setCellContent(model, "B1", "24");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setFormat(model, "#,##0.0");
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe("#,##0.00");

    setCellContent(model, "B2", "24");
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setFormat(model, "#,##0.0");
    setDecimal(model, -1);
    expect(getCell(model, "B2")!.format).toBe("#,##0");

    setCellContent(model, "B3", "24");
    model.dispatch("SELECT_CELL", { col: 1, row: 2 });
    setFormat(model, "#,##0");
    setDecimal(model, 1);
    expect(getCell(model, "B3")!.format).toBe("#,##0.0");

    setCellContent(model, "B4", "24");
    model.dispatch("SELECT_CELL", { col: 1, row: 3 });
    setFormat(model, "#,##0");
    setDecimal(model, -1);
    expect(getCell(model, "B4")!.format).toBe("#,##0");

    setCellContent(model, "C1", "707");
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    setFormat(model, "0.0E+00");
    setDecimal(model, 1);
    expect(getCell(model, "C1")!.format).toBe("0.00E+00");

    setCellContent(model, "C2", "707");
    model.dispatch("SELECT_CELL", { col: 2, row: 1 });
    setFormat(model, "0.0E+00");
    setDecimal(model, -1);
    expect(getCell(model, "C2")!.format).toBe("0E+00");

    setCellContent(model, "C3", "707");
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    setFormat(model, "0E+00");
    setDecimal(model, 1);
    expect(getCell(model, "C3")!.format).toBe("0.0E+00");

    setCellContent(model, "C4", "707");
    model.dispatch("SELECT_CELL", { col: 2, row: 3 });
    setFormat(model, "0E+00");
    setDecimal(model, -1);
    expect(getCell(model, "C4")!.format).toBe("0E+00");

    setCellContent(model, "D1", "39738");
    model.dispatch("SELECT_CELL", { col: 3, row: 0 });
    setFormat(model, "#,##0;#,##0.00");
    setDecimal(model, 1);
    expect(getCell(model, "D1")!.format).toBe("#,##0.0;#,##0.000");

    setCellContent(model, "D2", "39738");
    model.dispatch("SELECT_CELL", { col: 3, row: 1 });
    setFormat(model, "#,##0;#,##0.0");
    setDecimal(model, -1);
    expect(getCell(model, "D2")!.format).toBe("#,##0;#,##0");
  });

  test("Can change decimal format of a cell that hasn't format (case 'number' type only)", () => {
    const model = new Model();

    setCellContent(model, "A1", "123");
    expect(getCell(model, "A1")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0.0");

    setCellContent(model, "A2", "456");
    expect(getCell(model, "A2")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setDecimal(model, -1);
    expect(getCell(model, "A2")!.format).toBe("0");

    setCellContent(model, "B1", "123.456");
    expect(getCell(model, "B1")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe("0.0000");

    setCellContent(model, "B2", "456.789");
    expect(getCell(model, "B2")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setDecimal(model, -1);
    expect(getCell(model, "B2")!.format).toBe("0.00");
  });

  test("Decimal format is limited to 20 zeros after the decimal point", () => {
    const model = new Model();

    const nineteenZerosA1 = "0.0000000000000000000";
    const twentyZerosA1 = "0.00000000000000000000";
    setCellContent(model, "A1", "123");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, nineteenZerosA1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(twentyZerosA1);

    const seventeenZerosB1 = "0.00000000000000000%";
    const twentyZerosB1 = "0.00000000000000000000%";
    setCellContent(model, "B1", "9%");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setFormat(model, seventeenZerosB1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe(twentyZerosB1);

    const eighteenZerosC1 = "#,##0.000000000000000000";
    const twentyZerosC1 = "#,##0.00000000000000000000";
    setCellContent(model, "C1", "3456.789");
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    setFormat(model, eighteenZerosC1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "C1")!.format).toBe(twentyZerosC1);
  });

  test("Change decimal format on a range gives the same format for all cells", () => {
    const model = new Model();

    // give values ​​with different formats

    setCellContent(model, "A2", "9");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A2")).toBe("900.00%");

    setCellContent(model, "A3", "4567.8");
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    setFormat(model, "#,##0");
    expect(getCellContent(model, "A3")).toBe("4,568");

    setCellContent(model, "C1", "42.42");
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    setFormat(model, "0.000");
    expect(getCellContent(model, "C1")).toBe("42.420");

    // select A1, then expand selection to A1:C3

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // incrase decimalformat on the selection

    setDecimal(model, 1);

    expect(getCellContent(model, "A2")).toBe("9.0000");
    expect(getCellContent(model, "A3")).toBe("4567.8000");
    expect(getCellContent(model, "C1")).toBe("42.4200");

    expect(getCell(model, "A1")!.format).toBe("0.0000");
    expect(getCell(model, "A2")!.format).toBe("0.0000");
    expect(getCell(model, "A3")!.format).toBe("0.0000");
    expect(getCell(model, "B1")!.format).toBe("0.0000");
    expect(getCell(model, "B2")!.format).toBe("0.0000");
    expect(getCell(model, "B3")!.format).toBe("0.0000");
    expect(getCell(model, "C1")!.format).toBe("0.0000");
    expect(getCell(model, "C2")!.format).toBe("0.0000");
    expect(getCell(model, "C3")!.format).toBe("0.0000");
  });

  test("Change decimal format on a range does nothing if there is't 'number' type", () => {
    const model = new Model();

    // give values ​​with different formats

    setCellContent(model, "A2", "Hey Jude");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A2")).toBe("Hey Jude");

    setCellContent(model, "A3", "12/12/2012");
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    expect(getCellContent(model, "A3")).toBe("12/12/2012");

    setCellContent(model, "C1", "LEBLEBI");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    // select A1, then expand selection to A1:C3

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // incrase decimalformat on the selection

    setDecimal(model, 1);

    expect(getCellContent(model, "A2")).toBe("Hey Jude");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    expect(getCell(model, "A2")!.format).toBe("0.00%");
    expect(getCell(model, "A3")!.format).toBe("m/d/yyyy");
    expect(getCell(model, "C1")!.format).toBe(undefined);
  });
});

describe("Autoresize", () => {
  let model: Model;
  let sheetId: UID;
  const sizes = [10, 20];
  const padding = 2 * PADDING_AUTORESIZE;
  const rowSize = fontSizeMap[DEFAULT_FONT_SIZE];

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    const sheetUIPlugin = model["handlers"].find(
      (p) => p instanceof SheetUIPlugin
    )! as SheetUIPlugin;
    sheetUIPlugin.getCellWidth = jest.fn((cell: Cell) => {
      if (cell["content"] === "size0") return sizes[0];
      return sizes[1];
    });
  });

  test("Can autoresize a column", () => {
    setCellContent(model, "A1", "size0");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getCol(sheetId, 0)?.size).toBe(sizes[0] + padding);
  });

  test("Can autoresize two columns", () => {
    setCellContent(model, "A1", "size0");
    setCellContent(model, "C1", "size1");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0, 2] });
    expect(model.getters.getCol(sheetId, 0)?.size).toBe(sizes[0] + padding);
    expect(model.getters.getCol(sheetId, 2)?.size).toBe(sizes[1] + padding);
  });

  test("Can autoresize a row", () => {
    setCellContent(model, "A1", "test");
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0] });
    expect(model.getters.getRow(sheetId, 0)?.size).toBe(rowSize + padding);
  });

  test("Can autoresize two rows", () => {
    setCellContent(model, "A1", "test");
    setCellContent(model, "A3", "test");
    model.dispatch("SET_FORMATTING", { sheetId, target: [toZone("A3")], style: { fontSize: 24 } });
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0, 2] });
    expect(model.getters.getRow(sheetId, 0)?.size).toBe(rowSize + padding);
    expect(model.getters.getRow(sheetId, 2)?.size).toBe(fontSizeMap[24] + padding);
  });

  test("Can autoresize a column in another sheet", () => {
    const initialSize = model.getters.getCol(sheetId, 0)?.size;
    const newSheetId = "42";
    model.dispatch("CREATE_SHEET", { sheetId: newSheetId, position: 1 });
    setCellContent(model, "A1", "size0", newSheetId);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId: newSheetId, cols: [0] });
    expect(model.getters.getCol(sheetId, 0)?.size).toBe(initialSize);
    expect(model.getters.getCol(newSheetId, 0)?.size).toBe(sizes[0] + padding);
  });

  test("Can autoresize a row in another sheet", () => {
    const initialSize = model.getters.getRow(sheetId, 0)?.size;
    const newSheetId = "42";
    model.dispatch("CREATE_SHEET", { sheetId: newSheetId, position: 1 });
    setCellContent(model, "A1", "test", newSheetId);
    model.dispatch("AUTORESIZE_ROWS", { sheetId: newSheetId, rows: [0] });
    expect(model.getters.getRow(sheetId, 0)?.size).toBe(initialSize);
    expect(model.getters.getRow(newSheetId, 0)?.size).toBe(rowSize + padding);
  });
});
