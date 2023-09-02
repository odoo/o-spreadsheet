import { Model } from "../../src";
import { setCellContent, setCellFormat } from "../test_helpers/commands_helpers";
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

  test("Result does not contain decimals", () => {
    // < 100k
    const model = new Model();
    setCellContent(model, "A1", "100.60");
    setCellFormat(model, "A1", "#,000.00");
    setCellContent(model, "A2", "=FORMAT.LARGE.NUMBER(A1)");
    expect(getCellContent(model, "A2")).toBe("101");
    // < 100m
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000.60)" })).toBe("100k");
    // < 100b
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000.60)" })).toBe("100m");
    // >= 100b
    expect(evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000.60)" })).toBe("100b");
  });
  test("not a number", () => {
    const model = new Model();
    setCellContent(model, "A1", `=FORMAT.LARGE.NUMBER("a string")`);
    expect(getCellContent(model, "A1")).toBe("#ERROR");
    expect(getCellError(model, "A1")?.message).toBe(
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

  test("formatting units are taken into account", () => {
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "k")' })).toBe("0k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "k")' })).toBe("1k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "k")' })).toBe("10k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "k")' })).toBe("100k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "k")' })).toBe("1,000k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "k")' })).toBe("10,000k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "k")' })).toBe("100,000k");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "k")' })).toBe(
      "1,000,000k"
    );
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "k")' })).toBe(
      "10,000,000k"
    );

    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "m")' })).toBe("0m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "m")' })).toBe("0m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "m")' })).toBe("0m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "m")' })).toBe("0m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "m")' })).toBe("1m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "m")' })).toBe("10m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "m")' })).toBe("100m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "m")' })).toBe("1,000m");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "m")' })).toBe(
      "10,000m"
    );

    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "b")' })).toBe("0b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "b")' })).toBe("1b");
    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "b")' })).toBe("10b");

    expect(evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "something")' })).toBe("#ERROR");
  });
});
