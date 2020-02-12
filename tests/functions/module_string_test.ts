import { functionMap } from "../../src/functions/index";

const { CONCAT } = functionMap;

describe("string functions", () => {
  test("CONCAT", () => {
    expect(CONCAT("a", "b")).toBe("ab");
    expect(CONCAT("a", 334)).toBe("a334");
    expect(CONCAT("a", undefined)).toBe("a");
    expect(CONCAT("", undefined)).toBe("");
    expect(() => CONCAT()).toThrowErrorMatchingSnapshot();
    expect(() => CONCAT("asf")).toThrowErrorMatchingSnapshot();
    expect(() => CONCAT("a", "b", "c")).toThrowErrorMatchingSnapshot();
  });
});
