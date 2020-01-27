import { addFunction } from "../../src/functions/index";
import { evaluate } from "../helpers";

describe("addFunction", () => {
  test("can add a function, once, but not twice", () => {
    let error;
    try {
      evaluate("=DOUBLEDOUBLE(3)");
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    addFunction("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: arg => 2 * arg,
      args: []
    });
    expect(evaluate("=DOUBLEDOUBLE(3)")).toBe(6);

    error = null;
    try {
      addFunction("DOUBLEDOUBLE", {
        description: "Double the first argument",
        compute: arg => 2 * arg,
        args: []
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });
});
