import { Model } from "../../src";
import { toNumber } from "../../src/functions/helpers";
import { DEFAULT_LOCALE } from "../../src/types";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  evaluateCell,
  evaluateCellFormat,
  evaluateGrid,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("ABS formula", () => {
  test("take 1 argument", () => {
    expect(evaluateCell("A1", { A1: "=ABS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ABS(-42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ABS(-42, 24)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test.each([
    ["123", 123],
    ["-123", 123],
    ["-0.9", 0.9],
  ])("business logic > return the ABS", (value, result) => {
    expect(evaluateCell("A1", { A1: "=ABS(A2)", A2: value })).toBe(result);
  });

  describe("casting test", () => {
    test("empty cell are considered as 0", () => {
      expect(evaluateCell("A1", { A1: "=ABS(A2)" })).toBe(0);
    });
    test("string/string in cell which can be cast in number are interpreted as numbers", () => {
      expect(evaluateCell("A1", { A1: '=ABS("-100")' })).toBe(100);
      expect(evaluateCell("A1", { A1: "=ABS(A2)", A2: '="-100"' })).toBe(100);
    });
    test("string/string in cell which cannot be cast in number return an error", () => {
      expect(evaluateCell("A1", { A1: '=ABS(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
      expect(evaluateCell("A1", { A1: '=ABS("kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
      expect(evaluateCell("A1", { A1: "=ABS(A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE
    });
    test("boolean/boolean in cell are interpreted as numbers", () => {
      expect(evaluateCell("A1", { A1: "=ABS(-TRUE)" })).toBe(1);
      expect(evaluateCell("A1", { A1: "=ABS(-FALSE)" })).toBe(0);
      expect(evaluateCell("A1", { A1: "=ABS(A2)", A2: "TRUE" })).toBe(1);
    });
  });
});

describe("ACOS formula", () => {
  test.each([
    ["1", 0],
    ["-1", Math.PI],
    ["0", Math.PI / 2],
    ["0.5", Math.PI / 3],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["2"], ["-1.5"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("special value testing", () => {
    expect(evaluateCell("A1", { A1: "=ACOS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ACOS(TRUE)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=ACOS(FALSE)" })).toBeCloseTo(Math.PI / 2, 9);

    expect(evaluateCell("A1", { A1: '=ACOS("")' })).toBeCloseTo(Math.PI / 2, 9);
    expect(evaluateCell("A1", { A1: '=ACOS(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ACOS("0")' })).toBeCloseTo(Math.PI / 2, 9);

    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: "" })).toBeCloseTo(Math.PI / 2, 9);
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: "0" })).toBeCloseTo(Math.PI / 2, 9);

    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '=""' })).toBeCloseTo(Math.PI / 2, 9);
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ACOS(A2)", A2: '="0"' })).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("ACOSH formula", () => {
  test.each([
    ["1.54308063481524", 1],
    ["1", 0],
    ["1.25", Math.log(2)],
    ["2.125", Math.log(4)],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ACOSH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["-2"], ["0.5"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=ACOSH(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });
});

describe("ACOT formula", () => {
  test.each([
    ["0", Math.PI / 2],
    ["1", Math.PI / 4],
    ["-1", -Math.PI / 4],
    ["2", 0.463647609],
    ["-4", -0.244978663],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ACOT(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("ACOTH formula", () => {
  test.each([
    ["1.25", Math.log(3)],
    ["1.1", 1.522261219],
    ["2", 0.549306144],
    ["-3", -0.34657359],
    ["-4", -0.255412812],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ACOTH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"], ["1"], ["-1"], ["0.5"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=ACOTH(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });
});

describe("ASIN formula", () => {
  test.each([
    ["1", Math.PI / 2],
    ["-1", -Math.PI / 2],
    ["0", 0],
    ["0.5", Math.PI / 6],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ASIN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["2"], ["-1.5"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=ASIN(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });
});

describe("ASINH formula", () => {
  test.each([
    ["1.175201194", 1],
    ["-3.626860408", -2],
    ["0", 0],
    ["0.75", Math.log(2)],
    ["-1.875", -Math.log(4)],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ASINH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("ATAN formula", () => {
  test.each([
    ["0", 0],
    ["1", Math.PI / 4],
    ["1.557407725", 1],
    ["-2", -1.107148718],
    ["-4", -1.325817664],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ATAN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("ATAN2 formula", () => {
  test.each([
    ["42", "0", 0],
    ["0", "42", Math.PI / 2],
    ["2", "2", Math.PI / 4],
    ["-2", "3", 2.15879893],
    ["4", "-7", -1.051650213],
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ATAN2(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
  });

  test.each([["0", "0"]])("take 2 parameter, return an error", (a, b) => {
    expect(evaluateCell("A1", { A1: "=ATAN2(A2, A3)", A2: a, A3: b })).toBe("#DIV/0!");
  });
});

describe("ATANH formula", () => {
  test.each([
    ["0.8", Math.log(3)],
    ["0.6", Math.log(2)],
    ["0", 0],
    [" 0.761594156", 1],
    ["-0.9", -1.47221949],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ATANH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["1.1"], ["-1"], ["42"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=ATANH(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });
});

describe("CEILING / CEILING.MATH / CEILING.PRECISE / ISO.CEILING formulas", () => {
  test.each([
    ["0", 0],
    ["6", 6],
    ["-6", -6],
    ["6.7", 7],
    ["7.89", 8],
    ["-6.7", -6],
    ["-7.89", -7],
  ])("take 1 parameters, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
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
  ])("MATH/PRECISE/ISO: no effect with negative factor", (a, b, expected) => {
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
    ["6", "-0.2"],
    ["7.89", "-0.2"],
  ])("CEILING: if value positive, factor can't be negative", (a, b) => {
    expect(evaluateCell("A1", { A1: "=CEILING(A2, A3)", A2: a, A3: b })).toBe("#ERROR");
  });

  test.each([
    // Concerning CEILING function
    // if "a" is negative and "b" is negative, rounds a number down (and not up)
    // the nearest integer multiple of b
    ["-7.89", "0.2", -7.8],
    ["-7.89", "-0.2", -8],
  ])("CEILING: if factor negative, rounds number down", (a, b, expected) => {
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
  ])("CEILING.MATH: take 3 parameters, return a number", (a, b, c, expected) => {
    expect(
      evaluateCell("A1", { A1: "=CEILING.MATH(A2, A3, A4)", A2: a, A3: b, A4: c })
    ).toBeCloseTo(expected, 9);
  });

  function evaluateCeilingFunction(functionName: string): void {
    expect(evaluateCell("A1", { A1: "=" + functionName + "()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , )" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, 0.2)" })).toBeCloseTo(-7.8, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "( , 0.2)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, )" })).toBeCloseTo(-7, 9);
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
    "special value testing",
    (functionName) => {
      evaluateCeilingFunction(functionName);
    }
  );

  test.each([["CEILING"], ["CEILING.MATH"], ["CEILING.PRECISE"], ["ISO.CEILING"]])(
    "result format depends on 1st argument",
    (functionName) => {
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "0.05", A3: "0.2" })
      ).toBe("");
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "5%", A3: "0.2" })
      ).toBe("0%");
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "4.8€", A3: "0.2" })
      ).toBe("#,##0.00[$€]");
    }
  );
});

describe("COS formula", () => {
  test.each([
    ["0", 1],
    ["=PI()", -1],
    ["=PI()*2", 1],
    ["=PI()/2", 0],
    ["=PI()/3", 0.5],
    ["=-PI()/2", 0],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=COS(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test("special value testing", () => {
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
});

describe("COSH formula", () => {
  test.each([
    ["0", 1],
    ["1", 1.543080635],
    ["-1", 1.543080635],
    ["=LN(2)", 1.25],
    ["=LN(4)", 2.125],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=COSH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("COT formula", () => {
  test.each([
    ["=PI()/2", 0],
    ["=PI()/4", 1],
    ["=-PI()*5/4", -1],
    ["1", 0.642092616],
    ["2", -0.457657554],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=COT(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=COT(A2)", A2: a })).toBe("#DIV/0!");
  });
});

describe("COTH formula", () => {
  test.each([
    ["=LN(3)", 1.25],
    ["1", 1.313035285],
    ["2", 1.037314721],
    ["-3", -1.004969823],
    ["-4", -1.00067115],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=COTH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"]])("take 1 parameter(s), return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=COTH(A2)", A2: a })).toBe("#DIV/0!");
  });
});

describe("COUNTBLANK formula", () => {
  test("functional tests on simple arguments", () => {
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
  test("count blank on ranges ", () => {
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

  test("COUNTBLANK accepts errors in parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM",
      A2: "1",       B2: "=1/0",
    };
    expect(evaluateCell("A3", { A3: "=COUNTBLANK(A1:B2)", ...grid })).toBe(1);
  });
});

describe("COUNTIF formula", () => {
  // prettier-ignore
  test("operator tests on type number and type string", () => {
    const grid = {
      A1 : "1" , B1 : '="1"',
      A2 : "10", B2 : '="10"',
      A3 : "2" , B3 : '="2"',
      A4 : "20", B4 : '="20"',
      A5 : "3" , B5 : '="3"',
      A6 : "30", B6 : '="30"',
      A7 : "4" , B7 : '="4"',
      A8 : "40", B8 : '="40"',

      A10: "=COUNTIF(A1:A8, 20)"      , B10: "=COUNTIF(B1:B8, 20)",
      A11: '=COUNTIF(A1:A8, "20")'    , B11: '=COUNTIF(B1:B8, "20")',
      A12: '=COUNTIF(A1:A8, "=20")'   , B12: '=COUNTIF(B1:B8, "=20")',

      A14: '=COUNTIF(A1:A8, "2*")'    , B14: '=COUNTIF(B1:B8, "2*")',

      A16: '=COUNTIF(A1:A8, "<20")'   , B16: '=COUNTIF(B1:B8, "<20")',
      A17: '=COUNTIF(A1:A8, ">20")'   , B17: '=COUNTIF(B1:B8, ">20")',

      A19: '=COUNTIF(A1:A8, "< 20 ")' , B19: '=COUNTIF(B1:B8, "< 20 ")',
      A20: '=COUNTIF(A1:A8, "> 20 ")' , B20: '=COUNTIF(B1:B8, "> 20 ")',

      A22: '=COUNTIF(A1:A8, "< 20% ")', B22: '=COUNTIF(B1:B8, "< 20% ")',
      A23: '=COUNTIF(A1:A8, "> 20% ")', B23: '=COUNTIF(B1:B8, "> 20% ")',

      A25: '=COUNTIF(A1:A8, "<a")'    , B25: '=COUNTIF(B1:B8, "<a")',
      A26: '=COUNTIF(A1:A8, ">a")'    , B26: '=COUNTIF(B1:B8, ">a")',

      A28: '=COUNTIF(A1:A8, "<20A")'  , B28: '=COUNTIF(B1:B8, "<20A")',
      A29: '=COUNTIF(A1:A8, ">20A")'  , B29: '=COUNTIF(B1:B8, ">20A")',

      A31: '=COUNTIF(A1:A8, "<2*")'   , B31: '=COUNTIF(B1:B8, "<2*")',
      A32: '=COUNTIF(A1:A8, ">2*")'   , B32: '=COUNTIF(B1:B8, ">2*")',

      A34: '=COUNTIF(A1:A8, "<2?")'   , B34: '=COUNTIF(B1:B8, "<2?")',
      A35: '=COUNTIF(A1:A8, ">2?")'   , B35: '=COUNTIF(B1:B8, ">2?")',

      A37: '=COUNTIF(A1:A8, "<>20")'  , B37: '=COUNTIF(B1:B8, "<>20")',
    };

    const gridResult = evaluateGrid(grid);

    expect(gridResult.A10).toBe(1);  expect(gridResult.B10).toBe(1);
    expect(gridResult.A11).toBe(1);  expect(gridResult.B11).toBe(1);
    expect(gridResult.A12).toBe(1);  expect(gridResult.B12).toBe(1);

    expect(gridResult.A14).toBe(0);  expect(gridResult.B14).toBe(2);

    expect(gridResult.A16).toBe(5);  expect(gridResult.B16).toBe(0);
    expect(gridResult.A17).toBe(2);  expect(gridResult.B17).toBe(0);

    expect(gridResult.A19).toBe(5);  expect(gridResult.B19).toBe(0);
    expect(gridResult.A20).toBe(2);  expect(gridResult.B20).toBe(0);

    expect(gridResult.A22).toBe(0);  expect(gridResult.B22).toBe(0);
    expect(gridResult.A23).toBe(8);  expect(gridResult.B23).toBe(0);

    expect(gridResult.A25).toBe(0);  expect(gridResult.B25).toBe(8);
    expect(gridResult.A26).toBe(0);  expect(gridResult.B26).toBe(0);

    expect(gridResult.A28).toBe(0);  expect(gridResult.B28).toBe(4);
    expect(gridResult.A29).toBe(0);  expect(gridResult.B29).toBe(4);

    expect(gridResult.A31).toBe(0);  expect(gridResult.B31).toBe(3);
    expect(gridResult.A32).toBe(0);  expect(gridResult.B32).toBe(5);

    expect(gridResult.A34).toBe(0);  expect(gridResult.B34).toBe(4); // @compatibility: on google sheet, return 3
    expect(gridResult.A35).toBe(0);  expect(gridResult.B35).toBe(4); // @compatibility: on google sheet, return 5

    expect(gridResult.A37).toBe(7);  expect(gridResult.B37).toBe(8);
  });

  test("operator tests on type boolean", () => {
    expect(evaluateCell("A41", { A41: "=COUNTIF(A39, TRUE)", A39: "TRUE" })).toBe(1);
    expect(evaluateCell("A42", { A42: '=COUNTIF(A39, "TRUE")', A39: "TRUE" })).toBe(1);
    expect(evaluateCell("A43", { A43: '=COUNTIF(A39, "=TRUE")', A39: "TRUE" })).toBe(1);

    expect(evaluateCell("B41", { B41: "=COUNTIF(B39, TRUE)", B39: '="TRUE"' })).toBe(0);
    expect(evaluateCell("B42", { B42: '=COUNTIF(B39, "TRUE")', B39: '="TRUE"' })).toBe(0);
    expect(evaluateCell("B43", { B43: '=COUNTIF(B39, "=TRUE")', B39: '="TRUE"' })).toBe(0);
  });

  test("operator tests on criterion expression", () => {
    const grid1 = {
      A45: "abc",
      A46: "abd",
      A47: "bcd",
      A48: "b~e",
      A49: "x*y",
      A50: "x?z",
      A51: "zZz",
      A52: "zzz",

      C45: '=COUNTIF(A45:A52, "abd")',
      C46: '=COUNTIF(A45:A52, "ab")',
      C47: '=COUNTIF(A45:A52, "=abd")',
      C48: '=COUNTIF(A45:A52, "<abd")',
      C49: '=COUNTIF(A45:A52, ">abd")',
      C50: '=COUNTIF(A45:A52, "<>abd")',
      C51: '=COUNTIF(A45:A52, "><abd")',

      D45: '=COUNTIF(A45:A52, "ab*")',
      D46: '=COUNTIF(A45:A52, "a*")',
      D47: '=COUNTIF(A45:A52, "a*c")',
      D48: '=COUNTIF(A45:A52, "a?")',
      D49: '=COUNTIF(A45:A52, "a?c")',
      D50: '=COUNTIF(A45:A52, "zzz")',
      D51: '=COUNTIF(A45:A52, "x*z")',
      D52: '=COUNTIF(A45:A52, "x~*z")',
      D53: '=COUNTIF(A45:A52, "x~*y")',
      D54: '=COUNTIF(A45:A52, "x?y")',
      D55: '=COUNTIF(A45:A52, "x~?y")',
      D56: '=COUNTIF(A45:A52, "x~?z")',
      D57: '=COUNTIF(A45:A52, "b~e")',
    };

    const grid1Result = evaluateGrid(grid1);

    expect(grid1Result.C45).toBe(1);
    expect(grid1Result.C46).toBe(0);
    expect(grid1Result.C47).toBe(1);
    expect(grid1Result.C48).toBe(1);
    expect(grid1Result.C49).toBe(6);
    expect(grid1Result.C50).toBe(7);
    expect(grid1Result.C51).toBe(8);

    expect(grid1Result.D45).toBe(2);
    expect(grid1Result.D46).toBe(2);
    expect(grid1Result.D47).toBe(1);
    expect(grid1Result.D48).toBe(0);
    expect(grid1Result.D49).toBe(1);
    expect(grid1Result.D50).toBe(2);
    expect(grid1Result.D51).toBe(1);
    expect(grid1Result.D52).toBe(0);
    expect(grid1Result.D53).toBe(1);
    expect(grid1Result.D54).toBe(1);
    expect(grid1Result.D55).toBe(0);
    expect(grid1Result.D56).toBe(1);
    expect(grid1Result.D57).toBe(1);

    const grid2 = {
      A59: "abc",
      A60: "abd",
      A61: "abe",
      A62: "bcd",
      A63: "bce",
      A64: "b$f",
      A65: "b",
      A66: "cdf",
      A67: "cdg",

      C59: '=COUNTIF(A59:A67, "> bcf")',
      C60: '=COUNTIF(A59:A67, ">bcf")',
      C61: '=COUNTIF(A59:A67, ">b?f")',
      C62: '=COUNTIF(A59:A67, ">c*")',

      E59: '=COUNTIF(A59:A67, ">b?e")',
      E60: '=COUNTIF(A59:A67, "<b?e")',

      E62: '=COUNTIF(A59:A67, ">b*e")',
      E63: '=COUNTIF(A59:A67, "<b*e")',

      E65: '=COUNTIF(A59:A67, ">b*")',
      E66: '=COUNTIF(A59:A67, "<b*")',

      F65: '=COUNTIF(A59:A67, ">b")',
      F66: '=COUNTIF(A59:A67, "<b")',
    };

    const grid2Result = evaluateGrid(grid2);

    expect(grid2Result.C59).toBe(9);
    expect(grid2Result.C60).toBe(2);
    expect(grid2Result.C61).toBe(4);
    expect(grid2Result.C62).toBe(2);

    expect(grid2Result.E59).toBe(4);
    expect(grid2Result.E60).toBe(5);

    expect(grid2Result.E62).toBe(4);
    expect(grid2Result.E63).toBe(5);

    expect(grid2Result.E65).toBe(4);
    expect(grid2Result.E66).toBe(5);

    expect(grid2Result.F65).toBe(5);
    expect(grid2Result.F66).toBe(3);

    const grid3 = {
      A69: "b$f",

      C69: '=COUNTIF(A69, ">b?f")',
      C70: '=COUNTIF(A69, ">b*f")',
      C71: '=COUNTIF(A69, ">b#f")',
      C72: '=COUNTIF(A69, ">b&f")',

      D69: '=COUNTIF(A69, "<b?f")',
      D70: '=COUNTIF(A69, "<b*f")',
      D71: '=COUNTIF(A69, "<b#f")',
      D72: '=COUNTIF(A69, "<b&f")',
    };

    const grid3Result = evaluateGrid(grid3);

    expect(grid3Result.C69).toBe(0);
    expect(grid3Result.C70).toBe(0);
    expect(grid3Result.C71).toBe(1);
    expect(grid3Result.C72).toBe(0);

    expect(grid3Result.D69).toBe(1);
    expect(grid3Result.D70).toBe(1);
    expect(grid3Result.D71).toBe(0);
    expect(grid3Result.D72).toBe(1);

    const grid4 = {
      A74: "ab",
      A75: "abc",
      A76: "abcd",
      A77: "abcde",

      C74: '=COUNTIF(A74:A77, "a")',
      C75: '=COUNTIF(A74:A77, "ab")',

      E74: '=COUNTIF(A74:A77, "*")',
      E75: '=COUNTIF(A74:A77, "a*")',
      E76: '=COUNTIF(A74:A77, "ab*")',
      E77: '=COUNTIF(A74:A77, "abc*")',

      G74: '=COUNTIF(A74:A77, "?")',
      G75: '=COUNTIF(A74:A77, "a?")',
      G76: '=COUNTIF(A74:A77, "ab?")',
      G77: '=COUNTIF(A74:A77, "abc?")',
    };

    const grid4Result = evaluateGrid(grid4);

    expect(grid4Result.C74).toBe(0);
    expect(grid4Result.C75).toBe(1);

    expect(grid4Result.E74).toBe(4);
    expect(grid4Result.E75).toBe(4);
    expect(grid4Result.E76).toBe(4);
    expect(grid4Result.E77).toBe(3);

    expect(grid4Result.G74).toBe(0);
    expect(grid4Result.G75).toBe(1);
    expect(grid4Result.G76).toBe(1);
    expect(grid4Result.G77).toBe(1);

    const grid5 = {
      J73: "aslnlsngj",

      J74: '=COUNTIF(J73, "a*d")',
      J75: '=COUNTIF(J73, "a*j")',
      J76: '=COUNTIF(J73, "a*g")',
      J77: '=COUNTIF(J73, "a*gj")',
      J78: '=COUNTIF(J73, "a*nl*")',
      J79: '=COUNTIF(J73, "a*nl*?n*j")',

      J80: '=COUNTIF(J73, "<>*")',
      J81: '=COUNTIF(J73, "<>a*")',
      J82: '=COUNTIF(J73, "<>a*b")',
    };

    const grid5Result = evaluateGrid(grid5);

    expect(grid5Result.J74).toBe(0);
    expect(grid5Result.J75).toBe(1);
    expect(grid5Result.J76).toBe(0);
    expect(grid5Result.J77).toBe(1);
    expect(grid5Result.J78).toBe(1);
    expect(grid5Result.J79).toBe(1);

    expect(grid5Result.J80).toBe(0);
    expect(grid5Result.J81).toBe(0);
    expect(grid5Result.J82).toBe(1);
  });

  test("COUNTIF does not accept errors in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "=1/0",
    };
    expect(evaluateCell("A3", { A3: "=COUNTIF(A1:B2, 42)", ...grid })).toBe(2);
  });

  // @compatibility: should be able to count errors !
  test("COUNTIF can't count errors", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "41",
      A2: "42", B2: "43",
    };
    expect(evaluateCell("A3", { A3: "=COUNTIF(A1:B2, KABOUM)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 4
  });

  test("COUNTIF on empty range", () => {
    const grid = {
      A1: '=COUNTIF(B1, "<>Hi")',
      A2: '=COUNTIF(B1, "=Hi")',
      A3: '=COUNTIF(B1, "*")',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe(1);
    expect(gridResult.A2).toBe(0);
    expect(gridResult.A3).toBe(0);
  });
});

describe("COUNTIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1: "Jim"  , B1: "MN", C1: "100",
      A2: "Sarah", B2: "CA", C2: "125",
      A3: "Jane" , B3: "GA", C3: "200",
      A4: "Steve", B4: "CA", C4: "50" ,
      A5: "Jim"  , B5: "WY", C5: "75" ,
      A6: "Joan" , B6: "WA", C6: "150",
      A7: "Jane" , B7: "GA", C7: "200",
      A8: "Jim"  , B8: "WY", C8: "50" ,
      A9: "*a*"  , B9: ">0",

      D1: '=COUNTIFS(A1:A8, "JIM", B1:B8, "??" , C1:C8, ">=100")',
      D2: '=COUNTIFS(A1:A8, "JIM", B1:B8, "??" , C1:C8, ">=50")',
      D3: '=COUNTIFS(A1:A8, "JIM", B1:B8, "WY" , C1:C8, ">=50")',
      D4: '=COUNTIFS(A1:A8, "J*" , B1:B8, "W?" , C1:C8, ">=50")',
      D5: '=COUNTIFS(A1:A8, "J*" , B1:B8, "?A" , C1:C8, ">=50")',
      D6: '=COUNTIFS(A1:A8, "J*" , B1:B8, "?A" , C1:C8, "<>200")',
      D7: '=COUNTIFS(A1:A8, "J*" , B1:B8, "*"  , C1:C8, "50")',
      D8: '=COUNTIFS(A1:A8, "*a*", B1:B8, "*a*", C1:C8, ">0")',
      D9: '=COUNTIFS(A1:A8, A9, B1:B8, "*a*", C1:C8, B9)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.D1).toBe(1);
    expect(gridResult.D2).toBe(3);
    expect(gridResult.D3).toBe(2);
    expect(gridResult.D4).toBe(3);
    expect(gridResult.D5).toBe(3);
    expect(gridResult.D6).toBe(1);
    expect(gridResult.D7).toBe(1);
    expect(gridResult.D8).toBe(4);
    expect(gridResult.D9).toBe(4);
  });

  test("COUNTIFS does not accept errors in 2n+1 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "42",
      A2: "42",      B2: "=1/0",
    };
    expect(evaluateCell("A3", { A3: "=COUNTIFS(A1:B2, 42)", ...grid })).toBe(2);
  });

  // @compatibility: should be able to count errors !
  test("COUNTIFS does not accept errors on 2n parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "41",
      A2: "42", B2: "43",
    };
    expect(evaluateCell("A3", { A3: "=COUNTIFS(A1:B2, KABOUM)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 4
  });

  test("COUNTIFS on empty range", () => {
    const grid = {
      A1: "Alice",
      A2: '=COUNTIFS(A1, "Alice", B1, "<>Hi")',
      A3: '=COUNTIFS(A1, "Alice", B1, "=Hi")',
      A4: '=COUNTIFS(A1, "Alice", B1, "*")',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.A2).toBe(1);
    expect(gridResult.A3).toBe(0);
    expect(gridResult.A4).toBe(0);
  });
});

describe("COUNTUNIQUE formula", () => {
  test("functional tests on simple arguments", () => {
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

  test("functional tests on cell arguments", () => {
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

  test("functional tests on simple and cell arguments", () => {
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

  test("functional tests on range arguments", () => {
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

  // @compatibility: should count errors of the same type as being the same
  test("COUNTUNIQUE counts each error as unique", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1", B1: "=KABOUM_2",
      A2: "42",        B2: "=KABOUM_3",
    };
    expect(evaluateCell("A3", { A3: "=COUNTUNIQUE(A1:B2)", ...grid })).toBe(2);
  });
});

describe("COUNTUNIQUEIFS formula", () => {
  test("functional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1:  "car"   , B1:  "4" , C1:  "14", D1:  "Yes",
      A2:  "toy"   , B2:  "28", C2:  "30", D2:  "Yes",
      A3:  "shirt" , B3:  "31", C3:  "47", D3:  "Yes",
      A4:  "car"   , B4:  "12", C4:  "0" , D4:  "Yes",
      A5:  "toy"   , B5:  "31", C5:  "47", D5:  "Yes",
      A6:  "milk"  , B6:  "13", C6:  "5" , D6:  "No" ,
      A7:  "butter", B7:  "18", C7:  "43", D7:  "No" ,
      A8:  "shirt" , B8:  "24", C8:  "7" , D8:  "Yes",
      A9:  "car"   , B9:  "44", C9:  "28", D9:  "No" ,
      A10: '=""'   , B10: "22", C10: "23", D10: "No" ,
                     B11: "9" , C11: "13", D11: "No" ,
      A12: ">20"   , B12: "<30",

      A13: '=COUNTUNIQUEIFS(A1:A11, B1:B11, ">20")',
      A14: '=COUNTUNIQUEIFS(A1:A11, B1:B11, ">20", C1:C11, "<30")',
      A15: '=COUNTUNIQUEIFS(A1:A11, D1:D11, "No")',
      A16: '=COUNTUNIQUEIFS(A1:A11, B1:B11, A12, C1:C11, B12)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A13).toBe(3);
    expect(gridResult.A14).toBe(2);
    expect(gridResult.A15).toBe(3);
    expect(gridResult.A16).toBe(2);
  });

  // @compatibility: should count errors of the same type as being the same
  test("COUNTUNIQUEIFS counts each error as unique", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1", B1: "1",
      A2: "=KABOUM_2", B2: "1",
      A3: "42"       , B3: "1",
    };
    expect(evaluateCell("A4", { A4: "=COUNTUNIQUEIFS(A1:A3, B1:B3, 1)", ...grid })).toBe(2);
  });

  test("COUNTUNIQUEIFS does not accept errors in 2n+2 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "=KABOUM",
    };
    expect(evaluateCell("A4", { A4: "=COUNTUNIQUEIFS(A1:A3, B1:B3, 1)", ...grid })).toBe(2);
  });

  // @compatibility: should be able to count errors !
  test("COUNTUNIQUEIFS does not accept errors on 2n+3 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "1",
    };
    expect(evaluateCell("A4", { A4: "=COUNTUNIQUEIFS(A1:A3, B1:B3, KABOUM)", ...grid })).toBe(
      "#BAD_EXPR"
    ); // @compatibility: should be 0
  });

  test("COUNTUNIQUEIFS on empty range", () => {
    const grid = {
      A1: "Alice",
      A2: '=COUNTUNIQUEIFS(A1, A1, "Alice", B1, "<>Hi")',
      A3: '=COUNTUNIQUEIFS(A1, A1, "Alice", B1, "=Hi")',
      A4: '=COUNTUNIQUEIFS(A1, A1, "Alice", B1, "*")',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.A2).toBe(1);
    expect(gridResult.A3).toBe(0);
    expect(gridResult.A4).toBe(0);
  });
});

describe("CSC formula", () => {
  test.each([
    ["=3*PI()/2", -1],
    ["=PI()/2", 1],
    ["=-PI()/2", -1],
    ["1", 1.188395106],
    ["-2", -1.09975017],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=CSC(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"]])("take 1 parameter(s), return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=CSC(A2)", A2: a })).toBe("#DIV/0!");
  });
});

describe("CSCH formula", () => {
  test.each([
    ["1", 0.850918128],
    ["-2", -0.275720565],
    ["=LN(3)", 0.75],
    ["=-LN(9)", -0.225],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=CSCH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"]])("take 1 parameter, return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=CSCH(A2)", A2: a })).toBe("#DIV/0!");
  });
});

describe("DECIMAL formula", () => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
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
  ])("take 2 parameters, return error on parameter 2", (a, b) => {
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
  ])("take 2 parameters, return error on parameter 1", (a, b) => {
    expect(evaluateCell("A1", { A1: "=DECIMAL(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("special value testing", () => {
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
});

describe("DEGREES formula", () => {
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
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=DEGREES(A2)", A2: a })).toBe(expected);
  });

  test("functional tests on simple arguments", () => {
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
});

describe("EXP formula", () => {
  test.each([
    ["1", Math.exp(1)],
    ["=LN(1)", 1],
    ["0", 1],
    ["-1", 0.3678794412],
    ["2", 7.389056099],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test("special value testing", () => {
    expect(evaluateCell("A1", { A1: "=EXP()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EXP(TRUE)" })).toBeCloseTo(Math.exp(1), 9);
    expect(evaluateCell("A1", { A1: "=EXP(FALSE)" })).toBeCloseTo(1, 9);

    expect(evaluateCell("A1", { A1: '=EXP("")' })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: '=EXP(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=EXP("1")' })).toBeCloseTo(Math.exp(1), 9);

    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: "" })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: "1" })).toBeCloseTo(Math.exp(1), 9);

    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '"1"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '=""' })).toBeCloseTo(1, 9);
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=EXP(A2)", A2: '="1"' })).toBeCloseTo(Math.exp(1), 9);
  });
});

describe("FLOOR / FLOOR.MATH / FLOOR.PRECISE formulas", () => {
  test.each([
    ["0", 0],
    ["6", 6],
    ["6.7", 6],
    ["7.89", 7],
    ["-6", -6],
    ["-6.7", -7],
    ["-7.89", -8],
  ])("take 1 parameters, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
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
  ])("MATH/PRECISE: no effect with negative factor", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=FLOOR.MATH(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected);
    expect(evaluateCell("A1", { A1: "=FLOOR.PRECISE(A2, A3)", A2: a, A3: b })).toBeCloseTo(
      expected
    );
  });

  test.each([
    ["6", "-0.2"],
    ["7.89", "-0.2"],
  ])("FLOOR: if value positive, factor can't be negative", (a, b) => {
    expect(evaluateCell("A1", { A1: "=FLOOR(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test.each([
    // Concerning FLOOR function
    // if "a" is negative and "b" is negative, rounds a number up (and not down)
    // the nearest integer multiple of b
    ["-7.89", "0.2", -8],
    ["-7.89", "-0.2", -7.8],
  ])("FLOOR: if factor negative, rouds number down", (a, b, expected) => {
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
  ])("FLOOR.MATH: take 3 parameters, return a number", (a, b, c, expected) => {
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
    expect(evaluateCell("A1", { A1: "=" + functionName + "(-7.89, )" })).toBeCloseTo(-8, 9);
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
    "special value testing",
    (functionName) => {
      evaluateFloorFunction(functionName);
    }
  );

  test.each([["FLOOR"], ["FLOOR.MATH"], ["FLOOR.PRECISE"]])(
    "result format depends on 1st argument",
    (functionName) => {
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "0.05", A3: "0.2" })
      ).toBe("");
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "5%", A3: "0.2" })
      ).toBe("0%");
      expect(
        evaluateCellFormat("A1", { A1: "=" + functionName + "(A2, A3)", A2: "4.8€", A3: "0.2" })
      ).toBe("#,##0.00[$€]");
    }
  );
});

describe("INT formula", () => {
  test.each([
    ["0", 0],
    ["6", 6],
    ["6.7", 6],
    ["7.89", 7],
    ["-6", -6],
    ["-6.7", -7],
    ["-7.89", -8],
  ])("return the nearest rounded down integer", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=INT(A2)", A2: a })).toBe(expected);
  });
});

describe("ISEVEN formula", () => {
  test.each([
    ["-3", false],
    ["-2.3", true],
    ["-2", true],
    ["0", true],
    ["2", true],
    ["2.3", true],
    ["3", false],
  ])("take 1 parameter, return a boolean", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ISEVEN(A2)", A2: a })).toBe(expected);
  });

  test("functional tests on simple arguments", () => {
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
});

describe("ISODD formula", () => {
  test.each([
    ["-3", true],
    ["-2.2", false],
    ["-2", false],
    ["0", false],
    ["2", false],
    ["2.3", false],
    ["3", true],
  ])("take 1 parameter, return a boolean", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ISODD(A2)", A2: a })).toBe(expected);
  });

  test("functional tests on simple arguments", () => {
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
});

describe("LN formula", () => {
  test.each([
    ["1", 0],
    ["=EXP(1)", 1],
    ["2", 0.6931471806],
    ["9", Math.log(3) + Math.log(3)],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test.each([["0"], ["-42"]])("take 1 parameter(s), return an error", (a) => {
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("special value testing", () => {
    expect(evaluateCell("A1", { A1: "=LN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LN(TRUE)" })).toBeCloseTo(0, 9);
    expect(evaluateCell("A1", { A1: "=LN(FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: '=LN("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=LN(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=LN("1")' })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: "1" })).toBeCloseTo(0, 9);

    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '"1"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=LN(A2)", A2: '="1"' })).toBeCloseTo(0, 9);
  });
});

describe("MOD formula", () => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: a, A3: b })).toBeCloseTo(expected, 9);
  });

  test.each([
    ["-42", "0"],
    ["0", "0"],
    ["2.2", "0"],
  ])("take 2 parameters, return error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: a, A3: b })).toBe("#DIV/0!");
  });

  test("special value testing", () => {
    expect(evaluateCell("A1", { A1: "=MOD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MOD( , )" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(42, 12)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=MOD( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(42, )" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(42.42, TRUE)" })).toBeCloseTo(0.42, 9);
    expect(evaluateCell("A1", { A1: "=MOD(42, FALSE)" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MOD(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=MOD("" , "")' })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: '=MOD("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MOD(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MOD("42", 12)' })).toBe(6);
    expect(evaluateCell("A1", { A1: '=MOD("42", "12")' })).toBe(6);
    expect(evaluateCell("A1", { A1: '=MOD("42", "")' })).toBe("#DIV/0!");

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "", A3: "" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42", A3: "12" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42", A3: "" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42.42", A3: "TRUE" })).toBeCloseTo(
      0.42,
      9
    );
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MOD(A2, A3)", A2: '="42"', A3: '="36"' })).toBe(6);
  });

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=MOD(A2, 12)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=MOD(A2, 12)", A2: "4200%" })).toBe("0%");
  });
});

describe("MUNIT function", () => {
  test("MUNIT takes 1 arguments", () => {
    expect(evaluateCell("A1", { A1: "=MUNIT()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=MUNIT(2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MUNIT(2, 0)" })).toBe("#BAD_EXPR");
  });

  test("Argument should be a positive number", () => {
    expect(evaluateCell("A1", { A1: "=MUNIT(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MUNIT(-1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MUNIT("hello")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Generate unit matrix", () => {
    const model = new Model();
    setCellContent(model, "D1", "=MUNIT(3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });
});

describe("ODD formula", () => {
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
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=ODD(A2)", A2: a })).toBe(expected);
  });

  test("functional tests on simple arguments", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=ODD(A2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A2: "4200%", A1: "=ODD(A2)" })).toBe("0%");
  });
});

describe("PI formula", () => {
  test("functional test", () => {
    expect(evaluateCell("A1", { A1: "=PI()" })).toBeCloseTo(Math.PI, 9); // @compatibility: on google sheets return 3.14159265358979
  });
});

describe("POWER formula", () => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-4", "0.5"],
    ["-4", "1.5"],
    ["-4", "0.2"],
  ])("take 2 parameters, return an error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=POWER(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=POWER(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=POWER(A2, 2)", A2: "4200%" })).toBe("0%");
  });
});

describe("PRODUCT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRODUCT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRODUCT(,)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(1, 2, 3, 1, 2)" })).toBe(12);
    expect(evaluateCell("A1", { A1: "=PRODUCT(1,  , 2,  , 3)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=PRODUCT(1.5, 1.4)" })).toBeCloseTo(2.1);
    expect(evaluateCell("A1", { A1: '=PRODUCT("Jean Chante", "Jean Courage")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT("")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT("2", "-2")' })).toBe(-4);
    expect(evaluateCell("A1", { A1: '=PRODUCT("2", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT("2", " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=PRODUCT(TRUE, FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=PRODUCT(1, "1", TRUE)' })).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2)", A2: "," })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3, A4)", A2: "1", A3: "", A4: "1" })).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=PRODUCT(A2, A3, A4)", A2: "1.5", A3: "-10", A4: "Jean Brasse" })
    ).toBe(-15);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: " ", A3: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: " ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "  ", A3: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: " ", A3: '="  "' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "42", A3: "42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "42", A3: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "42", A3: "=42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "42", A3: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: '"42"', A3: '"42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: '"42"', A3: "=42" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: '"42"', A3: '="42"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "=42", A3: "=42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: "=42", A3: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, A3)", A2: '="42"', A3: '="42"' })).toBe(0);
  });

  test("functional tests on simple and cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2,)", A2: "" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2,)", A2: " " })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2,)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2,)", A2: '=" "' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, " ")', A2: "" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, " ")', A2: " " })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, " ")', A2: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, " ")', A2: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=PRODUCT(42, "42")' })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, 42)", A2: "42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, 42)", A2: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, 42)", A2: "=42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, 42)", A2: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "42")', A2: "42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "42")', A2: '"42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "42")', A2: "=42" })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=PRODUCT(A2, "42")', A2: '="42"' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, TRUE)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, TRUE)", A2: '"1"' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, TRUE)", A2: "=1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PRODUCT(A2, TRUE)", A2: '="1"' })).toBe(1);
  });

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=PRODUCT(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=PRODUCT(B2:E2)",
      A3: "=PRODUCT(B3:E3)",
      A4: "=PRODUCT(B4:E4)",

      B1: "=PRODUCT(B2:B4)",
      C1: "=PRODUCT(C2:C4)",
      D1: "=PRODUCT(D2:D4)",
      E1: "=PRODUCT(E2:E4)",

      B2: "=3",
      C2: "3",
      D2: '"3"',
      E2: '="3"',

      B3: '=" "',
      C3: "0",
      D3: "Jean Jardindu",
      E3: '"Jean Fortroche"',

      B4: " ",
      C4: '""',
      D4: '=""',
      E4: '" "',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe(0);
    expect(gridResult.A2).toBe(9);
    expect(gridResult.A3).toBe(0);
    expect(gridResult.A4).toBe(0);
    expect(gridResult.B1).toBe(3);
    expect(gridResult.C1).toBe(0);
    expect(gridResult.D1).toBe(0);
    expect(gridResult.E1).toBe(0);
  });

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=PRODUCT(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=PRODUCT(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=PRODUCT(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });

  test("PRODUCT does not accept error in values", () => {
    expect(evaluateCell("A1", { A1: "=PRODUCT(1, KABOUM)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=PRODUCT(1, A2)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
  });
});

describe("RAND formula", () => {
  test("return a number", () => {
    expect(evaluateCell("A1", { A1: "=RAND()" })).toBeGreaterThanOrEqual(0);
    expect(evaluateCell("A1", { A1: "=RAND()" })).toBeLessThan(1);
  });
});

describe("RANDARRAY function", () => {
  test("RANDARRAY takes 0-5 arguments", () => {
    // @compatibility: on google sheets there is only 2 arguments
    expect(evaluateCell("A1", { A1: "=RANDARRAY()" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2)" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2, 2)" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2, 2, 0)" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2, 2, 0, 1)" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2, 2, 0, 1, FALSE)" })).toBeBetween(0, 1);
    expect(evaluateCell("A1", { A1: "=RANDARRAY(2, 2, 0, 0, 1, FALSE, 5)" })).toBe("#BAD_EXPR");
  });

  test("cols and rows arguments must be > 0", () => {
    expect(evaluateCell("A1", { A1: "=RANDARRAY(0, 1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=RANDARRAY(-1, 1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, -1)" })).toBe("#ERROR");
  });

  test("Max argument must be >= min", () => {
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 1, 3, 1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 1, 3, 3)" })).not.toBe("#ERROR");
  });

  test("Min and max must be integer is whole_number is true", () => {
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 1, 0.1, 1, TRUE)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 1, 0, 1.5, TRUE)" })).toBe("#ERROR");

    expect(evaluateCell("A1", { A1: "=RANDARRAY(1, 1, 0.1, 0.5, FALSE)" })).not.toBe("#ERROR");
  });

  test("Random rows", () => {
    const model = new Model();
    setCellContent(model, "A1", "=RANDARRAY(2)");
    expect(getEvaluatedCell(model, "A1").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "A2").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "B1").value).toBe(null);
    expect(getEvaluatedCell(model, "B21").value).toBe(null);
  });

  test("Random columns", () => {
    const model = new Model();
    setCellContent(model, "A1", "=RANDARRAY(1, 2)");
    expect(getEvaluatedCell(model, "A1").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "A2").value).toBe(null);
    expect(getEvaluatedCell(model, "B1").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "B2").value).toBe(null);
  });

  test("Random rows and columns", () => {
    const model = new Model();
    setCellContent(model, "A1", "=RANDARRAY(2, 2)");
    expect(getEvaluatedCell(model, "A1").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "A2").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "B1").value).toBeBetween(0, 1);
    expect(getEvaluatedCell(model, "B2").value).toBeBetween(0, 1);
  });

  test("Max and min arguments", () => {
    const model = new Model();
    setCellContent(model, "A1", "=RANDARRAY(2, 2, -2, 2)");
    expect(getEvaluatedCell(model, "A1").value).toBeBetween(-2, 2);
    expect(getEvaluatedCell(model, "A2").value).toBeBetween(-2, 2);
    expect(getEvaluatedCell(model, "B1").value).toBeBetween(-2, 2);
    expect(getEvaluatedCell(model, "B2").value).toBeBetween(-2, 2);
  });

  test("whole_number argument", () => {
    const model = new Model();
    setCellContent(model, "A1", "=RANDARRAY(1, 1, -2, 2, TRUE)");
    const val = getEvaluatedCell(model, "A1").value as number;
    expect(val).toBeBetween(-2, 2);
    expect(val).toEqual(Math.round(val));
  });
});

describe("RANDBETWEEN formula", () => {
  test.each([
    ["0", "0", 0],
    ["42", "42", 42],
    ["-42", "-42", -42],
    ["1.1", "2", 2],
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-42", "42"],
    ["24", "42"],
    ["-42", "-24"],
  ])("take 2 parameters, return a number", (a, b) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBeGreaterThanOrEqual(
      toNumber(a, DEFAULT_LOCALE)
    );
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBeLessThanOrEqual(
      toNumber(b, DEFAULT_LOCALE)
    );
  });

  test.each([
    ["1.1", "1.2"], // @compatibility: on google sheets, return 2
    ["-24", "-42"],
    ["42", "24"],
  ])("take 2 parameters, return an error", (a, b) => {
    expect(evaluateCell("A1", { A1: "=RANDBETWEEN(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=RANDBETWEEN(A2, 2)", A2: "1" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=RANDBETWEEN(A2, 2)", A2: "100%" })).toBe("0%");
  });
});

describe("ROUND formula", () => {
  test.each([
    ["-1.6", -2],
    ["-1.5", -2],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 2],
    ["1.6", 2],
  ])("take 1 parameter, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUND(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=ROUND(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=ROUND(A2, 2)", A2: "4200%" })).toBe("0%");
  });
});

describe("ROUNDDOWN formula", () => {
  test.each([
    ["-1.9", -1],
    ["-1.5", -1],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 1],
    ["1.9", 1],
  ])("take 1 parameter, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDDOWN(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=ROUNDDOWN(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=ROUNDDOWN(A2, 2)", A2: "4200%" })).toBe("0%");
  });
});

describe("ROUNDUP formula", () => {
  test.each([
    ["-1.6", -2],
    ["-1.5", -2],
    ["-1.1", -2],
    ["0", 0],
    ["1.1", 2],
    ["1.5", 2],
    ["1.6", 2],
  ])("take 1 parameter, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=ROUNDUP(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=ROUNDUP(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=ROUNDUP(A2, 2)", A2: "4200%" })).toBe("0%");
  });
});

describe("SEC formula", () => {
  test.each([
    ["=PI()/3", 2],
    ["1", 1.850815718],
    ["-2", -2.402997962],
    ["3", -1.010108666],
    ["-4", -1.529885656],
    ["0", 1],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SEC(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("SECH formula", () => {
  test.each([
    ["1", 0.648054274],
    ["-1", 0.648054274],
    ["0", 1],
    ["=LN(2)", 0.8],
    ["=-LN(3)", 0.6],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SECH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("SIN formula", () => {
  test.each([
    ["0", 0],
    ["=PI()", 0],
    ["=PI()*2", 0],
    ["=PI()/2", 1],
    ["=PI()/6", 0.5],
    ["=-PI()/2", -1],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SIN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });

  test("special value testing", () => {
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
});

describe("SINH formula", () => {
  test.each([
    ["1", 1.175201194],
    ["-2", -3.626860408],
    ["0", 0],
    ["=LN(2)", 0.75],
    ["=-LN(4)", -1.875],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SINH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("SQRT formula", () => {
  test.each([
    ["0", 0],
    ["4", 2],
    ["9", 3],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: a })).toBe(expected);
  });

  test.each([["-4"], ["-9"]])("take 1 parameter, return an error ", (a) => {
    expect(evaluateCell("A1", { A1: "=SQRT(A2)", A2: a })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!!
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=SQRT(A2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=SQRT(A2)", A2: "4200%" })).toBe("0%");
  });
});

describe("SUM formula", () => {
  test("functional tests on simple arguments", () => {
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
    expect(evaluateCell("A1", { A1: '=SUM(1, "10/10/10")' })).toBe(40462);
  });

  test("functional tests on cell arguments", () => {
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

  test("functional tests on simple and cell arguments", () => {
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
    expect(evaluateCell("A1", { A1: "=SUM(A2, 42)", A2: "10/10/10" })).toBe(40503);
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

  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=SUM(B2:D3,B4:D4,E2:E3,E4)",

      A2: "=SUM(B2:E2)",
      A3: "=SUM(B3:E3)",
      A4: "=SUM(B4:E4)",
      A5: "=SUM(B4:E2000)",

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
    expect(gridResult.A5).toBe(0);
    expect(gridResult.B1).toBe(3);
    expect(gridResult.C1).toBe(3);
    expect(gridResult.D1).toBe(0);
    expect(gridResult.E1).toBe(0);
  });

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=SUM(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=SUM(A2:A3)", A2: "42%", A3: "1" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=SUM(A2:A3)", A2: "1", A3: "42%" })).toBe("");
  });

  test("SUM does not accept error in values", () => {
    expect(evaluateCell("A1", { A1: "=SUM(1, KABOUM)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=SUM(1, A2)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
  });
});

describe("SUMIF formula", () => {
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


      A12: '=SUMIF(A1:A8, "Taxi", B1:B8)',
      A13: '=SUMIF(B1:B8, ">=10", B1:B8)',
      A14: '=SUMIF(B1:B8, ">=10")',
      A15: '=SUMIF(A1:A8, "G*", B1:B8)',
      A16: '=SUMIF(A1:A8, "G*", B2:B8)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(18);
    expect(gridResult.A13).toBe(113);
    expect(gridResult.A14).toBe(113);
    expect(gridResult.A15).toBe(72);
    expect(gridResult.A16).toBe(39);
  });

  test("SUMIF does not accept errors in first parameter", () => {
    // prettier-ignore
    const grid = {
        A1: "=KABOUM", B1: "42",
        A2: "42",      B2: "=1/0",
      };
    expect(evaluateCell("A3", { A3: "=SUMIF(A1:B2, 42)", ...grid })).toBe(84);
  });

  // @compatibility: should be able to accept errors !
  test("SUMIF does not accept error on second parameter", () => {
    // prettier-ignore
    const grid = {
        A1: "40", B1: "42",
        A2: "41", B2: "43",
      };
    expect(evaluateCell("A3", { A3: "=SUMIF(A1:A2, KABOUM, B1:B2)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 4
  });
});

describe("SUMIFS formula", () => {
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

      A12: '=SUMIFS(B1:B11, B1:B11, ">20")',
      A13: '=SUMIFS(B1:B11, B1:B11, ">20", C1:C11, "<30")',
      A14: '=SUMIFS(B1:B11, D1:D11, "No")',
      A15: '=SUMIFS(B1:B11, B1:B11, B12, C1:C11, C12)',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A12).toBe(180);
    expect(gridResult.A13).toBe(90);
    expect(gridResult.A14).toBe(106);
    expect(gridResult.A15).toBe(90);
  });
  test("SUMIFS accepts error in first parameter", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM_1", B1: "1",
      A2: "=KABOUM_2", B2: "1",
      A3: "42"       , B3: "24",
    };
    expect(evaluateCell("A4", { A4: "=SUMIFS(A1:A3, B1:B3, 24)", ...grid })).toBe(42);
  });

  test("SUMIFS does not accept errors in 2n+2 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "=KABOUM",
    };
    expect(evaluateCell("A4", { A4: "=SUMIFS(A1:A3, B1:B3, 1)", ...grid })).toBe(81);
  });

  // @compatibility: should be able to count errors !
  test("SUMIFS does not accept errors on 2n+3 parameters", () => {
    // prettier-ignore
    const grid = {
      A1: "40", B1: "1",
      A2: "41", B2: "1",
      A3: "42", B3: "1",
    };
    expect(evaluateCell("A4", { A4: "=SUMIFS(A1:A3, B1:B3, KABOUM)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: should be 0
  });
});

describe("TAN formula", () => {
  test.each([
    ["0", 0],
    ["=PI()/4", 1],
    ["1", 1.557407725],
    ["2", -2.185039863],
    ["-3", 0.142546543],
    ["-4", -1.157821282],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=TAN(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("TANH formula", () => {
  test.each([
    ["=LN(3)", 0.8],
    ["=LN(2)", 0.6],
    ["0", 0],
    ["1", 0.761594156],
    ["-2", -0.96402758],
  ])("take 1 parameter, return a number", (a, expected) => {
    expect(evaluateCell("A1", { A1: "=TANH(A2)", A2: a })).toBeCloseTo(expected, 9);
  });
});

describe("TRUNC formula", () => {
  test.each([
    ["-1.6", -1],
    ["-1.5", -1],
    ["-1.4", -1],
    ["0", 0],
    ["1.4", 1],
    ["1.5", 1],
    ["1.6", 1],
  ])("take 1 parameter, return a number", (a, expected) => {
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
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=TRUNC(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test("special value testing", () => {
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

  test("result format depends on 1st argument", () => {
    expect(evaluateCellFormat("A1", { A1: "=TRUNC(A2, 2)", A2: "42" })).toBe("");
    expect(evaluateCellFormat("A1", { A1: "=TRUNC(A2, 2)", A2: "4200%" })).toBe("0%");
  });
});
