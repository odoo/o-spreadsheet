import { evaluateCell, evaluateGrid } from "../helpers";
import { toNumber } from "../../src/functions/helpers";

describe("math", () => {
  //----------------------------------------------------------------------------
  // CEILING / CEILING.MATH / CEILING.PRECISE / ISO.CEILING
  //----------------------------------------------------------------------------

  test.each([
    ["0", 0],
    ["6", 6],
    ["-6", -6],
    ["6.7", 7],
    ["7.89", 8],
    ["-6.7", -6],
    ["-7.89", -7],
  ])("CEILING FUNCTIONS(%s) - %s: take 1 parameters, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=CEILING(A2)", A2: a })).toBe(expected);
    expect(evaluateCell("A1", { A1: "=CEILING.MATH(A2)", A2: a })).toBe(expected);
    expect(evaluateCell("A1", { A1: "=CEILING.PRECISE(A2)", A2: a })).toBe(expected);
    expect(evaluateCell("A1", { A1: "=ISO.CEILING(A2)", A2: a })).toBe(expected);
  });

  test.each([
    ["0", "0", 0],
    ["0", "0.1", 0],
    ["0", "-4", 0],
    ["6", "0", 0],
    ["6.7", "0", 0],
    ["-6", "0", 0],
    ["6", "0.1", 6],
    ["-6", "0.1", -6],
    ["6", "0.7", 6.3],
    ["-6", "0.7", -5.6],
    ["6.7", "0.2", 6.8],
    ["-6.7", "0.2", -6.6],
  ])("CEILING FUNCTIONS(%s, %s) - %s: take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=CEILING(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
    expect(evaluateCell("A1", { A1: "=CEILING.MATH(A2, A3)", A2: a, A3: b })).toBeCloseTo(
      expected,
      9
    );
    expect(evaluateCell("A1", { A1: "=CEILING.PRECISE(A2, A3)", A2: a, A3: b })).toBeCloseTo(
      expected,
      9
    );
    expect(evaluateCell("A1", { A1: "=ISO.CEILING(A2, A3)", A2: a, A3: b })).toBeCloseTo(
      expected,
      9
    );
  });

  test.each([
    ["0", "0.2", 0],
    ["0", "-0.2", 0],
    ["7.89", "0.2", 8],
    ["7.89", "-0.2", 8],
    ["-7.89", "0.2", -7.8],
    ["-7.89", "-0.2", -7.8],
  ])(
    "CEILING (MATH/PRECISE/ISO) FUNCTIONS(%s, %s) - %s: no effect with negative factor",
    (a, b, expected) => {
      expect(evaluateCell("A1", { A1: "=CEILING.MATH(A2, A3)", A2: a, A3: b })).toBeCloseTo(
        expected,
        9
      );
      expect(evaluateCell("A1", { A1: "=CEILING.PRECISE(A2, A3)", A2: a, A3: b })).toBeCloseTo(
        expected,
        9
      );
      expect(evaluateCell("A1", { A1: "=ISO.CEILING(A2, A3)", A2: a, A3: b })).toBeCloseTo(
        expected,
        9
      );
    }
  );

  test.each([
    ["6", "-0.2"],
    ["7.89", "-0.2"],
  ])("CEILING(%s, %s) - error: if value positive, factor can't be negative", (a, b) => {
    expect(evaluateCell("A1", { A1: "=CEILING(A2, A3)", A2: a, A3: b })).toBe("#ERROR");
  });

  test.each([
    // Concerning CEILING function
    // if "a" is negative and "b" is negative, rounds a number down (and not up)
    // the nearest integer multiple of b
    ["-7.89", "0.2", -7.8],
    ["-7.89", "-0.2", -8],
  ])("CEILING(%s, %s) - %s: if factor negative, rounds number down", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=CEILING(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
  });

  test.each([
    // Concerning CEILING.MATH function
    // if "a" is negative and "c" different 0, rounds a number down (and not up)
    // the nearest integer multiple of b
    ["7.89", "0.2", "0", 8],
    ["7.89", "0.2", "1", 8],
    ["-7.89", "0.2", "0", -7.8],
    ["-7.89", "0.2", "1", -8],
    ["-7.89", "0.2", "2.2", -8],
    ["-7.89", "0.2", "-2.2", -8],
    ["-7.89", "-0.2", "0", -7.8],
    ["-7.89", "-0.2", "1", -8],
    ["-7.89", "-0.2", "2.2", -8],
    ["-7.89", "-0.2", "-2.2", -8],
  ])("CEILING.MATH(%s, %s, %s) - %s: take 3 parameters, return a number", (a, b, c, expected) => {
    expect(
      evaluateCell("A1", { A1: "=CEILING.MATH(A2, A3, A4)", A2: a, A3: b, A4: c })
    ).toBeCloseTo(expected, 9);
  });

  function evaluateCeilingFunction(functionName: string): void {
    expect(evaluateCell("A1", { A1: "=" + functionName + "()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , )" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, 0.2)" })).toBeCloseTo(-7.8, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , 0.2)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, )" })).toBeCloseTo(0, 9); // @compatibility: on google sheets, return -7
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, TRUE)" })).toBeCloseTo(-7, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, FALSE)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(TRUE, 10)" })).toBeCloseTo(10, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(FALSE, 10)" })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=" + functionName + '("" , "")' })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + '(" " , " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=" + functionName + '("-7.89", "0.2")' })).toBeCloseTo(
      -7.8,
      9
    );

    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "", A3: "" })).toBeCloseTo(
      0,
      9
    );
    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: " ", A3: " " })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "0.2" })
    ).toBeCloseTo(-7.8, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "", A3: "0.2" })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "" })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "TRUE" })
    ).toBeCloseTo(-7, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "FALSE" })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "TRUE", A3: "10" })
    ).toBeCloseTo(10, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "FALSE", A3: "10" })
    ).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '""', A3: '""' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '" "', A3: '" "' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '"-7.89"', A3: '"0.2"' })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '=""', A3: '=""' })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '=" "', A3: '=" "' })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '="-7.89"', A3: '="0.2"' })
    ).toBeCloseTo(-7.8, 9);
  }

  test.each([["CEILING"], ["CEILING.MATH"], ["CEILING.PRECISE"], ["ISO.CEILING"]])(
    "%s: special value testing",
    (functionName) => {
      evaluateCeilingFunction(functionName);
    }
  );

  //----------------------------------------------------------------------------
  // COS
  //----------------------------------------------------------------------------

  test.each([
    ["0", 1],
    ["=PI()", -1],
    ["=PI()*2", 1],
    ["=PI()/2", 0],
    ["=PI()/3", 0.5],
    ["=-PI()/2", 0],
  ])("COS(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test("COS: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=COS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=COS(TRUE)" })).toBeCloseTo(0.54030230586814, 9);
    expect(evaluateCell("A1", { A1: "=COS(FALSE)" })).toBeCloseTo(1, 9);

    expect(evaluateCell("A1", { A1: '=COS("")' })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: '=COS(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=COS("0")' })).toBeCloseTo(1, 9);

    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: "" })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: "0" })).toBeCloseTo(1, 9);

    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '=""' })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: '="0"' })).toBeCloseTo(1, 9);
  });

  //----------------------------------------------------------------------------
  // COUNTBLANK
  //----------------------------------------------------------------------------

  test("COUNTBLANK: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=COUNTBLANK()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(,)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(FALSE)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=COUNTBLANK("")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=COUNTBLANK(" ")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=COUNTBLANK("hello there")' })).toBe(0);

    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: "TRUE" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: "FALSE" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '"42"' })).toBe(0);

    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '=""' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=COUNTBLANK(A2)", A2: '="42"' })).toBe(0);
  });

  // prettier-ignore
  test("COUNTBLANK: count blank on ranges ", () => {
    const grid = {
      
      B1: "=COUNTBLANK(D1:I2)",
      C1: "=COUNTBLANK(D1:I1)",
      C2: "=COUNTBLANK(D2:I2)",

      D1: "0", E1: "1", F1: "2",  G1: "",      H1: '""',   I1: "",
      D2: "",  E2: "",  F2: '""', G2: "FALSE", H2: "TRUE", I2: "42",

      A2: "=COUNTBLANK(A4:B9)",
      A3: "=COUNTBLANK(A4:A9)", B3: "=COUNTBLANK(B4:B9)",

      A4: "0",  B4: "",
      A5: "1",  B5: "",
      A6: "2",  B6: '""',
      A7: "",   B7: "FALSE",
      A8: '""', B8: "TRUE",
      A9: "",   B9: "42",
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.B1).toBe(4);
    expect(gridResult.C1).toBe(2);
    expect(gridResult.C2).toBe(2);
    expect(gridResult.A2).toBe(4);
    expect(gridResult.A3).toBe(2);
    expect(gridResult.B3).toBe(2);
  });

  //----------------------------------------------------------------------------
  // COUNTUNIQUE
  //----------------------------------------------------------------------------

  test("COUNTUNIQUE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=countunique()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=countunique(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=countunique(0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(1, 2, 3, 1, 2)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=countunique(1,  , 2,  , 3)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=countunique(1.5, 1.4)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique("Jean Saisrien", "Jean Prendnote")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=countunique(" ")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique("2", "-2")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique("2", "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique("2", " ")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(TRUE, FALSE)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique(1, "1", TRUE)' })).toBe(3);
  });

  test("COUNTUNIQUE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=countunique(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=countunique(A2)", A2: " " })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2)", A2: "," })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3, A4)", A2: "1", A3: "", A4: "1" })).toBe(
      1
    );
    expect(
      evaluateCell("A1", {
        A1: "=countunique(A2, A3, A4)",
        A2: "1.4",
        A3: "-1",
        A4: "Jean Peuxplus",
      })
    ).toBe(3);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: " ", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "", A3: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: " ", A3: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "  ", A3: '=" "' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: " ", A3: '="  "' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "42", A3: "42" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "42", A3: '"42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "42", A3: "=42" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "42", A3: '="42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: '"42"', A3: '"42"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: '"42"', A3: "=42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: '"42"', A3: '="42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "=42", A3: "=42" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: "=42", A3: '="42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, A3)", A2: '="42"', A3: '="42"' })).toBe(1);
  });

  test("COUNTUNIQUE: functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=countunique(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=countunique(A2,)", A2: " " })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=countunique(A2,)", A2: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "")', A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "")', A2: " " })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "")', A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "")', A2: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, " ")', A2: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, " ")', A2: " " })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, " ")', A2: '=""' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(A2, " ")', A2: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=countunique(42, "42")' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, 42)", A2: "42" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, 42)", A2: '"42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, 42)", A2: "=42" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, 42)", A2: '="42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "42")', A2: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "42")', A2: '"42"' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "42")', A2: "=42" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=countunique(A2, "42")', A2: '="42"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=countunique(A2, TRUE)", A2: "1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, TRUE)", A2: '"1"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, TRUE)", A2: "=1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=countunique(A2, TRUE)", A2: '="1"' })).toBe(2);
  });

  test("COUNTUNIQUE: functional tests on range arguments", () => {
    const grid = {
      A1: "=COUNTUNIQUE(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=COUNTUNIQUE(B2:E2)",
      A3: "=COUNTUNIQUE(B3:E3)",
      A4: "=COUNTUNIQUE(B4:E4)",

      B1: "=COUNTUNIQUE(B2:B4)",
      C1: "=COUNTUNIQUE(C2:C4)",
      D1: "=COUNTUNIQUE(D2:D4)",
      E1: "=COUNTUNIQUE(E2:E4)",

      B2: "=3",
      C2: "3",
      D2: '"3"',
      E2: '="3"',

      B3: '=" "',
      C3: "0",
      D3: "Jean Registre",
      E3: '"Jean Titouplin"',

      B4: " ",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe(9);
    expect(gridResult.A2).toBe(3);
    expect(gridResult.A3).toBe(4);
    expect(gridResult.A4).toBe(3);
    expect(gridResult.B1).toBe(2);
    expect(gridResult.C1).toBe(3);
    expect(gridResult.D1).toBe(2);
    expect(gridResult.E1).toBe(3);
  });

  //----------------------------------------------------------------------------
  // DECIMAL
  //----------------------------------------------------------------------------

  test.each([
    ["0", "2", 0],
    ["0", "4", 0],
    ["0", "36", 0],
    ["1010", "2", 10],
    ["1010", "4", 68],
    ["1010", "36", 46692],
    ["2020", "36", 93384],
    ["3030", "4", 204],
    ["-1010", "16", -4112], // @compatibility: return error on parameter 1 on google sheets
    ["ABAB", "16", 43947],
    ["ABAB", "36", 481187],
    ["A1A1", "16", 41377],
    ["a1a1", "16", 41377],
    ["a1a1", "36", 468217],
    ["-ABAB", "16", -43947], // @compatibility: return error on parameter 1 on google sheets
    ["-ABAB", "36", -481187], // @compatibility: return error on parameter 1 on google sheets
    ["zzzz", "36", 1679615],
  ])("DECIMAL(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["1010", "-1"],
    ["1010", "0"],
    ["1010", "0.1"],
    ["1010", "1"],
    ["1010", "37"],
    ["-", "2"],
    ["A-", "36"],
    ["@ABAB", "36"],
    ["AB AB", "36"],
  ])("DECIMAL(%s, %s) - error: take 2 parameter(s), return error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test.each([
    ["0.1", "2"],
    ["2020", "2"],
    ["-ABAB", "2"],
    ["-ABAB", "10"],
    ["ZZZZ", "16"],
    ["-", "36"],
    ["A-", "36"],
    ["@ABAB", "36"],
    ["ABAB@", "36"],
    ["ABAB.2", "36"],
    ["ABAB.21@", "36"],
    ["AB AB", "36"],
  ])("DECIMAL(%s, %s) - error: take 2 parameter(s), return error on parameter 1", (a, b) => {
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("DECIMAL: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=DECIMAL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DECIMAL( , )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(42, 12)" })).toBe(50);
    expect(evaluateCell("A1", { A1: "=DECIMAL( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DECIMAL(42, )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(42, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(42, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(TRUE, 10)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(FALSE, 10)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: '=DECIMAL("" , "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=DECIMAL("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DECIMAL(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=DECIMAL("42", 12)' })).toBe(50);
    expect(evaluateCell("A1", { A1: '=DECIMAL("42", "12")' })).toBe(50);
    expect(evaluateCell("A1", { A1: '=DECIMAL("42", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "", A3: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "42", A3: "12" })).toBe(50);
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "42", A3: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "42", A3: "TRUE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "42", A3: "FALSE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "42", A3: "FALSE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "TRUE", A3: "10" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: "FALSE", A3: "10" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: '="42"', A3: '="36"' })).toBe(146);
  });

  //----------------------------------------------------------------------------
  // DEGREES
  //----------------------------------------------------------------------------

  test.each([
    ["-5", -286.4788975654116], // @compatibility: on google sheets return -286.47889756541(2) and not (16)
    ["-3.14", -179.90874767107852], // @compatibility: on google sheets return -179.90874767107(9) and not (852)
    ["0", 0],
    ["3.14", 179.90874767107852], // @compatibility: on google sheets return 179.90874767107(9) and not (852)
    ["5", 286.4788975654116], // @compatibility: on google sheets return 286.47889756541(2) and not (16)
    ["=-PI()", -180],
    ["=PI()", 180],
    ["=PI() * 3", 540],
    ["3.141592653589793", 180],
    ["3.14159265358979", 179.99999999999983], // @compatibility: on google sheets return 180
    ["3.1415926535897", 179.99999999999466], // @compatibility: on google sheets return 179.99999999999(5) and not (466)
  ])("DEGREES(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: a })).toBe(expected);
  });

  test("DEGREES: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=DEGREES()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DEGREES(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DEGREES(PI())" })).toBe(180);
    expect(evaluateCell("A1", { A1: "=DEGREES(TRUE)" })).toBeCloseTo(57.29577951, 8);
    expect(evaluateCell("A1", { A1: "=DEGREES(FALSE)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=DEGREES("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DEGREES(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=DEGREES("hello there")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: "=PI()" })).toBe(180);
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: "TRUE" })).toBeCloseTo(57.29577951, 8);
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: "FALSE" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: '="0"' })).toBe(0);
  });

  //----------------------------------------------------------------------------
  // FLOOR / FLOOR.MATH / FLOOR.PRECISE
  //----------------------------------------------------------------------------

  test.each([
    ["0", 0],
    ["6", 6],
    ["6.7", 6],
    ["7.89", 7],
    ["-6", -6],
    ["-6.7", -7],
    ["-7.89", -8],
  ])("FLOOR FUNCTIONS(%s) - %s: take 1 parameters, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=FLOOR(A2)", A2: a })).toBe(expected);
    expect(evaluateCell("A1", { A1: "=FLOOR.MATH(A2)", A2: a })).toBe(expected);
    expect(evaluateCell("A1", { A1: "=FLOOR.PRECISE(A2)", A2: a })).toBe(expected);
  });

  test.each([
    ["0", "0", 0],
    ["0", "0.1", 0],
    ["0", "-4", 0],
    ["6", "0", 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    ["6.7", "0", 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    ["-6", "0", 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    ["6", "0.1", 6],
    ["-6", "0.1", -6],
    ["6", "0.7", 5.6],
    ["-6", "0.7", -6.3],
    ["6.7", "0.2", 6.6],
    ["-6.7", "0.2", -6.8],
  ])("FLOOR FUNCTIONS(%s, %s) - %s: take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=FLOOR(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected);
    expect(evaluateCell("A1", { A1: "=FLOOR.MATH(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected);
    expect(evaluateCell("A1", { A1: "=FLOOR.PRECISE(A2, A3)", A2: a, A3: b })).toBeCloseTo(
      expected
    );
  });

  test.each([
    ["0", "0.2", 0],
    ["0", "-0.2", 0],
    ["7.89", "0.2", 7.8],
    ["7.89", "-0.2", 7.8],
    ["-7.89", "0.2", -8],
    ["-7.89", "-0.2", -8],
  ])(
    "FLOOR (MATH/PRECISE) FUNCTIONS(%s, %s) - %s: no effect with negative factor",
    (a, b, expected) => {
      expect(evaluateCell("A1", { A1: "=FLOOR.MATH(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected);
      expect(evaluateCell("A1", { A1: "=FLOOR.PRECISE(A2, A3)", A2: a, A3: b })).toBeCloseTo(
        expected
      );
    }
  );

  test.each([
    ["6", "-0.2"],
    ["7.89", "-0.2"],
  ])("FLOOR(%s, %s) - error: if value positive, factor can't be negative", (a, b) => {
    expect(evaluateCell("A1", { A1: "=FLOOR(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test.each([
    // Concerning FLOOR function
    // if "a" is negative and "b" is negative, rounds a number up (and not down)
    // the nearest integer multiple of b
    ["-7.89", "0.2", -8],
    ["-7.89", "-0.2", -7.8],
  ])("FLOOR(%s, %s) - %s: if factor negative, rouds number down", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=FLOOR(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
  });

  test.each([
    // Concerning FLOOR.MATH function
    // if "a" is negative and "c" different 0, rounds a number up (and not down)
    // the nearest integer multiple of b
    ["7.89", "0.2", "0", 7.8],
    ["7.89", "0.2", "1", 7.8],
    ["-7.89", "0.2", "0", -8],
    ["-7.89", "0.2", "1", -7.8],
    ["-7.89", "0.2", "2.2", -7.8],
    ["-7.89", "0.2", "-2.2", -7.8],
    ["-7.89", "-0.2", "0", -8],
    ["-7.89", "-0.2", "1", -7.8],
    ["-7.89", "-0.2", "2.2", -7.8],
    ["-7.89", "-0.2", "-2.2", -7.8],
  ])("FLOOR.MATH(%s, %s, %s) - %s: take 3 parameters, return a number", (a, b, c, expected) => {
    expect(evaluateCell("A1", { A1: "=FLOOR.MATH(A2, A3, A4)", A2: a, A3: b, A4: c })).toBeCloseTo(
      expected,
      9
    );
  });

  function evaluateFloorFunction(functionName: string): void {
    expect(evaluateCell("A1", { A1: "=" + functionName + "()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , )" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, 0.2)" })).toBeCloseTo(-8, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , 0.2)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, )" })).toBeCloseTo(0, 9); // @compatibility: on google sheets, return -8
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, TRUE)" })).toBeCloseTo(-8, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, FALSE)" })).toBeCloseTo(0, 9); // @compatibility on google sheets: concerning basic floor function, return error div by 0
    expect(evaluateCell("A1", { A1: "=" + functionName + "(TRUE, 10)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(FALSE, 10)" })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=" + functionName + '("" , "")' })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + '(" " , " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=" + functionName + '("-7.89", "0.2")' })).toBeCloseTo(-8, 9);

    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "", A3: "" })).toBeCloseTo(
      0,
      9
    );
    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: " ", A3: " " })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "0.2" })
    ).toBeCloseTo(-8, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "", A3: "0.2" })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "" })
    ).toBeCloseTo(0, 9); // @compatibility on google sheets: concerning basic floor function, return error div by 0
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "TRUE" })
    ).toBeCloseTo(-8, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "-7.89", A3: "FALSE" })
    ).toBeCloseTo(0, 9); // @compatibility on google sheets: concerning basic floor function, return error div by 0
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "TRUE", A3: "10" })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: "FALSE", A3: "10" })
    ).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '""', A3: '""' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '" "', A3: '" "' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '"-7.89"', A3: '"0.2"' })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '=""', A3: '=""' })
    ).toBeCloseTo(0, 9);
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '=" "', A3: '=" "' })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=" + functionName + "(A2, A3)", A2: '="-7.89"', A3: '="0.2"' })
    ).toBeCloseTo(-8, 9);
  }

  test.each([["FLOOR"], ["FLOOR.MATH"], ["FLOOR.PRECISE"]])(
    "%s: special value testing",
    (functionName) => {
      evaluateFloorFunction(functionName);
    }
  );

  //----------------------------------------------------------------------------
  // ISEVEN
  //----------------------------------------------------------------------------

  test.each([
    ["-3", false],
    ["-2.3", true],
    ["-2", true],
    ["0", true],
    ["2", true],
    ["2.3", true],
    ["3", false],
  ])("ISEVEN(%s) - %s: take 1 parameter(s), return a boolean", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: a })).toBe(expected);
  });

  test("ISEVEN: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISEVEN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISEVEN(0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISEVEN(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISEVEN(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISEVEN(FALSE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=ISEVEN("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ISEVEN(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ISEVEN("hello there")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: "" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: "FALSE" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: '="0"' })).toBe(true);
  });

  //----------------------------------------------------------------------------
  // ISODD
  //----------------------------------------------------------------------------

  test.each([
    ["-3", true],
    ["-2.2", false],
    ["-2", false],
    ["0", false],
    ["2", false],
    ["2.3", false],
    ["3", true],
  ])("ISODD(%s) - %s: take 1 parameter(s), return a boolean", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: a })).toBe(expected);
  });

  test("ISODD: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISODD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISODD(0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISODD(1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISODD(TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISODD(FALSE)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=ISODD("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ISODD(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ISODD("hello there")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: "" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: "FALSE" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: '="0"' })).toBe(false);
  });

  //----------------------------------------------------------------------------
  // MOD
  //----------------------------------------------------------------------------

  test.each([
    ["-42", "-10", -2],
    ["-42", "-2.2", -0.2],
    ["-42", "-2", 0],
    ["-42", "2", 0],
    ["-42", "2.2", 2],
    ["-42", "10", 8],
    ["0", "-10", 0],
    ["0", "-2.2", 0],
    ["0", "-2", 0],
    ["0", "2", 0],
    ["0", "2.2", 0],
    ["0", "10", 0],
    ["2.2", "-10", -7.8],
    ["2.2", "-2.2", 0],
    ["2.2", "-2", -1.8],
    ["2.2", "2", 0.2],
    ["2.2", "2.2", 0],
    ["2.2", "10", 2.2],
  ])("MOD(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
  });

  test.each([
    ["-42", "0"],
    ["0", "0"],
    ["2.2", "0"],
  ])("MOD(%s, %s) - error: take 2 parameter(s), return error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("MOD: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=MOD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MOD( , )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(42, 12)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=MOD( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(42, )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(42.42, TRUE)" })).toBeCloseTo(0.42, 9);
    expect(evaluateCell("A1", { A1: "=MOD(42, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MOD(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=MOD("" , "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: '=MOD("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MOD(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MOD("42", 12)' })).toBe(6);
    expect(evaluateCell("A1", { A1: '=MOD("42", "12")' })).toBe(6);
    expect(evaluateCell("A1", { A1: '=MOD("42", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "", A3: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42", A3: "12" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42", A3: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42.42", A3: "TRUE" })).toBeCloseTo(
      0.42,
      9
    );
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '="42"', A3: '="36"' })).toBe(6);
  });

  //----------------------------------------------------------------------------
  // ODD
  //----------------------------------------------------------------------------

  test.each([
    ["-3.9", -5],
    ["-3.1", -5],
    ["-3", -3],
    ["-2.9", -3],
    ["-2.1", -3],
    ["-2", -3],
    ["0", 1],
    ["2", 3],
    ["2.1", 3],
    ["2.9", 3],
    ["3", 3],
    ["3.1", 5],
    ["3.9", 5],
  ])("ODD(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: a })).toBe(expected);
  });

  test("ODD: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ODD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ODD(0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(2)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ODD(TRUE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(FALSE)" })).toBe(1);

    expect(evaluateCell("A1", { A1: '=ODD("")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=ODD(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ODD("hello there")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: "2" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: "TRUE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: "FALSE" })).toBe(1);

    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '=""' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: '="42"' })).toBe(43);
  });

  //----------------------------------------------------------------------------
  // PI
  //----------------------------------------------------------------------------

  test("PI", () => {
    expect(evaluateCell("A1", { A1: "=PI()" })).toBeCloseTo(Math.PI, 9); // @compatibility: on google sheets return 3.14159265358979
  });

  //----------------------------------------------------------------------------
  // POWER
  //----------------------------------------------------------------------------

  test.each([
    ["0", "0", 1],
    ["0", "0.5", 0],
    ["4", "0", 1],
    ["0", "4", 0],
    ["4", "2", 16],
    ["-4", "2", 16],
    ["4", "3", 64],
    ["-4", "3", -64],
    ["4", "0.5", 2],
    ["4", "-0.5", 0.5],
    ["4", "-2", 0.0625],
  ])("POWER(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-4", "0.5"],
    ["-4", "1.5"],
    ["-4", "0.2"],
  ])("POWER(%s, %s) - error: take 2 parameter(s), return an error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("POWER: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=POWER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=POWER( , )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(42, 2)" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POWER( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POWER(42, )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(42.42, TRUE)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POWER(42.42, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=POWER("" , "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=POWER("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=POWER(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=POWER("42", 2)' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POWER("42", "2")' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POWER("42", "")' })).toBe(1);

    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "42", A3: "2" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "42", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: '="42"', A3: '="2"' })).toBe(1764);
  });

  //----------------------------------------------------------------------------
  // RAND
  //----------------------------------------------------------------------------

  test("RAND(): return a number", () => {
    expect(evaluateCell("A1", { A1: "=RAND()" })).toBeGreaterThanOrEqual(0);
    expect(evaluateCell("A1", { A1: "=RAND()" })).toBeLessThan(1);
  });

  //----------------------------------------------------------------------------
  // RANDBETWEEN
  //----------------------------------------------------------------------------

  test.each([
    ["0", "0", 0],
    ["42", "42", 42],
    ["-42", "-42", -42],
    ["1.1", "2", 2],
  ])("RANDBETWEEN(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-42", "42"],
    ["24", "42"],
    ["-42", "-24"],
  ])("RANDBETWEEN(%s, %s): take 2 parameter(s), return a number", (a, b) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBeGreaterThanOrEqual(
      toNumber(a)
    );
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBeLessThanOrEqual(
      toNumber(b)
    );
  });

  test.each([
    ["1.1", "1.2"], // @compatibility: on google sheets, return 2
    ["-24", "-42"],
    ["42", "24"],
  ])("RANDBETWEEN(%s, %s) - error: take 2 parameter(s), return an error", (a, b) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("RANDBETWEEN: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN( , )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(2, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN( , 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(42, )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(42.42, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(42.42, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(TRUE, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(FALSE, 0)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=RANDBETWEEN("" , "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=RANDBETWEEN("" , 0)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=RANDBETWEEN(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=RANDBETWEEN("42", 42)' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=RANDBETWEEN("42", "42")' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=RANDBETWEEN("42", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "2", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "", A3: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "42", A3: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "TRUE", A3: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: "FALSE", A3: "0" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: '"42"', A3: '"42"' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: '=""', A3: '="0"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: '="42"', A3: '="42"' })).toBe(42);
  });

  //----------------------------------------------------------------------------
  // ROUND
  //----------------------------------------------------------------------------

  test.each([
    ["-1.6", -2],
    ["-1.5", -2],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 2],
    ["1.6", 2],
  ])("ROUND(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUND(A2)", A2: a })).toBe(expected);
  });

  test.each([
    ["0.3", "2", 0.3],
    ["0.34", "2", 0.34],
    ["0.345", "2", 0.35],
    ["-0.3", "2", -0.3],
    ["-0.34", "2", -0.34],
    ["-0.345", "2", -0.35],
    ["0.345", "1.9", 0.3],
    ["-0.345", "1.9", -0.3],
    ["4", "-1", 0],
    ["5", "-1", 10],
    ["50", "-2", 100],
    ["-5", "-1", -10],
    ["-50", "-2", -100],
    ["5", "-1.9", 10],
    ["-5", "-1.9", -10],
  ])("ROUND(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("ROUND: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=ROUND()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ROUND( , )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUND(42, -1)" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=ROUND( , 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUND(42, )" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUND(42.42, TRUE)" })).toBe(42.4);
    expect(evaluateCell("A1", { A1: "=ROUND(42.42, FALSE)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUND(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUND(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=ROUND("" , "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUND("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUND(" " , 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ROUND("42", -1)' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=ROUND("42", "-1")' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=ROUND("42", "")' })).toBe(42);

    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "42", A3: "-1" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "42", A3: "" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.4);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: '"42"', A3: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: '="42"', A3: '="-1"' })).toBe(40);
  });

  //----------------------------------------------------------------------------
  // ROUNDDOWN
  //----------------------------------------------------------------------------

  test.each([
    ["-1.9", -1],
    ["-1.5", -1],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 1],
    ["1.9", 1],
  ])("ROUNDDOWN(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2)", A2: a })).toBe(expected);
  });

  test.each([
    ["0.3", "2", 0.3],
    ["0.34", "2", 0.34],
    ["0.349", "2", 0.34],
    ["-0.3", "2", -0.3],
    ["-0.34", "2", -0.34],
    ["-0.349", "2", -0.34],
    ["0.349", "1.9", 0.3],
    ["-0.349", "1.9", -0.3],
    ["9", "-1", 0],
    ["19", "-1", 10],
    ["599", "-2", 500],
    ["-19", "-1", -10],
    ["-599", "-2", -500],
    ["19", "-1.9", 10],
    ["-19", "-1.9", -10],
  ])("ROUNDDOWN(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("ROUNDDOWN: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN( , )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(49, -1)" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN( , 49)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(49, )" })).toBe(49);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(49.49, TRUE)" })).toBe(49.4);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(49.49, FALSE)" })).toBe(49);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=ROUNDDOWN("" , "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUNDDOWN("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUNDDOWN(" " , 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ROUNDDOWN("49", -1)' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=ROUNDDOWN("49", "-1")' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=ROUNDDOWN("49", "")' })).toBe(49);

    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "49", A3: "-1" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "", A3: "49" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "49", A3: "" })).toBe(49);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "49.49", A3: "TRUE" })).toBe(49.4);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "49.49", A3: "FALSE" })).toBe(49);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: '"49"', A3: '"49"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: '="49"', A3: '="-1"' })).toBe(40);
  });

  //----------------------------------------------------------------------------
  // ROUNDUP
  //----------------------------------------------------------------------------

  test.each([
    ["-1.6", -2],
    ["-1.5", -2],
    ["-1.1", -2],
    ["0", 0],
    ["1.1", 2],
    ["1.5", 2],
    ["1.6", 2],
  ])("ROUNDUP(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2)", A2: a })).toBe(expected);
  });

  test.each([
    ["0.3", "2", 0.3],
    ["0.34", "2", 0.34],
    ["0.341", "2", 0.35],
    ["-0.3", "2", -0.3],
    ["-0.34", "2", -0.34],
    ["-0.341", "2", -0.35],
    ["0.311", "1.9", 0.4],
    ["-0.311", "1.9", -0.4],
    ["1", "-1", 10],
    ["11", "-1", 20],
    ["1", "-2", 100],
    ["-11", "-1", -20],
    ["1", "-2", 100],
    ["11", "-1.9", 20],
    ["-11", "-1.9", -20],
  ])("ROUNDUP(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("ROUNDUP: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=ROUNDUP()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ROUNDUP( , )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(42, -1)" })).toBe(50);
    expect(evaluateCell("A1", { A1: "=ROUNDUP( , 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(42, )" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(42.42, TRUE)" })).toBe(42.5);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(42.42, FALSE)" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=ROUNDUP("" , "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUNDUP("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=ROUNDUP(" " , 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ROUNDUP("42", -1)' })).toBe(50);
    expect(evaluateCell("A1", { A1: '=ROUNDUP("42", "-1")' })).toBe(50);
    expect(evaluateCell("A1", { A1: '=ROUNDUP("42", "")' })).toBe(42);

    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "42", A3: "-1" })).toBe(50);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "42", A3: "" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.5);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: '"42"', A3: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: '="42"', A3: '="-1"' })).toBe(50);
  });

  //----------------------------------------------------------------------------
  // SIN
  //----------------------------------------------------------------------------

  test.each([
    ["0", 0],
    ["=PI()", 0],
    ["=PI()*2", 0],
    ["=PI()/2", 1],
    ["=PI()/6", 0.5],
    ["=-PI()/2", -1],
  ])("SIN(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test("SIN: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=SIN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SIN(TRUE)" })).toBeCloseTo(0.841470984807897, 9);
    expect(evaluateCell("A1", { A1: "=SIN(FALSE)" })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: '=SIN("")' })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: '=SIN(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SIN("0")' })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: "" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: "0" })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '=""' })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: '="0"' })).toBeCloseTo(0, 9);
  });

  //----------------------------------------------------------------------------
  // SQRT
  //----------------------------------------------------------------------------

  test.each([
    ["0", 0],
    ["4", 2],
    ["9", 3],
  ])("SQRT(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: a })).toBe(expected);
  });

  test.each([["-4"], ["-9"]])("SQRT(%s) - error: take 1 parameter(s), return an error ", (a) => {
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!!
  });

  test("SQRT: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=SQRT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SQRT(TRUE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=SQRT(FALSE)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=SQRT("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=SQRT(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SQRT("49")' })).toBe(7);

    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: "49" })).toBe(7);

    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: '="49"' })).toBe(7);
  });

  //----------------------------------------------------------------------------
  // SUM
  //----------------------------------------------------------------------------

  test("SUM: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUM()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUM(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(1, 2, 3, 1, 2)" })).toBe(9);
    expect(evaluateCell("A1", { A1: "=SUM(1,  , 2,  , 3)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=SUM(1.5, 1.4)" })).toBe(2.9);
    expect(evaluateCell("A1", { A1: '=SUM("Jean Saigne", "Jean Tanrien")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM("2", "-2")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=SUM("2", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SUM(TRUE, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=SUM(1, "1", TRUE)' })).toBe(3);
  });

  test("SUM: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "1", A3: "2" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3, A4)", A2: "1", A3: "", A4: "1" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=SUM(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Vier" })
    ).toBe(-8.5);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "42", A3: "42" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "42", A3: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "42", A3: "=42" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "42", A3: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: '"42"', A3: '"42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: '"42"', A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: '"42"', A3: '="42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "=42", A3: "=42" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "=42", A3: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: '="42"', A3: '="42"' })).toBe(0);
  });

  test("SUM: functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUM(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=SUM(A2, "")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, "")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, "")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, "")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SUM(42, "42")' })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, 42)", A2: "42" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, 42)", A2: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, 42)", A2: "=42" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=SUM(A2, 42)", A2: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=SUM(A2, "42")', A2: "42" })).toBe(84);
    expect(evaluateCell("A1", { A1: '=SUM(A2, "42")', A2: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=SUM(A2, "42")', A2: "=42" })).toBe(84);
    expect(evaluateCell("A1", { A1: '=SUM(A2, "42")', A2: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SUM(A2, TRUE)", A2: "1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SUM(A2, TRUE)", A2: '"1"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=SUM(A2, TRUE)", A2: "=1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SUM(A2, TRUE)", A2: '="1"' })).toBe(1);
  });

  test("SUM: functional tests on range arguments", () => {
    const grid = {
      A1: "=SUM(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=SUM(B2:E2)",
      A3: "=SUM(B3:E3)",
      A4: "=SUM(B4:E4)",

      B1: "=SUM(B2:B4)",
      C1: "=SUM(C2:C4)",
      D1: "=SUM(D2:D4)",
      E1: "=SUM(E2:E4)",

      B2: "=3",
      C2: "3",
      D2: '"3"',
      E2: '="3"',

      B3: '=" "',
      C3: "0",
      D3: "Jean Bave",
      E3: '"Jean Darme"',

      B4: " ",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe(6);
    expect(gridResult.A2).toBe(6);
    expect(gridResult.A3).toBe(0);
    expect(gridResult.A4).toBe(0);
    expect(gridResult.B1).toBe(3);
    expect(gridResult.C1).toBe(3);
    expect(gridResult.D1).toBe(0);
    expect(gridResult.E1).toBe(0);
  });

  //----------------------------------------------------------------------------
  // TRUNC
  //----------------------------------------------------------------------------

  test.each([
    ["-1.6", -1],
    ["-1.5", -1],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 1],
    ["1.6", 1],
  ])("TRUNC(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: a })).toBe(expected);
  });

  test.each([
    ["0.3", "2", 0.3],
    ["0.34", "2", 0.34],
    ["0.345", "2", 0.34],
    ["-0.3", "2", -0.3],
    ["-0.34", "2", -0.34],
    ["-0.345", "2", -0.34],
    ["0.345", "1.9", 0.3],
    ["-0.345", "1.9", -0.3],
    ["12345", "-1", 12340],
    ["123456", "-1", 123450],
    ["12345", "-2", 12300],
    ["-123456", "-1", -123450],
    ["-12345", "-2", -12300],
    ["12345", "-1.9", 12340],
    ["-12345", "-1.9", -12340],
  ])("TRUNC(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("TRUNC: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=TRUNC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TRUNC( , )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRUNC(42, -1)" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=TRUNC( , 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRUNC(42, )" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=TRUNC(42.42, TRUE)" })).toBe(42.4);
    expect(evaluateCell("A1", { A1: "=TRUNC(42.42, FALSE)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=TRUNC(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=TRUNC(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=TRUNC("" , "")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=TRUNC("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=TRUNC(" " , 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=TRUNC("42", -1)' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=TRUNC("42", "-1")' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=TRUNC("42", "")' })).toBe(42);

    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "42", A3: "-1" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "42", A3: "" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.4);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: '"42"', A3: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: '="42"', A3: '="-1"' })).toBe(40);
  });
});
