import { parse } from "../../src/formulas";

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toEqual({ type: "FUNCALL", value: "RAND", args: [] });
  });

  test("AND", () => {
    expect(parse("=AND(true, false)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false }
      ]
    });
    expect(parse("=AND(0, tRuE)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true }
      ]
    });
  });

  test("can parse async functions", () => {
    expect(parse("=WAIT(12)")).toEqual({
      type: "ASYNC_FUNCALL",
      value: "WAIT",
      args: [{ type: "NUMBER", value: 12 }]
    });
  });
});
