import { Model } from "../../src/model";
import "../canvas.mock";

function setFormat(model: Model, format: string) {
  model.dispatch("SET_FORMATTER", {
    sheet: model.getters.getActiveSheet(),
    target: model.getters.getSelectedZones(),
    formatter: format,
  });
}
describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("3");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model["workbook"].cells.A1.format).toBe("0.00%");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3 14 2014" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("3 14 2014");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(model["workbook"].cells.A1.format).toBe("mm/dd/yyyy");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("1");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "mm/dd/yyyy");
    expect(model["workbook"].cells.A1.format).toBe("mm/dd/yyyy");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1/1/2000" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("1/1/2000");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model["workbook"].cells.A1.format).toBe("0.00%");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model["workbook"].cells.A1.format).toBe("0.00%");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("");
    model.dispatch("SET_VALUE", { xc: "A1", text: "0.431" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(model["workbook"].cells.A1.format).not.toBeDefined();
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model["workbook"].cells.A1.format).toBeDefined();
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("300.00%");
    setFormat(model, "");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("3");
    expect(model["workbook"].cells.A1.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model["workbook"].cells.A1.format).toBe("0.00%");
    setFormat(model, "");
    expect(model["workbook"].cells.A1).not.toBeDefined();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "");
    expect(model["workbook"].cells.A1).not.toBeDefined();
  });

  test("does not format errors", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    setFormat(model, "0.00%");
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("300.00%");
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A1" });
    expect(model.getters.getCellText(model["workbook"].cells.A1)).toBe("#CYCLE");
  });
});
