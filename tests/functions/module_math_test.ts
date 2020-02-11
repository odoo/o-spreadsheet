import { functionMap } from "../../src/functions/index";

const { CEILING, DECIMAL, SUM, RAND, MIN, MAX } = functionMap;

describe("math", () => {
  //----------------------------------------------------------------------------
  // CEILING
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [0, 6, 6.7, 6.78, -6, -6.7, -6.78]
  // b = [0, 0.1, 0.2, -0.1, -0.2]

  test.each([
    [0, 0],
    [6, 6],
    [6.7, 7],
    [6.78, 7],
    [-6, -6],
    [-6.7, -6],
    [-6.78, -6]
  ])("CEILING(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(CEILING(a)).toEqual(expected);
  });

  test.each([
    [0, 0, 0],
    [0, 0.1, 0],
    [0, 0.2, 0],
    [0, -0.1, 0],
    [0, -0.2, 0],
    [6, 0, 0],
    [6, 0.1, 6],
    [6, 0.2, 6],
    [6.7, 0, 0],
    [6.7, 0.1, 6.7],
    [6.7, 0.2, 6.8],
    [6.78, 0, 0],
    [6.78, 0.1, 6.8],
    [6.78, 0.2, 6.8],
    [-6, 0, 0],
    [-6, 0.1, -6],
    [-6, 0.2, -6],
    [-6, -0.1, -6],
    [-6, -0.2, -6],
    [-6.7, 0, 0],
    [-6.7, 0.1, -6.7],
    [-6.7, 0.2, -6.6],
    [-6.7, -0.1, -6.7],
    [-6.7, -0.2, -6.8],
    [-6.78, 0, 0],
    [-6.78, 0.1, -6.7],
    [-6.78, 0.2, -6.6],
    [-6.78, -0.1, -6.8],
    [-6.78, -0.2, -6.8]
  ])("CEILING(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(CEILING(a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    [6, -0.2],
    [6.7, -0.1],
    [6.7, -0.2],
    [6.78, -0.1],
    [6.78, -0.2]
  ])("CEILING(%s, %s) - error: take 2 parameter(s), return an error", (a, b) => {
    expect(() => {
      CEILING(a, b);
    }).toThrowErrorMatchingSnapshot();
  });

  //----------------------------------------------------------------------------
  // CEILING.MATH
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [0, 6, 6.7, 6.78, -6, -6.7, -6.78]
  // b = [0, 0.1, 0.2, -0.1, -0.2]
  // c = [0, 1, 2, -1, -2]

  test.each([
    [0, 0],
    [6, 6],
    [6.7, 7],
    [6.78, 7],
    [-6, -6],
    [-6.7, -6],
    [-6.78, -6]
  ])("CEILING.MATH(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(functionMap["CEILING.MATH"](a)).toEqual(expected);
  });

  test.each([
    [0, 0, 0],
    [0, 0.1, 0],
    [0, 0.2, 0],
    [0, -0.1, 0],
    [0, -0.2, 0],
    [6, 0, 0],
    [6, 0.1, 6],
    [6, 0.2, 6],
    [6, -0.1, 6],
    [6, -0.2, 6],
    [6.7, 0, 0],
    [6.7, 0.1, 6.7],
    [6.7, 0.2, 6.8],
    [6.7, -0.1, 6.7],
    [6.7, -0.2, 6.8],
    [6.78, 0, 0],
    [6.78, 0.1, 6.8],
    [6.78, 0.2, 6.8],
    [6.78, -0.1, 6.8],
    [6.78, -0.2, 6.8],
    [-6, 0, 0],
    [-6, 0.1, -6],
    [-6, 0.2, -6],
    [-6, -0.1, -6],
    [-6, -0.2, -6],
    [-6.7, 0, 0],
    [-6.7, 0.1, -6.7],
    [-6.7, 0.2, -6.6],
    [-6.7, -0.1, -6.7],
    [-6.7, -0.2, -6.6],
    [-6.78, 0, 0],
    [-6.78, 0.1, -6.7],
    [-6.78, 0.2, -6.6],
    [-6.78, -0.1, -6.7],
    [-6.78, -0.2, -6.6]
  ])("CEILING.MATH(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(functionMap["CEILING.MATH"](a, b)).toBeCloseTo(expected, 9);
  });

  test.each([
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 2, 0],
    [0, 0, -1, 0],
    [0, 0, -2, 0],
    [0, 0.1, 0, 0],
    [0, 0.1, 1, 0],
    [0, 0.1, 2, 0],
    [0, 0.1, -1, 0],
    [0, 0.1, -2, 0],
    [0, 0.2, 0, 0],
    [0, 0.2, 1, 0],
    [0, 0.2, 2, 0],
    [0, 0.2, -1, 0],
    [0, 0.2, -2, 0],
    [0, -0.1, 0, 0],
    [0, -0.1, 1, 0],
    [0, -0.1, 2, 0],
    [0, -0.1, -1, 0],
    [0, -0.1, -2, 0],
    [0, -0.2, 0, 0],
    [0, -0.2, 1, 0],
    [0, -0.2, 2, 0],
    [0, -0.2, -1, 0],
    [0, -0.2, -2, 0],
    [6, 0, 0, 0],
    [6, 0, 1, 0],
    [6, 0, 2, 0],
    [6, 0, -1, 0],
    [6, 0, -2, 0],
    [6, 0.1, 0, 6],
    [6, 0.1, 1, 6],
    [6, 0.1, 2, 6],
    [6, 0.1, -1, 6],
    [6, 0.1, -2, 6],
    [6, 0.2, 0, 6],
    [6, 0.2, 1, 6],
    [6, 0.2, 2, 6],
    [6, 0.2, -1, 6],
    [6, 0.2, -2, 6],
    [6, -0.1, 0, 6],
    [6, -0.1, 1, 6],
    [6, -0.1, 2, 6],
    [6, -0.1, -1, 6],
    [6, -0.1, -2, 6],
    [6, -0.2, 0, 6],
    [6, -0.2, 1, 6],
    [6, -0.2, 2, 6],
    [6, -0.2, -1, 6],
    [6, -0.2, -2, 6],
    [6.7, 0, 0, 0],
    [6.7, 0, 1, 0],
    [6.7, 0, 2, 0],
    [6.7, 0, -1, 0],
    [6.7, 0, -2, 0],
    [6.7, 0.1, 0, 6.7],
    [6.7, 0.1, 1, 6.7],
    [6.7, 0.1, 2, 6.7],
    [6.7, 0.1, -1, 6.7],
    [6.7, 0.1, -2, 6.7],
    [6.7, 0.2, 0, 6.8],
    [6.7, 0.2, 1, 6.8],
    [6.7, 0.2, 2, 6.8],
    [6.7, 0.2, -1, 6.8],
    [6.7, 0.2, -2, 6.8],
    [6.7, -0.1, 0, 6.7],
    [6.7, -0.1, 1, 6.7],
    [6.7, -0.1, 2, 6.7],
    [6.7, -0.1, -1, 6.7],
    [6.7, -0.1, -2, 6.7],
    [6.7, -0.2, 0, 6.8],
    [6.7, -0.2, 1, 6.8],
    [6.7, -0.2, 2, 6.8],
    [6.7, -0.2, -1, 6.8],
    [6.7, -0.2, -2, 6.8],
    [6.78, 0, 0, 0],
    [6.78, 0, 1, 0],
    [6.78, 0, 2, 0],
    [6.78, 0, -1, 0],
    [6.78, 0, -2, 0],
    [6.78, 0.1, 0, 6.8],
    [6.78, 0.1, 1, 6.8],
    [6.78, 0.1, 2, 6.8],
    [6.78, 0.1, -1, 6.8],
    [6.78, 0.1, -2, 6.8],
    [6.78, 0.2, 0, 6.8],
    [6.78, 0.2, 1, 6.8],
    [6.78, 0.2, 2, 6.8],
    [6.78, 0.2, -1, 6.8],
    [6.78, 0.2, -2, 6.8],
    [6.78, -0.1, 0, 6.8],
    [6.78, -0.1, 1, 6.8],
    [6.78, -0.1, 2, 6.8],
    [6.78, -0.1, -1, 6.8],
    [6.78, -0.1, -2, 6.8],
    [6.78, -0.2, 0, 6.8],
    [6.78, -0.2, 1, 6.8],
    [6.78, -0.2, 2, 6.8],
    [6.78, -0.2, -1, 6.8],
    [6.78, -0.2, -2, 6.8],
    [-6, 0, 0, 0],
    [-6, 0, 1, 0],
    [-6, 0, 2, 0],
    [-6, 0, -1, 0],
    [-6, 0, -2, 0],
    [-6, 0.1, 0, -6],
    [-6, 0.1, 1, -6],
    [-6, 0.1, 2, -6],
    [-6, 0.1, -1, -6],
    [-6, 0.1, -2, -6],
    [-6, 0.2, 0, -6],
    [-6, 0.2, 1, -6],
    [-6, 0.2, 2, -6],
    [-6, 0.2, -1, -6],
    [-6, 0.2, -2, -6],
    [-6, -0.1, 0, -6],
    [-6, -0.1, 1, -6],
    [-6, -0.1, 2, -6],
    [-6, -0.1, -1, -6],
    [-6, -0.1, -2, -6],
    [-6, -0.2, 0, -6],
    [-6, -0.2, 1, -6],
    [-6, -0.2, 2, -6],
    [-6, -0.2, -1, -6],
    [-6, -0.2, -2, -6],
    [-6.7, 0, 0, 0],
    [-6.7, 0, 1, 0],
    [-6.7, 0, 2, 0],
    [-6.7, 0, -1, 0],
    [-6.7, 0, -2, 0],
    [-6.7, 0.1, 0, -6.7],
    [-6.7, 0.1, 1, -6.7],
    [-6.7, 0.1, 2, -6.7],
    [-6.7, 0.1, -1, -6.7],
    [-6.7, 0.1, -2, -6.7],
    [-6.7, 0.2, 0, -6.6],
    [-6.7, 0.2, 1, -6.8],
    [-6.7, 0.2, 2, -6.8],
    [-6.7, 0.2, -1, -6.8],
    [-6.7, 0.2, -2, -6.8],
    [-6.7, -0.1, 0, -6.7],
    [-6.7, -0.1, 1, -6.7],
    [-6.7, -0.1, 2, -6.7],
    [-6.7, -0.1, -1, -6.7],
    [-6.7, -0.1, -2, -6.7],
    [-6.7, -0.2, 0, -6.6],
    [-6.7, -0.2, 1, -6.8],
    [-6.7, -0.2, 2, -6.8],
    [-6.7, -0.2, -1, -6.8],
    [-6.7, -0.2, -2, -6.8],
    [-6.78, 0, 0, 0],
    [-6.78, 0, 1, 0],
    [-6.78, 0, 2, 0],
    [-6.78, 0, -1, 0],
    [-6.78, 0, -2, 0],
    [-6.78, 0.1, 0, -6.7],
    [-6.78, 0.1, 1, -6.8],
    [-6.78, 0.1, 2, -6.8],
    [-6.78, 0.1, -1, -6.8],
    [-6.78, 0.1, -2, -6.8],
    [-6.78, 0.2, 0, -6.6],
    [-6.78, 0.2, 1, -6.8],
    [-6.78, 0.2, 2, -6.8],
    [-6.78, 0.2, -1, -6.8],
    [-6.78, 0.2, -2, -6.8],
    [-6.78, -0.1, 0, -6.7],
    [-6.78, -0.1, 1, -6.8],
    [-6.78, -0.1, 2, -6.8],
    [-6.78, -0.1, -1, -6.8],
    [-6.78, -0.1, -2, -6.8],
    [-6.78, -0.2, 0, -6.6],
    [-6.78, -0.2, 1, -6.8],
    [-6.78, -0.2, 2, -6.8],
    [-6.78, -0.2, -1, -6.8],
    [-6.78, -0.2, -2, -6.8]
  ])("CEILING.MATH(%s, %s, %s) - %s: take 3 parameter(s), return a number", (a, b, c, expected) => {
    expect(functionMap["CEILING.MATH"](a, b, c)).toBeCloseTo(expected, 9);
  });

  //----------------------------------------------------------------------------
  // CEILING.PRECISE
  //----------------------------------------------------------------------------

  // domain parameter:
  // a = [0, 6, 6.7, 6.78, -6, -6.7, -6.78]
  // b = [0, 0.1, 0.2, -0.1, -0.2]

  test.each([
    [0, 0],
    [6, 6],
    [6.7, 7],
    [6.78, 7],
    [-6, -6],
    [-6.7, -6],
    [-6.78, -6]
  ])("CEILING.PRECISE(%s) - %s: take 1 parameter(s), return a number", (a, expected) => {
    expect(functionMap["CEILING.PRECISE"](a)).toEqual(expected);
  });

  test.each([
    [0, 0, 0],
    [0, 0.1, 0],
    [0, 0.2, 0],
    [0, -0.1, 0],
    [0, -0.2, 0],
    [6, 0, 0],
    [6, 0.1, 6],
    [6, 0.2, 6],
    [6, -0.1, 6],
    [6, -0.2, 6],
    [6.7, 0, 0],
    [6.7, 0.1, 6.7],
    [6.7, 0.2, 6.8],
    [6.7, -0.1, 6.7],
    [6.7, -0.2, 6.8],
    [6.78, 0, 0],
    [6.78, 0.1, 6.8],
    [6.78, 0.2, 6.8],
    [6.78, -0.1, 6.8],
    [6.78, -0.2, 6.8],
    [-6, 0, 0],
    [-6, 0.1, -6],
    [-6, 0.2, -6],
    [-6, -0.1, -6],
    [-6, -0.2, -6],
    [-6.7, 0, 0],
    [-6.7, 0.1, -6.7],
    [-6.7, 0.2, -6.6],
    [-6.7, -0.1, -6.7],
    [-6.7, -0.2, -6.6],
    [-6.78, 0, 0],
    [-6.78, 0.1, -6.7],
    [-6.78, 0.2, -6.6],
    [-6.78, -0.1, -6.7],
    [-6.78, -0.2, -6.6]
  ])("CEILING.PRECISE(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(functionMap["CEILING.PRECISE"](a, b)).toBeCloseTo(expected, 9);
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
    expect(MIN(undefined, true)).toEqual(0);
    expect(MIN(undefined, undefined)).toEqual(0);
    expect(MIN(-5)).toEqual(-5);
    expect(MIN([[1, 2, undefined, -1]])).toEqual(-1);
    expect(MIN([[undefined, undefined, undefined]])).toEqual(0);
    expect(MIN([[undefined, undefined, -1]])).toEqual(-1);
    expect(MIN([[undefined, 2, undefined]])).toEqual(2);
    expect(MIN([["one", 22, false]])).toEqual(22);
  });

  test("MAX", () => {
    expect(MAX(0, 1, 2, -1)).toEqual(2);
    expect(MAX(0, 1, 2)).toEqual(2);
    expect(MAX(1, 2)).toEqual(2);
    expect(MAX(-5)).toEqual(-5);
    expect(MAX(true, 2)).toEqual(2);
    expect(MAX(true, 0)).toEqual(1);
    expect(MAX(undefined, true)).toEqual(1);
    expect(MAX(undefined, undefined)).toEqual(0);
    expect(MAX([[1, 2, undefined, -1]])).toEqual(2);
    expect(MAX([[undefined, undefined, undefined]])).toEqual(0);
    expect(MAX([[undefined, undefined, -1]])).toEqual(-1);
    expect(MAX([[undefined, 2, undefined]])).toEqual(2);
    expect(MAX([["onasdfe", -2, true]])).toEqual(-2);
  });
});
