import { Model } from "../../../src/model";
import { functionRegistry, args } from "../../../src/functions/index";

import "../../canvas.mock";
import { getCell } from "../../helpers";

let model: Model = new Model();
beforeEach(() => {
  model = new Model();
});

describe("evaluate formula getter", () => {
  test("a ref in the current sheet", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "12" });
    expect(model.getters.evaluateFormula("=A1")).toBe(12);
  });

  test("in another sheet", () => {
    model.dispatch("CREATE_SHEET");
    const sheet2 = model["workbook"].visibleSheets[1];
    model.dispatch("SET_VALUE", { xc: "A1", text: "11", sheet: sheet2 });
    expect(model.getters.evaluateFormula("=Sheet2!A1")).toBe(11);
  });

  // i think these formulas should throw
  test("in a not existing sheet", () => {
    expect(() => model.getters.evaluateFormula("=Sheet99!A1")).toThrow();
  });

  test("evaluate a cell in error", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "=mqsdlkjfqsdf(((--" });
    expect(() => model.getters.evaluateFormula("=A1")).toThrow();
  });

  test("evaluate a pending cell (async)", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "=wait(99999)" });
    expect(() => model.getters.evaluateFormula("=A1")).toThrow();
  });

  test("EVALUATE_CELLS with no argument re-evaluate all the cells", () => {
    let value = 1;
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: args(``),
      returns: ["NUMBER"],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=GETVALUE()" });
    expect(getCell(model, "A1")!.value).toBe(1);
    value = 2;
    model.dispatch("EVALUATE_CELLS");
    expect(getCell(model, "A1")!.value).toBe(2);
  });
});
