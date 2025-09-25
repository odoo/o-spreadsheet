import { isNumber, parseNumber } from "../../src/helpers/index";
import { DEFAULT_LOCALE } from "../../src/types";
import { FR_LOCALE } from "../test_helpers/constants";

const locale = DEFAULT_LOCALE;

describe("isNumber", () => {
  test("recognize various number representations", () => {
    expect(isNumber("1", locale)).toBe(true);
    expect(isNumber("1.1", locale)).toBe(true);
    expect(isNumber(".3", locale)).toBe(true);
    expect(isNumber("1,234", locale)).toBe(true);
    expect(isNumber("1234567,123,123", locale)).toBe(true);
    expect(isNumber("1234567,12345,567", locale)).toBe(true);
    expect(isNumber("1,234.56", locale)).toBe(true);
    expect(isNumber("1%", locale)).toBe(true);
    expect(isNumber("1.5%", locale)).toBe(true);
    expect(isNumber("1.5 %", locale)).toBe(true);
    expect(isNumber("-3.3%", locale)).toBe(true);
    expect(isNumber("1.2e4", locale)).toBe(true);
    expect(isNumber("1e5", locale)).toBe(true);
    expect(isNumber("-1e3", locale)).toBe(true);
    expect(isNumber(".3%", locale)).toBe(true);
    expect(isNumber("-  3", locale)).toBe(true);
    expect(isNumber(".3e10", locale)).toBe(true);
    expect(isNumber("3E14", locale)).toBe(true);
    expect(isNumber("3E+14", locale)).toBe(true);
    expect(isNumber("3E-0", locale)).toBe(true);
    expect(isNumber("3E-42", locale)).toBe(true);
    expect(isNumber("3    %", locale)).toBe(true); // doesn't work on google sheet
    expect(isNumber("3e10%", locale)).toBe(true); // works on google sheet and Excel online
    expect(isNumber("3e10 %", locale)).toBe(true); // works on google sheet and Excel online
    expect(isNumber("123$", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("123 $", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("$123", locale)).toBe(true); // doesn't work ond Excel online
    expect(isNumber("$ 123", locale)).toBe(true); // doesn't work ond Excel online
    expect(isNumber("-123 $", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("-$ 123", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("$ - 123", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("- 3E10 $", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("€ 123", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("- € 123", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("€  - 123", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber(" 123 €", locale)).toBe(true); // doesn't work on Excel online
    expect(isNumber("-€ 12,123.123E02", locale)).toBe(true); // doesn't work on Excel online
  });

  test("isNumber with localized numbers", () => {
    expect(isNumber("1,1", FR_LOCALE)).toBe(true);
    expect(isNumber(",3", FR_LOCALE)).toBe(true);
    expect(isNumber("1 234", FR_LOCALE)).toBe(true);
    expect(isNumber("1234567 123 123", FR_LOCALE)).toBe(true);
    expect(isNumber("1234567 12345 567", FR_LOCALE)).toBe(true);
    expect(isNumber("1 234,56", FR_LOCALE)).toBe(true);
    expect(isNumber("1,5%", FR_LOCALE)).toBe(true);
    expect(isNumber("1,5 %", FR_LOCALE)).toBe(true);
    expect(isNumber("-3,3%", FR_LOCALE)).toBe(true);
    expect(isNumber("1,2e4", FR_LOCALE)).toBe(true);
    expect(isNumber("-€ 12 123,123E02", FR_LOCALE)).toBe(true); // doesn't work on Excel online

    expect(isNumber("1.1", FR_LOCALE)).toBe(false);
    expect(isNumber("1234567,123,123", FR_LOCALE)).toBe(false);
    expect(isNumber("1.5%", FR_LOCALE)).toBe(false);
  });

  test("some other checks for isNumber", () => {
    expect(isNumber("", locale)).toBe(false);
    expect(isNumber("1.1.1", locale)).toBe(false);
    expect(isNumber("e10", locale)).toBe(false);
    expect(isNumber(".", locale)).toBe(false);
    expect(isNumber(" - .e10", locale)).toBe(false);
    expect(isNumber("3 E14", locale)).toBe(false);
    expect(isNumber("1234567,24,567", locale)).toBe(false);
    expect(isNumber("$123$", locale)).toBe(false);
    expect(isNumber("$123€", locale)).toBe(false);
    expect(isNumber("12$3", locale)).toBe(false);
  });
});

describe("parseNumber", () => {
  test("parse empty string as 0", () => {
    expect(parseNumber("", locale)).toBe(0);
  });

  test("can parse various number representations", () => {
    expect(parseNumber("1", locale)).toBe(1);
    expect(parseNumber("-1", locale)).toBe(-1);
    expect(parseNumber("1.1", locale)).toBe(1.1);
    expect(parseNumber(".3", locale)).toBe(0.3);
    expect(parseNumber("1,234", locale)).toBe(1234);
    expect(parseNumber("1,234.5", locale)).toBe(1234.5);
    expect(parseNumber("1,234%", locale)).toBe(12.34);
    expect(parseNumber("1%", locale)).toBe(0.01);
    expect(parseNumber("1 %", locale)).toBe(0.01);
    expect(parseNumber("1.5%", locale)).toBe(0.015);
    expect(parseNumber("-3.3%", locale)).toBe(-0.033);
    expect(parseNumber(".3%", locale)).toBe(0.003);
    expect(parseNumber("1.2e4", locale)).toBe(12000);
    expect(parseNumber("1e5", locale)).toBe(100000);
    expect(parseNumber("-1E3", locale)).toBe(-1000);
    expect(parseNumber("3e+4", locale)).toBe(30000);
    expect(parseNumber("3E-4", locale)).toBe(0.0003);
    expect(parseNumber("1e2 %", locale)).toBe(1);
    expect(parseNumber("1,234e1", locale)).toBe(12340);
    expect(parseNumber("$123", locale)).toBe(123);
    expect(parseNumber("€123", locale)).toBe(123);
    expect(parseNumber("$ 123", locale)).toBe(123);
    expect(parseNumber("123$", locale)).toBe(123);
    expect(parseNumber("123 $", locale)).toBe(123);
    expect(parseNumber("-$123", locale)).toBe(-123);
    expect(parseNumber("$-123", locale)).toBe(-123);
    expect(parseNumber("-123$", locale)).toBe(-123);
    expect(parseNumber("-123E2$", locale)).toBe(-12300);
  });

  test("parseNumber with localized numbers", () => {
    expect(parseNumber("1", FR_LOCALE)).toBe(1);
    expect(parseNumber("1,1", FR_LOCALE)).toBe(1.1);
    expect(parseNumber(",3", FR_LOCALE)).toBe(0.3);
    expect(parseNumber("1 234", FR_LOCALE)).toBe(1234);
    expect(parseNumber("1 234,5", FR_LOCALE)).toBe(1234.5);
    expect(parseNumber("1 234%", FR_LOCALE)).toBe(12.34);
    expect(parseNumber("1,5%", FR_LOCALE)).toBe(0.015);
    expect(parseNumber("-3,3%", FR_LOCALE)).toBe(-0.033);
    expect(parseNumber(",3%", FR_LOCALE)).toBe(0.003);
    expect(parseNumber("1,2e4", FR_LOCALE)).toBe(12000);
    expect(parseNumber("1 234e1", FR_LOCALE)).toBe(12340);
    expect(parseNumber("-€ 12 123,123E02", FR_LOCALE)).toBe(-1212312.3);
  });
});
