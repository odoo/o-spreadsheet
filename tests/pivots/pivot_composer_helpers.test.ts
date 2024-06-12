import { tokenize } from "../../src";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "../../src/helpers/pivot/pivot_composer_helpers";

describe("Pivot composer helpers", () => {
  test("Basic formula extractor", () => {
    const formula = `=PIVOT.VALUE("1", "test")`;
    const tokens = tokenize(formula);
    const { functionName, args } = getFirstPivotFunction(tokens);
    expect(functionName).toBe("PIVOT.VALUE");
    expect(args.length).toBe(2);
    expect(args[0]).toEqual({ type: "STRING", value: "1" });
    expect(args[1]).toEqual({ type: "STRING", value: "test" });
  });

  test("Extraction with no PIVOT formulas", () => {
    const formula = `=1+1`;
    const tokens = tokenize(formula);
    expect(getFirstPivotFunction(tokens)).toBeUndefined();
  });

  test("Extraction with two PIVOT formulas", () => {
    const formula = `=PIVOT.VALUE("1", "test") + PIVOT.VALUE("2", "hello", "bla")`;
    const tokens = tokenize(formula);
    const { functionName, args } = getFirstPivotFunction(tokens);
    expect(functionName).toBe("PIVOT.VALUE");
    expect(args.length).toBe(2);
    expect(args[0]).toEqual({ type: "STRING", value: "1" });
    expect(args[1]).toEqual({ type: "STRING", value: "test" });
  });

  test("Number of formulas", () => {
    const formula = `=PIVOT.VALUE("1", "test") + PIVOT.VALUE("2", "hello", "bla") + SUM(1,2) + 1`;
    expect(getNumberOfPivotFunctions(tokenize(formula))).toBe(2);
    expect(getNumberOfPivotFunctions(tokenize("=1+1"))).toBe(0);
    expect(getNumberOfPivotFunctions(tokenize("=bla"))).toBe(0);
  });
});
