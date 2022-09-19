import { formatValue } from "../../src/helpers";
import { evaluateCell, evaluateCellFormat, evaluateGrid } from "../test_helpers/helpers";

describe("Coupons formulas", () => {
  function testCouponArgNumber(fnName: string) {
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100)` })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1)` })).not.toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1 ,0)` })).not.toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 0, 0)` })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  }

  function testMaturityGreaterThanSettlement(fnName: string) {
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(100, 0, 1)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  }

  function testFrequencyValue(fnName: string) {
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 0)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 2)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 3)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 4)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 5)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  }

  function testDayCountConventionValue(fnName: string) {
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, -1)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 0)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 1)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 2)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 3)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 4)` })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: `=${fnName}(0, 100, 1, 5)` })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  }

  describe("COUPDAYS formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPDAYS"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPDAYS"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPDAYS"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPDAYS"));
    });

    test.each([
      ["01/01/2012", "05/01/2016", 1, 0, 360],
      ["01/01/2012", "05/01/2016", 2, 1, 182],
      ["01/01/2012", "05/01/2016", 4, 2, 90],
      ["01/01/2012", "05/01/2016", 1, 3, 365],
      ["01/01/2012", "05/01/2016", 2, 4, 180],
      ["01/01/2012", "05/01/2016", 4, 1, 92],
      ["01/01/2012", "01/02/2012", 1, 0, 360],
      ["01/01/2012", "01/02/2012", 2, 1, 184],
      ["01/01/2012", "01/02/2012", 4, 2, 90],
      ["01/01/2012", "01/02/2012", 1, 3, 365],
      ["01/01/2012", "01/02/2012", 2, 4, 180],
      ["01/01/2012", "01/02/2012", 4, 1, 92],
      ["01/01/2020", "07/31/2020", 1, 0, 360],
      ["01/01/2020", "07/31/2020", 2, 1, 184],
      ["01/01/2020", "07/31/2020", 4, 2, 90],
      ["01/01/2020", "07/31/2020", 1, 3, 365],
      ["01/01/2020", "07/31/2020", 2, 4, 180],
      ["01/01/2020", "07/31/2020", 4, 1, 92],
      ["06/01/2005", "12/31/2005", 2, 0, 180],
      ["06/01/2005", "12/31/2005", 2, 1, 181],
      ["06/01/2005", "12/31/2005", 2, 2, 180],
      ["06/01/2005", "12/31/2005", 2, 3, 182.5],
      ["06/01/2005", "12/31/2005", 2, 4, 180],
      ["12/05/2005", "01/01/2010", 4, 0, 90],
      ["12/05/2005", "01/01/2010", 4, 1, 92],
      ["12/05/2005", "01/01/2010", 4, 2, 90],
      ["12/05/2005", "01/01/2010", 4, 3, 91.25],
      ["12/05/2005", "01/01/2010", 4, 4, 90],
    ])(
      "function result =COUPDAYS(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCount: number,
        expectedResult: number
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPDAYS("${settlement}", "${maturity}", ${frequency}, ${dayCount})`,
        });
        expect(cellValue).toEqual(expectedResult);
      }
    );
  });

  describe("COUPDAYBS formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPDAYBS"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPDAYBS"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPDAYBS"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPDAYBS"));
    });

    test.each([
      ["01/01/2021", "01/01/2022", 1, 0, 0],
      ["01/01/2012", "05/01/2016", 4, 1, 61],
      ["01/01/2012", "05/01/2016", 2, 2, 61],
      ["01/01/2012", "05/01/2016", 4, 3, 61],
      ["01/01/2012", "05/01/2016", 1, 4, 240],
      ["01/01/2012", "01/02/2012", 1, 2, 364],
      ["01/01/2012", "01/02/2012", 2, 3, 183],
      ["01/01/2012", "01/02/2012", 4, 4, 89],
      ["01/01/2012", "01/02/2012", 1, 1, 364],
      ["02/29/2020", "07/31/2020", 1, 3, 213],
      ["02/29/2020", "07/31/2020", 2, 4, 29],
      ["02/29/2020", "07/31/2020", 4, 1, 29],
      ["02/29/2020", "07/31/2020", 1, 2, 213],
      ["12/31/2005", "11/30/2010", 1, 4, 30],
      ["12/31/2005", "11/30/2010", 2, 1, 31],
      ["12/31/2005", "11/30/2010", 4, 2, 31],
      ["12/31/2005", "11/30/2010", 1, 3, 31],
      ["12/05/2009", "02/28/2010", 1, 1, 280],
      ["12/05/2009", "02/28/2010", 2, 2, 96],
      ["12/05/2009", "02/28/2010", 4, 3, 5],
      ["12/05/2009", "02/28/2010", 1, 4, 277],
      ["03/31/2008", "02/29/2012", 1, 2, 31],
      ["03/31/2008", "02/29/2012", 2, 3, 31],
      ["03/31/2008", "02/29/2012", 4, 4, 31],
      ["03/31/2008", "02/29/2012", 1, 1, 31],
    ])(
      "function result =COUPDAYSBS(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCount: number,
        expectedResult: number
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPDAYBS("${settlement}", "${maturity}", ${frequency}, ${dayCount})`,
        });
        expect(cellValue).toEqual(expectedResult);
      }
    );

    test.each([
      ["03/30/2008", "02/29/2012", 1, 0, 30],
      ["03/30/2008", "02/29/2012", 2, 0, 30],
      ["03/30/2008", "02/29/2012", 4, 0, 30],
      ["03/31/2008", "02/29/2012", 1, 0, 31],
      ["03/31/2008", "02/29/2012", 2, 0, 31],
      ["03/31/2008", "02/29/2012", 4, 0, 31],
      ["03/30/2008", "02/28/2012", 1, 0, 32],
      ["03/30/2008", "02/28/2012", 2, 0, 32],
      ["03/30/2008", "02/28/2012", 4, 0, 32],
      ["03/31/2008", "02/28/2012", 1, 0, 33],
      ["03/31/2008", "02/28/2012", 2, 0, 33],
      ["03/31/2008", "02/28/2012", 4, 0, 33],
      ["04/30/2008", "06/30/2012", 1, 0, 300],
      ["04/30/2008", "06/30/2012", 2, 0, 120],
      ["04/30/2008", "06/30/2012", 4, 0, 30],
      ["04/25/2008", "06/30/2012", 1, 0, 295],
      ["04/25/2008", "06/30/2012", 2, 0, 115],
      ["04/25/2008", "06/30/2012", 4, 0, 25],
      ["05/31/2008", "06/30/2012", 1, 0, 330],
      ["05/31/2008", "06/30/2012", 2, 0, 150],
      ["05/31/2008", "06/30/2012", 4, 0, 60],
      ["05/31/2008", "07/31/2012", 1, 0, 300],
      ["05/31/2008", "07/31/2012", 2, 0, 120],
      ["05/31/2008", "07/31/2012", 4, 0, 30],
      ["02/29/2008", "07/31/2012", 1, 0, 209],
      ["02/29/2008", "07/31/2012", 2, 0, 29],
      ["02/29/2008", "07/31/2012", 4, 0, 29],
      ["02/28/2008", "07/31/2012", 1, 0, 208],
      ["02/28/2008", "07/31/2012", 2, 0, 28],
      ["02/28/2008", "07/31/2012", 4, 0, 28],
      ["02/28/2007", "07/31/2012", 1, 0, 208],
      ["02/28/2007", "07/31/2012", 2, 0, 28],
      ["02/28/2007", "07/31/2012", 4, 0, 28],
      ["03/01/2007", "02/28/2012", 1, 0, 1],
      ["03/01/2007", "02/28/2012", 2, 0, 1],
      ["03/01/2007", "02/28/2012", 4, 0, 1],
    ])(
      "function result for dayCountConvention=0, =COUPDAYSBS(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCountConvention: number,
        expectedResult: number
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPDAYBS("${settlement}", "${maturity}", ${frequency}, ${dayCountConvention})`,
        });
        expect(cellValue).toBeCloseTo(expectedResult, 4);
      }
    );
  });

  describe("COUPDAYSNC formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPDAYSNC"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPDAYSNC"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPDAYSNC"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPDAYSNC"));
    });

    test.each([
      ["01/01/2021", "01/01/2022", 1, 0, 360],
      ["01/01/2012", "05/01/2016", 1, 0, 120],
      ["01/01/2012", "05/01/2016", 2, 1, 121],
      ["01/01/2012", "05/01/2016", 4, 2, 31],
      ["01/01/2012", "05/01/2016", 1, 3, 121],
      ["01/01/2012", "05/01/2016", 2, 4, 120],
      ["01/01/2012", "05/01/2016", 4, 1, 31],
      ["01/01/2012", "01/02/2012", 1, 0, 1],
      ["01/01/2012", "01/02/2012", 2, 1, 1],
      ["01/01/2012", "01/02/2012", 4, 2, 1],
      ["01/01/2012", "01/02/2012", 1, 3, 1],
      ["01/01/2012", "01/02/2012", 2, 4, 1],
      ["01/01/2012", "01/02/2012", 4, 1, 1],
      ["02/29/2020", "07/31/2020", 1, 0, 151],
      ["02/29/2020", "07/31/2020", 2, 1, 153],
      ["02/29/2020", "07/31/2020", 4, 2, 61],
      ["02/29/2020", "07/31/2020", 1, 3, 153],
      ["02/29/2020", "07/31/2020", 1, 4, 151],
      ["02/29/2020", "07/31/2020", 4, 1, 61],
      ["12/31/2005", "11/30/2010", 1, 0, 330],
      ["12/31/2005", "11/30/2010", 2, 1, 151],
      ["12/31/2005", "11/30/2010", 4, 2, 59],
      ["12/31/2005", "11/30/2010", 1, 3, 334],
      ["12/31/2005", "11/30/2010", 2, 4, 150],
      ["12/31/2005", "11/30/2010", 4, 1, 59],
      ["12/05/2009", "02/28/2010", 1, 0, 85],
      ["12/05/2009", "02/28/2010", 2, 1, 85],
      ["12/05/2009", "02/28/2010", 4, 2, 85],
      ["12/05/2009", "02/28/2010", 1, 3, 85],
      ["12/05/2009", "02/28/2010", 2, 4, 83],
      ["03/31/2008", "02/29/2012", 1, 0, 329],
      ["03/31/2008", "02/29/2012", 2, 1, 153],
      ["03/31/2008", "02/29/2012", 4, 2, 61],
      ["03/31/2008", "02/29/2012", 1, 3, 334],
      ["03/31/2008", "02/29/2012", 2, 4, 150],
      ["03/30/2008", "02/28/2011", 1, 0, 330],
      ["03/30/2008", "02/28/2011", 2, 1, 154],
      ["03/30/2008", "02/28/2011", 4, 2, 62],
      ["03/30/2008", "02/28/2011", 1, 3, 335],
      ["03/30/2008", "02/28/2011", 2, 4, 150],
      ["03/30/2008", "02/28/2011", 1, 0, 330],
    ])(
      "function result =COUPDAYSNC(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCount: number,
        expectedResult: number
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPDAYSNC("${settlement}", "${maturity}", ${frequency}, ${dayCount})`,
        });
        expect(cellValue).toEqual(expectedResult);
      }
    );

    test.each([
      ["01/01/2012", "05/01/2016", 1, 0, 120],
      ["01/01/2012", "05/01/2016", 2, 0, 120],
      ["01/01/2012", "05/01/2016", 4, 0, 30],
      ["01/01/2012", "05/01/2016", 1, 0, 120],
      ["01/01/2012", "05/01/2016", 2, 0, 120],
      ["01/01/2012", "05/01/2016", 4, 0, 30],
      ["01/01/2012", "01/02/2012", 1, 0, 1],
      ["01/01/2012", "01/02/2012", 2, 0, 1],
      ["01/01/2012", "01/02/2012", 4, 0, 1],
      ["01/01/2012", "01/02/2012", 1, 0, 1],
      ["01/01/2012", "01/02/2012", 2, 0, 1],
      ["01/01/2012", "01/02/2012", 4, 0, 1],
      ["02/29/2020", "07/31/2020", 1, 0, 151],
      ["02/29/2020", "07/31/2020", 2, 0, 151],
      ["02/29/2020", "07/31/2020", 4, 0, 61],
      ["02/29/2020", "07/31/2020", 1, 0, 151],
      ["02/29/2020", "07/31/2020", 1, 0, 151],
      ["02/29/2020", "07/31/2020", 4, 0, 61],
      ["12/31/2005", "11/30/2010", 1, 0, 330],
      ["12/31/2005", "11/30/2010", 2, 0, 150],
      ["12/31/2005", "11/30/2010", 4, 0, 60],
      ["12/31/2005", "11/30/2010", 1, 0, 330],
      ["12/31/2005", "11/30/2010", 2, 0, 150],
      ["12/31/2005", "11/30/2010", 4, 0, 60],
      ["12/05/2009", "02/28/2010", 1, 0, 85],
      ["12/05/2009", "02/28/2010", 2, 0, 85],
      ["12/05/2009", "02/28/2010", 4, 0, 85],
      ["12/05/2009", "02/28/2010", 1, 0, 85],
      ["12/05/2009", "02/28/2010", 2, 0, 85],
      ["03/31/2008", "02/29/2012", 1, 0, 329],
      ["03/31/2008", "02/29/2012", 2, 0, 149],
      ["03/31/2008", "02/29/2012", 4, 0, 59],
      ["03/31/2008", "02/29/2012", 1, 0, 329],
      ["03/31/2008", "02/29/2012", 2, 0, 149],
    ])(
      "function result for dayCountConvention=0, =COUPDAYSNC(%s, %s, %s, %s)",
      (arg0: string, arg1: string, arg2: number, arg3: number, expectedResult: number) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPDAYSNC("${arg0}", "${arg1}", ${arg2}, ${arg3})`,
        });
        expect(cellValue).toBeCloseTo(expectedResult, 4);
      }
    );
  });

  describe("COUPPCD formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPPCD"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPPCD"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPPCD"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPPCD"));
    });

    test.each([
      ["01/01/2021", "01/01/2022", 1, 0, "01/01/2021"],
      ["01/01/2012", "05/01/2016", 1, 0, "05/01/2011"],
      ["01/01/2012", "05/01/2016", 2, 1, "11/01/2011"],
      ["01/01/2012", "05/01/2016", 4, 2, "11/01/2011"],
      ["01/01/2012", "05/01/2016", 1, 3, "05/01/2011"],
      ["01/01/2012", "05/01/2016", 2, 4, "11/01/2011"],
      ["01/01/2012", "05/01/2016", 4, 1, "11/01/2011"],
      ["01/01/2012", "01/02/2012", 1, 0, "01/02/2011"],
      ["01/01/2012", "01/02/2012", 2, 1, "07/02/2011"],
      ["01/01/2012", "01/02/2012", 4, 2, "10/02/2011"],
      ["01/01/2012", "01/02/2012", 1, 3, "01/02/2011"],
      ["01/01/2012", "01/02/2012", 2, 4, "07/02/2011"],
      ["01/01/2012", "01/02/2012", 4, 1, "10/02/2011"],
      ["02/29/2020", "07/31/2020", 1, 0, "07/31/2019"],
      ["02/29/2020", "07/31/2020", 2, 1, "01/31/2020"],
      ["02/29/2020", "07/31/2020", 4, 2, "01/31/2020"],
      ["02/29/2020", "07/31/2020", 1, 3, "07/31/2019"],
      ["02/29/2020", "07/31/2020", 2, 4, "01/31/2020"],
      ["02/29/2020", "07/31/2020", 4, 1, "01/31/2020"],
      ["12/31/2005", "11/30/2010", 1, 0, "11/30/2005"],
      ["12/31/2005", "11/30/2010", 2, 1, "11/30/2005"],
      ["12/31/2005", "11/30/2010", 4, 2, "11/30/2005"],
      ["12/31/2005", "11/30/2010", 1, 3, "11/30/2005"],
      ["12/31/2005", "11/30/2010", 2, 4, "11/30/2005"],
      ["12/31/2005", "11/30/2010", 4, 1, "11/30/2005"],
      ["12/05/2009", "02/28/2010", 1, 0, "02/28/2009"],
      ["12/05/2009", "02/28/2010", 2, 1, "08/31/2009"],
      ["12/05/2009", "02/28/2010", 4, 2, "11/30/2009"],
      ["12/05/2009", "02/28/2010", 1, 3, "02/28/2009"],
      ["12/05/2009", "02/28/2010", 2, 4, "08/31/2009"],
      ["03/31/2008", "02/28/2010", 1, 0, "02/29/2008"],
      ["03/31/2008", "02/28/2010", 2, 1, "02/29/2008"],
      ["03/31/2008", "02/28/2010", 4, 2, "02/29/2008"],
      ["03/31/2008", "02/28/2010", 1, 3, "02/29/2008"],
      ["03/31/2008", "02/28/2010", 2, 4, "02/29/2008"],
    ])(
      "function result =COUPPCD(%s, %s, %s, %s)",
      (arg0: string, arg1: string, arg2: number, arg3: number, expectedResult: string) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPPCD("${arg0}", "${arg1}", ${arg2}, ${arg3})`,
        });
        expect(formatValue(cellValue, "mm/dd/yyyy")).toEqual(expectedResult);
      }
    );

    test("return formatted value", () => {
      expect(evaluateCellFormat("A1", { A1: "=COUPPCD(0, 100, 1, 1)" })).toBe("m/d/yyyy");
    });
  });

  describe("COUPNCD formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPNCD"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPNCD"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPNCD"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPNCD"));
    });

    test.each([
      ["01/01/2021", "01/01/2022", 1, 0, "01/01/2022"],
      ["01/01/2012", "05/01/2016", 1, 0, "05/01/2012"],
      ["01/01/2012", "05/01/2016", 2, 1, "05/01/2012"],
      ["01/01/2012", "05/01/2016", 4, 2, "02/01/2012"],
      ["01/01/2012", "05/01/2016", 1, 3, "05/01/2012"],
      ["01/01/2012", "05/01/2016", 2, 4, "05/01/2012"],
      ["01/01/2012", "05/01/2016", 4, 1, "02/01/2012"],
      ["01/01/2012", "01/02/2012", 1, 0, "01/02/2012"],
      ["01/01/2012", "01/02/2012", 2, 1, "01/02/2012"],
      ["01/01/2012", "01/02/2012", 4, 2, "01/02/2012"],
      ["01/01/2012", "01/02/2012", 1, 3, "01/02/2012"],
      ["01/01/2012", "01/02/2012", 2, 4, "01/02/2012"],
      ["01/01/2012", "01/02/2012", 4, 1, "01/02/2012"],
      ["02/29/2020", "07/31/2020", 1, 0, "07/31/2020"],
      ["02/29/2020", "07/31/2020", 2, 1, "07/31/2020"],
      ["02/29/2020", "07/31/2020", 4, 2, "04/30/2020"],
      ["02/29/2020", "07/31/2020", 1, 3, "07/31/2020"],
      ["02/29/2020", "07/31/2020", 2, 4, "07/31/2020"],
      ["02/29/2020", "07/31/2020", 4, 1, "04/30/2020"],
      ["12/31/2005", "11/30/2010", 1, 0, "11/30/2006"],
      ["12/31/2005", "11/30/2010", 2, 1, "05/31/2006"],
      ["12/31/2005", "11/30/2010", 4, 2, "02/28/2006"],
      ["12/31/2005", "11/30/2010", 1, 3, "11/30/2006"],
      ["12/31/2005", "11/30/2010", 2, 4, "05/31/2006"],
      ["12/31/2005", "11/30/2010", 4, 1, "02/28/2006"],
      ["12/05/2009", "02/28/2010", 1, 0, "02/28/2010"],
      ["12/05/2009", "02/28/2010", 2, 1, "02/28/2010"],
      ["12/05/2009", "02/28/2010", 4, 2, "02/28/2010"],
      ["12/05/2009", "02/28/2010", 1, 3, "02/28/2010"],
      ["12/05/2009", "02/28/2010", 2, 4, "02/28/2010"],
      ["03/31/2008", "02/28/2010", 1, 0, "02/28/2009"],
      ["03/31/2008", "02/28/2010", 2, 1, "08/31/2008"],
      ["03/31/2008", "02/28/2010", 4, 2, "05/31/2008"],
      ["03/31/2008", "02/28/2010", 1, 3, "02/28/2009"],
      ["03/31/2008", "02/28/2010", 2, 4, "08/31/2008"],
    ])(
      "function result =COUPNCD(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCount: number,
        expectedResult: string
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPNCD("${settlement}", "${maturity}", ${frequency}, ${dayCount})`,
        });
        expect(formatValue(cellValue, "mm/dd/yyyy")).toEqual(expectedResult);
      }
    );

    test("return formatted value", () => {
      expect(evaluateCellFormat("A1", { A1: "=COUPNCD(0, 100, 1, 1)" })).toBe("m/d/yyyy");
    });
  });

  describe("COUPNUM formula", () => {
    describe("Function arguments", () => {
      test("take at 3 or 4 arguments", () => testCouponArgNumber("COUPNUM"));
      test("maturity date should be greater than settlement date", () =>
        testMaturityGreaterThanSettlement("COUPNUM"));
      test("frequency should be 1, 2 or 4", () => testFrequencyValue("COUPNUM"));
      test("day count convention should be between 0 and 4", () =>
        testDayCountConventionValue("COUPNUM"));
    });

    test.each([
      ["01/01/2021", "01/01/2022", 1, 0, 1],
      ["01/01/2012", "05/01/2016", 1, 0, 5],
      ["01/01/2012", "05/01/2016", 2, 1, 9],
      ["01/01/2012", "05/01/2016", 4, 2, 18],
      ["01/01/2012", "05/01/2016", 1, 3, 5],
      ["01/01/2012", "05/01/2016", 2, 4, 9],
      ["01/01/2012", "05/01/2016", 4, 1, 18],
      ["01/01/2012", "01/02/2012", 1, 0, 1],
      ["01/01/2012", "01/02/2012", 2, 1, 1],
      ["01/01/2012", "01/02/2012", 4, 2, 1],
      ["01/01/2012", "01/02/2012", 1, 3, 1],
      ["01/01/2012", "01/02/2012", 2, 4, 1],
      ["01/01/2012", "01/02/2012", 4, 1, 1],
      ["01/01/2020", "07/31/2020", 1, 0, 1],
      ["01/01/2020", "07/31/2020", 2, 1, 2],
      ["01/01/2020", "07/31/2020", 4, 2, 3],
      ["01/01/2020", "07/31/2020", 1, 3, 1],
      ["01/01/2020", "07/31/2020", 2, 4, 2],
      ["01/01/2020", "07/31/2020", 4, 1, 3],
      ["12/01/2005", "12/31/2005", 4, 0, 1],
      ["12/01/2005", "12/31/2005", 4, 1, 1],
      ["12/01/2005", "12/31/2005", 4, 2, 1],
      ["12/01/2005", "12/31/2005", 4, 3, 1],
      ["12/01/2005", "12/31/2005", 4, 4, 1],
      ["12/05/2005", "01/01/2010", 4, 0, 17],
      ["12/05/2005", "01/01/2010", 4, 1, 17],
      ["12/05/2005", "01/01/2010", 4, 2, 17],
      ["12/05/2005", "01/01/2010", 4, 3, 17],
      ["12/05/2005", "01/01/2010", 4, 4, 17],
    ])(
      "function result =COUPNUM(%s, %s, %s, %s)",
      (
        settlement: string,
        maturity: string,
        frequency: number,
        dayCount: number,
        expectedResult: number
      ) => {
        const cellValue = evaluateCell("A1", {
          A1: `=COUPNUM("${settlement}", "${maturity}", ${frequency}, ${dayCount})`,
        });
        expect(cellValue).toEqual(expectedResult);
      }
    );
  });
});

describe("DB formula", () => {
  test("take at 4 or 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DB(100, 10, 5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DB(100, 10, 5, 1)" })).toBeCloseTo(36.9, 5);
    expect(evaluateCell("A1", { A1: "=DB(100, 10, 5, 1, 6)" })).toBeCloseTo(18.45, 5);
    expect(evaluateCell("A1", { A1: "=DB(100, 10, 5, 1, 6, 7)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the DB", () => {
      test("with whole years", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, 2)" })).toBeCloseTo(16.3564, 6);
        expect(evaluateCell("A1", { A1: "=DB(500, 100, 6, 1)" })).toBeCloseTo(117.5, 6);
        expect(evaluateCell("A1", { A1: "=DB(500, 100, 2.5, 2)" })).toBeCloseTo(124.6875, 6);
      });
      test("with years started", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 5, 1, 3)" })).toBeCloseTo(9.225, 6);
        expect(evaluateCell("A1", { A1: "=DB(500, 100, 6, 2, 9)" })).toBeCloseTo(96.790625, 6);
        expect(evaluateCell("A1", { A1: "=DB(500, 100, 3.25, 1, 6)" })).toBeCloseTo(97.75, 6);
      });
    });

    test("parameter 1 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: "=DB(1, 0, 10, 2)" })).toBeCloseTo(0, 5);
      expect(evaluateCell("A1", { A1: "=DB(0, 10, 10, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=DB(-10, 100, 6, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 2 must be greater than or equal to 0", () => {
      expect(evaluateCell("A1", { A1: "=DB(100, 0, 10, 2)" })).toBeCloseTo(0, 5);
      expect(evaluateCell("A1", { A1: "=DB(100, -10, 10, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=DB(500, -1, 6, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 3 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: "=DB(100, 10, 1, 1)" })).toBeCloseTo(90, 5);
      expect(evaluateCell("A1", { A1: "=DB(100, 10, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=DB(500, 100, -10, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 4 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, 1)" })).toBeCloseTo(20.6, 5);
      expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=DB(500, 100, 6, -10)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 4 is truncated", () => {
      expect(evaluateCell("A1", { A1: "=DB(100,10, 2.5, 1)" })).toBeCloseTo(60.2, 5);
      expect(evaluateCell("A1", { A1: "=DB(100,10, 2.5, 1.9)" })).toBeCloseTo(60.2, 5);
    });

    test("parameter 5 must be between 1 and 12 inclusive", () => {
      expect(evaluateCell("A1", { A1: "=DB(1200, 100, 6, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(evaluateCell("A1", { A1: "=DB(1200, 100, 6, 1, 1)" })).toBeCloseTo(33.9, 6);
      expect(evaluateCell("A1", { A1: "=DB(1200, 100, 6, 1, 12)" })).toBeCloseTo(406.8, 6);
      expect(evaluateCell("A1", { A1: "=DB(1200, 100, 6, 1, 13)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 5 is truncated", () => {
      expect(evaluateCell("A1", { A1: "=DB(100,10, 2, 1, 6.9)" })).toBeCloseTo(34.2, 5);
      expect(evaluateCell("A1", { A1: "=DB(100,10, 2, 1, 6)" })).toBeCloseTo(34.2, 5);
    });

    describe("parameter 4 must be smaller than or equal to:", () => {
      test("parameter 3 if parameter 5 is empty or equal to 12", () => {
        expect(evaluateCell("A1", { A1: "=DB(1000, 10, 2, 2)" })).toBeCloseTo(90, 5);
        expect(evaluateCell("A1", { A1: "=DB(1000, 10, 2, 3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(500, 5, 1, 1, 12)" })).toBeCloseTo(495, 5);
        expect(evaluateCell("A1", { A1: "=DB(500, 5, 1, 2, 12)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("parameter 3 + 1 if parameter 5 is between 1 and 11 inclusive", () => {
        expect(evaluateCell("A1", { A1: "=DB(1000, 10, 2, 3, 6)" })).toBeCloseTo(24.75, 5); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(1000, 10, 2, 4, 6)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(1200, 12, 1, 2, 1)" })).toBeCloseTo(999.1575, 5); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(1200, 12, 1, 3, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(1200, 12, 1, 2, 11)" })).toBeCloseTo(9.1575, 5); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(1200, 12, 1, 3, 11)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DB( , 10, 10, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(A2, 10, 10, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DB("100", 10, 10, 2)' })).toBeCloseTo(16.3564, 5);
        expect(evaluateCell("A1", { A1: "=DB(A2, 10, 10, 2)", A2: '="100"' })).toBeCloseTo(
          16.3564,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DB(" ", 10, 10, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DB("kikou", 10, 10, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DB(A2, 10, 10, 2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DB(TRUE, 2, 2, 1)" })).toBeCloseTo(-0.414, 5);
        expect(evaluateCell("A1", { A1: "=DB(FALSE, 2, 2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(A2, 2, 2, 1)", A2: "TRUE" })).toBeCloseTo(-0.414, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DB(100,  , 10, 1)" })).toBeCloseTo(100, 6);
        expect(evaluateCell("A1", { A1: "=DB(100, A2, 10, 1)" })).toBeCloseTo(100, 6);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, "10", 10, 2)' })).toBeCloseTo(16.3564, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, A2, 10, 2)", A2: '="10"' })).toBeCloseTo(
          16.3564,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, " ", 10, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DB(100, "kikou", 10, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DB(100, A2, 10, 2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, TRUE, 10, 1)" })).toBeCloseTo(36.9, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, FALSE, 10, 1)" })).toBeCloseTo(100, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, A2, 10, 1)", A2: "TRUE" })).toBeCloseTo(36.9, 5);
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10,  , 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, A2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, 10, "10", 2)' })).toBeCloseTo(16.3564, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, 10, A2, 2)", A2: '="10"' })).toBeCloseTo(
          16.3564,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, 10, " ", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DB(100, 10, "kikou", 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, A2, 2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10, TRUE, 1)" })).toBeCloseTo(90, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, 10, FALSE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, A2, 1)", A2: "TRUE" })).toBeCloseTo(90, 5);
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, 10, 10, "2")' })).toBeCloseTo(16.3564, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, A2)", A2: '="2"' })).toBeCloseTo(
          16.3564,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DB(100, 10, 10, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DB(100, 10, 10, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, TRUE)" })).toBeCloseTo(20.6, 5);
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(100, 10, 10, A2)", A2: "TRUE" })).toBeCloseTo(20.6, 5);
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DB(120, 10, 10, 1, "1")' })).toBeCloseTo(2.2, 5);
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, A2)", A2: '="1"' })).toBeCloseTo(
          2.2,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DB(120, 10, 10, 1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DB(120, 10, 10, 1, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, TRUE)" })).toBeCloseTo(2.2, 5);
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(120, 10, 10, 1, A2)", A2: "TRUE" })).toBeCloseTo(
          2.2,
          5
        );
      });
    });
  });

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=DB(100, 10, 5, 1)" })).toBe("#,##0.00");
  });
});

describe("DURATION formula", () => {
  test("take at 4 or 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DURATION(0, 365, 0.05, 0.1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DURATION(0, 365, 0.05, 0.1, 1)" })).toBeCloseTo(1, 5);
    expect(evaluateCell("A1", { A1: "=DURATION(0, 365, 0.05, 0.1, 1, 0)" })).toBeCloseTo(1, 5);
    expect(evaluateCell("A1", { A1: "=DURATION(0, 365, 0.05, 0.1, 1, 0, 42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the DURATION", () => {
      test("basic formula", () => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("1/1/2000", "1/1/2040", 0.05, 0.1, 1, 0)' })
        ).toBeCloseTo(11.38911, 5);
      });

      test.each([
        ["01/01/1999", 11.37412],
        ["01/01/2015", 11.25349],
      ])("variation on 1st argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION(A2, "1/1/2040", 0.05, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["01/01/2041", 11.37412],
        ["01/01/2010", 7.66086],
      ])("variation on 2nd argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("1/1/2000", A2, 0.05, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 10.53998],
        ["0.02", 13.13158],
        ["2.99", 10.11881],
      ])("variation on 3th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("1/1/2000", "1/1/2040", A2, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 7.87788],
        ["0.02", 23.38874],
        ["2.99", 1.33445],
      ])("variation on 4th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("1/1/2000", "1/1/2040", 0.05, A2, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["2", 10.87578],
        ["4", 10.61808],
      ])("variation on 5th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("1/1/2000", "1/1/2040", 0.05, 0.1, A2, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      // test.each([
      //   ["1", 11.38911],
      //   ["2", 11.40578],
      //   ["3", 11.39185],
      //   ["4", 11.38911],
      // ])("variation on 6th argument", (arg, result) => {
      //   expect(evaluateCell("A1", { A1: '=DURATION("1/1/2000", "1/1/2040", 0.05, 0.1, 1, A2)', A2: arg })).toBeCloseTo(result, 5);
      // })
    });

    test.each([
      ["12/12/2012 23:00", 7.12859],
      ["12/12/2012", 7.12859],
    ])("parameter 1 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=DURATION(A2, "12/12/21", 0.05, 0.1, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([["12/11/2012"], ["12/12/2012"]])(
      "parameter 2 must be greater than parameter 1",
      (arg) => {
        expect(
          evaluateCell("A1", { A1: '=DURATION("12/12/12", A2, 0.05, 0.1, 1, 0)', A2: arg })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      }
    );

    test.each([
      ["12/12/2021 23:00", 7.12859],
      ["12/12/2021", 7.12859],
    ])("parameter 2 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", A2, 0.05, 0.1, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test("parameter 3 must be greater than or equal 0", () => {
      expect(evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", -0.1, 0.1, 1, 0)' })).toBe(
        "#ERROR"
      ); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0, 0.1, 1, 0)' })
      ).toBeCloseTo(9, 5);
    });

    test("parameter 4 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, -0.1, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, 0, 1, 0)' })
      ).toBeCloseTo(7.75862, 5);
    });

    test.each([
      ["0", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["1", 7.12859],
      ["2", 6.97745],
      ["3", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["4", 6.89971],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 5 must be one of '1' '2' '4'", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, 0.1, A2, 0)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["1.9", 7.12859],
      ["2.9", 6.97745],
    ])("parameter 5 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, 0.1, A2, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([
      ["-1", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["0", 7.12859],
      ["4", 7.12859],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 6 must be between 0 and 4", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, 0.1, 1, A2)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["0", 7.12859],
      ["0.9", 7.12859],
    ])("parameter 6 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=DURATION("12/12/12", "12/12/21", 0.05, 0.1, 1, A2)', A2: arg })
      ).toBeCloseTo(result, 5);
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION( , 730, 0.1, 0.5, 1)" })).toBeCloseTo(1.88, 5);
        expect(evaluateCell("A1", { A1: "=DURATION(A2, 730, 0.1, 0.5, 1)" })).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION("0", 730, 0.1, 0.5, 1)' })).toBeCloseTo(1.88, 5);
        expect(
          evaluateCell("A1", { A1: "=DURATION(A2, 730, 0.1, 0.5, 1)", A2: '="0"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(" ", 730, 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION("kikou", 730, 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(A2, 730, 0.1, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(TRUE, 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.88,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(FALSE, 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.88,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=DURATION(A2, 730, 0.1, 0.5, 1)", A2: "TRUE" })
        ).toBeCloseTo(1.88, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0,  , 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DURATION(0, A2, 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, "730", 0.1, 0.5, 1)' })).toBeCloseTo(1.88, 5);
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, A2, 0.1, 0.5, 1)", A2: '="730"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, " ", 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION(0, "kikou", 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(0, A2, 0.1, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, TRUE, 0.1, 0.5, 1)" })).toBeCloseTo(0, 5);
        expect(evaluateCell("A1", { A1: "=DURATION(0, FALSE, 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(evaluateCell("A1", { A1: "=DURATION(0, A2, 0.1, 0.5, 1)", A2: "TRUE" })).toBeCloseTo(
          0,
          5
        );
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730,  , 0.5, 1)" })).toBeCloseTo(2, 5);
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, A2, 0.5, 1)" })).toBeCloseTo(2, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, "0.1", 0.5, 1)' })).toBeCloseTo(1.88, 5);
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, A2, 0.5, 1)", A2: '="0.1"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, " ", 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, "kikou", 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, A2, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, TRUE, 0.5, 1)" })).toBeCloseTo(
          1.57143,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, FALSE, 0.5, 1)" })).toBeCloseTo(2.0, 5);
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, A2, 0.5, 1)", A2: "TRUE" })).toBeCloseTo(
          1.57143,
          5
        );
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, , 1 )" })).toBeCloseTo(1.91667, 5);
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, A2, 1)" })).toBeCloseTo(1.91667, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, "0.5", 1)' })).toBeCloseTo(1.88, 5);
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, A2, 1)", A2: '="0.5"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, " ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, "kikou", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, A2, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, TRUE, 1)" })).toBeCloseTo(
          1.84615,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, FALSE, 1)" })).toBeCloseTo(
          1.91667,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, A2, 1)", A2: "TRUE" })).toBeCloseTo(
          1.84615,
          5
        );
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, "1")' })).toBeCloseTo(1.88, 5);
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, A2)", A2: '="1"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, A2)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, TRUE)" })).toBeCloseTo(
          1.88,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, A2)", A2: "TRUE" })
        ).toBeCloseTo(1.88, 5);
      });
    });
    describe("on 6th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1,  )" })).toBeCloseTo(
          1.88,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, A2)" })).toBeCloseTo(
          1.88,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, 1, "0")' })).toBeCloseTo(
          1.88,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, A2)", A2: '="0"' })
        ).toBeCloseTo(1.88, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, 1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=DURATION(0, 730, 0.1, 0.5, 1, "kikou")' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, A2)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, TRUE)" })).toBeCloseTo(
          1.88,
          5
        );
        expect(evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, FALSE)" })).toBeCloseTo(
          1.88,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=DURATION(0, 730, 0.1, 0.5, 1, A2)", A2: "TRUE" })
        ).toBeCloseTo(1.88, 5);
      });
    });
  });
});

describe("EFFECT formula", () => {
  test("take 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=EFFECT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EFFECT(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Nominal rate is > 0", () => {
    expect(evaluateCell("A1", { A1: "=EFFECT(-1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=EFFECT(0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=EFFECT(0.5, 1)" })).toBe(0.5);
  });

  test("Number of periods is > 0 and is truncated", () => {
    expect(evaluateCell("A1", { A1: "=EFFECT(1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=EFFECT(1, 1.5)" })).toBe(1);
  });

  test.each([
    ["6%", 1, 0.06],
    ["6.09%", 2, 0.061827203],
    ["6.14%", 4, 0.062828258],
    ["6.17%", 12, 0.063475078],
    ["6.18%", 365, 0.063744009],
    ["6.14%", 4.5, 0.062828258],
    ["12.00%", 3, 0.124864],
    ["15%", 7, 0.15999472],
  ])(
    "function result =EFFECT(%s, %s)",
    (nominalRate: string | number, nPeriods: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", {
        A1: `=EFFECT("${nominalRate}", "${nPeriods}")`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 8);
    }
  );
});

describe("FV formula", () => {
  test("take at 4 or 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=FV(1, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FV(1, 2, 3)" })).toBeCloseTo(-9, 5);
    expect(evaluateCell("A1", { A1: "=FV(1, 2, 3, 4)" })).toBeCloseTo(-25, 5);
    expect(evaluateCell("A1", { A1: "=FV(1, 2, 3, 4, 5)" })).toBeCloseTo(-34, 5);
    expect(evaluateCell("A1", { A1: "=FV(1, 2, 3, 4, 5, 6)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the FV", () => {
      test("basic formula", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, 0)" })).toBeCloseTo(-151.7563, 5);
      });

      test.each([
        ["1", -74749],
        ["0", -100.0],
        ["-0.02", -84.63418],
      ])("variation on 1st argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=FV(A2, 10, 3, 70, 0)", A2: arg })).toBeCloseTo(result, 5);
      });

      test.each([
        ["10.9", -161.26194],
        ["0", -70],
        ["-0.5", -66.86701],
      ])("variation on 2nd argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, A2, 3, 70, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["3.9", -163.0764],
        ["0", -114.02262],
        ["-20", 137.53523],
      ])("variation on 3th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, A2, 70, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["70.9", -153.22231],
        ["0", -37.73368],
        ["-42", 30.6799],
      ])("variation on 4th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, A2, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["0.9", -153.64299],
        ["23", -153.64299],
      ])("variation on 5th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, A2)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=FV( , 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
        expect(evaluateCell("A1", { A1: "=FV(A2, 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=FV("0.05", 10, 3, 70, 0)' })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(A2, 10, 3, 70, 0)", A2: '="0.05"' })).toBeCloseTo(
          -151.7563,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=FV(" ", 10, 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=FV("kikou", 10, 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=FV(A2, 10, 3, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=FV(TRUE, 10, 3, 70, 0)" })).toBeCloseTo(-74749, 5);
        expect(evaluateCell("A1", { A1: "=FV(FALSE, 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
        expect(evaluateCell("A1", { A1: "=FV(A2, 10, 3, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -74749,
          5
        );
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05,  , 3, 70, 0)" })).toBeCloseTo(-70, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, A2, 3, 70, 0)" })).toBeCloseTo(-70, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, "10", 3, 70, 0)' })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, A2, 3, 70, 0)", A2: '="10"' })).toBeCloseTo(
          -151.7563,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, " ", 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=FV(0.05, "kikou", 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=FV(0.05, A2, 3, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, TRUE, 3, 70, 0)" })).toBeCloseTo(-76.5, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, FALSE, 3, 70, 0)" })).toBeCloseTo(-70, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, A2, 3, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -76.5,
          5
        );
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10,  , 70, 0)" })).toBeCloseTo(-114.02262, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, A2, 70, 0)" })).toBeCloseTo(-114.02262, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, "3", 70, 0)' })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, A2, 70, 0)", A2: '="3"' })).toBeCloseTo(
          -151.7563,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, " ", 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, "kikou", 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, A2, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, TRUE, 70, 0)" })).toBeCloseTo(-126.60052, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, FALSE, 70, 0)" })).toBeCloseTo(
          -114.02262,
          5
        );
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, A2, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -126.60052,
          5
        );
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, , 0)" })).toBeCloseTo(-37.73368, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, A2, 0)" })).toBeCloseTo(-37.73368, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, "70", 0)' })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, A2, 0)", A2: '="70"' })).toBeCloseTo(
          -151.7563,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, " ", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, "kikou", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, A2, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, TRUE, 0)" })).toBeCloseTo(-39.36257, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, FALSE, 0)" })).toBeCloseTo(-37.73368, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, A2, 0)", A2: "TRUE" })).toBeCloseTo(
          -39.36257,
          5
        );
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as FALSE", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70,  )" })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, A2)" })).toBeCloseTo(-151.7563, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as boolean", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, 70, "TRUE")' })).toBeCloseTo(
          -153.64299,
          5
        );
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, A2)", A2: '="TRUE"' })).toBeCloseTo(
          -153.64299,
          5
        );
      });
      test("string/string in cell which cannot be cast in boolean return an error", () => {
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, 70, "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=FV(0.05, 10, 3, 70, "TEST")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("number/number in cell are interpreted as boolean", () => {
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, 0)" })).toBeCloseTo(-151.7563, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, 42)" })).toBeCloseTo(-153.64299, 5);
        expect(evaluateCell("A1", { A1: "=FV(0.05, 10, 3, 70, A2)", A2: "42" })).toBeCloseTo(
          -153.64299,
          5
        );
      });
    });
  });

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=FV(1, 2, 3)" })).toBe("#,##0.00");
  });
});

describe("IRR formula", () => {
  test("ttake 2 arg minimum", () => {
    expect(evaluateCell("A1", { A1: "=IRR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IRR(A2:A3)", A2: "-10", A3: "2" })).toBeCloseTo(-0.8, 5);
    expect(evaluateCell("A1", { A1: "=IRR(A2:A3, 2)", A2: "-10", A3: "2" })).toBeCloseTo(-0.8, 5);
    expect(evaluateCell("A1", { A1: "=IRR(A2:A3, 2, 3)", A2: "-10", A3: "2" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    const grid = { A2: "-200", A3: "120", A4: "140", A5: "100" };

    describe("return the IRR", () => {
      test("basic formula", () => {
        expect(evaluateCell("A1", { A1: "=IRR(A2:A5)", ...grid })).toBeCloseTo(0.37418, 5);
      });

      test.each([
        ["-140", -0.33034],
        ["0", 0.05189],
      ])("variation on 1st argument", (arg, result) => {
        const grid = { A2: "-200", A3: "120", A4: arg, A5: "100" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A5)", ...grid })).toBeCloseTo(result, 5);
      });

      test("variation on the number of repeatable argument into the 1st argument", () => {
        const grid1 = { A2: "-200", A3: "120", A4: "140" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A4)", ...grid1 })).toBeCloseTo(0.18882, 5);
        const grid2 = { A2: "-200", A3: "120" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A4)", ...grid2 })).toBeCloseTo(-0.4, 5);
      });

      test.each([
        ["-0.9", 0.37418],
        ["0", 0.37418],
        ["10", 0.37418],
      ])("variation on 2nd argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=IRR(A2:A5," + arg + ")", ...grid })).toBeCloseTo(
          result,
          5
        );
      });
    });

    test.each([
      [{ A2: "-200", B2: "120", A3: "140", B3: "100" }, 0.37418],
      [{ A2: "100", B2: "120", A3: "140", B3: "-200" }, -0.28071],
    ])("order of the repeatable arguments impact the result", (grid, result) => {
      expect(evaluateCell("A1", { A1: "=IRR(A2:B3)", ...grid })).toBeCloseTo(result, 5);
    });

    test.each([
      [{ A2: "200", A3: "120", A4: "140", A5: "100" }],
      [{ A2: "-100", A3: "-120", A4: "-140", A5: "-200" }],
    ])("1st argument should include negative and positive values", (grid) => {
      expect(evaluateCell("A1", { A1: "=IRR(A2:A5)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    });

    test.each([["-1"], ["-42"]])("2nd argument must be greater than -1", (arg) => {
      expect(evaluateCell("A1", { A1: "=IRR(A2:A5," + arg + ")", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });
  });

  describe("casting", () => {
    const grid = { A2: "-200", A3: "120" };

    describe("on 1st argument", () => {
      test("empty arguments are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=IRR( ,0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });

      test("empty cells are ignored", () => {
        const grid1 = { A2: "-200", A4: "120" };
        const grid2 = { A2: "-200", A3: "120" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A4)", ...grid1 })).toBeCloseTo(-0.4, 5);
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3)", ...grid2 })).toBeCloseTo(-0.4, 5);
      });

      test.each([
        ["120", 0.18882],
        ['="120"', -0.3],
        ['"120"', -0.3],
        ["coucou", -0.3],
      ])("strings in cell which which cannot be cast in number are ignored", (arg, result) => {
        const grid = { A2: "-200", A3: arg, A4: "140" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A4)", ...grid })).toBeCloseTo(result, 5);
      });

      test.each([
        ["TRUE", -0.3],
        ["FALSE", -0.3],
      ])("booleans in cell are ignored", (arg, result) => {
        const grid = { A2: "-200", A3: arg, A4: "140" };
        expect(evaluateCell("A1", { A1: "=IRR(A2:A4)", ...grid })).toBeCloseTo(result, 5);
      });
    });

    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3,)", ...grid })).toBeCloseTo(-0.4, 5);
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, A4)", ...grid })).toBeCloseTo(-0.4, 5);
      });

      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=IRR(A2:A3, "0.1")', ...grid })).toBeCloseTo(-0.4, 5);
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, A4)", ...grid, A4: '="0.1"' })).toBeCloseTo(
          -0.4,
          5
        );
      });

      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=IRR(A2:A3, " ")', ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=IRR(A2:A3, "kikou")', ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, A4)", ...grid, A4: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });

      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, TRUE)", ...grid })).toBeCloseTo(-0.4, 5);
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, FALSE)", ...grid })).toBeCloseTo(-0.4, 5);
        expect(evaluateCell("A1", { A1: "=IRR(A2:A3, A4)", ...grid, A4: "TRUE" })).toBeCloseTo(
          -0.4,
          5
        );
      });
    });
  });

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=IRR(A2:A3)", A2: "-10€", A3: "2" })).toBe("0%");
  });
});

describe("MDURATION formula", () => {
  test("take at 4 or 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=MDURATION(0, 365, 0.05, 0.1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MDURATION(0, 365, 0.05, 0.1, 1)" })).toBeCloseTo(0.90909, 5);
    expect(evaluateCell("A1", { A1: "=MDURATION(0, 365, 0.05, 0.1, 1, 0)" })).toBeCloseTo(
      0.90909,
      5
    );
    expect(evaluateCell("A1", { A1: "=MDURATION(0, 365, 0.05, 0.1, 1, 0, 42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the MDURATION", () => {
      test("basic formula", () => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION("1/1/2000", "1/1/2040", 0.05, 0.1, 1, 0)' })
        ).toBeCloseTo(10.35374, 5);
      });

      test.each([
        ["01/01/1999", 10.34011],
        ["01/01/2015", 10.23045],
      ])("variation on 1st argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION(A2, "1/1/2040", 0.05, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["01/01/2041", 10.34011],
        ["01/01/2010", 6.96442],
      ])("variation on 2nd argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION("1/1/2000", A2, 0.05, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 9.5818],
        ["0.02", 11.9378],
        ["2.99", 9.19892],
      ])("variation on 3th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION("1/1/2000", "1/1/2040", A2, 0.1, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 6.85033],
        ["0.02", 22.93014],
        ["2.99", 0.33445],
      ])("variation on 4th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION("1/1/2000", "1/1/2040", 0.05, A2, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["2", 10.35789],
        ["4", 10.3591],
      ])("variation on 5th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=MDURATION("1/1/2000", "1/1/2040", 0.05, 0.1, A2, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      // test.each([
      //   ["1", 10.35374],
      //   ["2", 10.36889],
      //   ["3", 10.35623],
      //   ["4", 10.35374],
      // ])("variation on 6th argument", (arg, result) => {
      //   expect(evaluateCell("A1", { A1: '=MDURATION("1/1/2000", "1/1/2040", 0.05, 0.1, 1, A2)', A2: arg })).toBeCloseTo(result, 5);
      // })
    });

    test.each([
      ["12/12/2012 23:00", 6.48053],
      ["12/12/2012", 6.48053],
    ])("parameter 1 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION(A2, "12/12/21", 0.05, 0.1, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([["12/11/2012"], ["12/12/2012"]])(
      "parameter 2 must be greater than parameter 1",
      (arg) => {
        expect(
          evaluateCell("A1", { A1: '=MDURATION("12/12/12", A2, 0.05, 0.1, 1, 0)', A2: arg })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      }
    );

    test.each([
      ["12/12/2021 23:00", 6.48053],
      ["12/12/2021", 6.48053],
    ])("parameter 2 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", A2, 0.05, 0.1, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test("parameter 3 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", -0.1, 0.1, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0, 0.1, 1, 0)' })
      ).toBeCloseTo(8.18182, 5);
    });

    test("parameter 4 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, -0.1, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, 0, 1, 0)' })
      ).toBeCloseTo(7.75862, 5);
    });

    test.each([
      ["0", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["1", 6.48053],
      ["2", 6.64519],
      ["3", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["4", 6.73142],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 5 must be one of '1' '2' '4'", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, 0.1, A2, 0)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["1.9", 6.48053],
      ["2.9", 6.64519],
    ])("parameter 5 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, 0.1, A2, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([
      ["-1", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["0", 6.48053],
      ["4", 6.48053],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 6 must be between 0 and 4", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, 0.1, 1, A2)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["0", 6.48053],
      ["0.9", 6.48053],
    ])("parameter 6 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=MDURATION("12/12/12", "12/12/21", 0.05, 0.1, 1, A2)', A2: arg })
      ).toBeCloseTo(result, 5);
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION( , 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(A2, 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.25333,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION("0", 730, 0.1, 0.5, 1)' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(A2, 730, 0.1, 0.5, 1)", A2: '="0"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(" ", 730, 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION("kikou", 730, 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=MDURATION(A2, 730, 0.1, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(TRUE, 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(FALSE, 730, 0.1, 0.5, 1)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(A2, 730, 0.1, 0.5, 1)", A2: "TRUE" })
        ).toBeCloseTo(1.25333, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0,  , 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, A2, 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, "730", 0.1, 0.5, 1)' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, A2, 0.1, 0.5, 1)", A2: '="730"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, " ", 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION(0, "kikou", 0.1, 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, A2, 0.1, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, TRUE, 0.1, 0.5, 1)" })).toBeCloseTo(0, 5);
        expect(evaluateCell("A1", { A1: "=MDURATION(0, FALSE, 0.1, 0.5, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, A2, 0.1, 0.5, 1)", A2: "TRUE" })
        ).toBeCloseTo(0, 5);
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730,  , 0.5, 1)" })).toBeCloseTo(1.33333, 5);
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, A2, 0.5, 1)" })).toBeCloseTo(
          1.33333,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, "0.1", 0.5, 1)' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, A2, 0.5, 1)", A2: '="0.1"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, " ", 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, "kikou", 0.5, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, A2, 0.5, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, TRUE, 0.5, 1)" })).toBeCloseTo(
          1.04762,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, FALSE, 0.5, 1)" })).toBeCloseTo(
          1.33333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, A2, 0.5, 1)", A2: "TRUE" })
        ).toBeCloseTo(1.04762, 5);
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, , 1 )" })).toBeCloseTo(1.91667, 5);
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, A2, 1)" })).toBeCloseTo(
          1.91667,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, "0.5", 1)' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, A2, 1)", A2: '="0.5"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, " ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, "kikou", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, A2, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, TRUE, 1)" })).toBeCloseTo(
          0.92308,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, FALSE, 1)" })).toBeCloseTo(
          1.91667,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, A2, 1)", A2: "TRUE" })
        ).toBeCloseTo(0.92308, 5);
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, "1")' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, A2)", A2: '="1"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, A2)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, TRUE)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, A2)", A2: "TRUE" })
        ).toBeCloseTo(1.25333, 5);
      });
    });
    describe("on 6th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1,  )" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, A2)" })).toBeCloseTo(
          1.25333,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, 1, "0")' })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, A2)", A2: '="0"' })
        ).toBeCloseTo(1.25333, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, 1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=MDURATION(0, 730, 0.1, 0.5, 1, "kikou")' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, A2)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, TRUE)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, FALSE)" })).toBeCloseTo(
          1.25333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=MDURATION(0, 730, 0.1, 0.5, 1, A2)", A2: "TRUE" })
        ).toBeCloseTo(1.25333, 5);
      });
    });
  });
});

describe("NOMINAL formula", () => {
  test("take 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOMINAL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NOMINAL(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Effective rate is > 0", () => {
    expect(evaluateCell("A1", { A1: "=NOMINAL(-1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=NOMINAL(0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NOMINAL(0.5, 1)" })).toBe(0.5);
  });

  test("Number of periods is > 0 and is truncated", () => {
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NOMINAL(1, 1.5)" })).toBe(1);
  });

  test.each([
    ["6%", 1, 0.06],
    ["6.09%", 2, 0.06],
    ["6.14%", 4, 0.060034857],
    ["6.17%", 12, 0.060021003],
    ["6.18%", 365, 0.059970507],
    [0.12, 3, 0.115496461],
    [0.15, 7, 0.141166518],
  ])(
    "function result =NOMINAL(%s, %s)",
    (effectiveRate: string | number, nPeriods: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", {
        A1: `=NOMINAL("${effectiveRate}", "${nPeriods}")`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 8);
    }
  );
});

describe("NPV formula", () => {
  test("ttake 2 arg minimum", () => {
    expect(evaluateCell("A1", { A1: "=NPV(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NPV(1, 2)" })).toBeCloseTo(1.0);
    expect(evaluateCell("A1", { A1: "=NPV(1, 2, 3, 4, 5, 6, 7, 8)" })).toBeCloseTo(2.92188, 5);
  });

  describe("business logic", () => {
    describe("return the NPV", () => {
      test("basic formula", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, 20)" })).toBeCloseTo(27.6644, 5);
      });

      test.each([
        ["0.08", 26.40604],
        ["0", 30.0],
        ["-0.9", 2100.0],
      ])("variation on 1st argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=NPV(A2, 10, 20)", A2: arg })).toBeCloseTo(result, 5);
      });

      test("variation on repeatable arguments", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 30, 20)" })).toBeCloseTo(46.71202, 5);
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 30, -42)" })).toBeCloseTo(-9.52381, 5);
      });

      test("variation on the number of repeatable arguments", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10)" })).toBeCloseTo(9.52381, 5);
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, 20, 25)" })).toBeCloseTo(49.26034, 5);
      });
    });

    describe("order of the repeatable arguments impact the result", () => {
      const grid = {
        A1: "=NPV(0.08, B1, C1, B2, C2)",
        A2: "=NPV(0.08, C2, B2, C1, B1)",
        A3: "=NPV(0.08, B1:C1, B2:C2)",
        A4: "=NPV(0.08, B1:B2, C1:C2)",
        A5: "=NPV(0.08, B1:C2)",
        B1: "15",
        C1: "18",
        B2: "26",
        C2: "51",
      };

      const evaluatedGrid = evaluateGrid(grid);
      expect(evaluatedGrid.A1).toBeCloseTo(87.44715, 5);
      expect(evaluatedGrid.A2).toBeCloseTo(94.82746, 5);
      expect(evaluatedGrid.A3).toBeCloseTo(87.44715, 5);
      expect(evaluatedGrid.A4).toBeCloseTo(87.9552, 5);
      expect(evaluatedGrid.A5).toBeCloseTo(87.44715, 5);
    });

    test("1st argument must be different from -1", () => {
      expect(evaluateCell("A1", { A1: "=NPV(-1,	10,	20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=NPV( , 10, 20)" })).toBeCloseTo(30, 5);
        expect(evaluateCell("A1", { A1: "=NPV(A2, 10, 20)" })).toBeCloseTo(30, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=NPV("0.05", 10, 20)' })).toBeCloseTo(27.6644, 5);
        expect(evaluateCell("A1", { A1: "=NPV(A2, 10, 20)", A2: '="0.05"' })).toBeCloseTo(
          27.6644,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=NPV(" ", 10, 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=NPV("kikou", 10, 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=NPV(A2, 10, 20)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=NPV(TRUE, 10, 20)" })).toBeCloseTo(10, 5);
        expect(evaluateCell("A1", { A1: "=NPV(FALSE, 10, 20)" })).toBeCloseTo(30, 5);
        expect(evaluateCell("A1", { A1: "=NPV(A2, 10, 20)", A2: "TRUE" })).toBeCloseTo(10, 5);
      });
    });
    describe("on repeatable argument", () => {
      test("empty arguments are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10 , 0, 20)" })).toBeCloseTo(26.80056, 5);
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10 , , 20)" })).toBeCloseTo(26.80056, 5);
      });
      test("strings which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=NPV(0.05, 10 , 0, "20")' })).toBeCloseTo(26.80056, 5);
      });
      test("strings which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=NPV(0.05, 10 , 0, "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=NPV(0.05, 10 , 0, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("booleans are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10 , TRUE, 20)" })).toBeCloseTo(27.70759, 5);
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10 , FALSE, 20)" })).toBeCloseTo(26.80056, 5);
      });

      test("empty cells are ignored", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "" })).toBeCloseTo(
          27.6644,
          5
        );
      });
      test("strings in cell which which cannot be cast in number are ignored", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "20" })).toBeCloseTo(
          44.94115,
          5
        );
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "=20" })).toBeCloseTo(
          44.94115,
          5
        );
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: '="20"' })).toBeCloseTo(
          27.6644,
          5
        );
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: '"42"' })).toBeCloseTo(
          27.6644,
          5
        );
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "coucou" })).toBeCloseTo(
          27.6644,
          5
        );
      });
      test("booleans in cell are ignored", () => {
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "TRUE" })).toBeCloseTo(
          27.6644,
          5
        );
        expect(evaluateCell("A1", { A1: "=NPV(0.05, 10, A2, 20)", A2: "FALSE" })).toBeCloseTo(
          27.6644,
          5
        );
      });
    });
  });

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=NPV(0.05, 10, 20)" })).toBe("#,##0.00");
  });
});

describe("PDURATION formula", () => {
  test("take 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PDURATION(1, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PDURATION(1, 2, 3)" })).toBeCloseTo(0.58496, 5);
    expect(evaluateCell("A1", { A1: "=PDURATION(1, 2, 3, 4)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the PDURATION", () => {
      test("basic formula", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, 20)" })).toBeCloseTo(14.2067, 5);
      });

      test.each([
        ["0.08", 9.00647],
        ["2", 0.63093],
        ["0.4", 2.06004],
      ])("variation on 1st argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["30", -8.31039],
        ["4242.42", -109.79994],
      ])("variation on 2nd argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["53", 34.18121],
        ["0.02", -127.3742],
      ])("variation on 3th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });
    });

    test.each([["0"], ["-42"]])("parameter 0 must be greater than parameter 0", (arg) => {
      expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)", A2: arg })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test.each([["0"], ["-42"]])("parameter 0 must be greater than parameter 0", (arg) => {
      expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)", A2: arg })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test.each([["0"], ["-42"]])("parameter 0 must be greater than parameter 0", (arg) => {
      expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)", A2: arg })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION( , 10, 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION("0.05", 10, 20)' })).toBeCloseTo(14.2067, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)", A2: '="0.05"' })).toBeCloseTo(
          14.2067,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION(" ", 10, 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PDURATION("kikou", 10, 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(TRUE, 10, 20)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(FALSE, 10, 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PDURATION(A2, 10, 20)", A2: "TRUE" })).toBeCloseTo(1, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05,  , 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, "10", 20)' })).toBeCloseTo(14.2067, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)", A2: '="10"' })).toBeCloseTo(
          14.2067,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, " ", 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, "kikou", 20)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, TRUE, 20)" })).toBeCloseTo(61.40033, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, FALSE, 20)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, A2, 20)", A2: "TRUE" })).toBeCloseTo(
          61.40033,
          5
        );
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, 10, "20")' })).toBeCloseTo(14.2067, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)", A2: '="20"' })).toBeCloseTo(
          14.2067,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, 10, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PDURATION(0.05, 10, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, TRUE)" })).toBeCloseTo(-47.19363, 5);
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PDURATION(0.05, 10, A2)", A2: "TRUE" })).toBeCloseTo(
          -47.19363,
          5
        );
      });
    });
  });
});

describe("PV formula", () => {
  test("take at 4 or 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PV(1, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PV(1, 2, 3)" })).toBeCloseTo(-2.25, 5);
    expect(evaluateCell("A1", { A1: "=PV(1, 2, 3, 4)" })).toBeCloseTo(-3.25, 5);
    expect(evaluateCell("A1", { A1: "=PV(1, 2, 3, 4, 5)" })).toBeCloseTo(-5.5, 5);
    expect(evaluateCell("A1", { A1: "=PV(1, 2, 3, 4, 5, 6)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the PV", () => {
      test("basic formula", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, 0)" })).toBeCloseTo(-66.13913, 5);
      });

      test.each([
        ["1", -3.06543],
        ["0", -100.0],
        ["-0.02", -119.25385],
      ])("variation on 1st argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PV(A2, 10, 3, 70, 0)", A2: arg })).toBeCloseTo(result, 5);
      });

      test.each([
        ["10.9", -65.87539],
        ["0", -70.0],
        ["-0.5", -70.24695],
      ])("variation on 2nd argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, A2, 3, 70, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["3.9", -73.08869],
        ["0", -42.97393],
        ["-20", 111.46077],
      ])("variation on 3th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, A2, 70, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["70.9", -66.69165],
        ["0", -23.1652],
        ["-42", 2.61915],
      ])("variation on 4th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, A2, 0)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });

      test.each([
        ["0.9", -67.29739],
        ["23", -67.29739],
      ])("variation on 5th argument", (arg, result) => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, A2)", A2: arg })).toBeCloseTo(
          result,
          5
        );
      });
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PV( , 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
        expect(evaluateCell("A1", { A1: "=PV(A2, 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PV("0.05", 10, 3, 70, 0)' })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(A2, 10, 3, 70, 0)", A2: '="0.05"' })).toBeCloseTo(
          -66.13913,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PV(" ", 10, 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PV("kikou", 10, 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PV(A2, 10, 3, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PV(TRUE, 10, 3, 70, 0)" })).toBeCloseTo(-3.06543, 5);
        expect(evaluateCell("A1", { A1: "=PV(FALSE, 10, 3, 70, 0)" })).toBeCloseTo(-100, 5);
        expect(evaluateCell("A1", { A1: "=PV(A2, 10, 3, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -3.06543,
          5
        );
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05,  , 3, 70, 0)" })).toBeCloseTo(-70, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, A2, 3, 70, 0)" })).toBeCloseTo(-70, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, "10", 3, 70, 0)' })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, A2, 3, 70, 0)", A2: '="10"' })).toBeCloseTo(
          -66.13913,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, " ", 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PV(0.05, "kikou", 3, 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PV(0.05, A2, 3, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, TRUE, 3, 70, 0)" })).toBeCloseTo(-69.52381, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, FALSE, 3, 70, 0)" })).toBeCloseTo(-70, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, A2, 3, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -69.52381,
          5
        );
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10,  , 70, 0)" })).toBeCloseTo(-42.97393, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, A2, 70, 0)" })).toBeCloseTo(-42.97393, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, "3", 70, 0)' })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, A2, 70, 0)", A2: '="3"' })).toBeCloseTo(
          -66.13913,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, " ", 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, "kikou", 70, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, A2, 70, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, TRUE, 70, 0)" })).toBeCloseTo(-50.69566, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, FALSE, 70, 0)" })).toBeCloseTo(-42.97393, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, A2, 70, 0)", A2: "TRUE" })).toBeCloseTo(
          -50.69566,
          5
        );
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, , 0)" })).toBeCloseTo(-23.1652, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, A2, 0)" })).toBeCloseTo(-23.1652, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, "70", 0)' })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, A2, 0)", A2: '="70"' })).toBeCloseTo(
          -66.13913,
          5
        );
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, " ", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, "kikou", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, A2, 0)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, TRUE, 0)" })).toBeCloseTo(-23.77912, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, FALSE, 0)" })).toBeCloseTo(-23.1652, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, A2, 0)", A2: "TRUE" })).toBeCloseTo(
          -23.77912,
          5
        );
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as FALSE", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70,  )" })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, A2)" })).toBeCloseTo(-66.13913, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as boolean", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, 70, "TRUE")' })).toBeCloseTo(
          -67.29739,
          5
        );
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, A2)", A2: '="TRUE"' })).toBeCloseTo(
          -67.29739,
          5
        );
      });
      test("string/string in cell which cannot be cast in boolean return an error", () => {
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, 70, "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PV(0.05, 10, 3, 70, "TEST")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("number/number in cell are interpreted as boolean", () => {
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, 0)" })).toBeCloseTo(-66.13913, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, 42)" })).toBeCloseTo(-67.29739, 5);
        expect(evaluateCell("A1", { A1: "=PV(0.05, 10, 3, 70, A2)", A2: "42" })).toBeCloseTo(
          -67.29739,
          5
        );
      });
    });
  });

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=PV(1, 2, 3)" })).toBe("#,##0.00");
  });
});

describe("PRICE formula", () => {
  test("take at 6 or 7 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRICE(0, 365, 0.05, 0.1, 120)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICE(0, 365, 0.05, 0.1, 120, 1)" })).toBeCloseTo(
      113.63636,
      5
    );
    expect(evaluateCell("A1", { A1: "=PRICE(0, 365, 0.05, 0.1, 120, 1, 0)" })).toBeCloseTo(
      113.63636,
      5
    );
    expect(evaluateCell("A1", { A1: "=PRICE(0, 365, 0.05, 0.1, 120, 1, 0, 42)" })).toBe(
      "#BAD_EXPR"
    ); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the PRICE", () => {
      test("basic formula", () => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("1/1/2000", "1/1/2040", 0.05, 0.1, 120, 1, 0)' })
        ).toBeCloseTo(51.54664, 5);
      });

      test.each([
        ["01/01/1999", 51.40604],
        ["01/01/2015", 56.46072],
      ])("variation on 1st argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE(A2, "1/1/2040", 0.05, 0.1, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["01/01/2041", 51.40604],
        ["01/01/2010", 76.98803],
      ])("variation on 2nd argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("1/1/2000", A2, 0.05, 0.1, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 149.33715],
        ["0.02", 22.20949],
        ["2.99", 2926.58756],
      ])("variation on 3th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("1/1/2000", "1/1/2040", A2, 0.1, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 33.65688],
        ["0.02", 191.12425],
        ["2.99", 1.67224],
      ])("variation on 4th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("1/1/2000", "1/1/2040", 0.05, A2, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["100", 51.10475],
        ["200", 53.31424],
        ["1", 48.91735],
      ])("variation on 5th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("1/1/2000", "1/1/2040", 0.05, 0.1, A2, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["2", 51.41239],
        ["4", 51.34673],
      ])("variation on 6th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=PRICE("1/1/2000", "1/1/2040", 0.05, 0.1, 120, A2, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      // test.each([
      //   ["1", 51.54664],
      //   ["2", 51.54664],
      //   ["3", 51.54664],
      //   ["4", 51.54664],
      // ])("variation on 7th argument", (arg, result) => {
      //   expect(evaluateCell("A1", { A1: '=PRICE("1/1/2000", "1/1/2040", 0.05, 0.1, 1, A2)', A2: arg })).toBeCloseTo(result, 5);
      // })
    });

    test.each([
      ["12/12/2012 23:00", 79.68683],
      ["12/12/2012", 79.68683],
    ])("parameter 1 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=PRICE(A2, "12/12/21", 0.05, 0.1, 120, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([["12/11/2012"], ["12/12/2012"]])(
      "parameter 2 must be greater than parameter 1",
      (arg) => {
        expect(
          evaluateCell("A1", { A1: '=PRICE("12/12/12", A2, 0.05, 0.1, 120, 1, 0)', A2: arg })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      }
    );

    test.each([
      ["12/12/2021 23:00", 79.68683],
      ["12/12/2021", 79.68683],
    ])("parameter 2 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", A2, 0.05, 0.1, 120, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test("parameter 3 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", -0.1, 0.1, 120, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0, 0.1, 120, 1, 0)' })
      ).toBeCloseTo(50.89171, 5);
    });

    test("parameter 4 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, -0.1, 120, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0, 120, 1, 0)' })
      ).toBeCloseTo(165, 5);
    });

    test("parameter 5 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 0, 1, 0)' })).toBe(
        "#ERROR"
      ); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 1, 1, 0)' })
      ).toBeCloseTo(29.21922, 5);
    });

    test.each([
      ["0", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["1", 79.68683],
      ["2", 79.08645],
      ["3", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["4", 78.77656],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 6 must be one of '1' '2' '4'", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 120, A2, 0)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["1.9", 79.68683],
      ["2.9", 79.08645],
    ])("parameter 6 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 120, A2, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([
      ["-1", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["0", 79.68683],
      ["4", 79.68683],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 7 must be between 0 and 4", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 120, 1, A2)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["0", 79.68683],
      ["0.9", 79.68683],
    ])("parameter 7 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=PRICE("12/12/12", "12/12/21", 0.05, 0.1, 120, 1, A2)', A2: arg })
      ).toBeCloseTo(result, 5);
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE( , 730, 0.1, 0.5, 120, 1)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(A2, 730, 0.1, 0.5, 120, 1)" })).toBeCloseTo(
          64.44444,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE("0", 730, 0.1, 0.5, 120, 1)' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(A2, 730, 0.1, 0.5, 120, 1)", A2: '="0"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(" ", 730, 0.1, 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE("kikou", 730, 0.1, 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(A2, 730, 0.1, 0.5, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(TRUE, 730, 0.1, 0.5, 120, 1)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(FALSE, 730, 0.1, 0.5, 120, 1)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(A2, 730, 0.1, 0.5, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(64.44444, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0,  , 0.1, 0.5, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PRICE(0, A2, 0.1, 0.5, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, "730", 0.1, 0.5, 120, 1)' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, A2, 0.1, 0.5, 120, 1)", A2: '="730"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, " ", 0.1, 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, "kikou", 0.1, 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(0, A2, 0.1, 0.5, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, TRUE, 0.1, 0.5, 120, 1)" })).toBeCloseTo(120, 5);
        expect(evaluateCell("A1", { A1: "=PRICE(0, FALSE, 0.1, 0.5, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, A2, 0.1, 0.5, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(120, 5);
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730,  , 0.5, 120, 1)" })).toBeCloseTo(
          53.33333,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, A2, 0.5, 120, 1)" })).toBeCloseTo(
          53.33333,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, "0.1", 0.5, 120, 1)' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, A2, 0.5, 120, 1)", A2: '="0.1"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, " ", 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, "kikou", 0.5, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, A2, 0.5, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, TRUE, 0.5, 120, 1)" })).toBeCloseTo(
          164.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, FALSE, 0.5, 120, 1)" })).toBeCloseTo(
          53.33333,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, A2, 0.5, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(164.44444, 5);
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, , 120, 1)" })).toBeCloseTo(140, 5);
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, A2, 120, 1)" })).toBeCloseTo(140, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, "0.5", 120, 1)' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, A2, 120, 1)", A2: '="0.5"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, " ", 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, "kikou", 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, A2, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, TRUE, 120, 1)" })).toBeCloseTo(
          37.5,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, FALSE, 120, 1)" })).toBeCloseTo(
          140.0,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, A2, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(37.5, 5);
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5,  , 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, A2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, "120", 1)' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, A2, 1)", A2: '="120"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, " ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, "kikou", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, A2, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, TRUE, 1)" })).toBeCloseTo(
          11.55556,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, FALSE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, A2, 1)", A2: "TRUE" })
        ).toBeCloseTo(11.55556, 5);
      });
    });
    describe("on 6th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, "1")' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, A2)", A2: '="1"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, A2)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, TRUE)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, A2)", A2: "TRUE" })
        ).toBeCloseTo(64.44444, 5);
      });
    });

    describe("on 7th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1,  )" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, A2)" })).toBeCloseTo(
          64.44444,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, 1, "0")' })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, A2)", A2: '="0"' })
        ).toBeCloseTo(64.44444, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, 1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=PRICE(0, 730, 0.1, 0.5, 120, 1, "kikou")' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, A2)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, TRUE)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, FALSE)" })).toBeCloseTo(
          64.44444,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=PRICE(0, 730, 0.1, 0.5, 120, 1, A2)", A2: "TRUE" })
        ).toBeCloseTo(64.44444, 5);
      });
    });
  });
});

describe("RATE function", () => {
  test("take 3-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=RATE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RATE(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RATE(1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1)" })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0)" })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0, 0)" })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0, 0, 0.1)" })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0, 0, 0.1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number_of_periods is > 0", () => {
    expect(evaluateCell("A1", { A1: "=RATE(-1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1)" })).toBeCloseTo(0);
  });

  test("There is both positive and negative values in the arguments", () => {
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, -1, -1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, 0, -1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, -1, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("rate_guess is > -1", () => {
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0, 0, -2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=RATE(1, 1, -1, 0, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("rate_guess is RATE_GUESS_DEFAULT and not 0 if referencing an empty cell or is set to 0", () => {
    // would not converge and return error if rate_guess 0 was used in the evaluation
    expect(evaluateCell("A1", { A1: "=RATE(100, 100, -1000, 0, 0, B1)" })).toBeCloseTo(0.099992743);
    expect(evaluateCell("A1", { A1: "=RATE(100, 100, -1000, 0, 0, 0)" })).toBeCloseTo(0.099992743);
  });

  test.each([
    [7, -250, 800, 0, 0, 0.1, 0.245159804],
    [6, 12, -200, 0, 0, 0.23, -0.231684326],
    [100, 100, -1000, 0, 0, 0.1, 0.099992739],
    [3, -16, 56, 20, 0, 0.1, -0.432602703],
    [9, -58, 56000, 40, 0, 0.1, -0.523735054],
    [12, -15, 600, 0, 1, 0.1, -0.167833761],
    [16, -87, 1978, 100, 1, 0.1, -0.056513459],
    [6, -1, 5, 0, 1, 0.1, 0.079308261],
    [12, 100, -200, -50, 1, 0.1, -0.666664576],
    [12, 100, -200, -50, 1, -0.1, -0.666664576],
    [12, 100, -200, -50, 1, 0.8, -0.666664576],
    [12, 100, -200, -50, 1, 0.9, 0.999387626],
    [12, 100, -200, -50, 1, 1.56, 0.999387626],
    [12, 100, -200, -50, 1, 20, 0.999387626],
  ])(
    "function result =RATE(%s, %s, %s, %s, %s, %s)",
    (
      nPeriods: number,
      payment: number,
      presentValue: number,
      futureValue: number,
      endStart: number,
      guess: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=RATE(${nPeriods}, ${payment}, ${presentValue}, ${futureValue}, ${endStart}, ${guess})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return formatted value", () => {
    expect(evaluateCellFormat("A1", { A1: "=RATE(1, 1, -1)" })).toBe("0%");
  });
});

describe("YIELD formula", () => {
  test("take at 6 or 7 arguments", () => {
    expect(evaluateCell("A1", { A1: "=YIELD(0, 365, 0.05, 90, 120)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELD(0, 365, 0.05, 90, 120, 1)" })).toBeCloseTo(0.38889, 5);
    expect(evaluateCell("A1", { A1: "=YIELD(0, 365, 0.05, 90, 120, 1, 0)" })).toBeCloseTo(
      0.38889,
      5
    );
    expect(evaluateCell("A1", { A1: "=YIELD(0, 365, 0.05, 90, 120, 1, 0, 42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the YIELD", () => {
      test("basic formula", () => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("1/1/2000", "1/1/2040", 0.05, 90, 120, 1, 0)' })
        ).toBeCloseTo(0.05783, 5);
      });

      test.each([
        ["01/01/1999", 0.0577],
        ["01/01/2015", 0.0615],
      ])("variation on 1st argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD(A2, "1/1/2040", 0.05, 90, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["01/01/2041", 0.0577],
        ["01/01/2010", 0.07871],
      ])("variation on 2nd argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("1/1/2000", A2, 0.05, 90, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 0.16678],
        ["0.02", 0.02696],
        ["2.99", 3.32222],
      ])("variation on 3th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("1/1/2000", "1/1/2040", A2, 90, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["120", 0.04167],
        ["200", 0.0181],
        ["10", 0.5],
      ])("variation on 4th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("1/1/2000", "1/1/2040", 0.05, A2, 120, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["100", 0.05634],
        ["200", 0.0629],
        ["1", 0.04668],
      ])("variation on 5th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("1/1/2000", "1/1/2040", 0.05, 90, A2, 1, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["2", 0.05776],
        ["4", 0.05772],
      ])("variation on 6th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=YIELD("1/1/2000", "1/1/2040", 0.05, 90, 120, A2, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      // test.each([
      //   ["1", 51.54664],
      //   ["2", 51.54664],
      //   ["3", 51.54664],
      //   ["4", 51.54664],
      // ])("variation on 7th argument", (arg, result) => {
      //   expect(evaluateCell("A1", { A1: '=YIELD("1/1/2000", "1/1/2040", 0.05, 90, 1, A2)', A2: arg })).toBeCloseTo(result, 5);
      // })
    });

    test.each([
      ["12/12/2012 23:00", 0.08202],
      ["12/12/2012", 0.08202],
    ])("parameter 1 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=YIELD(A2, "12/12/21", 0.05, 90, 120, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([["12/11/2012"], ["12/12/2012"]])(
      "parameter 2 must be greater than parameter 1",
      (arg) => {
        expect(
          evaluateCell("A1", { A1: '=YIELD("12/12/12", A2, 0.05, 90, 120, 1, 0)', A2: arg })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      }
    );

    test.each([
      ["12/12/2021 23:00", 0.08202],
      ["12/12/2021", 0.08202],
    ])("parameter 2 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", A2, 0.05, 90, 120, 1, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test("parameter 3 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", -0.1, 90, 120, 1, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0, 90, 120, 1, 0)' })
      ).toBeCloseTo(0.03248, 5);
    });

    test("parameter 4 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 0, 120, 1, 0)' })).toBe(
        "#ERROR"
      ); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 1, 120, 1, 0)' })
      ).toBeCloseTo(5.00006, 5);
    });

    test("parameter 5 must be greater than 0", () => {
      expect(evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 0, 1, 0)' })).toBe(
        "#ERROR"
      ); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 1, 1, 0)' })
      ).toBeCloseTo(-0.11487, 5);
    });

    test.each([
      ["0", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["1", 0.08202],
      ["2", 0.08139],
      ["3", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["4", 0.08107],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 6 must be one of '1' '2' '4'", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 120, A2, 0)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["1.9", 0.08202],
      ["2.9", 0.08139],
    ])("parameter 6 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 120, A2, 0)', A2: arg })
      ).toBeCloseTo(result, 5);
    });

    test.each([
      ["-1", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["0", 0.08202],
      ["4", 0.08202],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 7 must be between 0 and 4", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 120, 1, A2)', A2: arg })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });

    test.each([
      ["0", 0.08202],
      ["0.9", 0.08202],
    ])("parameter 7 is truncated", (arg, result) => {
      expect(
        evaluateCell("A1", { A1: '=YIELD("12/12/12", "12/12/21", 0.05, 90, 120, 1, A2)', A2: arg })
      ).toBeCloseTo(result, 5);
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD( , 730, 0.1, 90, 120, 1)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(A2, 730, 0.1, 90, 120, 1)" })).toBeCloseTo(
          0.25869,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD("0", 730, 0.1, 90, 120, 1)' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(A2, 730, 0.1, 90, 120, 1)", A2: '="0"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(" ", 730, 0.1, 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD("kikou", 730, 0.1, 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(A2, 730, 0.1, 90, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(TRUE, 730, 0.1, 90, 120, 1)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(FALSE, 730, 0.1, 90, 120, 1)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(A2, 730, 0.1, 90, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(0.25869, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0,  , 0.1, 90, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELD(0, A2, 0.1, 90, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, "730", 0.1, 90, 120, 1)' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, A2, 0.1, 90, 120, 1)", A2: '="730"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, " ", 0.1, 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, "kikou", 0.1, 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(0, A2, 0.1, 90, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, TRUE, 0.1, 90, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(evaluateCell("A1", { A1: "=YIELD(0, FALSE, 0.1, 90, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(evaluateCell("A1", { A1: "=YIELD(0, A2, 0.1, 90, 120, 1)", A2: "TRUE" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #NUM!;
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730,  , 90, 120, 1)" })).toBeCloseTo(0.1547, 5);
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, A2, 90, 120, 1)" })).toBeCloseTo(0.1547, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, "0.1", 90, 120, 1)' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, A2, 90, 120, 1)", A2: '="0.1"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, " ", 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, "kikou", 90, 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, A2, 90, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, TRUE, 90, 120, 1)" })).toBeCloseTo(
          1.2148,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, FALSE, 90, 120, 1)" })).toBeCloseTo(
          0.1547,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, A2, 90, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(1.2148, 5);
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, , 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, A2, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, "90", 120, 1)' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, A2, 120, 1)", A2: '="90"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, " ", 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, "kikou", 120, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, A2, 120, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, TRUE, 120, 1)" })).toBeCloseTo(
          -8.4499,
          5
        ); // @compatibility: on google sheets return 16.4499
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, FALSE, 120, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, A2, 120, 1)", A2: "TRUE" })
        ).toBeCloseTo(-8.4499, 5); // @compatibility: on google sheets return 16.4499
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90,  , 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, A2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, "120", 1)' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, A2, 1)", A2: '="120"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, " ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, "kikou", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, A2, 1)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, TRUE, 1)" })).toBeCloseTo(
          -0.59045,
          5
        ); // @compatibility: on google sheets return -1.29843
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, FALSE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, A2, 1)", A2: "TRUE" })
        ).toBeCloseTo(-0.59045, 5); // @compatibility: on google sheets return -1.29843
      });
    });
    describe("on 6th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, "1")' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, A2)", A2: '="1"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, A2)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, TRUE)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, FALSE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, A2)", A2: "TRUE" })
        ).toBeCloseTo(0.25869, 5);
      });
    });

    describe("on 7th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1,  )" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, A2)" })).toBeCloseTo(
          0.25869,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, 1, "0")' })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, A2)", A2: '="0"' })
        ).toBeCloseTo(0.25869, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, 1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELD(0, 730, 0.1, 90, 120, 1, "kikou")' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, A2)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, TRUE)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, FALSE)" })).toBeCloseTo(
          0.25869,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELD(0, 730, 0.1, 90, 120, 1, A2)", A2: "TRUE" })
        ).toBeCloseTo(0.25869, 5);
      });
    });
  });
});

describe("YIELDMAT formula", () => {
  test("take at 6 or 7 arguments", () => {
    expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.05)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.05, 150)" })).toBeCloseTo(
      -0.29727,
      5
    );
    expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.05, 150, 0)" })).toBeCloseTo(
      -0.29727,
      5
    );
    expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.05, 150, 0, 42)" })).toBe(
      "#BAD_EXPR"
    ); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the YIELDMAT", () => {
      test("basic formula", () => {
        expect(
          evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, 120, 0)' })
        ).toBeCloseTo(0.02549, 5);
      });

      test.each([
        ["03/03/2003", 0.03281],
        ["06/06/2006", 0.02895],
      ])("variation on 1st argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=YIELDMAT(A2, "1/1/2040", "1/1/2000", 0.05, 120, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["01/01/2041", 0.02562],
        ["01/01/2041", 0.02562],
      ])("variation on 2nd argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", A2, "1/1/2000", 0.05, 120, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["05/05/2005", 0.03024],
        ["06/06/2006", 0.03144],
      ])("variation on 3th argument", (arg, result) => {
        expect(
          evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", A2, 0.05, 120, 0)', A2: arg })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["0.15", 0.05309],
        ["0.02", 0.00952],
        ["2.99", 0.09593],
      ])("variation on 4th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", A2, 120, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["100", 0.03333],
        ["200", 0.00667],
        ["1", 0.16275],
      ])("variation on 5th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, A2, 0)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });

      test.each([
        ["1", 0.02549],
        ["2", 0.02544],
        ["3", 0.02549],
        ["4", 0.02549],
      ])("variation on 6th argument", (arg, result) => {
        expect(
          evaluateCell("A1", {
            A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, 120, A2)',
            A2: arg,
          })
        ).toBeCloseTo(result, 5);
      });
    });

    test("parameter 1 must be greater than or equal parameter 3", () => {
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("12/31/1999", "1/1/2040", "1/1/2000", 0.05, 120, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2000", "1/1/2040", "1/1/2000", 0.05, 120, 0)' })
      ).toBeCloseTo(0.0375, 5);
    });

    test("parameter 1 is truncated", () => {
      expect(
        evaluateCell("A1", {
          A1: '=YIELDMAT("1/1/2010 12:00", "1/1/2040", "1/1/2000", 0.05, 120, 0)',
        })
      ).toBeCloseTo(0.02549, 5);
    });

    test("parameter 2 must be greater than parameter 1", () => {
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2010", "1/1/2000", 0.05, 120, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/2/2010", "1/1/2000", 0.05, 120, 0)' })
      ).toBeCloseTo(-42.32353, 5);
    });

    test("parameter 2 is truncated", () => {
      expect(
        evaluateCell("A1", {
          A1: '=YIELDMAT("1/1/2010", "1/1/2040 12:00", "1/1/2000", 0.05, 120, 0)',
        })
      ).toBeCloseTo(0.02549, 5);
    });

    test("parameter 3 is truncated", () => {
      expect(
        evaluateCell("A1", {
          A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000 12:00", 0.05, 120, 0)',
        })
      ).toBeCloseTo(0.02549, 5);
    });

    test("parameter 4 must be greater than or equal 0", () => {
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", -0.1, 120, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0, 120, 0)' })
      ).toBeCloseTo(-0.00556, 5);
    });

    test("parameter 5 must be greater than 0", () => {
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, 0, 0)' })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, 1, 0)' })
      ).toBeCloseTo(0.16275, 5);
    });

    test.each([
      ["-1", "#ERROR"], // @compatibility: on google sheets, return #NUM!
      ["0", 0.02549],
      ["4", 0.02549],
      ["5", "#ERROR"], // @compatibility: on google sheets, return #NUM!
    ])("parameter 6 must be between 0 and 4", (arg, result) => {
      const expectedValue = expect(
        evaluateCell("A1", {
          A1: '=YIELDMAT("1/1/2010", "1/1/2040", "1/1/2000", 0.05, 120, A2)',
          A2: arg,
        })
      );
      if (typeof result === "number") {
        expectedValue.toBeCloseTo(result);
      } else {
        expectedValue.toBe(result);
      }
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(, 465, 0, 0.25, 120, 0)" })).toBeCloseTo(
          0.07761,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(A2, 465, 0, 0.25, 120, 0)" })).toBeCloseTo(
          0.07761,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT("100", 465, 0, 0.25, 120, 0)' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(A2, 465, 0, 0.25, 120, 0)", A2: '="100"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(" ", 465, 0, 0.25, 120, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT("kikou", 465, 0, 0.25, 120, 0)' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(A2, 465, 0, 0.25, 120, 0)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(TRUE, 465, 0, 0.25, 120, 0)" })).toBeCloseTo(
          0.07761,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(FALSE, 465, 0, 0.25, 120, 0)" })).toBeCloseTo(
          0.07761,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(A2, 465, 0, 0.25, 120, 0)", A2: "TRUE" })
        ).toBeCloseTo(0.07761, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100,  , 0, 0.25, 120, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, A2, 0, 0.25, 120, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, "465", 0, 0.25, 120, 0)' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, A2, 0, 0.25, 120, 0)", A2: '="465"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, " ", 0, 0.25, 120, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, "kikou", 0, 0.25, 120, 0)' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, A2, 0, 0.25, 120, 0)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, TRUE, 0, 0.25, 120, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, FALSE, 0, 0.25, 120, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!;
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, A2, 0, 0.25, 120, 0)", A2: "TRUE" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #NUM!;
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465,  , 0.25, 120, 0)" })).toBeCloseTo(
          0.03941,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, A2, 0.25, 120, 0)" })).toBeCloseTo(
          0.03941,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, "0", 0.25, 120, 0)' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, A2, 0.25, 120, 0)", A2: '="0"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, " ", 0.25, 120, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, "kikou", 0.25, 120, 0)' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, A2, 0.25, 120, 0)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, TRUE, 0.25, 120, 0)" })).toBeCloseTo(
          0.03941,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, FALSE, 0.25, 120, 0)" })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, A2, 0.25, 120, 0)", A2: "TRUE" })
        ).toBeCloseTo(0.03941, 5);
      });
    });
    describe("on 4th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, , 120, 0)" })).toBeCloseTo(
          -0.16667,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, A2, 120, 0)" })).toBeCloseTo(
          -0.16667,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, "0.25", 120, 0)' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, A2, 120, 0)", A2: '="0.25"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, " ", 120, 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, "kikou", 120, 0)' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, A2, 120, 0)", A2: "coucou" })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, TRUE, 120, 0)" })).toBeCloseTo(
          0.54237,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, FALSE, 120, 0)" })).toBeCloseTo(
          -0.16667,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, A2, 120, 0)", A2: "TRUE" })
        ).toBeCloseTo(0.54237, 5);
      });
    });
    describe("on 5th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25,  , 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, A2, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, "120", 0)' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, A2, 0)", A2: '="120"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, " ", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, "kikou", 0)' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, A2, 0)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, TRUE, 0)" })).toBeCloseTo(
          15.74603,
          5
        ); // @compatibility: on google sheets return -1.29843
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, FALSE, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, A2, 0)", A2: "TRUE" })
        ).toBeCloseTo(15.74603, 5);
      });
    });
    describe("on 6th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120,  )" })).toBeCloseTo(
          0.03941,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, A2)" })).toBeCloseTo(
          0.03941,
          5
        );
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, 120, "0")' })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, A2)", A2: '="0"' })
        ).toBeCloseTo(0.03941, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, 120, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YIELDMAT(100, 465, 0, 0.25, 120, "kikou")' })).toBe(
          "#ERROR"
        ); // @compatibility: on google sheets, return #VALUE!
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, A2)", A2: "coucou" })
        ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, TRUE)" })).toBeCloseTo(
          0.03942,
          5
        );
        expect(evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, FALSE)" })).toBeCloseTo(
          0.03941,
          5
        );
        expect(
          evaluateCell("A1", { A1: "=YIELDMAT(100, 465, 0, 0.25, 120, A2)", A2: "TRUE" })
        ).toBeCloseTo(0.03942, 5);
      });
    });
  });
});
