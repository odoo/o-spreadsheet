import { GridModel } from "../../src/model/index";
import "../canvas.mock";

describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", () => {
    const model = new GridModel();
    model.setValue("A1", "3");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("3");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("0.00%");
    expect(model.workbook.cells.A1.format).toBe("0.00%");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("300.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("0.00%");
    expect(model.workbook.cells.A1.format).toBe("0.00%");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("");
    model.setValue("A1", "0.431");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new GridModel();
    model.setValue("A1", "0");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("");
    expect(model.workbook.cells.A1.format).not.toBeDefined();
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new GridModel();
    model.setValue("A1", "3");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("0.00%");
    expect(model.workbook.cells.A1.format).toBeDefined();
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("300.00%");
    model.setFormat("");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("3");
    expect(model.workbook.cells.A1.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("0.00%");
    expect(model.workbook.cells.A1.format).toBe("0.00%");
    model.setFormat("");
    expect(model.workbook.cells.A1).not.toBeDefined();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("");
    expect(model.workbook.cells.A1).not.toBeDefined();
  });

  test("does not format errors", () => {
    const model = new GridModel();
    model.setValue("A1", "3");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.setFormat("0.00%");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("300.00%");
    model.setValue("A1", "=A1");
    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("#CYCLE");
  });
});
