import { Model } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellContent, getCellError } from "../test_helpers/getters_helpers";
import { evaluateCellText } from "../test_helpers/helpers";

describe("FORMAT.LARGE.NUMBER formula", () => {
  test("large positive numbers", () => {
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100)" })).toBe("100");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000)" })).toBe("1,000");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000)" })).toBe("10,000");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000)" })).toBe("100k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000)" })).toBe("1,000k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000)" })).toBe("10,000k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000)" })).toBe("100m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000000)" })).toBe("1,000m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000000)" })).toBe("10,000m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000)" })).toBe("100b");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000000000)" })).toBe("1,000b");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000000000)" })).toBe("10,000b");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000000)" })).toBe(
      "100,000b"
    );
  });

  test("large negative numbers", () => {
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100)" })).toBe("-100");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000)" })).toBe("-1,000");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000)" })).toBe("-10,000");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000)" })).toBe("-100k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000)" })).toBe("-1,000k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000)" })).toBe("-10,000k");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000)" })).toBe("-100m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000000)" })).toBe("-1,000m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000000)" })).toBe("-10,000m");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000000)" })).toBe("-100b");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000000000)" })).toBe("-1,000b");
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000000000)" })).toBe(
      "-10,000b"
    );
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000000000)" })).toBe(
      "-100,000b"
    );
  });

  test("number as strings", () => {
    expect(evaluateCellText("A1", { A1: `=FORMAT.LARGE.NUMBER("100000")` })).toBe("100k");
  });

  test("not a number", () => {
    const model = new Model();
    setCellContent(model, "A1", `=FORMAT.LARGE.NUMBER("a string")`);
    expect(getCellContent(model, "A1")).toBe("#ERROR");
    expect(getCellError(model, "A1")).toBe(
      "The function FORMAT.LARGE.NUMBER expects a number value, but 'a string' is a string, and cannot be coerced to a number."
    );
  });

  test("dates preserves the date format", () => {
    expect(
      evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/1000",
      })
    ).toBe("01/01/1000");
    expect(
      evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/2022",
      })
    ).toBe("01/01/2022");
    expect(
      evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/5022",
      })
    ).toBe("01/01/5022");
  });
});
