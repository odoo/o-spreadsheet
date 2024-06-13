import { Model } from "../../src";
import { formatValue } from "../../src/helpers";
import { DEFAULT_LOCALE } from "../../src/types";
import { setCellContent, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import { evaluateCell, evaluateCellFormat, evaluateGrid } from "../test_helpers/helpers";

describe("ACCRINTM formula", () => {
  test("ACCRINTM takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("settlement > issue", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM(1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=ACCRINTM(2, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("issue >=0", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM(-1, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("rate > 0", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("redemption > 0", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("dayCountConvention is between 0 and 4 > 0", () => {
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=ACCRINTM(0, 1, 1, 1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["01/01/2004", "01/01/2006", "5.00%", 1000, 0, 100],
    ["01/01/2005", "06/06/2006", "12.00%", 1000, 0, 171.6666667],
    ["03/12/2004", "02/28/2012", "0.50%", 1000, 0, 39.80555556],
    ["02/29/2020", "01/03/2022", "1.00%", 68, 0, 1.252333333],
    ["01/01/2004", "01/01/2006", "5.00%", 1000, 0, 100],
    ["01/01/2005", "06/06/2006", "12.00%", 1000, 0, 171.6666667],
    ["01/01/2004", "02/28/2012", "0.50%", 1000, 0, 40.79166667],
    ["01/01/2022", "01/03/2022", "1.00%", 68, 0, 0.003777778],
    ["01/01/2004", "05/01/2004", "5.00%", 12, 0, 0.2],
    ["01/01/2004", "01/01/2006", "1.00%", 1, 0, 0.02],
    ["01/01/2004", "01/01/2006", "5.00%", 5, 0, 0.5],
    ["01/01/2004", "06/01/2006", "1.00%", 110, 0, 2.658333333],
    ["01/01/2005", "12/31/2005", "5.00%", 1000, 0, 50],
    ["01/01/2005", "12/31/2005", "5.00%", 1000, 1, 49.8630137],
    ["01/01/2005", "12/31/2005", "5.00%", 1000, 2, 50.55555556],
    ["01/01/2005", "12/31/2005", "5.00%", 1000, 3, 49.8630137],
    ["01/01/2005", "12/31/2005", "5.00%", 1000, 4, 49.86111111],
    ["02/29/2004", "01/01/2007", "5.00%", 1000, 0, 141.8055556],
    ["02/29/2004", "01/01/2007", "5.00%", 1000, 1, 141.9575633],
    ["02/29/2004", "01/01/2007", "5.00%", 1000, 2, 144.0277778],
    ["02/29/2004", "01/01/2007", "5.00%", 1000, 3, 142.0547945],
    ["02/29/2004", "01/01/2007", "5.00%", 1000, 4, 141.9444444],
    ["01/01/2002", "02/28/2007", "5.00%", 1000, 0, 257.9166667],
    ["01/01/2002", "02/28/2007", "5.00%", 1000, 1, 257.9643998],
    ["01/01/2002", "02/28/2007", "5.00%", 1000, 2, 261.6666667],
    ["01/01/2002", "02/28/2007", "5.00%", 1000, 3, 258.0821918],
    ["01/01/2002", "02/28/2007", "5.00%", 1000, 4, 257.9166667],
  ])(
    "function result =ACCRINTM(%s, %s, %s, %s, %s)",
    (
      issue: string,
      maturity: string,
      rate: string,
      redemption: number,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=ACCRINTM("${issue}", "${maturity}", ${rate}, ${redemption}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("AMORLINC formula", () => {
  test("AMORLINC takes 6-7 arguments", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0.1)" })).toBe(0.1);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0.1, 0)" })).toBe(0.1);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0.1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cost > 0", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(-1, 0, 0, 0, 0, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=AMORLINC(0, 0, 0, 0, 0, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("purchase date <= first period date", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 2, 1, 0, 0, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("purchaseDate >= 0 ", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, -1, 0, 0, 0, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });
  test("salvage >= 0", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, -1, 0, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("period >= 0", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, -1, 0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("period are truncated if > 1, and rounded to 1 if < 1", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 0, 0.8, 0)" })).toBeCloseTo(2.2222);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 0.5, 0.8, 0)" })).toBeCloseTo(800);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 0.9, 0.8, 0)" })).toBeCloseTo(800);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 1.6, 0.8, 0)" })).toBeCloseTo(800);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 2, 0.8, 0)" })).toBeCloseTo(197.7777);
    expect(evaluateCell("A1", { A1: "=AMORLINC(1000, 1, 2, 0, 2.5, 0.8, 0)" })).toBeCloseTo(
      197.7777
    );
  });

  test("rate > 0", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, -0.1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("dayCountConvention is between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0.1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=AMORLINC(1, 0, 0, 0, 0, 0.1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    /* @compatibility
     * Two compatibilities issues here :
     *  1) as explained in the comments of AMORLINC implementation, the first period is handled differently if purchaseDate === firstPeriodEnd
     *  2) for whatever reason, dayCountConvention = 2 isn't implemented for this function in Excel.
     * */
    [1000, "1/1/2020", "2/1/2020", 100, 0, 0.2, 0, 16.66666667],
    [1000, "1/1/2020", "2/1/2020", 100, 1, 0.2, 0, 200],
    [1000, "1/1/2020", "2/1/2020", 100, 2, 0.2, 0, 200],
    [1000, "1/1/2020", "2/1/2020", 100, 3, 0.2, 0, 200],
    [1000, "1/1/2020", "2/1/2020", 100, 4, 0.2, 0, 200],
    [1000, "1/1/2020", "2/1/2020", 100, 5, 0.2, 0, 83.33333333],
    [1000, "1/1/2020", "2/1/2020", 100, 6, 0.2, 0, 0],
    [1000, "2/2/2020", "5/4/2020", 0, 0, 1.5, 0, 383.3333333],
    [1000, "2/2/2020", "5/4/2020", 0, 1, 1.5, 0, 616.6666667],
    [200, "5/31/2020", "5/31/2020", 20, 0, 0.5, 0, 100], // @compatibility: on google sheets, return 0
    [200, "5/31/2020", "5/31/2020", 20, 1, 0.5, 0, 80], // @compatibility: on google sheets, return 100
    [550, "2/29/2020", "2/29/2020", 0, 0, 0.2, 0, 110], // @compatibility: on google sheets, return 110
    [550, "2/29/2020", "2/29/2020", 0, 1, 0.2, 0, 110],
    [200, "2/29/2020", "2/29/2020", 150, 0, 0.5, 0, 50], // @compatibility: on google sheets, return 0
    [200, "2/29/2020", "2/29/2020", 150, 1, 0.5, 0, 0], // @compatibility: on google sheets, return 50
    [250, "12/30/2020", "3/3/2021", 0, 0, 0.01, 0, 0.4375],
    [250, "12/30/2020", "3/3/2021", 0, 1, 0.01, 0, 2.5],
    [1500, "1/31/2020", "2/29/2020", 12, 0, 0.1, 0, 12.08333333],
    [1500, "1/31/2020", "2/29/2020", 12, 0, 0.1, 1, 11.8852459],
    [1500, "1/31/2020", "2/29/2020", 12, 0, 0.1, 2, 12.08333333], // @compatibility: throw error in Excel
    [1500, "1/31/2020", "2/29/2020", 12, 0, 0.1, 3, 11.91780822],
    [1500, "1/31/2020", "2/29/2020", 12, 0, 0.1, 4, 12.08333333],
    [800, "2/28/2019", "6/30/2019", 0, 0, 0.1, 0, 26.66666667],
    [800, "2/28/2019", "4364600.00%", 0, 0, 0.1, 1, 26.73972603],
    [800, "2/28/2019", "6/30/2019", 0, 0, 0.1, 2, 27.11111111], // @compatibility: throw error in Excel
    [800, "2/28/2019", "6/30/2019", 0, 0, 0.1, 3, 26.73972603],
    [800, "2/28/2019", "6/30/2019", 0, 0, 0.1, 4, 27.11111111],
    [500, "1/28/2020", "2/28/2020", 0, 0, 0.1, 0, 4.166666667],
    [500, "1/28/2020", "2/28/2020", 0, 0, 0.1, 1, 4.234972678],
    [500, "1/28/2020", "2/28/2020", 0, 0, 0.1, 2, 4.305555556], // @compatibility: throw error in Excel
    [500, "1/28/2020", "2/28/2020", 0, 0, 0.1, 3, 4.246575342],
    [500, "1/28/2020", "2/28/2020", 0, 0, 0.1, 4, 4.166666667],
  ])(
    "function result =AMORLINC(%s, %s, %s, %s, %s, %s, %s)",
    (
      cost: number,
      purchaseDate: string,
      firstPeriodEnd: string,
      salvage: number,
      period: number,
      rate: number,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=AMORLINC(${cost}, "${purchaseDate}", "${firstPeriodEnd}", ${salvage}, ${period}, ${rate}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

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
        expect(formatValue(cellValue, { format: "mm/dd/yyyy", locale: DEFAULT_LOCALE })).toEqual(
          expectedResult
        );
      }
    );

    test("return formatted value", () => {
      expect(evaluateCellFormat("A1", { A1: "=COUPPCD(0, 100, 1, 1)" })).toBe("m/d/yyyy");
    });

    test("Return format is locale dependant", () => {
      const model = Model.BuildSync();
      updateLocale(model, FR_LOCALE);
      setCellContent(model, "A1", "=COUPPCD(0, 100, 1, 1)");
      expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
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
        expect(formatValue(cellValue, { format: "mm/dd/yyyy", locale: DEFAULT_LOCALE })).toEqual(
          expectedResult
        );
      }
    );

    test("return formatted value", () => {
      expect(evaluateCellFormat("A1", { A1: "=COUPNCD(0, 100, 1, 1)" })).toBe("m/d/yyyy");
    });

    test("Return format is locale dependant", () => {
      const model = Model.BuildSync();
      updateLocale(model, FR_LOCALE);
      setCellContent(model, "A1", "=COUPNCD(0, 100, 1, 1)");
      expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
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

describe("CUMIPMT formula", () => {
  test("CUMIPMT takes 5-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, 1)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, 1, 0)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("rate > 0 ", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT(-1, 1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(0, 1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("number of periods > 0", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, -1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 0, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("present value > 0", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, -1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("first period > 0 and first period <= last period ", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("last period > 0 and last period <= number of periods", () => {
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMIPMT(1, 1, 1, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["5%", 12, 200, 1, 10, 0, -67.60856889],
    ["2.50%", 6, 1000, 2, 5, 0, -59.8717783],
    ["10.00%", 4, 1000, 2, 3, 0, -133.2040509],
    ["12.00%", 2, 1000, 1, 2, 0, -183.3962264],
    ["1.00%", 6, 18, 4, 6, 0, -0.18329231],
    ["2.00%", 4, 100, 1, 4, 1, -2.98970693],
    ["3.00%", 6, 200, 1, 6, 0, -21.51700054],
    ["4.00%", 4, 102, 1, 4, 0, -10.39993851],
    ["5%", 12, 200, 1, 10, 1, -54.86530371],
    ["2.50%", 6, 1000, 2, 6, 1, -62.73153792],
    ["10.00%", 4, 1000, 1, 4, 1, -147.1665589],
    ["12.00%", 2, 1000, 1, 2, 1, -56.60377358],
    ["5%", 12, 200, 1, 10, 1, -54.86530371],
    ["2.50%", 6, 1000, 2, 6, 1, -62.73153792],
    ["10.00%", 4, 1000, 1, 4, 1, -147.1665589],
    ["12.00%", 2, 1000, 1, 2, 1, -56.60377358],
  ])(
    "function result =CUMIPMT(%s, %s, %s, %s, %s, %s)",
    (
      rate: string,
      nOfPeriods: number,
      presentValue: number,
      firstPeriod: number,
      lastPeriod: number,
      endOrBeginning: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=CUMIPMT(${rate}, ${nOfPeriods}, ${presentValue}, ${firstPeriod}, ${lastPeriod}, ${endOrBeginning})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("CUMPRINC formula", () => {
  test("CUMPRINC takes 5-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, 1)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, 1, 0)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("rate > 0 ", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC(-1, 1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(0, 1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("number of periods > 0", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, -1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 0, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("present value > 0", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, -1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("first period > 0 and first period <= last period ", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 2, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("last period > 0 and last period <= number of periods", () => {
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CUMPRINC(1, 1, 1, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["5%", 12, 200, 1, 10, 0, -158.0422511],
    ["2.50%", 6, 1000, 2, 5, 0, -666.328106],
    ["10.00%", 4, 1000, 2, 3, 0, -497.7375566],
    ["12.00%", 2, 1000, 1, 2, 0, -1000],
    ["1.00%", 6, 18, 4, 6, 0, -9.134319493],
    ["2.00%", 4, 100, 1, 4, 1, -100],
    ["3.00%", 6, 200, 1, 6, 0, -200],
    ["4.00%", 4, 102, 1, 4, 0, -102],
    ["5%", 12, 200, 1, 10, 0, -158.0422511],
    ["2.50%", 6, 1000, 2, 6, 0, -843.4500289],
    ["10.00%", 4, 1000, 1, 4, 0, -1000],
    ["12.00%", 2, 1000, 1, 2, 0, -1000],
    ["5%", 12, 200, 1, 10, 1, -160.0402392],
    ["2.50%", 6, 1000, 2, 6, 1, -822.878077],
    ["10.00%", 4, 1000, 1, 4, 1, -1000],
    ["12.00%", 2, 1000, 1, 2, 1, -1000],
  ])(
    "function result =CUMPRINC(%s, %s, %s, %s, %s, %s)",
    (
      rate: string,
      numberOfPeriods: number,
      presentValue: number,
      firstPeriod: number,
      lastPeriod: number,
      beginningOrEnd: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=CUMPRINC(${rate}, ${numberOfPeriods}, ${presentValue}, ${firstPeriod}, ${lastPeriod}, ${beginningOrEnd})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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
      expect(evaluateCell("A1", { A1: "=DB(0, 10, 10, 2)" })).toBeCloseTo(0, 5); // @compatibility: on google sheets, return #NUM!
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
        expect(evaluateCell("A1", { A1: "=DB( , 10, 10, 2)" })).toBe(0); // @compatibility: on google sheets, return #NUM!
        expect(evaluateCell("A1", { A1: "=DB(A2, 10, 10, 2)" })).toBe(0); // @compatibility: on google sheets, return #NUM!
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
        expect(evaluateCell("A1", { A1: "=DB(FALSE, 2, 2, 1)" })).toBe(0); // @compatibility: on google sheets, return #NUM!
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

describe("DDB formula", () => {
  test("DDB takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DDB()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DDB(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DDB(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1, 2, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cost is >= 0", () => {
    expect(evaluateCell("A1", { A1: "=DDB(-1, 1, 1, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1, 2)" })).toBe(0); // @compatibility: on google sheets, return #NUM!
  });

  test("salvage is >= 0", () => {
    expect(evaluateCell("A1", { A1: "=DDB(0, -1, 1, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 0, 1, 1, 2)" })).toBe(0);
  });

  test("life is > 0", () => {
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, -1, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 0, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("period is > 0 and < life", () => {
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, -1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 0, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 2, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("factor is > 0", () => {
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DDB(0, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [1000, 200, 12, 1, 2, 166.6666667],
    [1000, 200, 12, 2, 2, 138.8888889],
    [1000, 500, 12, 3, 2, 115.7407407],
    [1000, 200, 12, 4, 2, 96.45061728],
    [1000, 200, 12, 5, 2, 80.3755144],
    [1000, 200, 12, 6, 2, 66.97959534],
    [1000, 200, 12, 7, 2, 55.81632945],
    [1000, 200, 12, 8, 2, 46.51360787],
    [1000, 200, 12, 9, 2, 32.56803936],
    [1000, 200, 12, 10, 2, 0],
    [1000, 200, 12, 11, 2, 0],
    [1000, 200, 12, 12, 2, 0],
    [1000.5, 50, 5, 2, 2, 240.12], //decimal cost
    [1000, 50.56, 5, 2, 2, 240], // decimal salvage
    [28, 30, 9, 2, 2, 0],
    [12, 5, 8, 8, 2, 0],
    [120, 5, 5, 1, 2, 48],
    [1000.5, 50, 5, 2, 4, 150.1],
    [1000, 50, 5, 2, 6, 0],
    [28, 5, 9, 2, 1, 2.765432099],
    [12, 12, 8, 2, 3, 0],
    [120, 5, 15, 2, 10, 26.66666667],
    [0, 200, 12, 1, 2, 0], // cost = 0
    [1000, 0, 12, 1, 2, 166.6666667], // salvage = 0
    [1000, 200, 12, 1, 13, 800], // factor/life > 1
    [300, 50, 12, 1, 50, 250], // factor/life > 1
    [300, 320, 12, 1, 2, 0], // salvage > cost
    [100, 200, 10, 2, 2, 0], // salvage > cost
  ])(
    "function result =DDB(%s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      period: number,
      factor: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=DDB(${cost}, ${salvage}, ${life}, ${period}, ${factor})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1000, 200, 12, 0.2, 2, 166.6666667],
    [1000, 200, 12, 0.6, 2, 166.6666667],
    [1000, 200, 12, 1, 2, 166.6666667],
    [1000, 200, 12, 1.5, 2, 152.1451549],
    [1000, 200, 12, 1.7, 2, 146.6972178],
    [1000, 200, 12, 1.9, 2, 141.4443578],
    [1000, 200, 12, 9.5, 2, 12.30460219],
    [1000, 200, 12, 10.2, 2, 0],
  ])(
    "function result for decimal periods =DDB(%s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      period: number,
      factor: number,
      expectedResult: number
    ) => {
      // @compatibility : decimals periods are truncated in google sheet, except in the first and last deprecation. They
      // are supported in Excel/Calc.
      const cellValue = evaluateCell("A1", {
        A1: `=DDB(${cost}, ${salvage}, ${life}, ${period}, ${factor})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=DDB(0, 1, 1, 1)" })).toBe("#,##0.00");
  });
});

describe("DISC formula", () => {
  test("DISC takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DISC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DISC(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DISC(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("maturity date > settlement date", () => {
    expect(evaluateCell("A1", { A1: "=DISC(1, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DISC(2, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("price is > 0", () => {
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, -1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("redemption is > 0", () => {
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, -1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("dayCountConvention is between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DISC(0, 1, 1, 1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["01/01/2012", "01/01/2014", 100, 200, 2, 0.24623803],
    ["01/01/2012", "05/01/2016", 100, 100, 2, 0],
    ["01/01/2012", "05/01/2016", 60, 100, 2, 0.09102402],
    ["12/20/2014", "05/01/2016", 1, 68, 2, 0.712260808],
    ["12/20/2014", "05/01/2016", 50, 60, 2, 0.120481928],
    ["01/30/2013", "05/31/2016", 5, 6, 2, 0.049301561],
    ["12/30/2014", "05/31/2016", 50, 5, 2, -6.254826255],
    ["12/30/2014", "05/31/2016", 200, 110, 2, -0.568620569],
    ["12/30/2014", "05/31/2016", 347, 1, 2, -240.4633205],
    ["12/30/2009", "05/31/2023", 12, 1, 2, -0.808163265],
    ["12/31/2012", "05/01/2016", 100, 68, 0, -0.141058921],
    ["12/31/2012", "05/01/2016", 100, 68, 1, -0.141292474],
    ["12/31/2012", "05/01/2016", 100, 68, 2, -0.139204408],
    ["12/31/2012", "05/01/2016", 100, 68, 3, -0.141137803],
    ["12/31/2012", "05/01/2016", 100, 68, 4, -0.141058921],
    ["02/29/2012", "01/31/2013", 500, 1000, 0, 0.543806647],
    ["02/29/2012", "01/01/2013", 500, 1000, 1, 0.596091205],
    ["02/29/2012", "01/01/2013", 500, 1000, 2, 0.586319218],
    ["02/29/2012", "01/01/2013", 500, 1000, 3, 0.594462541],
    ["02/29/2012", "01/01/2013", 500, 1000, 4, 0.59602649],
    ["02/28/2011", "02/28/2012", 500, 1000, 0, 0.502793296],
    ["02/28/2011", "02/28/2012", 500, 1000, 1, 0.5],
    ["02/28/2011", "02/28/2012", 500, 1000, 2, 0.493150685],
    ["02/28/2011", "02/28/2012", 500, 1000, 3, 0.5],
    ["02/28/2011", "02/28/2012", 500, 1000, 4, 0.5],
  ])(
    "function result =DISC(%s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      price: number,
      redemption: number,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=DISC("${settlement}", "${maturity}", ${price}, ${redemption}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("DOLLARFR formula", () => {
  test("DOLLARFR takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DOLLARFR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DOLLARFR(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DOLLARFR(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=DOLLARFR(1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("unit must be strictly positive", () => {
    expect(evaluateCell("A1", { A1: "=DOLLARFR(1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DOLLARFR(1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [10, 8, 10],
    [15.9, 32, 15.288],
    [100.1, 32, 100.032],
    [69.1, 9, 69.09],
    [-10.9, 9, -10.81],
    [-10.85, 9, -10.765],
    [-10.7, 9, -10.63],
    [-10.7, 9.68, -10.63],
    [589.99, 105, 589.10395],
    [0.99, 256, 0.25344],
  ])(
    "function result =DOLLARFR(%s, %s)",
    (decimalPrice: number, unit: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=DOLLARFR(${decimalPrice}, ${unit})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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

describe("DOLLARDE formula", () => {
  test("DOLLARDE takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DOLLARDE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DOLLARDE(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DOLLARDE(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=DOLLARDE(1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("unit must be strictly positive", () => {
    expect(evaluateCell("A1", { A1: "=DOLLARDE(1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=DOLLARDE(1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [10, 8, 10],
    [15.9, 32, 17.8125],
    [100.1, 32, 100.3125],
    [69.1, 9, 69.11111111],
    [-10.9, 9, -11],
    [-10.85, 9, -10.94444444],
    [-10.7, 9, -10.77777778],
    [-10.7, 9.68, -10.77777778],
    [589.99, 101, 598.8019802],
  ])(
    "function result =DOLLARDE(%s, %s)",
    (fractionalPrice: number, unit: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=DOLLARDE(${fractionalPrice}, ${unit})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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

describe("FVSCHEDULE formula", () => {
  test("FVSCHEDULE takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=FVSCHEDULE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FVSCHEDULE(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FVSCHEDULE(1, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=FVSCHEDULE(1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test.each([
    [100, [0.05, 0.05, 0.05, 0.05, 0.05], 127.6282],
    [100, [0.05, 0.04, 0.03, 0.02, 0.01], 115.8727752],
    [200, [-0.03, -0.05, -0.1, -0.1, -0.09], 135.84753],
    [-800, [0.09, -0.1, 0.11, -0.12, 1.56], -1962.477158],
    [-800, [0.09, 0, 0, 0, 1.56], -2232.32],
  ])(
    "function result =FVSCHEDULE(%s, %s)",
    (principal: number, schedule: number[], expectedResult: number) => {
      const grid = {
        B1: schedule[0].toString(),
        B2: schedule[1].toString(),
        B3: schedule[2].toString(),
        B4: schedule[3].toString(),
        B5: schedule[4].toString(),
      };
      const cellValue = evaluateCell("A1", { ...grid, A1: `=FVSCHEDULE(${principal}, B1:B5)` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("with empty cells in the range", () => {
    const grid = { B1: "0.09", B3: "0.11", B5: "1.56" };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=FVSCHEDULE(100, B1:B5)` });
    expect(cellValue).toBeCloseTo(309.7344, 4);

    const grid2 = { B3: "0.09", B4: "0.11", B5: "1.56" };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=FVSCHEDULE(100, B1:B5)` });
    expect(cellValue2).toBeCloseTo(309.7344, 4);

    const grid3 = { B1: "0.09", B2: "0.11", B3: "1.56" };
    const cellValue3 = evaluateCell("A1", { ...grid3, A1: `=FVSCHEDULE(100, B1:B5)` });
    expect(cellValue3).toBeCloseTo(309.7344, 4);
  });

  test("try to cast values to numbers", () => {
    const grid = { B1: '=CONCAT("5", "3")', B2: "FALSE", B3: "TRUE" };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=FVSCHEDULE(100, B1:B3)` });

    const grid2 = { B1: "53", B2: "0", B3: "1" };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=FVSCHEDULE(100, B1:B3)` });

    expect(cellValue).toEqual(cellValue2);
  });

  test("return error if there's a cell that cannot be cast to a number in the range", () => {
    const grid = { B1: "0.09", B2: "0.11", B3: "Patate" };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=FVSCHEDULE(100, B1:B3)` });
    expect(cellValue).toBe("#ERROR");
  });

  test("can take single value as argument", () => {
    expect(evaluateCell("A1", { A1: `=FVSCHEDULE(100, 0.5)` })).toBeCloseTo(150, 4);
    expect(evaluateCell("A1", { A1: `=FVSCHEDULE(100, A2)`, A2: "0.1" })).toBeCloseTo(110, 4);
  });

  test("can take multi-dimensional arrays as argument", () => {
    const schedule = [0.05, 0.04, 0.03, 0.02, 0.01];
    const grid = {
      B1: schedule[0].toString(),
      B2: schedule[1].toString(),
      B3: schedule[2].toString(),
      C1: schedule[3].toString(),
      C2: schedule[4].toString(),
    };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=FVSCHEDULE(100, B1:C3)` });
    expect(cellValue).toBeCloseTo(115.8727752, 4);

    const grid2 = {
      B1: schedule[0].toString(),
      C1: schedule[1].toString(),
      D1: schedule[2].toString(),
      B2: schedule[3].toString(),
      C2: schedule[4].toString(),
    };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=FVSCHEDULE(100, B1:D2)` });
    expect(cellValue2).toBeCloseTo(115.8727752, 4);
  });
});

describe("IPMT formula", () => {
  test("IPMT takes 4-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=IPMT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IPMT(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1, 0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number_of_periods is > 0", () => {
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, -1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1)" })).toBe(0);
  });

  test("period is > 0 and < number_of_periods", () => {
    expect(evaluateCell("A1", { A1: "=IPMT(0, -1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=IPMT(0, 0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=IPMT(0, 1, 1, -1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=IPMT(0, 2, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test.each([
    ["5%", 1, 12, 200, 0, 0, -10],
    ["5%", 1, 12, 0, 0, 0, 0],
    ["5%", 1, 12, 0, 100, 0, 0],
    ["2.50%", 3, 6, 1000, 0, 0, -17.07465771],
    ["-10.00%", 2, 4, 1000, -50, 0, 72.37569061],
    ["12.00%", 1, 2, 1000, 500, 0, -120],
    ["0.00%", 6, 6, 18, 15, 0, 0],
    ["0.00%", 2, 4, 100, 100, 1, 0],
    ["0.00%", 6, 6, 200, -20, 0, 0],
    ["0.00%", 2, 4, -200, 100, 0, 0],
    ["2.50%", 1, 6, -200, 200, 0, 5],
    ["2.50%", 2, 4, 100, 0, 1, -1.851663713],
    ["2.50%", 2, 4, 100, 0, 0, -1.897955306],
    ["2.50%", 2.5, 4, 100, 0, 0, -1.591312089],
    ["5%", 1, 12, 200, 0, 1, 0],
    ["2.50%", 3, 6, 1000, 0, 1, -16.65820265],
    ["-10.00%", 2, 4, 1000, -50, 1, 80.41743401],
    ["12.00%", 1, 2, 1000, 500, 1, 0],
  ])(
    "function result =IPMT(%s, %s, %s, %s, %s, %s)",
    (
      rate: string,
      period: number,
      numberOfPeriods: number,
      presentValue: number,
      futureValue: number,
      enfOrBeginning: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=IPMT(${rate}, ${period}, ${numberOfPeriods}, ${presentValue}, ${futureValue}, ${enfOrBeginning})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=IPMT(0, 1, 1, -1)" })).toBe("#,##0.00");
  });
});

describe("INTRATE formula", () => {
  test("INTRATE takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=INTRATE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=INTRATE(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("settlement should be < than maturity", () => {
    expect(evaluateCell("A1", { A1: "=INTRATE(1, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=INTRATE(2, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("investment should be > 0", () => {
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, -1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("redemption should be > 0", () => {
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, -1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("dayCountConvention should be between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=INTRATE(0, 1, 1, 1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["01/01/2004", "01/01/2006", 100, 50, 0, -0.25],
    ["01/01/2005", "06/06/2006", 10, 400, 0, 27.26213592],
    ["03/12/2004", "02/28/2012", 400, 105, 0, -0.092637823],
    ["02/29/2020", "01/03/2022", 59, 15, 0, -0.404939029],
    ["01/01/2004", "01/01/2006", 59.8, 15.9, 0, -0.367056856],
    ["01/01/2005", "06/06/2006", 500, 500, 0, 0],
    ["01/01/2004", "02/28/2012", 12, 120, 0, 1.103166496],
    ["01/01/2005", "12/31/2005", 100, 50, 1, -0.501373626],
    ["01/01/2005", "12/31/2005", 100, 50, 1, -0.501373626],
    ["01/01/2005", "12/31/2005", 100, 50, 2, -0.494505495],
    ["01/01/2005", "12/31/2005", 100, 50, 3, -0.501373626],
    ["01/01/2005", "12/31/2005", 100, 50, 4, -0.501392758],
    ["02/29/2004", "02/28/2007", 55, 40, 0, -0.090909091],
    ["02/29/2004", "02/28/2007", 55, 40, 1, -0.090971357],
    ["02/29/2004", "02/28/2007", 55, 40, 2, -0.089663761],
    ["02/29/2004", "02/28/2007", 55, 40, 3, -0.090909091],
    ["02/29/2004", "02/28/2007", 55, 40, 4, -0.090993344],
    ["01/31/2002", "02/28/2008", 20, 60, 0, 0.329067642],
    ["01/31/2002", "02/28/2008", 20, 60, 1, 0.329234533],
    ["01/31/2002", "02/28/2008", 20, 60, 2, 0.324470482],
    ["01/31/2002", "02/28/2008", 20, 60, 3, 0.328977017],
    ["01/31/2002", "02/28/2008", 20, 60, 4, 0.329067642],
  ])(
    "function result =INTRATE(%s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      investment: number,
      redemption: number,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=INTRATE("${settlement}", "${maturity}", ${investment}, ${redemption}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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

describe("ISPMT formula", () => {
  test("ISPMT takes 4 arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISPMT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISPMT(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, 1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number_of_periods is !== 0", () => {
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, -1, -1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=ISPMT(0, 1, 1, -1)" })).toBe(0);
  });

  test.each([
    ["5%", 1, 6, 100, -4.166666667],
    ["5%", 3, 6, 0, 0],
    ["2.50%", 3, 6, 1000, -12.5],
    ["-10.00%", 2, 4, 1000, 50],
    ["12.00%", -1, 2, 1000, -180],
    ["0.00%", 6, 6, 18, 0],
    ["0.00%", 2, 4, 100, 0],
    ["2.50%", 1, 6, -200, 4.166666667],
    ["2.50%", 2, 4, 100, -1.25],
    ["2.50%", -2, -4, 100, -1.25],
    ["2.50%", 2, -4, 100, -3.75],
    ["2.50%", 2.5, 4, 100, -0.9375],
    ["5%", 1, 12, 200, -9.166666667],
    ["2.50%", 3, 6, 1000, -12.5],
    ["-10.00%", 2, 4, -1000, -50],
    ["12.00%", 1, 2, 1000, -60],
  ])(
    "function result =ISPMT(%s, %s, %s, %s)",
    (
      rate: string,
      period: number,
      numberOfPeriods: number,
      presentValue: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=ISPMT(${rate}, ${period}, ${numberOfPeriods}, ${presentValue})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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

describe("MIRR formula", () => {
  test("MIRR takes 3 arguments", () => {
    const grid = { B1: "1", B2: "-1" };
    expect(evaluateCell("A1", { A1: "=MIRR()", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B2)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B2, 0)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B2, 0, 0)", ...grid })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B2, 0, 0, 0)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cashflow_amounts must contain both positive and negative values", () => {
    let grid = { B1: "-1", B2: "-1", B3: "-1" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B3, 0, 0)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    grid = { B1: "1", B2: "1", B3: "1" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B3, 0, 0)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    grid = { B1: "0", B2: "0", B3: "1" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B3, 0, 0)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    grid = { B1: "-1", B2: "-1", B3: "0" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B3, 0, 0)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    grid = { B1: "0", B2: "0", B3: "0" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B3, 0, 0)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
  });

  test.each([
    [[50, -60, 80, 10, -50], 0.1, 0.05, 0.157969714],
    [[500, 600, -550, 125, 269], -0.1, 0.05, 0.25836707],
    [[50, 0, -98, -100, -50], 0.11, -0.05, -0.3155768],
    [[-23, -899, 9000, 0, 0], -0.03, -0.03, 0.727977096],
    [[1000, 1000, -1000, -1000, 500], 0, 0, 0.057371263],
  ])(
    "function result =MIRR(%s, %s, %s, %s)",
    (cashflow: number[], financeRate: number, reinvestRate: number, expectedResult: number) => {
      const grid = {
        B1: cashflow[0].toString(),
        B2: cashflow[1].toString(),
        B3: cashflow[2].toString(),
        B4: cashflow[3].toString(),
        B5: cashflow[4].toString(),
      };
      const cellValue = evaluateCell("A1", {
        ...grid,
        A1: `=MIRR(B1:B5, ${financeRate}, ${reinvestRate})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("can take multi-dimensional arrays as argument", () => {
    const cashflow = [500, 100, -200, 900, -1000];

    const gridSingleRow = {
      B1: cashflow[0].toString(),
      B2: cashflow[1].toString(),
      B3: cashflow[2].toString(),
      B4: cashflow[3].toString(),
      B5: cashflow[4].toString(),
    };
    const value = evaluateCell("A1", { ...gridSingleRow, A1: `=MIRR(B1:B5, 1, 1)` });
    expect(value).toBeCloseTo(2.1155759, 4);

    const grid = {
      B1: cashflow[0].toString(),
      B2: cashflow[1].toString(),
      B3: cashflow[2].toString(),
      C1: cashflow[3].toString(),
      C2: cashflow[4].toString(),
    };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=MIRR(B1:C3, 1, 1)` });
    expect(cellValue).toBeCloseTo(2.263664256, 4);

    const grid2 = {
      B1: cashflow[0].toString(),
      C1: cashflow[1].toString(),
      D1: cashflow[2].toString(),
      B2: cashflow[3].toString(),
      C2: cashflow[4].toString(),
    };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=MIRR(B1:D2, 1, 1)` });
    expect(cellValue2).toBeCloseTo(2.1155759, 4);
  });

  test("no values in cashflow_amounts are ignored and not treated as 0", () => {
    let grid: any = { B2: "3", B4: "-2" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(5, 4);
    grid = { B1: "0", B2: "3", B4: "-2" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(2.464101615, 4);
    grid = { B2: "3", B3: "0", B4: "-2" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(3.898979486, 4);
    grid = { B2: "3", B4: "-2", B5: "0" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(2.464101615, 4);
    grid = { B2: "3", B3: "0", B4: "-2", B5: "0" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(2.634241186, 4);
    grid = { B1: "0", B2: "3", B3: "0", B4: "-2" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(2.634241186, 4);
    grid = { B1: "0", B2: "3", B3: "0", B4: "-2", B5: "0" };
    expect(evaluateCell("A1", { A1: "=MIRR(B1:B5, 1, 1)", ...grid })).toBeCloseTo(2.13016916, 4);
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

describe("NPER formula", () => {
  test("NPER takes 3-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=NPER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NPER(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NPER(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NPER(0, 1, -1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NPER(0, 1, -1, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NPER(0, 1, -1, 0, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=NPER(0, 1, -1, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test.each([
    ["5%", -100, -1000, 0, 0, -8.310386223],
    ["5%", -100, 0, 0, 0, 0],
    ["5%", -100, 0, 10, 0, 0.102224323],
    ["2%", 100, -1000, 0, 0, 11.26838111],
    ["3%", -200, 1000, 0, 0, 5.498156798],
    ["15%", 10000, 10000, 0, 0, -1],
    ["8%", 100, 10, 23, 0, -0.344844026],
    ["5%", -100, -1000, 100, 0, -7.310386223],
    ["5%", -100, -1000, 0, 1, -7.982444277],
    ["-5%", -100, 200, 0, 0, 1.858141126],
    ["0%", -100, -1000, 0, 0, -10],
    ["0%", 100, 200, 0, 0, -2],
    ["0%", 800, -1000, 500, 0, 0.625],
    ["0%", -400, -1000, 1000, 1, 0],
    ["0%", 600, 100, 1000, 1, -1.833333333],
    ["0%", -400, 100, 1000, 1, 2.75],
  ])(
    "function result =NPER(%s, %s, %s, %s, %s)",
    (
      rate: string,
      payment: number,
      presentValue: number,
      futureValue: number,
      endOrBeginning: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=NPER(${rate}, ${payment}, ${presentValue}, ${futureValue}, ${endOrBeginning})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
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

    test("order of the repeatable arguments impact the result", () => {
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

describe("PMT formula", () => {
  test("take 3-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PMT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PMT(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PMT(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PMT(0, 1, -1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PMT(0, 1, -1, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PMT(0, 1, -1, 0, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PMT(0, 1, -1, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number_of_periods is > 0", () => {
    expect(evaluateCell("A1", { A1: "=PMT(0, -1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PMT(0, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test.each([
    ["5%", 12, 200, 0, 1, -21.49055429],
    ["5%", 12, 0, 200, 1, -11.96674477],
    ["5%", 12, 0, 0, 1, 0],
    ["2.50%", 6, 1000, 0, 0, -181.5499711],
    ["-10.00%", 4, 1000, 0, 0, -190.7822041],
    ["12.00%", 2, 1000, 500, 0, -827.5471698],
    ["0.00%", 6, 18, 15, 0, -5.5],
    ["0.00%", 4, 100, 100, 1, -50],
    ["0.00%", 6, 200, -20, 0, -30],
    ["0.00%", 4, -200, 100, 0, 25],
    ["2.50%", 6, -200, 200, 0, 5],
    ["2.50%", 4, 100, 0, 1, -25.93345148],
    ["2.50%", 4, 100, 0, 0, -26.58178777],
    ["150.00%", 6, 1000, 50000, 1, -725.8530943],
  ])(
    "function result =PMT(%s, %s, %s, %s, %s)",
    (
      rate: string | number,
      nPeriods: number,
      presentValue: number,
      futureValue: number,
      endStart: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=PMT(${rate}, ${nPeriods}, ${presentValue}, ${futureValue}, ${endStart})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=PMT(0, 1, -1)" })).toBe("#,##0.00");
  });
});

describe("PPMT formula", () => {
  test("PPMT takes 4-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PPMT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PPMT(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1, 0, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number_of_periods is > 0", () => {
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, -1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1)" })).toBe(1);
  });

  test("period is > 0 and < number_of_periods", () => {
    expect(evaluateCell("A1", { A1: "=PPMT(0, -1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PPMT(0, 0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PPMT(0, 1, 1, -1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=PPMT(0, 2, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test.each([
    ["5%", 1, 12, 200, 0, 0, -12.565082],
    ["5%", 1, 12, 0, 0, 0, 0],
    ["5%", 1, 12, 0, 100, 0, -6.282541002],
    ["2.50%", 3, 6, 1000, 0, 0, -164.4753133],
    ["-10.00%", 2, 4, 1000, -50, 0, -248.6187845],
    ["12.00%", 1, 2, 1000, 500, 0, -707.5471698],
    ["0.00%", 6, 6, 18, 15, 0, -5.5],
    ["0.00%", 2, 4, 100, 100, 1, -50],
    ["0.00%", 6, 6, 200, -20, 0, -30],
    ["0.00%", 2, 4, -200, 100, 0, 25],
    ["2.50%", 1, 6, -200, 200, 0, 0],
    ["2.50%", 2, 4, 100, 0, 1, -24.08178777],
    ["2.50%", 2, 4, 100, 0, 0, -24.68383247],
    ["2.50%", 2.5, 4, 100, 0, 0, -24.99047568],
    ["5%", 1, 12, 200, 0, 1, -21.49055429],
    ["2.50%", 3, 6, 1000, 0, 1, -160.4637203],
    ["-10.00%", 2, 4, 1000, -50, 1, -276.2430939],
    ["12.00%", 1, 2, 1000, 500, 1, -738.8814016],
  ])(
    "function result =PPMT(%s, %s, %s, %s, %s, %s)",
    (
      rate: string,
      period: number,
      numberPeriods: number,
      presentValue: number,
      futureValue: number,
      endOrBeginning: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=PPMT(${rate}, ${period}, ${numberPeriods}, ${presentValue}, ${futureValue}, ${endOrBeginning})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=PPMT(0, 1, 1, -1)" })).toBe("#,##0.00");
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

describe("PRICEDISC formula", () => {
  test("PRICEDISC takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRICEDISC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 365)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 365, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 365, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 365, 1, 1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 365, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Maturity must be greater than settlement", () => {
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=PRICEDISC(1, 0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Redemption should be > 0", () => {
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Discount should be > 0", () => {
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 1, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=PRICEDISC(0, 1, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["01/01/2012", "01/01/2014", "10%", 100, 1, 79.99087591],
    ["01/01/2012", "05/01/2016", "20%", 100, 2, 12.11111111],
    ["01/01/2012", "05/01/2016", "50%", 100, 2, -119.7222222],
    ["12/20/2014", "05/01/2016", "1%", 68, 2, 67.05933333],
    ["12/20/2014", "05/01/2016", "50%", 12, 2, 3.7],
    ["01/30/2013", "05/31/2016", "50%", 1, 2, -0.690277778],
    ["12/30/2014", "05/31/2016", "50%", 5, 2, 1.402777778],
    ["12/30/2014", "05/31/2016", "50%", 110, 2, 30.86111111],
    ["12/30/2014", "05/31/2016", "50%", 1, 2, 0.280555556],
    ["12/30/2009", "05/31/2023", "50%", 1, 2, -5.805555556],
    ["01/01/2012", "05/01/2016", "10%", 68, 0, 38.53333333],
    ["01/01/2012", "05/01/2016", "10%", 68, 1, 38.55938697],
    ["01/01/2012", "05/01/2016", "10%", 68, 2, 38.11777778],
    ["01/01/2012", "05/01/2016", "10%", 68, 3, 38.52712329],
    ["01/01/2012", "05/01/2016", "10%", 68, 4, 38.53333333],
    ["02/29/2020", "07/31/2020", "5%", 100, 0, 97.90277778],
    ["02/29/2020", "07/31/2020", "5%", 100, 1, 97.90983607],
    ["02/29/2020", "07/31/2020", "5%", 100, 2, 97.875],
    ["02/29/2020", "07/31/2020", "5%", 100, 3, 97.90410959],
    ["02/29/2020", "07/31/2020", "5%", 100, 4, 97.90277778],
    ["10/31/2005", "10/30/2010", "5%", 100, 0, 75],
    ["10/31/2005", "10/30/2010", "5%", 100, 1, 75.01141031],
    ["10/31/2005", "10/30/2010", "5%", 100, 2, 74.65277778],
    ["10/31/2005", "10/30/2010", "5%", 100, 3, 75],
    ["10/31/2005", "10/30/2010", "5%", 100, 4, 75],
    ["03/30/2008", "02/28/2011", "5%", 100, 0, 85.44444444],
    ["03/30/2008", "02/28/2011", "5%", 100, 1, 85.42094456],
    ["03/30/2008", "02/28/2011", "5%", 100, 2, 85.20833333],
    ["03/30/2008", "02/28/2011", "5%", 100, 3, 85.4109589],
    ["03/30/2008", "02/28/2011", "5%", 100, 4, 85.44444444],
  ])(
    "function result =PRICEDISC(%s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      discount: string,
      redemption: number,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=PRICEDISC("${settlement}", "${maturity}", ${discount}, ${redemption}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 6);
    }
  );
});

describe("PRICEMAT formula", () => {
  test("PRICEMAT takes 5-6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, 0)" })).toBe(100);
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, 0, 0)" })).toBe(100);
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("maturity date > settlement date", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT(2, 2, 0, 0, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PRICEMAT(3, 2, 0, 0, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("settlement date > issue date", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT(2, 5, 3, 0, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PRICEMAT(2, 5, 2, 0, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("yield >= 0", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, -1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, -0.5, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("rate >= 0", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, -1, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, -0.5, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("dayCountConvention is between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, 0, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=PRICEMAT(1, 2, 0, 0, 0, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test.each([
    /*
     * @compatibility
     * Results marked as @compatibility are from LibreOffice Calc and are different from the values in Excel.
     * Most of the results are different from Google Sheet.
     * See comment in PRICEMAT implementation for details.
     */
    ["01/01/2005", "01/01/2006", "01/01/2004", "5.00%", "5.00%", 0, 99.76190476],
    ["01/02/2005", "06/06/2006", "01/01/2005", "12.00%", "5.00%", 0, 109.3262726],
    ["02/01/2007", "02/28/2012", "01/01/2004", "0.50%", "12.00%", 0, 63.14395587],
    ["01/02/2022", "01/03/2022", "01/01/2022", "1.00%", "10.00%", 0, 99.97500617],
    ["03/30/2004", "05/01/2004", "01/01/2004", "5.00%", "0.00%", 0, 100.4305556],
    ["01/01/2005", "01/01/2006", "01/01/2004", "0.00%", "5.00%", 0, 95.23809524],
    ["01/01/2005", "01/01/2006", "01/01/2004", "5.00%", "0.00%", 0, 105],
    ["01/01/2005", "06/01/2006", "01/01/2004", "0.00%", "0.00%", 0, 100],
    ["02/28/2005", "12/31/2005", "01/01/2005", "5.00%", "10.00%", 0, 96.106564556], // @compatibility
    ["02/28/2005", "12/31/2005", "01/01/2005", "5.00%", "10.00%", 1, 96.07100018],
    ["02/28/2005", "12/31/2005", "01/01/2005", "5.00%", "10.00%", 2, 96.01984127],
    ["02/28/2005", "12/31/2005", "01/01/2005", "5.00%", "10.00%", 3, 96.07100018],
    ["02/28/2005", "12/31/2005", "01/01/2005", "5.00%", "10.00%", 4, 96.06891765],
    ["03/31/2006", "01/01/2007", "01/01/2005", "5.00%", "10.00%", 0, 96.0491475071041], // @compatibility
    ["03/31/2006", "01/01/2007", "01/01/2005", "5.00%", "10.00%", 1, 96.04776028],
    ["03/31/2006", "01/01/2007", "01/01/2005", "5.00%", "10.00%", 2, 95.99062607],
    ["03/31/2006", "01/01/2007", "01/01/2005", "5.00%", "10.00%", 3, 96.04776028],
    ["03/31/2006", "01/01/2007", "01/01/2005", "5.00%", "10.00%", 4, 96.063036395993], // @compatibility
    ["06/30/2004", "01/01/2007", "01/01/2002", "5.00%", "10.00%", 0, 87.4916716],
    ["06/30/2004", "01/01/2007", "01/01/2002", "5.00%", "10.00%", 1, 87.4927083], // @compatibility
    ["06/30/2004", "01/01/2007", "01/01/2002", "5.00%", "10.00%", 2, 87.30292543],
    ["06/30/2004", "01/01/2007", "01/01/2002", "5.00%", "10.00%", 3, 87.47673634],
    ["06/30/2004", "01/01/2007", "01/01/2002", "5.00%", "10.00%", 4, 87.4916716],
    ["10/31/2005", "10/30/2010", "02/28/2002", "5.00%", "10.00%", 0, 77.2083333333333], // @compatibility
    ["10/31/2005", "10/30/2010", "02/28/2002", "5.00%", "10.00%", 1, 77.2195674945665], // @compatibility
    ["10/31/2005", "10/30/2010", "02/28/2002", "5.00%", "10.00%", 2, 76.9141705069124],
    ["10/31/2005", "10/30/2010", "02/28/2002", "5.00%", "10.00%", 3, 77.2100456621005],
    ["10/31/2005", "10/30/2010", "02/28/2002", "5.00%", "10.00%", 4, 77.212962962963],
    ["03/30/2008", "02/28/2011", "03/31/2002", "5.00%", "10.00%", 0, 81.9621342512909],
    ["03/30/2008", "02/28/2011", "03/31/2002", "5.00%", "10.00%", 1, 81.9487890924023], // @compatibility
    ["03/30/2008", "02/28/2011", "03/31/2002", "5.00%", "10.00%", 2, 81.6380403715613], // @compatibility
    ["03/30/2008", "02/28/2011", "03/31/2002", "5.00%", "10.00%", 3, 81.9269164281875],
    ["03/30/2008", "02/28/2011", "03/31/2002", "5.00%", "10.00%", 4, 81.9621342512909],
  ])(
    "function result =PRICEMAT(%s, %s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      issue: string,
      rate: string,
      yieldValue: string,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=PRICEMAT("${settlement}", "${maturity}", "${issue}", ${rate}, ${yieldValue}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("RATE formula", () => {
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

describe("RECEIVED formula", () => {
  test("RECEIVED takes 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=RECEIVED()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RECEIVED(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 1, 0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("settlement < maturity", () => {
    expect(evaluateCell("A1", { A1: "=RECEIVED(1, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RECEIVED(2, 1, 1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("investment > 0", () => {
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, -1, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("discount rate > 0", () => {
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1,-1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 0, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("dayCountConvention is between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RECEIVED(0, 1, 1, 1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["01/01/2012", "01/01/2014", 100, "40%", 2, 532.5443787],
    ["01/01/2012", "05/01/2016", 100.69, "10%", 2, 179.6253717],
    ["01/01/2012", "05/01/2016", 60.9, "10%", 2, 108.64222],
    ["12/20/2014", "05/01/2016", 1.5, "68%", 2, 25.28089888],
    ["12/20/2014", "05/01/2016", 50, "60%", 2, 294.1176471],
    ["01/30/2013", "05/31/2016", 5, "6%", 2, 6.272214092],
    ["12/30/2014", "05/31/2016", 50, "5%", 2, 53.876085],
    ["12/30/2014", "05/31/2016", 200, "11%", 2, 237.6080787],
    ["12/30/2014", "05/31/2016", 347, "12%", 2, 419.4198227],
    ["12/30/2009", "05/31/2023", 12, "2%", 2, 16.48854962],
    ["01/01/2005", "12/31/2005", 100, "20%", 0, 125],
    ["01/01/2005", "12/31/2005", 100, "20%", 1, 124.9144422],
    ["01/01/2005", "12/31/2005", 100, "20%", 2, 125.3481894],
    ["01/01/2005", "12/31/2005", 100, "20%", 3, 124.9144422],
    ["01/01/2005", "12/31/2005", 100, "20%", 4, 124.9132547],
    ["02/29/2004", "02/28/2007", 500, "10%", 0, 714.2857143],
    ["02/29/2004", "02/28/2007", 500, "10%", 1, 714.0762463],
    ["02/29/2004", "02/28/2007", 500, "10%", 2, 718.5628743],
    ["02/29/2004", "02/28/2007", 500, "10%", 3, 714.2857143],
    ["02/29/2004", "02/28/2007", 500, "10%", 4, 714.00238],
    ["01/31/2002", "02/28/2008", 500, "15%", 0, 5660.377358],
    ["01/31/2002", "02/28/2008", 500, "15%", 1, 5630.9183],
    ["01/31/2002", "02/28/2008", 500, "15%", 2, 6629.834254],
    ["01/31/2002", "02/28/2008", 500, "15%", 3, 5676.51633],
    ["01/31/2002", "02/28/2008", 500, "15%", 4, 5660.377358],
  ])(
    "function result =RECEIVED(%s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      investment: number,
      discount: string,
      dayCountConvention: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=RECEIVED("${settlement}", "${maturity}", ${investment}, ${discount}, ${dayCountConvention})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("RRI formula", () => {
  test("RRI takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=RRI()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RRI(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RRI(1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=RRI(1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=RRI(1, 1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("number of period should be positive", () => {
    expect(evaluateCell("A1", { A1: "=RRI(-1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=RRI(0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [12, 0, 0, 0],
    [6, 1, 0, -1],
    [4, -100, -50, -0.159103585],
    [2, -100, -87, -0.067262095],
    [2, 20, 100, 1.236067977],
    [4, 100, 100, 0],
    [6, 200, 20, -0.318707931],
    [4, 200, 250, 0.057371263],
    [6, -200, -250, 0.037890816],
    [4, -200, -150, -0.069395141],
    [4.5, -200, -150, -0.061928728],
    [4, -200, -150, -0.069395141],
    [4, -200.5, -150, -0.069975862],
    [4, -200.5, -150.5, -0.069201809],
  ])(
    "function result =RRI(%s, %s, %s)",
    (
      numbreOfPeriods: number,
      presentValue: number,
      futureValue: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=RRI(${numbreOfPeriods}, ${presentValue}, ${futureValue})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("SLN formula", () => {
  test("SLN takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SLN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SLN(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SLN(1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SLN(1, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SLN(1, 1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test.each([
    [1000, 200, 12, 66.66666667],
    [100, 200, 12, -8.333333333],
    [1500, 200, 5, 260],
    [178, 200, 8, -2.75],
    [0, 105, 11, -9.545454545],
    [158, 0, 69, 2.289855072],
    [0, 0, 12, 0],
    [-1000, 200, 10, -120],
    [1000, -200, 10, 120],
    [-1000, -200, 10, -80],
    [1000, 200, 10, 80],
    [1000, 200, -10, -80],
  ])(
    "function result =SLN(%s, %s, %s)",
    (cost: number, salvage: number, life: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=SLN(${cost}, ${salvage}, ${life})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=SLN(1, 1, 1)" })).toBe("#,##0.00");
  });
});

describe("SYD formula", () => {
  test("SYD takes 4 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SYD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SYD(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SYD(0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("life > 0", () => {
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("period > 0 and period < life", () => {
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=SYD(0, 0, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [1000, 200, 12, 1, 123.0769231],
    [1000, 200, 12, 2, 112.8205128],
    [1000, 200, 12, 3, 102.5641026],
    [1000, 200, 12, 4, 92.30769231],
    [1000, 200, 12, 5, 82.05128205],
    [1000, 200, 12, 6, 71.79487179],
    [1000, 200, 12, 7, 61.53846154],
    [1000, 200, 12, 8, 51.28205128],
    [1000, 200, 12, 9, 41.02564103],
    [1000, 200, 12, 10, 30.76923077],
    [1000, 200, 12, 11, 20.51282051],
    [1000, 200, 12, 12, 10.25641026],
    [1000.5, 50, 5, 2, 253.4666667],
    [1000, 50.5, 5, 2, 253.2],
    [28, 30, 9, 3, -0.311111111],
    [-12, 5, 8, 8, -0.472222222],
    [-120, 5, 5, 1, -41.66666667],
    [0, 0, 5, 1, 0],
    [0, 50, 5, 2, -13.33333333],
    [1000.5, 0, 5, 2, 266.8],
  ])(
    "function result =SYD(%s, %s, %s, %s)",
    (cost: number, salvage: number, life: number, period: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=SYD(${cost}, ${salvage}, ${life}, ${period})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1000, 200, 12, 0.2, 131.2820513],
    [1000, 200, 12, 1.8, 114.8717949],
    [1000, 200, 12, 11.5, 15.38461538],
    [1000, 1200, 10, 1.2, -35.63636364],
    [1000, 1200, 10, 0.5, -38.18181818],
  ])(
    "function result with decimal period =SYD(%s, %s, %s, %s)",
    (cost: number, salvage: number, life: number, period: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=SYD(${cost}, ${salvage}, ${life}, ${period})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("return value with formating", () => {
    expect(evaluateCellFormat("A1", { A1: "=SYD(0, 0, 1, 1)" })).toBe("#,##0.00");
  });
});

describe("TBILLPRICE formula", () => {
  test("TBILLPRICE takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TBILLPRICE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 0.1)" })).toBeCloseTo(99.972222, 4);
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 0.1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("discount > 0 and discount < 1", () => {
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, -0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("maturity > settlement and maturity is no more than a year after settlement", () => {
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(1, 1, 0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(2, 1, 0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=TBILLPRICE("01/01/2012", "01/02/2013", 0.1)' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["02/29/2012", "03/01/2013", "20%", 79.66666667],
    ["01/01/2012", "05/01/2012", "10%", 96.63888889],
    ["10/01/2012", "11/10/2012", "10%", 98.88888889],
    ["12/30/2014", "12/31/2014", "68%", 99.81111111],
    ["02/28/2012", "01/31/2013", "2%", 98.12222222],
    ["02/29/2012", "01/30/2013", "20%", 81.33333333],
    ["02/29/2012", "01/31/2013", "20%", 81.27777778],
    ["02/29/2012", "01/15/2013", "20%", 82.16666667],
    ["12/31/2012", "02/01/2013", "20%", 98.22222222],
    ["12/31/2012", "05/01/2013", "20%", 93.27777778],
    ["02/29/2012", "01/01/2013", "10%", 91.47222222],
    ["01/01/2012", "02/28/2012", "15%", 97.58333333],
  ])(
    "function result =TBILLPRICE(%s, %s, %s)",
    (arg0: string, arg1: string, arg2: string, expectedResult: number) => {
      const cellValue = evaluateCell("A1", { A1: `=TBILLPRICE("${arg0}", "${arg1}", ${arg2})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("TBILLEQ formula", () => {
  test("TBILLEQ takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TBILLEQ()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, 0.1)" })).toBeCloseTo(0.1014170603, 4);
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, 0.1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("discount > 0 and discount < 1", () => {
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, -0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLEQ(0, 1, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("maturity > settlement and maturity is no more than a year after settlement", () => {
    expect(evaluateCell("A1", { A1: "=TBILLEQ(1, 1, 0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLEQ(2, 1, 0.1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=TBILLEQ("01/01/2012", "01/02/2013", 0.1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["05/01/1997", "10/30/1997", "20%", 0.225587145], // < 6 months (6 months = 182 days)
    ["05/01/1997", "10/31/1997", "20%", 0.22565709], // > 6 months (6 montsh = 182 days)
    ["02/29/2012", "03/01/2013", "20%", 0.240741061], // 366 days between settlement and maturity
    ["02/29/2012", "02/28/2013", "20%", 0.239960179], // 365 days between settlement and maturity
    ["01/01/2012", "05/01/2012", "10%", 0.104915206],
    ["10/01/2012", "11/10/2012", "10%", 0.10252809],
    ["12/30/2014", "12/31/2014", "68%", 0.690749193],
    ["02/28/2012", "01/31/2013", "2%", 0.020568519],
    ["02/29/2012", "01/30/2013", "20%", 0.236536775],
    ["02/29/2012", "01/31/2013", "20%", 0.236649838],
    ["02/29/2012", "01/15/2013", "20%", 0.234886111],
    ["12/31/2012", "02/01/2013", "20%", 0.206447964],
    ["12/31/2012", "05/01/2013", "20%", 0.217391304],
    ["02/29/2012", "01/01/2013", "10%", 0.108456067],
    ["01/01/2012", "02/28/2012", "15%", 0.155849701],
  ])(
    "function result =TBILLEQ(%s, %s, %s)",
    (settlement: string, maturity: string, discount: string, expectedResult: number) => {
      const cellValue = evaluateCell("A1", {
        A1: `=TBILLEQ("${settlement}", "${maturity}", ${discount})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("TBILLYIELD formula", () => {
  test("TBILLYIELD takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TBILLYIELD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLYIELD(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLYIELD(0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TBILLYIELD(0, 1, 100)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TBILLYIELD(0, 1, 100, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("price > 0", () => {
    expect(evaluateCell("A1", { A1: "=TBILLYIELD(0, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(0, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("maturity > settlement and maturity is no more than a year after settlement", () => {
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(1, 1, 100)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=TBILLPRICE(2, 1, 100)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=TBILLPRICE("01/01/2012", "01/02/2013", 100)' })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    ["02/29/2012", "03/01/2013", 100, 0],
    ["01/01/2012", "05/01/2012", 300, -1.983471074],
    ["10/01/2012", "11/10/2012", 400, -6.75],
    ["12/30/2014", "12/31/2014", 120, -60],
    ["02/28/2012", "01/31/2013", 150, -0.355029586],
    ["02/29/2012", "01/30/2013", 251, -0.644564599],
    ["02/29/2012", "01/31/2013", 600, -0.890207715],
    ["02/29/2012", "01/15/2013", 99, 0.011328236],
    ["12/31/2012", "02/01/2013", 84, 2.142857143],
    ["12/31/2012", "05/01/2013", 456, -2.322749021],
    ["02/29/2012", "01/01/2013", 12, 8.599348534],
    ["02/29/2012", "01/01/2013", 12.5, 8.208469055],
  ])(
    "function result =TBILLYIELD(%s, %s, %s)",
    (settlement: string, maturity: string, price: number, expectedResult: number) => {
      const cellValue = evaluateCell("A1", {
        A1: `=TBILLYIELD("${settlement}", "${maturity}", ${price})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("VDB formula", () => {
  test("VDB takes 5-7 arguments", () => {
    expect(evaluateCell("A1", { A1: "=VDB()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VDB(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VDB(1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1, 2, TRUE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1, 2, TRUE, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cost and salvage >= 0", () => {
    expect(evaluateCell("A1", { A1: "=VDB(-1, 0, 1, 0, 1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=VDB(1, -1, 1, 0, 1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("life > 0", () => {
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, -1, 0, 1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 0, 0, 1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("start period >= 0 and <= end period", () => {
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, -1, 1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 2, 2, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("end period >= 0 and <= life", () => {
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, -1, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 3, 2, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("factor > 0", () => {
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1, -1, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=VDB(1, 0, 1, 0, 1, 0, TRUE)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [1200, 200, 10, 0, 1, 1.5, "FALSE", 180],
    [1200, 200, 10, 1, 2, 1.5, "FALSE", 153],
    [1200, 200, 10, 2, 3, 1.5, "FALSE", 130.05],
    [1200, 200, 10, 3, 4, 1.5, "FALSE", 110.5425],
    [1200, 200, 10, 4, 5, 1.5, "FALSE", 93.961125],
    [1200, 200, 10, 5, 6, 1.5, "FALSE", 79.86695625],
    [1200, 200, 10, 6, 7, 1.5, "FALSE", 67.88691281],
    [1200, 200, 10, 7, 8, 1.5, "FALSE", 61.56416865],
    [1200, 200, 10, 8, 9, 1.5, "FALSE", 61.56416865],
    [1200, 200, 10, 9, 10, 1.5, "FALSE", 61.56416865],
    [1000.5, 50, 5, 2, 4, 3, "FALSE", 110.08],
    [1000, 50, 5, 2, 5, 3.5, "FALSE", 40],
    [28, 30, 9, 2, 3, 5, "FALSE", 0],
    [12, 5, 8, 7, 8, 4, "FALSE", 0],
    [120, 5, 5, 1, 1, 2, "FALSE", 0],
    [1000.5, 50, 5, 2, 3, 3, "FALSE", 96.048],
    [1000, 50, 5, 2, 3, 6, "FALSE", 0],
    [28, 5, 9, 2, 5, 1, "FALSE", 7.346593507],
    [12, 5, 8, 2, 4, 3, "FALSE", 0],
    [120, 5, 15, 2, 4, 10, "FALSE", 8.333333333],
    [1000, 0, 12, 1, 2, 2, "FALSE", 138.8888889],
    [0, 200, 12, 1, 2, 2, "FALSE", 0],
    [0, 0, 12, 1, 2, 2, "FALSE", 0],
  ])(
    "function result =VDB(%s, %s, %s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      startPeriod: number,
      endPeriod: number,
      factor: number,
      noSwitch: string,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=VDB(${cost}, ${salvage}, ${life}, ${startPeriod}, ${endPeriod}, ${factor}, ${noSwitch})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1200, 200, 7, 0, 1, 1.5, "TRUE", 257.1428571],
    [1200, 200, 7, 1, 2, 1.5, "TRUE", 202.0408163],
    [1200, 200, 7, 2, 3, 1.5, "TRUE", 158.7463557],
    [1200, 200, 7, 3, 4, 1.5, "TRUE", 124.7292795],
    [1200, 200, 7, 4, 5, 1.5, "TRUE", 98.00157672],
    [1200, 200, 7, 5, 6, 1.5, "TRUE", 77.00123885],
    [1200, 200, 7, 6, 7, 1.5, "TRUE", 60.50097339],
    [1200, 200, 7, 1, 5, 1.5, "TRUE", 583.5180282],
    [200, 100, 10, 0, 2, 1.5, "TRUE", 55.5],
  ])(
    "function result with no_switch=TRUE =VDB(%s, %s, %s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      startPeriod: number,
      endPeriod: number,
      factor: number,
      noSwitch: string,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=VDB(${cost}, ${salvage}, ${life}, ${startPeriod}, ${endPeriod}, ${factor}, ${noSwitch})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1200, 200, 7, 0, 6, 12, "FALSE", 1000],
    [1200, 200, 7, 1, 2, 10, "TRUE", 0],
    [1200, 200, 7, 0, 1, 10, "FALSE", 1000],
    [1200, 200, 7, 0, 3, 7, "TRUE", 1000],
    [1200, 200, 7, 0, 3, 7, "FALSE", 1000],
  ])(
    "function result with factor >= life, =VDB(%s, %s, %s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      startPeriod: number,
      endPeriod: number,
      factor: number,
      noSwitch: string,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=VDB(${cost}, ${salvage}, ${life}, ${startPeriod}, ${endPeriod}, ${factor}, ${noSwitch})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1000, 1200, 7, 0, 6, 2, "FALSE", -200],
    [1000, 1200, 7, 1, 2, 2, "FALSE", 0],
    [1000, 1300, 7, 0, 1, 2, "FALSE", -300],
    [1000, 1200, 7, 2, 3, 2, "FALSE", 0],
  ])(
    "function result with salvage > cost, =VDB(%s, %s, %s, %s, %s, %s, %s)",
    (
      cost: number,
      salvage: number,
      life: number,
      startPeriod: number,
      endPeriod: number,
      factor: number,
      noSwitch: string,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=VDB(${cost}, ${salvage}, ${life}, ${startPeriod}, ${endPeriod}, ${factor}, ${noSwitch})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test.each([
    [1200, 200, 7, 1.1, 2.2, 1.5, "TRUE", 202.0408163],
    [1200, 200, 7, 2.5, 3.9, 1.5, "TRUE", 158.7463557],
  ])(
    "periods are truncated",
    (
      cost: number,
      salvage: number,
      life: number,
      startPeriod: number,
      endPeriod: number,
      factor: number,
      noSwitch: string,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=VDB(${cost}, ${salvage}, ${life}, ${startPeriod}, ${endPeriod}, ${factor}, ${noSwitch})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("XIRR formula", () => {
  test("XIRR takes 2-3 arguments", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XIRR()", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2)", ...grid })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2, 0.1)", ...grid })).toBeCloseTo(0);
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2, 0.1, 0)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cash flow and date ranges have the same dimensions", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", D1: "1", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:D1)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C3)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("first date should be greater than the others", () => {
    let grid = { B1: "1", B2: "-1", C1: "2", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    grid = { B1: "1", B2: "-1", C1: "3", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("the rate guess should be > -1", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2, -2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=XIRR(B1:B2, C1:C2, -1)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("cash flows should contain both negative and positives values", () => {
    // prettier-ignore
    let grid = {
      B1: "-1000", C1: "01/01/2018",
      B2: "-8000", C2: "01/01/2021",
    };
    let cellValue = evaluateCell("A1", { ...grid, A1: `=XIRR(B1:B2, C1:C2)` });
    expect(cellValue).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    // prettier-ignore
    grid = {
      B1: "1000", C1: "01/01/2018",
      B2: "8000", C2: "01/01/2021",
    };
    cellValue = evaluateCell("A1", { ...grid, A1: `=XIRR(B1:B2, C1:C2)` });
    expect(cellValue).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    // prettier-ignore
    grid = {
      B1: "1000", C1: "01/01/2018",
      B2: "0", C2: "01/01/2021",
    };
    cellValue = evaluateCell("A1", { ...grid, A1: `=XIRR(B1:B2, C1:C2)` });
    expect(cellValue).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test.each([
    [
      [1000, -1000, -2000, -2000, -6000],
      ["01/01/2018", "01/01/2019", "01/01/2020", "01/01/2021", "01/01/2022"],
      0.1,
      1.501098192,
    ],
    [
      [-25000, 1500, 600, -2500, 4000],
      ["01/01/2018", "02/01/2018", "03/01/2018", "04/01/2018", "05/01/2018"],
      0.1,
      -0.998347131,
    ],
    [
      [5.69, 1.2, -1.289, -2.566, -1],
      ["03/31/2018", "02/28/2019", "12/31/2019", "01/01/2020", "05/01/2020"],
      0.1,
      -0.190853172,
    ],
    [
      [0, -1000, -2000, 20000, -6000],
      ["01/01/2018", "02/28/2018", "10/25/2019", "02/29/2020", "06/12/2020"],
      0.1,
      2.558968357, //@compatibility result of Gsheet, on Excel returns 2.4e-9 which looks like a wrong value
    ],
  ])(
    "function result =XIRR(%s, %s, %s)",
    (cashFlow: number[], dates: string[], guess: number, expectedResult: number) => {
      const grid = {
        B1: cashFlow[0].toString(),
        B2: cashFlow[1].toString(),
        B3: cashFlow[2].toString(),
        B4: cashFlow[3].toString(),
        B5: cashFlow[4].toString(),
        C1: dates[0].toString(),
        C2: dates[1].toString(),
        C3: dates[2].toString(),
        C4: dates[3].toString(),
        C5: dates[4].toString(),
      };
      const cellValue = evaluateCell("A1", { ...grid, A1: `=XIRR(B1:B5, C1:C5, ${guess})` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("empty cells are treated as 0", () => {
    const grid = {
      B1: "1000",
      B2: "0",
      B3: "-2000",
      B4: "0",
      B5: "0",
      C1: "01/01/2018",
      C2: "01/01/2019",
      C3: "01/01/2020",
      C4: "01/01/2021",
      C5: "01/01/2022",
    };
    const cellValue = evaluateCell("A1", { ...grid, A1: `=XIRR(B1:B5, C1:C5)` });
    expect(cellValue).toBeCloseTo(0.414213568, 4);

    const grid2 = {
      B1: "1000",
      B3: "-2000",
      C1: "01/01/2018",
      C2: "01/01/2019",
      C3: "01/01/2020",
      C4: "01/01/2021",
      C5: "01/01/2022",
    };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=XIRR(B1:B5, C1:C5)` });
    expect(cellValue2).toBeCloseTo(0.414213568, 4);
  });

  test("can take multi-dimensional arrays as argument", () => {
    //prettier-ignore
    const singlColGrid = {
      B1: "1000", C1: "01/01/2018",
      B2: "-1000", C2: "01/01/2019",
      B3: "-2000", C3: "01/01/2020",
      B4: "-2000", C4: "01/01/2021",
    };
    const cellValue = evaluateCell("A1", { ...singlColGrid, A1: `=XIRR(B1:B4, C1:C4)` });
    expect(cellValue).toBeCloseTo(1.269027531, 4);

    //prettier-ignore
    const singlRowGrid = {
      B1: "1000", C1: "-1000", D1: "-2000", E1: "-2000",
      B2: "01/01/2018", C2: "01/01/2019", D2: "01/01/2020", E2: "01/01/2021",
    };
    const cellValue2 = evaluateCell("A1", { ...singlRowGrid, A1: `=XIRR(B1:E1, B2:E2)` });
    expect(cellValue2).toBeCloseTo(1.269027531, 4);

    //prettier-ignore
    const multiDimensionalGrid = {
      B1: "1000", C1: "-2000", D1: "01/01/2018", E1: "01/01/2020",
      B2: "-1000", C2: "-2000", D2: "01/01/2019", E2: "01/01/2021",
    };
    const cellValue3 = evaluateCell("A1", { ...multiDimensionalGrid, A1: `=XIRR(B1:C2, D1:E2)` });
    expect(cellValue3).toBeCloseTo(1.269027531, 4);
  });

  test("values with the same date are added together", () => {
    //prettier-ignore
    const grid1 = {
      B1: "1000", C1: "01/01/2018",
      B2: "-2000", C2: "01/01/2021",
      B3: "-6000", C3: "01/01/2021",
    };
    const cellValue = evaluateCell("A1", { ...grid1, A1: `=XIRR(B1:B3, C1:C3)` });
    expect(cellValue).toBeCloseTo(0.998735535, 4);

    //prettier-ignore
    const grid2 = {
      B1: "1000", C1: "01/01/2018",
      B2: "-8000", C2: "01/01/2021",
    };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=XIRR(B1:B2, C1:C2)` });
    expect(cellValue2).toBeCloseTo(0.998735535, 4);
  });
});

describe("XNPV formula", () => {
  test("XNPV takes 3 arguments", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV()", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=XNPV(0.1)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=XNPV(0.1, 1)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=XNPV(0.1, 1, 1)", ...grid })).toBeCloseTo(1);
    expect(evaluateCell("A1", { A1: "=XNPV(0.1, 1, 1, 0)", ...grid })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("cash flow and date ranges have the same dimensions", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", D1: "1", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:D1)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C3)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("first date should be greater than the others", () => {
    let grid = { B1: "1", B2: "-1", C1: "2", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    grid = { B1: "1", B2: "-1", C1: "3", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("the rate should be > 0", () => {
    const grid = { B1: "1", B2: "-1", C1: "0", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(-1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=XNPV(0, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("there should be only numbers in the ranges", () => {
    let grid: Record<string, string> = { B1: "1", B2: "-1", C1: "2", C2: "abcd" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    grid = { B1: "abcd", B2: "-1", C1: "3", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    grid = { B1: "1", C1: "3", C2: "1" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    grid = { B1: "1", B2: "-1", C1: "3" };
    expect(evaluateCell("A1", { A1: "=XNPV(1, B1:B2, C1:C2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  //TODO undefined valeus => error
  test.each([
    [
      0.1,
      [1000, -1000, -2000, -2000, -6000],
      ["01/01/2018", "01/01/2019", "01/01/2020", "01/01/2021", "01/01/2022"],
      -7161.231517,
    ],
    [
      0.5,
      [-6500, 1500, 600, -2500, 4000],
      ["01/01/2018", "02/01/2018", "03/01/2018", "04/01/2018", "05/01/2018"],
      -3250.186044,
    ],
    [
      1.2,
      [5.69, 1.2, -1.289, -2.566, -1],
      ["03/31/2018", "02/28/2019", "12/31/2019", "01/01/2020", "05/01/2020"],
      5.114395911,
    ],
    [
      0.3,
      [0, -1000, -2000, 20000, -6000],
      ["01/01/2018", "02/28/2018", "10/25/2019", "02/29/2020", "06/12/2020"],
      5983.276417,
    ],
  ])(
    "function result =XNPV(%s, %s, %s)",
    (rate: number, cashFlow: number[], dates: string[], expectedResult: number) => {
      const grid = {
        B1: cashFlow[0].toString(),
        B2: cashFlow[1].toString(),
        B3: cashFlow[2].toString(),
        B4: cashFlow[3].toString(),
        B5: cashFlow[4].toString(),
        C1: dates[0].toString(),
        C2: dates[1].toString(),
        C3: dates[2].toString(),
        C4: dates[3].toString(),
        C5: dates[4].toString(),
      };
      const cellValue = evaluateCell("A1", { ...grid, A1: `=XNPV(${rate}, B1:B5, C1:C5)` });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );

  test("can take multi-dimensional arrays as argument", () => {
    //prettier-ignore
    const singlColGrid = {
      B1: "1000", C1: "01/01/2018",
      B2: "-1000", C2: "01/01/2019",
      B3: "-2000", C3: "01/01/2020",
      B4: "-2000", C4: "01/01/2021",
    };
    const cellValue = evaluateCell("A1", { ...singlColGrid, A1: `=XNPV(0.1, B1:B4, C1:C4)` });
    expect(cellValue).toBeCloseTo(-3064.220752, 4);

    //prettier-ignore
    const singlRowGrid = {
      B1: "1000", C1: "-1000", D1: "-2000", E1: "-2000",
      B2: "01/01/2018", C2: "01/01/2019", D2: "01/01/2020", E2: "01/01/2021",
    };
    const cellValue2 = evaluateCell("A1", { ...singlRowGrid, A1: `=XNPV(0.1, B1:E1, B2:E2)` });
    expect(cellValue2).toBeCloseTo(-3064.220752, 4);

    //prettier-ignore
    const multiDimensionalGrid = {
      B1: "1000", C1: "-2000", D1: "01/01/2018", E1: "01/01/2020",
      B2: "-1000", C2: "-2000", D2: "01/01/2019", E2: "01/01/2021",
    };
    const cellValue3 = evaluateCell("A1", {
      ...multiDimensionalGrid,
      A1: `=XNPV(0.1, B1:C2, D1:E2)`,
    });
    expect(cellValue3).toBeCloseTo(-3064.220752, 4);
  });

  test("values with the same date are added together", () => {
    //prettier-ignore
    const grid1 = {
      B1: "1000", C1: "01/01/2018",
      B2: "-2000", C2: "01/01/2021",
      B3: "-6000", C3: "01/01/2021",
    };
    const cellValue = evaluateCell("A1", { ...grid1, A1: `=XNPV(0.1, B1:B3, C1:C3)` });
    expect(cellValue).toBeCloseTo(-5008.949123, 4);

    //prettier-ignore
    const grid2 = {
      B1: "1000", C1: "01/01/2018",
      B2: "-8000", C2: "01/01/2021",
    };
    const cellValue2 = evaluateCell("A1", { ...grid2, A1: `=XNPV(0.1, B1:B2, C1:C2)` });
    expect(cellValue2).toBeCloseTo(-5008.949123, 4);
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

describe("YIELDDISC formula", () => {
  test("take 4-5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=YIELDDISC()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, 1, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, 1, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("settlement is < maturity", () => {
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=YIELDDISC(2, 1, 1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("price, redemption are > 0", () => {
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, -1, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test("day_count_convention is between 0 and 4", () => {
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 2, 1, 1, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
    expect(evaluateCell("A1", { A1: "=YIELDDISC(1, 1, -1, 0, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #!NUM
  });

  test.each([
    ["01/01/2012", "05/01/2016", 10, 100, 0, 2.076923077],
    ["01/01/2012", "05/01/2016", 20, 100, 0, 0.923076923],
    ["01/01/2012", "05/01/2016", 50, 100, 0, 0.230769231],
    ["12/20/2014", "05/01/2016", 50, 68, 0, 0.26395112],
    ["12/20/2014", "05/01/2016", 50, 12, 0, -0.557230143],
    ["01/01/2012", "05/01/2016", 50, 68, 1, 0.083150442],
    ["01/01/2012", "05/01/2016", 20, 20, 1, 0],
    ["01/01/2012", "05/01/2016", 10, 89, 1, 1.824690265],
    ["01/01/2012", "05/01/2016", 50, 68, 1, 0.083150442],
    ["12/30/2014", "05/31/2016", 50, 1, 0, -0.691764706],
    ["12/30/2014", "05/31/2016", 50, 1, 1, -0.691171171],
    ["12/30/2014", "05/31/2016", 50, 1, 2, -0.681081081],
    ["12/30/2014", "05/31/2016", 50, 1, 3, -0.690540541],
    ["12/30/2014", "05/31/2016", 50, 1, 4, -0.691764706],
    ["02/29/2020", "07/31/2020", 100, 20, 0, -1.907284768],
    ["02/29/2020", "07/31/2020", 100, 20, 1, -1.91372549],
    ["02/29/2020", "07/31/2020", 100, 20, 2, -1.882352941],
    ["02/29/2020", "07/31/2020", 100, 20, 3, -1.908496732],
    ["02/29/2020", "07/31/2020", 100, 20, 4, -1.907284768],
    ["10/31/2005", "10/30/2010", 100, 20, 0, -0.16],
    ["10/31/2005", "10/30/2010", 100, 20, 1, -0.160073059],
    ["10/31/2005", "10/30/2010", 100, 20, 2, -0.157808219],
    ["10/31/2005", "10/30/2010", 100, 20, 3, -0.16],
    ["10/31/2005", "10/30/2010", 100, 20, 4, -0.16],
    ["12/05/2009", "02/28/2010", 100, 20, 0, -3.469879518],
    ["12/05/2009", "02/28/2010", 100, 20, 1, -3.435294118],
    ["12/05/2009", "02/28/2010", 100, 20, 2, -3.388235294],
    ["12/05/2009", "02/28/2010", 100, 20, 3, -3.435294118],
    ["12/05/2009", "02/28/2010", 100, 20, 4, -3.469879518],
    ["03/31/2008", "02/29/2012", 100, 20, 0, -0.204400284],
    ["03/31/2008", "02/29/2012", 100, 20, 1, -0.20441958],
    ["03/31/2008", "02/29/2012", 100, 20, 2, -0.201398601],
    ["03/31/2008", "02/29/2012", 100, 20, 3, -0.204195804],
    ["03/31/2008", "02/29/2012", 100, 20, 4, -0.204400284],
    ["03/30/2008", "02/28/2011", 100, 20, 0, -0.27480916],
    ["03/30/2008", "02/28/2011", 100, 20, 1, -0.274366197],
    ["03/30/2008", "02/28/2011", 100, 20, 2, -0.270422535],
    ["03/30/2008", "02/28/2011", 100, 20, 3, -0.274178404],
    ["03/30/2008", "02/28/2011", 100, 20, 4, -0.27480916],
  ])(
    "function result =YIELDDISC(%s, %s, %s, %s, %s)",
    (
      settlement: string,
      maturity: string,
      pr: number,
      redemption: number,
      basis: number,
      expectedResult: number
    ) => {
      const cellValue = evaluateCell("A1", {
        A1: `=YIELDDISC("${settlement}", "${maturity}", ${pr}, ${redemption}, ${basis})`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
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
