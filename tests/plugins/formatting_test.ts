import { Model } from "../../src/model";
import { getCell } from "../helpers";

import "../canvas.mock";

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
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3 14 2014" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3 14 2014");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("1");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1/1/2000" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("1/1/2000");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("");
    model.dispatch("SET_VALUE", { xc: "A1", text: "0.431" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBeDefined();
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("300.00%");
    setFormat(model, "");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeNull();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeNull();
  });

  test("does not format errors", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("300.00%");
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A1" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("#CYCLE");
  });

  test("Can set number format to text value", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "Test" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("Test");
  });

  test("Can set date format to text value", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "Test" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("Test");
  });
});

describe("formatting values (when change decimal)", () => {
  test("Can't change decimal format of a cell that isn't 'number' type", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "kikou" });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("kikou");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(undefined);
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("kikou");
  });

  test("Can't change decimal format of a cell when value not exist", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "42%" });
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

    model.dispatch("SET_VALUE", { xc: "A1", text: "42" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.0%");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0.00%");

    model.dispatch("SET_VALUE", { xc: "A2", text: "42" });
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.0%");
    setDecimal(model, -1);
    expect(getCell(model, "A2")!.format).toBe("0%");

    model.dispatch("SET_VALUE", { xc: "A3", text: "42" });
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    setFormat(model, "0%");
    setDecimal(model, 1);
    expect(getCell(model, "A3")!.format).toBe("0.0%");

    model.dispatch("SET_VALUE", { xc: "A4", text: "42" });
    model.dispatch("SELECT_CELL", { col: 0, row: 3 });
    setFormat(model, "0%");
    setDecimal(model, -1);
    expect(getCell(model, "A4")!.format).toBe("0%");

    model.dispatch("SET_VALUE", { xc: "B1", text: "24" });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setFormat(model, "#,##0.0");
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe("#,##0.00");

    model.dispatch("SET_VALUE", { xc: "B2", text: "24" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setFormat(model, "#,##0.0");
    setDecimal(model, -1);
    expect(getCell(model, "B2")!.format).toBe("#,##0");

    model.dispatch("SET_VALUE", { xc: "B3", text: "24" });
    model.dispatch("SELECT_CELL", { col: 1, row: 2 });
    setFormat(model, "#,##0");
    setDecimal(model, 1);
    expect(getCell(model, "B3")!.format).toBe("#,##0.0");

    model.dispatch("SET_VALUE", { xc: "B4", text: "24" });
    model.dispatch("SELECT_CELL", { col: 1, row: 3 });
    setFormat(model, "#,##0");
    setDecimal(model, -1);
    expect(getCell(model, "B4")!.format).toBe("#,##0");

    model.dispatch("SET_VALUE", { xc: "C1", text: "707" });
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    setFormat(model, "0.0E+00");
    setDecimal(model, 1);
    expect(getCell(model, "C1")!.format).toBe("0.00E+00");

    model.dispatch("SET_VALUE", { xc: "C2", text: "707" });
    model.dispatch("SELECT_CELL", { col: 2, row: 1 });
    setFormat(model, "0.0E+00");
    setDecimal(model, -1);
    expect(getCell(model, "C2")!.format).toBe("0E+00");

    model.dispatch("SET_VALUE", { xc: "C3", text: "707" });
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    setFormat(model, "0E+00");
    setDecimal(model, 1);
    expect(getCell(model, "C3")!.format).toBe("0.0E+00");

    model.dispatch("SET_VALUE", { xc: "C4", text: "707" });
    model.dispatch("SELECT_CELL", { col: 2, row: 3 });
    setFormat(model, "0E+00");
    setDecimal(model, -1);
    expect(getCell(model, "C4")!.format).toBe("0E+00");

    model.dispatch("SET_VALUE", { xc: "D1", text: "39738" });
    model.dispatch("SELECT_CELL", { col: 3, row: 0 });
    setFormat(model, "#,##0;#,##0.00");
    setDecimal(model, 1);
    expect(getCell(model, "D1")!.format).toBe("#,##0.0;#,##0.000");

    model.dispatch("SET_VALUE", { xc: "D2", text: "39738" });
    model.dispatch("SELECT_CELL", { col: 3, row: 1 });
    setFormat(model, "#,##0;#,##0.0");
    setDecimal(model, -1);
    expect(getCell(model, "D2")!.format).toBe("#,##0;#,##0");
  });

  test("Can change decimal format of a cell that hasn't format (case 'number' type only)", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "123" });
    expect(getCell(model, "A1")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0.0");

    model.dispatch("SET_VALUE", { xc: "A2", text: "456" });
    expect(getCell(model, "A2")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setDecimal(model, -1);
    expect(getCell(model, "A2")!.format).toBe("0");

    model.dispatch("SET_VALUE", { xc: "B1", text: "123.456" });
    expect(getCell(model, "B1")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe("0.0000");

    model.dispatch("SET_VALUE", { xc: "B2", text: "456.789" });
    expect(getCell(model, "B2")!.format).toBe(undefined);
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setDecimal(model, -1);
    expect(getCell(model, "B2")!.format).toBe("0.00");
  });

  test("Decimal format is limited to 20 zeros after the decimal point", () => {
    const model = new Model();

    const nineteenZerosA1 = "0.0000000000000000000";
    const twentyZerosA1 = "0.00000000000000000000";
    model.dispatch("SET_VALUE", { xc: "A1", text: "123" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, nineteenZerosA1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(twentyZerosA1);

    const seventeenZerosB1 = "0.00000000000000000%";
    const twentyZerosB1 = "0.00000000000000000000%";
    model.dispatch("SET_VALUE", { xc: "B1", text: "9%" });
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
    model.dispatch("SET_VALUE", { xc: "C1", text: "3456.789" });
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

    model.dispatch("SET_VALUE", { xc: "A2", text: "9" });
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.00%");
    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("900.00%");

    model.dispatch("SET_VALUE", { xc: "A3", text: "4567.8" });
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    setFormat(model, "#,##0");
    expect(model.getters.getCellText(getCell(model, "A3")!)).toBe("4,568");

    model.dispatch("SET_VALUE", { xc: "C1", text: "42.42" });
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    setFormat(model, "0.000");
    expect(model.getters.getCellText(getCell(model, "C1")!)).toBe("42.420");

    // select A1, then expand selection to A1:C3

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // incrase decimalformat on the selection

    setDecimal(model, 1);

    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("9.0000");
    expect(model.getters.getCellText(getCell(model, "A3")!)).toBe("4567.8000");
    expect(model.getters.getCellText(getCell(model, "C1")!)).toBe("42.4200");

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

    model.dispatch("SET_VALUE", { xc: "A2", text: "Hey Jude" });
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    setFormat(model, "0.00%");
    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("Hey Jude");

    model.dispatch("SET_VALUE", { xc: "A3", text: "12/12/2012" });
    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    expect(model.getters.getCellText(getCell(model, "A3")!)).toBe("12/12/2012");

    model.dispatch("SET_VALUE", { xc: "C1", text: "LEBLEBI" });
    expect(model.getters.getCellText(getCell(model, "C1")!)).toBe("LEBLEBI");

    // select A1, then expand selection to A1:C3

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // incrase decimalformat on the selection

    setDecimal(model, 1);

    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("Hey Jude");
    expect(model.getters.getCellText(getCell(model, "A3")!)).toBe("12/12/2012");
    expect(model.getters.getCellText(getCell(model, "C1")!)).toBe("LEBLEBI");

    expect(getCell(model, "A2")!.format).toBe("0.00%");
    expect(getCell(model, "A3")!.format).toBe(undefined);
    expect(getCell(model, "C1")!.format).toBe(undefined);
  });
});
