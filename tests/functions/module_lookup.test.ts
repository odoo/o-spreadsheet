import { Model } from "../../src/model";
import { activateSheet, createSheet, setCellContent } from "../test_helpers/commands_helpers";
import {
  getCellContent,
  getEvaluatedCell,
  getEvaluatedGrid,
} from "../test_helpers/getters_helpers";
import {
  createModelFromGrid,
  evaluateCell,
  evaluateCellFormat,
  evaluateGrid,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("ADDRESS formula", () => {
  test("functional tests without argument", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ADDRESS(,)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
  });

  test("functional test with negative arguments or zero", () => {
    // @compatibility: on google sheets, all return #VALUE
    expect(evaluateCell("A1", { A1: "=ADDRESS(1,0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ADDRESS(0,1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ADDRESS(-1,1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ADDRESS(1,-1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ADDRESS(-1,-1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ADDRESS(0,0)" })).toBe("#ERROR");
  });

  test("functional test with positive numbers or strings that can be parsed into positive numbers", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS(1,4)" })).toBe("$D$1");
    expect(evaluateCell("A1", { A1: '=ADDRESS("2",1)' })).toBe("$A$2");
    expect(evaluateCell("A1", { A1: '=ADDRESS(3,"5")' })).toBe("$E$3");
    expect(evaluateCell("A1", { A1: '=ADDRESS("27","53")' })).toBe("$BA$27");
  });

  test("functional test with strings that cannot be parsed into positive numbers", () => {
    expect(evaluateCell("A1", { A1: '=ADDRESS("row",4)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=ADDRESS("row","col")' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=ADDRESS(3,"col")' })).toBe("#ERROR");
  });

  test("functional tests on valid absolute/relative modes (1-4)", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53)" })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,1)" })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,2)" })).toBe("BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,3)" })).toBe("$BA27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,4)" })).toBe("BA27");
  });

  test("functional tests on invalid absolute/relative modes", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,"string")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
  });

  test("functional tests on using A1 notation or R1C1 notation", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,,)" })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,,true)" })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,,false)" })).toBe("R27C53");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,"TRUE")' })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,"FALSE")' })).toBe("R27C53");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,,1)" })).toBe("$BA$27");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,,0)" })).toBe("R27C53");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,"")' })).toBe("R27C53");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,," ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
  });

  test("functional tests on using R1C1 notation and different absolute/relative modes", () => {
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,1,false)" })).toBe("R27C53");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,2,false)" })).toBe("R27C[53]");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,3,false)" })).toBe("R[27]C53");
    expect(evaluateCell("A1", { A1: "=ADDRESS(27,53,4,false)" })).toBe("R[27]C[53]");
  });

  test("functional tests on sheet name", () => {
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,,"sheet")' })).toBe("sheet!$BA$27");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,,"sheet!")' })).toBe("'sheet!'!$BA$27");
    expect(evaluateCell("A1", { A1: '=ADDRESS(27,53,,,"")' })).toBe("''!$BA$27");
  });
});

describe("COLUMN formula", () => {
  test("functional tests without argument", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=COLUMN()" })).toBe(24);
    expect(evaluateCell("A1", { A1: "=COLUMN(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional test without grid context", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "kikoulol");
    expect(model.getters.evaluateFormula(sheetId, "=COLUMN()")).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(model.getters.evaluateFormula(sheetId, "=COLUMN(A1)")).toBe(1);
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

  test("COLUMN accepts errors on first argument", () => {
    expect(evaluateCell("A1", { A1: "=COLUMN(B2)", B2: "=KABOUM" })).toBe(2);
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

  test("COLUMNS accepts errors on first argument", () => {
    expect(evaluateCell("A1", { A1: "=COLUMNS(B2:D2)", B2: "=KABOUM" })).toBe(3);
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

  test("take format into account", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "42%",      C1: "3$",
      A2: "2", B2: "12/12/12", C2: "24",
    };
    expect(evaluateCellFormat("A5", { A5: "=LOOKUP(2, A1:B2)", ...grid })).toBe("m/d/yy");
    expect(evaluateCellFormat("A6", { A6: "=LOOKUP(1, A1:A2, C1:C2)", ...grid })).toBe("#,##0[$$]");
  });

  test("can LOOKUP in a range with errors cells", () => {
    const grid = {
      A1: "=1/0",
      A2: "2",
      A3: "=?LOOKUP(2, A1:A2)",
    };
    expect(evaluateCell("A3", grid)).toBe(2);
  });

  test("cannot lookup an error values", () => {
    const grid = {
      A1: "=1/0",
      B1: "1",
      A2: "42",
      B2: "2",
    };
    expect(evaluateCell("A3", { A3: "=LOOKUP(A1, A1:B2)", ...grid })).toBe("#DIV/0!");
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

  test("Find the exact value perform a wildcard search", () => {
    const grid = { A1: "YODAA", B1: "YOPLAA" };
    expect(evaluateCell("A3", { A3: '=MATCH("YO?L*", A1:B1, 0)', ...grid })).toBe(2);
  });

  test("MATCH accepts errors in second argument", () => {
    const grid = { A1: "=KABOUM", B1: "42" };
    expect(evaluateCell("A3", { A3: "=MATCH(42, A1:B1)", ...grid })).toBe(2);
  });

  test("cannot match an error", () => {
    const grid = { A1: "=KABOUM", B1: "42" };
    expect(evaluateCell("A3", { A3: "=MATCH(A1, A1:B1)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("ROW formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ROW()" })).toBe(1);
    expect(evaluateCell("X20", { X20: "=ROW()" })).toBe(20);
    expect(evaluateCell("A1", { A1: "=ROW(,)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("functional test without grid context", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "kikoulol");
    expect(model.getters.evaluateFormula(sheetId, "=ROW()")).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(model.getters.evaluateFormula(sheetId, "=ROW(A1)")).toBe(1);
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

  test("ROW accepts errors on first argument", () => {
    expect(evaluateCell("A1", { A1: "=ROW(B2)", B2: "=KABOUM" })).toBe(2);
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

  test("ROWS accepts errors on first argument", () => {
    expect(evaluateCell("A1", { A1: "=ROWS(B2:B4)", B2: "=KABOUM" })).toBe(3);
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

  test("perform a wildcard search when values are evaluated as unsorted", () => {
    // prettier-ignore
    const grid = evaluateGrid({
      A1: "abbc", B1: "1111",
      A2: "abc",  B2: "222",
      A3: "ba",   B3: "33",
      A4: "abcd", B4: "4444",
      A5: "=A2",  B5: "555",
      A6: "=A3",  B6: "666",
      Z1: '=VLOOKUP("a?c", A1:B6, 2, FALSE )',
      Z2: '=VLOOKUP("a*d", A1:B6, 2, FALSE )',
    });
    expect(grid.Z1).toBe(222);
    expect(grid.Z2).toBe(4444);
  });

  test("take format into account", () => {
    // prettier-ignore
    const grid = {
      A2: "A2", B2: "12/12/12", C2: "3€",
      A3: "A3", B3: "42%"     , C3: "3$",
    };
    expect(evaluateCellFormat("D1", { D1: '=VLOOKUP("A2", A2:C3, 3)', ...grid })).toBe("#,##0[$€]");
    expect(evaluateCellFormat("E1", { E1: '=VLOOKUP("B2", A2:C3, 2)', ...grid })).toBe("0%");
  });

  test("VLOOKUP accept errors in the second parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "1",
      A2: "42",      B2: "2", 
    };
    expect(evaluateCell("A3", { A3: "=VLOOKUP(42, A1:B2, 2, true)", ...grid })).toBe(2);
    expect(evaluateCell("A3", { A3: "=VLOOKUP(42, A1:B2, 2, false)", ...grid })).toBe(2);
  });

  test("VLOOKUP cannot find error values", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "1",
      A2: "42",      B2: "2", 
    };
    expect(evaluateCell("A3", { A3: "=VLOOKUP(A1, A1:B2, 2, true)", ...grid })).toBe("#BAD_EXPR");
    expect(evaluateCell("A3", { A3: "=VLOOKUP(A1, A1:B2, 2, false)", ...grid })).toBe("#BAD_EXPR");
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

  test("if float index --> index rounded down", () => {
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

    test("take format into account", () => {
      // prettier-ignore
      const grid = {
        A2: "A2", B2: "B2",
        A3: "12/12/12", B3: "42%",
        A4: "3€", B4: "3$",
      };
      expect(evaluateCellFormat("D1", { D1: '=HLOOKUP("A2", A2:B4, 3)', ...grid })).toBe(
        "#,##0[$€]"
      );
      expect(evaluateCellFormat("E1", { E1: '=HLOOKUP("B2", A2:B4, 2)', ...grid })).toBe("0%");
    });
  });

  test("Accents and uppercase are ignored", () => {
    expect(evaluateCell("A1", { A1: '=HLOOKUP("epee", B1, 1)', B1: "Épée" })).toBe("Épée");
  });

  test("perform a wildcard search when values are evaluated as unsorted", () => {
    // prettier-ignore
    const grid = evaluateGrid({
      A1: "abbc", B1: "abc", C1: "ba", D1: "abcd", E1: "=B1", F1: "=C1",
      A2: "1111", B2: "222", C2: "33", D2: "4444", E2: "555", F2: "666",
      Z1: '=HLOOKUP("a?c", A1:F2, 2, FALSE )',
      Z2: '=HLOOKUP("a*d", A1:F2, 2, FALSE )',
    });
    expect(grid.Z1).toBe(222);
    expect(grid.Z2).toBe(4444);
  });

  test("HLOOKUP accept errors in the second parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "1",       B2: "2", 
    };
    expect(evaluateCell("A3", { A3: "=HLOOKUP(42, A1:B2, 2, true)", ...grid })).toBe(2);
    expect(evaluateCell("A3", { A3: "=HLOOKUP(42, A1:B2, 2, false)", ...grid })).toBe(2);
  });

  test("HLOOKUP cannot find error values", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "1",       B2: "2", 
    };
    expect(evaluateCell("A3", { A3: "=HLOOKUP(A1, A1:B2, 2, true)", ...grid })).toBe("#BAD_EXPR");
    expect(evaluateCell("A3", { A3: "=HLOOKUP(A1, A1:B2, 2, false)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("XLOOKUP formula", () => {
  test("XLOOKUP takes 3-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=XLOOKUP()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0, 1, 0)" })).toBe("#BAD_EXPR");
  });

  test("lookup_range is either a single col or a single row", () => {
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:F1, D1:F1, 0)" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:E3, D1:E3, 0)" })).toBe("#ERROR");
  });

  test("arguments lookup_range and return_range must have similar dimensions", () => {
    // lookup_range single col
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:E3, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D4, 0)" })).toBe("#ERROR");

    // lookup_range single row
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:F1, D1:F3, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:F1, D1:E3, 0)" })).toBe("#ERROR");
  });

  test("match_mode should be between -1, 1 and 2", () => {
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, -2)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, -1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 3)" })).toBe("#ERROR");
  });

  test("search_mode should be in [-2, -1, 1, 2]", () => {
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0, -3)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=XLOOKUP(5, D1:D3, D1:D3, 0, 0, 3)" })).toBe("#ERROR");
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

  test("vertical XLOOKUP can return an array", () => {
    const model = createModelFromGrid(commonGrid);
    setCellContent(model, "F1", '=XLOOKUP( "b2", B1:B6, C1:D6 )');
    expect(getRangeValuesAsMatrix(model, "F1:G1")).toEqual([["C2", "D2"]]);
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

  test("horizontal XLOOKUP can return an array", () => {
    const model = createModelFromGrid(commonGrid);
    setCellContent(model, "F1", '=XLOOKUP( "C1", B1:D1, B2:D4 )');
    expect(getRangeValuesAsMatrix(model, "F1:F3")).toEqual([["C2"], ["C3"], ["C4"]]);
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

    test("Wildcard match", () => {
      const grid = evaluateGrid({
        ...commonGrid,
        Z1: '=XLOOKUP("*inar*", B1:B6, B1:B6,, 2 )',
        Z2: '=XLOOKUP("hel?", B1:B6, B1:B6,, 2 )',
        Z3: '=XLOOKUP("hel??", B1:B6, B1:B6,, 2 )',
      });
      expect(grid.Z1).toBe("épinards");
      expect(grid.Z2).toBe("help");
      expect(grid.Z3).toBe("#N/A");
    });

    test("XLOOKUP accept errors in the second parameter", () => {
      // prettier-ignore
      const grid = {
        A1: "=KABOUM", B1: "42",
        A2: "1",       B2: "2", 
      };
      expect(evaluateCell("A3", { A3: "=XLOOKUP(42, A1:B1, A2:B2)", ...grid })).toBe(2);
    });

    test("XLOOKUP cannot find error values", () => {
      // prettier-ignore
      const grid = {
        A1: "=KABOUM", B1: "42",
        A2: "1",       B2: "2", 
      };
      expect(evaluateCell("A3", { A3: "=XLOOKUP(A1, A1:B1, A2:B2)", ...grid })).toBe("#BAD_EXPR");
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

  test("take format into account", () => {
    // prettier-ignore
    const grid = {
      B1: "24", C1: "42",
      B2: "12/12/12", C2: "2$",
    };
    expect(evaluateCellFormat("D1", { D1: "=XLOOKUP(24, B1:C1, B2:C2)", ...grid })).toBe("m/d/yy");
    expect(evaluateCellFormat("E1", { E1: "=XLOOKUP(42, B1:C1, B2:C3)", ...grid })).toBe(
      "#,##0[$$]"
    );
  });
});

describe("INDEX formula", () => {
  test("Check argument validity", () => {
    expect(evaluateCell("A1", { A1: "=INDEX()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, 'string')" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, -1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, , -1)" })).toBe("#ERROR");
  });

  test("Check row/col index in given range", () => {
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, 6)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=INDEX(B1:C5, , 4)" })).toBe("#ERROR");
  });

  test("select single cell", () => {
    //prettier-ignore
    const grid = evaluateGrid({
      A1: "1",                B1: "Hello",            C1: "=SUM(A1:A3)",
      A2: "2",                B2: "Test",             C2: "=GT(A3,A1)",
      A3: "3",                B3: "string",           C3: "=CONCAT(B3,B2)",
      A5: "=INDEX(A1, 1, 1)", B5: "=INDEX(B1, 1, 1)", C5: "=INDEX(C1, 1, 1)",
    });
    expect(grid.A5).toBe(grid.A1);
    expect(grid.B5).toBe(grid.B1);
    expect(grid.C5).toBe(grid.C1);
  });

  test("select a full row (with empty col parameter)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
      A4: "=INDEX(A1:C3, 2)",
      A5: "=INDEX(A1:C3, 1)",
      A6: "=INDEX(A1:C3, 3)"
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A4").value).toBe("A2");
    expect(getEvaluatedCell(model, "B4").value).toBe("B2");
    expect(getEvaluatedCell(model, "C4").value).toBe("C2");
    expect(getEvaluatedCell(model, "A5").value).toBe("A1");
    expect(getEvaluatedCell(model, "B5").value).toBe("B1");
    expect(getEvaluatedCell(model, "C5").value).toBe("C1");
    expect(getEvaluatedCell(model, "A6").value).toBe("A3");
    expect(getEvaluatedCell(model, "B6").value).toBe("B3");
    expect(getEvaluatedCell(model, "C6").value).toBe("C3");
    expect(getEvaluatedCell(model, "A7").value).toBe(null);
  });

  test("select a full row (with 0 as col parameter)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
      A4: "=INDEX(A1:C3, 2, 0)",
      A5: "=INDEX(A1:C3, 1, 0)",
      A6: "=INDEX(A1:C3, 3, 0)"
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A4").value).toBe("A2");
    expect(getEvaluatedCell(model, "B4").value).toBe("B2");
    expect(getEvaluatedCell(model, "C4").value).toBe("C2");
    expect(getEvaluatedCell(model, "A5").value).toBe("A1");
    expect(getEvaluatedCell(model, "B5").value).toBe("B1");
    expect(getEvaluatedCell(model, "C5").value).toBe("C1");
    expect(getEvaluatedCell(model, "A6").value).toBe("A3");
    expect(getEvaluatedCell(model, "B6").value).toBe("B3");
    expect(getEvaluatedCell(model, "C6").value).toBe("C3");
    expect(getEvaluatedCell(model, "A7").value).toBe(null);
  });

  test("select a full column (with empty row parameter", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
      A4: "=INDEX(A1:C3, , 2)",
      B4: "=INDEX(A1:C3, , 1)",
      C4: "=INDEX(A1:C3, , 3)"
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A4").value).toBe("B1");
    expect(getEvaluatedCell(model, "A5").value).toBe("B2");
    expect(getEvaluatedCell(model, "A6").value).toBe("B3");
    expect(getEvaluatedCell(model, "B4").value).toBe("A1");
    expect(getEvaluatedCell(model, "B5").value).toBe("A2");
    expect(getEvaluatedCell(model, "B6").value).toBe("A3");
    expect(getEvaluatedCell(model, "C4").value).toBe("C1");
    expect(getEvaluatedCell(model, "C5").value).toBe("C2");
    expect(getEvaluatedCell(model, "C6").value).toBe("C3");
    expect(getEvaluatedCell(model, "D5").value).toBe(null);
  });

  test("select a full column (with 0 as row parameter", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
      A4: "=INDEX(A1:C3, 0, 2)",
      B4: "=INDEX(A1:C3, 0, 1)",
      C4: "=INDEX(A1:C3, 0, 3)"
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A4").value).toBe("B1");
    expect(getEvaluatedCell(model, "A5").value).toBe("B2");
    expect(getEvaluatedCell(model, "A6").value).toBe("B3");
    expect(getEvaluatedCell(model, "B4").value).toBe("A1");
    expect(getEvaluatedCell(model, "B5").value).toBe("A2");
    expect(getEvaluatedCell(model, "B6").value).toBe("A3");
    expect(getEvaluatedCell(model, "C4").value).toBe("C1");
    expect(getEvaluatedCell(model, "C5").value).toBe("C2");
    expect(getEvaluatedCell(model, "C6").value).toBe("C3");
    expect(getEvaluatedCell(model, "D5").value).toBe(null);
  });

  test("select the whole range", () => {
    const grid = {
      A1: "A1",
      B1: "B1",
      C1: "C1",
      A2: "A2",
      B2: "B2",
      C2: "C2",
      A3: "A3",
      B3: "B3",
      C3: "C3",
      A4: "=INDEX(A1:C3)",
    };
    const model = createModelFromGrid(grid);
    expect(getEvaluatedCell(model, "A4").value).toBe("A1");
    expect(getEvaluatedCell(model, "B4").value).toBe("B1");
    expect(getEvaluatedCell(model, "C4").value).toBe("C1");
    expect(getEvaluatedCell(model, "D4").value).toBe(null);
    expect(getEvaluatedCell(model, "A5").value).toBe("A2");
    expect(getEvaluatedCell(model, "B5").value).toBe("B2");
    expect(getEvaluatedCell(model, "C5").value).toBe("C2");
    expect(getEvaluatedCell(model, "A6").value).toBe("A3");
    expect(getEvaluatedCell(model, "B6").value).toBe("B3");
    expect(getEvaluatedCell(model, "C6").value).toBe("C3");
    expect(getEvaluatedCell(model, "A7").value).toBe(null);
  });

  test("take format into account", () => {
    //prettier-ignore
    const grid = {
      A1: "12/12/12", B1: "42%",
      A2: "3€",       B2: "3%",
    };
    expect(evaluateCellFormat("A4", { A4: "=INDEX(A1:B2, 2, 1)", ...grid })).toBe("#,##0[$€]");
    expect(evaluateCellFormat("B4", { B4: "=INDEX(A1:B2, 1, 2)", ...grid })).toBe("0%");
  });

  test("INDEX accept errors in the first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "2", B1: "42",
      A2: "1", B2: "=KABOUM", 
    };
    expect(evaluateCell("A3", { A3: "=INDEX(A1:B2, 1, 2)", ...grid })).toBe(42);
    expect(evaluateCell("A3", { A3: "=INDEX(A1:B2, 2, 2)", ...grid })).toBe("#BAD_EXPR");
  });
});

describe("INDIRECT formula", () => {
  test("Check argument validity", () => {
    expect(evaluateCell("A1", { A1: "=INDIRECT()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=INDIRECT("B1", "string")' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=INDIRECT("B1", false)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=INDIRECT("R1C1", true)' })).toBe("#REF");
    expect(evaluateCell("A1", { A1: '=INDIRECT("wrong_reference")' })).toBe("#REF");
    expect(evaluateCell("A1", { A1: "=INDIRECT(,true)" })).toBe("#REF");
  });

  test("INDIRECT detect circular error", () => {
    const grid = evaluateGrid({
      A1: "A2",
      A2: "=INDIRECT(A1)",
      A3: '=INDIRECT("A3")',
    });
    expect(grid.A2).toBe("#CYCLE");
    expect(grid.A3).toBe("#CYCLE");
  });

  test("functional test without grid context", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "kikoulol");
    expect(model.getters.evaluateFormula(sheetId, "=INDIRECT()")).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(model.getters.evaluateFormula(sheetId, '=INDIRECT("A1")')).toBe("kikoulol");
  });

  test("Using address string as reference (A1 notation)", () => {
    const grid = evaluateGrid({
      A1: "1",
      A2: "A2",
      A4: '=INDIRECT("A1")',
      A5: '=INDIRECT("A2")',
    });
    expect(grid.A4).toBe(1);
    expect(grid.A5).toBe("A2");
  });

  test("Using cell content as reference (A1 notation)", () => {
    const grid = evaluateGrid({
      A1: "1",
      A2: "A1",
      A3: "A2",
      A4: "=INDIRECT(A2)",
      A5: "=INDIRECT(A3)",
    });
    expect(grid.A4).toBe(1);
    expect(grid.A5).toBe("A1");
  });

  test("Using computation result as reference (A1 notation)", () => {
    const grid = evaluateGrid({
      A1: "1",
      A2: "A2",
      A4: '=INDIRECT("A"&ROW(B1))',
      A5: '=INDIRECT(CONCAT("A","2"))',
    });
    expect(grid.A4).toBe(1);
    expect(grid.A5).toBe("A2");
  });

  test("Reference to a cell as a function argument (A1 notation)", () => {
    const grid = evaluateGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: '=MAX(INDIRECT("A1"),0)',
      A5: '=INDIRECT("A2")*INDIRECT("A3")',
    });
    expect(grid.A4).toBe(1);
    expect(grid.A5).toBe(6);
  });

  test("Reference to a range as a function argument (A1 notation)", () => {
    const grid = evaluateGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: '=SUM(INDIRECT("A1:A3"))',
    });
    expect(grid.A4).toBe(6);
  });

  test("Dependencies are correctly evaluated", () => {
    const model = Model.BuildSync({
      sheets: [
        {
          cells: {
            A1: { content: '=INDIRECT("B1")' },
            B1: { content: "hello" },
            A2: { content: '=INDIRECT("B2")' },
            B2: { content: "=1+1" },
          },
        },
      ],
    });
    expect(getCellContent(model, "A1")).toBe("hello");
    expect(getCellContent(model, "A2")).toBe("2");
  });

  test("Reference to a cell and range of a different sheet (A1 notation)", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sheet2", activate: true });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    activateSheet(model, sheetId);
    setCellContent(model, "A1", '=INDIRECT("sheet2!A1")');
    setCellContent(model, "A2", '=SUM(INDIRECT("sheet2!A1:A2"))');
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("3");
  });

  test("Cell are correctly updated when changing referenced cells value", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A2", '=INDIRECT("A1")');
    setCellContent(model, "A3", '=INDIRECT("A"&A1)');
    expect(getCellContent(model, "A2")).toBe("0");
    expect(getCellContent(model, "A3")).toBe("#REF");
    setCellContent(model, "A1", "1");
    expect(getCellContent(model, "A2")).toBe("1");
    expect(getCellContent(model, "A3")).toBe("1");
  });

  test("Error are correctly propagated", () => {
    const grid = evaluateGrid({
      A1: "=WRONG_FUNCTION_NAME()",
      A2: "=A2",
      A3: "=SQRT(-1)",
      A4: '=INDIRECT("A1")',
      A5: '=INDIRECT("A2")',
      A6: '=INDIRECT("A3")',
    });
    expect(grid.A4).toBe("#NAME?");
    expect(grid.A5).toBe("#CYCLE");
    expect(grid.A6).toBe("#ERROR");
  });
});

describe("OFFSET formula", () => {
  test("should check argument validity", () => {
    expect(evaluateCell("A1", { A1: "=OFFSET()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=OFFSET(,1,1,0,0)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, 'hola')" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, 0)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, -1, -1)" })).toBe("#REF");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, 0, 0, -1, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, 0, 0, 0, -1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1:C5, 0, 0, 0, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=OFFSET(Sheet100!A1:C5, , 0, -1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=OFFSET(A1, 0, 0)" })).toBe("#CYCLE");
  });

  test("can select a single cell", () => {
    const grid = evaluateGrid({
      A1: "A1",
      D4: "=OFFSET(A1, 0, 0)",
    });
    expect(grid.D4).toBe(grid.A1);
  });

  test("should select a zone with no offsets", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3", 
                                    D4: "=OFFSET(A1:C3,0,0)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D4:F6")).toEqual([
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["A3", "B3", "C3"],
    ]);
  });

  test("should select a zone with positive offsets", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",

                                    D5: "=OFFSET(A1:C3,1,1)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["B2", "C2", "0"],
      ["B3", "C3", "0"],
      ["0",  "0",  "0"],
    ]);
    setCellContent(model, "B2", "Hola");
    expect(getEvaluatedCell(model, "D5").value).toBe("Hola");
  });

  test("should select a zone with negative offsets", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",

                                    D5: "=OFFSET(B2:C3,-1,-1)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["A1", "B1", ""],
      ["A2", "B2", ""],
      ["",    "",  ""],
    ]);
    setCellContent(model, "A1", "Hola");
    expect(getEvaluatedCell(model, "D5").value).toBe("Hola");
  });

  test("select a full row (with empty col parameter)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3", 
                                    D5: "=OFFSET(A1:C3,2,,1,3)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["A3", "B3", "C3"],
      ["",    "",    ""],
      ["",    "",    ""],
    ]);
  });

  test("select a full row (with 0 as col parameter)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3", 
                                    D5: "=OFFSET(A1:C3,2,0,1,3)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["A3", "B3", "C3"],
      ["",    "",    ""],
      ["",    "",    ""],
    ]);
  });

  test("select a full column (with empty row parameter", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3", 
                                    D5: "=OFFSET(A1:C3,,2,3,1)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["C1", "", ""],
      ["C2", "", ""],
      ["C3", "", ""],
    ]);
  });

  test("select a full column (with 0 as row parameter", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3", 
                                    D5: "=OFFSET(A1:C3,0,2,3,1)",
    };
    const model = createModelFromGrid(grid);
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D5:F7")).toEqual([
      ["C1", "", ""],
      ["C2", "", ""],
      ["C3", "", ""],
    ]);
  });

  test("should select a zone from another sheet", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
    };
    const model = createModelFromGrid(grid);
    createSheet(model, { sheetId: "Sheet2" });
    setCellContent(model, "D4", "=OFFSET(Sheet1!A1:C3,0,0)", "Sheet2");
    //prettier-ignore
    expect(getEvaluatedGrid(model, "D4:F6", "Sheet2")).toEqual([
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["A3", "B3", "C3"],
    ]);
    setCellContent(model, "A1", "hola", "Sheet1");
    expect(getEvaluatedCell(model, "D4", "Sheet2").value).toBe("hola");
  });
});
