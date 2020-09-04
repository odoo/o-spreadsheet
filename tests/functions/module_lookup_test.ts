import { evaluateGrid, evaluateCell } from "../helpers";
import { Model } from "../../src/model";

describe("lookup", () => {
  //----------------------------------------------------------------------------
  // COLUMN
  //----------------------------------------------------------------------------

  test("COLUMN: functional tests without argument", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=COLUMN()" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=COLUMN(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("COLUMN: fuctional test without grid context", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "kikoulol" });
    expect(() => model.getters.evaluateFormula("=COLUMN()")).toThrow();
    expect(() => model.getters.evaluateFormula("=COLUMN(A1)")).not.toThrow();
  });

  test("COLUMN: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(G2)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=COLUMN(ABC2)" })).toBe(731);
    expect(evaluateCell("A1", { A1: "=COLUMN($ABC$2)" })).toBe(731);
    expect(evaluateCell("A1", { A1: "=COLUMN(Sheet42!$ABC$2)" })).toBe(731);
  });

  test("COLUMN: functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(B3:C40)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COLUMN(D3:Z9)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COLUMN($D$3:$Z$9)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=COLUMN(Sheet42!$D$3:$Z$9)" })).toBe(4);
  });

  //----------------------------------------------------------------------------
  // COLUMNS
  //----------------------------------------------------------------------------

  test("COLUMNS: functional tests without arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=COLUMNS(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("COLUMNS: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(H2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS(ABC2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS($ABC$2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COLUMNS(Sheet42!$ABC$2)" })).toBe(1);
  });

  test("COLUMNS: functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(B3:C40)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COLUMNS(D3:Z9)" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=COLUMNS($D$3:$Z$9)" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=COLUMNS(Sheet42!$D$3:$Z$9)" })).toBe(23);
  });

  //----------------------------------------------------------------------------
  // LOOKUP
  //----------------------------------------------------------------------------

  test("LOOKUP: fonctional tests on range", () => {
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

    expect(evaluatedGrid.A15).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(evaluatedGrid.A16).toBe("res 09");
  });

  //----------------------------------------------------------------------------
  // MATCH
  //----------------------------------------------------------------------------

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

  test("MATCH: range evaluate sorted ascending", () => {
    const ascendingAsAscending = { ...rangeAscending, ...evAsAscending };
    const aAsA = evaluateGrid(ascendingAsAscending);

    expect(aAsA.B1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsA.B2).toBe(1);
    expect(aAsA.B3).toBe(3);
    expect(aAsA.B4).toBe(4);
    expect(aAsA.B5).toBe(4);
    expect(aAsA.B6).toBe(5);
    expect(aAsA.B7).toBe(6);
    expect(aAsA.B8).toBe(6);

    const ascendingAsUnsorted = { ...rangeAscending, ...evAsUnsorted };
    const aAsU = evaluateGrid(ascendingAsUnsorted);

    expect(aAsU.C1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsU.C2).toBe(1);
    expect(aAsU.C3).toBe(2);
    expect(aAsU.C4).toBe(4);
    expect(aAsU.C5).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsU.C6).toBe(5);
    expect(aAsU.C7).toBe(6);
    expect(aAsU.C8).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A

    const ascendingAsDescending = { ...rangeAscending, ...evAsDescending };
    const aAsD = evaluateGrid(ascendingAsDescending);

    expect(aAsD.D1).toBe(6);
    expect(aAsD.D2).toBe(6);
    expect(aAsD.D3).toBe("#ERROR"); // @compatibility: on googlesheets, return 6
    expect(aAsD.D4).toBe("#ERROR"); // @compatibility: on googlesheets, return 6
    expect(aAsD.D5).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsD.D6).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsD.D7).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(aAsD.D8).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
  });

  test("MATCH: range evaluate unsorted", () => {
    const unsortedAsAscending = { ...rangeUnsorted, ...evAsAscending };
    const uAsA = evaluateGrid(unsortedAsAscending);

    expect(uAsA.B1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(uAsA.B2).toBe(1);
    expect(uAsA.B3).toBe(1);
    expect(uAsA.B4).toBe(5);
    expect(uAsA.B5).toBe(5);
    expect(uAsA.B6).toBe(5);
    expect(uAsA.B7).toBe(5);
    expect(uAsA.B8).toBe(6);

    const unsortedAsUnsorted = { ...rangeUnsorted, ...evAsUnsorted };
    const uAsU = evaluateGrid(unsortedAsUnsorted);

    expect(uAsU.C1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(uAsU.C2).toBe(1);
    expect(uAsU.C3).toBe(5);
    expect(uAsU.C4).toBe(3);
    expect(uAsU.C5).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(uAsU.C6).toBe(2);
    expect(uAsU.C7).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(uAsU.C8).toBe(6);

    const unsortedAsDescending = { ...rangeUnsorted, ...evAsDescending };
    const uAsD = evaluateGrid(unsortedAsDescending);

    expect(uAsD.D1).toBe(6);
    expect(uAsD.D2).toBe(6);
    expect(uAsD.D3).toBe(5); // @compatibility: on googlesheets, return 6
    expect(uAsD.D4).toBe(3);
    expect(uAsD.D5).toBe(2);
    expect(uAsD.D6).toBe("#ERROR"); // @compatibility: on googlesheets, return 2
    expect(uAsD.D7).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(uAsD.D8).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
  });

  test("MATCH: range evaluate sorted descending", () => {
    const descendingAsAscending = { ...rangeDescending, ...evAsAscending };
    const dAsA = evaluateGrid(descendingAsAscending);

    expect(dAsA.B1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(dAsA.B2).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(dAsA.B3).toBe(6);
    expect(dAsA.B4).toBe(6);
    expect(dAsA.B5).toBe(6);
    expect(dAsA.B6).toBe(6);
    expect(dAsA.B7).toBe(6);
    expect(dAsA.B8).toBe(6);

    const descendingAsUnsorted = { ...rangeDescending, ...evAsUnsorted };
    const dAsU = evaluateGrid(descendingAsUnsorted);

    expect(dAsU.C1).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(dAsU.C2).toBe(6);
    expect(dAsU.C3).toBe(4);
    expect(dAsU.C4).toBe(3);
    expect(dAsU.C5).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(dAsU.C6).toBe(2);
    expect(dAsU.C7).toBe(1);
    expect(dAsU.C8).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A

    const descendingAsDescending = { ...rangeDescending, ...evAsDescending };
    const dAsD = evaluateGrid(descendingAsDescending);

    expect(dAsD.D1).toBe(6);
    expect(dAsD.D2).toBe(6);
    expect(dAsD.D3).toBe(4);
    expect(dAsD.D4).toBe(3);
    expect(dAsD.D5).toBe(2);
    expect(dAsD.D6).toBe(2);
    expect(dAsD.D7).toBe(1);
    expect(dAsD.D8).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
  });

  test("MATCH: grid of STRING ascending", () => {
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

  test("MATCH: grid of STRING unsorted", () => {
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
    expect(unsortedString.C3).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(unsortedString.C4).toBe(4);
    expect(unsortedString.C5).toBe(5);
  });

  test("MATCH: grid of STRING descending", () => {
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
    expect(descendingString.D3).toBe("#ERROR"); // @compatibility: on googlesheets, return #N/A
    expect(descendingString.D4).toBe(4);
    expect(descendingString.D5).toBe(3);
  });

  //----------------------------------------------------------------------------
  // ROW
  //----------------------------------------------------------------------------

  test("ROW: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=ROW()" })).toBe(20);
    expect(evaluateCell("A1", { A1: "=ROW(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("ROW: fuctional test without grid context", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "kikoulol" });
    expect(() => model.getters.evaluateFormula("=ROW()")).toThrow();
    expect(() => model.getters.evaluateFormula("=ROW(A1)")).not.toThrow();
  });

  test("ROW: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW(H2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ROW(A234)" })).toBe(234);
    expect(evaluateCell("A1", { A1: "=ROW($A$234)" })).toBe(234);
    expect(evaluateCell("A1", { A1: "=ROW(Sheet42!$A$234)" })).toBe(234);
  });

  test("ROW: functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW(B3:C40)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW(D3:Z9)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW($D$3:$Z$9)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ROW(Sheet42!$D$3:$Z$9)" })).toBe(3);
  });

  //----------------------------------------------------------------------------
  // ROWS
  //----------------------------------------------------------------------------

  test("ROWS: functional tests without arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ROWS(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("ROWS: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(H2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS(ABC2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS($ABC$2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROWS(Sheet42!$ABC$2)" })).toBe(1);
  });

  test("ROWS: functional tests on range arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(B3:C40)" })).toBe(38);
    expect(evaluateCell("A1", { A1: "=ROWS(D3:Z9)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=ROWS($D$3:$Z$9)" })).toBe(7);
    expect(evaluateCell("A1", { A1: "=ROWS(Sheet42!$D$3:$Z$9)" })).toBe(7);
  });

  //----------------------------------------------------------------------------
  // VLOOKUP
  //----------------------------------------------------------------------------

  // prettier-ignore
  const gridSorted = {
    A1: "1", B1: "res 1",
    A2: "2", B2: "res 2.1",
    A3: "2", B3: "res 2.2",
    A4: "3", B4: "res 3",
    A5: "5", B5: "res 5",
    A6: "6", B6: "res 6",
  };

  // prettier-ignore
  const gridNotSorted = {
    A1: "1", B1: "res 1",
    A2: "2", B2: "res 2.1",
    A3: "3", B3: "res 3",
    A4: "2", B4: "res 2.2",
    A5: "5", B5: "res 5",
    A6: "6", B6: "res 6",
  };

  // prettier-ignore
  const evAsSorted = {
    C1: "=VLOOKUP( 0, A1:B6, 1, TRUE )", D1: "=VLOOKUP( 0, A1:B6, 2, TRUE )",
    C2: "=VLOOKUP( 1, A1:B6, 1, TRUE )", D2: "=VLOOKUP( 1, A1:B6, 2, TRUE )",
    C3: "=VLOOKUP( 2, A1:B6, 1, TRUE )", D3: "=VLOOKUP( 2, A1:B6, 2, TRUE )",
    C4: "=VLOOKUP( 3, A1:B6, 1, TRUE )", D4: "=VLOOKUP( 3, A1:B6, 2, TRUE )",
    C5: "=VLOOKUP( 4, A1:B6, 1, TRUE )", D5: "=VLOOKUP( 4, A1:B6, 2, TRUE )",
    C6: "=VLOOKUP( 5, A1:B6, 1, TRUE )", D6: "=VLOOKUP( 5, A1:B6, 2, TRUE )",
    C7: "=VLOOKUP( 6, A1:B6, 1, TRUE )", D7: "=VLOOKUP( 6, A1:B6, 2, TRUE )",
    C8: "=VLOOKUP( 7, A1:B6, 1, TRUE )", D8: "=VLOOKUP( 7, A1:B6, 2, TRUE )",

    E1: "=VLOOKUP( 0, A1:B6, 0, TRUE )", F1: "=VLOOKUP( 0, A1:B6, 3, TRUE )",
    E2: "=VLOOKUP( 1, A1:B6, 0, TRUE )", F2: "=VLOOKUP( 1, A1:B6, 3, TRUE )",

    G1: "=VLOOKUP( 1, A1:B6, 2.8, TRUE )",
  };

  // prettier-ignore
  const evAsNotSorted = {
    C1: "=VLOOKUP( 0, A1:B6, 1, FALSE )", D1: "=VLOOKUP( 0, A1:B6, 2, FALSE )",
    C2: "=VLOOKUP( 1, A1:B6, 1, FALSE )", D2: "=VLOOKUP( 1, A1:B6, 2, FALSE )",
    C3: "=VLOOKUP( 2, A1:B6, 1, FALSE )", D3: "=VLOOKUP( 2, A1:B6, 2, FALSE )",
    C4: "=VLOOKUP( 3, A1:B6, 1, FALSE )", D4: "=VLOOKUP( 3, A1:B6, 2, FALSE )",
    C5: "=VLOOKUP( 4, A1:B6, 1, FALSE )", D5: "=VLOOKUP( 4, A1:B6, 2, FALSE )",
    C6: "=VLOOKUP( 5, A1:B6, 1, FALSE )", D6: "=VLOOKUP( 5, A1:B6, 2, FALSE )",
    C7: "=VLOOKUP( 6, A1:B6, 1, FALSE )", D7: "=VLOOKUP( 6, A1:B6, 2, FALSE )",
    C8: "=VLOOKUP( 7, A1:B6, 1, FALSE )", D8: "=VLOOKUP( 7, A1:B6, 2, FALSE )",

    E1: "=VLOOKUP( 0, A1:B6, 0, FALSE )", F1: "=VLOOKUP( 0, A1:B6, 3, FALSE )",
    E2: "=VLOOKUP( 1, A1:B6, 0, FALSE )", F2: "=VLOOKUP( 1, A1:B6, 3, FALSE )",

    G1: "=VLOOKUP( 1, A1:B6, 2.8, FALSE )",
  };

  // prettier-ignore
  test("VLOOKUP: grid (sorted) evaluate as sorted", () => {

    const gridSortedEvAsSorted = { ...gridSorted, ...evAsSorted };
    const sAsS = evaluateGrid(gridSortedEvAsSorted);

    // case is_sorted is true: If all values in the search column are greater 
    // than the search key, #ERROR is returned.
    // @compatibility: on google sheets return #N/A
    expect(sAsS.C1).toEqual("#ERROR"); expect(sAsS.D1).toEqual("#ERROR");

    // normal behavior: 
    expect(sAsS.C2).toEqual(1); expect(sAsS.D2).toEqual("res 1");
    expect(sAsS.C4).toEqual(3); expect(sAsS.D4).toEqual("res 3");
    expect(sAsS.C6).toEqual(5); expect(sAsS.D6).toEqual("res 5");
    expect(sAsS.C7).toEqual(6); expect(sAsS.D7).toEqual("res 6");

    // multiple matching values: contrary to 'is_sorted = FALSE' 
    // return the last founded value and no the first
    expect(sAsS.C3).toEqual(2); expect(sAsS.D3).toEqual("res 2.2");

    // no present value: return the nearest match 
    // (less than or equal to the search key)
    expect(sAsS.C5).toEqual(3); expect(sAsS.D5).toEqual("res 3");
    expect(sAsS.C8).toEqual(6); expect(sAsS.D8).toEqual("res 6");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned"
    // @compatibility: on googlesheets, return #VALUE!
    expect(sAsS.E1).toEqual("#ERROR"); expect(sAsS.F1).toEqual("#ERROR");
    expect(sAsS.E2).toEqual("#ERROR"); expect(sAsS.F2).toEqual("#ERROR");

    // float index 
    expect(sAsS.G1).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid (not sorted) evaluate as sorted", () => {

    const gridNotSortedEvAsSorted = { ...gridNotSorted, ...evAsSorted };
    const nsAsS = evaluateGrid(gridNotSortedEvAsSorted);

    // case is_sorted is true: If all values in the search column are greater 
    // than the search key, #ERROR is returned.
    // @compatibility: on google sheets return #N/A
    expect(nsAsS.C1).toEqual("#ERROR"); expect(nsAsS.D1).toEqual("#ERROR");

    // normal behavior: 
    expect(nsAsS.C2).toEqual(1); expect(nsAsS.D2).toEqual("res 1");
    expect(nsAsS.C6).toEqual(5); expect(nsAsS.D6).toEqual("res 5");
    expect(nsAsS.C7).toEqual(6); expect(nsAsS.D7).toEqual("res 6");

    // multiple matching values: contrary to 'is_sorted = FALSE' 
    // return the last founded value and no the first
    expect(nsAsS.C3).toEqual(2); expect(nsAsS.D3).toEqual("res 2.2");

    // if is_sorted is set to TRUE or omitted, and the first column of the range 
    // is not in sorted order, an incorrect value might be returned.
    expect(nsAsS.C4).toEqual(2); expect(nsAsS.D4).toEqual("res 2.2");
    expect(nsAsS.C5).toEqual(2); expect(nsAsS.D5).toEqual("res 2.2");

    // no present value: return the nearest match 
    // (less than or equal to the search key)
    expect(nsAsS.C8).toEqual(6); expect(nsAsS.D8).toEqual("res 6");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned
    // @compatibility: on googlesheets, return #VALUE!
    expect(nsAsS.E1).toEqual("#ERROR"); expect(nsAsS.F1).toEqual("#ERROR");
    expect(nsAsS.E2).toEqual("#ERROR"); expect(nsAsS.F2).toEqual("#ERROR");

    // float index 
    expect(nsAsS.G1).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid (sorted and not sorted) evaluate as not sorted", () => {

    const gridSortedEvAsNotSorted = { ...gridSorted, ...evAsNotSorted };
    const sAsNs = evaluateGrid(gridSortedEvAsNotSorted);

    const gridNotSortedEvAsNotSorted = { ...gridNotSorted, ...evAsNotSorted };
    const nsAsNs = evaluateGrid(gridNotSortedEvAsNotSorted);

    // case is_sorted is false: #ERROR is returned if no such value is found.
    // @compatibility: on google sheets return #N/A
    expect(sAsNs.C1).toEqual("#ERROR"); expect(sAsNs.D1).toEqual("#ERROR");
    expect(sAsNs.C5).toEqual("#ERROR"); expect(sAsNs.D5).toEqual("#ERROR");
    expect(sAsNs.C8).toEqual("#ERROR"); expect(sAsNs.D8).toEqual("#ERROR");
    expect(nsAsNs.C1).toEqual("#ERROR"); expect(nsAsNs.D1).toEqual("#ERROR");
    expect(nsAsNs.C5).toEqual("#ERROR"); expect(nsAsNs.D5).toEqual("#ERROR");
    expect(nsAsNs.C8).toEqual("#ERROR"); expect(nsAsNs.D8).toEqual("#ERROR");

    // normal behavior: 
    expect(sAsNs.C2).toEqual(1); expect(sAsNs.D2).toEqual("res 1");
    expect(sAsNs.C4).toEqual(3); expect(sAsNs.D4).toEqual("res 3");
    expect(sAsNs.C6).toEqual(5); expect(sAsNs.D6).toEqual("res 5");
    expect(sAsNs.C7).toEqual(6); expect(sAsNs.D7).toEqual("res 6");
    expect(nsAsNs.C2).toEqual(1); expect(nsAsNs.D2).toEqual("res 1");
    expect(nsAsNs.C4).toEqual(3); expect(nsAsNs.D4).toEqual("res 3");
    expect(nsAsNs.C6).toEqual(5); expect(nsAsNs.D6).toEqual("res 5");
    expect(nsAsNs.C7).toEqual(6); expect(nsAsNs.D7).toEqual("res 6");

    // multiple matching values: contrary to 'is_sorted = TRUE' 
    // return the first founded value and no the last
    expect(sAsNs.C3).toEqual(2); expect(sAsNs.D3).toEqual("res 2.1");
    expect(nsAsNs.C3).toEqual(2); expect(nsAsNs.D3).toEqual("res 2.1");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned
    // @compatibility: on googlesheets, return #VALUE!
    expect(sAsNs.E1).toEqual("#ERROR"); expect(sAsNs.F1).toEqual("#ERROR");
    expect(sAsNs.E2).toEqual("#ERROR"); expect(sAsNs.F2).toEqual("#ERROR");
    expect(nsAsNs.E1).toEqual("#ERROR"); expect(nsAsNs.F1).toEqual("#ERROR");
    expect(nsAsNs.E2).toEqual("#ERROR"); expect(nsAsNs.F2).toEqual("#ERROR");

    // float index 
    expect(sAsNs.G1).toEqual("res 1");
    expect(nsAsNs.G1).toEqual("res 1");
  });

  // prettier-ignore
  const gridOfStringSorted = {
    A1: '="1"', B1: "res 1",
    A2: '="10"', B2: "res 10",
    A3: '="100"', B3: "res 100",
    A4: '="2"', B4: "res 2.1",
    A5: '="2"', B5: "res 2.2",
  };

  // prettier-ignore
  const gridOfStringNotSorted = {
    A1: '="1"', B1: "res 1",
    A2: '="2"', B2: "res 2.1",
    A3: '="2"', B3: "res 2.2",
    A4: '="10"', B4: "res 10",
    A5: '="100"', B5: "res 100",
  };

  // prettier-ignore
  const evAsSortedString = {
    C1: '=VLOOKUP( "1",   A1:B5, 1, TRUE )', D1: '=VLOOKUP( "1",   A1:B5, 2, TRUE )',
    C2: '=VLOOKUP( "2",   A1:B5, 1, TRUE )', D2: '=VLOOKUP( "2",   A1:B5, 2, TRUE )',
    C3: '=VLOOKUP( "5",   A1:B5, 1, TRUE )', D3: '=VLOOKUP( "5",   A1:B5, 2, TRUE )',
    C4: '=VLOOKUP( "10",  A1:B5, 1, TRUE )', D4: '=VLOOKUP( "10",  A1:B5, 2, TRUE )',
    C5: '=VLOOKUP( "100", A1:B5, 1, TRUE )', D5: '=VLOOKUP( "100", A1:B5, 2, TRUE )',
  };

  // prettier-ignore
  const evAsNotSortedString = {
    C1: '=VLOOKUP( "1",   A1:B5, 1, FALSE )', D1: '=VLOOKUP( "1",   A1:B5, 2, FALSE )',
    C2: '=VLOOKUP( "2",   A1:B5, 1, FALSE )', D2: '=VLOOKUP( "2",   A1:B5, 2, FALSE )',
    C3: '=VLOOKUP( "5",   A1:B5, 1, FALSE )', D3: '=VLOOKUP( "5",   A1:B5, 2, FALSE )',
    C4: '=VLOOKUP( "10",  A1:B5, 1, FALSE )', D4: '=VLOOKUP( "10",  A1:B5, 2, FALSE )',
    C5: '=VLOOKUP( "100", A1:B5, 1, FALSE )', D5: '=VLOOKUP( "100", A1:B5, 2, FALSE )',
  };

  // prettier-ignore
  test("VLOOKUP: grid of STRING (sorted) evaluate as sorted", () => {

    const gridOfStringSortedEvAsSortedString = { ...gridOfStringSorted, ...evAsSortedString };
    const ssAsSs = evaluateGrid(gridOfStringSortedEvAsSortedString);

    expect(ssAsSs.C1).toEqual("1"); expect(ssAsSs.D1).toEqual("res 1");
    expect(ssAsSs.C2).toEqual("2"); expect(ssAsSs.D2).toEqual("res 2.2");
    expect(ssAsSs.C3).toEqual("2"); expect(ssAsSs.D3).toEqual("res 2.2");
    expect(ssAsSs.C4).toEqual("10"); expect(ssAsSs.D4).toEqual("res 10");
    expect(ssAsSs.C5).toEqual("100"); expect(ssAsSs.D5).toEqual("res 100");
  });

  // prettier-ignore
  test("VLOOKUP: grid of STRING (not sorted) evaluate as sorted", () => {

    const gridOfStringNotSortedEvAsSortedString = { ...gridOfStringNotSorted, ...evAsSortedString };
    const nssAsSs = evaluateGrid(gridOfStringNotSortedEvAsSortedString);

    expect(nssAsSs.C1).toEqual("1"); expect(nssAsSs.D1).toEqual("res 1");
    expect(nssAsSs.C2).toEqual("100"); expect(nssAsSs.D2).toEqual("res 100");
    expect(nssAsSs.C3).toEqual("100"); expect(nssAsSs.D3).toEqual("res 100");
    expect(nssAsSs.C4).toEqual("1"); expect(nssAsSs.D4).toEqual("res 1");
    expect(nssAsSs.C5).toEqual("1"); expect(nssAsSs.D5).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid of STRING (sorted and not sorted) evaluate as not sorted", () => {

    const gridOfStringSortedEvAsNotSortedString = { ...gridOfStringSorted, ...evAsNotSortedString };
    const ssAsNss = evaluateGrid(gridOfStringSortedEvAsNotSortedString);

    const gridOfStringNotSortedEvAsNotSortedString = { ...gridOfStringNotSorted, ...evAsNotSortedString };
    const nssAsNss = evaluateGrid(gridOfStringNotSortedEvAsNotSortedString);

    expect(ssAsNss.C1).toEqual("1"); expect(ssAsNss.D1).toEqual("res 1");
    expect(nssAsNss.C1).toEqual("1"); expect(nssAsNss.D1).toEqual("res 1");

    expect(ssAsNss.C2).toEqual("2"); expect(ssAsNss.D2).toEqual("res 2.1");
    expect(nssAsNss.C2).toEqual("2"); expect(nssAsNss.D2).toEqual("res 2.1");

    expect(ssAsNss.C3).toEqual("#ERROR"); expect(ssAsNss.D3).toEqual("#ERROR");
    expect(nssAsNss.C3).toEqual("#ERROR"); expect(nssAsNss.D3).toEqual("#ERROR");

    expect(ssAsNss.C4).toEqual("10"); expect(ssAsNss.D4).toEqual("res 10");
    expect(nssAsNss.C4).toEqual("10"); expect(nssAsNss.D4).toEqual("res 10");

    expect(ssAsNss.C5).toEqual("100"); expect(ssAsNss.D5).toEqual("res 100");
    expect(nssAsNss.C5).toEqual("100"); expect(nssAsNss.D5).toEqual("res 100");
  });
});
