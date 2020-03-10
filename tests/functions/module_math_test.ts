import { functionMap } from "../../src/functions/index";
import { evaluateCell, evaluateGrid } from "../helpers";

const {
  CEILING,
  COS,
  COUNTBLANK,
  DECIMAL,
  DEGREES,
  FLOOR,
  ISEVEN,
  ISODD,
  MOD,
  ODD,
  PI,
  POWER,
  RAND,
  RANDBETWEEN,
  ROUND,
  ROUNDDOWN,
  ROUNDUP,
  SIN,
  SQRT,
  TRUNC,
  MIN,
  MAX
} = functionMap;

describe("math", () => {
  //----------------------------------------------------------------------------
  // CEILING / CEILING.MATH / CEILING.PRECISE / ISO.CEILING
  //----------------------------------------------------------------------------

  test.each([
    [0, 0],
    [6, 6],
    [-6, -6],
    [6.7, 7],
    [7.89, 8],
    [-6.7, -6],
    [-7.89, -7],
    [true, 1],
    [false, 0],
    [null, 0]
  ])("CEILING FUNCTIONS(%s) - %s: take 1 parameters, return a number", (a, expected) => {
    expect(CEILING(a)).toBe(expected);
    expect(functionMap["CEILING.MATH"](a)).toBe(expected);
    expect(functionMap["CEILING.PRECISE"](a)).toBe(expected);
    expect(functionMap["ISO.CEILING"](a)).toBe(expected);
  });

  test.each([
    [0, 0, 0],
    [0, 0.1, 0],
    [0, -4, 0],
    [6, 0, 0],
    [6.7, 0, 0],
    [-6, 0, 0],
    [6, 0.1, 6],
    [-6, 0.1, -6],
    [6, 0.7, 6.3],
    [-6, 0.7, -5.6],
    [6.7, 0.2, 6.8],
    [-6.7, 0.2, -6.6],
    [true, 4.2, 4.2],
    [false, 4.2, 0],
    [null, 4.2, 0],
    [4.2, true, 5],
    [4.2, false, 0],
    [4.2, null, 0]
  ])("CEILING FUNCTIONS(%s, %s) - %s: take 2 parameters, return a number", (a, b, expected) => {
    expect(CEILING(a, b)).toBeCloseTo(expected, 9);
    expect(functionMap["CEILING.MATH"](a, b)).toBeCloseTo(expected, 9);
    expect(functionMap["CEILING.PRECISE"](a, b)).toBeCloseTo(expected, 9);
    expect(functionMap["ISO.CEILING"](a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    [0, 0.2, 0],
    [0, -0.2, 0],
    [7.89, 0.2, 8],
    [7.89, -0.2, 8],
    [-7.89, 0.2, -7.8],
    [-7.89, -0.2, -7.8]
  ])(
    "CEILING (MATH/PRECISE/ISO) FUNCTIONS(%s, %s) - %s: no effect with negative factor",
    (a, b, expected) => {
      expect(functionMap["CEILING.MATH"](a, b)).toBeCloseTo(expected, 9);
      expect(functionMap["CEILING.PRECISE"](a, b)).toBeCloseTo(expected, 9);
      expect(functionMap["ISO.CEILING"](a, b)).toBeCloseTo(expected, 9);
    }
  );

  test.each([
    [6, -0.2],
    [7.89, -0.2]
  ])("CEILING(%s, %s) - error: if value positive, factor can't be negative", (a, b) => {
    expect(() => {
      CEILING(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    // Concerning CEILING function
    // if "a" is negative and "b" is negative, rounds a number down (and not up)
    // the nearest integer multiple of b
    [-7.89, 0.2, -7.8],
    [-7.89, -0.2, -8]
  ])("CEILING(%s, %s) - %s: if factor negative, rounds number down", (a, b, expected) => {
    expect(CEILING(a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    // Concerning CEILING.MATH function
    // if "a" is negative and "c" different 0, rounds a number down (and not up)
    // the nearest integer multiple of b
    [7.89, 0.2, 0, 8],
    [7.89, 0.2, 1, 8],
    [-7.89, 0.2, 0, -7.8],
    [-7.89, 0.2, 1, -8],
    [-7.89, 0.2, 2.2, -8],
    [-7.89, 0.2, -2.2, -8],
    [-7.89, -0.2, 0, -7.8],
    [-7.89, -0.2, 1, -8],
    [-7.89, -0.2, 2.2, -8],
    [-7.89, -0.2, -2.2, -8],
    [true, 4.2, 0, 4.2],
    [false, 4.2, 0, 0],
    [null, 4.2, 0, 0],
    [4.2, true, 0, 5],
    [4.2, false, 0, 0],
    [4.2, null, 0, 0],
    [4.2, 4.2, true, 4.2],
    [4.2, 4.2, false, 4.2],
    [4.2, 4.2, null, 4.2]
  ])("CEILING.MATH(%s, %s, %s) - %s: take 3 parameters, return a number", (a, b, c, expected) => {
    expect(functionMap["CEILING.MATH"](a, b, c)).toBeCloseTo(expected, 9);
  });

  //----------------------------------------------------------------------------
  // COS
  //----------------------------------------------------------------------------

  test.each([
    [0, 1],
    [Math.PI, -1],
    [Math.PI * 2, 1],
    [Math.PI / 2, 0],
    [Math.PI / 3, 0.5],
    [-Math.PI / 2, 0]
  ])("COS(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(COS(a)).toBeCloseTo(expected, 9);
  });

  test.each([
    [true, 0.54030230586814],
    [false, 1],
    [null, 1]
  ])("COS(%s) - %s: take 1 parameter(s), return a number, casting test ", (a, expected) => {
    expect(COS(a)).toBeCloseTo(expected, 9);
  });

  //----------------------------------------------------------------------------
  // COUNTBLANK
  //----------------------------------------------------------------------------

  test.each([
    [null, 1],
    ["", 1],
    [true, 0],
    [false, 0],
    [0, 0],
    [1, 0],
    ["hello there", 0],
    ["''", 0]
  ])("COUNTBLANK(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(COUNTBLANK(a)).toBe(expected);
  });

  test("COUNTBLANK: count blank on some cells and ranges ", () => {
    const cell1 = null;
    const cell2 = "";
    const cell3 = true;
    const cell4 = false;
    const cell5 = 42;
    const cell6 = "''";

    const col1 = [[0, 1, 2, undefined, "''", undefined]];
    const col2 = [[undefined, undefined, "", false, true, 42]];

    const line1 = [[0], [1], [2], [undefined], ["''"], [undefined]];
    const line2 = [[undefined], [undefined], [""], [false], [true], [42]];

    const tab1 = [
      [0, 1, 2],
      [undefined, "''", undefined]
    ];
    const tab2 = [
      [undefined, undefined, ""],
      [false, true, 42]
    ];

    expect(COUNTBLANK(cell1, cell2, cell3, cell4, cell5, cell6)).toBe(2);
    expect(COUNTBLANK(col1)).toBe(2);
    expect(COUNTBLANK(col2)).toBe(3);
    expect(COUNTBLANK(col1, col2)).toBe(5);
    expect(COUNTBLANK(line1)).toBe(2);
    expect(COUNTBLANK(line2)).toBe(3);
    expect(COUNTBLANK(line1, line2)).toBe(5);
    expect(COUNTBLANK(tab1)).toBe(2);
    expect(COUNTBLANK(tab2)).toBe(3);
    expect(COUNTBLANK(tab1, tab2)).toBe(5);
    expect(COUNTBLANK(cell1, col1, line1, tab1)).toBe(7);
    expect(COUNTBLANK(tab2, line2, col2, cell5)).toBe(9);
  });

  //----------------------------------------------------------------------------
  // COUNTUNIQUE
  //----------------------------------------------------------------------------

  test("COUNTUNIQUE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=countunique()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
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
        A4: "Jean Peuxplus"
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
      E4: '" "'
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(9);
    expect(gridResult.A2).toEqual(3);
    expect(gridResult.A3).toEqual(4);
    expect(gridResult.A4).toEqual(3);
    expect(gridResult.B1).toEqual(2);
    expect(gridResult.C1).toEqual(3);
    expect(gridResult.D1).toEqual(2);
    expect(gridResult.E1).toEqual(3);
  });

  //----------------------------------------------------------------------------
  // DECIMAL
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = ["-ABAB", -1010, -0.1, 0, 0.1, 1010, 1111, 2020, 3030, "-ABAB", "ZZZZ", "-", "A-", "@ABAB",  "ABAB@", "ABAB.2", "ABAB.21@"]
  // b = [-1, 0, 0.1, 1, 2, 3, 4, 10, 16, 36, 37]

  test.each([
    [-1010, 2, -10], // @compatibility: return error on parameter 1 on google sheets
    [-1010, 3, -30], // @compatibility: return error on parameter 1 on google sheets
    [-1010, 4, -68], // @compatibility: return error on parameter 1 on google sheets
    [-1010, 10, -1010], // @compatibility: return error on parameter 1 on google sheets
    [-1010, 16, -4112], // @compatibility: return error on parameter 1 on google sheets
    [-1010, 36, -46692], // @compatibility: return error on parameter 1 on google sheets
    [0, 2, 0],
    [0, 3, 0],
    [0, 4, 0],
    [0, 10, 0],
    [0, 16, 0],
    [0, 36, 0],
    [1010, 2, 10],
    [1010, 3, 30],
    [1010, 4, 68],
    [1010, 10, 1010],
    [1010, 16, 4112],
    [1010, 36, 46692],
    [1111, 2, 15],
    [1111, 3, 40],
    [1111, 4, 85],
    [1111, 10, 1111],
    [1111, 16, 4369],
    [1111, 36, 47989],
    [2020, 3, 60],
    [2020, 4, 136],
    [2020, 10, 2020],
    [2020, 16, 8224],
    [2020, 36, 93384],
    [3030, 4, 204],
    [3030, 10, 3030],
    [3030, 16, 12336],
    [3030, 36, 140076],
    ["ABAB", 16, 43947],
    ["ABAB", 36, 481187],
    ["A1A1", 16, 41377],
    ["A1A1", 36, 468217],
    ["a1a1", 16, 41377],
    ["a1a1", 36, 468217],
    ["-ABAB", 16, -43947], // @compatibility: return error on parameter 1 on google sheets
    ["-ABAB", 36, -481187], // @compatibility: return error on parameter 1 on google sheets
    ["ZZZZ", 36, 1679615],
    ["zzzz", 36, 1679615]
  ])("DECIMAL(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(DECIMAL(a, b)).toBe(expected);
  });

  test.each([
    [-1010, -1],
    [-1010, 0],
    [-1010, 0.1],
    [-1010, 1],
    [-1010, 37],
    [-0.1, -1],
    [-0.1, 0],
    [-0.1, 0.1],
    [-0.1, 1],
    [-0.1, 37],
    [0, -1],
    [0, 0],
    [0, 0.1],
    [0, 1],
    [0, 37],
    [0.1, -1],
    [0.1, 0],
    [0.1, 0.1],
    [0.1, 1],
    [0.1, 37],
    [1010, -1],
    [1010, 0],
    [1010, 0.1],
    [1010, 1],
    [1010, 37],
    [1111, -1],
    [1111, 0],
    [1111, 0.1],
    [1111, 1],
    [1111, 37],
    [2020, -1],
    [2020, 0],
    [2020, 0.1],
    [2020, 1],
    [2020, 37],
    [3030, -1],
    [3030, 0],
    [3030, 0.1],
    [3030, 1],
    [3030, 37],
    ["ABAB", -1],
    ["ABAB", 0],
    ["ABAB", 0.1],
    ["ABAB", 1],
    ["ABAB", 37],
    ["A1A1", -1],
    ["A1A1", 0],
    ["A1A1", 0.1],
    ["A1A1", 1],
    ["A1A1", 37],
    ["a1a1", -1],
    ["a1a1", 0],
    ["a1a1", 0.1],
    ["a1a1", 1],
    ["a1a1", 37],
    ["-ABAB", -1],
    ["-ABAB", 0],
    ["-ABAB", 0.1],
    ["-ABAB", 1],
    ["-ABAB", 37],
    ["ZZZZ", -1],
    ["ZZZZ", 0],
    ["ZZZZ", 0.1],
    ["ZZZZ", 1],
    ["ZZZZ", 37],
    ["zzzz", -1],
    ["zzzz", 0],
    ["zzzz", 0.1],
    ["zzzz", 1],
    ["zzzz", 37],
    ["-", -1],
    ["-", 0],
    ["-", 0.1],
    ["-", 1],
    ["-", 37],
    ["A-", -1],
    ["A-", 0],
    ["A-", 0.1],
    ["A-", 1],
    ["A-", 37],
    ["@ABAB", -1],
    ["@ABAB", 0],
    ["@ABAB", 0.1],
    ["@ABAB", 1],
    ["@ABAB", 37],
    ["ABAB@", -1],
    ["ABAB@", 0],
    ["ABAB@", 0.1],
    ["ABAB@", 1],
    ["ABAB@", 37],
    ["ABAB.2", -1],
    ["ABAB.2", 0],
    ["ABAB.2", 0.1],
    ["ABAB.2", 1],
    ["ABAB.2", 37],
    ["ABAB.21@", -1],
    ["ABAB.21@", 0],
    ["ABAB.21@", 0.1],
    ["ABAB.21@", 1],
    ["ABAB.21@", 37],
    ["AB AB", -1],
    ["AB AB", 0],
    ["AB AB", 0.1],
    ["AB AB", 1],
    ["AB AB", 37]
  ])("DECIMAL(%s, %s) - error: take 2 parameter(s), return error on parameter 2", (a, b) => {
    expect(() => {
      DECIMAL(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [-0.1, 2],
    [-0.1, 3],
    [-0.1, 4],
    [-0.1, 10],
    [-0.1, 16],
    [-0.1, 36],
    [0.1, 2],
    [0.1, 3],
    [0.1, 4],
    [0.1, 10],
    [0.1, 16],
    [0.1, 36],
    [2020, 2],
    [3030, 2],
    [3030, 3],
    ["ABAB", 2],
    ["ABAB", 3],
    ["ABAB", 4],
    ["ABAB", 10],
    ["A1A1", 2],
    ["A1A1", 3],
    ["A1A1", 4],
    ["A1A1", 10],
    ["a1a1", 2],
    ["a1a1", 3],
    ["a1a1", 4],
    ["a1a1", 10],
    ["-ABAB", 2],
    ["-ABAB", 3],
    ["-ABAB", 4],
    ["-ABAB", 10],
    ["ZZZZ", 2],
    ["ZZZZ", 3],
    ["ZZZZ", 4],
    ["ZZZZ", 10],
    ["ZZZZ", 16],
    ["zzzz", 2],
    ["zzzz", 3],
    ["zzzz", 4],
    ["zzzz", 10],
    ["zzzz", 16],
    ["-", 2],
    ["-", 3],
    ["-", 4],
    ["-", 10],
    ["-", 16],
    ["-", 36],
    ["A-", 2],
    ["A-", 3],
    ["A-", 4],
    ["A-", 10],
    ["A-", 16],
    ["A-", 36],
    ["@ABAB", 2],
    ["@ABAB", 3],
    ["@ABAB", 4],
    ["@ABAB", 10],
    ["@ABAB", 16],
    ["@ABAB", 36],
    ["ABAB@", 2],
    ["ABAB@", 3],
    ["ABAB@", 4],
    ["ABAB@", 10],
    ["ABAB@", 16],
    ["ABAB@", 36],
    ["ABAB.2", 2],
    ["ABAB.2", 3],
    ["ABAB.2", 4],
    ["ABAB.2", 10],
    ["ABAB.2", 16],
    ["ABAB.2", 36],
    ["ABAB.21@", 2],
    ["ABAB.21@", 3],
    ["ABAB.21@", 4],
    ["ABAB.21@", 10],
    ["ABAB.21@", 16],
    ["ABAB.21@", 36],
    ["AB AB", 2],
    ["AB AB", 3],
    ["AB AB", 4],
    ["AB AB", 10],
    ["AB AB", 16],
    ["AB AB", 36]
  ])("DECIMAL(%s, %s) - error: take 2 parameter(s), return error on parameter 1", (a, b) => {
    expect(() => {
      DECIMAL(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [-1010, 2, -10], // @compatibility: return error on parameter 1 on google sheets
    ["-1010", 2, -10], // @compatibility: return error on parameter 1 on google sheets
    [null, 2, 0],
    [0, 2, 0],
    ["0", 2, 0],
    [1010, 2, 10],
    ["1010", 2, 10]
  ])(
    "DECIMAL(%s, %s) - %s: take 2 parameter(s), return a number, casting test",
    (a, b, expected) => {
      expect(DECIMAL(a, b)).toBe(expected);
    }
  );

  test.each([
    [true, 0],
    [false, 0],
    [null, 0],
    [0, true],
    [2, true],
    [0, false],
    [2, false],
    [0, null],
    [2, null],
    [null, true],
    [null, false],
    [true, null],
    [false, null]
  ])(
    "DECIMAL(%s, %s) - error: take 2 parameter(s), return error on parameter 2, casting test",
    (a, b) => {
      expect(() => {
        DECIMAL(a, b);
      }).toThrowErrorMatchingSnapshot();
    }
  );

  test.each([
    [true, 2],
    [false, 2]
  ])(
    "DECIMAL(%s, %s) - error : take 2 parameter(s), return error on parameter 1, casting test",
    (a, b) => {
      expect(() => {
        DECIMAL(a, b);
      }).toThrowErrorMatchingSnapshot();
    }
  );

  //----------------------------------------------------------------------------
  // DEGREES
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [-5, -3.4, 0, 3.14, 5, -PI, PI, PI*3, 3.141592653589793, 3.14159265358979]

  test.each([
    [-5, -286.4788975654116], // @compatibility: on google sheets return -286.47889756541(2) and not (16)
    [-3.14, -179.90874767107852], // @compatibility: on google sheets return -179.90874767107(9) and not (852)
    [0, 0],
    [3.14, 179.90874767107852], // @compatibility: on google sheets return 179.90874767107(9) and not (852)
    [5, 286.4788975654116], // @compatibility: on google sheets return 286.47889756541(2) and not (16)
    [-Math.PI, -180],
    [Math.PI, 180],
    [Math.PI * 3, 540],
    [3.141592653589793, 180],
    [3.14159265358979, 179.99999999999983], // @compatibility: on google sheets return 180
    [3.1415926535897, 179.99999999999466] // @compatibility: on google sheets return 179.99999999999(5) and not (466)
  ])("DEGREES(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(DEGREES(a)).toBe(expected);
  });

  test.each([
    [true, 57.29577951308232], // @compatibility: on google sheets return 57.2957795130823() and not (2)
    [false, 0],
    [null, 0]
  ])("DEGREES(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(DEGREES(a)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // FLOOR / FLOOR.MATH / FLOOR.PRECISE
  //----------------------------------------------------------------------------

  test.each([
    [0, 0],
    [6, 6],
    [6.7, 6],
    [7.89, 7],
    [-6, -6],
    [-6.7, -7],
    [-7.89, -8],
    [true, 1],
    [false, 0],
    [null, 0]
  ])("FLOOR FUNCTIONS(%s) - %s: take 1 parameters, return a number", (a, expected) => {
    expect(FLOOR(a)).toBe(expected);
    expect(functionMap["FLOOR.MATH"](a)).toBe(expected);
    expect(functionMap["FLOOR.PRECISE"](a)).toBe(expected);
  });

  test.each([
    [0, 0, 0],
    [0, 0.1, 0],
    [0, -4, 0],
    [6, 0, 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    [6.7, 0, 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    [-6, 0, 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    [6, 0.1, 6],
    [-6, 0.1, -6],
    [6, 0.7, 5.6],
    [-6, 0.7, -6.3],
    [6.7, 0.2, 6.6],
    [-6.7, 0.2, -6.8],
    [true, 0.3, 0.9],
    [false, 0.3, 0],
    [null, 0.3, 0],
    [4.2, true, 4],
    [4.2, false, 0], // @compatibility on google sheets: concerning basic floor function, return error div by 0
    [4.2, null, 0] // @compatibility on google sheets: concerning basic floor function, return error div by 0
  ])("FLOOR FUNCTIONS(%s, %s) - %s: take 2 parameters, return a number", (a, b, expected) => {
    expect(FLOOR(a, b)).toBeCloseTo(expected, 9);
    expect(functionMap["FLOOR.MATH"](a, b)).toBeCloseTo(expected, 9);
    expect(functionMap["FLOOR.PRECISE"](a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    [0, 0.2, 0],
    [0, -0.2, 0],
    [7.89, 0.2, 7.8],
    [7.89, -0.2, 7.8],
    [-7.89, 0.2, -8],
    [-7.89, -0.2, -8]
  ])(
    "FLOOR (MATH/PRECISE) FUNCTIONS(%s, %s) - %s: no effect with negative factor",
    (a, b, expected) => {
      expect(functionMap["FLOOR.MATH"](a, b)).toBeCloseTo(expected, 9);
      expect(functionMap["FLOOR.PRECISE"](a, b)).toBeCloseTo(expected, 9);
    }
  );

  test.each([
    [6, -0.2],
    [7.89, -0.2]
  ])("FLOOR(%s, %s) - error: if value positive, factor can't be negative", (a, b) => {
    expect(() => {
      FLOOR(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    // Concerning FLOOR function
    // if "a" is negative and "b" is negative, rounds a number up (and not down)
    // the nearest integer multiple of b
    [-7.89, 0.2, -8],
    [-7.89, -0.2, -7.8]
  ])("FLOOR(%s, %s) - %s: if factor negative, rouds number down", (a, b, expected) => {
    expect(FLOOR(a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    // Concerning FLOOR.MATH function
    // if "a" is negative and "c" different 0, rounds a number up (and not down)
    // the nearest integer multiple of b
    [7.89, 0.2, 0, 7.8],
    [7.89, 0.2, 1, 7.8],
    [-7.89, 0.2, 0, -8],
    [-7.89, 0.2, 1, -7.8],
    [-7.89, 0.2, 2.2, -7.8],
    [-7.89, 0.2, -2.2, -7.8],
    [-7.89, -0.2, 0, -8],
    [-7.89, -0.2, 1, -7.8],
    [-7.89, -0.2, 2.2, -7.8],
    [-7.89, -0.2, -2.2, -7.8],
    [true, 0.3, 0, 0.9],
    [false, 0.3, 0, 0],
    [null, 0.3, 0, 0],
    [4.2, true, 0, 4],
    [4.2, false, 0, 0],
    [4.2, null, 0, 0],
    [-7.89, 0.2, true, -7.8],
    [-7.89, 0.2, false, -8],
    [-7.89, 0.2, null, -8]
  ])("FLOOR.MATH(%s, %s, %s) - %s: take 3 parameters, return a number", (a, b, c, expected) => {
    expect(functionMap["FLOOR.MATH"](a, b, c)).toBeCloseTo(expected, 9);
  });

  //----------------------------------------------------------------------------
  // ISEVEN
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [-3, -2.3, -2, 0, 2, 2.3, 3]

  test.each([
    [-3, false],
    [-2.3, true],
    [-2, true],
    [0, true],
    [2, true],
    [2.3, true],
    [3, false]
  ])("ISEVEN(%s) - %s: take 1 parameter(s), return a boolean", (a, expected) => {
    expect(ISEVEN(a)).toBe(expected);
  });

  test.each([
    [true, false],
    [false, true],
    [null, true]
  ])("ISEVEN(%s) - %s: take 1 parameter(s), return a boolean, casting test", (a, expected) => {
    expect(ISEVEN(a)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // ISODD
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [-3.3, -3, -2.2, -2, 0, 2, 2.2, 3, 3.3, 5, 6]

  test.each([
    [-3.3, true],
    [-3, true],
    [-2.2, false],
    [-2, false],
    [0, false],
    [2, false],
    [2.2, false],
    [3, true],
    [3.3, true],
    [5, true],
    [6, false]
  ])("ISODD(%s) - %s: take 1 parameter(s), return a boolean", (a, expected) => {
    expect(ISODD(a)).toBe(expected);
  });

  test.each([
    [true, true],
    [false, false],
    [null, false]
  ])("ISODD(%s) - %s: take 1 parameter(s), return a boolean, casting test", (a, expected) => {
    expect(ISODD(a)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // MOD
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [-42, -2.2, -2, 0, 2, 2.2, 42]
  // b = [-10, -2.2, -2, 0, 2, 2.2, 10]

  test.each([
    [-42, -10, -2],
    [-42, -2.2, -0.2],
    [-42, -2, 0],
    [-42, 2, 0],
    [-42, 2.2, 2],
    [-42, 10, 8],
    [-2.2, -10, -2.2],
    [-2.2, -2.2, 0],
    [-2.2, -2, -0.2],
    [-2.2, 2, 1.8],
    [-2.2, 2.2, 0],
    [-2.2, 10, 7.8],
    [-2, -10, -2],
    [-2, -2.2, -2],
    [-2, -2, 0],
    [-2, 2, 0],
    [-2, 2.2, 0.2],
    [-2, 10, 8],
    [0, -10, 0],
    [0, -2.2, 0],
    [0, -2, 0],
    [0, 2, 0],
    [0, 2.2, 0],
    [0, 10, 0],
    [2, -10, -8],
    [2, -2.2, -0.2],
    [2, -2, 0],
    [2, 2, 0],
    [2, 2.2, 2],
    [2, 10, 2],
    [2.2, -10, -7.8],
    [2.2, -2.2, 0],
    [2.2, -2, -1.8],
    [2.2, 2, 0.2],
    [2.2, 2.2, 0],
    [2.2, 10, 2.2],
    [42, -10, -8],
    [42, -2.2, -2],
    [42, -2, 0],
    [42, 2, 0],
    [42, 2.2, 0.2],
    [42, 10, 2]
  ])("MOD(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(MOD(a, b)).toBeCloseTo(expected, 14);
  });

  test.each([
    [-42, 0],
    [-2.2, 0],
    [-2, 0],
    [0, 0],
    [2, 0],
    [2.2, 0],
    [42, 0]
  ])("MOD(%s, %s) - error: take 2 parameter(s), return error on parameter 2", (a, b) => {
    expect(() => {
      MOD(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [true, 42, 1],
    [false, 42, 0],
    [null, 42, 0],
    [42, true, 0]
  ])("MOD(%s, %s) - %s: take 2 parameter(s), return a number, casting test", (a, b, expected) => {
    expect(MOD(a, b)).toBeCloseTo(expected, 14);
  });

  test.each([
    [42, false],
    [42, null]
  ])(
    "MOD(%s, %s) - error: take 2 parameter(s), return error on parameter 2, casting test ",
    (a, b) => {
      expect(() => {
        MOD(a, b);
      }).toThrowErrorMatchingSnapshot();
    }
  );

  //----------------------------------------------------------------------------
  // ODD
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [-3.9, -3.1, -3, -2.9, -2.1, -2, 0, 2, 2.1, 2.9, 3, 3.1, 3.9]

  test.each([
    [-3.9, -5],
    [-3.1, -5],
    [-3, -3],
    [-2.9, -3],
    [-2.1, -3],
    [-2, -3],
    [0, 1],
    [2, 3],
    [2.1, 3],
    [2.9, 3],
    [3, 3],
    [3.1, 5],
    [3.9, 5]
  ])("ODD(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(ODD(a)).toBe(expected);
  });

  test.each([
    [true, 1],
    [false, 1],
    [null, 1]
  ])("ODD(%s) - %s: take 1 parameter(s), return a number, casting test ", (a, expected) => {
    expect(ODD(a)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // PI
  //----------------------------------------------------------------------------

  // domain parameter:
  // None

  test("PI", () => {
    expect(PI()).toBeCloseTo(Math.PI, 9); // @compatibility: on google sheets return 3.14159265358979
    expect(PI()).toBeCloseTo(3.141592653589793, 9); // @compatibility: on google sheets return 3.14159265358979
  });

  //----------------------------------------------------------------------------
  // POWER
  //----------------------------------------------------------------------------

  test.each([
    [0, 0, 1],
    [0, 0.5, 0],
    [4, 0, 1],
    [0, 4, 0],
    [4, 2, 16],
    [-4, 2, 16],
    [4, 3, 64],
    [-4, 3, -64],
    [4, 0.5, 2],
    [4, -0.5, 0.5],
    [4, -2, 0.0625]
  ])("POWER(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(POWER(a, b)).toBe(expected);
  });

  test.each([
    [-4, 0.5],
    [-4, 1.5],
    [-4, 0.2]
  ])("POWER(%s, %s) - error: take 2 parameter(s), return an error on parameter 2", (a, b) => {
    expect(() => {
      POWER(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [true, 4, 1],
    [false, 4, 0],
    [null, 4, 0],
    [4, true, 4],
    [4, false, 1],
    [4, null, 1]
  ])("POWER(%s, %s) - %s: take 2 parameter(s), return a number, casting test", (a, b, expected) => {
    expect(POWER(a, b)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // RAND
  //----------------------------------------------------------------------------

  test("RAND(): return a number", () => {
    const random = RAND();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThan(1);
  });

  //----------------------------------------------------------------------------
  // RANDBETWEEN
  //----------------------------------------------------------------------------

  test.each([
    [0, 0, 0],
    [42, 42, 42],
    [-42, -42, -42],
    [1.1, 2, 2]
  ])("RANDBETWEEN(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(RANDBETWEEN(a, b)).toBe(expected);
  });

  test.each([
    [-42, 42],
    [24, 42],
    [-42, -24]
  ])("RANDBETWEEN(%s, %s): take 2 parameter(s), return a number", (a, b) => {
    const randint = RANDBETWEEN(a, b);
    expect(typeof randint).toBe("number");
    expect(randint).toBeGreaterThanOrEqual(a);
    expect(randint).toBeLessThanOrEqual(b);
  });

  test.each([
    [1.1, 1.2], // @compatibility: on google sheets, return 2
    [-24, -42],
    [42, 24]
  ])("RANDBETWEEN(%s, %s) - error: take 2 parameter(s), return an error", (a, b) => {
    expect(() => {
      RANDBETWEEN(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [1, true, 1],
    [0, false, 0],
    [0, null, 0],
    [true, 1, 1],
    [false, 0, 0],
    [null, 0, 0]
  ])(
    "RANDBETWEEN(%s, %s) - %s: take 2 parameter(s), return a number, casting test",
    (a, b, expected) => {
      expect(RANDBETWEEN(a, b)).toBe(expected);
    }
  );

  //----------------------------------------------------------------------------
  // ROUND
  //----------------------------------------------------------------------------

  test.each([
    [-1.6, -2],
    [-1.5, -2],
    [-1.4, -1],
    [0, 0],
    [1.4, 1],
    [1.5, 2],
    [1.6, 2]
  ])("ROUND(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(ROUND(a)).toBe(expected);
  });

  test.each([
    [true, 1],
    [false, 0],
    [null, 0]
  ])("ROUND(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(ROUND(a)).toBe(expected);
  });

  test.each([
    [0.3, 2, 0.3],
    [0.34, 2, 0.34],
    [0.345, 2, 0.35],
    [-0.3, 2, -0.3],
    [-0.34, 2, -0.34],
    [-0.345, 2, -0.35],
    [0.345, 1.9, 0.3],
    [-0.345, 1.9, -0.3],
    [4, -1, 0],
    [5, -1, 10],
    [50, -2, 100],
    [-5, -1, -10],
    [-50, -2, -100],
    [5, -1.9, 10],
    [-5, -1.9, -10]
  ])("ROUND(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(ROUND(a, b)).toBe(expected);
  });

  test.each([
    [true, 42, 1],
    [false, 42, 0],
    [null, 42, 0],
    [42.42, true, 42.4],
    [42.42, false, 42],
    [42.42, null, 42]
  ])("ROUND(%s, %s) - %s: take 2 parameter(s), return a number, casting test", (a, b, expected) => {
    expect(ROUND(a, b)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // ROUNDDOWN
  //----------------------------------------------------------------------------

  test.each([
    [-1.9, -1],
    [-1.5, -1],
    [-1.4, -1],
    [0, 0],
    [1.4, 1],
    [1.5, 1],
    [1.9, 1]
  ])("ROUNDDOWN(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(ROUNDDOWN(a)).toBe(expected);
  });

  test.each([
    [true, 1],
    [false, 0],
    [null, 0]
  ])("ROUNDDOWN(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(ROUNDDOWN(a)).toBe(expected);
  });

  test.each([
    [0.3, 2, 0.3],
    [0.34, 2, 0.34],
    [0.349, 2, 0.34],
    [-0.3, 2, -0.3],
    [-0.34, 2, -0.34],
    [-0.349, 2, -0.34],
    [0.349, 1.9, 0.3],
    [-0.349, 1.9, -0.3],
    [9, -1, 0],
    [19, -1, 10],
    [599, -2, 500],
    [-19, -1, -10],
    [-599, -2, -500],
    [19, -1.9, 10],
    [-19, -1.9, -10]
  ])("ROUNDDOWN(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(ROUNDDOWN(a, b)).toBe(expected);
  });

  test.each([
    [true, 42, 1],
    [false, 42, 0],
    [null, 42, 0],
    [42.49, true, 42.4],
    [42.49, false, 42],
    [42.49, null, 42]
  ])(
    "ROUNDDOWN(%s, %s) - %s: take 2 parameter(s), return a number, casting test",
    (a, b, expected) => {
      expect(ROUNDDOWN(a, b)).toBe(expected);
    }
  );

  //----------------------------------------------------------------------------
  // ROUNDUP
  //----------------------------------------------------------------------------

  test.each([
    [-1.6, -2],
    [-1.5, -2],
    [-1.1, -2],
    [0, 0],
    [1.1, 2],
    [1.5, 2],
    [1.6, 2]
  ])("ROUNDUP(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(ROUNDUP(a)).toBe(expected);
  });

  test.each([
    [true, 1],
    [false, 0],
    [null, 0]
  ])("ROUNDUP(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(ROUNDUP(a)).toBe(expected);
  });

  test.each([
    [0.3, 2, 0.3],
    [0.34, 2, 0.34],
    [0.341, 2, 0.35],
    [-0.3, 2, -0.3],
    [-0.34, 2, -0.34],
    [-0.341, 2, -0.35],
    [0.311, 1.9, 0.4],
    [-0.311, 1.9, -0.4],
    [1, -1, 10],
    [11, -1, 20],
    [1, -2, 100],
    [-11, -1, -20],
    [1, -2, 100],
    [11, -1.9, 20],
    [-11, -1.9, -20]
  ])("ROUNDUP(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(ROUNDUP(a, b)).toBe(expected);
  });

  test.each([
    [true, 42, 1],
    [false, 42, 0],
    [null, 42, 0],
    [42.41, true, 42.5],
    [42.41, false, 43],
    [42.41, null, 43]
  ])(
    "ROUNDUP(%s, %s) - %s: take 2 parameter(s), return a number, casting test",
    (a, b, expected) => {
      expect(ROUNDUP(a, b)).toBe(expected);
    }
  );

  //----------------------------------------------------------------------------
  // SIN
  //----------------------------------------------------------------------------

  test.each([
    [0, 0],
    [Math.PI, 0],
    [Math.PI * 2, 0],
    [Math.PI / 2, 1],
    [Math.PI / 6, 0.5],
    [-Math.PI / 2, -1]
  ])("SIN(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(SIN(a)).toBeCloseTo(expected, 9);
  });

  test.each([
    [true, 0.8414709848],
    [false, 0],
    [null, 0]
  ])("SIN(%s) - %s: take 1 parameter(s), return a number, casting test ", (a, expected) => {
    expect(SIN(a)).toBeCloseTo(expected, 9);
  });

  //----------------------------------------------------------------------------
  // SQRT
  //----------------------------------------------------------------------------

  test.each([
    [0, 0],
    [4, 2],
    [9, 3]
  ])("SQRT(%s) - %s: take 1 parameter(s), return a numner", (a, expected) => {
    expect(SQRT(a)).toBe(expected);
  });

  test.each([[-4], [-9]])("SQRT(%s) - error: take 1 parameter(s), return an error ", a => {
    expect(() => {
      SQRT(a);
    }).toThrowErrorMatchingSnapshot();
  });

  test.each([
    [true, 1],
    [false, 0],
    [null, 0]
  ])("SQRT(%s) - %s: take 1 parameter(s), return a number, casting test ", (a, expected) => {
    expect(SQRT(a)).toBe(expected);
  });

  //----------------------------------------------------------------------------
  // SUM
  //----------------------------------------------------------------------------

  test("SUM: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUM()" })).toEqual("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
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

  // prettier-ignore
  test("SUM: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3)", A2: "1", A3: "2" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3, A4)", A2: "1", A3: "", A4: "1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=SUM(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Vier"})).toBe(-8.5);
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
      E4: '" "'
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toEqual(6);
    expect(gridResult.A2).toEqual(6);
    expect(gridResult.A3).toEqual(0);
    expect(gridResult.A4).toEqual(0);
    expect(gridResult.B1).toEqual(3);
    expect(gridResult.C1).toEqual(3);
    expect(gridResult.D1).toEqual(0);
    expect(gridResult.E1).toEqual(0);
  });

  //----------------------------------------------------------------------------
  // TRUNC
  //----------------------------------------------------------------------------

  test.each([
    [-1.6, -1],
    [-1.5, -1],
    [-1.4, -1],
    [0, 0],
    [1.4, 1],
    [1.5, 1],
    [1.6, 1]
  ])("TRUNC(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(TRUNC(a)).toBe(expected);
  });

  test.each([
    [true, 1],
    [false, 0],
    [null, 0]
  ])("TRUNC(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(TRUNC(a)).toBe(expected);
  });

  test.each([
    [0.3, 2, 0.3],
    [0.34, 2, 0.34],
    [0.345, 2, 0.34],
    [-0.3, 2, -0.3],
    [-0.34, 2, -0.34],
    [-0.345, 2, -0.34],
    [0.345, 1.9, 0.3],
    [-0.345, 1.9, -0.3],
    [12345, -1, 12340],
    [123456, -1, 123450],
    [12345, -2, 12300],
    [-123456, -1, -123450],
    [-12345, -2, -12300],
    [12345, -1.9, 12340],
    [-12345, -1.9, -12340]
  ])("TRUNC(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(TRUNC(a, b)).toBe(expected);
  });

  test.each([
    [true, 42, 1],
    [false, 42, 0],
    [null, 42, 0],
    [42.42, true, 42.4],
    [42.42, false, 42],
    [42.42, null, 42]
  ])("TRUNC(%s, %s) - %s: take 2 parameter(s), return a number, casting test", (a, b, expected) => {
    expect(TRUNC(a, b)).toBe(expected);
  });

  test("RAND: return a number", () => {
    const random = RAND();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(1);
  });

  test("MIN", () => {
    expect(MIN(0, 1, 2, -1)).toBe(-1);
    expect(MIN(0, 1, 2)).toBe(0);
    expect(MIN(1, 2)).toBe(1);
    expect(MIN(true, 2)).toBe(1);
    expect(MIN(null, true)).toBe(0);
    expect(MIN(null, null)).toBe(0);
    expect(MIN(-5)).toBe(-5);
    expect(MIN([[1, 2, null, -1]])).toBe(-1);
    expect(MIN([[null, null, null]])).toBe(0);
    expect(MIN([[null, null, -1]])).toBe(-1);
    expect(MIN([[null, 2, null]])).toBe(2);
    expect(MIN([["one", 22, false]])).toBe(22);
  });

  test("MAX", () => {
    expect(MAX(0, 1, 2, -1)).toBe(2);
    expect(MAX(0, 1, 2)).toBe(2);
    expect(MAX(1, 2)).toBe(2);
    expect(MAX(-5)).toBe(-5);
    expect(MAX(true, 2)).toBe(2);
    expect(MAX(true, 0)).toBe(1);
    expect(MAX(null, true)).toBe(1);
    expect(MAX(null, null)).toBe(0);
    expect(MAX([[1, 2, null, -1]])).toBe(2);
    expect(MAX([[null, null, null]])).toBe(0);
    expect(MAX([[null, null, -1]])).toBe(-1);
    expect(MAX([[null, 2, null]])).toBe(2);
    expect(MAX([["onasdfe", -2, true]])).toBe(-2);
  });
});
