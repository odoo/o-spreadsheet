import { formatValue } from "../src/formatters";

describe("formatValue function", () => {
  test("a normal number: #,##0.00", () => {
    expect(formatValue(0, "#,##0.00")).toBe("0.00");
    expect(formatValue(1, "#,##0.00")).toBe("1.00");
    expect(formatValue(1.1, "#,##0.00")).toBe("1.10");
    expect(formatValue(5.1, "#,##0.00")).toBe("5.10");
    expect(formatValue(-1, "#,##0.00")).toBe("-1.00");
    expect(formatValue(10, "#,##0.00")).toBe("10.00");
    expect(formatValue(100, "#,##0.00")).toBe("100.00");
    expect(formatValue(-100, "#,##0.00")).toBe("-100.00");
    expect(formatValue(1000, "#,##0.00")).toBe("1,000.00");
    expect(formatValue(10000, "#,##0.00")).toBe("10,000.00");
    expect(formatValue(100000, "#,##0.00")).toBe("100,000.00");
    expect(formatValue(1000000, "#,##0.00")).toBe("1,000,000.00");
    expect(formatValue(-1000000, "#,##0.00")).toBe("-1,000,000.00");
  });

  test("formatPercent", () => {
    expect(formatValue(0, "0.00%")).toBe("0.00%");
    expect(formatValue(0.123, "0.00%")).toBe("12.30%");
    expect(formatValue(0.1234, "0.00%")).toBe("12.34%");
    expect(formatValue(0.12345, "0.00%")).toBe("12.35%");
  });

  test("formatPercent, with various number of decimals", () => {
    expect(formatValue(0.1234, "0%")).toBe("12%");
    expect(formatValue(0.1234, "0.0%")).toBe("12.3%");
    expect(formatValue(0.1234, "0.00%")).toBe("12.34%");
    expect(formatValue(0.1234, "0.000%")).toBe("12.340%");
  });

  test("can select different formatting for positive/negative", () => {
    const format = "#,##0.00;0.00%";
    expect(formatValue(12345.54, format)).toBe("12,345.54");
    expect(formatValue(0, format)).toBe("0.00");
    expect(formatValue(-1.2, format)).toBe("120.00%"); // note the lack of - sign
  });

  test("can select different formatting for positive/negative/zero", () => {
    const format = "#,##0.0;0.00%;0.000";
    expect(formatValue(12345.54, format)).toBe("12,345.5");
    expect(formatValue(0, format)).toBe("0.000");
    expect(formatValue(-1.2, format)).toBe("120.00%"); // note the lack of - sign
  });
});
