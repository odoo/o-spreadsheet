import { args } from "../../src/functions/arguments";
import { addFunction } from "../../src/functions/index";
import { evaluateCell } from "../helpers";

describe("addFunction", () => {
  test("can add a function", () => {
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#BAD_EXPR");
    addFunction("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: arg => 2 * arg,
      args: args`number (number) my number`,
      returns: ["NUMBER"]
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
  });
});
