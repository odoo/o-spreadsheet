import { Model } from "../../src";
import { setCellContent, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  evaluateCell,
  evaluateCellFormat,
  evaluateGrid,
  evaluateGridText,
} from "../test_helpers/helpers";

// All these tests should pass no matter the machine timezone.

describe("DATE formula", () => {
  test("functional tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      // YEAR / MONTH / DAY
      A2:  "=DATE(B2 , C2 , D2 )",
      A3:  "=DATE(B3 , C3 , D3 )",                C3: "1"    , D3:  "1",
      A4:  "=DATE(B4 , C4 , D4 )", B4:  "2028"  , C4: "12"   , D4:  "5",
      // calculate numeric dates which fall outside of valid month or day ranges.
      A6:  "=DATE(B6 , C6 , D6 )", B6:  "2028"  , C6: "13"   , D6:  "5" ,
      A7:  "=DATE(B7 , C7 , D7 )", B7:  "2028"  , C7: "5"    , D7:  "87",
      A8:  "=DATE(B8 , C8 , D8 )", B8:  "2028"  , C8: "12"   , D8:  "5" ,
      // truncate decimal values input into the function.
      A10: "=DATE(B10, C10, D10)", B10: "2028"  , C10: "12.9", D10: "5"  ,
      A11: "=DATE(B11, C11, D11)", B11: "2028"  , C11: "12.9", D11: "5.6",
      A12: "=DATE(B12, C12, D12)", B12: "2028.5", C12: "12.9", D12: "5.6",
      // Between 0 and 1899, add value to 1900 to calculate the year.
      A14: "=DATE(B14, C14, D14)", B14: "119"   , C14: "12"  , D14: "5",
      A15: "=DATE(B15, C15, D15)", B15: "19"    , C15: "12"  , D15: "5",
      A16: "=DATE(B16, C16, D16)", B16: "1850"  , C16: "12"  , D16: "5",
      A17: "=DATE(B17, C17, D17)", B17: "1899"  , C17: "12"  , D17: "5",
      A18: "=DATE(B18, C18, D18)", B18: "1900"  , C18: "12"  , D18: "5",
      A19: "=DATE(B19, C19, D19)", B19: "12"    ,
      A20: "=DATE(B20, C20, D20)", B20: "1900"  , C20: "-24" , D20: "5",
      A21: "=DATE(B21, C21, D21)", B21: "2000"  , C21: "-22" , D21: "5",
      A22: "=DATE(B22, C22, D22)", B22: "1899"  , C22: "-22" , D22: "5",
      // For years less than 0 or greater than 10,000 return the #ERROR.
      A24: "=DATE(B24, C24, D24)", B24: "-2020" , C24: "12"  , D24: "5",
      A25: "=DATE(B25, C25, D25)", B25: "9999"  , C25: "12"  , D25: "5",
      A26: "=DATE(B26, C26, D26)", B26: "10000" , C26: "12"  , D26: "5",
      A27: "=DATE(B27, C27, D27)", B27: "-1"    , C27: "12"  , D27: "5",
      A28: "=DATE(B28, C28, D28)", B28: "0"     , C28: "12"  , D28: "5",
      A29: "=DATE(B29, C29, D29)", B29: "2000"  , C29: "-12" , D29: "-5",
      A30: "=DATE(B30, C30, D30)", B30: "0"     , C30: "-12" , D30: "-5",
    };

    const gridResult = evaluateGridText(grid);
    expect(gridResult.A2).toBe("#ERROR");
    expect(gridResult.A3).toBe("1/1/1900");
    expect(gridResult.A4).toBe("12/5/2028");
    expect(gridResult.A6).toBe("1/5/2029");
    expect(gridResult.A7).toBe("7/26/2028");
    expect(gridResult.A8).toBe("12/5/2028");
    expect(gridResult.A10).toBe("12/5/2028");
    expect(gridResult.A11).toBe("12/5/2028");
    expect(gridResult.A12).toBe("12/5/2028");
    expect(gridResult.A14).toBe("12/5/2019");
    expect(gridResult.A15).toBe("12/5/1919");
    expect(gridResult.A16).toBe("12/5/3750");
    expect(gridResult.A17).toBe("12/5/3799");
    expect(gridResult.A18).toBe("12/5/1900");
    expect(gridResult.A19).toBe("11/30/1911");
    expect(gridResult.A20).toBe("#ERROR");
    expect(gridResult.A21).toBe("2/5/1998");
    expect(gridResult.A22).toBe("2/5/3797");
    expect(gridResult.A24).toBe("#ERROR");
    expect(gridResult.A25).toBe("12/5/9999");
    expect(gridResult.A26).toBe("#ERROR");
    expect(gridResult.A27).toBe("#ERROR");
    expect(gridResult.A28).toBe("12/5/1900");
    expect(gridResult.A29).toBe("11/25/1998");
    expect(gridResult.A30).toBe("#ERROR");
  });

  test("DATE: casting tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      A33: "=DATE(B33, C33, D33)", B33: "2028", C33:"12", D33:'="5"'  ,
      A34: "=DATE(B34, C34, D34)", B34: "2028", C34:"12", D34:"TRUE"  ,
      A35: "=DATE(B35, C35, D35)", B35: "TRUE", C35:"12", D35:"TRUE"  ,
      A36: "=DATE(B36, C36, D36)", B36: '="5"', C36:"12", D36:"TRUE"  ,
    };

    const gridResult = evaluateGridText(grid);
    expect(gridResult.A33).toBe("12/5/2028");
    expect(gridResult.A34).toBe("12/1/2028");
    expect(gridResult.A35).toBe("12/1/1901");
    expect(gridResult.A36).toBe("12/1/1905");
  });

  test("return value with formatting", () => {
    expect(
      evaluateCellFormat("A1", { A1: "=DATE(B1, C1, D1)", B1: "2028", C1: "12", D1: "5" })
    ).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=DATE(2020, 12, 5)");
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("DATEDIF formula", () => {
  test("takes 3 arguments", () => {
    // @compatibility: on google sheets, all return #N/A
    expect(evaluateCell("A1", { A1: "=DATEDIF()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01","2001/01/02")' })).toBe("#BAD_EXPR");
  });

  test("the first two arguments can be functions returning a DATE, or numbers", () => {
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01","2001/01/02","D")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001-01-01","2001-01-02","D")' })).toBe(1);
    expect(
      evaluateCell("A1", { A1: '=DATEDIF("2001/01/01 23:10:30","2001/01/02 02:09:31","D")' })
    ).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF(Date(2001,1,1),"2001/01/02","D")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01",Date(2001,1,2),"D")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF(1,2,"D")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF(1.1,1.2,"D")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DATEDIF(FALSE,TRUE,"D")' })).toBe(1);
  });

  test("the first two arguments can be references to cells with DATE", () => {
    expect(
      evaluateCell("A3", {
        A1: "=DATE(2002,1,1)",
        A2: "=DATE(2002,1,2)",
        A3: '=DATEDIF(A1,A2,"D")',
      })
    ).toBe(1);
  });

  test("invalid first two arguments", () => {
    expect(evaluateCell("A1", { A1: '=DATEDIF("ABC","CDE","D")' })).toBe("#ERROR"); // @compatibility: on google sheets, all return #VALUE
  });

  test("start_date has to be on or before end_date", () => {
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01","2000/12/31","D")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM
  });

  test("unit has to be one of the pre-defined units", () => {
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01","2001/01/02",123)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/01/01","2001/01/02","ABC")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM
  });

  test("functional tests on units", () => {
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","D")' })).toBe(633);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","M")' })).toBe(20);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","Y")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","YM")' })).toBe(8);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","MD")' })).toBe(26);
    expect(evaluateCell("A1", { A1: '=DATEDIF("2001/09/15","2003/06/10","YD")' })).toBe(268);
  });
});

describe("DATEVALUE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=DATEVALUE(40931)" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: "=DATEVALUE(1/23/2012)" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: '=DATEVALUE("1/23/2012")' })).toBe(40931);
    expect(evaluateCell("A1", { A1: '=DATEVALUE("1/23/2012 8:10:30")' })).toBe(40931);
    expect(evaluateCell("A1", { A1: '=DATEVALUE("2012/1/23")' })).toBe(40931);
    expect(evaluateCell("A1", { A1: '=DATEVALUE("2012-1-23")' })).toBe(40931);
    expect(evaluateCell("A1", { A1: '=DATEVALUE("1/23/2012")' })).toBe(40931);
    expect(evaluateCell("A1", { A1: '=DATEVALUE("13/8/1999")' })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DATEVALUE(A2)", A2: "36380" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: "=DATEVALUE(A2)", A2: "8/8/1999" })).toBe("#ERROR"); // @compatibility, retrun 8/8/1999 on Google Sheet
    expect(evaluateCell("A1", { A1: "=DATEVALUE(A2)", A2: "13/8/1999" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
  });
});

describe("DAY formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=DAY("3/28/2017")' })).toBe(28);
    expect(evaluateCell("A1", { A1: '=DAY("5/31/2012")' })).toBe(31);
    expect(evaluateCell("A1", { A1: '=DAY("41060")' })).toBe(31);
    expect(evaluateCell("A1", { A1: "=DAY(41060)" })).toBe(31);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DAY(A2)", A2: "5/31/2012" })).toBe(31);
    expect(evaluateCell("A1", { A1: "=DAY(A2)", A2: "41060" })).toBe(31);
  });
});

describe("DAYS formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=DAYS("2/13/2015", "2/23/2014")',
      A2: '=DAYS("7/15/2020", "7/16/2016")',
      A3: '=DAYS("2/23/1234", "2/13/1245")',
      A4: '=DAYS("7/17/2016", "7/16/2016")',
      A5: '=DAYS("7/18/2016", "7/16/2016")',
      A6: '=DAYS("7/16/2017", "7/16/2016")',
      A7: '=DAYS("7/16/2020", "7/16/2019")',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe(355);
    expect(gridResult.A2).toBe(1460);
    expect(gridResult.A3).toBe(-4008);
    expect(gridResult.A4).toBe(1);
    expect(gridResult.A5).toBe(2);
    expect(gridResult.A6).toBe(365);
    expect(gridResult.A7).toBe(366);
  });
});

describe("DAYS360 function", () => {
  test("DAYS360 takes 2-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=DAYS360()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DAYS360(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DAYS360(0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DAYS360(0, 0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DAYS360(0, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test.each([
    ["01/30/2006", "12/31/2006", "FALSE", 330],
    ["01/30/2006", "12/01/2006", "FALSE", 301],
    ["01/30/2004", "01/01/2002", "FALSE", -749],
    ["02/28/2002", "03/01/2002", "FALSE", 1],
    ["01/01/2000", "10/05/2022", "FALSE", 8194],
    ["01/30/2006", "12/31/2006", "FALSE", 330],
    ["02/28/2006", "03/10/2006", "TRUE", 12],
    ["02/28/2006", "03/10/2006", "FALSE", 10],
    ["02/28/2008", "03/10/2008", "TRUE", 12],
    ["02/28/2008", "03/10/2008", "FALSE", 12],
    ["03/01/2008", "02/28/2008", "TRUE", -3],
    ["03/01/2008", "02/28/2008", "FALSE", -3],
    ["03/01/2008", "02/29/2008", "TRUE", -2],
    ["03/01/2008", "02/28/2008", "FALSE", -3],
    ["03/31/2008", "04/30/2008", "TRUE", 30],
    ["03/31/2008", "04/30/2008", "FALSE", 30],
  ])(
    "function result =DASY360(%s, %s, %s)",
    (startDate: string, endDate: string, method: string, expectedResult: number) => {
      const cellValue = evaluateCell("A1", {
        A1: `=DAYS360("${startDate}", "${endDate}", "${method}")`,
      });
      expect(cellValue).toBeCloseTo(expectedResult, 4);
    }
  );
});

describe("EDATE formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=EDATE("7/20/1969", 0)',
      A2: '=EDATE("7/21/1969", 1)',
      A3: '=EDATE("7/22/1969", -2)',
      A4: '=EDATE("7/23/1969", -13)',
      A5: '=EDATE("7/24/1969", 1234)',
      A6: '=EDATE("7/21/1969", 1.9)',
      A7: '=EDATE("12/31/2005", -6)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("7/20/1969");
    expect(gridResult.A2).toBe("8/21/1969");
    expect(gridResult.A3).toBe("5/22/1969");
    expect(gridResult.A4).toBe("6/23/1968");
    expect(gridResult.A5).toBe("5/24/2072");
    expect(gridResult.A6).toBe("8/21/1969");
    expect(gridResult.A7).toBe("6/30/2005");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A7: '=EDATE("7/21/1969", "1")',
      A8: '=EDATE("7/21/1969", True)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A7).toBe("8/21/1969");
    expect(gridResult.A8).toBe("8/21/1969");
  });

  test("return value with formatting", () => {
    expect(evaluateCellFormat("A1", { A1: '=EDATE("7/21/1969", 1)' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=EDATE("7/7/1969", 1)');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("EOMONTH formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=EOMONTH("7/20/2020", 0)',
      A2: '=EOMONTH("7/21/2020", 1)',
      A3: '=EOMONTH("7/22/2020", -2)',
      A4: '=EOMONTH("7/23/2020", -5)',
      A5: '=EOMONTH("7/24/2020", 1234)',
      A6: '=EOMONTH("7/25/2020", 1.9)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("7/31/2020");
    expect(gridResult.A2).toBe("8/31/2020");
    expect(gridResult.A3).toBe("5/31/2020");
    expect(gridResult.A4).toBe("2/29/2020");
    expect(gridResult.A5).toBe("5/31/2123");
    expect(gridResult.A6).toBe("8/31/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A7: '=EOMONTH("7/21/1920", "1")',
      A8: '=EOMONTH("7/21/2020", True)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A7).toBe("8/31/1920");
    expect(gridResult.A8).toBe("8/31/2020");
  });

  test("return value with formatting", () => {
    expect(evaluateCellFormat("A1", { A1: '=EOMONTH("7/20/2020", 0)' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=EOMONTH("7/7/2020", 0)');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("HOUR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=HOUR("11:23:13")' })).toBe(11);
    expect(evaluateCell("A1", { A1: '=HOUR("2020 12 12 23:40:12")' })).toBe(23);
    expect(evaluateCell("A1", { A1: '=HOUR("3:00")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=HOUR("2015 01 01")' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=HOUR(0.125)" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=HOUR(12345.125)" })).toBe(3);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=HOUR(A2)", A2: "11:23:13" })).toBe(11);
    expect(evaluateCell("A1", { A1: "=HOUR(A2)", A2: "2020 12 12 23:40:12" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=HOUR(A2)", A2: "0.25" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=HOUR(A2)", A2: "54321.5" })).toBe(12);
  });
});

describe("ISOWEEKNUM formula", () => {
  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/1/2016" })).toBe(53);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/3/2016" })).toBe(53);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/4/2016" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/1/2017" })).toBe(52);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/2/2017" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/1/2018" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/7/2018" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/8/2018" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/1/2020" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/5/2020" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/6/2020" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/1/2021" })).toBe(53);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/3/2021" })).toBe(53);
    expect(evaluateCell("A1", { A1: "=ISOWEEKNUM(A2)", A2: "1/4/2021" })).toBe(1);
  });
});

describe("MINUTE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=MINUTE("11:23:13")' })).toBe(23);
    expect(evaluateCell("A1", { A1: '=MINUTE("2020 12 12 23:40:12")' })).toBe(40);
    expect(evaluateCell("A1", { A1: '=MINUTE("0:21")' })).toBe(21);
    expect(evaluateCell("A1", { A1: '=MINUTE("2015 01 01")' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUTE(0.126)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINUTE(12345.129)" })).toBe(5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUTE(A2)", A2: "11:23:13" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=MINUTE(A2)", A2: "2020 12 12 23:40:12" })).toBe(40);
    expect(evaluateCell("A1", { A1: "=MINUTE(A2)", A2: "0.2532" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=MINUTE(A2)", A2: "54321.789" })).toBe(56);
  });
});

describe("MONTH formula", () => {
  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "1/2/1954" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "5/13/1954" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "43964" })).toBe(5); // 43964 corespond to 5/13/195
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "0" })).toBe(12); // 0 corespond to 12/30/1899
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "1" })).toBe(12); // 1 corespond to 12/31/1899
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "2" })).toBe(1); // 2 corespond to 1/1/1900
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: '="43964"' })).toBe(5);
    expect(evaluateCell("A1", { A1: "=MONTH(A2)", A2: "TRUE" })).toBe(12);
  });
});

describe("NETWORKDAYS formula", () => {
  test("functional tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "1/1/2013",  A2: "1/21/2013", A3: "2/18/2013",   A4: "5/27/2013",
      A5: "1/21/2013", A6: "1/12/2013", A7: "Hello there", A8: "1/1/2015",

      A15: "1/1/2013", B15: "2/1/2013", C15: "=NETWORKDAYS(A15,B15)",
      A16: "1/1/2013", B16: "2/1/2013", C16: "=NETWORKDAYS(A16,B16,A1:A5)",
      A17: "3/1/2013", B17: "7/1/2013", C17: '=NETWORKDAYS("3/1/2013","7/1/2013",A1:A5)',
      A18: "2/1/2013", B18: "1/1/2013", C18: "=NETWORKDAYS(A18,B18)",
      A19: "1/1/2013", B19: "1/2/2013", C19: "=NETWORKDAYS(A19,B19)",
      A20: "1/1/2013", B20: "2/1/2013", C20: "=NETWORKDAYS(A20,B20,A1)",
      A21: "1/1/2013", B21: "2/1/2013", C21: "=NETWORKDAYS(A21,B21,A1,A2)",
      A22: "1/1/2013", B22: "2/1/2013", C22: "=NETWORKDAYS(A22,B22,A6:A7)",
      A23: "1/1/2013", B23: "2/1/2013", C23: "=NETWORKDAYS(A23,B23,A6)",
      A24: "1/1/2013", B24: "2/1/2013", C24: "=NETWORKDAYS(A24,B24,A8)",
    };
    const gridResult = evaluateGrid(grid);

    expect(gridResult.C15).toBe(24);
    expect(gridResult.C16).toBe(22);
    expect(gridResult.C17).toBe(86);
    expect(gridResult.C18).toBe(-24);
    expect(gridResult.C19).toBe(2);
    expect(gridResult.C20).toBe(23);
    expect(gridResult.C21).toBe("#BAD_EXPR"); // @compatibility on Google Sheets, return  #N/A
    expect(gridResult.C22).toBe("#ERROR"); // @compatibility on Google Sheets, return  #VALUE!
    expect(gridResult.C23).toBe(24);
    expect(gridResult.C24).toBe(24);
  });
});

describe("NETWORKDAYS.INTL formula", () => {
  test("functional tests on cell arguments, string method", () => {
    // prettier-ignore
    const grid = {
      B2:  "5/4/2020", C2:  "5/17/2020", D2:  "=NETWORKDAYS.INTL(B2, C2)",
      B3:  "5/4/2020", C3:  "5/17/2020", D3:  '=NETWORKDAYS.INTL(B3, C3, "0")',
      B4:  "5/4/2020", C4:  "5/17/2020", D4:  '=NETWORKDAYS.INTL(B4, C4, "00")',
      B5:  "5/4/2020", C5:  "5/17/2020", D5:  '=NETWORKDAYS.INTL(B5, C5, "000000")',
      B6:  "5/4/2020", C6:  "5/17/2020", D6:  '=NETWORKDAYS.INTL(B6, C6, "0000000")',
      B7:  "5/4/2020", C7:  "5/17/2020", D7:  '=NETWORKDAYS.INTL(B7, C7, "0000011")',
      B8:  "5/4/2020", C8:  "5/17/2020", D8:  '=NETWORKDAYS.INTL(B8, C8, "0000111")',
      B9:  "5/4/2020", C9:  "5/17/2020", D9:  '=NETWORKDAYS.INTL(B9, C9, "1000111")',
      B10: "5/4/2020", C10: "5/17/2020", D10: '=NETWORKDAYS.INTL(B10, C10, "1110111")',
      B11: "5/4/2020", C11: "5/17/2020", D11: '=NETWORKDAYS.INTL(B11, C11, "1111111")',
      B12: "5/4/2020", C12: "5/17/2020", D12: '=NETWORKDAYS.INTL(B12, C12, "1000211")',
                       C13: "5/17/2020", D13: '=NETWORKDAYS.INTL(B13, C13, "0000000")',
      B14: "5/4/2020",                   D14: '=NETWORKDAYS.INTL(B14, C14, "0000000")',

      B75: "5/4/2020", C75: "5/17/2020", D75: '=NETWORKDAYS.INTL(B75, C75, "0000000")',
      B76: "5/4/2020", C76: "5/8/2020" , D76: '=NETWORKDAYS.INTL(B76, C76, "0000011")',
      B77: "5/9/2020", C77: "5/10/2020", D77: '=NETWORKDAYS.INTL(B77, C77, "0000011")',
      B78: "5/4/2020", C78: "5/8/2020" , D78: '=NETWORKDAYS.INTL(B78, C78, "0000111")',
      B79: "5/8/2020", C79: "5/10/2020", D79: '=NETWORKDAYS.INTL(B79, C79, "0000111")',
      B80: "5/5/2020", C80: "5/7/2020" , D80: '=NETWORKDAYS.INTL(B80, C80, "1000111")',
      B81: "5/8/2020", C81: "5/11/2020", D81: '=NETWORKDAYS.INTL(B81, C81, "1000111")',
      B82: "5/7/2020", C82: "5/7/2020" , D82: '=NETWORKDAYS.INTL(B82, C82, "1110111")',
      B83: "5/8/2020", C83: "5/12/2020", D83: '=NETWORKDAYS.INTL(B83, C83, "1110111")',

    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.D2).toBe(10);
    expect(gridResult.D3).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D4).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D5).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D6).toBe(14);
    expect(gridResult.D7).toBe(10);
    expect(gridResult.D8).toBe(8);
    expect(gridResult.D9).toBe(6);
    expect(gridResult.D10).toBe(2);
    expect(gridResult.D11).toBe(0); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D12).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    // To do:
    //expect(gridResult.D13).toBe(43969);
    //expect(gridResult.D14).toBe(-43956);

    expect(gridResult.D75).toBe(14);
    expect(gridResult.D76).toBe(5);
    expect(gridResult.D77).toBe(0);
    expect(gridResult.D78).toBe(4);
    expect(gridResult.D79).toBe(0);
    expect(gridResult.D80).toBe(3);
    expect(gridResult.D81).toBe(0);
    expect(gridResult.D82).toBe(1);
    expect(gridResult.D83).toBe(0);
  });

  test("functional tests on cell arguments, number method", () => {
    // prettier-ignore
    const grid = {
      B18: "5/4/2020",  C18: "5/17/2020", D18: '=NETWORKDAYS.INTL(B18, C18, 0)',
      B19: "5/9/2020",  C19: "5/10/2020", D19: '=NETWORKDAYS.INTL(B19, C19, 1)',
      B20: "5/10/2020", C20: "5/11/2020", D20: '=NETWORKDAYS.INTL(B20, C20, 1)',
      B21: "5/10/2020", C21: "5/11/2020", D21: '=NETWORKDAYS.INTL(B21, C21, 2)',
      B22: "5/11/2020", C22: "5/12/2020", D22: '=NETWORKDAYS.INTL(B22, C22, 2)',
      B23: "5/11/2020", C23: "5/12/2020", D23: '=NETWORKDAYS.INTL(B23, C23, 3)',
      B24: "5/12/2020", C24: "5/13/2020", D24: '=NETWORKDAYS.INTL(B24, C24, 3)',
      B25: "5/12/2020", C25: "5/13/2020", D25: '=NETWORKDAYS.INTL(B25, C25, 4)',
      B26: "5/13/2020", C26: "5/14/2020", D26: '=NETWORKDAYS.INTL(B26, C26, 4)',
      B27: "5/13/2020", C27: "5/14/2020", D27: '=NETWORKDAYS.INTL(B27, C27, 5)',
      B28: "5/14/2020", C28: "5/15/2020", D28: '=NETWORKDAYS.INTL(B28, C28, 5)',
      B29: "5/14/2020", C29: "5/15/2020", D29: '=NETWORKDAYS.INTL(B29, C29, 6)',
      B30: "5/15/2020", C30: "5/16/2020", D30: '=NETWORKDAYS.INTL(B30, C30, 6)',
      B31: "5/15/2020", C31: "5/16/2020", D31: '=NETWORKDAYS.INTL(B31, C31, 7)',
      B32: "5/16/2020", C32: "5/17/2020", D32: '=NETWORKDAYS.INTL(B32, C32, 7)',
      B33: "5/16/2020", C33: "5/17/2020", D33: '=NETWORKDAYS.INTL(B33, C33, 8)',

      B39: "5/4/2020",  C39: "5/17/2020", D39: '=NETWORKDAYS.INTL(B39, C39, 10)',
      B40: "5/9/2020",  C40: "5/9/2020" , D40: '=NETWORKDAYS.INTL(B40, C40, 11)',
      B41: "5/10/2020", C41: "5/10/2020", D41: '=NETWORKDAYS.INTL(B41, C41, 11)',
      B42: "5/10/2020", C42: "5/10/2020", D42: '=NETWORKDAYS.INTL(B42, C42, 12)',
      B43: "5/11/2020", C43: "5/11/2020", D43: '=NETWORKDAYS.INTL(B43, C43, 12)',
      B44: "5/11/2020", C44: "5/11/2020", D44: '=NETWORKDAYS.INTL(B44, C44, 13)',
      B45: "5/12/2020", C45: "5/12/2020", D45: '=NETWORKDAYS.INTL(B45, C45, 13)',
      B46: "5/12/2020", C46: "5/12/2020", D46: '=NETWORKDAYS.INTL(B46, C46, 14)',
      B47: "5/13/2020", C47: "5/13/2020", D47: '=NETWORKDAYS.INTL(B47, C47, 14)',
      B48: "5/13/2020", C48: "5/13/2020", D48: '=NETWORKDAYS.INTL(B48, C48, 15)',
      B49: "5/14/2020", C49: "5/14/2020", D49: '=NETWORKDAYS.INTL(B49, C49, 15)',
      B50: "5/14/2020", C50: "5/14/2020", D50: '=NETWORKDAYS.INTL(B50, C50, 16)',
      B51: "5/15/2020", C51: "5/15/2020", D51: '=NETWORKDAYS.INTL(B51, C51, 16)',
      B52: "5/15/2020", C52: "5/15/2020", D52: '=NETWORKDAYS.INTL(B52, C52, 17)',
      B53: "5/16/2020", C53: "5/16/2020", D53: '=NETWORKDAYS.INTL(B53, C53, 17)',
      B54: "5/16/2020", C54: "5/16/2020", D54: '=NETWORKDAYS.INTL(B54, C54, 18)',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.D18).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D19).toBe(0);
    expect(gridResult.D20).toBe(1);
    expect(gridResult.D21).toBe(0);
    expect(gridResult.D22).toBe(1);
    expect(gridResult.D23).toBe(0);
    expect(gridResult.D24).toBe(1);
    expect(gridResult.D25).toBe(0);
    expect(gridResult.D26).toBe(1);
    expect(gridResult.D27).toBe(0);
    expect(gridResult.D28).toBe(1);
    expect(gridResult.D29).toBe(0);
    expect(gridResult.D30).toBe(1);
    expect(gridResult.D31).toBe(0);
    expect(gridResult.D32).toBe(1);
    expect(gridResult.D33).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!

    expect(gridResult.D39).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D40).toBe(1);
    expect(gridResult.D41).toBe(0);
    expect(gridResult.D42).toBe(1);
    expect(gridResult.D43).toBe(0);
    expect(gridResult.D44).toBe(1);
    expect(gridResult.D45).toBe(0);
    expect(gridResult.D46).toBe(1);
    expect(gridResult.D47).toBe(0);
    expect(gridResult.D48).toBe(1);
    expect(gridResult.D49).toBe(0);
    expect(gridResult.D50).toBe(1);
    expect(gridResult.D51).toBe(0);
    expect(gridResult.D52).toBe(1);
    expect(gridResult.D53).toBe(0);
    expect(gridResult.D54).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
  });

  test("casting tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      B68: "5/4/2020",  C68: "5/17/2020", D68: '=NETWORKDAYS.INTL(B68, C68, 1110111)',
      B69: "5/5/2020",  C69: "5/18/2020", D69: '=NETWORKDAYS.INTL(B69, C69, "test")',
      B70: "5/11/2020", C70: "5/12/2020", D70: '=NETWORKDAYS.INTL(B70, C70, "2")',
      B71: "5/11/2020", C71: "5/12/2020", D71: '=NETWORKDAYS.INTL(B71, C71, A71)',
      B72: "5/11/2020", C72: "5/17/2020", D72: '=NETWORKDAYS.INTL(B72, C72)',
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.D68).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D69).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D70).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D71).toBe("#ERROR"); // @compatibility on Google Sheets, return  #VALUE!
    expect(gridResult.D72).toBe(5);
  });
});

describe("NOW formula", () => {
  const MockDate = require("mockdate");

  test("functional tests on simple arguments", async () => {
    MockDate.set(new Date(2042, 3, 2, 4, 7, 30, 999));
    expect(evaluateCell("A1", { A1: "=NOW()" })).toBe(51958.171875);
    MockDate.reset();
  });

  test("return value with formatting", async () => {
    MockDate.set(new Date(2042, 3, 2, 4, 7, 30, 999));
    expect(evaluateCellFormat("A1", { A1: "=NOW()" })).toBe("m/d/yyyy hh:mm:ss a");
    MockDate.reset();
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=NOW()");
    expect(getEvaluatedCell(model, "A1").format).toBe("dd/mm/yyyy hh:mm:ss");
  });
});

describe("SECOND formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=SECOND("11:23:13")' })).toBe(13);
    expect(evaluateCell("A1", { A1: '=SECOND("2020 12 12 23:40:12")' })).toBe(12);
    expect(evaluateCell("A1", { A1: '=SECOND("0:21:42")' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=SECOND("2015 01 01")' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SECOND(0.126)" })).toBe(26);
    expect(evaluateCell("A1", { A1: "=SECOND(12345.129)" })).toBe(46);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SECOND(A2)", A2: "11:23:13" })).toBe(13);
    expect(evaluateCell("A1", { A1: "=SECOND(A2)", A2: "2020 12 12 23:40:12" })).toBe(12);
    expect(evaluateCell("A1", { A1: "=SECOND(A2)", A2: "0.2532" })).toBe(36);
    expect(evaluateCell("A1", { A1: "=SECOND(A2)", A2: "54321.789" })).toBe(10);
  });
});

describe("TIME formula", () => {
  test("functional tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      A1:   "=TIME(B1,  C1,   D1 )",  B1:  "9",  C1:  "11",  D1:  "31",
      A2:   "=TIME(B2,  C2,   D2 )",  B2:  "14", C2:  "59",  D2:  "59",
      A3:   "=TIME(B3,  C3,   D3 )",  B3:  "26", C3:  "0",   D3:  "0",
      A4:   "=TIME(B4,  C4,   D4 )",  B4:  "26", C4:  "60",  D4:  "60",
      A5:   "=TIME(B5,  C5,   D5 )",  B5:  "13", C5:  "61",  D5:  "20",
      A6:   "=TIME(B6,  C6,   D6 )",  B6:  "16", C6:  "49",  D6:  "62",
      A7:   "=TIME(B7,  C7,   D7 )",  B7:  "26", C7:  "61",  D7:  "62",
      A8:   "=TIME(B8,  C8,   D8 )",  B8:  "26", C8:  "61",  D8:  "62",
      A9:   "=TIME(B9,  C9,   D9 )",  B9:  "14", C9:  "59",  D9:  "-59",
      A10:  "=TIME(B10, C10,  D10 )", B10: "14", C10: "-5",  D10: "-59",
      A11:  "=TIME(B11, C11,  D11 )", B11: "1",  C11: "-61", D11: "-61",
    };

    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("09:11:31 AM"); // @compatibility on Google Sheet return 9:11:31 AM
    expect(gridResult.A2).toBe("02:59:59 PM"); // @compatibility on Google Sheet return 2:59:59 PM
    expect(gridResult.A3).toBe("02:00:00 AM"); // @compatibility on Google Sheet return 2:00:00 AM
    expect(gridResult.A4).toBe("03:01:00 AM"); // @compatibility on Google Sheet return 3:01:00 AM
    expect(gridResult.A5).toBe("02:01:20 PM"); // @compatibility on Google Sheet return 2:01:20 PM
    expect(gridResult.A6).toBe("04:50:02 PM"); // @compatibility on Google Sheet return 4:50:02 PM
    expect(gridResult.A7).toBe("03:02:02 AM"); // @compatibility on Google Sheet return 3:02:02 AM
    expect(gridResult.A8).toBe("03:02:02 AM"); // @compatibility on Google Sheet return 3:02:02 AM
    expect(gridResult.A9).toBe("02:58:01 PM"); // @compatibility on Google Sheet return 2:58:01 PM
    expect(gridResult.A10).toBe("01:54:01 PM"); // @compatibility on Google Sheet return 1:54:01 PM
    expect(gridResult.A11).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: "=TIME(9, 11, 31)" })).toBe("hh:mm:ss a");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=TIME(9, 9, 9)");
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.timeFormat);
  });
});

describe("TIMEVALUE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TIMEVALUE(40931.5678)" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: "=TIMEVALUE(1/23/2012)" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: '=TIMEVALUE("1/23/2012")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=TIMEVALUE("1/23/2012 12:09:00")' })).toBeCloseTo(0.50625, 5);
    expect(evaluateCell("A1", { A1: '=TIMEVALUE("1899 10 08 18:00")' })).toBe(0.75);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=TIMEVALUE(A2)", A2: "36380.5678" })).toBe("#ERROR"); // @compatibility, retrun #VALUE! on Google Sheet
    expect(evaluateCell("A1", { A1: "=TIMEVALUE(A2)", A2: "8/8/1999 12:09:00" })).toBe("#ERROR"); // @compatibility, retrun 8/8/1999 on Google Sheet
  });
});

describe("TODAY formula", () => {
  const MockDate = require("mockdate");
  test("functional tests on simple arguments", async () => {
    MockDate.set(new Date(2042, 3, 2, 4, 7, 30, 999));
    expect(evaluateCell("A1", { A1: "=TODAY()" })).toBe(51958);
    MockDate.reset();
  });

  test("return value with formatting", async () => {
    MockDate.set(new Date(2042, 3, 2, 4, 7, 30, 999));
    expect(evaluateCellFormat("A1", { A1: "=TODAY()" })).toBe("m/d/yyyy");
    MockDate.reset();
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=TODAY()");
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("WEEKDAY formula", () => {
  test("functional tests on cell arguments, option 1", () => {
    // prettier-ignore
    const grid = {
      A3: "1/1/2020", B3: "1", C3: "=WEEKDAY(A3,B3)",
      A4: "1/2/2020", B4: "1", C4: "=WEEKDAY(A4,B4)",
      A5: "1/3/2020", B5: "1", C5: "=WEEKDAY(A5,B5)",
      A6: "1/4/2020", B6: "1", C6: "=WEEKDAY(A6,B6)",
      A7: "1/5/2020", B7: "1", C7: "=WEEKDAY(A7,B7)",
      A8: "1/6/2020", B8: "1", C8: "=WEEKDAY(A8,B8)",
      A9: "1/7/2020", B9: "1", C9: "=WEEKDAY(A9,B9)",
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.C3).toBe(4);
    expect(gridResult.C4).toBe(5);
    expect(gridResult.C5).toBe(6);
    expect(gridResult.C6).toBe(7);
    expect(gridResult.C7).toBe(1);
    expect(gridResult.C8).toBe(2);
    expect(gridResult.C9).toBe(3);
  });

  test("functional tests on cell arguments, option 2", () => {
    // prettier-ignore
    const grid = {
      A11: "1/1/2020", B11: "2", C11: "=WEEKDAY(A11,B11)",
      A12: "1/2/2020", B12: "2", C12: "=WEEKDAY(A12,B12)",
      A13: "1/3/2020", B13: "2", C13: "=WEEKDAY(A13,B13)",
      A14: "1/4/2020", B14: "2", C14: "=WEEKDAY(A14,B14)",
      A15: "1/5/2020", B15: "2", C15: "=WEEKDAY(A15,B15)",
      A16: "1/6/2020", B16: "2", C16: "=WEEKDAY(A16,B16)",
      A17: "1/7/2020", B17: "2", C17: "=WEEKDAY(A17,B17)",
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.C11).toBe(3);
    expect(gridResult.C12).toBe(4);
    expect(gridResult.C13).toBe(5);
    expect(gridResult.C14).toBe(6);
    expect(gridResult.C15).toBe(7);
    expect(gridResult.C16).toBe(1);
    expect(gridResult.C17).toBe(2);
  });

  test("functional tests on cell arguments, option 3", () => {
    // prettier-ignore
    const grid = {
      A19: "1/1/2020", B19: "3", C19: "=WEEKDAY(A19,B19)",
      A20: "1/2/2020", B20: "3", C20: "=WEEKDAY(A20,B20)",
      A21: "1/3/2020", B21: "3", C21: "=WEEKDAY(A21,B21)",
      A22: "1/4/2020", B22: "3", C22: "=WEEKDAY(A22,B22)",
      A23: "1/5/2020", B23: "3", C23: "=WEEKDAY(A23,B23)",
      A24: "1/6/2020", B24: "3", C24: "=WEEKDAY(A24,B24)",
      A25: "1/7/2020", B25: "3", C25: "=WEEKDAY(A25,B25)",
    };
    const gridResult = evaluateGrid(grid);
    expect(gridResult.C19).toBe(2);
    expect(gridResult.C20).toBe(3);
    expect(gridResult.C21).toBe(4);
    expect(gridResult.C22).toBe(5);
    expect(gridResult.C23).toBe(6);
    expect(gridResult.C24).toBe(0);
    expect(gridResult.C25).toBe(1);
  });
});

describe("WEEKNUM formula", () => {
  test("functional tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      A11: "12/31/2019", B11: "1" , C11: "=WEEKNUM(A11, B11)",
      A12: "1/1/2020"  , B12: "1" , C12: "=WEEKNUM(A12, B12)",
      A13: "1/4/2020"  , B13: "1" , C13: "=WEEKNUM(A13, B13)",
      A14: "1/5/2020"  , B14: "1" , C14: "=WEEKNUM(A14, B14)",
      A15: "12/31/2019", B15: "2" , C15: "=WEEKNUM(A15, B15)",
      A16: "1/1/2020"  , B16: "2" , C16: "=WEEKNUM(A16, B16)",
      A17: "1/5/2020"  , B17: "2" , C17: "=WEEKNUM(A17, B17)",
      A18: "1/6/2020"  , B18: "2" , C18: "=WEEKNUM(A18, B18)",
      A19: "12/31/2019", B19: "11", C19: "=WEEKNUM(A19, B19)",
      A20: "1/1/2020"  , B20: "11", C20: "=WEEKNUM(A20, B20)",
      A21: "1/5/2020"  , B21: "11", C21: "=WEEKNUM(A21, B21)",
      A22: "1/6/2020"  , B22: "11", C22: "=WEEKNUM(A22, B22)",
      A23: "12/31/2019", B23: "12", C23: "=WEEKNUM(A23, B23)",
      A24: "1/1/2020"  , B24: "12", C24: "=WEEKNUM(A24, B24)",
      A25: "1/6/2020"  , B25: "12", C25: "=WEEKNUM(A25, B25)",
      A26: "1/7/2020"  , B26: "12", C26: "=WEEKNUM(A26, B26)",
      A27: "12/31/2019", B27: "13", C27: "=WEEKNUM(A27, B27)",
      A28: "1/1/2020"  , B28: "13", C28: "=WEEKNUM(A28, B28)",
      A29: "1/7/2020"  , B29: "13", C29: "=WEEKNUM(A29, B29)",
      A30: "1/8/2020"  , B30: "13", C30: "=WEEKNUM(A30, B30)",
      A31: "12/31/2019", B31: "14", C31: "=WEEKNUM(A31, B31)",
      A32: "1/1/2020"  , B32: "14", C32: "=WEEKNUM(A32, B32)",
      A33: "1/2/2020"  , B33: "14", C33: "=WEEKNUM(A33, B33)",
      A34: "12/31/2019", B34: "15", C34: "=WEEKNUM(A34, B34)",
      A35: "1/1/2020"  , B35: "15", C35: "=WEEKNUM(A35, B35)",
      A36: "1/2/2020"  , B36: "15", C36: "=WEEKNUM(A36, B36)",
      A37: "1/3/2020"  , B37: "15", C37: "=WEEKNUM(A37, B37)",
      A38: "12/31/2019", B38: "16", C38: "=WEEKNUM(A38, B38)",
      A39: "1/1/2020"  , B39: "16", C39: "=WEEKNUM(A39, B39)",
      A40: "1/3/2020"  , B40: "16", C40: "=WEEKNUM(A40, B40)",
      A41: "1/4/2020"  , B41: "16", C41: "=WEEKNUM(A41, B41)",
      A42: "12/31/2019", B42: "17", C42: "=WEEKNUM(A42, B42)",
      A43: "1/1/2020"  , B43: "17", C43: "=WEEKNUM(A43, B43)",
      A44: "1/4/2020"  , B44: "17", C44: "=WEEKNUM(A44, B44)",
      A45: "1/5/2020"  , B45: "17", C45: "=WEEKNUM(A45, B45)",
      A46: "12/29/2019", B46: "21", C46: "=WEEKNUM(A46, B46)",
      A47: "12/30/2019", B47: "21", C47: "=WEEKNUM(A47, B47)",
      A48: "12/31/2019", B48: "21", C48: "=WEEKNUM(A48, B48)",
      A49: "1/1/2020"  , B49: "21", C49: "=WEEKNUM(A49, B49)",
      A50: "1/5/2020"  , B50: "21", C50: "=WEEKNUM(A50, B50)",
      A51: "1/6/2020"  , B51: "21", C51: "=WEEKNUM(A51, B51)",
      A52: "1/1/2020"  , B52: "18", C52: "=WEEKNUM(A52, B52)",
      A53: "1/1/2020"  , B53: "0" , C53: "=WEEKNUM(A53, B53)",
      A54: "1/1/2020"  , B54: "10", C54: "=WEEKNUM(A54, B54)",
    };
    const gridResult = evaluateGrid(grid);

    expect(gridResult.C11).toBe(53);
    expect(gridResult.C12).toBe(1);
    expect(gridResult.C13).toBe(1);
    expect(gridResult.C14).toBe(2);
    expect(gridResult.C15).toBe(53);
    expect(gridResult.C16).toBe(1);
    expect(gridResult.C17).toBe(1);
    expect(gridResult.C18).toBe(2);
    expect(gridResult.C19).toBe(53);
    expect(gridResult.C20).toBe(1);
    expect(gridResult.C21).toBe(1);
    expect(gridResult.C22).toBe(2);
    expect(gridResult.C23).toBe(53);
    expect(gridResult.C24).toBe(1);
    expect(gridResult.C25).toBe(1);
    expect(gridResult.C26).toBe(2);
    expect(gridResult.C27).toBe(53);
    expect(gridResult.C28).toBe(1);
    expect(gridResult.C29).toBe(1);
    expect(gridResult.C30).toBe(2);
    expect(gridResult.C31).toBe(53);
    expect(gridResult.C32).toBe(1);
    expect(gridResult.C33).toBe(2);
    expect(gridResult.C34).toBe(53);
    expect(gridResult.C35).toBe(1);
    expect(gridResult.C36).toBe(1);
    expect(gridResult.C37).toBe(2);
    expect(gridResult.C38).toBe(53);
    expect(gridResult.C39).toBe(1);
    expect(gridResult.C40).toBe(1);
    expect(gridResult.C41).toBe(2);
    expect(gridResult.C42).toBe(53);
    expect(gridResult.C43).toBe(1);
    expect(gridResult.C44).toBe(1);
    expect(gridResult.C45).toBe(2);
    expect(gridResult.C46).toBe(52);
    expect(gridResult.C47).toBe(1);
    expect(gridResult.C48).toBe(1);
    expect(gridResult.C49).toBe(1);
    expect(gridResult.C50).toBe(1);
    expect(gridResult.C51).toBe(2);
    expect(gridResult.C52).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.C53).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.C54).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
  });
});

describe("WORKDAY formula", () => {
  test("functional tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "1/1/2013" , A2: "1/21/2013", A3: "2/18/2013", A4: "5/27/2013",
      A5: "1/21/2013", A6: "1/12/2013", A7: "1/2/2013" , A8: "12/31/2012",

      A11: "1/1/2013", B11: "3"  , C11: "=WORKDAY(A11, B11)",
      A12: "1/1/2013", B12: "3"  , C12: "=WORKDAY(A12, B12, A1)",
      A13: "1/1/2013", B13: "3"  , C13: '=WORKDAY(A13, B13, A7)',
      A14: "3/1/2013", B14: "120", C14: "=WORKDAY(A14, B14)",
      A15: "3/1/2013", B15: "120", C15: "=WORKDAY(A15, B15,A1: A6)",
      A16: "2/1/2013", B16: "22" , C16: "=WORKDAY(A16, B16)",
      A17: "1/1/2013", B17: "-3" , C17: "=WORKDAY(A17, B17)",
      A18: "1/1/2013", B18: "-3" , C18: "=WORKDAY(A18, B18, A1)",
      A19: "1/1/2013", B19: "-3" , C19: "=WORKDAY(A19, B19, A8)",
    };
    const gridResult = evaluateGridText(grid);

    expect(gridResult.C11).toBe("1/4/2013");
    expect(gridResult.C12).toBe("1/4/2013");
    expect(gridResult.C13).toBe("1/7/2013");
    expect(gridResult.C14).toBe("8/16/2013");
    expect(gridResult.C15).toBe("8/19/2013");
    expect(gridResult.C16).toBe("3/5/2013");
    expect(gridResult.C17).toBe("12/27/2012");
    expect(gridResult.C18).toBe("12/27/2012");
    expect(gridResult.C19).toBe("12/26/2012");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: "=WORKDAY(B1, C1)", B1: "1/1/2013", C1: "3" })).toBe(
      "m/d/yyyy"
    );
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=WORKDAY(5000, 3)");
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("WORKDAY.INTL formula", () => {
  test("functional tests on cell arguments, string method", () => {
    // prettier-ignore
    const grid = {
      B2:  "5/4/2020", C2:  "4", D2:  '=WORKDAY.INTL(B2,  C2)',
      B3:  "5/4/2020", C3:  "4", D3:  '=WORKDAY.INTL(B3,  C3,  "0")',
      B4:  "5/4/2020", C4:  "4", D4:  '=WORKDAY.INTL(B4,  C4,  "00")',
      B5:  "5/4/2020", C5:  "4", D5:  '=WORKDAY.INTL(B5,  C5,  "000000")',
      B6:  "5/4/2020", C6:  "4", D6:  '=WORKDAY.INTL(B6,  C6,  "0000000")',
      B7:  "5/4/2020", C7:  "4", D7:  '=WORKDAY.INTL(B7,  C7,  "0000011")',
      B8:  "5/4/2020", C8:  "4", D8:  '=WORKDAY.INTL(B8,  C8,  "0000111")',
      B9:  "5/4/2020", C9:  "4", D9:  '=WORKDAY.INTL(B9,  C9,  "1000111")',
      B10: "5/4/2020", C10: "4", D10: '=WORKDAY.INTL(B10, C10, "1110111")',
      B11: "5/4/2020", C11: "4", D11: '=WORKDAY.INTL(B11, C11, "1111111")',
      B12: "5/4/2020", C12: "4", D12: '=WORKDAY.INTL(B12, C12, "1000211")',
                       C13: "4", D13: '=WORKDAY.INTL(B13, C13, "0000000")',
      B14: "5/4/2020",           D14: '=WORKDAY.INTL(B14, C14, "0000000")',

      B75: "5/4/2020", C75: "7" , D75: '=WORKDAY.INTL(B75, C75, "0000000")',
      B76: "5/4/2020", C76: "-3", D76: '=WORKDAY.INTL(B76, C76, "0000011")',
      B77: "5/9/2020", C77: "1" , D77: '=WORKDAY.INTL(B77, C77, "0000011")',
      B78: "5/4/2020", C78: "-4", D78: '=WORKDAY.INTL(B78, C78, "0000111")',
      B79: "5/8/2020", C79: "5" , D79: '=WORKDAY.INTL(B79, C79, "0000111")',
      B80: "5/5/2020", C80: "-4", D80: '=WORKDAY.INTL(B80, C80, "1000111")',
      B81: "5/8/2020", C81: "1" , D81: '=WORKDAY.INTL(B81, C81, "1000111")',
      B82: "5/7/2020", C82: "-4", D82: '=WORKDAY.INTL(B82, C82, "1110111")',
      B83: "5/8/2020", C83: "4" , D83: '=WORKDAY.INTL(B83, C83, "1110111")',
    };

    const gridResult = evaluateGridText(grid);
    expect(gridResult.D2).toBe("5/8/2020"); // @compatibility on Google Sheets, return  #VALUE!
    expect(gridResult.D3).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D4).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D5).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D6).toBe("5/8/2020");
    expect(gridResult.D7).toBe("5/8/2020");
    expect(gridResult.D8).toBe("5/11/2020");
    expect(gridResult.D9).toBe("5/12/2020");
    expect(gridResult.D10).toBe("5/28/2020");
    expect(gridResult.D11).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D12).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D13).toBe("1/3/1900");
    expect(gridResult.D14).toBe("5/4/2020");

    expect(gridResult.D75).toBe("5/11/2020");
    expect(gridResult.D76).toBe("4/29/2020");
    expect(gridResult.D77).toBe("5/11/2020");
    expect(gridResult.D78).toBe("4/27/2020");
    expect(gridResult.D79).toBe("5/18/2020");
    expect(gridResult.D80).toBe("4/23/2020");
    expect(gridResult.D81).toBe("5/12/2020");
    expect(gridResult.D82).toBe("4/9/2020");
    expect(gridResult.D83).toBe("6/4/2020");
  });

  test("functional tests on cell arguments, number method", () => {
    // prettier-ignore
    const grid = {
      B18: "5/4/2020",  C18: "1", D18: '=WORKDAY.INTL(B18, C18, 0)',
      B19: "5/9/2020",  C19: "1", D19: '=WORKDAY.INTL(B19, C19, 1)',
      B20: "5/10/2020", C20: "1", D20: '=WORKDAY.INTL(B20, C20, 1)',
      B21: "5/10/2020", C21: "1", D21: '=WORKDAY.INTL(B21, C21, 2)',
      B22: "5/11/2020", C22: "1", D22: '=WORKDAY.INTL(B22, C22, 2)',
      B23: "5/11/2020", C23: "1", D23: '=WORKDAY.INTL(B23, C23, 3)',
      B24: "5/12/2020", C24: "1", D24: '=WORKDAY.INTL(B24, C24, 3)',
      B25: "5/12/2020", C25: "1", D25: '=WORKDAY.INTL(B25, C25, 4)',
      B26: "5/13/2020", C26: "1", D26: '=WORKDAY.INTL(B26, C26, 4)',
      B27: "5/13/2020", C27: "1", D27: '=WORKDAY.INTL(B27, C27, 5)',
      B28: "5/14/2020", C28: "1", D28: '=WORKDAY.INTL(B28, C28, 5)',
      B29: "5/14/2020", C29: "1", D29: '=WORKDAY.INTL(B29, C29, 6)',
      B30: "5/15/2020", C30: "1", D30: '=WORKDAY.INTL(B30, C30, 6)',
      B31: "5/15/2020", C31: "1", D31: '=WORKDAY.INTL(B31, C31, 7)',
      B32: "5/16/2020", C32: "1", D32: '=WORKDAY.INTL(B32, C32, 7)',
      B33: "5/16/2020", C33: "1", D33: '=WORKDAY.INTL(B33, C33, 8)',

      B39: "5/4/2020",  C39: "1", D39: '=WORKDAY.INTL(B39, C39, 10)',
      B40: "5/9/2020",  C40: "1", D40: '=WORKDAY.INTL(B40, C40, 11)',
      B41: "5/10/2020", C41: "1", D41: '=WORKDAY.INTL(B41, C41, 11)',
      B42: "5/10/2020", C42: "1", D42: '=WORKDAY.INTL(B42, C42, 12)',
      B43: "5/11/2020", C43: "1", D43: '=WORKDAY.INTL(B43, C43, 12)',
      B44: "5/11/2020", C44: "1", D44: '=WORKDAY.INTL(B44, C44, 13)',
      B45: "5/12/2020", C45: "1", D45: '=WORKDAY.INTL(B45, C45, 13)',
      B46: "5/12/2020", C46: "1", D46: '=WORKDAY.INTL(B46, C46, 14)',
      B47: "5/13/2020", C47: "1", D47: '=WORKDAY.INTL(B47, C47, 14)',
      B48: "5/13/2020", C48: "1", D48: '=WORKDAY.INTL(B48, C48, 15)',
      B49: "5/14/2020", C49: "1", D49: '=WORKDAY.INTL(B49, C49, 15)',
      B50: "5/14/2020", C50: "1", D50: '=WORKDAY.INTL(B50, C50, 16)',
      B51: "5/15/2020", C51: "1", D51: '=WORKDAY.INTL(B51, C51, 16)',
      B52: "5/15/2020", C52: "1", D52: '=WORKDAY.INTL(B52, C52, 17)',
      B53: "5/16/2020", C53: "1", D53: '=WORKDAY.INTL(B53, C53, 17)',
      B54: "5/16/2020", C54: "1", D54: '=WORKDAY.INTL(B54, C54, 18)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.D18).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D19).toBe("5/11/2020");
    expect(gridResult.D20).toBe("5/11/2020");
    expect(gridResult.D21).toBe("5/12/2020");
    expect(gridResult.D22).toBe("5/12/2020");
    expect(gridResult.D23).toBe("5/13/2020");
    expect(gridResult.D24).toBe("5/13/2020");
    expect(gridResult.D25).toBe("5/14/2020");
    expect(gridResult.D26).toBe("5/14/2020");
    expect(gridResult.D27).toBe("5/15/2020");
    expect(gridResult.D28).toBe("5/15/2020");
    expect(gridResult.D29).toBe("5/16/2020");
    expect(gridResult.D30).toBe("5/16/2020");
    expect(gridResult.D31).toBe("5/17/2020");
    expect(gridResult.D32).toBe("5/17/2020");
    expect(gridResult.D33).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!

    expect(gridResult.D39).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D40).toBe("5/11/2020");
    expect(gridResult.D41).toBe("5/11/2020");
    expect(gridResult.D42).toBe("5/12/2020");
    expect(gridResult.D43).toBe("5/12/2020");
    expect(gridResult.D44).toBe("5/13/2020");
    expect(gridResult.D45).toBe("5/13/2020");
    expect(gridResult.D46).toBe("5/14/2020");
    expect(gridResult.D47).toBe("5/14/2020");
    expect(gridResult.D48).toBe("5/15/2020");
    expect(gridResult.D49).toBe("5/15/2020");
    expect(gridResult.D50).toBe("5/16/2020");
    expect(gridResult.D51).toBe("5/16/2020");
    expect(gridResult.D52).toBe("5/17/2020");
    expect(gridResult.D53).toBe("5/17/2020");
    expect(gridResult.D54).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
  });

  test("casting tests on cell arguments", () => {
    // prettier-ignore
    const grid = {
      B68: "5/4/2020",  C68: "1", D68: '=WORKDAY.INTL(B68, C68, 1110111)',
      B69: "5/5/2020",  C69: "1", D69: '=WORKDAY.INTL(B69, C69, "test")',
      B70: "5/11/2020", C70: "1", D70: '=WORKDAY.INTL(B70, C70, "2")',
      B71: "5/11/2020", C71: "1", D71: '=WORKDAY.INTL(B71, C71, A71)',
      B72: "5/11/2020", C72: "1", D72: '=WORKDAY.INTL(B72, C72)',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.D68).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D69).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D70).toBe("#ERROR"); // @compatibility on Google Sheets, return  #NUM!
    expect(gridResult.D71).toBe("#ERROR"); // @compatibility on Google Sheets, return  #VALUE!
    expect(gridResult.D72).toBe("5/12/2020");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: "=WORKDAY.INTL(B1, C1)", B1: "1/1/2013", C1: "3" })).toBe(
      "m/d/yyyy"
    );
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "=WORKDAY.INTL(5000, 3)");
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("YEAR formula", () => {
  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "5/13/1950" })).toBe(1950);
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "5/13/2020" })).toBe(2020);
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "43964" })).toBe(2020); // 43964 corespond to 5/13/2020
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "0" })).toBe(1899); // 0 corespond to 12/30/1899
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "1" })).toBe(1899); // 1 corespond to 12/31/1899
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "2" })).toBe(1900); // 2 corespond to 1/1/1900
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: '="43964"' })).toBe(2020);
    expect(evaluateCell("A1", { A1: "=YEAR(A2)", A2: "TRUE" })).toBe(1899);
  });
});

describe("YEARFRAC formula", () => {
  test("take at 2 or 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=YEARFRAC(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=YEARFRAC(1, 365)" })).toBeCloseTo(1, 6);
    expect(evaluateCell("A1", { A1: "=YEARFRAC(1, 365, 0)" })).toBeCloseTo(1, 6);
    expect(evaluateCell("A1", { A1: "=YEARFRAC(1, 365, 0, 42)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  describe("business logic", () => {
    describe("return the YEARFRAC with convention 0", () => {
      const conv = "0";

      test.each([
        ["3/31/2003", "12/12/2012", 9.7],
        ["3/30/2003", "12/12/2012", 9.7],
        ["3/29/2003", "12/12/2012", 9.70278],
      ])("start dates in 31 are replaced by 30", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });

      test.each([
        ["5/29/2007", "12/30/2012", 5.58611],
        ["5/29/2007", "12/31/2012", 5.58889],
        ["5/30/2007", "12/30/2012", 5.58333],
        ["5/30/2007", "12/31/2012", 5.58333],
        ["5/31/2007", "12/30/2012", 5.58333],
        ["5/31/2007", "12/31/2012", 5.58333],
      ])("end dates in 31 are replaced by 30 if start dates are 30 or 31", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });

      describe("if start dates are the last day of february", () => {
        test.each([
          ["1/28/2003", "10/12/2012", 9.70556],
          ["2/28/2003", "11/12/2012", 9.7],
          ["3/30/2003", "12/12/2012", 9.7],
        ])("start dates are replaced by 30", (d1, d2, result) => {
          const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
          expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
        });

        test.each([
          ["1/28/2004", "10/12/2013", 9.70556],
          ["2/28/2004", "11/12/2013", 9.70556],
          ["2/29/2004", "11/12/2013", 9.7],
          ["3/30/2004", "12/12/2013", 9.7],
        ])("start dates are replaced by 30 (leap year)", (d1, d2, result) => {
          const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
          expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
        });

        test.each([
          ["2/27/2003", "2/27/2013", 10.0],
          ["2/27/2003", "2/28/2013", 10.00278],
          ["2/28/2003", "2/27/2013", 9.99167],
          ["2/28/2003", "2/28/2013", 10.0],
        ])(
          "end dates in last days of february are replaced by 30 (no leap year / no leap year)",
          (d1, d2, result) => {
            const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
            expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
          }
        );

        test.each([
          ["2/27/2003", "2/28/2012", 9.00278],
          ["2/27/2003", "2/29/2012", 9.00556],
          ["2/28/2003", "2/28/2012", 8.99444],
          ["2/28/2003", "2/29/2012", 9.0],
        ])(
          "end dates in last days of february are replaced by 30 (no leap year / leap year)",
          (d1, d2, result) => {
            const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
            expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
          }
        );

        test.each([
          ["2/28/2004", "2/27/2013", 8.99722],
          ["2/28/2004", "2/28/2013", 9.0],
          ["2/29/2004", "2/27/2013", 8.99167],
          ["2/29/2004", "2/28/2013", 9.0],
        ])(
          "end dates in last days of february are replaced by 30 (leap year / no leap year)",
          (d1, d2, result) => {
            const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
            expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
          }
        );

        test.each([
          ["2/28/2004", "2/28/2012", 8.0],
          ["2/28/2004", "2/29/2012", 8.00278],
          ["2/29/2004", "2/28/2012", 7.99444],
          ["2/29/2004", "2/29/2012", 8.0],
        ])(
          "end dates in last days of february are replaced by 30 (leap year / leap year)",
          (d1, d2, result) => {
            const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
            expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
          }
        );
      });
    });

    describe("return the YEARFRAC with convention 1", () => {
      const conv = "1";

      // note that for convention 1, Excel and googleSheet haven't same results

      test.each([
        // normal year / normal year
        ["3/9/2005", "2/9/2006", 0.92329], // 0.92329 on googleSheet
        // normal year / leap year (29 Feb include)
        ["3/29/2007", "2/29/2008", 0.92077], // 0.92285 on googleSheet
        // normal year / leap year (29 Feb on limit)
        ["3/29/2007", "2/29/2008", 0.92077], // 0.92285 on googleSheet
        // normal year / leap year (29 Feb not include)
        ["3/9/2007", "2/9/2008", 0.92329], // 0.92300 on googleSheet
        // leap year / normal year (29 Feb include)
        ["2/9/2008", "1/9/2009", 0.9153], // 0.91536 on googleSheet
        // leap year / normal year (29 Feb on limit)
        ["2/29/2008", "1/29/2009", 0.9153], // 0.91551 on googleSheet
        // leap year / normal year (29 Feb not include)
        ["4/9/2008", "3/9/2009", 0.91507], // 0.91307 on googleSheet
      ])(
        "case: dates are different by less than a year (sitting on different years)",
        (d1, d2, result) => {
          const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
          expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
        }
      );

      test.each([
        // normal year / normal year
        ["1/9/2005", "12/9/2005", 0.91507],
        // leap year / leap year (29 Feb not include - at left)
        ["3/9/2008", "12/9/2008", 0.75137],
        // leap year / leap year (29 Feb on left limit)
        ["2/29/2008", "11/29/2008", 0.74863],
        // leap year / leap year (29 Feb include)
        ["1/9/2008", "10/9/2008", 0.74863],
        // leap year / leap year (29 Feb on right limit)
        ["1/29/2008", "2/29/2008", 0.0847],
        // leap year / leap year (29 Feb not include - at right)
        ["1/9/2008", "2/9/2008", 0.0847],
      ])(
        "case: dates are different by less than a year (sitting on same years)",
        (d1, d2, result) => {
          const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
          expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
        }
      );

      test.each([
        // normal year / normal year
        ["3/9/2005", "2/9/2007", 1.92329], // 1.92329 on googleSheet
        // normal year / leap year (29 Feb include)
        ["4/9/2005", "3/9/2008", 2.91581], // 2.91730 on googleSheet
        // normal year / leap year (29 Feb on limit)
        ["3/29/2005", "2/29/2008", 2.92129], // 2.92285 on googleSheet
        // normal year / leap year (29 Feb not include)
        ["3/9/2005", "2/9/2008", 2.92129], // 2.92300 on googleSheet
        // leap year / normal year (29 Feb include)
        ["2/9/2004", "1/9/2007", 2.91581], // 2.91536 on googleSheet
        // leap year / normal year (29 Feb on limit)
        ["2/29/2004", "1/29/2007", 2.91581], // 2.91551 on googleSheet
        // leap year / normal year (29 Feb not include)
        ["3/9/2004", "2/9/2007", 2.92129], // 2.92106 on googleSheet
        // leap year / leap year (29 Feb include)
        ["2/9/2004", "3/9/2008", 4.07772], // 4.07923 on googleSheet
        ["3/9/2004", "3/9/2008", 3.99836], // 4.00000 on googleSheet
        ["2/9/2004", "2/9/2008", 3.99836], // 4.00000 on googleSheet
        // leap year / leap year (29 Feb on limit)
        ["1/29/2004", "2/29/2008", 4.0832], // 4.08470 on googleSheet
        ["2/29/2004", "2/29/2008", 3.99836], // 4.00000 on googleSheet
        ["3/29/2004", "2/29/2008", 3.91899], // 3.92077 on googleSheet
        ["2/29/2004", "1/29/2008", 3.91352], // 3.91530 on googleSheet
        ["2/29/2004", "3/29/2008", 4.07772], // 4.07923 on googleSheet
        // leap year / leap year (29 Feb not include)
        ["3/9/2004", "2/9/2008", 3.91899], // 3.92077 on googleSheet
      ])("case: dates are different by more than a year", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });
    });

    describe("return the YEARFRAC with convention 2", () => {
      const conv = "2";

      test.each([
        ["12/31/2001", "12/30/2003", 2.025],
        ["2/28/2003", "2/27/2013", 10.14444],
        ["2/29/2004", "2/28/2012", 8.11389],
        ["5/31/2007", "12/31/2012", 5.66944],
      ])("some random cases", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });
    });

    describe("return the YEARFRAC with convention 3", () => {
      const conv = "3";

      test.each([
        ["12/31/2001", "12/30/2003", 1.99726],
        ["2/28/2003", "2/27/2013", 10.00548],
        ["2/29/2004", "2/28/2012", 8.00274],
        ["5/31/2007", "12/31/2012", 5.59178],
      ])("some random cases", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });
    });

    describe("return the YEARFRAC with convention 4", () => {
      const conv = "4";

      test.each([
        ["12/31/2001", "12/30/2003", 2.0],
        ["2/28/2003", "2/27/2013", 9.99722],
        ["2/29/2004", "2/28/2012", 7.99722],
        ["5/31/2007", "12/31/2012", 5.58333],
      ])("some random cases", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });

      test.each([
        ["3/31/2003", "12/12/2012", 9.7],
        ["3/30/2003", "12/12/2012", 9.7],
        ["3/29/2003", "12/12/2012", 9.70278],
      ])("start dates in 31 are replaced by 30", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });

      test.each([
        ["5/29/2007", "12/29/2012", 5.58333],
        ["5/29/2007", "12/30/2012", 5.58611],
        ["5/29/2007", "12/31/2012", 5.58611],
      ])("end dates in 31 are replaced by 30", (d1, d2, result) => {
        const grid = { A1: "=YEARFRAC(A2, A3, A4)", A2: d1, A3: d2, A4: conv };
        expect(evaluateCell("A1", grid)).toBeCloseTo(result, 5);
      });
    });

    test("parameter 1 must be greater than or equal to 0", () => {
      expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365)" })).toBeCloseTo(1, 5);
      expect(evaluateCell("A1", { A1: "=YEARFRAC(-1, 365)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "12/30/1899", A3: "12/30/1900" })
      ).toBeCloseTo(1, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "12/29/1899", A3: "12/29/1900" })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 1 is truncated", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBeCloseTo(1, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "6/6/2006 23:00", A3: "6/6/2007" })
      ).toBeCloseTo(1, 5);
    });

    test("parameter 2 must be greater than or equal to 0", () => {
      expect(evaluateCell("A1", { A1: "=YEARFRAC(365, 0)" })).toBeCloseTo(1, 5);
      expect(evaluateCell("A1", { A1: "=YEARFRAC(364, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 2 is truncated", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBeCloseTo(1, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "6/6/2006", A3: "6/6/2007 23:00" })
      ).toBeCloseTo(1, 5);
    });

    test("inverting parameters 1 and 2 gives the same result", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "2/29/2004", A3: "11/12/2013" })
      ).toBeCloseTo(9.7, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "11/12/2013", A3: "2/29/2004" })
      ).toBeCloseTo(9.7, 5);
    });

    test("parameter 3 must be between 0 and 4 inclusive", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, -1)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 0)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBeCloseTo(1, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 4)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBeCloseTo(1, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 5)", A2: "6/6/2006", A3: "6/6/2007" })
      ).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    });

    test("parameter 3 is truncated", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 2)", A2: "6/6/2006", A3: "3/6/2007" })
      ).toBeCloseTo(0.75833, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 2.9)", A2: "6/6/2006", A3: "3/6/2007" })
      ).toBeCloseTo(0.75833, 5);
    });

    test("parameter 3 default value is 0", () => {
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3)", A2: "6/6/2006", A3: "12/12/2012" })
      ).toBeCloseTo(6.51667, 5);
      expect(
        evaluateCell("A1", { A1: "=YEARFRAC(A2, A3, 0)", A2: "6/6/2006", A3: "12/12/2012" })
      ).toBeCloseTo(6.51667, 5);
    });
  });

  describe("casting", () => {
    describe("on 1st argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC( , 365)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(A2, 365)" })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC("0", 365)' })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(A2, 365)", A2: '="0"' })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC(" ", 365)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YEARFRAC("kikou", 365)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YEARFRAC(A2, 365)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC(TRUE, 365)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(FALSE, 365)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(A2, 366)", A2: "TRUE" })).toBeCloseTo(1, 5);
      });
    });
    describe("on 2nd argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365,  )" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365, A2)" })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC(365, "0")' })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365, A2)", A2: '="0"' })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC(365, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YEARFRAC(365, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365, TRUE)" })).toBeCloseTo(1, 6);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(365, FALSE)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(366, A2)", A2: "TRUE" })).toBeCloseTo(1, 6);
      });
    });
    describe("on 3th argument", () => {
      test("empty argument/cell are considered as 0", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365,  )" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, A2)" })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which can be cast in number are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC(0, 365, "0")' })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, A2)", A2: '="0"' })).toBeCloseTo(1, 5);
      });
      test("string/string in cell which cannot be cast in number return an error", () => {
        expect(evaluateCell("A1", { A1: '=YEARFRAC(0, 365, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: '=YEARFRAC(0, 365, "kikou")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, A2)", A2: "coucou" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
      });
      test("boolean/boolean in cell are interpreted as numbers", () => {
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, TRUE)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, FALSE)" })).toBeCloseTo(1, 5);
        expect(evaluateCell("A1", { A1: "=YEARFRAC(0, 365, A2)", A2: "TRUE" })).toBeCloseTo(1, 5);
      });
    });
  });
});

describe("MONTH.START formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=MONTH.START("7/20/2020")',
      A2: '=MONTH.START("7/31/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("7/1/2020");
    expect(gridResult.A2).toBe("7/1/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A3: "7/10/1920",
      A4: "=MONTH.START(A3)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A4).toBe("7/1/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=MONTH.START("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=MONTH.START("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("MONTH.END formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=MONTH.END("7/20/2020")',
      A2: '=MONTH.END("2/2/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("7/31/2020");
    expect(gridResult.A2).toBe("2/29/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A3: "7/10/1920",
      A4: "=MONTH.END(A3)",
      A5: "2/10/1920",
      A6: "=MONTH.END(A5)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A4).toBe("7/31/1920");
    expect(gridResult.A6).toBe("2/29/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=MONTH.END("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=MONTH.END("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("QUARTER formula", () => {
  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "1/2/1954" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "5/13/1954" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "7/13/1954" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "43964" })).toBe(2); // 43964 corespond to 5/13/195
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "0" })).toBe(4); // 0 corespond to 12/30/1899
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "1" })).toBe(4); // 1 corespond to 12/31/1899
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "2" })).toBe(1); // 2 corespond to 1/1/1900
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: '="43964"' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=QUARTER(A2)", A2: "TRUE" })).toBe(4);
  });
});

describe("QUARTER.START formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=QUARTER.START("7/20/2020")',
      A2: '=QUARTER.START("5/15/2020")',
      A3: '=QUARTER.START("1/15/2020")',
      A4: '=QUARTER.START("10/15/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("7/1/2020");
    expect(gridResult.A2).toBe("4/1/2020");
    expect(gridResult.A3).toBe("1/1/2020");
    expect(gridResult.A4).toBe("10/1/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A1: "7/10/1920",
      A2: "=QUARTER.START(A1)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A2).toBe("7/1/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=QUARTER.START("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=QUARTER.START("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("QUARTER.END formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=QUARTER.END("7/20/2020")',
      A2: '=QUARTER.END("2/2/2020")',
      A3: '=QUARTER.END("1/15/2020")',
      A4: '=QUARTER.END("10/15/2020")',
      A5: '=QUARTER.END("7/20/2020")',
      A6: '=QUARTER.END("5/15/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("9/30/2020");
    expect(gridResult.A2).toBe("3/31/2020");
    expect(gridResult.A3).toBe("3/31/2020");
    expect(gridResult.A4).toBe("12/31/2020");
    expect(gridResult.A5).toBe("9/30/2020");
    expect(gridResult.A6).toBe("6/30/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A1: "7/10/1920",
      A2: "=QUARTER.END(A1)",
      A3: "2/10/1920",
      A4: "=QUARTER.END(A3)",
      A5: "5/10/1920",
      A6: "=QUARTER.END(A5)",
      A7: "10/10/1920",
      A8: "=QUARTER.END(A7)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A2).toBe("9/30/1920");
    expect(gridResult.A4).toBe("3/31/1920");
    expect(gridResult.A6).toBe("6/30/1920");
    expect(gridResult.A8).toBe("12/31/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=QUARTER.END("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=QUARTER.END("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("YEAR.START formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=YEAR.START("7/20/2020")',
      A2: '=YEAR.START("5/15/2020")',
      A3: '=YEAR.START("1/15/2020")',
      A4: '=YEAR.START("12/31/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("1/1/2020");
    expect(gridResult.A2).toBe("1/1/2020");
    expect(gridResult.A3).toBe("1/1/2020");
    expect(gridResult.A4).toBe("1/1/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A1: "7/10/1920",
      A2: "=YEAR.START(A1)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A2).toBe("1/1/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=YEAR.START("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=YEAR.START("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});

describe("YEAR.END formula", () => {
  test("functional tests on simple arguments", () => {
    const grid = {
      A1: '=YEAR.END("7/20/2020")',
      A2: '=YEAR.END("2/2/2020")',
      A3: '=YEAR.END("1/15/2020")',
      A4: '=YEAR.END("10/15/2020")',
      A5: '=YEAR.END("7/20/2020")',
      A6: '=YEAR.END("5/15/2020")',
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A1).toBe("12/31/2020");
    expect(gridResult.A2).toBe("12/31/2020");
    expect(gridResult.A3).toBe("12/31/2020");
    expect(gridResult.A4).toBe("12/31/2020");
    expect(gridResult.A5).toBe("12/31/2020");
    expect(gridResult.A6).toBe("12/31/2020");
  });

  test("casting tests on cell arguments", () => {
    const grid = {
      A1: "1/1/1920",
      A2: "=YEAR.END(A1)",
      A3: "2/10/1920",
      A4: "=YEAR.END(A3)",
      A5: "5/10/1920",
      A6: "=YEAR.END(A5)",
      A7: "10/10/1920",
      A8: "=YEAR.END(A7)",
    };
    const gridResult = evaluateGridText(grid);
    expect(gridResult.A2).toBe("12/31/1920");
    expect(gridResult.A4).toBe("12/31/1920");
    expect(gridResult.A6).toBe("12/31/1920");
    expect(gridResult.A8).toBe("12/31/1920");
  });

  test("return value with formatting", async () => {
    expect(evaluateCellFormat("A1", { A1: '=YEAR.END("7/20/2020")' })).toBe("m/d/yyyy");
  });

  test("Return format is locale dependant", () => {
    const model = Model.BuildSync();
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", '=YEAR.END("7/7/2020")');
    expect(getEvaluatedCell(model, "A1").format).toBe(FR_LOCALE.dateFormat);
  });
});
