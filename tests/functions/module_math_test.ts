import { functionMap } from "../../src/functions/index";

const { CEILING, DECIMAL, DEGREES, ISEVEN, ISODD, MOD, ODD, SUM, RAND, MIN, MAX } = functionMap;

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
    expect(CEILING(a)).toEqual(expected);
    expect(functionMap["CEILING.MATH"](a)).toEqual(expected);
    expect(functionMap["CEILING.PRECISE"](a)).toEqual(expected);
    expect(functionMap["ISO.CEILING"](a)).toEqual(expected);
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
  ])("CEILING(%s, %s) - %s: if factor negative, rouds number down", (a, b, expected) => {
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
    expect(DECIMAL(a, b)).toEqual(expected);
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
      expect(DECIMAL(a, b)).toEqual(expected);
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
    expect(DEGREES(a)).toEqual(expected);
  });

  test.each([
    [true, 57.29577951308232], // @compatibility: on google sheets return 57.2957795130823() and not (2)
    [false, 0],
    [null, 0]
  ])("DEGREES(%s) - %s: take 1 parameter(s), return a number, casting test", (a, expected) => {
    expect(DEGREES(a)).toEqual(expected);
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
    expect(ISEVEN(a)).toEqual(expected);
  });

  test.each([
    [true, false],
    [false, true],
    [null, true]
  ])("ISEVEN(%s) - %s: take 1 parameter(s), return a boolean, casting test", (a, expected) => {
    expect(ISEVEN(a)).toEqual(expected);
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
    expect(ISODD(a)).toEqual(expected);
  });

  test.each([
    [true, true],
    [false, false],
    [null, false]
  ])("ISODD(%s) - %s: take 1 parameter(s), return a boolean, casting test", (a, expected) => {
    expect(ISODD(a)).toEqual(expected);
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
    expect(ODD(a)).toEqual(expected);
  });

  test.each([
    [true, 1],
    [false, 1],
    [null, 1]
  ])("ODD(%s) - %s: take 1 parameter(s), return a number, casting test ", (a, expected) => {
    expect(ODD(a)).toEqual(expected);
  });

  test("SUM: add some numbers", () => {
    expect(SUM(1, 2)).toEqual(3);
    expect(SUM(1, 2, 3)).toEqual(6);
  });

  test("SUM: add some ranges", () => {
    expect(SUM([[1, 2]])).toEqual(3);
    expect(SUM(1, [[2, 3]])).toEqual(6);
    expect(SUM([[1], [2], [3]])).toEqual(6);
    expect(SUM([[1], [2]], 3)).toEqual(6);
  });

  test("SUM: add a number and a string", () => {
    expect(SUM([[11, "str"]])).toEqual(11);
    expect(SUM([[11], ["str"]])).toEqual(11);
    expect(() => SUM(11, "str")).toThrow(
      `Argument "number" should be a number, but "str" is a text, and cannot be coerced to a number.`
    );
  });

  test("RAND: return a number", () => {
    const random = RAND();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(1);
  });

  test("MIN", () => {
    expect(MIN(0, 1, 2, -1)).toEqual(-1);
    expect(MIN(0, 1, 2)).toEqual(0);
    expect(MIN(1, 2)).toEqual(1);
    expect(MIN(true, 2)).toEqual(1);
    expect(MIN(null, true)).toEqual(0);
    expect(MIN(null, null)).toEqual(0);
    expect(MIN(-5)).toEqual(-5);
    expect(MIN([[1, 2, null, -1]])).toEqual(-1);
    expect(MIN([[null, null, null]])).toEqual(0);
    expect(MIN([[null, null, -1]])).toEqual(-1);
    expect(MIN([[null, 2, null]])).toEqual(2);
    expect(MIN([["one", 22, false]])).toEqual(22);
  });

  test("MAX", () => {
    expect(MAX(0, 1, 2, -1)).toEqual(2);
    expect(MAX(0, 1, 2)).toEqual(2);
    expect(MAX(1, 2)).toEqual(2);
    expect(MAX(-5)).toEqual(-5);
    expect(MAX(true, 2)).toEqual(2);
    expect(MAX(true, 0)).toEqual(1);
    expect(MAX(null, true)).toEqual(1);
    expect(MAX(null, null)).toEqual(0);
    expect(MAX([[1, 2, null, -1]])).toEqual(2);
    expect(MAX([[null, null, null]])).toEqual(0);
    expect(MAX([[null, null, -1]])).toEqual(-1);
    expect(MAX([[null, 2, null]])).toEqual(2);
    expect(MAX([["onasdfe", -2, true]])).toEqual(-2);
  });
});
