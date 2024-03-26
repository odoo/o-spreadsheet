import { evaluateCell, evaluateGrid } from "../test_helpers/helpers";

describe("database formula", () => {
  // prettier-ignore
  const database = {
        A1:  "NAME"          , B1:  "FILM"                , C1:  "YEAR", D1:  "SCORE",
        A2:  "Jean Rochefort", B2:  "Un éléphant ça ..."  , C2:  "1976", D2:  "0.71" ,
        A3:  "Jean Benguigui", B3:  "Bufffet froid"       , C3:  "1976", D3:  "0.75" ,
        A4:  "Jean Dujardin" , B4:  "The Artist"          , C4:  "2011", D4:  "0.95" ,
        A5:  "Jean Ferrat"   , B5:  "Vivre sa vie"        , C5:  "1962", D5:  "0.8"  ,
        A6:  "Jean Gabin"    , B6:  "Le jour se lève"     , C6:  "1939", D6:  "0.78" ,
        A7:  "Jean Marais"   , B7:  "Fantômas"            , C7:  "1964", D7:  "0.7"  ,
        A8:  "Jean Reno"     , B8:  "Le Grand Bleu"       , C8:  "1988", D8:  "0.76" ,
        A9:  "Jean Rochefort", B9:  "Le Mari de la coi...", C9:  "1990", D9:  "0.73" ,
        A10: "Jean Benguigui", B10: "Coco"                , C10: "2009", D10: "0.28" ,
        A11: "Jean Reno"     , B11: "Léon"                , C11: "1994", D11: "0.75" ,
        A12: "Jean Lassalle" ,
        A13: "Jean Benguigui", B13: "Astérix et Obélix...", C13: "2002", D13: "0.86" ,
        A14: "Jean Benguigui", B14: "Les Fugitifs"        , C14: "1986", D14: "0.64" ,
        A15: "Jean Reno"     , B15: "Les Visiteurs"       , C15: "1993", D15: "0.71" ,
        A16: "Jean Gabin"    , B16: "La Bête humaine"     , C16: "1938", D16: "0.76" ,
        A17: "Jean Ferrat"   , B17: "La Vieille dame ..." , C17: "1965", D17: "0.7"
    }

  describe("DCOUNT formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const gridDcount = {
          A20: "YEAR",
          A21: "1976",    B21: '=DCOUNT(A1:D17, "YEAR", A20:A21)',

                          B24: '=DCOUNT(A1:D17, "YEAR", A23:A24)',

          A27: "1976",    B27: '=DCOUNT(A1:D17, "YEAR", A26:A27)',

          A29: "YEAR",
                          B30: '=DCOUNT(A1:D17, "YEAR", A29:A30)',

          A32: "TEST",
          A33: "2"   ,    B33: '=DCOUNT(A1:D17, "YEAR", A32:A33)',

          A35: "TEST",
                          B36: '=DCOUNT(A1:D17, "YEAR", A35:A36)',

          A39: "2"   ,    B39: '=DCOUNT(A1:D17, "YEAR", A38:A39)',

          A41: "FILM",
          A42: "Léon",    B42: '=DCOUNT(A1:D17, "FILM", A41:A42)',

          A44: "year"  ,  B44: "year" ,
          A45: "<>1965",  B45: ">1940", C45: '=DCOUNT(A1:D17, "YEAR", A44:B45)',

          A47: "NAME"  ,
          A48: "Jean R",  B48: '=DCOUNT(A1:D17, "YEAR", A47:A48)',

          A50: "NAME"   ,
          A51: "Jean Re", B51: '=DCOUNT(A1:D17, "YEAR", A50:A51)',

          A53: "NAME"  ,
          A54: "Jean R",  B54: '=DCOUNT(A1:D17, C1, A53:A54)',

          A56: "NAME"  ,
          A57: "Jean R",  B57: '=DCOUNT(A1:D17, 3, A56:A57)',

          A59: "1"     ,
          A60: "Jean R",  B60: '=DCOUNT(A1:D17, "YEAR", A59:A60)',

          A62: "SCORE",   B62: "SCORE",
          A63: "0.71" ,   B63: "0.7"  , C63: '=DCOUNT(A1:D17, "YEAR", A62:B63)',

          A65: "SCORE",
          A66: "0.71" ,
          A67: "0.7"  ,   B67: '=DCOUNT(A1:D17, "YEAR", A65:A67)',

          A69: "SCORE",
          A70: ">0.7" ,   B70: '=DCOUNT(A1:D17, "YEAR", A69:A70)',

          A72: "SCORE",
          A73: ">0.7" ,
          A74: ">0.71",   B74: '=DCOUNT(A1:D17, "YEAR", A72:A74)',

          A76: "NAME"  ,
          A77: "JEAN R",  B77: '=DCOUNT(A1:D17, 4.9, A76:A77)',

          A79: "SCORE",   B79: "YEAR"
                      ,   B80: "1976",
          A81: "0.7"  ,              C81: '=DCOUNT(A1:D17, "YEAR", A79:B81)',

          A83: "SCORE",   B83: "TEST"
                      ,   B84: "1976",
          A85: "0.7"  ,              C85: '=DCOUNT(A1:D17, "YEAR", A83:B85)',

        };

      const gridResult = evaluateGrid({ ...database, ...gridDcount });

      expect(gridResult.B21).toBe(2);
      expect(gridResult.B24).toBe(15);
      expect(gridResult.B27).toBe(0);
      expect(gridResult.B30).toBe(15);
      expect(gridResult.B33).toBe(0);
      expect(gridResult.B36).toBe(15);
      expect(gridResult.B39).toBe(0);
      expect(gridResult.B42).toBe(0);
      expect(gridResult.C45).toBe(12);
      expect(gridResult.B48).toBe(5);
      expect(gridResult.B51).toBe(3);
      expect(gridResult.B54).toBe(5);
      expect(gridResult.B57).toBe(5);
      expect(gridResult.B60).toBe(0);
      expect(gridResult.C63).toBe(0);
      expect(gridResult.B67).toBe(4);
      expect(gridResult.B70).toBe(11);
      expect(gridResult.B74).toBe(11);
      expect(gridResult.B77).toBe(5);
      expect(gridResult.C81).toBe(4);
      expect(gridResult.C85).toBe(2);
    });
  });

  // prettier-ignore
  const criteria = {
        F1: "YEAR",
        F2: "1976",

        F4: "FILM",
        F5: "Léon",

        F7: "SCORE",
        F8: ">0.7",
        F9: "0.28",

        F11: "SCORE", G11: "YEAR",
                      G12: "1976",
        F13: "0.7"  , G13: "1964",
    }

  describe("DAVERAGE formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DAVERAGE(A1:D17, "SCORE", F1:F2)',
          A21: '=DAVERAGE(A1:D17, "SCORE", F4:F5)',
          A22: '=DAVERAGE(A1:D17, "YEAR", F7:F9)',
          A23: '=DAVERAGE(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(0.73);
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBe(1981.5);
      expect(gridResult.A23).toBe(1972);
    });
  });

  describe("DCOUNTA formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DCOUNTA(A1:D17, "SCORE", F1:F2)',
          A21: '=DCOUNTA(A1:D17, "SCORE", F4:F5)',
          A22: '=DCOUNTA(A1:D17, "NAME", F7:F9)',
          A23: '=DCOUNTA(A1:D17, "NAME", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(2);
      expect(gridResult.A21).toBe(1);
      expect(gridResult.A22).toBe(12);
      expect(gridResult.A23).toBe(3);
    });
  });

  describe("DGET formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DGET(A1:D17, "SCORE", F1:F2)',
          A21: '=DGET(A1:D17, "SCORE", F4:F5)',
          A22: '=DGET(A1:D17, "YEAR", F7:F9)',
          A23: '=DGET(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(gridResult.A23).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });
  });

  describe("DMAX formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DMAX(A1:D17, "SCORE", F1:F2)',
          A21: '=DMAX(A1:D17, "SCORE", F4:F5)',
          A22: '=DMAX(A1:D17, "YEAR", F7:F9)',
          A23: '=DMAX(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(0.75);
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBe(2011);
      expect(gridResult.A23).toBe(1976);
    });
  });

  describe("DMIN formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DMIN(A1:D17, "SCORE", F1:F2)',
          A21: '=DMIN(A1:D17, "SCORE", F4:F5)',
          A22: '=DMIN(A1:D17, "YEAR", F7:F9)',
          A23: '=DMIN(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(0.71);
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBe(1938);
      expect(gridResult.A23).toBe(1964);
    });
  });

  describe("DPRODUCT formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DPRODUCT(A1:D17, "SCORE", F1:F2)',
          A21: '=DPRODUCT(A1:D17, "SCORE", F4:F5)',
          A22: '=DPRODUCT(A1:D17, "SCORE", F7:F9)',
          A23: '=DPRODUCT(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(0.5325);
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBeCloseTo(0.01707, 5);
      expect(gridResult.A23).toBe(7668587264);
    });
  });

  describe("DSTDEV formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DSTDEV(A1:D17, "SCORE", F1:F2)',
          A21: '=DSTDEV(A1:D17, "SCORE", F4:F5)',
          A22: '=DSTDEV(A1:D17, "YEAR", F7:F9)',
          A23: '=DSTDEV(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBeCloseTo(0.02828, 5);
      expect(gridResult.A21).toBe("#DIV/0!");
      expect(gridResult.A22).toBeCloseTo(24.47448, 5);
      expect(gridResult.A23).toBeCloseTo(6.9282, 5);
    });
  });

  describe("DSTDEVP formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DSTDEVP(A1:D17, "SCORE", F1:F2)',
          A21: '=DSTDEVP(A1:D17, "SCORE", F4:F5)',
          A22: '=DSTDEVP(A1:D17, "YEAR", F7:F9)',
          A23: '=DSTDEVP(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBeCloseTo(0.02);
      expect(gridResult.A21).toBe(0);
      expect(gridResult.A22).toBeCloseTo(23.43253, 5);
      expect(gridResult.A23).toBeCloseTo(5.65685, 5);
    });
  });

  describe("DSUM formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DSUM(A1:D17, "SCORE", F1:F2)',
          A21: '=DSUM(A1:D17, "SCORE", F4:F5)',
          A22: '=DSUM(A1:D17, "YEAR", F7:F9)',
          A23: '=DSUM(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBe(1.46);
      expect(gridResult.A21).toBe(0.75);
      expect(gridResult.A22).toBe(23778);
      expect(gridResult.A23).toBe(5916);
    });
  });

  describe("DVAR formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DVAR(A1:D17, "SCORE", F1:F2)',
          A21: '=DVAR(A1:D17, "SCORE", F4:F5)',
          A22: '=DVAR(A1:D17, "YEAR", F7:F9)',
          A23: '=DVAR(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBeCloseTo(0.0008, 4);
      expect(gridResult.A21).toBe("#DIV/0!");
      expect(gridResult.A22).toBe(599);
      expect(gridResult.A23).toBe(48);
    });
  });

  describe("DVAR formula", () => {
    test("functional tests on cell arguments", () => {
      // prettier-ignore
      const grid = {
          A20: '=DVARP(A1:D17, "SCORE", F1:F2)',
          A21: '=DVARP(A1:D17, "SCORE", F4:F5)',
          A22: '=DVARP(A1:D17, "YEAR", F7:F9)',
          A23: '=DVARP(A1:D17, "YEAR", F11:G13)',
        };

      const gridResult = evaluateGrid({ ...database, ...criteria, ...grid });
      expect(gridResult.A20).toBeCloseTo(0.0004, 4);
      expect(gridResult.A21).toBe(0);
      expect(gridResult.A22).toBeCloseTo(549.08333, 5);
      expect(gridResult.A23).toBe(32);
    });
  });

  test("database formulas accepts errors in first argument", () => {
    // prettier-ignore
    const grid = {
        A1: "Name", B1: "Age",
        A2: "Peter", B2: "20",
        A3: "=KABOUM", B3: "20",
        A4: "Peter", B4: "26",
        A5: "John", B5: "=KABOUM",

        A6: "Name", B6: "Age",
        A7: "Peter",
      };

    expect(evaluateCell("A10", { A10: '=DAVERAGE(A1:B5, "Age", A6:B7)', ...grid })).toBe(23);
  });
});
