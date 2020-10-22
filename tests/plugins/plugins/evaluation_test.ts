import { Model } from "../../../src/model";
import { functionRegistry, args } from "../../../src/functions/index";

import "../../canvas.mock";
import { getCell, setCellContent } from "../../helpers";

let model: Model = new Model();
beforeEach(() => {
  model = new Model();
});

describe("evaluate formula getter", () => {
  test("a ref in the current sheet", () => {
    setCellContent(model, "A1", "12");
    expect(model.getters.evaluateFormula("=A1")).toBe(12);
  });

  test("in another sheet", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const sheet2 = model.getters.getVisibleSheets()[1];
    setCellContent(model, "A1", "11", sheet2);
    expect(model.getters.evaluateFormula("=Sheet2!A1")).toBe(11);
  });

  // i think these formulas should throw
  test("in a not existing sheet", () => {
    expect(() => model.getters.evaluateFormula("=Sheet99!A1")).toThrow();
  });

  test("evaluate a cell in error", () => {
    setCellContent(model, "A1", "=mqsdlkjfqsdf(((--");
    expect(() => model.getters.evaluateFormula("=A1")).toThrow();
  });

  test("evaluate an invalid formula", () => {
    setCellContent(model, "A1", "=min(abc)");
    expect(() => model.getters.evaluateFormula("=A1")).toThrow();
  });

  test("evaluate a pending cell (async)", () => {
    setCellContent(model, "A1", "=wait(99999)");
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
    setCellContent(model, "A1", "=GETVALUE()");
    expect(getCell(model, "A1")!.value).toBe(1);
    value = 2;
    model.dispatch("EVALUATE_CELLS");
    expect(getCell(model, "A1")!.value).toBe(2);
  });

  test("using cells in other sheets", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const s = model.getters.getSheets();
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: s[1].id, sheetIdTo: s[0].id });
    setCellContent(model, "A1", "12", s[1].id);
    setCellContent(model, "A2", "=A1", s[1].id);
    setCellContent(model, "A2", "=Sheet2!A1", s[0].id);
    expect(getCell(model, "A2", s[0].id)!.value).toBe(12);
  });
});
