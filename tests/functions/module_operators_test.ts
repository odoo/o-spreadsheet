import { functionMap } from "../../src/functions/index";
import { evaluateCell } from "../helpers";

const { ADD, DIVIDE, EQ, GT, GTE, LT, LTE, MINUS, MULTIPLY, UMINUS } = functionMap;

describe("operators", () => {
  test("ADD", () => {
    expect(ADD(1, 2)).toBe(3);
    expect(ADD(1, -2)).toBe(-1);
    expect(ADD(null, 1)).toBe(1);
  });

  test("DIVIDE", () => {
    expect(DIVIDE(24, 2)).toBe(12);
    expect(evaluateCell("A1", { A1: "=1/0" })).toBe("#ERROR");
  });

  test("EQ", () => {
    expect(EQ(24, 2)).toBe(false);
    expect(EQ(2, 2)).toBe(true);
  });

  test("GT", () => {
    expect(GT(24, 2)).toBe(true);
    expect(GT(24, 24)).toBe(false);
    expect(GT(-4, 24)).toBe(false);
  });

  test("GTE", () => {
    expect(GTE(24, 2)).toBe(true);
    expect(GTE(24, 24)).toBe(true);
    expect(GTE(-4, 24)).toBe(false);
  });

  test("LT", () => {
    expect(LT(24, 2)).toBe(false);
    expect(LT(24, 24)).toBe(false);
    expect(LT(-4, 24)).toBe(true);
  });
  test("LTE", () => {
    expect(LTE(24, 2)).toBe(false);
    expect(LTE(24, 24)).toBe(true);
    expect(LTE(-4, 24)).toBe(true);
  });

  test("MINUS", () => {
    expect(MINUS(24, 2)).toBe(22);
    expect(MINUS(24, 24)).toBe(0);
    expect(MINUS(-4, 24)).toBe(-28);
  });

  test("MULTIPLY", () => {
    expect(MULTIPLY(24, 2)).toBe(48);
    expect(MULTIPLY(24, 24)).toBe(576);
    expect(MULTIPLY(-4, 24)).toBe(-96);
  });

  test("UMINUS", () => {
    expect(UMINUS(24)).toBe(-24);
    // uncomment this someday
    // expect(UMINUS(0)).toBe(0);
    expect(UMINUS(-3)).toBe(3);
  });
});
