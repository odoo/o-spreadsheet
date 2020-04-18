import { evaluateCell } from "../helpers";

describe("date", () => {
  //----------------------------------------------------------------------------
  // MONTH
  //----------------------------------------------------------------------------

  test("MONTH: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "1/2/1954" })).toBe(1);
  });
});
