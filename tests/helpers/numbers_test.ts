import { parseNumber, isNumber } from "../../src/helpers/index";

describe("numberToLetter", () => {
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
