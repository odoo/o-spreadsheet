import { GridModel } from "../../src/model/index";

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
});
