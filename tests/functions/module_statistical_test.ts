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
    const gridAverage = {
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
    expect(evaluateCell("A1", gridAverage)).toEqual(8);
    expect(evaluateCell("A2", gridAverage)).toEqual(8);
  });

  //----------------------------------------------------------------------------
  // AVERAGE.WEIGHTED
  //----------------------------------------------------------------------------

  test("AVERAGE.WEIGHTED: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted( ,  )" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 0)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3, 3)" })).toBe(2.5);
    expect(evaluateCell("A1", { A1: "=average.weighted( , 1, 3, 3)" })).toBe(2.25);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3,  )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average.weighted(1,  , 3,  )" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(1.5, 1, 2.5, 4)" })).toBe(2.3);
    expect(evaluateCell("A1", { A1: "=average.weighted(4, 1.5, 2, 2.5)" })).toBe(2.75);
    expect(evaluateCell("A1", { A1: "=average.weighted(-10, 1, 20, 2)" })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, -1, 3, 3)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("AVERAGE.WEIGHTED: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted('-10', '1', '20', '2')" })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(TRUE, FALSE)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=average.weighted(FALSE, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average.weighted('@#%!*', '@#%!*', '20', '2')" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
  });

  test("AVERAGE.WEIGHTED: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "", A3: "" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "0", A3: "0" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "0", A3: "1" })).toBe(0);
    expect(
      evaluateCell("A1", { A1: "=average.weighted(A2, A3, A4)", A2: "1", A3: "1", A4: "3" })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "1",
        A4: "3",
        A5: "3"
      })
    ).toBe(2.5);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "",
        A3: "1",
        A4: "3",
        A5: "3"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "1",
        A4: "3",
        A5: ""
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1.5",
        A3: "1",
        A4: "2.5",
        A5: "4"
      })
    ).toBe(2.3);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "4",
        A3: "1.5",
        A4: "2",
        A5: "2.5"
      })
    ).toBe(2.75);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "-10",
        A3: "1",
        A4: "20",
        A5: "2"
      })
    ).toBe(10);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "-1",
        A4: "3",
        A5: "3"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("AVERAGE.WEIGHTED: casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "'2'",
        A3: "'1'",
        A4: "'6'",
        A5: "'1'"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "'2'",
        A3: "'1'",
        A4: "6",
        A5: "1"
      })
    ).toBe(6);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "'2'",
        A3: "1",
        A4: "6",
        A5: "1"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "2",
        A3: "'1'",
        A4: "6",
        A5: "'1'"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "FALSE",
        A5: "TRUE"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "6",
        A5: "TRUE"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "6",
        A5: "1"
      })
    ).toBe(6);
  });

  test("AVERAGE.WEIGHTED: functional tests on range arguments", () => {
    const gridAverage = {
      A1: "=average.weighted(C1, C3, D1, D3, E1, E3, F1, F3)",
      A2: "=average.weighted(C1:F1, C3:F3)",
      A3: "=average.weighted(C1:D1, C3:D3, E1:F1, E3:F3)",
      A4: "=average.weighted(C1:F1, B5:B8)",
      A5: "=average.weighted(C1, B5, D1, B6, E1, B7, F1, B8)",
      A6: "=average.weighted(C2, C3, D2, D3, E2, E3, F2, F3)",
      A7: "=average.weighted(C2:F2, C3:F3)",
      A8: "=average.weighted(C2, C4, D2, D4, E2, E4, F2, F4)",
      A9: "=average.weighted(C2:D2, C4:D4, E2:F2, E4:F4)",
      A10: "=average.weighted(C2:F2, C4:F4)",
      B5: "2",
      B6: "4",
      B7: "2",
      B8: "2",
      C1: "0",
      D1: "10",
      E1: "20",
      F1: "40",
      C2: "42.2",
      D2: "TRUE",
      E2: "Jean Bambois",
      F2: "-10.2",
      C3: "2",
      D3: "4",
      E3: "2",
      F3: "2",
      C4: "2",
      D4: "Jean Bonbeurre",
      E4: "",
      F4: "2"
    };
    expect(evaluateCell("A1", gridAverage)).toBe(16);
    expect(evaluateCell("A2", gridAverage)).toBe(16);
    expect(evaluateCell("A3", gridAverage)).toBe(16);
    expect(evaluateCell("A4", gridAverage)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A5", gridAverage)).toBe(16);
    expect(evaluateCell("A6", gridAverage)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A7", gridAverage)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A8", gridAverage)).toBe(16);
    expect(evaluateCell("A9", gridAverage)).toBe(16);
    expect(evaluateCell("A10", gridAverage)).toBe(16);
  });
});
