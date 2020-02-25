import { evaluateCell } from "../helpers";

describe("statistical", () => {
  //----------------------------------------------------------------------------
  // AVERAGE
  //----------------------------------------------------------------------------

  test("AVERAGE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average()" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(1, 2)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(1,  , 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average( , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average(1.5, 2.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(-10, 20)" })).toBe(5);
  });

  test("AVERAGE: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average('2', '-6')" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=average(TRUE, FALSE)" })).toBe(0.5);
  });

  test("AVERAGE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1", A3: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "", A3: "1", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "-10", A3: "20" })).toBe(5);
  });

  test("AVERAGE: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "'2'", A3: "'6'" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "'2'", A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "FALSE" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "42" })).toBe(42);
  });

  test("AVERAGE: functional tests on range arguments", () => {
    const grid_average = {
      A1: "=average(B2:D4)",
      A2: "=average(B2:C3, B4:C4, D2:D3, D4)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      B3: "",
      C3: "-10.2",
      D3: "kikou",
      B4: "'111111'",
      C4: "0",
      D4: "0"
    };
    expect(evaluateCell("A1", grid_average)).toEqual(8);
    expect(evaluateCell("A2", grid_average)).toEqual(8);
  });
});
