import { functionRegistry, args } from "../../src/functions/index";
import { evaluateCell } from "../helpers";
import { Model } from "../../src";

describe("addFunction", () => {
  test("can add a function", () => {
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#BAD_EXPR");
    functionRegistry.add("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: (arg: number) => (2 * arg) as any,
      args: args`number (number) my number`,
      returns: ["NUMBER"],
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
  });

  test("Can use a getter in a function", () => {
    const model = new Model();
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        return (this as any).getters.getActiveSheet();
      },
      args: args``,
      returns: ["STRING"],
    });
    expect(evaluateCell("A1", { A1: "=GETACTIVESHEET()" })).toBe(model.getters.getActiveSheet());
  });
});
