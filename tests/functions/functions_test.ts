import { args } from "../../src/functions/arguments";
import { addFunction, FunctionDescription } from "../../src/functions/index";
import { evaluateCell } from "../helpers";

describe("addFunction", () => {
  test("can add a function, once, but not twice", () => {
    let error;
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#BAD_EXPR");
    addFunction("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: arg => 2 * arg,
      args: args`number (number) my number`,
      returns: ["NUMBER"]
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);

    error = null;
    try {
      addFunction("DOUBLEDOUBLE", {
        description: "Double the first argument",
        compute: arg => 2 * arg,
        args: [],
        returns: ["NUMBER"]
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });
  test("Can replace existing function", () => {
    const description: FunctionDescription = {
      description: "Triple the first argument",
      compute: arg => 3 * arg,
      args: args`number (number) my number`,
      returns: ["NUMBER"]
    };
    addFunction("TRIPLETRIPLE", description);
    let error = null;
    try {
      addFunction("TRIPLETRIPLE", description, true);
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
  });
});
