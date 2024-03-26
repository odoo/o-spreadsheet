import { toXC } from "../../src/helpers";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  createModelFromGrid,
  evaluateCell,
  evaluateCellFormat,
  evaluateGrid,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

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
    expect(evaluateCell("A1", { A1: '=AVEDEV("8/8/2008", "10/10/2010")' })).toBe(396.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2)", A2: "" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "1", A3: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3, A4)", A2: "", A3: "1", A4: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "-10", A3: "20" })).toBe(15);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: '"2"', A3: '"6"' })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: '"2"', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "TRUE", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=AVEDEV(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })).toBe(
      396.5
    );
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
    expect(evaluateCell("A1", { A1: '=average("08/08/2008", "10/10/2010")' })).toBe(40064.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "" })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1", A3: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "1", A3: "", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3, A4)", A2: "", A3: "1", A4: "2" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "1.5", A3: "2.5" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "-10", A3: "20" })).toBe(5);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: '"6"' })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: '"2"', A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "FALSE" })).toEqual(
      "#DIV/0!"
    );
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "TRUE", A3: "42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=average(A2, A3)", A2: "08/08/2008", A3: "10/10/2010" })).toBe(
      40064.5
    );
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=AVERAGE(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=AVERAGE(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=AVERAGE(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });
});

describe("AVERAGE.WEIGHTED formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted( ,  )" })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 0)" })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average.weighted(0, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3)" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3, 3)" })).toBe(2.5);
    expect(evaluateCell("A1", { A1: "=average.weighted( , 1, 3, 3)" })).toBe(2.25);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, 1, 3,  )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=average.weighted(1,  , 3,  )" })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average.weighted(1.5, 1, 2.5, 4)" })).toBe(2.3);
    expect(evaluateCell("A1", { A1: "=average.weighted(4, 1.5, 2, 2.5)" })).toBe(2.75);
    expect(evaluateCell("A1", { A1: "=average.weighted(-10, 1, 20, 2)" })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(1, -1, 3, 3)" })).toEqual("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=average.weighted("-10", "1", "20", "2")' })).toBe(10);
    expect(evaluateCell("A1", { A1: "=average.weighted(TRUE, FALSE)" })).toEqual("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=average.weighted(FALSE, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=average.weighted("@#%!*", "@#%!*", "20", "2")' })).toEqual(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "", A3: "" })).toEqual(
      "#DIV/0!"
    );
    expect(evaluateCell("A1", { A1: "=average.weighted(A2, A3)", A2: "0", A3: "0" })).toEqual(
      "#DIV/0!"
    );
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
        A1: "=average.weighted(A2, 1, 3, A5)",
        A2: "1",
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
    ).toEqual("#DIV/0!");
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
    ).toEqual("#DIV/0!");
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=AVERAGE.WEIGHTED(A2, 2)", A2: "42" })).toBe("");
    expect(
      evaluateCellFormat("A1", { A1: "=AVERAGE.WEIGHTED(A2:A3, A2:A3)", A2: "42%", A3: "1" })
    ).toBe("0%");
    expect(
      evaluateCellFormat("A1", { A1: "=AVERAGE.WEIGHTED(A2:A3, A2:A3)", A2: "1", A3: "42%" })
    ).toBe("");
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
    expect(evaluateCell("A1", { A1: '=AVERAGEA("0", "01/01/1900")' })).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: "" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=AVERAGEA(A2)", A2: "01/20/1900" })).toBe(21);
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=AVERAGEA(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=AVERAGEA(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=AVERAGEA(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });

  test("AVERAGEA doesn't accept error values", () => {
    // prettier-ignore
    const grid = {
        A1: "40", B1: "42",
        A2: "41", B2: "=KABOUM", 
      };
    expect(evaluateCell("A3", { A3: "=AVERAGEA(A1:A2, B1:B2)", ...grid })).toBe("#BAD_EXPR");
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

  test("AVERAGEIF accepts errors in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "41",
      A3: "43",
    };
    expect(evaluateCell("A4", { A4: '=AVERAGEIF(A1:A3, ">1")', ...grid })).toBe(42);
  });

  // @compatibility: should be able to accept errors !
  test("AVERAGEIF doesn't accept error on second parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "41",      B2: "43", 
      A3: "44",      B3: "45", 
    };
    expect(evaluateCell("A4", { A4: "=AVERAGEIF(A1:A3, KABOUM, B1:B3)", ...grid })).toBe(
      "#BAD_EXPR"
    ); // @compatibility: should be 42
  });
});

describe("AVERAGEIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4"  , C1:  "14" , D1:  "Yes",
      B2:  "28" , C2:  "30" , D2:  "Yes",
      B3:  "31" , C3:  "47" , D3:  "Yes",
      B4:  "12" , C4:  "0"  , D4:  "Yes",
      B5:  "31" , C5:  "47" , D5:  "Yes",
      B6:  "13" , C6:  "5"  , D6:  "No" ,
      B7:  "18" , C7:  "43" , D7:  "No" ,
      B8:  "24" , C8:  "7"  , D8:  "Yes",
      B9:  "44" , C9:  "28" , D9:  "No" ,
      B10: "22" , C10: "23" , D10: "No" ,
      B11: "9"  , C11: "13" , D11: "No" ,
      B12: ">20", C12: "<30",

      A12: '=AVERAGEIFS(B1:B11, B1:B11, ">20")',
      A13: '=AVERAGEIFS(B1:B11, B1:B11, ">20", C1:C11, "<30")',
      A14: '=AVERAGEIFS(B1:B11, D1:D11, "No")',
      A15: '=AVERAGEIFS(B1:B11, B1:B11, B12, C1:C11, C12)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(30);
    expect(gridResult.A13).toBe(30);
    expect(gridResult.A14).toBe(21.2);
    expect(gridResult.A15).toBe(30);
  });

  test("AVERAGEIFS accepts errors in first and in 2n parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "41",
      A3: "43",
    };
    expect(evaluateCell("A4", { A4: '=AVERAGEIFS(A1:A3, A1:A3, ">1")', ...grid })).toBe(42);
  });

  // @compatibility: should be able to accept errors !
  test("AVERAGEIFS doesn't accept error on 2n+1 parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "41",      B2: "43", 
      A3: "44",      B3: "45", 
    };
    expect(evaluateCell("A4", { A4: "=AVERAGEIFS(B1:B3, A1:A3, KABOUM)", ...grid })).toBe(
      "#BAD_EXPR"
    ); // @compatibility: should be 43.5
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
    expect(evaluateCell("A1", { A1: '=count(1, 2, "2020-03-26")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=count(1/0)" })).toBe(0);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=count(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "-1", A3: "4.2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "3%" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=count(A1)" })).toBe(0);
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
    expect(evaluateCell("A1", { A1: "=count(A2, A3)", A2: "1", A3: "05/22/2020" })).toBe(2);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=count(B2:D5)",
      A2: "=count(B2:C3, B4:C4, D2:D3, D4, B5:C5)",
      B2: "42.2",
      C2: "TRUE",
      D2: "FALSE",
      B3: "",
      C3: "-10.2",
      D3: "Jean Neypleinlenez",
      B4: '"111111"',
      C4: "0",
      D4: "0",
      B5: "05/17/2002",
      C5: '"05/17/2002"',
    };
    expect(evaluateCell("A1", grid)).toEqual(5);
    expect(evaluateCell("A2", grid)).toEqual(5);
  });

  test("COUNT accepts errors in parameters", () => {
    // prettier-ignore
    const grid = {
        A1: "=KABOUM", B1: "42",
        A2: "42",      B2: "=1/0", 
      };
    expect(evaluateCell("A3", { A3: "=COUNT(A1:B2)", ...grid })).toBe(2);
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
    expect(evaluateCell("A1", { A1: "=COUNTA(1/0)" })).toBe(1);
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
    expect(evaluateCell("A1", { A1: "=COUNTA(A2)", A2: "=1/0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COUNTA(A1)" })).toBe(1);
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

  test("COUNTA accepts errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "=1/0", 
    };
    expect(evaluateCell("A3", { A3: "=COUNTA(A1:B2)", ...grid })).toBe(4);
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

  test("COVAR doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "1", 
      A3: "44",      B3: "2", 
    };
    expect(evaluateCell("A4", { A4: "=COVAR(A1:A3, B1:B3)", ...grid })).toBe("#BAD_EXPR");
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

  test("COVARIANCE.P doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "1", 
      A3: "44",      B3: "2", 
    };
    expect(evaluateCell("A4", { A4: "=COVARIANCE.P(A1:A3, B1:B3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(gridResult.A15).toEqual("#DIV/0!"); //@compatibility: on google sheet, return #NUM
  });

  test("COVARIANCE.S doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "1",
      A3: "44",      B3: "2",
    };
    expect(evaluateCell("A4", { A4: "=COVARIANCE.S(A1:A3, B1:B3)", ...grid })).toBe("#BAD_EXPR");
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

  test("result format is kept", () => {
    expect(evaluateCellFormat("A1", { A1: "=LARGE(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=LARGE(A2:A3, 1)", A2: "42%", A3: "1" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=LARGE(A2:A3, 2)", A2: "7", A3: "600%" })).toBe("0%");
  });

  test("LARGE doesn't accept errors in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=LARGE(A1:A3, 2)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=MAX("08/08/08", "10/10/10")' })).toBe(40461);
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
    expect(evaluateCell("A1", { A1: "=MAX(A2, A3)", A2: "08/08/08", A3: "10/10/10" })).toBe(40461);
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
      //
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MAX(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MAX(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=MAX(A2:A3)", A2: "1", A3: "42%" })).toBe("");
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
    expect(evaluateCell("A1", { A1: '=MAXA("10/10/2010", "8/8/2008")' })).toBe(40461);
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
    expect(evaluateCell("A1", { A1: "=MAXA(A2, A3)", A2: "10/10/2010", A3: "8/8/2008" })).toBe(
      40461
    );
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

      A2: "=MAXA(B2:F2)",
      A3: "=MAXA(B3:F3)",
      A4: "=MAXA(B4:F4)",

      B1: "=MAXA(B2:B4)",
      C1: "=MAXA(C2:C4)",
      D1: "=MAXA(D2:D4)",
      E1: "=MAXA(E2:E4)",
      F1: "=MAXA(F2:F4)",

      B2: "=-3",
      C2: "-3",
      D2: '"9"',
      E2: '="9"',
      F2: "-42",

      B3: '=" "',
      C3: "3",
      D3: "Jean Balletoultan",
      E3: '"Jean Découvrepleindautres"',
      F3: "TRUE",

      B4: "3",
      C4: '""',
      D4: '=""',
      E4: '" "',
      F4: "-100",
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
    expect(gridResult.F1).toEqual(1);
  });

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MAXA(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MAXA(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=MAXA(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });
});

describe("MAXIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4"  , C1:  "14" , D1:  "Yes",
      B2:  "28" , C2:  "30" , D2:  "Yes",
      B3:  "31" , C3:  "47" , D3:  "Yes",
      B4:  "12" , C4:  "0"  , D4:  "Yes",
      B5:  "31" , C5:  "47" , D5:  "Yes",
      B6:  "13" , C6:  "5"  , D6:  "No" ,
      B7:  "18" , C7:  "43" , D7:  "No" ,
      B8:  "24" , C8:  "7"  , D8:  "Yes",
      B9:  "44" , C9:  "28" , D9:  "No" ,
      B10: "22" , C10: "23" , D10: "No" ,
      B11: "9"  , C11: "13" , D11: "No" ,
      B12: ">20", C12: "<28",
      A12: '=MAXIFS(B1:B11, B1:B11, "<20")',
      A13: '=MAXIFS(B1:B11, B1:B11, ">20", C1:C11, "<28")',
      A14: '=MAXIFS(B1:B11, D1:D11, "yes")',
      A15: '=MAXIFS(B1:B11, B1:B11, B12, C1:C11, C12)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(18);
    expect(gridResult.A13).toBe(24);
    expect(gridResult.A14).toBe(31);
    expect(gridResult.A15).toBe(24);
  });

  test("MAXIFS accepts error in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1", B1: "1",
      A2: "=KABOUM_2", B2: "1",
      A3: "42"       , B3: "24",
    };
    expect(evaluateCell("A4", { A4: "=MAXIFS(A1:A3, B1:B3, 24)", ...grid })).toBe(42);
  });

  // @compatibility: should be able to accept errors !
  test("MAXIFS doesn't accept errors in 2n+2 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "=KABOUM",
    };
    expect(evaluateCell("A4", { A4: "=MAXIFS(A1:A3, B1:B3, 1)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 41
  });

  // @compatibility: should be able to count errors !
  test("MAXIFS doesn't accept errors on 2n+3 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "1",
    };
    expect(evaluateCell("A4", { A4: "=MAXIFS(A1:A3, B1:B3, KABOUM)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 0
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MEDIAN(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MEDIAN(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=MEDIAN(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });

  test("MEDIAN doesn't accept errors", () => {
    expect(evaluateCell("A1", { A1: "=MEDIAN(1, 2, KABOUM1, A2)", A2: "=KABOUM2" })).toBe(
      "#BAD_EXPR"
    );
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
    expect(evaluateCell("A1", { A1: '=MIN("08/08/08", "10/10/10")' })).toBe(39668);
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
    expect(evaluateCell("A1", { A1: "=MIN(A2, A3)", A2: "08/08/08", A3: "10/10/10" })).toBe(39668);
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MIN(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MIN(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=MIN(A2:A3)", A2: "1", A3: "42%" })).toBe("");
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
    expect(evaluateCell("A1", { A1: '=MINA(5, "4", TRUE)' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MINA("10/10/2010", "8/8/2008")' })).toBe(39668);
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
    expect(evaluateCell("A1", { A1: "=MINA(A2, A3)", A2: "10/10/2010", A3: "8/8/2008" })).toBe(
      39668
    );
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

      A2: "=MINA(B2:F2)",
      A3: "=MINA(B3:F3)",
      A4: "=MINA(B4:F4)",

      B1: "=MINA(B2:B4)",
      C1: "=MINA(C2:C4)",
      D1: "=MINA(D2:D4)",
      E1: "=MINA(E2:E4)",
      F1: "=MINA(F2:F4)",

      B2: "=9",
      C2: "9",
      D2: '"-9"',
      E2: '="-9"',
      F2: "5",

      B3: '=" "',
      C3: "3",
      D3: "Jean Évumille",
      E3: '"Jean Duvoyage"',
      F3: "TRUE",

      B4: "-42",
      C4: '""',
      D4: '=""',
      E4: '" "',
      F4: "42",
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
    expect(gridResult.F1).toEqual(1);
  });

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MINA(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MINA(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=MINA(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });
});

describe("MINIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      B1:  "4"  , C1:  "14" , D1:  "Yes",
      B2:  "28" , C2:  "30" , D2:  "Yes",
      B3:  "31" , C3:  "47" , D3:  "Yes",
      B4:  "12" , C4:  "0"  , D4:  "Yes",
      B5:  "31" , C5:  "47" , D5:  "Yes",
      B6:  "13" , C6:  "5"  , D6:  "No" ,
      B7:  "18" , C7:  "43" , D7:  "No" ,
      B8:  "24" , C8:  "7"  , D8:  "Yes",
      B9:  "44" , C9:  "28" , D9:  "No" ,
      B10: "22" , C10: "23" , D10: "No" ,
      B11: "9"  , C11: "13" , D11: "No" ,
      B12: ">20", C12: "<23",

      A12: '=MINIFS(B1:B11, B1:B11, ">20")',
      A13: '=MINIFS(B1:B11, B1:B11, ">20", C1:C11, "<23")',
      A14: '=MINIFS(B1:B11, D1:D11, "no")',
      A15: '=MINIFS(B1:B11, B1:B11, B12, C1:C11, C12)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(22);
    expect(gridResult.A13).toBe(24);
    expect(gridResult.A14).toBe(9);
    expect(gridResult.A15).toBe(24);
  });

  test("MINIFS accepts error in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1", B1: "1",
      A2: "=KABOUM_2", B2: "1",
      A3: "42"       , B3: "24",
    };
    expect(evaluateCell("A4", { A4: "=MINIFS(A1:A3, B1:B3, 24)", ...grid })).toBe(42);
  });

  // @compatibility: should be able to accept errors !
  test("MINIFS doesn't accept errors in 2n+2 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "=KABOUM",
    };
    expect(evaluateCell("A4", { A4: "=MINIFS(A1:A3, B1:B3, 1)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 40
  });

  // @compatibility: should be able to count errors !
  test("MINIFS doesn't accept errors on 2n+3 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "1",
    };
    expect(evaluateCell("A4", { A4: "=MINIFS(A1:A3, B1:B3, KABOUM)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 0
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

    test("result format depends on 1st argument", () => {
      expect(evaluateCellFormat("A1", { A1: percentile + "(A2, 0.5)", A2: "42" })).toBe("");
      expect(
        evaluateCellFormat("A1", { A1: percentile + "(A2:A3, 0.5)", A2: "600%", A3: "7" })
      ).toBe("0%");
      expect(
        evaluateCellFormat("A1", { A1: percentile + "(A2:A3, 0.5)", A2: "1", A3: "42%" })
      ).toBe("");
    });

    test("doesn't accept error in first parameter", () => {
      // prettier-ignore
      const grid = {
        A1: "=KABOUM_1",
        A2: "=KABOUM_2",
        A3: "42",
      };
      expect(evaluateCell("A4", { A4: percentile + "(A1:A3, 0.9)", ...grid })).toBe("#BAD_EXPR");
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: quartile + "(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: quartile + "(A2:A3, 2)", A2: "600%", A3: "7" })).toBe(
      "0%"
    );
    expect(evaluateCellFormat("A1", { A1: quartile + "(A2:A3, 2)", A2: "1", A3: "42%" })).toBe("");
  });

  test("doesn't accept error in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1",
      A2: "=KABOUM_2",
      A3: "42",
      A4: "42",
    };
    expect(evaluateCell("A5", { A5: quartile + "(A1:A4, 1)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("RANK formula", () => {
  test("functional tests on simple arguments with column data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "=RANK(1, A1:A6, TRUE)",
      A2: "3", B2: "=RANK(1, A1:A6, FALSE)",
      A3: "1", B3: "=RANK(2, A1:A6, TRUE)",
      A4: "2", B4: "=RANK(3, A1:A6, TRUE)",
      A5: "4", B5: "=RANK(4, A1:A6, TRUE)",
      A6: "3", B6: "=RANK(4, A1:A6, FALSE)",
    };
    expect(evaluateCell("B1", grid)).toBe(1);
    expect(evaluateCell("B2", grid)).toBe(5);
    expect(evaluateCell("B3", grid)).toBe(3);
    expect(evaluateCell("B4", grid)).toBe(4);
    expect(evaluateCell("B5", grid)).toBe(6);
    expect(evaluateCell("B6", grid)).toBe(1);
  });

  test("functional tests on simple arguments with row data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "3", C1: "1", D1: "2", E1: "4", F1: "3",
      A2: "=RANK(1, A1:F1, TRUE)",
      A3: "=RANK(1, A1:F1, FALSE)",
      A4: "=RANK(2, A1:F1, TRUE)",
      A5: "=RANK(3, A1:F1, TRUE)",
      A6: "=RANK(4, A1:F1, TRUE)",
      A7: "=RANK(4, A1:F1, FALSE)",
    };
    expect(evaluateCell("A2", grid)).toBe(1);
    expect(evaluateCell("A3", grid)).toBe(5);
    expect(evaluateCell("A4", grid)).toBe(3);
    expect(evaluateCell("A5", grid)).toBe(4);
    expect(evaluateCell("A6", grid)).toBe(6);
    expect(evaluateCell("A7", grid)).toBe(1);
  });

  test("functional tests on simple arguments with matrix data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "3", C1: "1",
      A2: "2", B2: "4", C2: "3",
      A3: "=RANK(1, A1:C2, TRUE)",
      A4: "=RANK(1, A1:C2, FALSE)",
      A5: "=RANK(2, A1:C2, TRUE)",
      A6: "=RANK(3, A1:C2, TRUE)",
      A7: "=RANK(4, A1:C2, TRUE)",
      A8: "=RANK(4, A1:C2, FALSE)",
    };
    expect(evaluateCell("A3", grid)).toBe(1);
    expect(evaluateCell("A4", grid)).toBe(5);
    expect(evaluateCell("A5", grid)).toBe(3);
    expect(evaluateCell("A6", grid)).toBe(4);
    expect(evaluateCell("A7", grid)).toBe(6);
    expect(evaluateCell("A8", grid)).toBe(1);
  });

  test("functional tests on simple arguments with already asc-sorted data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "=RANK(1, A1:A6, TRUE)",
      A2: "1", B2: "=RANK(1, A1:A6, FALSE)",
      A3: "2", B3: "=RANK(2, A1:A6, TRUE)",
      A4: "3", B4: "=RANK(3, A1:A6, TRUE)",
      A5: "3", B5: "=RANK(4, A1:A6, TRUE)",
      A6: "4", B6: "=RANK(4, A1:A6, FALSE)",
    };
    expect(evaluateCell("B1", grid)).toBe(1);
    expect(evaluateCell("B2", grid)).toBe(5);
    expect(evaluateCell("B3", grid)).toBe(3);
    expect(evaluateCell("B4", grid)).toBe(4);
    expect(evaluateCell("B5", grid)).toBe(6);
    expect(evaluateCell("B6", grid)).toBe(1);
  });

  test("functional tests on simple arguments with already desc-sorted data", () => {
    //prettier-ignore
    const grid = {
      A1: "4", B1: "=RANK(1, A1:A6, TRUE)",
      A2: "3", B2: "=RANK(1, A1:A6, FALSE)",
      A3: "3", B3: "=RANK(2, A1:A6, TRUE)",
      A4: "2", B4: "=RANK(3, A1:A6, TRUE)",
      A5: "1", B5: "=RANK(4, A1:A6, TRUE)",
      A6: "1", B6: "=RANK(4, A1:A6, FALSE)",
    };
    expect(evaluateCell("B1", grid)).toBe(1);
    expect(evaluateCell("B2", grid)).toBe(5);
    expect(evaluateCell("B3", grid)).toBe(3);
    expect(evaluateCell("B4", grid)).toBe(4);
    expect(evaluateCell("B5", grid)).toBe(6);
    expect(evaluateCell("B6", grid)).toBe(1);
  });

  test("functional tests with value not in data", () => {
    //prettier-ignore
    const grid = {
      A1: "4", B1: "=RANK(0, A1:A6, TRUE)",
      A2: "3", B2: "=RANK(0, A1:A6, FALSE)",
      A3: "3", B3: "=RANK(5, A1:A6, TRUE)",
      A4: "2", B4: "=RANK(5, A1:A6, FALSE)",
      A5: "1",
      A6: "1",
    };
    expect(evaluateCell("B1", grid)).toBe("#N/A");
    expect(evaluateCell("B2", grid)).toBe("#N/A");
    expect(evaluateCell("B3", grid)).toBe("#N/A");
    expect(evaluateCell("B4", grid)).toBe("#N/A");
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

  test("format is kept", () => {
    expect(evaluateCellFormat("A1", { A1: "=SMALL(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=SMALL(A2:A3, 1)", A2: "600%", A3: "7" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=SMALL(A2:A3, 2)", A2: "1", A3: "42%" })).toBe("");
  });

  test("SMALL doesn't accept errors in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=SMALL(A1:A3, 2)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("STDEV formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEV(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=STDEV("8/8/2008", "10/10/2010")' })).toBeCloseTo(
      560.73568,
      5
    );
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=STDEV(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })
    ).toBeCloseTo(560.73568, 5);
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
    expect(evaluateCell("A1", { A1: '=STDEV.P("8/8/2008", "10/10/2010")' })).toBe(396.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=STDEV.P(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })).toBe(
      396.5
    );
  });
});

describe("STDEV.S formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.S()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEV.S(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV.S(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=STDEV.S("8/8/2008", "10/10/2010")' })).toBeCloseTo(
      560.73568,
      5
    );
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEV.S(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=STDEV.S(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })
    ).toBeCloseTo(560.73568, 5);
  });

  test("STDEV doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=STDEV(A1:A3)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("STDEVA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=STDEVA(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVA(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=STDEVA("8/8/2008", "10/10/2010")' })).toBeCloseTo(
      560.73568,
      5
    );
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVA(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVA(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=STDEVA(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })
    ).toBeCloseTo(560.73568, 5);
  });

  test("STDEVA doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=STDEVA(A1:A3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=STDEVP("8/8/2008", "10/10/2010")' })).toBe(396.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=STDEVP(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })).toBe(
      396.5
    );
  });

  test("STDEVP doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=STDEVP(A1:A3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=STDEVPA("8/8/2008", "10/10/2010")' })).toBe(396.5);
  });

  test("Sfunctional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=STDEVPA(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })).toBe(
      396.5
    );
  });

  test("STDEVPA doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=STDEVPA(A1:A3)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("VAR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VAR(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=VAR("8/8/2008", "10/10/2010")' })).toBe(314424.5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=VAR(A2, A3)", A2: "8/8/2008", A3: "10/10/2010" })).toBe(
      314424.5
    );
  });

  test("VAR doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VAR(A1:A3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=VAR.P("1/11/1900", "1/8/1900", FALSE)' })).toBe(26);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VAR.P(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=VAR.P(A2, A3, A4)", A2: "1/11/1900", A3: "1/8/1900", A4: "FALSE" })
    ).toBe(2.25);
  });

  test("VAR.P doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VAR.P(A1:A3)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("VAR.S formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.S()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VAR.S(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR.S(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=VAR.S("1/11/1900", "1/8/1900", FALSE)' })).toBe(39);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR.S(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VAR.S(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=VAR.S(A2, A3, A4)", A2: "1/11/1900", A3: "1/8/1900", A4: "FALSE" })
    ).toBe(4.5);
  });

  test("VAR.S doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VAR.S(A1:A3)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("VARA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARA()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VARA(0)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARA(1)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: '=VARA("1/11/1900", "1/8/1900", FALSE)' })).toBe(39);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARA(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARA(A2)", A2: "0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARA(A2)", A2: "1" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARA(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=VARA(A2, A3, A4)", A2: "1/11/1900", A3: "1/8/1900", A4: "test" })
    ).toBe(39);
  });

  test("VARA doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VARA(A1:A3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=VARP("1/11/1900", "1/8/1900")' })).toBe(2.25);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARP(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARP(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3)" })).toBe("#DIV/0!");
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
    expect(evaluateCell("A1", { A1: "=VARP(A2, A3)", A2: "1/11/1900", A3: "1/8/1900" })).toBe(2.25);
  });

  test("VARP doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VARP(A1:A3)", ...grid })).toBe("#BAD_EXPR");
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
    expect(evaluateCell("A1", { A1: '=VARPA("1/11/1900", "1/8/1900", FALSE)' })).toBe(26);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=VARPA(A2)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=VARPA(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(A2)", A2: "1" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=VARPA(A2, A3)" })).toBe("#DIV/0!");
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
    expect(
      evaluateCell("A1", { A1: "=VARPA(A2, A3, A4)", A2: "1/11/1900", A3: "1/8/1900", A4: "test" })
    ).toBe(26);
  });

  test("VARPA doesn't accept errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "42",
      A3: "44",
    };
    expect(evaluateCell("A4", { A4: "=VARPA(A1:A3)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("PEARSON/CORREL and RSQ formula", () => {
  test("Unrelated values", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "4", C1: "9", D1: "10",
      A2: "5", B2: "3", C2: "7", D2: "6",
      A3: "7", B3: "6", C3: "5", D3: "1",
      A4: "1", B4: "1", C4: "3", D4: "5",
      A5: "8", B5: "5", C5: "1", D5: "3",
      A6: "=PEARSON(A1:A5, B1:B5)", B6: "=CORREL(A1:A5, B1:B5)", C6: "=RSQ(A1:A5, B1:B5)",
      A7: "=PEARSON(B1:B5, C1:C5)", B7: "=CORREL(B1:B5, C1:C5)", C7: "=RSQ(B1:B5, C1:C5)",
      A8: "=PEARSON(C1:C5, D1:D5)", B8: "=CORREL(C1:C5, D1:D5)", C8: "=RSQ(C1:C5, D1:D5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(0.7927032095);
    expect(evaluateCell("B6", grid)).toBeCloseTo(0.7927032095);
    expect(evaluateCell("C6", grid)).toBeCloseTo(0.628458498);
    expect(evaluateCell("A7", grid)).toBeCloseTo(0);
    expect(evaluateCell("B7", grid)).toBeCloseTo(0);
    expect(evaluateCell("C7", grid)).toBeCloseTo(0);
    expect(evaluateCell("A8", grid)).toBeCloseTo(0.6993786062);
    expect(evaluateCell("B8", grid)).toBeCloseTo(0.6993786062);
    expect(evaluateCell("C8", grid)).toBeCloseTo(0.4892550143);
  });

  test("Perfect correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1:  "3", D1:  "4",
      A2: "2", B2:  "4", C2:  "6", D2:  "8",
      A3: "3", B3:  "6", C3:  "9", D3: "12",
      A4: "4", B4:  "8", C4: "12", D4: "16",
      A5: "5", B5: "10", C5: "15", D5: "20",
      A6: "=PEARSON(A1:A5, B1:B5)", B6: "=CORREL(A1:A5, B1:B5)", C6: "=RSQ(A1:A5, B1:B5)",
      A7: "=PEARSON(B1:B5, C1:C5)", B7: "=CORREL(B1:B5, C1:C5)", C7: "=RSQ(B1:B5, C1:C5)",
      A8: "=PEARSON(C1:C5, D1:D5)", B8: "=CORREL(C1:C5, D1:D5)", C8: "=RSQ(C1:C5, D1:D5)",
    };
    for (const cell of ["A6", "B6", "A7", "B7", "A8", "B8", "C6", "C7", "C8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(1);
    }
  });

  test("Non-numeric values are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1:  "2",
      A2:  "2", B2:  "4",
      A3: "ko", B3:  "4",
      A4:  "3", B4:  "6",
      A5:  "3", B5: "=TRUE()",
      A6:  "4", B6:  "8",
      A7:  "5", B7: "10",
      A8: "=PEARSON(A1:A7, B1:B7)", B8: "=CORREL(A1:A7, B1:B7)", C8: "=RSQ(A1:A7, B1:B7)",
    };
    expect(evaluateCell("A8", grid)).toBeCloseTo(1);
    expect(evaluateCell("B8", grid)).toBeCloseTo(1);
    expect(evaluateCell("C8", grid)).toBeCloseTo(1);
  });

  test("Perfect negative correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "10", C1:  "3", D1: "20",
      A2: "2", B2:  "8", C2:  "6", D2: "16",
      A3: "3", B3:  "6", C3:  "9", D3: "12",
      A4: "4", B4:  "4", C4: "12", D4:  "8",
      A5: "5", B5:  "2", C5: "15", D5:  "4",
      A6: "=PEARSON(A1:A5, B1:B5)", B6: "=CORREL(A1:A5, B1:B5)", C6: "=RSQ(A1:A5, B1:B5)",
      A7: "=PEARSON(B1:B5, C1:C5)", B7: "=CORREL(B1:B5, C1:C5)", C7: "=RSQ(B1:B5, C1:C5)",
      A8: "=PEARSON(C1:C5, D1:D5)", B8: "=CORREL(C1:C5, D1:D5)", C8: "=RSQ(C1:C5, D1:D5)",
    };
    for (const cell of ["A6", "B6", "A7", "B7", "A8", "B8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(-1);
    }
    for (const cell of ["C6", "C7", "C8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(1);
    }
  });

  test("Unconsistent dimensions", () => {
    //prettier-ignore
    const grid = {
      A6: "=PEARSON(A1:A5, B1:B4)", B6: "=CORREL(A1:A5, B1:B4)", C6: "=RSQ(A1:A5, B1:B4)",
      A7: "=PEARSON(B1:B4, C1:C5)", B7: "=CORREL(B1:B4, C1:C5)", C7: "=RSQ(B1:B4, C1:C5)",
    };
    for (const cell of ["A6", "B6", "A7", "B7", "C6", "C7"]) {
      expect(evaluateCell(cell, grid)).toBe("#ERROR");
    }
  });

  test("Ignore non-numeric pairs", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1:  "2", C1:  "3", D1:  "4",
      A2: "ko", B2:  "4", C2:  "6", D2:  "8",
      A3:  "3", B3: "ko", C3:  "9", D3: "12",
      A4:  "4", B4:  "8", C4: "ko", D4: "16",
      A5:  "5", B5: "10", C5: "15", D5: "TRUE",
      A6: "=PEARSON(A1:A5, B1:B5)", B6: "=CORREL(A1:A5, B1:B5)", C6: "=RSQ(A1:A5, B1:B5)",
      A7: "=PEARSON(B1:B5, C1:C5)", B7: "=CORREL(B1:B5, C1:C5)", C7: "=RSQ(B1:B5, C1:C5)",
      A8: "=PEARSON(C1:C5, D1:D5)", B8: "=CORREL(C1:C5, D1:D5)", C8: "=RSQ(C1:C5, D1:D5)",
    };
    for (const cell of ["A6", "B6", "A7", "B7", "A8", "B8", "C6", "C7", "C8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(1);
    }
  });
});

describe("SPEARMAN formula", () => {
  test("Unrelated values", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "4", C1: "9", D1: "10",
      A2: "5", B2: "3", C2: "7", D2: "6",
      A3: "7", B3: "6", C3: "5", D3: "1",
      A4: "1", B4: "1", C4: "3", D4: "5",
      A5: "8", B5: "5", C5: "1", D5: "3",
      A6: "=SPEARMAN(A1:A5, B1:B5)",
      A7: "=SPEARMAN(B1:B5, C1:C5)",
      A8: "=SPEARMAN(C1:C5, D1:D5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(0.8);
    expect(evaluateCell("A7", grid)).toBeCloseTo(-0.1);
    expect(evaluateCell("A8", grid)).toBeCloseTo(0.7);
  });

  test("Perfect correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1:  "3", D1:  "4",
      A2: "2", B2:  "4", C2:  "6", D2:  "8",
      A3: "3", B3:  "6", C3:  "9", D3: "12",
      A4: "4", B4:  "8", C4: "12", D4: "16",
      A5: "5", B5: "10", C5: "15", D5: "20",
      A6: "=SPEARMAN(A1:A5, B1:B5)",
      A7: "=SPEARMAN(B1:B5, C1:C5)",
      A8: "=SPEARMAN(C1:C5, D1:D5)",    };
    for (const cell of ["A6", "A7", "A8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(1);
    }
  });

  test("Non-numeric values are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1:  "2",
      A2:  "2", B2:  "4",
      A3: "ko", B3:  "4",
      A4:  "3", B4:  "6",
      A5:  "3", B5: "=TRUE()",
      A6:  "4", B6:  "8",
      A7:  "5", B7: "10",
      A8: "=SPEARMAN(B1:B7, A1:A7)",
    };
    expect(evaluateCell("A8", grid)).toBeCloseTo(1);
  });

  test("Perfect negative correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "10", C1:  "3", D1: "20",
      A2: "2", B2:  "8", C2:  "6", D2: "16",
      A3: "3", B3:  "6", C3:  "9", D3: "12",
      A4: "4", B4:  "4", C4: "12", D4:  "8",
      A5: "5", B5:  "2", C5: "15", D5:  "4",
      A6: "=SPEARMAN(A1:A5, B1:B5)",
      A7: "=SPEARMAN(B1:B5, C1:C5)",
      A8: "=SPEARMAN(C1:C5, D1:D5)",
    };
    for (const cell of ["A6", "A7", "A8"]) {
      expect(evaluateCell(cell, grid)).toBeCloseTo(-1);
    }
  });

  test("Unconsistent dimensions", () => {
    //prettier-ignore
    const grid = {
      A6: "=SPEARMAN(A1:A5, B1:B4)",
      A7: "=SPEARMAN(B1:B4, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR");
    expect(evaluateCell("A7", grid)).toBe("#ERROR");
  });
});

describe("MATTHEWS formula", () => {
  test("Correctly compute result", () => {
    //pretier-ignore
    const grid = {
      A1: "TRUE",
      B1: "TRUE",
      C1: "FALSE",
      D1: "FALSE",
      A2: "TRUE",
      B2: "TRUE",
      C2: "FALSE",
      D2: "TRUE",
      A3: "TRUE",
      B3: "TRUE",
      C3: "FALSE",
      D3: "FALSE",
      A4: "TRUE",
      B4: "TRUE",
      C4: "FALSE",
      D4: "TRUE",
      A5: "TRUE",
      B5: "TRUE",
      C5: "FALSE",
      D5: "FALSE",
      A6: "FALSE",
      B6: "FALSE",
      C6: "TRUE",
      D6: "TRUE",
      A7: "FALSE",
      B7: "FALSE",
      C7: "TRUE",
      D7: "FALSE",
      A8: "FALSE",
      B8: "FALSE",
      C8: "TRUE",
      D8: "TRUE",
      A9: "FALSE",
      B9: "FALSE",
      C9: "TRUE",
      D9: "FALSE",
      A10: "FALSE",
      B10: "FALSE",
      C10: "TRUE",
      D10: "TRUE",
      A11: "=MATTHEWS(A1:A10, B1:B10)",
      A12: "=MATTHEWS(A1:A10, C1:C10)",
      A13: "=MATTHEWS(A1:A10, D1:D10)",
    };
    expect(evaluateCell("A11", grid)).toBeCloseTo(1);
    expect(evaluateCell("A12", grid)).toBeCloseTo(-1);
    expect(evaluateCell("A13", grid)).toBeCloseTo(-0.2);
  });

  test("Unconsistent dimensions", () => {
    const grid = {
      A11: "=MATTHEWS(A1:A10, B1:B9)",
      A12: "=MATTHEWS(A1:A9, B1:B10)",
    };
    expect(evaluateCell("A11", grid)).toBe("#ERROR");
    expect(evaluateCell("A12", grid)).toBe("#ERROR");
  });
});

describe("SLOPE formula", () => {
  test("Unrelated values", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "4", C1: "9", D1: "10",
      A2: "5", B2: "3", C2: "7", D2: "6",
      A3: "7", B3: "6", C3: "5", D3: "1",
      A4: "1", B4: "1", C4: "3", D4: "5",
      A5: "8", B5: "5", C5: "1", D5: "3",
      A6: "=SLOPE(B1:B5, A1:A5)",
      A7: "=SLOPE(C1:C5, B1:B5)",
      A8: "=SLOPE(D1:D5, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(0.5);
    expect(evaluateCell("A7", grid)).toBeCloseTo(0);
    expect(evaluateCell("A8", grid)).toBeCloseTo(0.75);
  });

  test("Perfect correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "15", D1: "4",
      A2: "2", B2:  "4", C2: "12", D2: "5",
      A3: "3", B3:  "6", C3:  "9", D3: "6",
      A4: "4", B4:  "8", C4:  "6", D4: "7",
      A5: "5", B5: "10", C5:  "3", D5: "8",
      A6: "=SLOPE(B1:B5, A1:A5)",
      A7: "=SLOPE(C1:C5, B1:B5)",
      A8: "=SLOPE(D1:D5, A1:A5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(2);
    expect(evaluateCell("A7", grid)).toBeCloseTo(-1.5);
    expect(evaluateCell("A8", grid)).toBeCloseTo(1);
  });

  test("Non-numeric values are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1:  "2",
      A2:  "2", B2:  "4",
      A3: "ko", B3:  "4",
      A4:  "3", B4:  "6",
      A5:  "3", B5: "=TRUE()",
      A6:  "4", B6:  "8",
      A7:  "5", B7: "10",
      A8: "=SLOPE(B1:B7, A1:A7)",
    };
    expect(evaluateCell("A8", grid)).toBeCloseTo(2);
  });

  test("Unconsistent dimensions", () => {
    //prettier-ignore
    const grid = {
      A6: "=SLOPE(A1:A5, B1:B4)",
      A7: "=SLOPE(B1:B4, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
    expect(evaluateCell("A7", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
  });
});

describe("INTERCEPT formula", () => {
  test("Unrelated values", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "4", C1: "9", D1: "10",
      A2: "5", B2: "3", C2: "7", D2: "6",
      A3: "7", B3: "6", C3: "5", D3: "1",
      A4: "1", B4: "1", C4: "3", D4: "5",
      A5: "8", B5: "5", C5: "1", D5: "3",
      A6: "=INTERCEPT(B1:B5, A1:A5)",
      A7: "=INTERCEPT(C1:C5, B1:B5)",
      A8: "=INTERCEPT(D1:D5, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(1.5);
    expect(evaluateCell("A7", grid)).toBeCloseTo(5);
    expect(evaluateCell("A8", grid)).toBeCloseTo(1.25);
  });

  test("Perfect correlation", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "15", D1: "-8",
      A2: "2", B2:  "4", C2: "12", D2: "-7",
      A3: "3", B3:  "6", C3:  "9", D3: "-6",
      A4: "4", B4:  "8", C4:  "6", D4: "-5",
      A5: "5", B5: "10", C5:  "3", D5: "-4",
      A6: "=INTERCEPT(B1:B5, A1:A5)",
      A7: "=INTERCEPT(C1:C5, B1:B5)",
      A8: "=INTERCEPT(D1:D5, A1:A5)",
    };
    expect(evaluateCell("A6", grid)).toBeCloseTo(0);
    expect(evaluateCell("A7", grid)).toBeCloseTo(18);
    expect(evaluateCell("A8", grid)).toBeCloseTo(-9);
  });

  test("Non-numeric values are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1:  "2",
      A2:  "2", B2:  "4",
      A3: "ko", B3:  "4",
      A4:  "3", B4:  "6",
      A5:  "3", B5: "=TRUE()",
      A6:  "4", B6:  "8",
      A7:  "5", B7: "10",
      A8: "=INTERCEPT(B1:B7, A1:A7)",
    };
    expect(evaluateCell("A8", grid)).toBeCloseTo(0);
  });

  test("Unconsistent dimensions", () => {
    //prettier-ignore
    const grid = {
      A6: "=INTERCEPT(A1:A5, B1:B4)",
      A7: "=INTERCEPT(B1:B4, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
    expect(evaluateCell("A7", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
  });
});

describe("FORECAST formula", () => {
  test("Correctly predicts a single value", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "15", D1: "-8",
      A2: "2", B2:  "4", C2: "12", D2: "-7",
      A3: "3", B3:  "6", C3:  "9", D3: "-6",
      A4: "4", B4:  "8", C4:  "6", D4: "-5",
      A5: "5", B5: "10", C5:  "3", D5: "-4",
      B6: "=FORECAST(6, B1:B5, A1:A5)",
      C6: "=FORECAST(12, C1:C5, B1:B5)",
      D6: "=FORECAST(6, D1:D5, A1:A5)",
    };
    expect(evaluateCell("B6", grid)).toBeCloseTo(12);
    expect(evaluateCell("C6", grid)).toBeCloseTo(0);
    expect(evaluateCell("D6", grid)).toBeCloseTo(-3);
  });

  test("Correctly predicts a column of values", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "6",
      A2: "2", B2:  "4", C2: "7",
      A3: "3", B3:  "6", C3: "8",
      A4: "4", B4:  "8", C4: "9",
      A5: "5", B5: "10",
      B6: "=FORECAST(C1:C4, B1:B5, A1:A5)",
    };
    const model = createModelFromGrid(grid);
    expect(getRangeValuesAsMatrix(model, "B6:B9")).toEqual([[12], [14], [16], [18]]);
  });

  test("Correctly predicts a row of values", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "6", D1: "7", E1: "8", F1: "9",
      A2: "2", B2:  "4",
      A3: "3", B3:  "6",
      A4: "4", B4:  "8",
      A5: "5", B5: "10",
      B6: "=FORECAST(C1:F1, B1:B5, A1:A5)",
    };
    const model = createModelFromGrid(grid);
    expect(getRangeValuesAsMatrix(model, "B6:E6")).toEqual([[12, 14, 16, 18]]);
  });

  test("Unconsistent dimensions", () => {
    //prettier-ignore
    const grid = {
      A6: "=FORECAST(6, A1:A5, B1:B4)",
      A7: "=FORECAST(12, B1:B4, C1:C5)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
    expect(evaluateCell("A7", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #N/A
  });

  test("Wrong type of arguments", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "10", C1:  "3",
      A2: "2", B2:  "8", C2:  "6",
      A3: "3", B3:  "6", C3:  "9",
      A4: "4", B4:  "4", C4: "12",
      A5: "5", B5:   "", C5: "15",
      A6: '=FORECAST("wrong", A1:A5, B1:B4)',
      A7: '=FORECAST(5, "wrong", B1:B4)',
      A8: '=FORECAST(5, A1:A5, "wrong")',
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR"); //@compatibility : On google sheet, returns #VALUE
    expect(evaluateCell("A7", grid)).toBe("#BAD_EXPR"); //@compatibility : On google sheet, returns #N/A
    expect(evaluateCell("A8", grid)).toBe("#BAD_EXPR"); //@compatibility : On google sheet, returns #N/A
  });
});

describe("STEYX formula", () => {
  test("Nul standard error for linear-dependant data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1:  "2", C1: "15",
      A2: "2", B2:  "4", C2: "12",
      A3: "3", B3:  "6", C3:  "9",
      A4: "4", B4:  "8", C4:  "6",
      A5: "5", B5: "10", C5:  "3",
      B6: "=STEYX(A1:A5, B1:B5)",
      C6: "=STEYX(B1:B5, C1:C5)",
    };
    expect(evaluateCell("B6", grid)).toBeCloseTo(0);
    expect(evaluateCell("C6", grid)).toBeCloseTo(0);
  });

  test("Correct standard error for uncorrelated data", () => {
    //prettier-ignore
    const grid = {
       A1:  "5",    B1: "1",
       A2:  "8.5",  B2: "2.5",
       A3: "10",    B3: "3.1",
       A4: "11.2",  B4: "4",
       A5: "14",    B5: "4.7",
       A6: "16",    B6: "5.3",
       A7: "16.8",  B7: "6",
       A8: "18.55", B8: "7.1",
       A9: "20",    B9: "9",
      A10: "=STEYX(A1:A9, B1:B9)",
    };
    expect(evaluateCell("A10", grid)).toBeCloseTo(1.121834626);
  });

  test("Non-numeric values are ignored", () => {
    //prettier-ignore
    const grid = {
        A1:  "5",     B1: "1",
        A2:  "8.5",   B2: "2.5",
        A3: "10",     B3: "3.1",
        A4: "11.2",   B4: "4",
        A5: "ko",     B5: "4",
        A6: "14",     B6: "4.7",
        A7: "16",     B7: "5.3",
        A8: "16",     B8: "=TRUE()",
        A9: "16.8",   B9: "6",
       A10: "18.55", B10: "7.1",
       A11: "20",    B11: "9",
       A12: "=STEYX(A1:A11, B1:B11)",
    };
    expect(evaluateCell("A12", grid)).toBeCloseTo(1.121834626);
  });
});

describe("POLYFIT.COEFFS formula", () => {
  test("Noisy values", () => {
    //prettier-ignore
    const grid = {
       A1:  "2",  B1: "18",
       A2:  "4",  B2: "14",
       A3:  "4",  B3: "16",
       A4:  "5",  B4: "17",
       A5:  "6",  B5: "18",
       A6:  "7",  B6: "23",
       A7:  "7",  B7: "25",
       A8:  "8",  B8: "28",
       A9:  "9",  B9: "32",
      A10: "12", B10: "29",
      A11: "=POLYFIT.COEFFS(B1:B10, A1:A10, 3)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(-0.12648192);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(2.648191999);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(-14.23806978);
    expect(getEvaluatedCell(model, "D11").value).toBeCloseTo(37.21341211);
  });

  test.each(["1", "2", "3", "4"])("degree %s polynomial data", async (degree: string) => {
    const order = parseInt(degree);
    //prettier-ignore
    const grid = {
      A1: "1", B1: Math.pow(1, order).toString(),
      A2: "2", B2: Math.pow(2, order).toString(),
      A3: "3", B3: Math.pow(3, order).toString(),
      A4: "4", B4: Math.pow(4, order).toString(),
      A5: "5", B5: Math.pow(5, order).toString(),
      A6: `=POLYFIT.COEFFS(B1:B5, A1:A5, ${order})`,
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A6").value).toBeCloseTo(1);
    for (let i = 1; i < order; i++) {
      expect(getEvaluatedCell(model, toXC(i, 5)).value).toBeCloseTo(0);
    }
  });

  test("Non-numeric data are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1: "1",
      A2:  "2", B2: "4",
      A3: "ko", B3: "4",
      A4:  "3", B4: "9",
      A5:  "4", B5: "16",
      A6:  "4", B6: "=TRUE()",
      A7:  "5", B7: "25",
      A8: "=POLYFIT.COEFFS(B1:B7, A1:A7, 2)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A8").value).toBeCloseTo(1);
    expect(getEvaluatedCell(model, "B8").value).toBeCloseTo(0);
  });

  test("Unconsistent data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "2",
      A2: "2", B2: "4",
      A3: "3", B3: "6",
      A4: "4", B4: "8",
      A5: "5", B5: "10",
      A6: "=POLYFIT.COEFFS(B1:B5, A1:A4, 3)",
      A7: "=POLYFIT.COEFFS(B1:B4, A1:A5, 3)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR");
    expect(evaluateCell("A7", grid)).toBe("#ERROR");
  });
});

describe("POLYFIT.FORECAST formula", () => {
  test.each(["1", "2", "3", "4"])("degree %s polynomial data", async (degree: string) => {
    const order = parseInt(degree);
    //prettier-ignore
    const grid = {
      A1: "1", B1: Math.pow(1, order).toString(),
      A2: "2", B2: Math.pow(2, order).toString(),
      A3: "3", B3: Math.pow(3, order).toString(),
      A4: "4", B4: Math.pow(4, order).toString(),
      A5: "5", B5: Math.pow(5, order).toString(),
      A6: `=POLYFIT.FORECAST(6, B1:B5, A1:A5, ${order})`,
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A6").value).toBeCloseTo(Math.pow(6, order));
  });

  test.each(["1", "2", "3", "4"])(
    "degree %s polynomial data with row data",
    async (degree: string) => {
      const order = parseInt(degree);
      //prettier-ignore
      const grid = {
      A1: "1", B1: Math.pow(1, order).toString(), C1: "6", D1: "7", E1: "8", F1: "9",
      A2: "2", B2: Math.pow(2, order).toString(),
      A3: "3", B3: Math.pow(3, order).toString(),
      A4: "4", B4: Math.pow(4, order).toString(),
      A5: "5", B5: Math.pow(5, order).toString(),
      A6: `=POLYFIT.FORECAST(C1:F1, B1:B5, A1:A5, ${order})`,
    };
      const model = createModelFromGrid(grid);
      expect(getEvaluatedCell(model, "A6").value).toBeCloseTo(Math.pow(6, order));
      expect(getEvaluatedCell(model, "B6").value).toBeCloseTo(Math.pow(7, order));
      expect(getEvaluatedCell(model, "C6").value).toBeCloseTo(Math.pow(8, order));
      expect(getEvaluatedCell(model, "D6").value).toBeCloseTo(Math.pow(9, order));
    }
  );

  test("Non-numeric data are ignored", () => {
    //prettier-ignore
    const grid = {
      A1:  "1", B1: "1",
      A2:  "2", B2: "4",
      A3: "ko", B3: "4",
      A4:  "3", B4: "9",
      A5:  "4", B5: "16",
      A6:  "4", B6: "=TRUE()",
      A7:  "5", B7: "25",
      A8: "=POLYFIT.FORECAST(6, B1:B7, A1:A7, 2)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A8").value).toBeCloseTo(36);
  });

  test("Unconsistent data", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "2",
      A2: "2", B2: "4",
      A3: "3", B3: "6",
      A4: "4", B4: "8",
      A5: "5", B5: "10",
      A6: "=POLYFIT.FORECAST(6, B1:B5, A1:A4, 3)",
      A7: "=POLYFIT.FORECAST(6, B1:B4, A1:A5, 3)",
    };
    expect(evaluateCell("A6", grid)).toBe("#ERROR");
    expect(evaluateCell("A7", grid)).toBe("#ERROR");
  });
});

describe("LINEST formula", () => {
  test("1-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "14.00", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "6",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LINEST(A1:A9, B1:B9, 0, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(2.655839489);
    expect(getEvaluatedCell(model, "B10").value).toBe(0);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("1-variable : no-intercept regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "14.00", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "6",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LINEST(A1:A9, B1:B9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(2.655839489);
    expect(getEvaluatedCell(model, "B10").value).toBe(0);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.131197596);
    expect(getEvaluatedCell(model, "B11").value).toBe(0);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.980851215);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(2.076282277);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(409.7810683);
    expect(getEvaluatedCell(model, "B13").value).toBe(8);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(1766.544915);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(34.48758475);
  });

  test("1-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "14.00", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "6",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LINEST(A1:A9, B1:B9, 1, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.997074937);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(3.863877797);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("1-variable : classical regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "14.00", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "6",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LINEST(A1:A9, B1:B9, 1, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.997074937);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(3.863877797);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.1621557716);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.8554047831);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9558856309);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(1.121834626);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(151.6784566);
    expect(getEvaluatedCell(model, "B13").value).toBe(7);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(190.8892984);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(8.809590491);
  });

  test("multiple-variables : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",   C1: "9",
       A2: "8.50",  B2: "2.5", C2: "12",
       A3: "10.00", B3: "3.1", C3: "13",
       A4: "11.20", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "16.00", B6: "5.3", C6: "16",
       A7: "16.80", B7: "6",   C7: "17",
       A8: "18.55", B8: "7.1", C8: "19",
       A9: "20.00", B9: "9",   C9: "19.6",
      A10: "=LINEST(A1:A9, B1:C9, 0, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(0.476184886);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(1.321970426);
    expect(getEvaluatedCell(model, "C10").value).toBe(0);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("multiple-variables : no-intercept regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",   C1: "9",
       A2: "8.50",  B2: "2.5", C2: "12",
       A3: "10.00", B3: "3.1", C3: "13",
       A4: "11.20", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "16.00", B6: "5.3", C6: "16",
       A7: "16.80", B7: "6",   C7: "17",
       A8: "18.55", B8: "7.1", C8: "19",
       A9: "20.00", B9: "9",   C9: "19.6",
      A10: "=LINEST(A1:A9, B1:C9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(0.476184886);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(1.321970426);
    expect(getEvaluatedCell(model, "C10").value).toBe(0);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.083307592);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.240679888);
    expect(getEvaluatedCell(model, "C11").value).toBe("");
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.996621297);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.932366663);
    expect(getEvaluatedCell(model, "C12").value).toBe("");
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(1032.400591);
    expect(getEvaluatedCell(model, "B13").value).toBe(7);
    expect(getEvaluatedCell(model, "C13").value).toBe("");
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(1794.947347);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(6.085153157);
    expect(getEvaluatedCell(model, "C14").value).toBe("");
  });

  test("multiple-variables : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",   C1: "9",
       A2: "8.50",  B2: "2.5", C2: "12",
       A3: "10.00", B3: "3.1", C3: "13",
       A4: "11.20", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "16.00", B6: "5.3", C6: "16",
       A7: "16.80", B7: "6",   C7: "17",
       A8: "18.55", B8: "7.1", C8: "19",
       A9: "20.00", B9: "9",   C9: "19.6",
      A10: "=LINEST(A1:A9, B1:C9, 1, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.151703005);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(0.4252874858);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(-5.839238736);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("multiple-variables : classical regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",   C1: "9",
       A2: "8.50",  B2: "2.5", C2: "12",
       A3: "10.00", B3: "3.1", C3: "13",
       A4: "11.20", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "16.00", B6: "5.3", C6: "16",
       A7: "16.80", B7: "6",   C7: "17",
       A8: "18.55", B8: "7.1", C8: "19",
       A9: "20.00", B9: "9",   C9: "19.6",
      A10: "=LINEST(A1:A9, B1:C9, 1, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.151703005);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(0.4252874858);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(-5.839238736);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.4913762308);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.6824417895);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(4.193330885);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9769708817);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.8754893237);
    expect(getEvaluatedCell(model, "C12").value).toBe("");
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(127.2698593);
    expect(getEvaluatedCell(model, "B13").value).toBe(6);
    expect(getEvaluatedCell(model, "C13").value).toBe("");
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(195.0999996);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(4.598889335);
    expect(getEvaluatedCell(model, "C14").value).toBe("");
  });

  test("Non-numerica values cause an error", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "=TRUE()", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "=FALSE",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LINEST(A1:A9, B1:B9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBe("#ERROR");
  });
});

describe("LOGEST formula", () => {
  test("1-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1: "7", B1: "1.1",
       A2: "8.9", B2: "2",
       A3: "10.56", B3: "3.2",
       A4: "12.33", B4: "4",
       A5: "14", B5: "4.9",
       A6: "15.9", B6: "5.1",
       A7: "18.4", B7: "6",
       A8: "23.7", B8: "7.2",
       A9: "38.66", B9: "8.8",
      A10: "=LOGEST(A1:A9, B1:B9, 0, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.650030078);
    expect(getEvaluatedCell(model, "B10").value).toBe(1);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("1-variable : no-intercept regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "7", B1: "1.1",
       A2: "8.9", B2: "2",
       A3: "10.56", B3: "3.2",
       A4: "12.33", B4: "4",
       A5: "14", B5: "4.9",
       A6: "15.9", B6: "5.1",
       A7: "18.4", B7: "6",
       A8: "23.7", B8: "7.2",
       A9: "38.66", B9: "8.8",
      A10: "=LOGEST(A1:A9, B1:B9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.650030078);
    expect(getEvaluatedCell(model, "B10").value).toBe(1);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.05045293016);
    expect(getEvaluatedCell(model, "B11").value).toBe(0);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9248999647);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.7925286566);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(98.52458373);
    expect(getEvaluatedCell(model, "B13").value).toBe(8);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(61.88345572);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(5.024813372);
  });

  test("1-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1: "7", B1: "1.1",
       A2: "8.9", B2: "2",
       A3: "10.56", B3: "3.2",
       A4: "12.33", B4: "4",
       A5: "14", B5: "4.9",
       A6: "15.9", B6: "5.1",
       A7: "18.4", B7: "6",
       A8: "23.7", B8: "7.2",
       A9: "38.66", B9: "8.8",
      A10: "=LOGEST(A1:A9, B1:B9, 1, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.234958605);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(5.420801689);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("1-variable : classical regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "7", B1: "1.1",
       A2: "8.9", B2: "2",
       A3: "10.56", B3: "3.2",
       A4: "12.33", B4: "4",
       A5: "14", B5: "4.9",
       A6: "15.9", B6: "5.1",
       A7: "18.4", B7: "6",
       A8: "23.7", B8: "7.2",
       A9: "38.66", B9: "8.8",
      A10: "=LOGEST(A1:A9, B1:B9, 1, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.234958605);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(5.420801689);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.009340554356);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.04890800839);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9864727545);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.06467280043);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(510.4741588);
    expect(getEvaluatedCell(model, "B13").value).toBe(7);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(2.135094472);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(0.02927799781);
  });

  test("multiple-variables : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1: "7.00",  B1: "1",   C1: "9",
       A2: "8.90",  B2: "2.5", C2: "12",
       A3: "10.56", B3: "3.1", C3: "13",
       A4: "12.33", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "15.90", B6: "5.3", C6: "16",
       A7: "18.40", B7: "6",   C7: "17",
       A8: "23.70", B8: "7.1", C8: "19",
       A9: "38.66", B9: "9",   C9: "19.6",
      A10: "=LOGEST(A1:A9, B1:C9, 0, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.212565933);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(0.9587796002);
    expect(getEvaluatedCell(model, "C10").value).toBe(1);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("multiple-variables : no-intercept regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "7.00",  B1: "1",   C1: "9",
       A2: "8.90",  B2: "2.5", C2: "12",
       A3: "10.56", B3: "3.1", C3: "13",
       A4: "12.33", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "15.90", B6: "5.3", C6: "16",
       A7: "18.40", B7: "6",   C7: "17",
       A8: "23.70", B8: "7.1", C8: "19",
       A9: "38.66", B9: "9",   C9: "19.6",
      A10: "=LOGEST(A1:A9, B1:C9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(1.212565933);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(0.9587796002);
    expect(getEvaluatedCell(model, "C10").value).toBe(1);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.01483874916);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.04286990415);
    expect(getEvaluatedCell(model, "C11").value).toBe("");
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9971145262);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.1660731594);
    expect(getEvaluatedCell(model, "C12").value).toBe("");
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(1209.472357);
    expect(getEvaluatedCell(model, "B13").value).toBe(7);
    expect(getEvaluatedCell(model, "C13").value).toBe("");
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(66.71520704);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(0.1930620599);
    expect(getEvaluatedCell(model, "C14").value).toBe("");
  });

  test("multiple-variables : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1: "7.00",  B1: "1",   C1: "9",
       A2: "8.90",  B2: "2.5", C2: "12",
       A3: "10.56", B3: "3.1", C3: "13",
       A4: "12.33", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "15.90", B6: "5.3", C6: "16",
       A7: "18.40", B7: "6",   C7: "17",
       A8: "23.70", B8: "7.1", C8: "19",
       A9: "38.66", B9: "9",   C9: "19.6",
      A10: "=LOGEST(A1:A9, B1:C9, 1, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(0.9543419384);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(1.317559421);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(7.924957718);
    expect(getEvaluatedCell(model, "A11").value).toBe(null);
  });

  test("multiple-variables : classical regression (verbose)", () => {
    //prettier-ignore
    const grid = {
       A1: "7.00",  B1: "1",   C1: "9",
       A2: "8.90",  B2: "2.5", C2: "12",
       A3: "10.56", B3: "3.1", C3: "13",
       A4: "12.33", B4: "4",   C4: "14",
       A5: "14.00", B5: "4.7", C5: "14.5",
       A6: "15.90", B6: "5.3", C6: "16",
       A7: "18.40", B7: "6",   C7: "17",
       A8: "23.70", B8: "7.1", C8: "19",
       A9: "38.66", B9: "9",   C9: "19.6",
      A10: "=LOGEST(A1:A9, B1:C9, 1, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(0.9543419384);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(1.317559421);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(7.924957718);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(0.01816040272);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(0.02522185029);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(0.1549781468);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(0.9970976912);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(0.0323565482);
    expect(getEvaluatedCell(model, "C12").value).toBe("");
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(1030.659822);
    expect(getEvaluatedCell(model, "B13").value).toBe(6);
    expect(getEvaluatedCell(model, "C13").value).toBe("");
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(2.158090792);
    expect(getEvaluatedCell(model, "B14").value).toBeCloseTo(0.006281677268);
    expect(getEvaluatedCell(model, "C14").value).toBe("");
  });

  test("Non-numerica values cause an error", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "=TRUE()", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "=FALSE",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=LOGEST(A1:A9, B1:B9, 0, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBe("#ERROR");
  });
});

describe("TREND formula", () => {
  test("1-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "$15.53",
       A2:  "2",  B2: "$19.99",
       A3:  "3",  B3: "$20.43",
       A4:  "4",  B4: "$21.18",
       A5:  "5",  B5: "$25.93",
       A6:  "6",  B6: "$30.00",
       A7:  "7",  B7: "$30.00",
       A8:  "8",  B8: "$34.01",
       A9:  "9",  B9: "$36.47",
      A10: "10", B10: "=TREND(B1:B9, A1:A9, A10:A12, 0)",
      A11: "11",
      A12: "12",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(46.3677193);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(51.00449123);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(55.64126316);
  });

  test("1-variable : no-intercept regression (new_X as row)", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "$15.53",
       A2:  "2",  B2: "$19.99",
       A3:  "3",  B3: "$20.43",
       A4:  "4",  B4: "$21.18",
       A5:  "5",  B5: "$25.93",
       A6:  "6",  B6: "$30.00",
       A7:  "7",  B7: "$30.00",
       A8:  "8",  B8: "$34.01",
       A9:  "9",  B9: "$36.47",
      A10: "10", B10: "11", C10: "12",
      A11: "=TREND(B1:B9, A1:A9, A10:C10, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(46.3677193);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(51.00449123);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(55.64126316);
  });

  test("1-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "$15.53",
       A2:  "2",  B2: "$19.99",
       A3:  "3",  B3: "$20.43",
       A4:  "4",  B4: "$21.18",
       A5:  "5",  B5: "$25.93",
       A6:  "6",  B6: "$30.00",
       A7:  "7",  B7: "$30.00",
       A8:  "8",  B8: "$34.01",
       A9:  "9",  B9: "$36.47",
      A10: "10", B10: "=TREND(B1:B9, A1:A9, A10:A12, 1)",
      A11: "11",
      A12: "12",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(38.76388889);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(41.32688889);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(43.88988889);
  });

  test("1-variable : classical regression (new_X as row)", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "$15.53",
       A2:  "2",  B2: "$19.99",
       A3:  "3",  B3: "$20.43",
       A4:  "4",  B4: "$21.18",
       A5:  "5",  B5: "$25.93",
       A6:  "6",  B6: "$30.00",
       A7:  "7",  B7: "$30.00",
       A8:  "8",  B8: "$34.01",
       A9:  "9",  B9: "$36.47",
      A10: "10", B10: "11", C10: "12",
      A11: "=TREND(B1:B9, A1:A9, A10:C10, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(38.76388889);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(41.32688889);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(43.88988889);
  });

  test("multiple-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "1",  C1: "15.53",
       A2:  "2",  B2: "1",  C2: "19.99",
       A3:  "3",  B3: "2",  C3: "20.43",
       A4:  "4",  B4: "2",  C4: "21.18",
       A5:  "5",  B5: "3",  C5: "25.93",
       A6:  "6",  B6: "3",  C6: "30.00",
       A7:  "7",  B7: "4",  C7: "30.00",
       A8:  "8",  B8: "4",  C8: "34.01",
       A9:  "9",  B9: "5",  C9: "36.47",
      A10: "10", B10: "5", C10: "=TREND(C1:C9, A1:B9, A10:B12, 1)",
      A11: "11", B11: "6",
      A12: "12", B12: "6",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(39.11);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(41.05);
    expect(getEvaluatedCell(model, "C12").value).toBeCloseTo(44.236);
  });

  test("multiple-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "1",  C1: "15.53",
       A2:  "2",  B2: "1",  C2: "19.99",
       A3:  "3",  B3: "2",  C3: "20.43",
       A4:  "4",  B4: "2",  C4: "21.18",
       A5:  "5",  B5: "3",  C5: "25.93",
       A6:  "6",  B6: "3",  C6: "30.00",
       A7:  "7",  B7: "4",  C7: "30.00",
       A8:  "8",  B8: "4",  C8: "34.01",
       A9:  "9",  B9: "5",  C9: "36.47",
      A10: "10", B10: "5", C10: "=TREND(C1:C9, A1:B9, A10:B12, 0)",
      A11: "11", B11: "6",
      A12: "12", B12: "6",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(42.48);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(51.16);
    expect(getEvaluatedCell(model, "C12").value).toBeCloseTo(50.976);
  });

  test("1-variable : no newX-data", () => {
    //prettier-ignore
    const grid = {
       A1: "1", B1: "$15.53",
       A2: "2", B2: "$19.99",
       A3: "3", B3: "$20.43",
       A4: "4", B4: "$21.18",
       A5: "5", B5: "$25.93",
       A6: "6", B6: "$30.00",
       A7: "7", B7: "$30.00",
       A8: "8", B8: "$34.01",
       A9: "9", B9: "$36.47",
      A10: "=TREND(B1:B9, A1:A9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(15.69688889);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.25988889);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.82288889);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(23.38588889);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(25.94888889);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(28.51188889);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(31.07488889);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(33.63788889);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(36.20088889);
  });

  test("1-variable : no X-data", () => {
    //prettier-ignore
    const grid = {
       A1: "$15.53",
       A2: "$19.99",
       A3: "$20.43",
       A4: "$21.18",
       A5: "$25.93",
       A6: "$30.00",
       A7: "$30.00",
       A8: "$34.01",
       A9: "$36.47",
      A10: "=TREND(A1:A9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(15.69688889);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.25988889);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.82288889);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(23.38588889);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(25.94888889);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(28.51188889);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(31.07488889);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(33.63788889);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(36.20088889);
  });

  test("multiple-variable : no newX data", () => {
    //prettier-ignore
    const grid = {
       A1: "1", B1: "1", C1: "15.53",
       A2: "2", B2: "1", C2: "19.99",
       A3: "3", B3: "2", C3: "20.43",
       A4: "4", B4: "2", C4: "21.18",
       A5: "5", B5: "3", C5: "25.93",
       A6: "6", B6: "3", C6: "30.00",
       A7: "7", B7: "4", C7: "30.00",
       A8: "8", B8: "4", C8: "34.01",
       A9: "9", B9: "5", C9: "36.47",
      A10: "=TREND(C1:C9, A1:B9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(15.42);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.606);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.546);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(23.732);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(25.672);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(28.858);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(30.798);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(33.984);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(35.924);
  });

  test("Non-numerica values cause an error", () => {
    //prettier-ignore
    const grid = {
       A1: "5.00",  B1: "1",
       A2: "8.50",  B2: "2.5",
       A3: "10.00", B3: "3.1",
       A4: "11.20", B4: "4",
       A5: "=TRUE()", B5: "4.7",
       A6: "16.00", B6: "5.3",
       A7: "16.80", B7: "=FALSE",
       A8: "18.55", B8: "7.1",
       A9: "20.00", B9: "9",
      A10: "=GROWTH(A1:A9, B1:B9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBe("#ERROR");
  });
});

describe("GROWTH formula", () => {
  test("1-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1: "1",   B1: "$15.53",
       A2: "2",   B2: "$19.99",
       A3: "3",   B3: "$20.43",
       A4: "4",   B4: "$21.18",
       A5: "5",   B5: "$25.93",
       A6: "6",   B6: "$30.00",
       A7: "7",   B7: "$30.00",
       A8: "8",   B8: "$34.01",
       A9: "9",   B9: "$36.47",
      A10: "10", B10: "=GROWTH(B1:B9, A1:A9, A10:A12, 0)",
      A11: "11",
      A12: "12",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(200.4823447);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(340.630668);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(578.7504737);
  });

  test("1-variable : no-intercept regression (new_X as row)", () => {
    //prettier-ignore
    const grid = {
       A1: "1",   B1: "$15.53",
       A2: "2",   B2: "$19.99",
       A3: "3",   B3: "$20.43",
       A4: "4",   B4: "$21.18",
       A5: "5",   B5: "$25.93",
       A6: "6",   B6: "$30.00",
       A7: "7",   B7: "$30.00",
       A8: "8",   B8: "$34.01",
       A9: "9",   B9: "$36.47",
      A10: "10", B10: "11", C10: "12",
      A11: "=GROWTH(B1:B9, A1:A9, A10:C10, 0)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(200.4823447);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(340.630668);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(578.7504737);
  });

  test("1-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
      A1: "1",   B1: "$15.53",
      A2: "2",   B2: "$19.99",
      A3: "3",   B3: "$20.43",
      A4: "4",   B4: "$21.18",
      A5: "5",   B5: "$25.93",
      A6: "6",   B6: "$30.00",
      A7: "7",   B7: "$30.00",
      A8: "8",   B8: "$34.01",
      A9: "9",   B9: "$36.47",
      A10: "10", B10: "=GROWTH(B1:B9, A1:A9, A10:A12, 1)",
      A11: "11",
      A12: "12",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "B10").value).toBeCloseTo(41.74052172);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(46.22712349);
    expect(getEvaluatedCell(model, "B12").value).toBeCloseTo(51.19598075);
  });

  test("1-variable : classical regression (new_X as row)", () => {
    //prettier-ignore
    const grid = {
      A1: "1",   B1: "$15.53",
      A2: "2",   B2: "$19.99",
      A3: "3",   B3: "$20.43",
      A4: "4",   B4: "$21.18",
      A5: "5",   B5: "$25.93",
      A6: "6",   B6: "$30.00",
      A7: "7",   B7: "$30.00",
      A8: "8",   B8: "$34.01",
      A9: "9",   B9: "$36.47",
      A10: "10", B10: "11", C10: "12",
      A11: "=GROWTH(B1:B9, A1:A9, A10:C10, 1)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(41.74052172);
    expect(getEvaluatedCell(model, "B11").value).toBeCloseTo(46.22712349);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(51.19598075);
  });

  test("multiple-variable : classical regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "1",  C1: "15.53",
       A2:  "2",  B2: "1",  C2: "19.99",
       A3:  "3",  B3: "2",  C3: "20.43",
       A4:  "4",  B4: "2",  C4: "21.18",
       A5:  "5",  B5: "3",  C5: "25.93",
       A6:  "6",  B6: "3",  C6: "30.00",
       A7:  "7",  B7: "4",  C7: "30.00",
       A8:  "8",  B8: "4",  C8: "34.01",
       A9:  "9",  B9: "5",  C9: "36.47",
      A10: "10", B10: "5", C10: "=GROWTH(C1:C9, A1:B9, A10:B12, 1)",
      A11: "11", B11: "6",
      A12: "12", B12: "6",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(42.71315425);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(45.38306815);
    expect(getEvaluatedCell(model, "C12").value).toBeCloseTo(52.38894322);
  });

  test("multiple-variable : no-intercept regression", () => {
    //prettier-ignore
    const grid = {
       A1:  "1",  B1: "1",  C1: "15.53",
       A2:  "2",  B2: "1",  C2: "19.99",
       A3:  "3",  B3: "2",  C3: "20.43",
       A4:  "4",  B4: "2",  C4: "21.18",
       A5:  "5",  B5: "3",  C5: "25.93",
       A6:  "6",  B6: "3",  C6: "30.00",
       A7:  "7",  B7: "4",  C7: "30.00",
       A8:  "8",  B8: "4",  C8: "34.01",
       A9:  "9",  B9: "5",  C9: "36.47",
      A10: "10", B10: "5", C10: "=GROWTH(C1:C9, A1:B9, A10:B12, 0)",
      A11: "11", B11: "6",
      A12: "12", B12: "6",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "C10").value).toBeCloseTo(84.59692215);
    expect(getEvaluatedCell(model, "C11").value).toBeCloseTo(352.5921256);
    expect(getEvaluatedCell(model, "C12").value).toBeCloseTo(205.5064585);
  });

  test("1-variable : no newX-data", () => {
    //prettier-ignore
    const grid = {
       A1: "1", B1: "$15.53",
       A2: "2", B2: "$19.99",
       A3: "3", B3: "$20.43",
       A4: "4", B4: "$21.18",
       A5: "5", B5: "$25.93",
       A6: "6", B6: "$30.00",
       A7: "7", B7: "$30.00",
       A8: "8", B8: "$34.01",
       A9: "9", B9: "$36.47",
      A10: "=GROWTH(B1:B9, A1:A9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(16.65355287);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.4436086);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.42607368);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(22.62162981);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(25.0531817);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(27.74609604);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(30.72846613);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(34.03140497);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(37.68936983);
  });

  test("1-variable : no X-data", () => {
    //prettier-ignore
    const grid = {
       A1: "$15.53",
       A2: "$19.99",
       A3: "$20.43",
       A4: "$21.18",
       A5: "$25.93",
       A6: "$30.00",
       A7: "$30.00",
       A8: "$34.01",
       A9: "$36.47",
      A10: "=GROWTH(A1:A9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(16.65355287);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.4436086);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.42607368);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(22.62162981);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(25.0531817);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(27.74609604);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(30.72846613);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(34.03140497);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(37.68936983);
  });

  test("multiple-variable : no newX data", () => {
    //prettier-ignore
    const grid = {
       A1: "1", B1: "1", C1: "15.53",
       A2: "2", B2: "1", C2: "19.99",
       A3: "3", B3: "2", C3: "20.43",
       A4: "4", B4: "2", C4: "21.18",
       A5: "5", B5: "3", C5: "25.93",
       A6: "6", B6: "3", C6: "30.00",
       A7: "7", B7: "4", C7: "30.00",
       A8: "8", B8: "4", C8: "34.01",
       A9: "9", B9: "5", C9: "36.47",
      A10: "=?GROWTH(C1:C9, A1:B9)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A10").value).toBeCloseTo(16.34947771);
    expect(getEvaluatedCell(model, "A11").value).toBeCloseTo(18.87337931);
    expect(getEvaluatedCell(model, "A12").value).toBeCloseTo(20.05311653);
    expect(getEvaluatedCell(model, "A13").value).toBeCloseTo(23.14875626);
    expect(getEvaluatedCell(model, "A14").value).toBeCloseTo(24.59573875);
    expect(getEvaluatedCell(model, "A15").value).toBeCloseTo(28.39263217);
    expect(getEvaluatedCell(model, "A16").value).toBeCloseTo(30.16739886);
    expect(getEvaluatedCell(model, "A17").value).toBeCloseTo(34.8244006);
    expect(getEvaluatedCell(model, "A18").value).toBeCloseTo(37.00120429);
  });
});
