import { arg, functionRegistry } from "../../src/functions";
import { NOW, TODAY } from "../../src/functions/module_date";
import { RAND, RANDARRAY, RANDBETWEEN } from "../../src/functions/module_math";
import { buildSheetLink, toXC } from "../../src/helpers";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { Model } from "../../src/model";
import { CustomizedDataSet, Dimension, ExcelChartType } from "../../src/types";
import { XLSXExportXMLFile, XMLString } from "../../src/types/xlsx";
import { adaptFormulaToExcel } from "../../src/xlsx/functions/cells";
import { escapeXml, parseXML } from "../../src/xlsx/helpers/xml_helpers";

import {
  createChart,
  createGaugeChart,
  createImage,
  createScorecardChart,
  createSheet,
  createTable,
  foldHeaderGroup,
  groupHeaders,
  merge,
  setCellContent,
  setCellFormat,
  setFormat,
  updateFilter,
} from "../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../test_helpers/constants";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  exportPrettifiedXlsx,
  getExportedExcelData,
  mockChart,
  restoreDefaultFunctions,
  toRangesData,
} from "../test_helpers/helpers";

mockChart();

const simpleData = {
  version: 20,
  sheets: [
    {
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 50,
      cols: { 1: {}, 3: {} },
      rows: {},
      cells: {
        A21: { content: "Super Test" },
        B2: { content: "Owl is awesome", style: 1 },
        B4: { content: `this needs to be escaped <>"`, style: 4 },
        D12: { content: "this is a sum of sums" },
        F2: { content: "italic blablah", style: 2 },
        F3: { content: "strikethrough", style: 3 },
        F4: { content: "underline", style: 5 },
        F5: { content: "vertical top", style: 6 },
        F6: { content: "vertical middle", style: 7 },
        F7: { content: "vertical bottom", style: 8 },
        F8: { content: "wrapped text", style: 10 },
        F9: { content: "overflow text", style: 9 },
        F10: { content: "clipped text", style: 11 },
        H2: { content: "merged content" },
        C20: { content: "left", border: 1 },
        E20: { content: "top", border: 2 },
        G20: { content: "all", border: 3 },
        C23: { content: "0.43", format: 1 },
        C24: { content: "10", format: 2 },
        C25: { content: "10.123", format: 2 },
        A27: { content: "Emily Anderson (Emmy)" },
        A28: { content: "Sophie Allen (Saffi)" },
        A29: { content: "Chloe Adams" },
        A30: { content: "Megan Alexander (Meg)" },
        A31: { content: "Lucy Arnold (Lulu)" },
        A32: { content: "Hannah Alvarez" },
        A33: { content: "Jessica Alcock (Jess)" },
        A34: { content: "Charlotte Anaya" },
        A35: { content: "Lauren Anthony" },
        A36: { content: "test 'single quot'" },
        A37: { content: `="this is a quote: \\""` },
        A38: { content: `='<Sheet2>'!B2` },
        A39: { content: `=A39` },
        A40: { content: `=(1+2)/3` },
        A41: { content: "=#REF + 5" },
        K3: { border: 5 },
        K4: { border: 4 },
        K5: { border: 4 },
        K6: { border: 4 },
        K7: { border: 4 },
        K9: { border: 6 },
      },
    },
    {
      name: "<Sheet2>",
      cells: {
        B2: { content: "42" },
      },
    },
  ],
  formats: {
    1: "0.00%",
    2: "#,##0.00",
  },
  styles: {
    1: { bold: true, textColor: "#674EA7", fontSize: 12 },
    2: { italic: true },
    3: { strikethrough: true, align: "left" },
    4: { fillColor: "#FFF2CC" },
    5: { underline: true },
    6: { verticalAlign: "top" },
    7: { verticalAlign: "middle" },
    8: { VerticalAlign: "bottom" },
    9: { wrapping: "overflow" },
    10: { wrapping: "wrap" },
    11: { wrapping: "clip" },
  },
  borders: {
    1: { left: { style: "thin", color: "#000" } },
    2: { top: { style: "thin", color: "#000" } },
    3: {
      top: { style: "thin", color: "#000" },
      left: { style: "thin", color: "#000" },
      bottom: { style: "thin", color: "#000" },
      right: { style: "thin", color: "#000" },
    },
    4: { right: { style: "thin", color: "#000" }, left: { style: "thin", color: "#000" } },
    5: {
      left: { style: "thin", color: "#000" },
      right: { style: "thin", color: "#000" },
      top: { style: "thin", color: "#000" },
    },
    6: {
      left: { style: "medium", color: "#888888" },
      right: { style: "thick", color: "#FF0000" },
      bottom: { style: "dotted", color: "#00FF00" },
      top: { style: "dashed", color: "#0000FF" },
    },
  },
};

const allExportableFormulasData = {
  sheets: [
    {
      name: "ExportableFormulas",
      colNumber: 26,
      rowNumber: 180,
      cells: {
        A1: { content: "evaluation" },
        A2: { content: "=ABS(-5.5)" },
        A3: { content: "=ACOS(1)" },
        A4: { content: "=ACOSH(2)" },
        A5: { content: "=ACOT(1)" },
        B5: { content: "=ACOT(ACOT(1))" },
        A6: { content: "=ACOTH(2)" },
        A7: { content: "=AND(TRUE,TRUE)" },
        A8: { content: "=ASIN(0.5)" },
        A9: { content: "=ASINH(2)" },
        A10: { content: "=ATAN(1)" },
        A11: { content: "=ATAN2(-1,0)" },
        A12: { content: "=ATANH(0.7)" },
        A13: { content: "=AVEDEV(I2:I9)" },
        A14: { content: "=AVERAGE(H2:H9)" },
        A15: { content: "=AVERAGEA(G2:H9)" },
        A16: { content: '=AVERAGEIF(J2:J9,">150000" )' },
        A17: { content: '=AVERAGEIFS(I2:I9,H2:H9,">=30",K2:K9, "<10")' },
        A18: { content: "=CEILING(20.4,1)" },
        A19: { content: "=CEILING.MATH(-5.5,1,0)" },
        A20: { content: "=CEILING.PRECISE(230, 100)" },
        A21: { content: "=CHAR(74)" },
        A22: { content: "=COLUMN(C4)" },
        A23: { content: "=COLUMNS(A5:D12)" },
        A24: { content: "=CONCAT(1,23)" },
        A25: { content: '=CONCATENATE("BUT, ", "MICHEL")' },
        A26: { content: "=COS(PI()/3)" },
        A27: { content: "=COSH(2)" },
        A28: { content: "=COT(PI()/6)" },
        A29: { content: "=COTH(.5)" },
        A30: { content: '=COUNT(1,"a","5", "03/14/2021")' },
        A31: { content: '=COUNTA(1,"a","5", "03/14/2021")' },
        A32: { content: '=COUNTBLANK("" , "1", 3, FALSE)' },
        A33: { content: '=COUNTIF(H2:H9,">30")' },
        A34: { content: '=COUNTIFS(H2:H9, ">25",K2:K9,"<4")' },
        A35: { content: "=COVAR(H2:H9,K2:K9)" },
        A36: { content: "=COVARIANCE.P(K2:K9,H2:H9)" },
        A37: { content: "=COVARIANCE.P(I2:I9,J2:J9)" },
        A38: { content: "=CSC(PI()/4)" },
        A39: { content: "=CSCH(pi()/3)" },
        A40: { content: "=DATE(2020,5,25)" },
        A41: { content: '=DATEVALUE("1969/08/15")' },
        A42: { content: '=DAVERAGE(G1:K9,"Tot. Score",J12:J13)' },
        A43: { content: '=DAY("2020/03/17")' },
        A44: { content: '=DAYS("2022/03/17", "2021/03/17")' },
        A45: { content: '=DCOUNT(G1:K9,"Name",H12:H13)' },
        A46: { content: '=DCOUNTA(G1:K9,"Name",H12:H13)' },
        A47: { content: "=DECIMAL(20,16)" },
        A48: { content: "=DEGREES(pi()/4)" },
        A49: { content: '=DGET(G1:K9, "Hours Played",G12:G13)' },
        A50: { content: '=DMAX(G1:K9,"Tot. Score", I12:I13)' },
        A51: { content: '=DMIN(G1:K9,"Tot. Score", H12:H13)' },
        A52: { content: '=DPRODUCT(G1:K9, "Age",K12:K13)' },
        A53: { content: '=DSTDEV(G1:K9, "Age",H12:H13)' },
        A54: { content: '=DSTDEVP(G1:K9, "Age",H12:H13)' },
        A55: { content: '=DSUM(G1:K9,"Age",I12:I13)' },
        A56: { content: '=DVAR(G1:K9, "Hours Played",H12:H13)' },
        A57: { content: '=DVARP(G1:K9, "Hours Played",H12:H13)' },
        A58: { content: '=EDATE("7/22/1969", -2)' },
        A59: { content: '=EOMONTH("7/21/2020", 1)' },
        A60: { content: '=EXACT("AbsSdf%", "AbsSdf%")' },
        A61: { content: "=EXP(4)" },
        A62: { content: '=FIND("A", "qbdahbaazo A")' },
        A63: { content: "=FLOOR(5.5,2)" },
        A64: { content: "=FLOOR.MATH(-5.55,2, 1)" },
        A65: { content: "=FLOOR.PRECISE(199,100)" },
        A66: { content: '=HLOOKUP("Tot. Score",H1:K9, 4,FALSE)' },
        A67: { content: '=HOUR("2:14:56 AM")' },
        A68: { content: '=IF(TRUE,"TABOURET","JAMBON")' },
        A69: { content: '=IFERROR(0/0, "no diving by zero.")' },
        A70: { content: '=IFS($H2>$H3,"first player is older",$H3>$H2, "second player is older")' },
        A71: { content: "=ISERROR(0/0)" },
        A72: { content: "=ISEVEN(3)" },
        A73: { content: '=ISLOGICAL("TRUE")' },
        A74: { content: "=ISNONTEXT(TRUE)" },
        A75: { content: "=ISNUMBER(1231.5)" },
        A76: { content: "=ISO.CEILING(-7.89)" },
        A77: { content: "=ISODD(4)" },
        A78: { content: '=ISOWEEKNUM("1/3/2016")' },
        A79: { content: '=ISTEXT("123")' },
        A80: { content: "=LARGE(H2:H9,3)" },
        A81: { content: '=LEFT("Mich",4)' },
        A82: { content: '=LEN("anticonstitutionnellement")' },
        A83: { content: "=ROUND(LN(2),5)" },
        A84: { content: "=LOOKUP(42, H2:J9)" },
        A85: { content: '=LOWER("オAドB")' },
        A86: { content: "=MATCH(42,H2:H9,0)" },
        A87: { content: "=MAX(N1:N8)" },
        A88: { content: "=MAXA(N1:N8)" },
        A89: { content: '=MAXIFS(H2:H9,K2:K9, "<20",K2:K9, "<>4")' },
        A90: { content: "=MEDIAN(-1, 6, 7, 234, 163845)" },
        A91: { content: "=MIN(N1:N8)" },
        A92: { content: "=MINA(N1:N8)" },
        A93: { content: '=MINIFS(J2:J9,H2:H9, ">20")' },
        A94: { content: "=MINUTE(0.126)" },
        A95: { content: "=MOD(42,12)" },
        A96: { content: '=MONTH("5/2/1954")' },
        A97: { content: '=NETWORKDAYS("1/1/2013", "2/1/2013")' },
        A98: { content: '=NETWORKDAYS.INTL("1/1/2013", "2/1/2013", "0000111")' },
        A99: { content: "=NOT(FALSE)" },
        A100: { content: "=NOW()" },
        A101: { content: "=ODD(4)" },
        A102: { content: '=OR("true", FALSE)' },
        A103: { content: "=PERCENTILE(N1:N5,1)" },
        A104: { content: "=PERCENTILE.EXC(N1:N5,0.5)" },
        A105: { content: "=PERCENTILE.INC(N1:N5,0)" },
        A106: { content: "=PI()" },
        A107: { content: "=POWER(42,2)" },
        A108: { content: "=PRODUCT(1,2,3)" },
        A109: { content: "=QUARTILE(N1:N5, 0)" },
        A110: { content: "=QUARTILE.EXC(N1:N5, 1)" },
        A111: { content: "=QUARTILE.INC(N1:N5 ,4)" },
        A112: { content: "=RAND()" },
        A113: { content: "=RANDBETWEEN(1.1,2)" },
        A114: { content: '=REPLACE("ABZ", 2, 1, "Y")' },
        A115: { content: '=RIGHT("kikou", 2)' },
        A116: { content: "=ROUND(49.9, 1)" },
        A117: { content: "=ROUNDDOWN(42, -1)" },
        A118: { content: "=ROUNDUP(-1.6,0)" },
        A119: { content: "=ROW(A234)" },
        A120: { content: "=ROWS(B3:C40)" },
        A121: { content: '=SEARCH("C", "ABCD")' },
        A122: { content: "=SEC(PI()/3)" },
        A123: { content: "=SECH(1)" },
        A124: { content: '=SECOND("0:21:42")' },
        A125: { content: "=SIN(PI()/6)" },
        A126: { content: "=SINH(1)" },
        A127: { content: "=SMALL(H2:H9, 3)" },
        A128: { content: "=SQRT(4)" },
        A129: { content: "=STDEV(-2,0,2)" },
        A130: { content: "=STDEV.P(2,4)" },
        A131: { content: "=STDEV.S(2,4,6)" },
        A132: { content: "=STDEVA(TRUE, 3, 5)" },
        A133: { content: "=STDEVP(2,5,8)" },
        A134: { content: "=STDEVPA(TRUE, 4,7)" },
        A135: { content: '=SUBSTITUTE("SAP is best", "SAP", "Odoo")' },
        A136: { content: "=SUM(1,2,3,4,5)" },
        A137: { content: '=SUMIF(K2:K9, "<100")' },
        A138: { content: '=SUMIFS(H2:H9,K2:K9, "<100")' },
        A139: { content: "=TAN(PI()/4)" },
        A140: { content: "=TANH(1)" },
        A141: { content: '=TEXTJOIN("-",TRUE,"","1","A","%")' },
        A142: { content: "=TIME(9,11,31)" },
        A143: { content: '=TIMEVALUE("1899 10 08 18:00")' },
        A144: { content: "=TODAY()" },
        A145: { content: '=TRIM(" Jean Ticonstitutionnalise ")' },
        A146: { content: "=TRUNC(42.42, 1)" },
        A147: { content: '=UPPER("grrrr !")' },
        A148: { content: "=VAR(K1:K5)" },
        A149: { content: "=VAR.P(K1:K5)" },
        A150: { content: "=VAR.S(2,5,8)" },
        A151: { content: "=VARA(K1:K5)" },
        A152: { content: "=VARP(K1:K5)" },
        A153: { content: "=VARPA(K1:K5)" },
        A154: { content: '=VLOOKUP("NotACheater",G1:K9, 3, FALSE)' },
        A155: { content: '=WEEKDAY("6/12/2021")' },
        A156: { content: '=WEEKNUM("6/29/2021")' },
        A157: { content: '=WORKDAY("3/15/2021", 6)' },
        A158: { content: '=WORKDAY.INTL("3/15/2021", 6, "0111111")' },
        A159: { content: "=XOR(false, true, false, false)" },
        A160: { content: '=YEAR("3/12/2012")' },
        A161: { content: "=DELTA(1, 1)" },
        A162: { content: "=NA()" },
        A163: { content: "=ISNA(A162)" },
        A164: { content: "=ISERR(A162)" },
        A165: { content: '=HYPERLINK("https://www.odoo.com", "Odoo")' },
        A166: { content: '=ADDRESS(27,53,4,FALSE,"sheet!")' },
        A167: { content: '=DATEDIF("2002/01/01","2002/01/02","D")' },
        A168: { content: "=RANDARRAY(2, 2)" },

        // DATA
        G1: { content: "Name", style: 8 },
        H1: { content: "Age", style: 8 },
        I1: { content: "Hours Played", style: 8 },
        J1: { content: "Tot. Score", style: 8 },
        K1: { content: "Rank (lower the better)", style: 8 },
        G2: { content: "Robot1" },
        H2: { content: "26" },
        I2: { content: "1204.7" },
        J2: { content: "25618" },
        K2: { content: "5" },
        G3: { content: "Robot2" },
        H3: { content: "13" },
        I3: { content: "500.9" },
        J3: { content: "23000" },
        K3: { content: "7" },
        G4: { content: "NotACheater" },
        H4: { content: "26" },
        I4: { content: "252.4" },
        J4: { content: "110120.5" },
        K4: { content: "3" },
        G5: { content: "Robot4" },
        H5: { content: "42" },
        I5: { content: "4701.3" },
        J5: { content: "50024" },
        K5: { content: "4" },
        G6: { content: "Robot3" },
        H6: { content: "9" },
        I6: { content: "12.1" },
        J6: { content: "2" },
        K6: { content: "1000" },
        G7: { content: "Robot6" },
        H7: { content: "27" },
        I7: { content: "4000.0" },
        J7: { content: "189576" },
        K7: { content: "2" },
        G8: { content: "Michel" },
        H8: { content: "30" },
        I8: { content: "12052.0" },
        J8: { content: "256018" },
        K8: { content: "1" },
        G9: { content: "Robot7" },
        H9: { content: "37" },
        I9: { content: "4890.1" },
        J9: { content: "5000" },
        K9: { content: "30" },
        G11: { content: "criteria" },
        G12: { content: "Name", style: 8 },
        H12: { content: "Age", style: 8 },
        I12: { content: "Hours Played", style: 8 },
        J12: { content: "Tot. Score", style: 8 },
        K12: { content: "Rank (lower the better)", style: 8 },
        G13: { content: "NotACheater" },
        H13: { content: ">29" },
        I13: { content: "<4500" },
        J13: { content: ">42000" },
        K13: { content: ">25" },
        N1: { content: "0.1" },
        N2: { content: "0.2" },
        N3: { content: "0.4" },
        N4: { content: "0.5" },
        N5: { content: "0.6" },
        N6: { content: "A" },
        N7: { content: "TRUE" },
        N8: { content: "FALSE" },
      },
    },
  ],
};

const allNonExportableFormulasData = {
  sheets: [
    {
      cells: {
        A2: { content: "=COUNTUNIQUE(1,A24,3,2,4)" },
        A3: { content: "=sum(A1,ABS(100))" },
        A4: { content: "=ADD(42,24)" },
        A5: { content: "=DIVIDE(84,42)" },
        A6: { content: "=EQ(42,42)" },
        A7: { content: "=GT(42,4)" },
        A8: { content: "=GTE(4,4)" },
        A9: { content: "=LT(4,42)" },
        A10: { content: "=LTE(6,6)" },
        A11: { content: "=MINUS(42,24)" },
        A12: { content: "=MULTIPLY(42,2)" },
        A13: { content: "=NE(1,22.22)" },
        A14: { content: "=POW(3,3)" },
        A15: { content: "=UMINUS(-3)" },
        A16: { content: "=UNARY.PERCENT(4)" },
        A17: { content: "=UPLUS(42)" },
        A18: { content: "=AVERAGE.WEIGHTED(1,1,3,3)" },
        A19: { content: "=JOIN(1,2,3)" },
        A20: { content: "=MULTIPLY(42,0)" },
        A21: { content: '=FORMAT.LARGE.NUMBER(1000, "k")' },
        A22: { content: "=SUM(A3:3)" }, // should be adapted to SUM(A3:Z3)
        A23: { content: "=SUM(A3:A)" }, // should be adapted to SUM(A3:A100)
        A24: { content: "2" },
      },
    },
  ],
};

describe("Test XLSX export", () => {
  describe("Formula Helper : adaptFormulaToExcel", () => {
    test("simple functions", () => {
      // simple
      expect(adaptFormulaToExcel("=SUM(1,2)")).toEqual("SUM(1,2)");
      // date as argument
      expect(adaptFormulaToExcel('=DAY("02/04/2020")')).toEqual('DAY("2020-02-04")');
      // non-retrocompatible on Excel
      expect(adaptFormulaToExcel("=ACOT(2)")).toEqual("_xlfn.ACOT(2)");
    });
    test("composite functions", () => {
      // simple
      expect(adaptFormulaToExcel("=SUM(PRODUCT(2,3),2)")).toEqual("SUM(PRODUCT(2,3),2)");
      // date as argument
      expect(adaptFormulaToExcel('=DAY(EDATE("4/5/2020",-2))')).toEqual(
        'DAY(EDATE("2020-04-05",-2))'
      );
      // // non-retrocompatible on Excel
      expect(adaptFormulaToExcel("=ROUND(ACOT(2),5)")).toEqual("ROUND(_xlfn.ACOT(2),5)");
    });

    test("formula with dependencies", () => {
      expect(adaptFormulaToExcel("=SUM(A1, A2)")).toEqual("SUM(A1,A2)");
    });
  });
  describe("Generic sheets (style, hidden, size, cf)", () => {
    test("Simple model data with default style", async () => {
      const model = new Model(simpleData);
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
    test("Merges", async () => {
      const model = new Model({
        sheets: [{ name: "MergeSheet", merges: ["A1:B2", "B6:C9", "A20:Z40"] }],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Conditional formatting", async () => {
      const style = { fillColor: "#B6D7A8" };
      const model = new Model({
        sheets: [
          {
            colNumber: 2,
            rowNumber: 5,
            cells: {
              A1: { content: "1" },
              A2: { content: "42" },
              A3: { content: "TRUE" },
              A4: { content: "0" },
              A5: { content: "Not highlighted" },
              B1: { content: "0" },
              B2: { content: "13" },
              B3: { content: "20" },
              B4: { content: "5" },
              B5: { content: "3" },
            },
            conditionalFormats: [
              {
                id: "1",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "ContainsText", values: ["1"], style },
              },
              {
                id: "11",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "NotContains", values: ["1"], style },
              },
              {
                id: "12",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "BeginsWith", values: ["1"], style },
              },
              {
                id: "13",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "EndsWith", values: ["1"], style },
              },
              {
                id: "14",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "IsEmpty", values: [], style },
              },
              {
                id: "15",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "IsNotEmpty", values: [], style },
              },
              {
                id: "16",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "Equal", values: ["1"], style },
              },
              {
                id: "17",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "NotEqual", values: ["1"], style },
              },
              {
                id: "18",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "GreaterThan", values: ["1"], style },
              },
              {
                id: "19",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "GreaterThanOrEqual", values: ["1"], style },
              },
              {
                id: "20",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "LessThan", values: ["1"], style },
              },
              {
                id: "21",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "LessThanOrEqual", values: ["1"], style },
              },
              {
                id: "22",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "Between", values: ["1", "4"], style },
              },
              {
                id: "23",
                ranges: ["A1:A5"],
                rule: { type: "CellIsRule", operator: "NotBetween", values: ["1", "4"], style },
              },
              {
                id: "2",
                ranges: ["B1:B5"],
                rule: {
                  type: "ColorScaleRule",
                  minimum: { type: "value", color: 0xffffff },
                  maximum: { type: "value", color: 0xff0000 },
                },
              },
              {
                id: "3",
                ranges: ["B1:B5"],
                rule: {
                  type: "ColorScaleRule",
                  minimum: { type: "percentage", value: "12", color: 0xffffff },
                  maximum: { type: "percentage", value: "80", color: 0xff0000 },
                },
              },
              {
                id: "4",
                ranges: ["B1:B5"],
                rule: {
                  type: "ColorScaleRule",
                  minimum: { type: "value", color: 0xffffff },
                  midpoint: { type: "percentage", value: "12", color: 0x33ff33 },
                  maximum: { type: "value", color: 0xff0000 },
                },
              },
              {
                id: "6",
                ranges: ["B1:B5"],
                rule: {
                  type: "IconSetRule",
                  icons: {
                    upper: "arrowGood",
                    middle: "smileyGood",
                    lower: "smileyNeutral",
                  },
                  lowerInflectionPoint: {
                    operator: "ge",
                    type: "number",
                    value: "0",
                  },
                  upperInflectionPoint: {
                    operator: "gt",
                    type: "number",
                    value: "10",
                  },
                },
              },
              {
                id: "7",
                ranges: ["B1:B5"],
                rule: {
                  type: "IconSetRule",
                  icons: {
                    upper: "smileyGood",
                    middle: "smileyGood",
                    lower: "smileyNeutral",
                  },
                  lowerInflectionPoint: {
                    operator: "ge",
                    type: "percentile",
                    value: "33",
                  },
                  upperInflectionPoint: {
                    operator: "gt",
                    type: "percentile",
                    value: "66",
                  },
                },
              },
              {
                id: "full style",
                ranges: ["A1:A5"],
                rule: {
                  type: "CellIsRule",
                  operator: "ContainsText",
                  values: ["1"],
                  style: {
                    fillColor: "#90EE80",
                    color: "#B6D7A8",
                    bold: true,
                    italic: true,
                    strike: true,
                    underline: true,
                  },
                },
              },
            ],
          },
        ],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("does not export quarter format", async () => {
      const model = new Model();

      setCellFormat(model, "A1", "qq yyyy");
      setCellFormat(model, "A2", "qqqq yyyy");

      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].cells.A1?.format).toBeUndefined();
      expect(exported.sheets[0].cells.A2?.format).toBeUndefined();
      expect(exported.formats).toEqual({});
    });

    test("Conditional formatting with formula cannot be exported (for now)", async () => {
      jest.spyOn(global.console, "warn").mockImplementation();
      const model = new Model({
        sheets: [
          {
            colNumber: 2,
            rowNumber: 5,
            cells: {},
            conditionalFormats: [
              {
                id: "5",
                ranges: ["B1:B5"],
                rule: {
                  type: "ColorScaleRule",
                  minimum: { type: "formula", value: '=SUMIF(C25, ">100")', color: 0xffffff },
                  midpoint: { type: "formula", value: "=SU", color: 0xffffff },
                  maximum: { type: "formula", value: "=ACOT($C$26)", color: 0xff0000 },
                },
              },
            ],
          },
        ],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
      expect(console.warn).toHaveBeenCalledWith(
        "Conditional formats with formula rules are not supported at the moment. The rule is therefore skipped."
      );
    });
  });

  describe("references with headers should be converted to references with fixed coordinates", () => {
    test("Conditional formatting and formula", async () => {
      const style = { fillColor: "#B6D7A8" };
      const model = new Model({
        sheets: [
          {
            colNumber: 2,
            rowNumber: 5,
            cells: {
              A2: { content: "=sum(B3:B)" },
            },
            conditionalFormats: [
              {
                id: "1",
                ranges: ["B2:5"],
                rule: { type: "CellIsRule", operator: "ContainsText", values: ["1"], style },
              },
              {
                id: "2",
                ranges: ["B2:B"],
                rule: { type: "CellIsRule", operator: "ContainsText", values: ["1"], style },
              },
            ],
          },
        ],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Chart", async () => {
      const model = new Model({});

      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B" }, { dataRange: "Sheet1!C4:4" }],
          labelRange: "Sheet1!A2:A",
          type: "line",
        },
        "1"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B" }, { dataRange: "Sheet1!C4:4" }],
          labelRange: "Sheet1!A2:A",
          type: "bar",
        },
        "2"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B" }, { dataRange: "Sheet1!C4:4" }],
          labelRange: "Sheet1!A2:A",
          type: "pie",
        },
        "3"
      );

      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  describe("formulas", () => {
    beforeAll(() => {
      functionRegistry.add("NOW", {
        ...NOW,
        compute: () => 1,
      });
      functionRegistry.add("RAND", {
        ...RAND,
        compute: () => 1,
      });
      functionRegistry.add("TODAY", {
        ...TODAY,
        compute: () => 1,
      });
      functionRegistry.add("RANDARRAY", {
        ...RANDARRAY,
        compute: () => [
          [1, 1],
          [1, 1],
        ],
      });
      // @ts-ignore
      functionRegistry.add("RANDBETWEEN", {
        ...RANDBETWEEN,
        compute: () => 1,
      });
    });

    afterAll(() => {
      restoreDefaultFunctions();
    });
    test("All exportable formulas", async () => {
      const model = new Model(allExportableFormulasData);
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("All non-exportable formulas", async () => {
      const model = new Model(allNonExportableFormulasData);
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Non exportable formulas are exported even with a falsy value", async () => {
      const model = new Model({
        sheets: [{ cells: { A1: { content: "=MULTIPLY(100,0)" }, A2: { content: "=EQ(2,4)" } } }],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("can export value and format from non-exportable formulas", async () => {
      const model = new Model();

      functionRegistry.add("NON.EXPORTABLE", {
        description: "a non exportable formula",
        args: [arg('range (any, range<any>, ,default="a")', "")],
        compute: function () {
          return { value: 42, format: "0.00%" };
        },
        isExported: false,
      });

      setCellContent(model, "A1", "=1+NON.EXPORTABLE()");
      setCellContent(model, "A2", "=1+NON.EXPORTABLE(A1)");

      const exported = getExportedExcelData(model);

      expect(exported.sheets[0].cells["A1"]?.content).toEqual("43");
      expect(exported.sheets[0].cells["A2"]?.content).toEqual("43");
      const formatId = exported.sheets[0].cells["A1"]?.format;
      expect(formatId).toEqual(1);
      expect(exported.formats[formatId!]).toEqual("0.00%");

      functionRegistry.remove("NON.EXPORTABLE");
    });

    test("can export value and format from non-exportable formulas that spread", async () => {
      const model = new Model();

      functionRegistry.add("NON.EXPORTABLE.ARRAY.FORMULA", {
        description: "a non exportable formula that spread",
        args: [],
        compute: function () {
          return [
            [
              { value: 1, format: "0.00%" },
              { value: 2, format: "0" },
            ],
            [
              { value: 3, format: "0.00" },
              { value: 4, format: "0%" },
            ],
          ];
        },
        isExported: false,
      });

      setCellContent(model, "A1", "=NON.EXPORTABLE.ARRAY.FORMULA()");

      const exported = getExportedExcelData(model);
      const cells = exported.sheets[0].cells;

      expect(cells["A1"]?.content).toEqual("1");
      expect(cells["A2"]?.content).toEqual("2");
      expect(cells["B1"]?.content).toEqual("3");
      expect(cells["B2"]?.content).toEqual("4");

      const formatId1 = cells["A1"]?.format;
      expect(exported.formats[formatId1!]).toEqual("0.00%");

      const formatId2 = cells["A2"]?.format;
      expect(exported.formats[formatId2!]).toEqual("0");

      const formatId3 = cells["B1"]?.format;
      expect(exported.formats[formatId3!]).toEqual("0.00");

      const formatId4 = cells["B2"]?.format;
      expect(exported.formats[formatId4!]).toEqual("0%");

      functionRegistry.remove("NON.EXPORTABLE.ARRAY.FORMULA");
    });

    test("Non exportable functions that is evaluated as nothing (aka empty string)", async () => {
      const model = new Model({
        sheets: [{ cells: { A1: { content: '=join("", A2:A3)' } }, rowNumber: 3, colNumber: 1 }],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Multi-Sheets exportable functions", async () => {
      const model = new Model({
        sheets: [allExportableFormulasData.sheets[0], { cells: { A1: { content: "=abs(10)" } } }],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Multi-Sheet export functions with cross references across sheets", async () => {
      const model = new Model({
        sheets: [
          {
            id: "s1",
            name: "Sheet1",
            cells: { A1: { content: "=sum(Sheet2!A1)" }, A2: { content: "2" } },
          },
          {
            id: "s2",
            name: "Sheet2",
            cells: { A1: { content: "5" }, A2: { content: "=sum(Sheet1!A2)" } },
          },
        ],
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  describe("Charts", () => {
    const chartData = {
      sheets: [
        {
          name: "Sheet1",
          // Need a sheet big enough to contain the chart completely.
          colNumber: 25,
          rowNumber: 25,
          rows: {},
          cells: {
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },
            B1: { content: "first column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
            C1: { content: "second column dataset" },
            C2: { content: "20" },
            C3: { content: "19" },
            C4: { content: "18" },
            C5: { content: "17" },
          },
        },
      ],
    };

    test.each([
      ["line", [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }]],
      ["scatter", [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }]],
      ["bar", [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }]],
      ["combo", [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }]],
      ["pie", [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }]],
      ["line", [{ dataRange: "Sheet1!B1:B4" }]],
      ["scatter", [{ dataRange: "Sheet1!B1:B4" }]],
      ["bar", [{ dataRange: "Sheet1!B1:B4" }]],
      ["combo", [{ dataRange: "Sheet1!B1:B4" }]],
      ["pie", [{ dataRange: "Sheet1!B1:B4" }]],
    ])(
      "simple %s chart with dataset %s",
      async (chartType: string, dataSets: CustomizedDataSet[]) => {
        const model = new Model(chartData);
        createChart(
          model,
          {
            dataSets,
            labelRange: "Sheet1!A2:A4",
            type: chartType as "line" | "bar" | "pie" | "combo",
          },
          "1"
        );
        expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
      }
    );

    test.each(["line", "scatter", "bar", "combo"])(
      "simple %s chart with customized dataset",
      async (chartType: string) => {
        const model = new Model(chartData);
        createChart(
          model,
          {
            dataSets: [
              {
                dataRange: "Sheet1!B1:B4",
                backgroundColor: "#FF0000",
                yAxisId: "y",
                label: "coucou",
              },
            ],
            labelRange: "Sheet1!A2:A4",
            type: chartType as "line" | "bar" | "pie" | "combo",
          },
          "1"
        );
        expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
      }
    );

    test.each(["line", "scatter", "bar", "combo"])(
      "simple %s chart with customized title",
      async (chartType: string) => {
        const model = new Model(chartData);
        createChart(
          model,
          {
            dataSets: [{ dataRange: "Sheet1!B1:B4" }],
            title: {
              text: "Coucou",
              align: "right",
              bold: true,
              italic: true,
              color: "#ff0000",
            },
            labelRange: "Sheet1!A2:A4",
            type: chartType as "line" | "bar" | "pie" | "combo",
          },
          "1"
        );
        expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
      }
    );

    test.each(["line", "scatter", "bar", "combo"] as const)(
      "simple %s chart with customized axis",
      async (chartType: string) => {
        const model = new Model(chartData);
        createChart(
          model,
          {
            dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
            axesDesign: {
              x: {
                title: {
                  text: "Coucou",
                  align: "right",
                  bold: true,
                  italic: true,
                  color: "#ff0000",
                },
              },
              y: {
                title: {
                  text: "Coucou 2",
                  align: "left",
                  bold: true,
                  italic: true,
                  color: "#00ff00",
                },
              },
              y1: {
                title: {
                  text: "Coucou 3",
                  align: "center",
                  bold: true,
                  italic: true,
                  color: "#0000ff",
                },
              },
            },
            labelRange: "Sheet1!A2:A4",
            type: chartType as "line" | "bar" | "pie" | "combo",
          },
          "1"
        );
        expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
      }
    );

    test("exported results will not be influenced by `dataSetsHaveTitle` if the dataset contains titles and label range doesn't", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          type: "bar",
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A1:A4",
          dataSetsHaveTitle: true,
        },
        "1"
      );
      createChart(
        model,
        {
          type: "bar",
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          dataSetsHaveTitle: true,
        },
        "2"
      );
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].charts[0].data).toEqual(exported.sheets[0].charts[1].data);
    });

    test("multiple charts in the same sheet", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "line",
        },
        "1"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "bar",
        },
        "2"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test.each(["bar", "line", "pie", "scatter"] as const)(
      "%s chart that aggregate labels is exported as image",
      async (type: ExcelChartType) => {
        const model = new Model({
          sheets: [
            {
              ...chartData.sheets,
              cells: {
                ...chartData.sheets[0].cells,
                A6: { content: "P1" },
                A7: { content: "P2" },
                A8: { content: "P3" },
                A9: { content: "P4" },
                B6: { content: "17" },
                B7: { content: "26" },
                B8: { content: "13" },
                B9: { content: "31" },
                C6: { content: "31" },
                C7: { content: "18" },
                C8: { content: "9" },
                C9: { content: "27" },
              },
            },
          ],
        });
        createChart(
          model,
          {
            dataSets: [{ dataRange: "Sheet1!B1:B9" }],
            labelRange: "Sheet1!A2:A9",
            aggregated: true,
            type,
          },
          "1"
        );
        expect(getExportedExcelData(model).sheets[0].charts.length).toBe(0);
        expect(getExportedExcelData(model).sheets[0].images.length).toBe(1);
      }
    );

    test("Scorecard is exported as an image", () => {
      const model = new Model({
        sheets: chartData.sheets,
      });
      createScorecardChart(model, TEST_CHART_DATA.scorecard);
      expect(getExportedExcelData(model).sheets[0].charts.length).toBe(0);
      expect(getExportedExcelData(model).sheets[0].images.length).toBe(1);
    });

    test("Gauge Chart is exported as an image", () => {
      const model = new Model({
        sheets: chartData.sheets,
      });
      createGaugeChart(model, TEST_CHART_DATA.gauge);
      expect(getExportedExcelData(model).sheets[0].charts.length).toBe(0);
      expect(getExportedExcelData(model).sheets[0].images.length).toBe(1);
    });

    test("stacked bar chart", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          stacked: true,
          type: "bar",
        },
        "1"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("charts in different sheets", async () => {
      const model = new Model(chartData);
      createSheet(model, { sheetId: "42" });
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "line",
        },
        "1"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "bar",
        },
        "2",
        "42"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("chart dataset without title", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "bar",
          dataSetsHaveTitle: false,
        },
        "1"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("chart font color is white with a dark background color", async () => {
      const model = new Model(chartData);
      createSheet(model, { sheetId: "42", name: "She!et2" });
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "bar",
          background: "#EFEFEF",
        },
        "1"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "pie",
          background: "#EEEEEE",
        },
        "2"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "line",
          background: "#DDDDDD",
        },
        "3"
      );
      createChart(
        model,
        {
          dataSets: [{ dataRange: "She!et2!B2:B4" }, { dataRange: "She!et2!C2:C4" }],
          labelRange: "She!et2!A2:A4",
          type: "pie",
          background: "#EEEEEE",
        },
        "4"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Chart legend is set to none position", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B5" }, { dataRange: "Sheet1!C2:C5" }],
          labelRange: "Sheet1!A2:A5",
          type: "bar",
          legendPosition: "none",
        },
        "1"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("pie chart with only title dataset", async () => {
      const model = new Model({});
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!A1" }], // only the title cell, no data
          type: "pie",
          dataSetsHaveTitle: true,
        },
        "1"
      );
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("Export chart overflowing outside the sheet", async () => {
      const model = new Model(chartData);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
          labelRange: "Sheet1!A2:A4",
          type: "bar",
          dataSetsHaveTitle: false,
        },
        "1"
      );
      const sheetId = model.getters.getActiveSheetId();
      const end = model.getters.getColDimensions(
        sheetId,
        model.getters.getNumberCols(sheetId) - 1
      ).end;
      model.dispatch("UPDATE_FIGURE", {
        sheetId: "Sheet1",
        id: "1",
        x: end + 5,
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  describe("Images", () => {
    const getModelData = () => ({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 25,
          rowNumber: 25,
        },
      ],
    });

    test("simple image", async () => {
      const model = new Model(getModelData());
      createImage(model, {});
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("multiple images in the same sheet", async () => {
      const model = new Model(getModelData());
      createImage(model, {});
      createImage(model, { position: { x: 2, y: 2 } });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("images in different sheets", async () => {
      const model = new Model(getModelData());
      createSheet(model, { sheetId: "42" });
      createImage(model, {});
      createImage(model, {
        sheetId: "42",
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("image overflowing outside the sheet", async () => {
      const model = new Model(getModelData());
      createImage(model, {});
      const sheetId = model.getters.getActiveSheetId();
      const end = model.getters.getColDimensions(
        sheetId,
        model.getters.getNumberCols(sheetId) - 1
      ).end;
      model.dispatch("UPDATE_FIGURE", {
        sheetId,
        id: "1",
        x: end + 5,
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test("image larger than the sheet", async () => {
      const model = new Model(getModelData());
      const maxSheetSize = model.getters.getMainViewportRect();
      createImage(model, {
        size: {
          width: 100000 + maxSheetSize.width,
          height: 100000 + maxSheetSize.height,
        },
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  test("multiple elements are exported in the correct order", async () => {
    const model = new Model();
    setCellContent(model, "A1", "[label](url.com)");
    merge(model, "F10:F12");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
        dataSetsHaveTitle: false,
      },
      "1"
    );
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      sheetId: model.getters.getActiveSheetId(),
      ranges: toRangesData(model.getters.getActiveSheetId(), "A1"),
      cf: {
        id: "42",
        rule: {
          type: "CellIsRule",
          operator: "Equal",
          values: ["1"],
          style: { bold: true },
        },
      },
    });
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  test("link cells", async () => {
    const model = new Model();
    setCellContent(model, "A1", "[label](url.com)");
    setCellContent(model, "A2", "[label](http://url.com)");
    setCellContent(model, "A3", `[Sheet1](${buildSheetLink(model.getters.getActiveSheetId())})`);
    setCellContent(
      model,
      "A4",
      `[custom link label](${buildSheetLink(model.getters.getActiveSheetId())})`
    );
    setCellContent(
      model,
      "A5",
      `[Sheet1](${buildSheetLink("invalid id because the sheet was deleted")})`
    );
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  test("Workbook with hidden sheet", async () => {
    const model = new Model({ sheets: [{ id: "sheet0" }, { id: "sheet1", isVisible: false }] });
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  test("Workbook with colored sheet", async () => {
    const model = new Model({ sheets: [{ id: "sheet0" }, { id: "sheet1", color: "#FF0000" }] });
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  test("Sheet with frozen panes", async () => {
    const model = new Model({
      sheets: [{ id: "sheet0" }, { id: "sheet1", panes: { xSplit: 1, ySplit: 2 } }],
    });
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  test("Sheet with hide gridlines", async () => {
    const model = new Model({
      sheets: [{ id: "sheet0" }, { id: "sheet1", areGridLinesVisible: true }],
    });
    expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
  });

  describe("Export data filters", () => {
    test("Table headers formula are replaced with their evaluated formatted value", () => {
      const model = new Model();
      createTable(model, "A1:A4");
      setCellContent(model, "A1", "=DATE(1,1,1)");
      setCellContent(model, "A2", "=DATE(1,1,1)");
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].cells["A1"]?.content).toEqual("1/1/1901");
      expect(exported.sheets[0].cells["A1"]?.value).toEqual("1/1/1901");
      expect(exported.sheets[0].cells["A1"]?.isFormula).toEqual(false);

      expect(exported.sheets[0].cells["A2"]?.content).toEqual("=DATE(1,1,1)");
      expect(exported.sheets[0].cells["A2"]?.value).toEqual(367);
      expect(exported.sheets[0].cells["A2"]?.isFormula).toEqual(true);
    });

    test("Table headers are replaced by unique value", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A1", "Hello");
      setCellContent(model, "B1", "Hello");
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].cells["A1"]?.content).toEqual("Hello");
      expect(exported.sheets[0].cells["A1"]?.value).toEqual("Hello");

      expect(exported.sheets[0].cells["B1"]?.content).toEqual("Hello2");
      expect(exported.sheets[0].cells["B1"]?.value).toEqual("Hello2");
    });

    test("Table headers are replaced by unique formatted value even if table has no filters", () => {
      const model = new Model();
      createTable(model, "A1:A4", { ...DEFAULT_TABLE_CONFIG, hasFilters: false });
      setCellContent(model, "A1", "=DATE(1,1,1)");
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].cells["A1"]?.content).toEqual("1/1/1901");
    });

    test("Table style is correctly exported", async () => {
      const model = new Model();
      createTable(model, "A1:B4", {
        totalRow: true,
        firstColumn: true,
        lastColumn: true,
        numberOfHeaders: 1,
        bandedRows: true,
        bandedColumns: true,
        styleId: "TableStyleMedium9",
      });
      setCellContent(model, "A4", "5");
      setCellContent(model, "B4", "=65+9");
      const exported = await exportPrettifiedXlsx(model);
      const tableFile = exported.files.find((file) => file.path === "xl/tables/table1.xml");
      const xml = parseXML(new XMLString((tableFile as XLSXExportXMLFile)?.content));

      const table = xml.querySelector("table");
      expect(table?.getAttribute("headerRowCount")).toEqual("1");
      expect(table?.getAttribute("totalsRowCount")).toEqual("1");

      const tableStyle = xml.querySelector("tableStyleInfo");
      expect(tableStyle?.getAttribute("name")).toEqual("TableStyleMedium9");
      expect(tableStyle?.getAttribute("showFirstColumn")).toEqual("1");
      expect(tableStyle?.getAttribute("showLastColumn")).toEqual("1");
      expect(tableStyle?.getAttribute("showRowStripes")).toEqual("1");
      expect(tableStyle?.getAttribute("showColumnStripes")).toEqual("1");

      const worksheet = exported.files.find((file) => file.path === "xl/worksheets/sheet0.xml");
      const sheetXML = parseXML(new XMLString((worksheet as XLSXExportXMLFile)?.content));
      const A4 = sheetXML.querySelector("worksheet row c[r='A4']");
      expect(A4?.getAttribute("t")).toEqual("s"); // A4 was exported as a string
      const tableCol2 = xml.querySelector("tableColumn[id='2']");
      expect(tableCol2?.getAttribute("totalsRowFunction")).toEqual("custom"); // Column with B4 has a custom total row function

      expect(tableFile).toMatchSnapshot();
    });

    test("Filtered values are exported and rows are hidden", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A2", "Hello");
      setCellContent(model, "A3", "Konnichiwa");
      setCellContent(model, "A4", '=CONCAT("Bon", "jour")');
      updateFilter(model, "A1", ["Konnichiwa"]);
      const exported = getExportedExcelData(model);
      // Filtered values are the values that are displayed in xlsx, not the values that are hidden
      expect(exported.sheets[0].tables[0].filters[0].displayedValues).toEqual(["Hello", "Bonjour"]);
      expect(exported.sheets[0].rows[2].isHidden).toBeTruthy();
    });

    test("Empty filters aren't exported", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A2", "Hello");
      setCellContent(model, "B2", "Hello");
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].tables[0].filters).toHaveLength(0);
    });

    test("Tables with only one row are not exported", () => {
      const model = new Model();
      setCellContent(model, "A1", "Hello");
      setCellContent(model, "B1", "Hello");
      createTable(model, "A1:B1");
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].tables).toHaveLength(0);
    });

    test("Filtered values are not duplicated", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A2", "Konnichiwa");
      setCellContent(model, "A3", "Konnichiwa");
      setCellContent(model, "A4", "5");
      updateFilter(model, "A1", ["5"]);
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].tables[0].filters[0].displayedValues).toEqual(["Konnichiwa"]);
    });

    test("Empty cells are not added to displayedValues", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A2", "5");
      updateFilter(model, "A1", ["5"]);
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].tables[0].filters[0].displayedValues).toEqual([]);
    });

    test("Formulas evaluated to empty string are not added to displayedValues", () => {
      const model = new Model();
      createTable(model, "A1:B4");
      setCellContent(model, "A2", "5");
      updateFilter(model, "A1", ["5"]);
      setCellContent(model, "A3", '=""');
      const exported = getExportedExcelData(model);
      expect(exported.sheets[0].tables[0].filters[0].displayedValues).toEqual([]);
      expect(exported.sheets[0].tables[0].filters[0].displayBlanks).toEqual(true);
    });

    test("Export data filters snapshot", async () => {
      const model = new Model();
      createTable(model, "A1:C4");

      setCellContent(model, "A1", "Hello");
      setCellContent(model, "A2", "5");
      setCellContent(model, "A3", "5");
      setCellContent(model, "A4", "78");
      updateFilter(model, "A1", ["5"]);

      setCellContent(model, "B1", "Hello");
      setCellContent(model, "B2", '=""');
      setCellContent(model, "B3", "5");
      updateFilter(model, "B1", ["5"]);

      setCellContent(model, "C1", "56");
      setCellContent(model, "C2", "5");
      updateFilter(model, "C2", ["5"]);

      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  test("Invalid ASCII characters are escaped in XML", async () => {
    const model = new Model({ sheets: [{ rowNumber: 200 }] });
    for (let i = 0; i < 127; i++) {
      setCellContent(model, toXC(0, i), String.fromCharCode(i));
    }
    expect(() => exportPrettifiedXlsx(model)).not.toThrow();
  });

  test("Cells with plain text format are exported in the shared strings", async () => {
    const model = new Model();
    setFormat(model, "A1", "@");
    setCellContent(model, "A1", "0006");

    expect(getCellContent(model, "A1")).toEqual("0006");
    const exportedXlsx = await exportPrettifiedXlsx(model);
    const sharedStrings = exportedXlsx.files.find(
      (file) => file.path === "xl/sharedStrings.xml"
    ) as XLSXExportXMLFile;
    expect(sharedStrings.content).toContain("0006");
  });

  describe("Header grouping export", () => {
    test.each<Dimension>(["ROW", "COL"])("Simple grouped headers", async (dim) => {
      const model = new Model();
      groupHeaders(model, dim, 0, 2);
      foldHeaderGroup(model, dim, 0, 2);

      const xlsxExport = getExportedExcelData(model);
      const headers = dim === "COL" ? xlsxExport.sheets[0].cols : xlsxExport.sheets[0].rows;
      expect(headers).toMatchObject({
        0: { isHidden: true, outlineLevel: 1 },
        1: { isHidden: true, outlineLevel: 1 },
        2: { isHidden: true, outlineLevel: 1 },
        3: { isHidden: false, collapsed: true },
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });

    test.each<Dimension>(["COL", "ROW"])("Nested grouped headers", async (dim) => {
      const model = new Model();
      groupHeaders(model, dim, 0, 6);
      groupHeaders(model, dim, 1, 3);
      foldHeaderGroup(model, dim, 1, 3);

      const xlsxExport = getExportedExcelData(model);
      const headers = dim === "COL" ? xlsxExport.sheets[0].cols : xlsxExport.sheets[0].rows;
      expect(headers).toMatchObject({
        0: { isHidden: false, outlineLevel: 1 },
        1: { isHidden: true, outlineLevel: 2 },
        2: { isHidden: true, outlineLevel: 2 },
        3: { isHidden: true, outlineLevel: 2 },
        4: { isHidden: false, outlineLevel: 1, collapsed: true },
        5: { isHidden: false, outlineLevel: 1 },
        6: { isHidden: false, outlineLevel: 1 },
      });
      expect(await exportPrettifiedXlsx(model)).toMatchSnapshot();
    });
  });

  test("Sheet names longer than 31 characters are sliced in the Excel Export", () => {
    const model = new Model();
    const longSheetName = "a".repeat(40);
    const longSheetNameWithSpaces = "Hey " + "a".repeat(40);
    createSheet(model, { name: longSheetNameWithSpaces });
    createSheet(model, { name: longSheetName });
    setCellContent(model, "A1", `='${longSheetNameWithSpaces}'!A1`);
    createChart(model, {
      type: "bar",
      dataSets: [{ dataRange: `${longSheetName}!A1:A4` }],
      labelRange: `${longSheetName}!A1:A4`,
    });

    const fixedSheetName = "a".repeat(31);
    const fixedSheetNameWithSpaces = "Hey " + "a".repeat(27);
    const exportedData = getExportedExcelData(model);
    expect(exportedData.sheets[1].name).toBe(fixedSheetName);
    expect(exportedData.sheets[0].cells["A1"]?.content).toBe(`='${fixedSheetNameWithSpaces}'!A1`);
    expect(exportedData.sheets[0].charts[0].data.labelRange).toBe(`${fixedSheetName}!A2:A4`);
    expect(exportedData.sheets[0].charts[0].data.dataSets[0]).toEqual({
      label: {
        reference: `${fixedSheetName}!A1`,
      },
      range: `${fixedSheetName}!A2:A4`,
      rightYAxis: false,
    });
  });

  test("Avoid duplicated sheet names in excel export if multiple sliced names are the same", () => {
    const model = new Model();
    createSheet(model, { name: "a".repeat(40) });
    createSheet(model, { name: "a".repeat(41) });
    createSheet(model, { name: "a".repeat(42) });
    const exportedExcelData = getExportedExcelData(model);
    expect(exportedExcelData.sheets[1].name).toBe("a".repeat(31));
    expect(exportedExcelData.sheets[2].name).toBe("a".repeat(30) + "1");
    expect(exportedExcelData.sheets[3].name).toBe("a".repeat(30) + "2");
  });

  test("Cells whose content are the same as a too long sheet name are not changed", () => {
    const model = new Model();
    const longFormula = "=A1+A2+A3+A4+A5+A6+A7+A8+A9+A10+A11+A12+A13+A14+A15+A16";
    createSheet(model, { name: longFormula });
    setCellContent(model, "A1", longFormula);
    const exportedExcelData = getExportedExcelData(model);
    expect(exportedExcelData.sheets[1].name).toBe(longFormula.slice(0, 31));
    expect(exportedExcelData.sheets[0].cells["A1"]?.content).toBe(longFormula);
  });
});

describe("XML parser", () => {
  test("simple xml", () => {
    const document = parseXML(escapeXml`<hello>Raoul</hello>`);
    expect(document.firstElementChild?.outerHTML).toBe("<hello>Raoul</hello>");
  });

  test("error on the first line", () => {
    expect(() => parseXML(escapeXml`<hello>Raoul/hello>`)).toThrowError(
      `XML string could not be parsed: 1:19: unclosed tag: hello\n<hello>Raoul/hello>`
    );
  });

  test("error in the middle", () => {
    const xmlString = escapeXml/*xml*/ `<root>
        <hello>1</hello>
        <hello>2</hello>
        <hello>3</WRONG_TAG>
        <hello>4</hello>
        <hello>5</hello>
        <hello>6</hello>
      </root>
    `;
    const errorMessage = `XML string could not be parsed: 4:28: unexpected close tag.
        <hello>1</hello>
        <hello>2</hello>
        <hello>3</WRONG_TAG>
        <hello>4</hello>
        <hello>5</hello>`;
    expect(() => parseXML(xmlString)).toThrowError(errorMessage);
  });

  test("error at the end", () => {
    const xmlString = escapeXml/*xml*/ `<root>
        <hello>1</hello>
        <hello>2</hello>
        <hello>3</hello>
      </WRONG_TAG>
    `;
    const errorMessage = `XML string could not be parsed: 5:18: unexpected close tag.
        <hello>2</hello>
        <hello>3</hello>
      </WRONG_TAG>`;
    expect(() => parseXML(xmlString)).toThrowError(errorMessage);
  });
});
