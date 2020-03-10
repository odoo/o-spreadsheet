import { evaluateCell, evaluateGrid } from "../helpers";

describe("statistical", () => {
  //----------------------------------------------------------------------------
  // AVERAGE
  //----------------------------------------------------------------------------

  test("AVERAGE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(1, 2)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(1,  , 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average( , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average(1.5, 2.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(-10, 20)" })).toBe(5);
  });

  test("AVERAGE: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=average("2", "-6")' })).toBe(-2);
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
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: '"6"' })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "FALSE" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "42" })).toBe(42);
  });

  test("AVERAGE: functional tests on range arguments", () => {
    const grid = {
      A1: "=average(B2:D4)",
      A2: "=average(B2:C3, B4:C4, D2:D3, D4)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      B3: "",
      C3: "-10.2",
      D3: "kikou",
      B4: '"111111"',
      C4: "0",
      D4: "0"
    };
    expect(evaluateCell("A1", grid)).toEqual(8);
    expect(evaluateCell("A2", grid)).toEqual(8);
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
    expect(evaluateCell("A1", { A1: '=average.weighted("-10", "1", "20", "2")' })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(TRUE, FALSE)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=average.weighted(FALSE, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=average.weighted("@#%!*", "@#%!*", "20", "2")' })).toEqual(
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
        A2: '"2"',
        A3: '"1"',
        A4: '"6"',
        A5: '"1"'
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: '"2"',
        A3: '"1"',
        A4: "6",
        A5: "1"
      })
    ).toBe(6);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: '"2"',
        A3: "1",
        A4: "6",
        A5: "1"
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "2",
        A3: '"1"',
        A4: "6",
        A5: '"1"'
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
    const grid = {
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
    expect(evaluateCell("A1", grid)).toBe(16);
    expect(evaluateCell("A2", grid)).toBe(16);
    expect(evaluateCell("A3", grid)).toBe(16);
    expect(evaluateCell("A4", grid)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A5", grid)).toBe(16);
    expect(evaluateCell("A6", grid)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A7", grid)).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A8", grid)).toBe(16);
    expect(evaluateCell("A9", grid)).toBe(16);
    expect(evaluateCell("A10", grid)).toBe(16);
  });

  //----------------------------------------------------------------------------
  // COUNT
  //----------------------------------------------------------------------------

  test("COUNT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=count()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=count( ,  )" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(1, 2, 3, 4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=count(1, 2, -3, 4.4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=count(1, 2, 3,  , 4)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=count(1 ,2, 3%)" })).toBe(3);
  });

  test("count: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=count(1, 2, "")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, " ")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "-3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=count(1, 2, TRUE)" })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "TRUE")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3%")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3@")' })).toBe(2);
  });

  test("COUNT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "-1", A3: "4.2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "3%" })).toBe(2);
  });

  test("COUNT: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '""' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"-3"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: "TRUE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"TRUE"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3%"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3@"' })).toBe(1);
  });

  test("COUNT: functional tests on range arguments", () => {
    const grid = {
      A1: "=count(B2:D4)",
      A2: "=count(B2:C3, B4:C4, D2:D3, D4)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      B3: "",
      C3: "-10.2",
      D3: "Jean Neypleinlenez",
      B4: '"111111"',
      C4: "0",
      D4: "0"
    };
    expect(evaluateCell("A1", grid)).toEqual(4);
    expect(evaluateCell("A2", grid)).toEqual(4);
  });

  //----------------------------------------------------------------------------
  // MAX
  //----------------------------------------------------------------------------

  test("MAX: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAX()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MAX(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(1, 2, 3, 1, 2)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=MAX(1,  , 2,  , 3)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=MAX(1.5, 1.4)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=MAX(-42.42)" })).toBe(-42.42);
    expect(evaluateCell("A1", { A1: '=MAX("Jean Fume", "Jean Dreu")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX("2", "-2")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=MAX("2", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MAX(TRUE, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MAX(0, "0", TRUE)' })).toBe(1);
  });

  // prettier-ignore
  test("MAX: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Terre"})).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "24", A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "24", A3: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "24", A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "24", A3: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: '"24"', A3: '"42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: '"24"', A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: '"24"', A3: '="42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "=24", A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "=24", A3: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: '="24"', A3: '="42"' })).toBe(0);
  });

  test("MAX: functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAX(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAX(A2, "")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, "")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, "")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, "")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAX(24, "42")' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, 24)", A2: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, 24)", A2: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAX(A2, 24)", A2: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAX(A2, 24)", A2: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MAX(A2, "24")', A2: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MAX(A2, "24")', A2: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MAX(A2, "24")', A2: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MAX(A2, "24")', A2: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAX(A2, TRUE)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAX(A2, TRUE)", A2: '"0"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAX(A2, TRUE)", A2: "=0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAX(A2, TRUE)", A2: '="0"' })).toBe(1);
  });

  test("MAX: functional tests on range arguments", () => {
    const grid = {
      A1: "=MAX(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=MAX(B2:E2)",
      A3: "=MAX(B3:E3)",
      A4: "=MAX(B4:E4)",

      B1: "=MAX(B2:B4)",
      C1: "=MAX(C2:C4)",
      D1: "=MAX(D2:D4)",
      E1: "=MAX(E2:E4)",

      B2: "=3",
      C2: "3",
      D2: '"9"',
      E2: '="9"',

      B3: '=" "',
      C3: "0",
      D3: "Jean PERRIN (10 de retrouvés)",
      E3: '"Jean Boirébienunautre"',

      B4: " ",
      C4: '""',
      D4: '=""',
      E4: '" "'
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(3);
    expect(gridResult.A2).toEqual(3);
    expect(gridResult.A3).toEqual(0);
    expect(gridResult.A4).toEqual(0);
    expect(gridResult.B1).toEqual(3);
    expect(gridResult.C1).toEqual(3);
    expect(gridResult.D1).toEqual(0);
    expect(gridResult.E1).toEqual(0);
  });
});
