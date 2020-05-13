import { evaluateCell } from "../helpers";

describe("date", () => {
  //----------------------------------------------------------------------------
  // MONTH
  //----------------------------------------------------------------------------

  test("MONTH: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "1/2/1954" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "5/13/1954" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "43964" })).toBe(5); // 43964 corespond to 5/13/195
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "0" })).toBe(12); // 0 corespond to 12/30/1899
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "1" })).toBe(12); // 1 corespond to 12/31/1899
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "2" })).toBe(1); // 2 corespond to 1/1/1900
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: '="43964"' })).toBe(5);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "TRUE" })).toBe(12);
  });
});
