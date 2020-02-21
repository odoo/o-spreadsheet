import { formatNumber, formatDecimal, formatPercent, formatValue } from "../src/formatters";

describe("primitive formatting functions", () => {
  test("formatNumber", () => {
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-1)).toBe("-1");
    expect(formatNumber(0.1)).toBe("0.1");
    expect(formatNumber(0.01)).toBe("0.01");
    expect(formatNumber(0.001)).toBe("0.001");
    expect(formatNumber(0.0001)).toBe("0.0001");
    expect(formatNumber(0.00001)).toBe("0.00001");
    expect(formatNumber(0.000001)).toBe("0.000001");
    expect(formatNumber(0.0000001)).toBe("0.0000001");
    expect(formatNumber(0.00000001)).toBe("0.00000001");
    expect(formatNumber(0.000000001)).toBe("0.000000001");
    expect(formatNumber(0.0000000001)).toBe("0.0000000001");
    expect(formatNumber(0.00000000001)).toBe("0");
    expect(formatNumber(0.000000000001)).toBe("0");

    // @compatibility note: in Google Sheets, the next three tests result in 1234512345
    expect(formatNumber(1234512345.1)).toBe("1234512345.1");
    expect(formatNumber(1234512345.12)).toBe("1234512345.12");
    expect(formatNumber(1234512345.123)).toBe("1234512345.123");

    expect(formatNumber(123.10000000001)).toBe("123.1");
    expect(formatNumber(123.10000000000000001)).toBe("123.1");
  });

  test("formatDecimal", () => {
    expect(formatDecimal(0, 0)).toBe("0");
    expect(formatDecimal(0, 1)).toBe("0.0");
    expect(formatDecimal(0, 2)).toBe("0.00");
    expect(formatDecimal(0, 3)).toBe("0.000");

    expect(formatDecimal(1, 0)).toBe("1");
    expect(formatDecimal(1, 1)).toBe("1.0");
    expect(formatDecimal(1, 2)).toBe("1.00");
    expect(formatDecimal(1, 3)).toBe("1.000");

    expect(formatDecimal(1.1, 0)).toBe("1");
    expect(formatDecimal(1.1, 1)).toBe("1.1");
    expect(formatDecimal(1.1, 2)).toBe("1.10");
    expect(formatDecimal(1.1, 3)).toBe("1.100");

    expect(formatDecimal(5.1, 0)).toBe("5");
    expect(formatDecimal(5.1, 1)).toBe("5.1");
    expect(formatDecimal(5.1, 2)).toBe("5.10");
    expect(formatDecimal(5.1, 3)).toBe("5.100");

    expect(formatDecimal(-1, 0)).toBe("-1");
    expect(formatDecimal(-1, 1)).toBe("-1.0");
    expect(formatDecimal(-1, 2)).toBe("-1.00");
    expect(formatDecimal(-1, 3)).toBe("-1.000");

    expect(formatDecimal(-5.1, 0)).toBe("-5");
    expect(formatDecimal(-5.1, 1)).toBe("-5.1");
    expect(formatDecimal(-5.1, 2)).toBe("-5.10");
    expect(formatDecimal(-5.1, 3)).toBe("-5.100");

    expect(formatDecimal(-0.5, 0)).toBe("-1");
    expect(formatDecimal(-0.5, 1)).toBe("-0.5");
    expect(formatDecimal(-0.5, 2)).toBe("-0.50");
    expect(formatDecimal(-0.5, 3)).toBe("-0.500");
  });

  test("formatDecimal, thousand separator", () => {
    expect(formatDecimal(100, 2, "s")).toBe("100.00");
    expect(formatDecimal(1000, 2, "s")).toBe("1s000.00");
    expect(formatDecimal(10000, 2, "s")).toBe("10s000.00");
    expect(formatDecimal(100000, 2, "s")).toBe("100s000.00");
    expect(formatDecimal(1000000, 2, "s")).toBe("1s000s000.00");
  });

  test("formatPercent", () => {
    expect(formatPercent(0)).toBe("0.00%");
    expect(formatPercent(0.123)).toBe("12.30%");
    expect(formatPercent(0.1234)).toBe("12.34%");
  });
});

describe("formatValue function", () => {
  test("a normal number: #,##0.00", () => {
    expect(formatValue(0, "#,##0.00")).toBe("0.00");
    expect(formatValue(1, "#,##0.00")).toBe("1.00");
    expect(formatValue(1.1, "#,##0.00")).toBe("1.10");
    expect(formatValue(5.1, "#,##0.00")).toBe("5.10");
    expect(formatValue(-1, "#,##0.00")).toBe("-1.00");
    expect(formatValue(10, "#,##0.00")).toBe("10.00");
    expect(formatValue(100, "#,##0.00")).toBe("100.00");
    expect(formatValue(1000, "#,##0.00")).toBe("1,000.00");
    expect(formatValue(10000, "#,##0.00")).toBe("10,000.00");
    expect(formatValue(100000, "#,##0.00")).toBe("100,000.00");
    expect(formatValue(1000000, "#,##0.00")).toBe("1,000,000.00");
  });

  test("formatPercent", () => {
    expect(formatValue(0, "0.00%")).toBe("0.00%");
    expect(formatValue(0.123, "0.00%")).toBe("12.30%");
    expect(formatValue(0.1234, "0.00%")).toBe("12.34%");
    expect(formatValue(0.12345, "0.00%")).toBe("12.35%");
  });
});
