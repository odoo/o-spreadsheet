import { isNumber, parseNumber } from "../../src/helpers/index";

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
    expect(isNumber("- € 123")).toBe(true); // doesn't work on Excel online
    expect(isNumber("€  - 123")).toBe(true); // doesn't work on Excel online
    expect(isNumber(" 123 €")).toBe(true); // doesn't work on Excel online
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
