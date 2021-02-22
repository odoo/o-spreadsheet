import { evaluateCell, evaluateGrid } from "../test_helpers/helpers";

describe("AVEDEV formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVEDEV()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AVEDEV(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(1, 2)" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV( , 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=AVEDEV(1, 2, 3,  )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=AVEDEV(1.5, 2.5)" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(-10, 20)" })).toBe(15);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=AVEDEV("2", "-6")' })).toBe(4);
    expect(evaluateCell("A1", { A1: '=AVEDEV("2", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AVEDEV("2", " -6 ")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=AVEDEV(TRUE, FALSE)" })).toBe(0.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2)", A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "1", A3: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3, A4)", A2: "", A3: "1", A4: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "-10", A3: "20" })).toBe(15);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: '"2"', A3: '"6"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: '"2"', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "TRUE", A3: "42" })).toBe(0);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=AVEDEV(B2:D4)",
      A2: "=AVEDEV(B2:C3, B4:C4, D2:D3, D4)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      B3: "",
      C3: "-10.2",
      D3: "kikou",
      B4: '"111111"',
      C4: "0",
      D4: "0",
    };
    expect(evaluateCell("A1", grid)).toEqual(17.1);
    expect(evaluateCell("A2", grid)).toEqual(17.1);
  });
});

describe("AVERAGE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(1, 2)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(1,  , 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average( , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average(1.5, 2.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(-10, 20)" })).toBe(5);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=average("2", "-6")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=average(TRUE, FALSE)" })).toBe(0.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1", A3: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "", A3: "1", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "-10", A3: "20" })).toBe(5);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: '"6"' })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "FALSE" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "42" })).toBe(42);
  });

  test("functional tests on range arguments", () => {
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
      D4: "0",
    };
    expect(evaluateCell("A1", grid)).toEqual(8);
    expect(evaluateCell("A2", grid)).toEqual(8);
  });
});

describe("AVERAGE.WEIGHTED formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted( ,  )" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 0)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3)" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3, 3)" })).toBe(2.5);
    expect(evaluateCell("A1", { A1: "=average.weighted( , 1, 3, 3)" })).toBe(2.25);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3,  )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average.weighted(1,  , 3,  )" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(1.5, 1, 2.5, 4)" })).toBe(2.3);
    expect(evaluateCell("A1", { A1: "=average.weighted(4, 1.5, 2, 2.5)" })).toBe(2.75);
    expect(evaluateCell("A1", { A1: "=average.weighted(-10, 1, 20, 2)" })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, -1, 3, 3)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=average.weighted("-10", "1", "20", "2")' })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(TRUE, FALSE)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=average.weighted(FALSE, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=average.weighted("@#%!*", "@#%!*", "20", "2")' })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "", A3: "" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "0", A3: "0" })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "0", A3: "1" })).toBe(0);
    expect(
      evaluateCell("A1", { A1: "=average.weighted(A2, A3, A4)", A2: "1", A3: "1", A4: "3" })
    ).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "1",
        A4: "3",
        A5: "3",
      })
    ).toBe(2.5);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "",
        A3: "1",
        A4: "3",
        A5: "3",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "1",
        A4: "3",
        A5: "",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1.5",
        A3: "1",
        A4: "2.5",
        A5: "4",
      })
    ).toBe(2.3);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "4",
        A3: "1.5",
        A4: "2",
        A5: "2.5",
      })
    ).toBe(2.75);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "-10",
        A3: "1",
        A4: "20",
        A5: "2",
      })
    ).toBe(10);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "1",
        A3: "-1",
        A4: "3",
        A5: "3",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: '"2"',
        A3: '"1"',
        A4: '"6"',
        A5: '"1"',
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: '"2"',
        A3: '"1"',
        A4: "6",
        A5: "1",
      })
    ).toBe(6);
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: '"2"',
        A3: "1",
        A4: "6",
        A5: "1",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "2",
        A3: '"1"',
        A4: "6",
        A5: '"1"',
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "FALSE",
        A5: "TRUE",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "6",
        A5: "TRUE",
      })
    ).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=average.weighted(A2, A3, A4, A5)",
        A2: "FALSE",
        A3: "TRUE",
        A4: "6",
        A5: "1",
      })
    ).toBe(6);
  });

  test("functional tests on range arguments", () => {
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
      F4: "2",
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
});

describe("AVERAGEA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVERAGEA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AVERAGEA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(1, 2)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(1,  , 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=AVERAGEA( , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(1.5, 2.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(-10, 20)" })).toBe(5);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=AVERAGEA("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=AVERAGEA(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AVERAGEA("hello there")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AVERAGEA("2", "-6")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=AVERAGEA("2", "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=AVERAGEA("2", " -6 ")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(TRUE, FALSE)" })).toBe(0.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: "1", A3: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3, A4)", A2: "", A3: "1", A4: "3" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: "-10", A3: "20" })).toBe(5);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '"42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: '"2"', A3: '"6"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: '"2"', A3: "42" })).toBe(21);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(0.5); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2, A3)", A2: "TRUE", A3: "42" })).toBe(21.5);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: '="42"' })).toBe(0);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=AVERAGEA(B2:D4)",
      A2: "=AVERAGEA(B2:C3, B4:C4, D2:D3, D4)",
      B2: "10",
      C2: "TRUE",
      D2: "FALSE",
      C3: "5",
      D3: "kikou",
      B4: '"111111"',
      C4: "0",
      D4: "0",
    };
    expect(evaluateCell("A1", grid)).toBe(2);
    expect(evaluateCell("A2", grid)).toBe(2);
  });
});

describe("AVERAGEIF formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1:  "Coffee"    , B1:  "4"  ,
      A2:  "Newspaper" , B2:  "1"  ,
      A3:  "Taxi"      , B3:  "10" , 
      A4:  "Golf"      , B4:  "26" ,
      A5:  "Taxi"      , B5:  "8"  ,
      A6:  "Coffee"    , B6:  "3.5",
      A7:  "Gas"       , B7:  "46" ,
      A8:  "Restaurant", B8:  "31" , 


      A12: '=AVERAGEIF(A1:A8, "Taxi", B1:B8)',
      A13: '=AVERAGEIF(B1:B8, ">=10", B1:B8)',
      A14: '=AVERAGEIF(B1:B8, ">=10")',
      A15: '=AVERAGEIF(A1:A8, "G*", B1:B8)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(9);
    expect(gridResult.A13).toBe(28.25);
    expect(gridResult.A14).toBe(28.25);
    expect(gridResult.A15).toBe(36);
  });
});

describe("AVERAGEIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4" , C1:  "14", D1:  "Yes",
      B2:  "28", C2:  "30", D2:  "Yes",
      B3:  "31", C3:  "47", D3:  "Yes",
      B4:  "12", C4:  "0" , D4:  "Yes",
      B5:  "31", C5:  "47", D5:  "Yes",
      B6:  "13", C6:  "5" , D6:  "No" ,
      B7:  "18", C7:  "43", D7:  "No" ,
      B8:  "24", C8:  "7" , D8:  "Yes",
      B9:  "44", C9:  "28", D9:  "No" ,
      B10: "22", C10: "23", D10: "No" ,
      B11: "9" , C11: "13", D11: "No" ,

      A12: '=AVERAGEIFS(B1:B11, B1:B11, ">20")',
      A13: '=AVERAGEIFS(B1:B11, B1:B11, ">20", C1:C11, "<30")',
      A14: '=AVERAGEIFS(B1:B11, D1:D11, "No")',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(30);
    expect(gridResult.A13).toBe(30);
    expect(gridResult.A14).toBe(21.2);
  });
});

describe("COUNT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=count()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=count( ,  )" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(1, 2, 3, 4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=count(1, 2, -3, 4.4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=count(1, 2, 3,  , 4)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=count(1 ,2, 3%)" })).toBe(3);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=count(1, 2, "")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, " ")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "-3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=count(1, 2, TRUE)" })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "TRUE")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3%")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=count(1, 2, "3@")' })).toBe(2);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "-1", A3: "4.2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "3%" })).toBe(2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '""' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"-3"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: "TRUE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"TRUE"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3%"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "42", A3: '"3@"' })).toBe(1);
  });

  test("functional tests on range arguments", () => {
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
      D4: "0",
    };
    expect(evaluateCell("A1", grid)).toEqual(4);
    expect(evaluateCell("A2", grid)).toEqual(4);
  });
});

describe("COUNTA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=COUNTA()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=COUNTA( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTA(1, 2, 3, 4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COUNTA(1, 2, -3, 4.4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COUNTA(1, 2, 3,  , 4)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COUNTA(1 ,2, 3%)" })).toBe(3);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, " ")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "-3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=COUNTA(1, 2, TRUE)" })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "TRUE")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "3%")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=COUNTA(1, 2, "3@")' })).toBe(3);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COUNTA(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "1", A3: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "-1", A3: "4.2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "1", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "1", A3: "3%" })).toBe(2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '""' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '" "' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '"3"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '"-3"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: "TRUE" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '"TRUE"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '"3%"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '"3@"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '=""' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '=" "' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTA(A2, A3)", A2: "42", A3: '="42"' })).toBe(2);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=COUNTA(B2:D4)",
      A2: "=COUNTA(B2:C3, B4:C4, D2:D3, D4)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      C3: "-10.2",
      D3: "Jean Ticonstitutionnalise",
      B4: '"111111"',
      C4: "0",
      D4: "0",
    };
    expect(evaluateCell("A1", grid)).toBe(8);
    expect(evaluateCell("A2", grid)).toBe(8);
  });
});

describe("COVAR formula", () => {
  test("functional tests on range arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "4",
      A2: "4", B2: "5",
      A3: "7", B3: "6",

      A4: "4", B4: "5", C4:"6",

      A5: "1", B5: "4", C5:"4",
      A6: "2", B6: "5", C6:"5",
               B7: "6", C7:"6",
      A8: "3",          C8:"test",
      A9: "4",          C9:"TRUE",

      A10: "=COVAR(A1:A3, B1:B3)",
      A11: "=COVAR(A1:A3, A4:C4)",
      A12: "=COVAR(A1:A3, B1:B2)",
      A13: "=COVAR(A5:A9, B5:B9)",
      A14: "=COVAR(A5:A9, C5:C9)",
      A15: "=COVAR(A1, B1)",
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A10).toEqual(2);
    expect(gridResult.A11).toEqual(2);
    expect(gridResult.A12).toEqual("#ERROR"); //@compatibility: on google sheet, return #N/A
    expect(gridResult.A13).toEqual(0.25);
    expect(gridResult.A14).toEqual(0.25);
    expect(gridResult.A15).toEqual(0);
  });
});

describe("COVARIANCE.P formula", () => {
  test("functional tests on range arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "4",
      A2: "4", B2: "5",
      A3: "7", B3: "6",

      A4: "4", B4: "5", C4:"6",

      A5: "1", B5: "4", C5:"4",
      A6: "2", B6: "5", C6:"5",
               B7: "6", C7:"6",
      A8: "3",          C8:"test",
      A9: "4",          C9:"TRUE",

      A10: "=COVARIANCE.P(A1:A3, B1:B3)",
      A11: "=COVARIANCE.P(A1:A3, A4:C4)",
      A12: "=COVARIANCE.P(A1:A3, B1:B2)",
      A13: "=COVARIANCE.P(A5:A9, B5:B9)",
      A14: "=COVARIANCE.P(A5:A9, C5:C9)",
      A15: "=COVARIANCE.P(A1, B1)",
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A10).toEqual(2);
    expect(gridResult.A11).toEqual(2);
    expect(gridResult.A12).toEqual("#ERROR"); //@compatibility: on google sheet, return #N/A
    expect(gridResult.A13).toEqual(0.25);
    expect(gridResult.A14).toEqual(0.25);
    expect(gridResult.A15).toEqual(0);
  });
});

describe("COVARIANCE.S formula", () => {
  test("functional tests on range arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "4",
      A2: "4", B2: "5",
      A3: "7", B3: "6",

      A4: "4", B4: "5", C4:"6",

      A5: "1", B5: "4", C5:"4",
      A6: "2", B6: "5", C6:"5",
               B7: "6", C7:"6",
      A8: "3",          C8:"test",
      A9: "4",          C9:"TRUE",

      A10: "=COVARIANCE.S(A1:A3, B1:B3)",
      A11: "=COVARIANCE.S(A1:A3, A4:C4)",
      A12: "=COVARIANCE.S(A1:A3, B1:B2)",
      A13: "=COVARIANCE.S(A5:A9, B5:B9)",
      A14: "=COVARIANCE.S(A5:A9, C5:C9)",
      A15: "=COVARIANCE.S(A1, B1)",
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A10).toEqual(3);
    expect(gridResult.A11).toEqual(3);
    expect(gridResult.A12).toEqual("#ERROR"); //@compatibility: on google sheet, return #N/A
    expect(gridResult.A13).toEqual(0.5);
    expect(gridResult.A14).toEqual(0.5);
    expect(gridResult.A15).toEqual("#ERROR"); //@compatibility: on google sheet, return #NUM
  });
});

describe("LARGE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LARGE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LARGE( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE( , 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(2, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(2, 1)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LARGE(2, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(2, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(2, 1.9)" })).toBe(2);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=LARGE(2, "1")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LARGE(2, TRUE)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LARGE(2, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(TRUE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(False, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=LARGE("test", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=LARGE("2", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "", A3: "", A4: "", A5: "0" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "", A3: "", A4: "", A5: "1" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "1" })
    ).toBe(3);
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "2" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "3", A3: "-11", A4: "2", A5: "3" })
    ).toBe(-11);
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "4" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "3", A3: "", A4: "2", A5: "3" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: '"3"', A3: "", A4: "2", A5: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: '"3"', A3: "", A4: "", A5: "1" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: '="3"', A3: "", A4: "2", A5: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", {
        A1: "=LARGE(A2:A4, A5)",
        A2: "lol",
        A3: "looool",
        A4: "xdtrololol",
        A5: "1",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: '"3"', A3: '"1"', A4: '"2"', A5: "1" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=LARGE(A2:A4, A5)", A2: "TRUE", A3: "0", A4: "0", A5: "1" })
    ).toBe(0);
  });
});

describe("MAX formula", () => {
  test("functional tests on simple arguments", () => {
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

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=MAX(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Terre" })
    ).toBe(1.5);
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

  test("functional tests on simple and cell arguments", () => {
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

  test("functional tests on range arguments", () => {
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
      E4: '" "',
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

describe("MAXA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAXA()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MAXA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(1, 2, 3, 1, 2)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=MAXA(-1,  , -2,  , -3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(1.5, 1.4)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=MAXA(-42.42)" })).toBe(-42.42);
    expect(evaluateCell("A1", { A1: '=MAXA("Jean Fume", "Jean Dreu")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA("2", "-2")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=MAXA("2", " -2 ")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=MAXA("2", "")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=MAXA("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MAXA(TRUE, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MAXA(0, "0", TRUE)' })).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAXA(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3, A4)", A2: "-1", A3: "", A4: "-2" })).toBe(-1);
    expect(
      evaluateCell("A1", { A1: "=MAXA(A2, A3, A4)", A2: "-1.5", A3: "-10", A4: "Jean Terre" })
    ).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "24", A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "24", A3: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "24", A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "24", A3: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: '"24"', A3: '"42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: '"24"', A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: '"24"', A3: '="42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "=24", A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "=24", A3: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: '="24"', A3: '="42"' })).toBe(0);
  });

  test("functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MAXA(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MAXA(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "")', A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "")', A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "")', A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "")', A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MAXA(24, "42")' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, 24)", A2: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, 24)", A2: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, 24)", A2: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, 24)", A2: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "24")', A2: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "24")', A2: '"42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "24")', A2: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MAXA(A2, "24")', A2: '="42"' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, TRUE)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, TRUE)", A2: '"0"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, TRUE)", A2: "=0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MAXA(A2, TRUE)", A2: '="0"' })).toBe(1);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=MAXA(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=MAXA(B2:E2)",
      A3: "=MAXA(B3:E3)",
      A4: "=MAXA(B4:E4)",

      B1: "=MAXA(B2:B4)",
      C1: "=MAXA(C2:C4)",
      D1: "=MAXA(D2:D4)",
      E1: "=MAXA(E2:E4)",

      B2: "=-3",
      C2: "-3",
      D2: '"9"',
      E2: '="9"',

      B3: '=" "',
      C3: "3",
      D3: "Jean Balletoultan",
      E3: '"Jean Découvrepleindautres"',

      B4: "3",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(3);
    expect(gridResult.A2).toEqual(0);
    expect(gridResult.A3).toEqual(3);
    expect(gridResult.A4).toEqual(3);
    expect(gridResult.B1).toEqual(3);
    expect(gridResult.C1).toEqual(3);
    expect(gridResult.D1).toEqual(0);
    expect(gridResult.E1).toEqual(0);
  });
});

describe("MAXIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4" , C1:  "14", D1:  "Yes",
      B2:  "28", C2:  "30", D2:  "Yes",
      B3:  "31", C3:  "47", D3:  "Yes",
      B4:  "12", C4:  "0" , D4:  "Yes",
      B5:  "31", C5:  "47", D5:  "Yes",
      B6:  "13", C6:  "5" , D6:  "No" ,
      B7:  "18", C7:  "43", D7:  "No" ,
      B8:  "24", C8:  "7" , D8:  "Yes",
      B9:  "44", C9:  "28", D9:  "No" ,
      B10: "22", C10: "23", D10: "No" ,
      B11: "9" , C11: "13", D11: "No" ,

      A12: '=MAXIFS(B1:B11, B1:B11, "<20")',
      A13: '=MAXIFS(B1:B11, B1:B11, ">20", C1:C11, "<28")',
      A14: '=MAXIFS(B1:B11, D1:D11, "yes")',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(18);
    expect(gridResult.A13).toBe(24);
    expect(gridResult.A14).toBe(31);
  });
});

describe("MEDIAN formula", () => {
  test("take at least 1 argument", () => {
    expect(evaluateCell("A1", { A1: "=MEDIAN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MEDIAN(42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MEDIAN(42, 43, 60)" })).toBe(43);
  });

  describe("business logic", () => {
    test("return the median", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(666)" })).toBe(666);
      expect(evaluateCell("A1", { A1: "=MEDIAN(42, 43, 50)" })).toBe(43);
      expect(evaluateCell("A1", { A1: "=MEDIAN(-1, 6, 7, 234, 163845)" })).toBe(7);
    });
    test("take the average when the number of arguments is even", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(1, 49, 50, 51)" })).toBe(49.5);
      expect(evaluateCell("A1", { A1: "=MEDIAN(-5, -1, 0, 100)" })).toBe(-0.5);
    });
    test("arguments order does not matter", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(10,2,3)" })).toBe(3);
      expect(evaluateCell("A1", { A1: "=MEDIAN(2,3,10)" })).toBe(3);
    });
  });

  describe("casting", () => {
    test("empty arguments are considered as 0", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(,)" })).toBe(0);
      expect(evaluateCell("A1", { A1: "=MEDIAN(,,1,2,3)" })).toBe(1);
      expect(evaluateCell("A1", { A1: "=MEDIAN(5,  , 7,  , 3)" })).toBe(3);
    });

    test("strings which can be cast in number are interpreted as numbers", () => {
      expect(evaluateCell("A1", { A1: '=MEDIAN("42")' })).toBe(42);
      expect(evaluateCell("A1", { A1: '=MEDIAN("2", "24", "26")' })).toBe(24);
      expect(evaluateCell("A1", { A1: '=MEDIAN("2", 24, "26")' })).toBe(24);
    });

    test("strings which cannot be cast in number return an error", () => {
      expect(evaluateCell("A1", { A1: '=MEDIAN(2, "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      expect(evaluateCell("A1", { A1: '=MEDIAN(2, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      expect(evaluateCell("A1", { A1: '=MEDIAN(2, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    });

    test("boolean arguments are interpreted as numbers", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(TRUE, FALSE, FALSE)" })).toBe(0);
      expect(evaluateCell("A1", { A1: "=MEDIAN(TRUE, FALSE)" })).toBe(0.5);
    });

    test("empty cells are ignored", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, 2, 3, 6)" })).toBe(3);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, A3)", A3: "42" })).toBe(42);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2:A4)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2:A4)", A3: "6", A4: "8" })).toBe(7);
    });

    test("cells that are not numbers are ignored", () => {
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2)", A2: "42" })).toBe(42);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2)", A2: "TRUE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, 2, 3, 6)", A2: "42" })).toBe(4.5);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, 2, 3, 6)", A2: "TRUE" })).toBe(3);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, 2, 3, 6)", A2: "coucou" })).toBe(3);
      expect(evaluateCell("A1", { A1: "=MEDIAN(A2, 2, 3, 6)", A2: '"42"' })).toBe(3);
    });
  });
});

describe("MIN formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MIN()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MIN(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(1, 2, 3, 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MIN(1,  , 2,  , 3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(1.5, 1.4)" })).toBe(1.4);
    expect(evaluateCell("A1", { A1: "=MIN(42.42)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: '=MIN("Jean Fume", "Jean Dreu")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN("2", "-2")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=MIN("2", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MIN(TRUE, FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MIN(0, "0", TRUE)' })).toBe(0);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MIN(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "1", A3: "2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=MIN(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Terre" })
    ).toBe(-10);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "42", A3: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "42", A3: '"24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "42", A3: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "42", A3: '="24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: '"42"', A3: '"24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: '"42"', A3: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: '"42"', A3: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "=42", A3: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "=42", A3: '="24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: '="42"', A3: '="24"' })).toBe(0);
  });

  test("functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MIN(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MIN(A2, "")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, "")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, "")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, "")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MIN(42, "24")' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, 42)", A2: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, 42)", A2: '"24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MIN(A2, 42)", A2: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MIN(A2, 42)", A2: '="24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MIN(A2, "42")', A2: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MIN(A2, "42")', A2: '"24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=MIN(A2, "42")', A2: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MIN(A2, "42")', A2: '="24"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MIN(A2, TRUE)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, TRUE)", A2: '"0"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MIN(A2, TRUE)", A2: "=0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIN(A2, TRUE)", A2: '="0"' })).toBe(1);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=MIN(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=MIN(B2:E2)",
      A3: "=MIN(B3:E3)",
      A4: "=MIN(B4:E4)",

      B1: "=MIN(B2:B4)",
      C1: "=MIN(C2:C4)",
      D1: "=MIN(D2:D4)",
      E1: "=MIN(E2:E4)",

      B2: "=9",
      C2: "9",
      D2: '"0"',
      E2: '="0"',

      B3: '=" "',
      C3: "3",
      D3: "Jean PERRIN (10 de retrouvés)",
      E3: '"Jean Boirébienunautre"',

      B4: " ",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(3);
    expect(gridResult.A2).toEqual(9);
    expect(gridResult.A3).toEqual(3);
    expect(gridResult.A4).toEqual(0);
    expect(gridResult.B1).toEqual(9);
    expect(gridResult.C1).toEqual(3);
    expect(gridResult.D1).toEqual(0);
    expect(gridResult.E1).toEqual(0);
  });
});

describe("MINA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINA()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MINA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(1, 2, 3, 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINA(1,  , 2,  , 3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(1.5, 1.4)" })).toBe(1.4);
    expect(evaluateCell("A1", { A1: "=MINA(42.42)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: '=MINA("Jean Fume", "Jean Dreu")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA("2", "-2")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=MINA("2", " -2 ")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=MINA("2", "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINA(TRUE, FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(0, "0", TRUE)' })).toBe(0);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINA(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "1", A3: "2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=MINA(A2, A3, A4)", A2: "1.5", A3: "10", A4: "Jean Terre" })
    ).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "42", A3: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "42", A3: '"24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "42", A3: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "42", A3: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: '"42"', A3: '"24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: '"42"', A3: "=24" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: '"42"', A3: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "=42", A3: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "=42", A3: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: '="42"', A3: '="24"' })).toBe(0);
  });

  test("functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINA(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "")', A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "")', A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "")', A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "")', A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINA(42, "24")' })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, 42)", A2: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, 42)", A2: '"24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, 42)", A2: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=MINA(A2, 42)", A2: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "42")', A2: "24" })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "42")', A2: '"24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "42")', A2: "=24" })).toBe(24);
    expect(evaluateCell("A1", { A1: '=MINA(A2, "42")', A2: '="24"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, TRUE)", A2: "2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINA(A2, TRUE)", A2: '"2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINA(A2, TRUE)", A2: "=2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINA(A2, TRUE)", A2: '="2"' })).toBe(0);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=MINA(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=MINA(B2:E2)",
      A3: "=MINA(B3:E3)",
      A4: "=MINA(B4:E4)",

      B1: "=MINA(B2:B4)",
      C1: "=MINA(C2:C4)",
      D1: "=MINA(D2:D4)",
      E1: "=MINA(E2:E4)",

      B2: "=9",
      C2: "9",
      D2: '"-9"',
      E2: '="-9"',

      B3: '=" "',
      C3: "3",
      D3: "Jean Évumille",
      E3: '"Jean Duvoyage"',

      B4: "-42",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(-42);
    expect(gridResult.A2).toEqual(0);
    expect(gridResult.A3).toEqual(0);
    expect(gridResult.A4).toEqual(-42);
    expect(gridResult.B1).toEqual(-42);
    expect(gridResult.C1).toEqual(0);
    expect(gridResult.D1).toEqual(0);
    expect(gridResult.E1).toEqual(0);
  });
});

describe("MINIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4" , C1:  "14", D1:  "Yes",
      B2:  "28", C2:  "30", D2:  "Yes",
      B3:  "31", C3:  "47", D3:  "Yes",
      B4:  "12", C4:  "0" , D4:  "Yes",
      B5:  "31", C5:  "47", D5:  "Yes",
      B6:  "13", C6:  "5" , D6:  "No" ,
      B7:  "18", C7:  "43", D7:  "No" ,
      B8:  "24", C8:  "7" , D8:  "Yes",
      B9:  "44", C9:  "28", D9:  "No" ,
      B10: "22", C10: "23", D10: "No" ,
      B11: "9" , C11: "13", D11: "No" ,

      A12: '=MINIFS(B1:B11, B1:B11, ">20")',
      A13: '=MINIFS(B1:B11, B1:B11, ">20", C1:C11, "<23")',
      A14: '=MINIFS(B1:B11, D1:D11, "no")',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(22);
    expect(gridResult.A13).toBe(24);
    expect(gridResult.A14).toBe(9);
  });
});

describe.each([["PERCENTILE"], ["PERCENTILE.INC"], ["PERCENTILE.EXC"]])(
  "%s formula",
  (percentile) => {
    percentile = "=" + percentile;

    test("take 2 arguments", () => {
      expect(evaluateCell("A1", { A1: percentile + "()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
      expect(evaluateCell("A1", { A1: percentile + "(42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
      expect(evaluateCell("A1", { A1: percentile + "(42, 0.5)" })).toBe(42);
      expect(evaluateCell("A1", { A1: percentile + "(42, 43, 60)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    });

    describe("business logic", () => {
      if (percentile === "=PERCENTILE.EXC") {
        // prettier-ignore
        const data = {
          A2: "1", A3: "5", A4: "6", A5: "12",
        };

        test("return the percentile", () => {
          expect(evaluateCell("A1", { A1: percentile + "(A2:A5, 0.2)", ...data })).toBe(1);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A5, 0.4)", ...data })).toBe(5);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A5, 0.8)", ...data })).toBe(12);
        });

        test("take pro rata when percentile is between 2 values", () => {
          expect(evaluateCell("A1", { A1: percentile + "(A2:A5, 0.35)", ...data })).toBe(4);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A5, 0.7)", ...data })).toBe(9);
        });

        test("when there is only one data, percentile can only be 0.5 ", () => {
          expect(evaluateCell("A1", { A1: percentile + "(666, 0.49)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(666, 0.5)" })).toBe(666);
          expect(evaluateCell("A1", { A1: percentile + "(666, 0.51)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        });

        test("data order does not matter", () => {
          const unsortedData = { A2: "12", A3: "1", A4: "5", A5: "6" };
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.6)", ...data })).toBe(6);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.6)", ...unsortedData })).toBe(6);
        });

        test("2nd argument must be between 1/(n+1) and n/(n+1) with n the number of data", () => {
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0)", ...data })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.19)", ...data })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.81)", ...data })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 1)", ...data })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        });
      } else {
        // prettier-ignore
        const data = {
        A2: "1", A3: "5", A4: "6", A5: "12", A6: "12", A7: "20", A8: "21",
        A9: "42", A10: "42", A11: "44", A12: "47",
      };

        test("return the percentile", () => {
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0)", ...data })).toBe(1);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 1)", ...data })).toBe(47);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0.2)", ...data })).toBe(6);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0.9)", ...data })).toBe(44);
        });

        test("take pro rata when percentile is between 2 values", () => {
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0.15)", ...data })).toBe(5.5);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0.14)", ...data })).toBe(5.4);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A12, 0.53)", ...data })).toBe(20.3);
        });

        test("when there is only one data, the percentile does not matter", () => {
          expect(evaluateCell("A1", { A1: percentile + "(666, 0)" })).toBe(666);
          expect(evaluateCell("A1", { A1: percentile + "(666, 0.2)" })).toBe(666);
          expect(evaluateCell("A1", { A1: percentile + "(666, 1)" })).toBe(666);
        });

        test("data order does not matter", () => {
          const sortedData = { A2: "1", A3: "5", A4: "6", A5: "12", A6: "12" };
          const unsortedData = { A2: "12", A3: "6", A4: "5", A5: "1", A6: "12" };
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.75)", ...sortedData })).toBe(12);
          expect(evaluateCell("A1", { A1: percentile + "(A2:A6, 0.75)", ...unsortedData })).toBe(
            12
          );
        });

        test("2nd argument must be between 0 and 1", () => {
          expect(evaluateCell("A1", { A1: percentile + "(666, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(666, 1.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: percentile + "(666, -0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        });
      }
    });

    describe("casting", () => {
      describe("on 1st argument", () => {
        test("empty argument/cell/cell(s) in range are ignored", () => {
          expect(evaluateCell("A1", { A1: percentile + "(, 0.5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)", A3: "6", A4: "8" })).toBe(7);
        });

        test("argument/cell/cell(s) in range that are not numbers are ignored", () => {
          expect(evaluateCell("A1", { A1: percentile + "(42, 0.5)" })).toBe(42);
          expect(evaluateCell("A1", { A1: percentile + '("", 0.5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + '(" ", 0.5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + '("42", 0.5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + '("coucou", 0.5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(TRUE, 0.5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: "42" })).toBe(42);
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
          expect(evaluateCell("A1", { A1: percentile + "(A2, 0.5)", A2: "TRUE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)", A2: "42", A3: "6", A4: "8" })
          ).toBe(8);
          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)", A2: '"42"', A3: "6", A4: "8" })
          ).toBe(7);
          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)", A2: "coucou", A3: "6", A4: "8" })
          ).toBe(7);
          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A4, 0.5)", A2: "TRUE", A3: "6", A4: "8" })
          ).toBe(7);
        });
      });

      describe("on 2nd argument", () => {
        test("empty argument/cell are considered as 0", () => {
          if (percentile === "=PERCENTILE.EXC") {
            expect(evaluateCell("A1", { A1: percentile + "(A2:A3, )", A2: "6", A3: "7" })).toBe(
              "#ERROR"
            ); // @compatibility: on google sheets, return #VALUE!
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "-12", A3: "-9" })
            ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          } else {
            expect(evaluateCell("A1", { A1: percentile + "(A2:A3, )", A2: "6", A3: "7" })).toBe(6);
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "-12", A3: "-9" })
            ).toBe(-12);
          }
        });

        test("string/string in cell which can be cast in number are interpreted as numbers", () => {
          expect(evaluateCell("A1", { A1: percentile + '(A2:A3, "0.5")', A2: "6", A3: "7" })).toBe(
            6.5
          );
          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "6", A3: "7", A4: '="0.5"' })
          ).toBe(6.5);
        });

        test("string/string in cell which cannot be cast in number return an error", () => {
          expect(evaluateCell("A1", { A1: percentile + '(A2:A3, " ")', A2: "6", A3: "7" })).toBe(
            "#ERROR"
          ); // @compatibility: on google sheets, return #VALUE!
          expect(
            evaluateCell("A1", { A1: percentile + '(A2:A3, "kikou")', A2: "6", A3: "7" })
          ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          expect(
            evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "coucou" })
          ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        });

        test("boolean/boolean in cell are interpreted as numbers", () => {
          if (percentile === "=PERCENTILE.EXC") {
            expect(evaluateCell("A1", { A1: percentile + "(A2:A3, TRUE)", A2: "6", A3: "7" })).toBe(
              "#ERROR"
            ); // @compatibility: on google sheets, return #VALUE!
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, FALSE)", A2: "6", A3: "7" })
            ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "TRUE" })
            ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
          } else {
            expect(evaluateCell("A1", { A1: percentile + "(A2:A3, TRUE)", A2: "6", A3: "7" })).toBe(
              7
            );
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, FALSE)", A2: "6", A3: "7" })
            ).toBe(6);
            expect(
              evaluateCell("A1", { A1: percentile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "TRUE" })
            ).toBe(7);
          }
        });
      });
    });
  }
);

describe.each([["QUARTILE"], ["QUARTILE.INC"], ["QUARTILE.EXC"]])("%s formula", (quartile) => {
  quartile = "=" + quartile;

  test("take 2 arguments", () => {
    expect(evaluateCell("A1", { A1: quartile + "()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: quartile + "(42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: quartile + "(42, 2)" })).toBe(42);
    expect(evaluateCell("A1", { A1: quartile + "(42, 2, 60)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    if (quartile === "=QUARTILE.EXC") {
      // prettier-ignore
      const data1 = {A2: "1", A3: "5", A4: "6"};
      test("return the quartile", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 1)", ...data1 })).toBe(1);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", ...data1 })).toBe(5);
      });

      const data2 = { A2: "1", A3: "5", A4: "6", A5: "12" };
      test("take pro rata when quartile is between 2 values", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A5, 1)", ...data2 })).toBe(2);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A5, 2)", ...data2 })).toBe(5.5);
      });

      test("when there is only one or two data, quartile can only be 2 ", () => {
        expect(evaluateCell("A1", { A1: quartile + "(666, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: quartile + "(666, 2)" })).toBe(666);
        expect(evaluateCell("A1", { A1: quartile + "(666, 3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

        const data3 = { A2: "1", A3: "5" };
        expect(evaluateCell("A1", { A1: quartile + "(A2:A3, 1)", ...data3 })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: quartile + "(A2:A3, 2)", ...data3 })).toBe(3);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A3, 3)", ...data3 })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });

      test("data order does not matter", () => {
        const unsortedData = { A2: "6", A3: "1", A4: "5" };
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 3)", ...data1 })).toBe(6);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 3)", ...unsortedData })).toBe(6);
      });

      test("2nd argument must be between 1 and 3", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 0)", ...data1 })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 4)", ...data1 })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });

      test("if 2nd argument is't integer, it is truncated", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 1.9)", ...data1 })).toBe(1);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 3.9)", ...data1 })).toBe(6);
      });
    } else {
      // prettier-ignore
      const data1 = {A2: "1", A3: "5", A4: "6", A5: "12", A6: "21" };
      test("return the quartile", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 0)", ...data1 })).toBe(1);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 1)", ...data1 })).toBe(5);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 2)", ...data1 })).toBe(6);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 4)", ...data1 })).toBe(21);
      });

      // prettier-ignore
      const data2 = {A2: "1", A3: "5", A4: "6", A5: "12" };
      test("take pro rata when quartile is between 2 values", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A5, 2)", ...data2 })).toBe(5.5);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A5, 1)", ...data2 })).toBe(4);
      });

      test("when there is only one data, the quartile does not matter", () => {
        expect(evaluateCell("A1", { A1: quartile + "(666, 0)" })).toBe(666);
        expect(evaluateCell("A1", { A1: quartile + "(666, 1)" })).toBe(666);
        expect(evaluateCell("A1", { A1: quartile + "(666, 3)" })).toBe(666);
      });

      test("data order does not matter", () => {
        const unsortedData = { A2: "12", A3: "6", A4: "5", A5: "1", A6: "21" };
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 3)", ...data1 })).toBe(12);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 3)", ...unsortedData })).toBe(12);
      });

      test("2nd argument must be between 0 and 4", () => {
        expect(evaluateCell("A1", { A1: quartile + "(666, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: quartile + "(666, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });

      test("if 2nd argument is't integer, it is truncated", () => {
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 0.9)", ...data1 })).toBe(1);
        expect(evaluateCell("A1", { A1: quartile + "(A2:A6, 4.9)", ...data1 })).toBe(21);
      });
    }
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell/cell(s) in range are ignored", () => {
        expect(evaluateCell("A1", { A1: quartile + "(, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", A3: "6", A4: "8" })).toBe(7);
      });

      test("argument/cell/cell(s) in range that are not numbers are ignored", () => {
        expect(evaluateCell("A1", { A1: quartile + "(42, 2)" })).toBe(42);
        expect(evaluateCell("A1", { A1: quartile + '("", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + '(" ", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + '("42", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + '("coucou", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(TRUE, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: "42" })).toBe(42);
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: quartile + "(A2, 2)", A2: "TRUE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", A2: "42", A3: "6", A4: "8" })
        ).toBe(8);
        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", A2: '"42"', A3: "6", A4: "8" })
        ).toBe(7);
        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", A2: "coucou", A3: "6", A4: "8" })
        ).toBe(7);
        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A4, 2)", A2: "TRUE", A3: "6", A4: "8" })
        ).toBe(7);
      });
    });

    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        if (quartile === "=QUARTILE.EXC") {
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, )", A2: "6", A3: "7" })).toBe(
            "#ERROR"
          ); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "-12", A3: "-9" })).toBe(
            "#ERROR"
          ); // @compatibility: on google sheets, return #VALUE!
        } else {
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, )", A2: "6", A3: "7" })).toBe(6);
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "-12", A3: "-9" })).toBe(
            -12
          );
        }
      });

      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: quartile + '(A2:A3, "2")', A2: "6", A3: "7" })).toBe(6.5);
        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "6", A3: "7", A4: '="2"' })
        ).toBe(6.5);
      });

      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: quartile + '(A2:A3, " ")', A2: "6", A3: "7" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: quartile + '(A2:A3, "kikou")', A2: "6", A3: "7" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });

      test("boolean/boolean in cell are interpreted as numbers", () => {
        if (quartile === "=QUARTILE.EXC") {
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, TRUE)", A2: "6", A3: "7" })).toBe(
            "#ERROR"
          ); // @compatibility: on google sheets, return #VALUE!
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, FALSE)", A2: "6", A3: "7" })).toBe(
            "#ERROR"
          ); // @compatibility: on google sheets, return #VALUE!
          expect(
            evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "TRUE" })
          ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        } else {
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, TRUE)", A2: "6", A3: "7" })).toBe(
            6.25
          );
          expect(evaluateCell("A1", { A1: quartile + "(A2:A3, FALSE)", A2: "6", A3: "7" })).toBe(6);
          expect(
            evaluateCell("A1", { A1: quartile + "(A2:A3, A4)", A2: "6", A3: "7", A4: "TRUE" })
          ).toBe(6.25);
        }
      });
    });
  });
});

describe("SMALL formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SMALL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SMALL( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL( , 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(2, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(2, 1)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SMALL(2, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(2, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(2, 1.9)" })).toBe(2);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=SMALL(2, "1")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SMALL(2, TRUE)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SMALL(2, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(TRUE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(False, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=SMALL("test", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=SMALL("2", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "", A3: "", A4: "", A5: "0" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "", A3: "", A4: "", A5: "1" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "1" })
    ).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "3", A3: "1", A4: "-42", A5: "1" })
    ).toBe(-42);
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "2" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "3", A3: "1", A4: "2", A5: "4" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "3", A3: "", A4: "2", A5: "3" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: '"3"', A3: "", A4: "2", A5: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: '"3"', A3: "", A4: "", A5: "1" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: '="3"', A3: "", A4: "2", A5: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", {
        A1: "=SMALL(A2:A4, A5)",
        A2: "lol",
        A3: "looool",
        A4: "xdtrololol",
        A5: "1",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: '"3"', A3: '"1"', A4: '"2"', A5: "1" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(
      evaluateCell("A1", { A1: "=SMALL(A2:A4, A5)", A2: "TRUE", A3: "0", A4: "0", A5: "1" })
    ).toBe(0);
  });
});

describe("STDEV formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEV(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV(2, 4)" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV(2, 4, 6)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV(2, 4, )" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV(-2, 0, 2)" })).toBe(2);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEV(2, 4, "6")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV(TRUE, 3, 5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=STDEV("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(2);
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })
    ).toBeCloseTo(1.41);
  });
});

describe("STDEV.P formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.P()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEV.P(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEV.P(2, 5, 8)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEV.P(3, 6, )" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEV.P(-3, 0, 3)" })).toBeCloseTo(2.45);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEV.P(2, 5, "8")' })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEV.P(TRUE, 4, 7)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: '=STDEV.P("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })
    ).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })
    ).toBeCloseTo(2.45);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(
      1
    );
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(
      1
    );
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(
      1
    );
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(1);
  });
});

describe("STDEV.S formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.S()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEV.S(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.S(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.S(2, 4)" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV.S(2, 4, 6)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV.S(2, 4, )" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV.S(-2, 0, 2)" })).toBe(2);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEV.S(2, 4, "6")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV.S(TRUE, 3, 5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=STDEV.S("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(2);
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })
    ).toBeCloseTo(1.41);
    expect(
      evaluateCell("A1", { A1: "=STDEV.S(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })
    ).toBeCloseTo(1.41);
  });
});

describe("STDEVA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEVA(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVA(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVA(2, 4)" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEVA(2, 4, 6)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEVA(2, 4, )" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEVA(-2, 0, 2)" })).toBe(2);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEVA(2, 4, "6")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEVA(TRUE, 3, 5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=STDEVA("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "2", A3: "4" })).toBeCloseTo(1.41);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })
    ).toBeCloseTo(2.52);
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(2);
  });
});

describe("STDEVP formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVP()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEVP(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEVP(2, 5, 8)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVP(3, 6, )" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVP(-3, 0, 3)" })).toBeCloseTo(2.45);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEVP(2, 5, "8")' })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVP(TRUE, 4, 7)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: '=STDEVP("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })
    ).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })
    ).toBeCloseTo(2.45);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(1);
  });
});

describe("STDEVPA formula", () => {
  test("Sfunctional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVPA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEVPA(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=STDEVPA(2, 5, 8)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVPA(3, 6, )" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVPA(-3, 0, 3)" })).toBeCloseTo(2.45);
  });

  test("Scasting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=STDEVPA(2, 5, "8")' })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVPA(TRUE, 4, 7)" })).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: '=STDEVPA("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Sfunctional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })
    ).toBeCloseTo(2.45);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })
    ).toBeCloseTo(2.45);
  });

  test("Scasting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "3", A3: "6", A4: '="9"' })
    ).toBeCloseTo(2.45);
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "TRUE", A3: "4", A4: "7" })
    ).toBeCloseTo(2.45);
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "test", A3: "3", A4: "6" })
    ).toBeCloseTo(2.45);
    expect(
      evaluateCell("A1", { A1: "=STDEVPA(A2, A3, A4)", A2: "3", A3: "6", A4: '=""' })
    ).toBeCloseTo(2.45);
  });
});

describe("VAR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VAR(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR(2, 4)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(2, 4, 6)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR(2, 4, )" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR(-2, 0, 2)" })).toBe(4);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VAR(2, 4, "6")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR(TRUE, 3, 5)" })).toBe(4);
    expect(evaluateCell("A1", { A1: '=VAR("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(4);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(2);
  });
});

describe("VAR.P formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.P()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VAR.P(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(2, 5, 8)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VAR.P(3, 6, )" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VAR.P(-3, 0, 3)" })).toBe(6);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VAR.P(2, 5, "8")' })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VAR.P(TRUE, 4, 7)" })).toBe(6);
    expect(evaluateCell("A1", { A1: '=VAR.P("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })).toBe(6);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(1);
  });
});

describe("VAR.S formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.S()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VAR.S(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.S(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.S(2, 4)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(2, 4, 6)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR.S(2, 4, )" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR.S(-2, 0, 2)" })).toBe(4);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VAR.S(2, 4, "6")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR.S(TRUE, 3, 5)" })).toBe(4);
    expect(evaluateCell("A1", { A1: '=VAR.S("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(4);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(2);
  });
});

describe("VARA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VARA(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARA(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARA(2, 4)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VARA(2, 4, 6)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(2, 4, )" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(-2, 0, 2)" })).toBe(4);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VARA(2, 4, "6")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(TRUE, 3, 5)" })).toBe(4);
    expect(evaluateCell("A1", { A1: '=VARA("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARA(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(A2)", A2: "0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(A2)", A2: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "2", A3: "4", A4: "6" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "2", A3: "4" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "-2", A3: "0", A4: "2" })).toBe(4);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "test", A3: "3", A4: "6" })).toBe(9);
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(4);
  });
});

describe("VARP formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARP()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VARP(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(2, 5, 8)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARP(3, 6, )" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARP(-3, 0, 3)" })).toBe(6);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VARP(2, 5, "8")' })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARP(TRUE, 4, 7)" })).toBe(6);
    expect(evaluateCell("A1", { A1: '=VARP("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARP(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARP(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })).toBe(6);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "2", A3: "4", A4: '="6"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "TRUE", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "test", A3: "3", A4: "5" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3, A4)", A2: "2", A3: "4", A4: '=""' })).toBe(1);
  });
});

describe("VARPA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARPA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VARPA(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(2, 4)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARPA(2, 5, 8)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(3, 6, )" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(-3, 0, 3)" })).toBe(6);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=VARPA(2, 5, "8")' })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(TRUE, 4, 7)" })).toBe(6);
    expect(evaluateCell("A1", { A1: '=VARPA("test", 3, 5)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARPA(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARPA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3)", A2: "0", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "2", A3: "5", A4: "8" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "2", A3: "4" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "-3", A3: "0", A4: "3" })).toBe(6);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "3", A3: "6", A4: '="9"' })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "TRUE", A3: "4", A4: "7" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "test", A3: "3", A4: "6" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "3", A3: "6", A4: '=""' })).toBe(6);
  });
});
