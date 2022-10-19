import { evaluateCell } from "../test_helpers/helpers";

test("qsdfqsdfqsdfqsdfdsgrtf", () => {
  // expect(evaluateCell("A1", { A1: "=DB(1, 0, 10, 2)" })).toBeCloseTo(0, 5);
  expect(evaluateCell("A1", { A1: "=DB(0, 10, 10, 2)" })).toBeCloseTo(0, 5); // @compatibility: on google sheets, return #NUM!
  // expect(evaluateCell("A1", { A1: "=DB(-10, 100, 6, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
});
