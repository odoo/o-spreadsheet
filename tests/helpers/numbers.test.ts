import {
  defaultNumberFormat,
  formatComposerNumber,
  formatDecimal,
  formatNumber,
  isNumber,
  parseNumber,
} from "../../src/helpers/index";

describe("isNumber", () => {
  test("recognize various number representations", () => {
    expect(isNumber("1")).toBe(true);
    expect(isNumber("1.1")).toBe(true);
    expect(isNumber(".3")).toBe(true);
    expect(isNumber("1,234")).toBe(true);
    expect(isNumber("1234567,123,123")).toBe(true);
    expect(isNumber("1234567,12345,567")).toBe(true);
    expect(isNumber("1,234.56")).toBe(true);
    expect(isNumber("1%")).toBe(true);
    expect(isNumber("1.5%")).toBe(true);
    expect(isNumber("1.5 %")).toBe(true);
    expect(isNumber("-3.3%")).toBe(true);
    expect(isNumber("1.2e4")).toBe(true);
    expect(isNumber("1e5")).toBe(true);
    expect(isNumber("-1e3")).toBe(true);
    expect(isNumber(".3%")).toBe(true);
    expect(isNumber("-  3")).toBe(true);
    expect(isNumber(".3e10")).toBe(true);
    expect(isNumber("3E14")).toBe(true);
    expect(isNumber("3E+14")).toBe(true);
    expect(isNumber("3E-0")).toBe(true);
    expect(isNumber("3E-42")).toBe(true);
    expect(isNumber("3    %")).toBe(true); // doesn't work on google sheet
    expect(isNumber("3e10%")).toBe(true); // works on google sheet and Excel online
    expect(isNumber("3e10 %")).toBe(true); // works on google sheet and Excel online
    expect(isNumber("123$")).toBe(true); // doesn't work on Excel online
    expect(isNumber("123 $")).toBe(true); // doesn't work on Excel online
    expect(isNumber("$123")).toBe(true); // doesn't work ond Excel online
    expect(isNumber("$ 123")).toBe(true); // doesn't work ond Excel online
    expect(isNumber("-123 $")).toBe(true); // doesn't work on Excel online
    expect(isNumber("-$ 123")).toBe(true); // doesn't work on Excel online
    expect(isNumber("$ - 123")).toBe(true); // doesn't work on Excel online
    expect(isNumber("- 3E10 $")).toBe(true); // doesn't work on Excel online
    expect(isNumber("€ 123")).toBe(true); // doesn't work on Excel online
    expect(isNumber("-€ 12,123.123E02")).toBe(true); // doesn't work on Excel online
  });

  test("some other checks for isNumber", () => {
    expect(isNumber("")).toBe(false);
    expect(isNumber("1.1.1")).toBe(false);
    expect(isNumber("e10")).toBe(false);
    expect(isNumber(".")).toBe(false);
    expect(isNumber(" - .e10")).toBe(false);
    expect(isNumber("3 E14")).toBe(false);
    expect(isNumber("1234567,24,567")).toBe(false);
    expect(isNumber("$123$")).toBe(false);
    expect(isNumber("$123€")).toBe(false);
    expect(isNumber("12$3")).toBe(false);
  });
});

describe("parseNumber", () => {
  test("parse empty string as 0", () => {
    expect(parseNumber("")).toBe(0);
  });

  test("can parse various number representations", () => {
    expect(parseNumber("1")).toBe(1);
    expect(parseNumber("-1")).toBe(-1);
    expect(parseNumber("1.1")).toBe(1.1);
    expect(parseNumber(".3")).toBe(0.3);
    expect(parseNumber("1,234")).toBe(1234);
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1,234%")).toBe(12.34);
    expect(parseNumber("1%")).toBe(0.01);
    expect(parseNumber("1 %")).toBe(0.01);
    expect(parseNumber("1.5%")).toBe(0.015);
    expect(parseNumber("-3.3%")).toBe(-0.033);
    expect(parseNumber(".3%")).toBe(0.003);
    expect(parseNumber("1.2e4")).toBe(12000);
    expect(parseNumber("1e5")).toBe(100000);
    expect(parseNumber("-1E3")).toBe(-1000);
    expect(parseNumber("3e+4")).toBe(30000);
    expect(parseNumber("3E-4")).toBe(0.0003);
    expect(parseNumber("1e2 %")).toBe(1);
    expect(parseNumber("1,234e1")).toBe(12340);
    expect(parseNumber("$123")).toBe(123);
    expect(parseNumber("€123")).toBe(123);
    expect(parseNumber("$ 123")).toBe(123);
    expect(parseNumber("123$")).toBe(123);
    expect(parseNumber("123 $")).toBe(123);
    expect(parseNumber("-$123")).toBe(-123);
    expect(parseNumber("$-123")).toBe(-123);
    expect(parseNumber("-123$")).toBe(-123);
    expect(parseNumber("-123E2$")).toBe(-12300);
  });
});

test("formatComposerNumber function", () => {
  expect(formatComposerNumber(0)).toBe("0");
  expect(formatComposerNumber(123)).toBe("123");
  expect(formatComposerNumber(-456.123)).toBe("-456.123");
  expect(formatComposerNumber(1234567890.12345)).toBe("1234567890.12345");
  expect(formatComposerNumber(9999999999)).toBe("9999999999");
  expect(formatComposerNumber(10000000000)).toBe("1E+10");
  expect(formatComposerNumber(12345678901)).toBe("1.2345678901E+10");
  expect(formatComposerNumber(0.000000001)).toBe("0.000000001");
  expect(formatComposerNumber(0.00000000123456)).toBe("0.00000000123456");
  expect(formatComposerNumber(0.0000000009876543)).toBe("9.876543E-10");
  expect(formatComposerNumber(0.000000000987654321012345)).toBe("9.87654321012345E-10");
});

describe("defaultNumberFormat function", () => {
  describe("test with moderate magnitude order", () => {
    test("test without exceed 10 digits", () => {
      expect(defaultNumberFormat(0)).toBe("0");
      expect(defaultNumberFormat(1)).toBe("0");
      expect(defaultNumberFormat(123)).toBe("0");
      expect(defaultNumberFormat(1234567890)).toBe("0");
      expect(defaultNumberFormat(123.456)).toBe("0.000");
      expect(defaultNumberFormat(123.456789)).toBe("0.000000");
      expect(defaultNumberFormat(0.01)).toBe("0.00");
      expect(defaultNumberFormat(0.001)).toBe("0.000");
      expect(defaultNumberFormat(0.0001)).toBe("0.0000");
      expect(defaultNumberFormat(0.00001)).toBe("0.00000");
      expect(defaultNumberFormat(0.000001)).toBe("0.000000");
      expect(defaultNumberFormat(0.0000001)).toBe("0.0000000");
      expect(defaultNumberFormat(0.00000001)).toBe("0.00000000");
      expect(defaultNumberFormat(0.000000001)).toBe("0.000000000");
    });

    test("exceed 10 digits --> limit the number take into account in the decimal part", () => {
      expect(defaultNumberFormat(1234567890.9)).toBe("0");
      expect(defaultNumberFormat(123456789.88)).toBe("0.0");
      expect(defaultNumberFormat(123456789.99)).toBe("0");
      expect(defaultNumberFormat(12345.678888888)).toBe("0.00000");
      expect(defaultNumberFormat(12345.678999999)).toBe("0.000");
      expect(defaultNumberFormat(1.2345678888)).toBe("0.000000000");
      expect(defaultNumberFormat(1.2345678999)).toBe("0.0000000");
      expect(defaultNumberFormat(0.00000123456789)).toBe("0.000000000");
    });

    test("exceed 10 digits --> not count 0 digits located at the end of the decimal part taking into account", () => {
      expect(defaultNumberFormat(12345.678901)).toBe("0.0000");
      expect(defaultNumberFormat(12345.600001)).toBe("0.0");
      expect(defaultNumberFormat(123456789.01)).toBe("0");
      expect(defaultNumberFormat(1.1000000001)).toBe("0.0");
      expect(defaultNumberFormat(1.1000100001)).toBe("0.00000");
    });
  });
  describe("adopt exponential format if the value is bigger the most bigger number with 10 digits", () => {
    // the most bigger number with 10 digits is 9999999999

    test("test values at limit of 10 digits", () => {
      expect(defaultNumberFormat(9999999999)).toBe("0");
      expect(defaultNumberFormat(9999999999.9999)).toBe("0");
      expect(defaultNumberFormat(10000000000)).toBe("0E+0");
    });

    test("limit the format to take into account a maximum of 5 digits ", () => {
      expect(defaultNumberFormat(98888888888)).toBe("0.0000E+0");
      expect(defaultNumberFormat(99999999999)).toBe("0E+0");
      expect(defaultNumberFormat(99998888888)).toBe("0.0000E+0");
      expect(defaultNumberFormat(99999888888)).toBe("0E+0");
      expect(defaultNumberFormat(33333333333.8)).toBe("0.0000E+0");
      expect(defaultNumberFormat(333333333333)).toBe("0.0000E+0");
      expect(defaultNumberFormat(12000000000)).toBe("0.0E+0");
      expect(defaultNumberFormat(12340000000)).toBe("0.000E+0");
      expect(defaultNumberFormat(12345000000)).toBe("0.0000E+0");
      expect(defaultNumberFormat(12345600000)).toBe("0.0000E+0");
    });

    test("not count 0 digits that located at the end of the 5 maximum digits", () => {
      expect(defaultNumberFormat(12040399999)).toBe("0.000E+0");
      expect(defaultNumberFormat(12040699999)).toBe("0.0000E+0");
      expect(defaultNumberFormat(12300278901)).toBe("0.00E+0");
      expect(defaultNumberFormat(12300778901)).toBe("0.0000E+0");
    });
  });

  describe("adopt exponential format if the value is smaller the most smaller number with 10 digits", () => {
    // the most smaller number with 10 digits is 0.000000001
    test("test values at limit of 10 digits", () => {
      expect(defaultNumberFormat(0.000000001)).toBe("0.000000000");
      expect(defaultNumberFormat(0.0000000011)).toBe("0.000000000");
      expect(defaultNumberFormat(0.0000000009)).toBe("0E+0");
    });

    test("limit the format to take into account a maximum of 5 digits ", () => {
      expect(defaultNumberFormat(0.000000000999)).toBe("0.00E+0");
      expect(defaultNumberFormat(0.00000000012345)).toBe("0.0000E+0");
      expect(defaultNumberFormat(0.000000000123456)).toBe("0.0000E+0");
    });

    test("not count 0 digits that located at the end of the 5 maximum digits", () => {
      expect(defaultNumberFormat(0.000000000120402)).toBe("0.000E+0");
      expect(defaultNumberFormat(0.000000000120406)).toBe("0.0000E+0");
      expect(defaultNumberFormat(0.000000000120002)).toBe("0.0E+0");
      expect(defaultNumberFormat(0.000000000120006)).toBe("0.0000E+0");
    });
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

  test("formatPercent, with various number of decimals", () => {
    expect(formatNumber(0.1234, "0%")).toBe("12%");
    expect(formatNumber(0.1234, "0.0%")).toBe("12.3%");
    expect(formatNumber(0.1234, "0.00%")).toBe("12.34%");
    expect(formatNumber(0.1234, "0.000%")).toBe("12.340%");
  });

  test("can apply exponential format", () => {
    expect(formatNumber(0.1234, "0E+0")).toBe("1E-1");
    expect(formatNumber(0.1234, "0.0E+0")).toBe("1.2E-1");
    expect(formatNumber(0.01234, "0.0E+0")).toBe("1.2E-2");
    expect(formatNumber(0.01234, "0.00000E+0")).toBe("1.23400E-2");

    expect(formatNumber(1234, "0E+0")).toBe("1E+3");
    expect(formatNumber(1234, "0.0E+0")).toBe("1.2E+3");
    expect(formatNumber(12340, "0.0E+0")).toBe("1.2E+4");
    expect(formatNumber(12340, "0.00000E+0")).toBe("1.23400E+4");

    expect(formatNumber(1678, "0E+0")).toBe("2E+3");
    expect(formatNumber(1678, "0.0E+0")).toBe("1.7E+3");
    expect(formatNumber(16789, "0.0E+0")).toBe("1.7E+4");
    expect(formatNumber(16789, "0.00000E+0")).toBe("1.67890E+4");
  });

  test("can apply exponential format with specific magnitude order length", () => {
    expect(formatNumber(123, "0E+0")).toBe("1E+2");
    expect(formatNumber(123, "0E+00")).toBe("1E+02");
    expect(formatNumber(123, "0E+000")).toBe("1E+002");

    expect(formatNumber(12345678901, "0.00E+0")).toBe("1.23E+10");
    expect(formatNumber(12345678901, "0.00E+00")).toBe("1.23E+10");
    expect(formatNumber(12345678901, "0.00E+000")).toBe("1.23E+010");
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

describe("formatDecimal function", () => {
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

  test("formatDecimal, thousand separator", () => {
    expect(formatDecimal(100, 2, "s")).toBe("100.00");
    expect(formatDecimal(1000, 2, "s")).toBe("1s000.00");
    expect(formatDecimal(10000, 2, "s")).toBe("10s000.00");
    expect(formatDecimal(100000, 2, "s")).toBe("100s000.00");
    expect(formatDecimal(1000000, 2, "s")).toBe("1s000s000.00");
  });

  test("formatDecimal limitied to 20 decimals", () => {
    expect(formatDecimal(0.42, 20)).toBe("0.42000000000000000000");
    expect(formatDecimal(0.42, 21)).toBe("0.42000000000000000000");
  });
});
