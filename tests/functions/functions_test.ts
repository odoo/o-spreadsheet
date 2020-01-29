import { addFunction, args } from "../../src/functions/functions";
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
      args: args`number (number) my number`,
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

describe("args", () => {
  test("various", () => {
    expect(args``).toEqual([]);
    expect(args`test (number) some number`).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      }
    ]);

    expect(args`
       test (number) some number
       test2 (number) some other number
      `).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      },
      {
        type: ["NUMBER"],
        description: "some other number",
        name: "test2"
      }
    ]);
  });

  test("empty description", () => {
    expect(args`test (number)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("does not care if lower or uppercase", () => {
    expect(args`test (NUMBER)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("accept all types", () => {
    expect(args`test (boolean)`[0].type).toEqual(["BOOLEAN"]);
    expect(args`test (any)`[0].type).toEqual(["ANY"]);
    expect(args`test (range)`[0].type).toEqual(["RANGE"]);
    expect(args`test (CELL)`[0].type).toEqual(["CELL"]);
    expect(args`test (NumBer)`[0].type).toEqual(["NUMBER"]);
    expect(args`test (string)`[0].type).toEqual(["STRING"]);
  });

  test("accept multiple types", () => {
    expect(args`test (boolean,cell)`[0].type).toEqual(["BOOLEAN", "CELL"]);
    expect(args`test (string,any)`[0].type).toEqual(["STRING", "ANY"]);
  });

  test("accept optional flag", () => {
    expect(args`test (boolean,optional)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        optional: true
      }
    ]);
    expect(args`test (boolean,optional,cell)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "CELL"],
        optional: true
      }
    ]);
  });
  test("accept repeating flag", () => {
    expect(args`test (boolean,repeating)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        repeating: true
      }
    ]);
    expect(args`test (boolean,repeating,cell)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "CELL"],
        repeating: true
      }
    ]);
  });
});
