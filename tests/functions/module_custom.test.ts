import { setCellContent, setCellFormat, setFormat } from "../test_helpers/commands_helpers";
import { getCellContent, getCellError } from "../test_helpers/getters_helpers";
import { createModel, evaluateCellText } from "../test_helpers/helpers";
describe("FORMAT.LARGE.NUMBER formula", () => {
  test("large positive numbers", async () => {
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100)" })).toBe("100");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000)" })).toBe("1,000");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000)" })).toBe("10,000");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000)" })).toBe("100k");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000)" })).toBe("1,000k");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000)" })).toBe("10,000k");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000)" })).toBe("100m");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000000)" })).toBe("1,000m");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000000)" })).toBe(
      "10,000m"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000)" })).toBe("100b");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(1000000000000)" })).toBe(
      "1,000b"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(10000000000000)" })).toBe(
      "10,000b"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000000)" })).toBe(
      "1.00e+14"
    );
  });
  test("large negative numbers", async () => {
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100)" })).toBe("-100");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000)" })).toBe("-1,000");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000)" })).toBe("-10,000");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000)" })).toBe("-100k");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000)" })).toBe("-1,000k");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000)" })).toBe(
      "-10,000k"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000)" })).toBe("-100m");
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000000)" })).toBe(
      "-1,000m"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000000)" })).toBe(
      "-10,000m"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000000)" })).toBe(
      "-100b"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-1000000000000)" })).toBe(
      "-1,000b"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-10000000000000)" })).toBe(
      "-10,000b"
    );
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(-100000000000000)" })).toBe(
      "-1.00e+14"
    );
  });
  test("number as strings", async () => {
    expect(await evaluateCellText("A1", { A1: `=FORMAT.LARGE.NUMBER("100000")` })).toBe("100k");
  });
  test("Result does not contain decimals", async () => {
    // < 100k
    const model = await createModel();
    await setCellContent(model, "A1", "100.60");
    await setCellFormat(model, "A1", "#,000.00");
    await setCellContent(model, "A2", "=FORMAT.LARGE.NUMBER(A1)");
    expect(getCellContent(model, "A2")).toBe("101");
    // < 100m
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000.60)" })).toBe("100k");
    // < 100b
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000.60)" })).toBe("100m");
    // >= 100b
    expect(await evaluateCellText("A1", { A1: "=FORMAT.LARGE.NUMBER(100000000000.60)" })).toBe(
      "100b"
    );
  });
  test("not a number", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `=FORMAT.LARGE.NUMBER("a string")`);
    expect(getCellContent(model, "A1")).toBe("#ERROR");
    expect(getCellError(model, "A1")).toBe(
      "The function FORMAT.LARGE.NUMBER expects a number value, but 'a string' is a string, and cannot be coerced to a number."
    );
  });
  test("dates preserves the date format", async () => {
    expect(
      await evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/1000",
      })
    ).toBe("01/01/1000");
    expect(
      await evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/2022",
      })
    ).toBe("01/01/2022");
    expect(
      await evaluateCellText("A1", {
        A1: "=FORMAT.LARGE.NUMBER(B1)",
        B1: "01/01/5022",
      })
    ).toBe("01/01/5022");
  });
  test("formatting units are taken into account", async () => {
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "k")' })).toBe("0k");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "k")' })).toBe("1k");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "k")' })).toBe("10k");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "k")' })).toBe("100k");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "k")' })).toBe(
      "1,000k"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "k")' })).toBe(
      "10,000k"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "k")' })).toBe(
      "100,000k"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "k")' })).toBe(
      "1,000,000k"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "k")' })).toBe(
      "10,000,000k"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "m")' })).toBe("0m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "m")' })).toBe("0m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "m")' })).toBe("0m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "m")' })).toBe("0m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "m")' })).toBe("1m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "m")' })).toBe("10m");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "m")' })).toBe(
      "100m"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "m")' })).toBe(
      "1,000m"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "m")' })).toBe(
      "10,000m"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100000000, "b")' })).toBe("0b");
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(1000000000, "b")' })).toBe(
      "1b"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(10000000000, "b")' })).toBe(
      "10b"
    );
    expect(await evaluateCellText("A1", { A1: '=FORMAT.LARGE.NUMBER(100, "something")' })).toBe(
      "#ERROR"
    );
  });
  test("Original currency format is kept", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "100000");
    await setFormat(model, "A1", "#,##0[$€]");
    await setCellContent(model, "A2", "=FORMAT.LARGE.NUMBER(A1)");
    expect(getCellContent(model, "A2")).toBe("100k€");
  });
  test("Chaining FORMAT.LARGE.NUMBER does nothing with automatic/same unit", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "500000");
    await setCellContent(model, "A2", "=FORMAT.LARGE.NUMBER(A1)");
    await setCellContent(model, "A3", "=FORMAT.LARGE.NUMBER(A2)");
    expect(getCellContent(model, "A2")).toBe("500k");
    expect(getCellContent(model, "A3")).toBe("500k");
    await setCellContent(model, "B1", "=FORMAT.LARGE.NUMBER(FORMAT.LARGE.NUMBER(500000))");
    expect(getCellContent(model, "B1")).toBe("500k");
  });
  test("Chaining FORMAT.LARGE.NUMBER with different units", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "5000000000");
    await setCellContent(model, "A2", '=FORMAT.LARGE.NUMBER(A1, "m")');
    await setCellContent(model, "A3", '=FORMAT.LARGE.NUMBER(A2, "b")');
    expect(getCellContent(model, "A2")).toBe("5,000m");
    expect(getCellContent(model, "A3")).toBe("5b");
  });
  test("FORMAT.LARGE.NUMBER breaks with custom currency that have the same look as the unit", async () => {
    const model = await createModel();
    await setFormat(model, "A1", "#,##0[$k]");
    await setCellContent(model, "A1", "5000000000");
    await setCellContent(model, "A2", '=FORMAT.LARGE.NUMBER(A1, "m")');
    // should be "5,000mk" in a perfect world. But we cannot tell the difference between a custom currency and a unit in a format.
    expect(getCellContent(model, "A2")).toBe("5,000m");
  });
  test("Percentage in decimal part is preserved by FORMAT.LARGE.NUMBER", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "100000");
    await setFormat(model, "A1", "#,##0.0%");
    await setCellContent(model, "A2", "=FORMAT.LARGE.NUMBER(A1)");
    expect(getCellContent(model, "A2")).toBe("10,000k%");
  });
});
