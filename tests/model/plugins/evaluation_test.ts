import { GridModel } from "../../../src/model";

import "../../canvas.mock";

let model: GridModel = new GridModel();
beforeEach(() => {
  model = new GridModel();
});

describe("evaluate formula getter", () => {
  test("a ref in the current sheet", () => {
    model.setValue("A1", "12");
    expect(model.getters.evaluateFormula("=A1")).toBe(12);
  });

  test("in another sheet", () => {
    model.dispatch({ type: "CREATE_SHEET" });
    model.setValue("A1", "11", "Sheet2");
    expect(model.getters.evaluateFormula("=Sheet2!A1")).toBe(11);
  });

  // i think these formulas should throw
  test.skip("in a not existing sheet", () => {
    expect(model.getters.evaluateFormula("=Sheet99!A1")).toBeNull();
  });

  test.skip("evaluate a cell in error", () => {
    model.setValue("A1", "=mqsdlkjfqsdf(((--");
    expect(model.getters.evaluateFormula("=A1")).toBeUndefined();
  });

  test.skip("evaluate a pending cell (async)", () => {
    model.setValue("A1", "=wait(99999)");
    expect(model.getters.evaluateFormula("=A1")).toBeUndefined();
  });
});
