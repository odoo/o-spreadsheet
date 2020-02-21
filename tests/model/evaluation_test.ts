import { GridModel } from "../../src/model/index";
import { formatCell } from "../../src/model/core";

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "2");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(3);
  });

  test("With empty content", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(1);
  });

  test("With empty cell", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(1);
  });

  test("handling some errors", () => {
    const model = new GridModel();
    model.setValue("A1", "=A1");
    model.setValue("A2", "=A1");
    model.setValue("A3", "=+");
    model.setValue("A4", "=1 + A3");
    expect(model.state.cells["A1"].value).toEqual("#CYCLE");
    expect(model.state.cells["A2"].value).toEqual("#ERROR");
    expect(model.state.cells["A3"].value).toEqual("#BAD_EXPR");
    expect(model.state.cells["A4"].value).toEqual("#ERROR");
  });

  test("error in an addition", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1+A2");

    expect(model.state.cells.A3.value).toBe(3);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(43);
  });

  test("error in an substraction", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1-A2");

    expect(model.state.cells.A3.value).toBe(-1);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1*A2");

    expect(model.state.cells.A3.value).toBe(2);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1/A2");

    expect(model.state.cells.A3.value).toBe(0.5);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "30");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(3);
  });

  test("range", () => {
    const model = new GridModel();
    model.setValue("D4", "42");
    model.setValue("A1", "=sum(A2:Z10)");

    expect(model.state.cells.A1.value).toBe(42);
  });

  test("evaluate clear formattedValue cache", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "=A1");
    formatCell(model.state, model.state.cells.A2);
    expect(model.state.cells.A2.formattedValue).toBe("1");
    model.setValue("A1", "2");
    expect(model.state.cells.A2.formattedValue).not.toBeDefined();
    formatCell(model.state, model.state.cells.A2);
    expect(model.state.cells.A2.formattedValue).toBe("2");
  });

  test("misc math formulas", () => {
    const model = new GridModel();
    model.setValue("A1", "42");
    model.setValue("A2", "2");
    model.setValue("B3", "2.3");
    model.setValue("C1", "=countblank(A1:A10)");
    model.setValue("C2", "=sum(A1,B1)");
    model.setValue("C3", "=countblank(B1:A1)");
    model.setValue("C4", "=floor(B3)");
    model.setValue("C5", "=floor(A8)");
    model.setValue("C6", "=sum(A1:A4,B1:B5)");

    expect(model.state.cells.C1.value).toBe(8);
    expect(model.state.cells.C2.value).toBe(42);
    expect(model.state.cells.C3.value).toBe(1);
    expect(model.state.cells.C4.value).toBe(2);
    expect(model.state.cells.C5.value).toBe(0);
    expect(model.state.cells.C6.value).toBe(46.3);
  });

});
