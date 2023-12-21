import { Model } from "../../src/model";
import { setCellContent } from "../test_helpers/commands_helpers";
import { evaluateCell, evaluateCellFormat, evaluateGrid } from "../test_helpers/helpers";

describe("COLUMN formula", () => {
  test("functional tests without argument", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=COLUMN()" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=COLUMN(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional test without grid context", () => {
    const model = new Model();
    setCellContent(model, "A1", "kikoulol");
    expect(model.getters.evaluateFormula("=COLUMN()")).toBe("#ERROR");
    expect(model.getters.evaluateFormula("=COLUMN(A1)")).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(G2)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=COLUMN(ABC2)" })).toBe(731);
    expect(evaluateCell("A1", { A1: "=COLUMN($ABC$2)" })).toBe(731);
    expect(evaluateCell("A1", { A1: "=COLUMN(Sheet1!$ABC$2)" })).toBe(731);
  });

  test("functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(B3:C40)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COLUMN(D3:Z9)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COLUMN($D$3:$Z$9)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COLUMN(Sheet1!$D$3:$Z$9)" })).toBe(4);
  });

  test("functional tests on range arguments with invalid sheet name", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(Sheet42!ABC2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #REF!
  });
});

describe("COLUMNS formula", () => {
  test("functional tests without arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=COLUMNS(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(H2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS(ABC2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS($ABC$2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS(Sheet1!$ABC$2)" })).toBe(1);
  });

  test("functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(B3:C40)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COLUMNS(D3:Z9)" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=COLUMNS($D$3:$Z$9)" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=COLUMNS(Sheet1!$D$3:$Z$9)" })).toBe(23);
  });

  test("functional tests on range arguments with invalid sheet name", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(Sheet42!ABC2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #REF!
  });
});

describe("LOOKUP formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "res 01", C1: "res 11", D1: "res 21", E1: "res 31",
      A2: "2", B2: "res 02", C2: "res 12", D2: "res 22", E2: "res 32",
      A3: "6", B3: "res 06", C3: "res 16", D3: "res 26", E3: "res 36",
      A4: "9", B4: "res 09", C4: "res 19", D4: "res 29", E4: "res 39",

      A5: "=LOOKUP(6, A1:A4)",
      A6: "=LOOKUP(6, A1:B4)",
      A7: "=LOOKUP(6, A1:C4)",
      A8: "=LOOKUP(6, A1:D4)",
      A9: "=LOOKUP(6, A1:E4)",

      A10: "=LOOKUP(6, A1:D4, E1:E4)", B10: "=LOOKUP(6, A1:C4, D1:E4)",
      A11: "=LOOKUP(6, A1:A2, B3:B4)", B11: "=LOOKUP(6, A1:A2, B2:B4)",
      A12: "=LOOKUP(1, A1:A2, B1:C1)", B12: "=LOOKUP(2, A1:A2, B1:C1)",

      A13: "=LOOKUP(6, A1:A3, B2:B3)",
      A14: "=LOOKUP(6, A1:A3, B3:C3)",

      A15: "=LOOKUP(0, A1:B4)",
      A16: "=LOOKUP(10, A1:B4)"
    };

    const evaluatedGrid = evaluateGrid(grid);
    expect(evaluatedGrid.A5).toBe(6);
    expect(evaluatedGrid.A6).toBe("res 06");
    expect(evaluatedGrid.A7).toBe("res 16");
    expect(evaluatedGrid.A8).toBe("res 26");
    expect(evaluatedGrid.A9).toBe(9);

    expect(evaluatedGrid.A10).toBe("res 36");
    expect(evaluatedGrid.B10).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(evaluatedGrid.A11).toBe("res 09");
    expect(evaluatedGrid.B11).toBe("res 06");
    expect(evaluatedGrid.A12).toBe("res 01");
    expect(evaluatedGrid.B12).toBe("res 11");

    expect(evaluatedGrid.A13).toBe("#ERROR"); // @compatibility: on googlesheets, return #NUM!
    expect(evaluatedGrid.A14).toBe("#ERROR"); // @compatibility: on googlesheets, return #NUM!

    expect(evaluatedGrid.A15).toBe("#N/A");
    expect(evaluatedGrid.A16).toBe("res 09");
  });

  test("Accents and uppercase are ignored", () => {
    expect(evaluateCell("A1", { A1: '=LOOKUP("epee", B1)', B1: "Épée" })).toBe("Épée");
  });

  test("Horizontal search in LOOKUP function with and without result range", () => {
    const grid = {
      A1: "1",
      B1: "2",
      C1: "3",
      A2: "4",
      B2: "5",
      C2: "6",
      D1: "=LOOKUP(C1, A1:C1)",
      D2: "=LOOKUP(3, A1:C1)",
      D3: "=LOOKUP(C1, A1:C1, A2:C2)",
    };

    const evaluatedGrid = evaluateGrid(grid);
    expect(evaluatedGrid.D1).toBe(3);
    expect(evaluatedGrid.D2).toBe(3);
    expect(evaluatedGrid.D3).toBe(6);
  });

  test("Horizontal search in LOOKUP function without result range in multiple rows", () => {
    const grid = {
      A1: "1",
      B1: "2",
      C1: "3",
      A2: "A",
      B2: "B",
      C2: "C",
      D1: "=LOOKUP(3, A1:C2)",
    };

    const evaluatedGrid = evaluateGrid(grid);
    expect(evaluatedGrid.D1).toBe("C");
  });
});

describe("MATCH formula", () => {
  // prettier-ignore
  const rangeAscending = {
    A1: "1", A2: "2", A3: "2", A4: "3", A5: "5", A6: "6"
  };

  // prettier-ignore
  const rangeUnsorted = {
    A1: "1", A2: "5", A3: "3", A4: "3", A5: "2", A6: "7"
  };

  // prettier-ignore
  const rangeDescending = {
    A1: "6", A2: "5", A3: "3", A4: "2", A5: "2", A6: "1"
  };

  // prettier-ignore
  const evAsAscending = {
    B1: "=MATCH( 0, A1:A6, 1)", B2: "=MATCH( 1, A1:A6, 1)",
    B3: "=MATCH( 2, A1:A6, 1)", B4: "=MATCH( 3, A1:A6, 1)",
    B5: "=MATCH( 4, A1:A6, 1)", B6: "=MATCH( 5, A1:A6, 1)",
    B7: "=MATCH( 6, A1:A6, 1)", B8: "=MATCH( 7, A1:A6, 1)"
  };

  // prettier-ignore
  const evAsUnsorted = {
    C1: "=MATCH( 0, A1:A6, 0)", C2: "=MATCH( 1, A1:A6, 0)",
    C3: "=MATCH( 2, A1:A6, 0)", C4: "=MATCH( 3, A1:A6, 0)",
    C5: "=MATCH( 4, A1:A6, 0)", C6: "=MATCH( 5, A1:A6, 0)",
    C7: "=MATCH( 6, A1:A6, 0)", C8: "=MATCH( 7, A1:A6, 0)"
  };

  // prettier-ignore
  const evAsDescending = {
    D1: "=MATCH( 0, A1:A6, -1)", D2: "=MATCH( 1, A1:A6, -1)",
    D3: "=MATCH( 2, A1:A6, -1)", D4: "=MATCH( 3, A1:A6, -1)",
    D5: "=MATCH( 4, A1:A6, -1)", D6: "=MATCH( 5, A1:A6, -1)",
    D7: "=MATCH( 6, A1:A6, -1)", D8: "=MATCH( 7, A1:A6, -1)"
  };

  test("range evaluate sorted ascending", () => {
    const ascendingAsAscending = { ...rangeAscending, ...evAsAscending };
    const aAsA = evaluateGrid(ascendingAsAscending);

    expect(aAsA.B1).toBe("#N/A");
    expect(aAsA.B2).toBe(1);
    expect(aAsA.B3).toBe(3);
    expect(aAsA.B4).toBe(4);
    expect(aAsA.B5).toBe(4);
    expect(aAsA.B6).toBe(5);
    expect(aAsA.B7).toBe(6);
    expect(aAsA.B8).toBe(6);

    const ascendingAsUnsorted = { ...rangeAscending, ...evAsUnsorted };
    const aAsU = evaluateGrid(ascendingAsUnsorted);

    expect(aAsU.C1).toBe("#N/A");
    expect(aAsU.C2).toBe(1);
    expect(aAsU.C3).toBe(2);
    expect(aAsU.C4).toBe(4);
    expect(aAsU.C5).toBe("#N/A");
    expect(aAsU.C6).toBe(5);
    expect(aAsU.C7).toBe(6);
    expect(aAsU.C8).toBe("#N/A");

    const ascendingAsDescending = { ...rangeAscending, ...evAsDescending };
    const aAsD = evaluateGrid(ascendingAsDescending);

    expect(aAsD.D1).toBe(3); // @compatibility: on googlesheets, return 6
    expect(aAsD.D2).toBe(3); // @compatibility: on googlesheets, return 6
    expect(aAsD.D3).toBe(3); // @compatibility: on googlesheets, return 6
    expect(aAsD.D4).toBe("#N/A"); // @compatibility: on googlesheets, return 6
    expect(aAsD.D5).toBe("#N/A");
    expect(aAsD.D6).toBe("#N/A");
    expect(aAsD.D7).toBe("#N/A");
    expect(aAsD.D8).toBe("#N/A");
  });

  test("range evaluate unsorted", () => {
    const unsortedAsAscending = { ...rangeUnsorted, ...evAsAscending };
    const uAsA = evaluateGrid(unsortedAsAscending);

    expect(uAsA.B1).toBe("#N/A");
    expect(uAsA.B2).toBe(1);
    expect(uAsA.B3).toBe(1);
    expect(uAsA.B4).toBe(3); // @compatibility: on googlesheets, return 5
    expect(uAsA.B5).toBe(3); // @compatibility: on googlesheets, return 5
    expect(uAsA.B6).toBe(3); // @compatibility: on googlesheets, return 5
    expect(uAsA.B7).toBe(3); // @compatibility: on googlesheets, return 5
    expect(uAsA.B8).toBe(6);

    const unsortedAsUnsorted = { ...rangeUnsorted, ...evAsUnsorted };
    const uAsU = evaluateGrid(unsortedAsUnsorted);

    expect(uAsU.C1).toBe("#N/A");
    expect(uAsU.C2).toBe(1);
    expect(uAsU.C3).toBe(5);
    expect(uAsU.C4).toBe(3);
    expect(uAsU.C5).toBe("#N/A");
    expect(uAsU.C6).toBe(2);
    expect(uAsU.C7).toBe("#N/A");
    expect(uAsU.C8).toBe(6);

    const unsortedAsDescending = { ...rangeUnsorted, ...evAsDescending };
    const uAsD = evaluateGrid(unsortedAsDescending);

    expect(uAsD.D1).toBe(5); // @compatibility: on googlesheets, return 6
    expect(uAsD.D2).toBe(5); // @compatibility: on googlesheets, return 6
    expect(uAsD.D3).toBe(5); // @compatibility: on googlesheets, return 6
    expect(uAsD.D4).toBe(3);
    expect(uAsD.D5).toBe("#N/A"); // @compatibility: on googlesheets, return 2
    expect(uAsD.D6).toBe("#N/A"); // @compatibility: on googlesheets, return 2
    expect(uAsD.D7).toBe("#N/A");
    expect(uAsD.D8).toBe("#N/A");
  });

  test("range evaluate sorted descending", () => {
    const descendingAsAscending = { ...rangeDescending, ...evAsAscending };
    const dAsA = evaluateGrid(descendingAsAscending);

    expect(dAsA.B1).toBe("#N/A");
    expect(dAsA.B2).toBe("#N/A");
    expect(dAsA.B3).toBe("#N/A"); // @compatibility: on googlesheets, return 6
    expect(dAsA.B4).toBe(3); // @compatibility: on googlesheets, return 6
    expect(dAsA.B5).toBe(3); // @compatibility: on googlesheets, return 6
    expect(dAsA.B6).toBe(3); // @compatibility: on googlesheets, return 6
    expect(dAsA.B7).toBe(3); // @compatibility: on googlesheets, return 6
    expect(dAsA.B8).toBe(3); // @compatibility: on googlesheets, return 6

    const descendingAsUnsorted = { ...rangeDescending, ...evAsUnsorted };
    const dAsU = evaluateGrid(descendingAsUnsorted);

    expect(dAsU.C1).toBe("#N/A");
    expect(dAsU.C2).toBe(6);
    expect(dAsU.C3).toBe(4);
    expect(dAsU.C4).toBe(3);
    expect(dAsU.C5).toBe("#N/A");
    expect(dAsU.C6).toBe(2);
    expect(dAsU.C7).toBe(1);
    expect(dAsU.C8).toBe("#N/A");

    const descendingAsDescending = { ...rangeDescending, ...evAsDescending };
    const dAsD = evaluateGrid(descendingAsDescending);

    expect(dAsD.D1).toBe(6);
    expect(dAsD.D2).toBe(6);
    expect(dAsD.D3).toBe(4);
    expect(dAsD.D4).toBe(3);
    expect(dAsD.D5).toBe(2);
    expect(dAsD.D6).toBe(2);
    expect(dAsD.D7).toBe(1);
    expect(dAsD.D8).toBe("#N/A");
  });

  test("grid of STRING ascending", () => {
    // prettier-ignore
    const ascendingStringEvAsAscending = {
      A1: '="1"', A2: '="10"', A3: '="100"', A4: '="2"', A5: '="2"',
      B1: '=MATCH( "1",   A1:A5, 1)',
      B2: '=MATCH( "2",   A1:A5, 1)',
      B3: '=MATCH( "5",   A1:A5, 1)',
      B4: '=MATCH( "10",  A1:A5, 1)',
      B5: '=MATCH( "100", A1:A5, 1)',
    };
    const ascendingString = evaluateGrid(ascendingStringEvAsAscending);

    expect(ascendingString.B1).toBe(1);
    expect(ascendingString.B2).toBe(5);
    expect(ascendingString.B3).toBe(5);
    expect(ascendingString.B4).toBe(2);
    expect(ascendingString.B5).toBe(3);
  });

  test("grid of STRING unsorted", () => {
    // prettier-ignore
    const unsortedStringEvAsUnsorted = {
      A1: '="1"', A2: '="2"', A3: '="2"', A4: '="10"', A5: '="100"',
      C1: '=MATCH( "1",   A1:A5, 0)',
      C2: '=MATCH( "2",   A1:A5, 0)',
      C3: '=MATCH( "5",   A1:A5, 0)',
      C4: '=MATCH( "10",  A1:A5, 0)',
      C5: '=MATCH( "100", A1:A5, 0)',
    };
    const unsortedString = evaluateGrid(unsortedStringEvAsUnsorted);

    expect(unsortedString.C1).toBe(1);
    expect(unsortedString.C2).toBe(2);
    expect(unsortedString.C3).toBe("#N/A");
    expect(unsortedString.C4).toBe(4);
    expect(unsortedString.C5).toBe(5);
  });

  test("grid of STRING descending", () => {
    // prettier-ignore
    const descendingStringEvAsDescending = {
      A1: '="2"', A2: '="2"', A3: '="100"', A4: '="10"', A5: '="1"',
      D1: '=MATCH( "1",   A1:A5, -1)',
      D2: '=MATCH( "2",   A1:A5, -1)',
      D3: '=MATCH( "5",   A1:A5, -1)',
      D4: '=MATCH( "10",  A1:A5, -1)',
      D5: '=MATCH( "100", A1:A5, -1)',
    }
    const descendingString = evaluateGrid(descendingStringEvAsDescending);

    expect(descendingString.D1).toBe(5);
    expect(descendingString.D2).toBe(1);
    expect(descendingString.D3).toBe("#N/A");
    expect(descendingString.D4).toBe(4);
    expect(descendingString.D5).toBe(3);
  });

  test("Accents and uppercase are ignored", () => {
    expect(evaluateCell("A1", { A1: '=MATCH("epee", B1, 1)', B1: "Épée" })).toBe(1);
  });
});

describe("ROW formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=ROW()" })).toBe(20);
    expect(evaluateCell("A1", { A1: "=ROW(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional test without grid context", () => {
    const model = new Model();
    setCellContent(model, "A1", "kikoulol");
    expect(model.getters.evaluateFormula("=ROW()")).toBe("#ERROR");
    expect(model.getters.evaluateFormula("=ROW(A1)")).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW(H2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ROW(A234)" })).toBe(234);
    expect(evaluateCell("A1", { A1: "=ROW($A$234)" })).toBe(234);
    expect(evaluateCell("A1", { A1: "=ROW(Sheet1!$A$234)" })).toBe(234);
  });

  test("functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW(B3:C40)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW(D3:Z9)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW($D$3:$Z$9)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW(Sheet1!$D$3:$Z$9)" })).toBe(3);
  });

  test("functional tests on range arguments with invalid sheet name", () => {
    expect(evaluateCell("A1", { A1: "=ROW(Sheet42!A234)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #REF!
  });
});

describe("ROWS formula", () => {
  test("functional tests without arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ROWS(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(H2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS(ABC2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS($ABC$2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS(Sheet1!$ABC$2)" })).toBe(1);
  });

  test("functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(B3:C40)" })).toBe(38);
    expect(evaluateCell("A1", { A1: "=ROWS(D3:Z9)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=ROWS($D$3:$Z$9)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=ROWS(Sheet1!$D$3:$Z$9)" })).toBe(7);
  });

  test("functional tests on range arguments with invalid sheet name", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(Sheet42!ABC2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #REF!
  });
});

describe("VLOOKUP formula", () => {
  describe("sorted values with different type", () => {
    test("with undefined values", () => {
      // prettier-ignore
      const rangesGrid = {
        A1: "42",      B1: "42",      C1: undefined, D1: undefined, E1: undefined, Z1: "1",
        A2: undefined, B2: undefined, C2: undefined, D2: undefined, E2: undefined, Z2: "2",
        A3: undefined, B3: "42",      C3: undefined, D3: "42",      E3: undefined, Z3: "3",
        A4: undefined, B4: undefined, C4: undefined, D4: undefined, E4: undefined, Z4: "4",
        A5: undefined, B5: undefined, C5: "42",      D5: "42",      E5: undefined, Z5: "5",
      };
      const grid = evaluateGrid({
        ...rangesGrid,
        A9: "=VLOOKUP(42, A1:Z5, 26, TRUE)",
        B9: "=VLOOKUP(42, B1:Z5, 25, TRUE)",
        C9: "=VLOOKUP(42, C1:Z5, 24, TRUE)",
        D9: "=VLOOKUP(42, D1:Z5, 23, TRUE)",
        E9: "=VLOOKUP(42, E1:Z5, 22, TRUE)",
      });
      expect(grid.A9).toBe(1);
      expect(grid.B9).toBe(3);
      expect(grid.C9).toBe(5);
      expect(grid.D9).toBe(5);
      expect(grid.E9).toBe("#N/A");
    });

    test("lookup string with string and number values", () => {
      // prettier-ignore
      const rangesGrid  = {
        A1: "coucou", B1: "coucou", C1: "42",    D1: "42",     E1: "42", F1: "42",    Z1: "1",
        A2: "42",     B2: "42",     C2: "42",    D2: "42",     E2: "42", F2: "42",    Z2: "2",
        A3: "42",     B3: "coucou", C3: "42",    D3: "coucou", E3: "42", F3: `="42"`, Z3: "3",
        A4: "42",     B4: "42",     C4: "42",    D4: "42",     E4: "42", F4: "42",    Z4: "4",
        A5: "42",     B5: "42",     C5:"coucou", D5: "coucou", E5: "42", F5: "42",    Z5: "5",
      };

      const grid = evaluateGrid({
        ...rangesGrid,
        A9: '=VLOOKUP("coucou", A1:Z5, 26, TRUE)',
        B9: '=VLOOKUP("coucou", B1:Z5, 25, TRUE)',
        C9: '=VLOOKUP("coucou", C1:Z5, 24, TRUE)',
        D9: '=VLOOKUP("coucou", D1:Z5, 23, TRUE)',
        E9: '=VLOOKUP("coucou", E1:Z5, 22, TRUE)',
        F9: '=VLOOKUP("42", F1:Z5, 21, TRUE)',
      });
      expect(grid.A9).toBe(1);
      expect(grid.B9).toBe(3);
      expect(grid.C9).toBe(5);
      expect(grid.D9).toBe(5);
      expect(grid.E9).toBe("#N/A");
      expect(grid.F9).toBe(3);
    });

    test("lookup number with number and string values", () => {
      // prettier-ignore
      const rangesGrid = {
        A1: "666", B1: "666", C1: "abc", D1: "abc", E1: "abc", Z1: "1",
        A2: "abc", B2: "abc", C2: "abc", D2: "abc", E2: "abc", Z2: "2",
        A3: "abc", B3: "666", C3: "abc", D3: "666", E3: "abc", Z3: "3",
        A4: "abc", B4: "abc", C4: "abc", D4: "abc", E4: "abc", Z4: "4",
        A5: "abc", B5: "abc", C5: "666", D5: "666", E5: "abc", Z5: "5",
      };
      const grid = evaluateGrid({
        ...rangesGrid,
        A9: "=VLOOKUP(666, A1:Z5, 26, TRUE)",
        B9: "=VLOOKUP(666, B1:Z5, 25, TRUE)",
        C9: "=VLOOKUP(666, C1:Z5, 24, TRUE)",
        D9: "=VLOOKUP(666, D1:Z5, 23, TRUE)",
        E9: "=VLOOKUP(666, E1:Z5, 22, TRUE)",
      });
      expect(grid.A9).toBe(1);
      expect(grid.B9).toBe(3);
      expect(grid.C9).toBe(5);
      expect(grid.D9).toBe(5);
      expect(grid.E9).toBe("#N/A");
    });
  });

  // prettier-ignore
  const commonGrid = {
    B1: "B1", C1: "C1", D1: "D1", E1: "E1",
    B2: "B2", C2: "C2", D2: "D2", E2: "E2",
    B3: "B3", C3: "C3", D3: "D3", E3: "E3",
    B4: "B4", C4: "C4", D4: "D4", E4: "E4",
    B5: "B5", C5: "C5", D5: "D5", E5: "E5",
    B6: "B6", C6: "C6", D6: "D6", E6: "E6",
  };

  test("if index not between 1 and the number of columns --> return #ERROR", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=VLOOKUP( "B4", B1:E5, 0)',
      Z2: '=VLOOKUP( "B4", B1:E5, 5)',
    });
    expect(grid.Z1).toBe("#ERROR"); // @compatibility: on googlesheets, return #VALUE!
    expect(grid.Z2).toBe("#ERROR"); // @compatibility: on googlesheets, return #VALUE!
  });

  test("if float index --> index rounded down", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=VLOOKUP( "B4", B1:E5, 2.9)',
      Z2: '=VLOOKUP( "B4", B1:E5, 4.3)',
    });
    expect(grid.Z1).toBe("C4");
    expect(grid.Z2).toBe("E4");
  });

  // prettier-ignore
  const numSorted = {
    A1: "1", A2: "2", A3: "=A2", A4: "3", A5: "5", A6: "=A5",
    X1: "4", X2: "6", X3: "-3", X4: "0" // other testing values
  };

  // prettier-ignore
  const numUnsorted = {
    A1: "1", A2: "2", A3: "5", A4: "3", A5: "=A2", A6: "=A3",
    X1: "4", X2: "6" // other testing values
  };

  // prettier-ignore
  const stringSorted = {
    A1: 'ab', A2: 'abc',  A3: "=A2", A4: 'abcd', A5: 'ba', A6: "=A5",
    X1: "abcde", X2: "bac", X3: "a", X4: "aa" // other testing values
  };

  // prettier-ignore
  const stringUnsorted = {
    A1: 'ab', A2: 'abc', A3: 'ba', A4: 'abcd', A5: '=A2', A6: '=A3',
    X1: "abcde", X2: "bac" // other testing values
  };

  describe.each([
    ["numerical values", numSorted, numUnsorted],
    ["string values", stringSorted, stringUnsorted],
  ])("search on %s", (typeValues, colSorted, colUnsorted) => {
    const gridSorted = { ...colSorted, ...commonGrid };
    const gridUnsorted = { ...colUnsorted, ...commonGrid };

    describe("if values are evaluated as sorted", () => {
      test("if find a value --> return the match value (normal behavior)", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( A4, A1:E6, 3, TRUE )",
          Z2: "=VLOOKUP( A1, A1:E6, 4, TRUE )",
        });
        expect(grid.Z1).toBe("C4");
        expect(grid.Z2).toBe("D1");
      });

      test("if find multiple values --> return match to last value", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( A2, A1:E6, 3, TRUE )",
          Z2: "=VLOOKUP( A5, A1:E6, 3, TRUE )",
        });
        expect(grid.Z1).toBe("C3");
        expect(grid.Z2).toBe("C6");
      });

      test("if not find value --> return match to the nearest value (less than the search key)", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( X1, A1:E6, 3, TRUE )",
          Z2: "=VLOOKUP( X2, A1:E6, 3, TRUE )",
          Z3: "=VLOOKUP( X2, A10:A16, 1, TRUE )",
        });
        expect(grid.Z1).toBe("C4");
        expect(grid.Z2).toBe("C6");
        expect(grid.Z3).toBe("#N/A");
      });

      test("if all values in the search column are greater than the search key --> return #ERROR ", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( X3, A1:E6, 3, TRUE )",
          Z2: "=VLOOKUP( X4, A1:E6, 3, TRUE )",
        });
        expect(grid.Z1).toBe("#N/A");
        expect(grid.Z2).toBe("#N/A");
      });
    });

    describe("if values are evaluated as unsorted", () => {
      test("if find a value --> return the match value (normal behavior)", () => {
        const gridS = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( A4, A1:E6, 3, FALSE )",
          Z2: "=VLOOKUP( A1, A1:E6, 4, FALSE )",
        });
        expect(gridS.Z1).toBe("C4");
        expect(gridS.Z2).toBe("D1");

        const gridU = evaluateGrid({
          ...gridUnsorted,
          Z1: "=VLOOKUP( A4, A1:E6, 3, FALSE )",
          Z2: "=VLOOKUP( A1, A1:E6, 4, FALSE )",
        });
        expect(gridU.Z1).toBe("C4");
        expect(gridU.Z2).toBe("D1");
      });

      test("if find multiple values --> return match to first value", () => {
        const gridS = evaluateGrid({
          ...gridSorted,
          Z1: "=VLOOKUP( A2, A1:E6, 3, FALSE )",
          Z2: "=VLOOKUP( A5, A1:E6, 3, FALSE )",
        });
        expect(gridS.Z1).toBe("C2");
        expect(gridS.Z2).toBe("C5");

        const gridU = evaluateGrid({
          ...gridUnsorted,
          Z1: "=VLOOKUP( A2, A1:E6, 3, FALSE )",
          Z2: "=VLOOKUP( A3, A1:E6, 3, FALSE )",
        });
        expect(gridU.Z1).toBe("C2");
        expect(gridU.Z2).toBe("C3");
      });

      test("if not find value --> #ERROR is returned ", () => {
        const formulas = {
          Z1: "=VLOOKUP( X1, A1:E6, 3, FALSE )",
          Z2: "=VLOOKUP( X2, A1:E6, 3, FALSE )",
        };

        const gridS = evaluateGrid({ ...gridSorted, ...formulas });
        expect(gridS.Z1).toBe("#N/A");
        expect(gridS.Z2).toBe("#N/A");

        const gridU = evaluateGrid({ ...gridUnsorted, ...formulas });
        expect(gridU.Z1).toBe("#N/A");
        expect(gridU.Z2).toBe("#N/A");
      });
    });
  });

  test("Accents and uppercase are ignored", () => {
    expect(evaluateCell("A1", { A1: '=VLOOKUP("epee", B1, 1)', B1: "Épée" })).toBe("Épée");
  });
});

describe("HLOOKUP formula", () => {
  // prettier-ignore
  const commonGrid = {
    A2: "A2", B2: "B2", C2: "C2", D2: "D2", E2: "E2", F2: "F2",
    A3: "A3", B3: "B3", C3: "C3", D3: "D3", E3: "E3", F3: "F3",
    A4: "A4", B4: "B4", C4: "C4", D4: "D4", E4: "E4", F4: "F4",
    A5: "A5", B5: "B5", C5: "C5", D5: "D5", E5: "E5", F5: "F5",
  };

  test("if index not between 1 and the number of rows --> return #ERROR", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=HLOOKUP( "B2", A2:F5, 0)',
      Z2: '=HLOOKUP( "B2", A2:F5, 5)',
    });
    expect(grid.Z1).toBe("#ERROR"); // @compatibility: on googlesheets, return #VALUE!
    expect(grid.Z2).toBe("#ERROR"); // @compatibility: on googlesheets, return #VALUE!
  });

  test("if folat index --> index rounded down", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=HLOOKUP( "B2", A2:F5, 2.9)',
      Z2: '=HLOOKUP( "B2", A2:F5, 4.3)',
    });
    expect(grid.Z1).toBe("B3");
    expect(grid.Z2).toBe("B5");
  });

  // prettier-ignore
  const numSorted = {
    A1: "1", B1: "2", C1: "=B1", D1: "3", E1: "5", F1: "=E1",
    X1: "4", X2: "6", X3: "-3", X4: "0" // other testing values
  };

  // prettier-ignore
  const numUnsorted = {
    A1: "1", B1: "2", C1: "5", D1: "3", E1: "=B1", F1: "=C1",
    X1: "4", X2: "6" // other testing values
  };

  // prettier-ignore
  const stringSorted = {
    A1: 'ab', B1: 'abc',  C1: "=B1", D1: 'abcd', E1: 'ba', F1: "=E1",
    X1: "abcde", X2: "bac", X3: "a", X4: "aa" // other testing values
  };

  // prettier-ignore
  const stringUnsorted = {
    A1: 'ab', B1: 'abc', C1: 'ba', D1: 'abcd', E1: '=B1', F1: '=C1',
    X1: "abcde", X2: "bac" // other testing values
  };

  describe.each([
    ["numerical values", numSorted, numUnsorted],
    ["string values", stringSorted, stringUnsorted],
  ])("search on %s", (typeValues, rowSorted, rowUnsorted) => {
    const gridSorted = { ...rowSorted, ...commonGrid };
    const gridUnsorted = { ...rowUnsorted, ...commonGrid };

    describe("if values are evaluated as sorted", () => {
      test("if find a value --> return the match value (normal behavior)", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( D1, A1:F5, 3, TRUE )",
          Z2: "=HLOOKUP( A1, A1:F5, 4, TRUE )",
        });
        expect(grid.Z1).toBe("D3");
        expect(grid.Z2).toBe("A4");
      });

      test("if find multiple values --> return match to last value", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( B1, A1:F5, 3, TRUE )",
          Z2: "=HLOOKUP( E1, A1:F5, 3, TRUE )",
        });
        expect(grid.Z1).toBe("C3");
        expect(grid.Z2).toBe("F3");
      });

      test("if not find value --> return match to the nearest value (less than the search key)", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( X1, A1:F5, 3, TRUE )",
          Z2: "=HLOOKUP( X2, A1:F5, 3, TRUE )",
        });
        expect(grid.Z1).toBe("D3");
        expect(grid.Z2).toBe("F3");
      });

      test("if all values in the search row are greater than the search key --> return #ERROR ", () => {
        const grid = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( X3, A1:F5, 3, TRUE )",
          Z2: "=HLOOKUP( X4, A1:F5, 3, TRUE )",
        });
        expect(grid.Z1).toBe("#N/A");
        expect(grid.Z2).toBe("#N/A");
      });
    });

    describe("if values are evaluated as unsorted", () => {
      test("if find a value --> return the match value (normal behavior)", () => {
        const gridS = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( D1, A1:F5, 3, FALSE )",
          Z2: "=HLOOKUP( A1, A1:F5, 4, FALSE )",
        });
        expect(gridS.Z1).toBe("D3");
        expect(gridS.Z2).toBe("A4");

        const gridU = evaluateGrid({
          ...gridUnsorted,
          Z1: "=HLOOKUP( D1, A1:F5, 3, FALSE )",
          Z2: "=HLOOKUP( A1, A1:F5, 4, FALSE )",
        });
        expect(gridU.Z1).toBe("D3");
        expect(gridU.Z2).toBe("A4");
      });

      test("if find multiple values --> return match to first value", () => {
        const gridS = evaluateGrid({
          ...gridSorted,
          Z1: "=HLOOKUP( B1, A1:F5, 3, FALSE )",
          Z2: "=HLOOKUP( E1, A1:F5, 3, FALSE )",
        });
        expect(gridS.Z1).toBe("B3");
        expect(gridS.Z2).toBe("E3");

        const gridU = evaluateGrid({
          ...gridUnsorted,
          Z1: "=HLOOKUP( B1, A1:F5, 3, FALSE )",
          Z2: "=HLOOKUP( C1, A1:F5, 3, FALSE )",
        });
        expect(gridU.Z1).toBe("B3");
        expect(gridU.Z2).toBe("C3");
      });

      test("if not find value --> #ERROR is returned ", () => {
        const formulas = {
          Z1: "=HLOOKUP( X1, A1:F5, 3, FALSE )",
          Z2: "=HLOOKUP( X2, A1:F5, 3, FALSE )",
        };

        const gridS = evaluateGrid({ ...gridSorted, ...formulas });
        expect(gridS.Z1).toBe("#N/A");
        expect(gridS.Z2).toBe("#N/A");

        const gridU = evaluateGrid({ ...gridUnsorted, ...formulas });
        expect(gridU.Z1).toBe("#N/A");
        expect(gridU.Z2).toBe("#N/A");
      });
    });
  });

  test("Accents and uppercase are ignored", () => {
    expect(evaluateCell("A1", { A1: '=HLOOKUP("epee", B1, 1)', B1: "Épée" })).toBe("Épée");
  });
});

describe("XLOOKUP formula", () => {
  test("Check argument validity", () => {
    expect(evaluateCell("A1", { A1: "=XLOOKUP()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5, C1:C5,, -5)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5, C1:C5,, 2)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5, C1:C5,, 1, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5, C1:C5,, 1, -3)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:C5, C1:C5,, 1, -3)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:B5, C1:C6,, 1, -3)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, B1:D1, B2:E2,, 1, -3)" })).toBe("#ERROR");
  });

  // prettier-ignore
  const commonGrid = {
    B1: "B1", C1: "C1", D1: "B1",
    B2: "b2", C2: "C2", D2: "D2",
    B3: "5", C3: "C3", D3: "D3",
    B4: "help", C4: "C4", D4: "D4",
    B5: "5", C5: "C5", D5: "D5",
    B6: "épinards", C6: "C6", D6: "D6",
  };

  test("Simple vertical XLOOKUP", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=XLOOKUP( "B1", B1:B6, C1:C6 )',
      Z2: '=XLOOKUP( "B2", B1:B6, C1:C6 )',
      Z3: "=XLOOKUP( 5, B1:B6, C1:C6 )",
      Z5: '=XLOOKUP( "epinards", B1:B6, C1:C6 )',
    });
    expect(grid.Z1).toBe("C1");
    expect(grid.Z2).toBe("C2");
    expect(grid.Z3).toBe("C3");
    expect(grid.Z5).toBe("C6");
  });

  test("Simple horizontal XLOOKUP", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Z1: '=XLOOKUP( "B1", B1:D1, B3:D3 )',
      Z2: '=XLOOKUP( "C1", B1:D1, B3:D3 )',
      Z3: "=XLOOKUP( 5, B1:D1, B3:D3 )",
    });
    expect(grid.Z1).toBe(5);
    expect(grid.Z2).toBe("C3");
    expect(grid.Z3).toBe("#N/A");
  });

  test("if_not_found argument", () => {
    const grid = evaluateGrid({
      ...commonGrid,
      Y2: "=0/0",
      Z1: '=XLOOKUP( "ola", B1:B6, C1:C6 )',
      Z2: '=XLOOKUP( "ola", B1:B6, C1:C6, 5 )',
      Z3: "=XLOOKUP( 5, B1:B6, C1:C6, Y2 )",
    });
    expect(grid.Z1).toBe("#N/A");
    expect(grid.Z2).toBe(5);
    expect(grid.Z3).toBe("C3");
  });

  describe("match_mode argument", () => {
    test("Exact match", () => {
      const grid = evaluateGrid({
        ...commonGrid,
        Z1: '=XLOOKUP( "c", B1:B6, B1:B6,, 0 )',
        Z2: '=XLOOKUP( "B1", B1:B6, B1:B6,, 0 )',
      });
      expect(grid.Z1).toBe("#N/A");
      expect(grid.Z2).toBe("B1");
    });

    test("Next smaller item", () => {
      const grid = evaluateGrid({
        ...commonGrid,
        Z1: '=XLOOKUP( "c", B1:B6, B1:B6,, -1 )',
        Z2: "=XLOOKUP( 6, B1:B6, B1:B6,, -1 )",
        Z3: "=XLOOKUP( 4, B1:B6, B1:B6,, -1 )",
      });
      expect(grid.Z1).toBe("b2");
      expect(grid.Z2).toBe(5);
      expect(grid.Z3).toBe("#N/A");
    });

    test("Next greater item", () => {
      const grid = evaluateGrid({
        ...commonGrid,
        Z1: '=XLOOKUP( "c", B1:B6, B1:B6,, 1 )',
        Z2: "=XLOOKUP( 6, B1:B6, B1:B6,, 1 )",
        Z3: "=XLOOKUP( 4, B1:B6, B1:B6,, 1 )",
        Z4: '=XLOOKUP( "z", B1:B6, B1:B6,, 1 )',
      });
      expect(grid.Z1).toBe("épinards");
      expect(grid.Z2).toBe("B1");
      expect(grid.Z3).toBe(5);
      expect(grid.Z4).toBe("#N/A");
    });
  });

  describe("search_mode argument", () => {
    // prettier-ignore
    const ascSortedGrid = {
      B1: "5", C1: "C1",
      B2: "5", C2: "C2",
      B3: "B1", C3: "C3",
      B4: "b2", C4: "C4",
      B5: "épinards", C5: "C5",
      B6: "help", C6: "C6",
    };

    // prettier-ignore
    const descSortedGrid = {
      B1: "help", C1: "C1",
      B2: "épinards", C2: "C2",
      B3: "b2", C3: "C3",
      B4: "B1", C4: "C4",
      B5: "5", C5: "C5",
      B6: "5", C6: "C6",
    };

    test("Search starting at first/last item (search_mode = 1/-1)", () => {
      const grid = evaluateGrid({
        ...commonGrid,
        Z1: "=XLOOKUP( 5, B1:B6, C1:C6,, 0, 1 )",
        Z2: "=XLOOKUP( 4, B1:B6, C1:C6,, 1, 1 )",
        Z3: "=XLOOKUP( 6, B1:B6, C1:C6,, -1, 1 )",
        Z4: "=XLOOKUP( 5, B1:B6, C1:C6,, 0, -1 )",
        Z5: "=XLOOKUP( 4, B1:B6, C1:C6,, 1, -1 )",
        Z6: "=XLOOKUP( 6, B1:B6, C1:C6,, -1, -1 )",
      });
      expect(grid.Z1).toBe("C3");
      expect(grid.Z2).toBe("C3");
      expect(grid.Z3).toBe("C3");
      expect(grid.Z4).toBe("C5");
      expect(grid.Z5).toBe("C5");
      expect(grid.Z6).toBe("C5");
    });

    test("With dichotomic search, grid sorted ascending", () => {
      const grid = evaluateGrid({
        ...ascSortedGrid,
        Z1: "=XLOOKUP( 5, B1:B6, C1:C6,, 0, 2 )",
        Z2: '=XLOOKUP( "b2", B1:B6, C1:C6,, 0, 2 )',
        Z3: '=XLOOKUP( "b3", B1:B6, C1:C6,, 0, 2 )',
        Z4: "=XLOOKUP( 4, B1:B6, C1:C6,, 1, 2 )",
        Z5: "=XLOOKUP( 6, B1:B6, C1:C6,, -1, 2 )",
        Z6: "=XLOOKUP( 4, B1:B6, C1:C6,, -1, 2 )",
        Z7: '=XLOOKUP( "b", B1:B6, C1:C6,, 1, 2 )',
      });
      expect(grid.Z1).toBe("C2");
      expect(grid.Z2).toBe("C4");
      expect(grid.Z3).toBe("#N/A");
      expect(grid.Z4).toBe("C2");
      expect(grid.Z5).toBe("C2");
      expect(grid.Z6).toBe("#N/A");
      expect(grid.Z7).toBe("C3");
    });

    test("With dichotomic search sorted descending", () => {
      const grid = evaluateGrid({
        ...descSortedGrid,
        Z1: "=XLOOKUP( 5, B1:B6, C1:C6,, 0, -2 )",
        Z2: '=XLOOKUP( "b2", B1:B6, C1:C6,, 0, -2 )',
        Z3: '=XLOOKUP( "b3", B1:B6, C1:C6,, 0, 2 )',
        Z4: "=XLOOKUP( 4, B1:B6, C1:C6,, 1, -2 )",
        Z5: "=XLOOKUP( 6, B1:B6, C1:C6,, -1, -2 )",
        Z6: "=XLOOKUP( 4, B1:B6, C1:C6,, -1, -2 )",
        Z7: '=XLOOKUP( "b", B1:B6, C1:C6,, 1, -2 )',
      });
      expect(grid.Z1).toBe("C5");
      expect(grid.Z2).toBe("C3");
      expect(grid.Z3).toBe("#N/A");
      expect(grid.Z4).toBe("C5");
      expect(grid.Z5).toBe("C5");
      expect(grid.Z6).toBe("#N/A");
      expect(grid.Z7).toBe("C4");
    });
  });
});

describe("INDEX formula", () => {
  test("Check argument validity", () => {
    expect(evaluateCell("A1", { A1: "=INDEX()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, 'string')" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, -1)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, , -1)" })).toBe("#ERROR");
  });

  test("Check row/col index in given range", () => {
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, 6)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, , 4)" })).toBe("#ERROR");
  });

  test("Select single cell", () => {
    //prettier-ignore
    const grid = evaluateGrid({
      A1: "3",    B1: "Hello",  C1: "=SUM(A1:A3)",
      A2: "333",  B2: "World",  C2: "=GT(A3,A1)",
      A3: "33",   B3: "!",      C3: "=CONCAT(B3,B2)",
      A5: "=INDEX(A1:A3, 1, 1)",
      A6: "=INDEX(B1:B3, 3, 1)",
      A7: "=INDEX(C1:C3, 2, 1)",
      A8: "=INDEX(A1:A3, 3, 1)",
      A9: "=INDEX(A1:A3, 0, 0)",
      A10: "=INDEX(A1:A3, 4, 1)",
      A11: "=INDEX(A1:A3, 1, 4)",
    });

    expect(grid.A5).toBe(grid.A1);
    expect(grid.A6).toBe(grid.B3);
    expect(grid.A7).toBe(grid.C2);
    expect(grid.A8).toBe(grid.A3);
    expect(grid.A9).toBe("#ERROR");
    expect(grid.A10).toBe("#ERROR");
    expect(grid.A11).toBe("#ERROR");
  });

  test("take format into account", () => {
    //prettier-ignore
    const grid = {
      A1: "1",  B1: "42%",
      A2: "3$", B2: "2",
    };
    expect(evaluateCellFormat("A5", { A5: "=INDEX(A1:B2, 1, 2)", ...grid })).toBe("0%");
    expect(evaluateCellFormat("A6", { A6: "=INDEX(A1:B2, 2, 1)", ...grid })).toBe("#,##0[$$]");
  });
});
