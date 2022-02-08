import {
  formatDecimal,
  formatNumber,
  formatStandardNumber,
  isNumber,
  parseNumber,
} from "../../src/helpers/index";

describe("isNumber", () => {
  test("recognize various number representations", () => {
    expect(isNumber("1")).toBe(true);
    expect(isNumber("1.1")).toBe(true);
    expect(isNumber(".3")).toBe(true);
    expect(isNumber("1,234")).toBe(true);
    expect(isNumber("1,234.56")).toBe(true);
    expect(isNumber("1%")).toBe(true);
    expect(isNumber("1.5%")).toBe(true);
    expect(isNumber("1.5 %")).toBe(true);
    expect(isNumber("-3.3%")).toBe(true);
    expect(isNumber("1.2e4")).toBe(true);
    expect(isNumber("1e5")).toBe(true);
    expect(isNumber("-1e3")).toBe(true);
  });

  test("some other checks for isNumber", () => {
    expect(isNumber("")).toBe(false);
    expect(isNumber("1.1.1")).toBe(false);
  });
});

describe("parseNumber", () => {
  test("parse empty string as 0", () => {
    expect(parseNumber("")).toBe(0);
  });

  test("can parse various number representations", () => {
    expect(parseNumber("1")).toBe(1);
    expect(parseNumber("1.1")).toBe(1.1);
    expect(parseNumber(".3")).toBe(0.3);
    expect(parseNumber("1,234")).toBe(1234);
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1%")).toBe(0.01);
    expect(parseNumber("1 %")).toBe(0.01);
    expect(parseNumber("1.5%")).toBe(0.015);
    expect(parseNumber("-3.3%")).toBe(-0.033);
    expect(parseNumber("1.2e4")).toBe(12000);
    expect(parseNumber("1e5")).toBe(100000);
    expect(parseNumber("-1e3")).toBe(-1000);
  });
});

describe("formatNumber", () => {
  test("formatNumber", () => {
    expect(formatStandardNumber(1)).toBe("1");
    expect(formatStandardNumber(0)).toBe("0");
    expect(formatStandardNumber(-1)).toBe("-1");
    expect(formatStandardNumber(0.1)).toBe("0.1");
    expect(formatStandardNumber(0.01)).toBe("0.01");
    expect(formatStandardNumber(0.001)).toBe("0.001");
    expect(formatStandardNumber(0.0001)).toBe("0.0001");
    expect(formatStandardNumber(0.00001)).toBe("0.00001");
    expect(formatStandardNumber(0.000001)).toBe("0.000001");
    expect(formatStandardNumber(0.0000001)).toBe("0.0000001");
    expect(formatStandardNumber(0.00000001)).toBe("0.00000001");
    expect(formatStandardNumber(0.000000001)).toBe("0.000000001");
    expect(formatStandardNumber(0.0000000001)).toBe("0.0000000001");
    expect(formatStandardNumber(0.00000000001)).toBe("0");
    expect(formatStandardNumber(0.000000000001)).toBe("0");

    // @compatibility note: in Google Sheets, the next three tests result in 1234512345
    expect(formatStandardNumber(1234512345.1)).toBe("1234512345.1");
    expect(formatStandardNumber(1234512345.12)).toBe("1234512345.12");
    expect(formatStandardNumber(1234512345.123)).toBe("1234512345.123");

    expect(formatStandardNumber(123.10000000001)).toBe("123.1");
    expect(formatStandardNumber(123.10000000000000001)).toBe("123.1");
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

    expect(formatDecimal(1.23456789, 0)).toBe("1");
    expect(formatDecimal(1.23456789, 2)).toBe("1.23");
    expect(formatDecimal(1.23456789, 5)).toBe("1.23457");
    expect(formatDecimal(1.23456789, 10)).toBe("1.2345678900");

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

  test("formatDecimal limitied to 20 decimals", () => {
    expect(formatDecimal(0.42, 20)).toBe("0.42000000000000000000");
    expect(formatDecimal(0.42, 21)).toBe("0.42000000000000000000");
  });

  test("formatDecimal, thousand separator", () => {
    expect(formatDecimal(100, 2, "s")).toBe("100.00");
    expect(formatDecimal(1000, 2, "s")).toBe("1s000.00");
    expect(formatDecimal(10000, 2, "s")).toBe("10s000.00");
    expect(formatDecimal(100000, 2, "s")).toBe("100s000.00");
    expect(formatDecimal(1000000, 2, "s")).toBe("1s000s000.00");
  });
});

describe("formatNumber function", () => {
  test("a normal number: #,##0.00", () => {
    expect(formatNumber(0, "#,##0.00")).toBe("0.00");
    expect(formatNumber(1, "#,##0.00")).toBe("1.00");
    expect(formatNumber(1.1, "#,##0.00")).toBe("1.10");
    expect(formatNumber(5.1, "#,##0.00")).toBe("5.10");
    expect(formatNumber(-1, "#,##0.00")).toBe("-1.00");
    expect(formatNumber(10, "#,##0.00")).toBe("10.00");
    expect(formatNumber(100, "#,##0.00")).toBe("100.00");
    expect(formatNumber(-100, "#,##0.00")).toBe("-100.00");
    expect(formatNumber(1000, "#,##0.00")).toBe("1,000.00");
    expect(formatNumber(10000, "#,##0.00")).toBe("10,000.00");
    expect(formatNumber(100000, "#,##0.00")).toBe("100,000.00");
    expect(formatNumber(1000000, "#,##0.00")).toBe("1,000,000.00");
    expect(formatNumber(-1000000, "#,##0.00")).toBe("-1,000,000.00");
    expect(formatNumber(0.1, "#,##0.00")).toBe("0.10");
    expect(formatNumber(0.01, "#,##0.00")).toBe("0.01");
    expect(formatNumber(0.001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.0001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.00001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.000001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.0000001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.00000001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.000000001, "#,##0.00")).toBe("0.00");
    expect(formatNumber(0.0000000001, "#,##0.00")).toBe("0.00");
  });

  test("formatPercent", () => {
    expect(formatNumber(0, "0.00%")).toBe("0.00%");
    expect(formatNumber(0.123, "0.00%")).toBe("12.30%");
    expect(formatNumber(0.1234, "0.00%")).toBe("12.34%");
    expect(formatNumber(0.12345, "0.00%")).toBe("12.35%");
  });

  test("formatPercent, with various number of decimals", () => {
    expect(formatNumber(0.1234, "0%")).toBe("12%");
    expect(formatNumber(0.1234, "0.0%")).toBe("12.3%");
    expect(formatNumber(0.1234, "0.00%")).toBe("12.34%");
    expect(formatNumber(0.1234, "0.000%")).toBe("12.340%");
  });

  test("can select different formatting for positive/negative", () => {
    const format = "#,##0.00;0.00%";
    expect(formatNumber(12345.54, format)).toBe("12,345.54");
    expect(formatNumber(0, format)).toBe("0.00");
    expect(formatNumber(-1.2, format)).toBe("120.00%"); // note the lack of - sign
  });

  test("can select different formatting for positive/negative/zero", () => {
    const format = "#,##0.0;0.00%;0.000";
    expect(formatNumber(12345.54, format)).toBe("12,345.5");
    expect(formatNumber(0, format)).toBe("0.000");
    expect(formatNumber(-1.2, format)).toBe("120.00%"); // note the lack of - sign
  });
});
