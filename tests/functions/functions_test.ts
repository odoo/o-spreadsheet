import { addFunction, Arg } from "../../src/functions/index";
import { evaluate } from "../helpers";

const ONE_NUMBER: Arg = {
  type: ["NUMBER"],
  description: "My number",
  name: "number"
};

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
      args: [ONE_NUMBER],
      returns: ["NUMBER"]
    });
    expect(evaluate("=DOUBLEDOUBLE(3)")).toBe(6);

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
});
