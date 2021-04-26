/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 7,
  sheets: [
    {
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 120,
      cols: { 1: {}, 3: {} },
      rows: {},
      cells: {
        A21: { content: "Sheet2 => B2:" },
        B2: { content: "Owl is awesome", style: 1 },
        B4: { content: "Numbers", style: 4 },
        B21: { content: "=Sheet2!B2", style: 7 },
        C1: { content: "CF =42" },
        C4: { content: "12.4" },
        C5: { content: "42" },
        C7: { content: "3" },
        B9: { content: "Formulas", style: 5 },
        C9: { content: "= SUM( C4 : C5 )" },
        C10: { content: "=SUM(C4:C7)" },
        D10: { content: "note that C7 is empty" },
        C11: { content: "=-(3 + C7 *SUM(C4:C7))" },
        C12: { content: "=SUM(C9:C11)" },
        D12: { content: "this is a sum of sums" },
        B14: { content: "Errors", style: 6 },
        C14: { content: "=C14" },
        C15: { content: "=(+" },
        C16: { content: "=C15" },
        C17: { content: "=(+)" },
        C18: { content: "=C1{C2" },
        F2: { content: "italic blablah", style: 2 },
        F3: { content: "strikethrough", style: 3 },
        H2: { content: "merged content" },
        C20: { content: "left", border: 1 },
        E20: { content: "top", border: 2 },
        G20: { content: "all", border: 3 },
        B17: { content: "=WAIT(1000)" },
        G13: { content: "=A1+A2+A3+A4+A5+A6+A7+A8+A9+A10+A11+A12+A13+A14+A15+A16+A17+A18" },
        C23: { content: "0.43", format: "0.00%" },
        C24: { content: "10", format: "#,##0.00" },
        C25: { content: "10.123", format: "#,##0.00" },
        G1: { content: "CF color scale:" },
        G2: { content: "5" },
        G3: { content: "8" },
        G4: { content: "9" },
        G5: { content: "15" },
        G6: { content: "22" },
        G8: { content: "30" },
        B26: { content: "first dataset" },
        C26: { content: "second dataset" },
        B27: { content: "12" },
        B28: { content: "=floor(RAND()*50)" },
        B29: { content: "=floor(RAND()*50)" },
        B30: { content: "=floor(RAND()*50)" },
        B31: { content: "=floor(RAND()*50)" },
        B32: { content: "=floor(RAND()*50)" },
        B33: { content: "=floor(RAND()*50)" },
        B34: { content: "19" },
        B35: { content: "=floor(RAND()*50)" },
        C27: { content: "=floor(RAND()*50)" },
        C28: { content: "=floor(RAND()*50)" },
        C29: { content: "=floor(RAND()*50)" },
        C30: { content: "=floor(RAND()*50)" },
        C31: { content: "=floor(RAND()*50)" },
        C32: { content: "=floor(RAND()*50)" },
        C33: { content: "=floor(RAND()*50)" },
        C34: { content: "=floor(RAND()*50)" },
        C35: { content: "=floor(RAND()*50)" },
        A27: { content: "Emily Anderson (Emmy)" },
        A28: { content: "Sophie Allen (Saffi)" },
        A29: { content: "Chloe Adams" },
        A30: { content: "Megan Alexander (Meg)" },
        A31: { content: "Lucy Arnold (Lulu)" },
        A32: { content: "Hannah Alvarez" },
        A33: { content: "Jessica Alcock (Jess)" },
        A34: { content: "Charlotte Anaya" },
        A35: { content: "Lauren Anthony" },
        K3: { border: 5 },
        K4: { border: 4 },
        K5: { border: 4 },
        K6: { border: 4 },
        K7: { border: 4 },
        K8: { border: 6 },
      },
      merges: ["H2:I5", "K3:K8"],
      conditionalFormats: [
        {
          id: "1",
          ranges: ["C1:C100"],
          rule: {
            values: ["42"],
            operator: "Equal",
            type: "CellIsRule",
            style: { fillColor: "#FFA500" },
          },
        },
        {
          id: "2",
          ranges: ["G1:G100"],
          rule: {
            type: "ColorScaleRule",
            minimum: { type: "value", color: 0xffffff },
            maximum: { type: "value", color: 0xff0000 },
          },
        },
      ],
    },
    {
      name: "Sheet2",
      cells: {
        B2: { content: "42" },
      },
      figures: [
        {
          id: "1",
          tag: "chart",
          width: 400,
          height: 300,
          x: 100,
          y: 100,
          data: {
            type: "line",
            title: "demo chart",
            labelRange: "Sheet1!A27:A35",
            dataSets: ["Sheet1!B26:B35", "Sheet1!C26:C35"],
            dataSetsHaveTitle: true,
          },
        },
        {
          id: "2",
          tag: "chart",
          width: 400,
          height: 300,
          x: 600,
          y: 100,
          data: {
            type: "bar",
            title: "demo chart 2",
            labelRange: "Sheet1!A27:A35",
            dataSets: ["Sheet1!B27:B35", "Sheet1!C27:C35"],
            dataSetsHaveTitle: false,
          },
        },
      ],
    },
    {
      name: "Sheet3",
      colNumber: 26,
      rowNumber: 180,
      conditionalFormats: [
        {
          id: "3",
          ranges: ["D1:D180"],
          rule: {
            values: ["1"],
            operator: "Equal",
            type: "CellIsRule",
            style: { fillColor: "#90EE90" },
          },
        },
        {
          id: "4",
          ranges: ["D1:D180"],
          rule: {
            values: ["0"],
            operator: "Equal",
            type: "CellIsRule",
            style: { fillColor: "#EE9090" },
          },
        },
      ],
      cells: {
        A1: { content: "formulas" },
        B1: { content: "evaluation" },
        C1: { content: "expected value" },
        D1: { content: "is it compatible ?" },
        A2: { content: "ABS" },
        B2: { content: "=ABS(-5.5)" },
        C2: { content: "5.5" },
        D2: { content: "=IF(B2=C2,1, 0)" },
        A3: { content: "ACOS" },
        B3: { content: "=ACOS(1)" },
        C3: { content: "0" },
        D3: { content: "=IF(B3=C3,1, 0)" },
        A4: { content: "ACOSH" },
        B4: { content: "=ROUND(ACOSH(2),5)" },
        C4: { content: "1.31696" },
        D4: { content: "=IF(B4=C4,1, 0)" },
        A5: { content: "ACOT" },
        B5: { content: "=ROUND(ACOT(1),5)" },
        C5: { content: "0.7854" }, // =pi/4
        D5: { content: "=IF(B5=C5,1, 0)" },
        A6: { content: "ACOTH" },
        B6: { content: "=ROUND(ACOTH(2),5)" },
        C6: { content: "0.54931" },
        D6: { content: "=IF(B6=C6,1, 0)" },
        A7: { content: "AND" },
        B7: { content: "=AND(TRUE,TRUE)" },
        C7: { content: "TRUE" },
        D7: { content: "=IF(B7=C7,1, 0)" },
        A8: { content: "ASIN" },
        B8: { content: "=ROUND(ASIN(0.5),5)" },
        C8: { content: "0.5236" },
        D8: { content: "=IF(B8=C8,1, 0)" },
        A9: { content: "ASINH" },
        B9: { content: "=ROUND(ASINH(2), 5)" },
        C9: { content: "1.44364" },
        D9: { content: "=IF(B9=C9,1, 0)" },
        A10: { content: "ATAN" },
        B10: { content: "=ROUND(ATAN(1),5)" },
        C10: { content: "0.7854" },
        D10: { content: "=IF(B10=C10,1, 0)" },
        A11: { content: "ATAN2" },
        B11: { content: "=ROUND(ATAN2(-1,0),5)" },
        C11: { content: "3.14159" },
        D11: { content: "=IF(B11=C11,1, 0)" },
        A12: { content: "ATANH" },
        B12: { content: "=ROUND(ATANH(0.7),5)" },
        C12: { content: "0.8673" },
        D12: { content: "=IF(B12=C12,1, 0)" },
        A13: { content: "AVEDEV" },
        B13: { content: "=ROUND(AVEDEV(I2:I9),5)" },
        C13: { content: "2959.1625" },
        D13: { content: "=IF(B13=C13,1, 0)" },
        A14: { content: "AVERAGE" },
        B14: { content: "=ROUND(AVERAGE(H2:H9),5)" },
        C14: { content: "26.25" },
        D14: { content: "=IF(B14=C14,1, 0)" },
        A15: { content: "AVERAGEA" },
        B15: { content: "=AVERAGEA(G2:H9)" },
        C15: { content: "13.125" },
        D15: { content: "=IF(B15=C15,1, 0)" },
        A16: { content: "AVERAGEIF" },
        B16: { content: '=ROUND(AVERAGEIF(J2:J9,">150000" ),5)' },
        C16: { content: "222797" },
        D16: { content: "=IF(B16=C16,1, 0)" },
        A17: { content: "AVERAGEIFS" },
        B17: { content: '=ROUND(AVERAGEIFS(I2:I9,H2:H9,">=30",K2:K9, "<10"),5)' },
        C17: { content: "8376.65" },
        D17: { content: "=IF(B17=C17,1, 0)" },
        A18: { content: "CEILING" },
        B18: { content: "=CEILING(20.4,1)" },
        C18: { content: "21" },
        D18: { content: "=IF(B18=C18,1, 0)" },
        A19: { content: "CEILING.MATH" },
        B19: { content: "=CEILING.MATH(-5.5,1,0)" },
        C19: { content: "-5" },
        D19: { content: "=IF(B19=C19,1, 0)" },
        A20: { content: "CEILING.PRECISE" },
        B20: { content: "=CEILING.PRECISE(230, 100)" },
        C20: { content: "300" },
        D20: { content: "=IF(B20=C20,1, 0)" },
        A21: { content: "CHAR" },
        B21: { content: "=CHAR(74)" },
        C21: { content: "J" },
        D21: { content: "=IF(B21=C21,1, 0)" },
        A22: { content: "COLUMN" },
        B22: { content: "=COLUMN(C4)" },
        C22: { content: "3" },
        D22: { content: "=IF(B22=C22,1, 0)" },
        A23: { content: "COLUMNS" },
        B23: { content: "=COLUMNS(A5:D12)" },
        C23: { content: "4" },
        D23: { content: "=IF(B23=C23,1, 0)" },
        A24: { content: "CONCAT" },
        B24: { content: "=CONCAT(1,23)" },
        C24: { content: '="123"' },
        D24: { content: "=IF(B24=C24,1, 0)" },
        A25: { content: "CONCATENATE" },
        B25: { content: '=CONCATENATE("BUT, ", "MICHEL")' },
        C25: { content: "BUT, MICHEL" },
        D25: { content: "=IF(B25=C25,1, 0)" },
        A26: { content: "COS" },
        B26: { content: "=ROUND(COS(PI()/3),2)" },
        C26: { content: "0.5" },
        D26: { content: "=IF(B26=C26,1, 0)" },
        A27: { content: "COSH" },
        B27: { content: "=ROUND(COSH(2),5)" },
        C27: { content: "3.7622" },
        D27: { content: "=IF(B27=C27,1, 0)" },
        A28: { content: "COT" },
        B28: { content: "=ROUND(COT(PI()/6),5)" },
        C28: { content: "=ROUND(SQRT(3),5)" },
        D28: { content: "=IF(B28=C28,1, 0)" },
        A29: { content: "COTH" },
        B29: { content: "=ROUND(COTH(.5),5)" },
        C29: { content: "2.16395" },
        D29: { content: "=IF(B29=C29,1, 0)" },
        A30: { content: "COUNT" },
        B30: { content: '=COUNT(1,"a","5", "03/14/2021")' },
        C30: { content: "2" },
        D30: { content: "=IF(B30=C30,1, 0)" },
        A31: { content: "COUNTA" },
        B31: { content: '=COUNTA(1,"a","5", "03/14/2021")' },
        C31: { content: "4" },
        D31: { content: "=IF(B31=C31,1, 0)" },
        A32: { content: "COUNTBLANK" },
        B32: { content: '=COUNTBLANK(F1:G1)' },
        C32: { content: "1" },
        D32: { content: "=IF(B32=C32,1, 0)" },
        A33: { content: "COUNTIF" },
        B33: { content: '=COUNTIF(H2:H9,">30")' },
        C33: { content: "2" },
        D33: { content: "=IF(B33=C33,1, 0)" },
        A34: { content: "COUNTIFS" },
        B34: { content: '=COUNTIFS(H2:H9, ">25",K2:K9,"<4")' },
        C34: { content: "3" },
        D34: { content: "=IF(B34=C34,1, 0)" },
        A35: { content: "COVAR" },
        B35: { content: "=ROUND(COVAR(H2:H9,K2:K9),5)" },
        C35: { content: "-2119.25" },
        D35: { content: "=IF(B35=C35,1, 0)" },
        A36: { content: "COVARIANCE.P" },
        B36: { content: "=ROUND(COVARIANCE.P(K2:K9,H2:H9),5)" },
        C36: { content: "-2119.25" },
        D36: { content: "=IF(B36=C36,1, 0)" },
        A37: { content: "COVARIANCE.S" },
        B37: { content: "=ROUND(COVARIANCE.P(I2:I9,J2:J9),5)" },
        C37: { content: "237217364.71641" },
        D37: { content: "=IF(B37=C37,1, 0)" },
        A38: { content: "CSC" },
        B38: { content: "=ROUND(CSC(PI()/4),5)" },
        C38: { content: "=ROUND(SQRT(2),5)" },
        D38: { content: "=IF(B38=C38,1, 0)" },
        A39: { content: "CSCH" },
        B39: { content: "=ROUND(CSCH(pi()/3),5)" },
        C39: { content: "0.80041" },
        D39: { content: "=IF(B39=C39,1, 0)" },
        A40: { content: "DATE" },
        B40: { content: "=DATE(2020,5,25)" },
        C40: { content: "5/25/2020", format: "m/d/yyyy" },
        D40: { content: "=IF(B40=C40,1, 0)" },
        A41: { content: "DATEVALUE" },
        B41: { content: '=DATEVALUE("1969/08/15")' },
        C41: { content: "25430" },
        D41: { content: "=IF(B41=C41,1, 0)" },
        A42: { content: "DAVERAGE" },
        B42: { content: '=ROUND(DAVERAGE(G1:K9,"Tot. Score",J12:J13),5)' },
        C42: { content: "151434.625" },
        D42: { content: "=IF(B42=C42,1, 0)" },
        A43: { content: "DAY" },
        B43: { content: '=DAY("2020/03/17")' },
        C43: { content: "17" },
        D43: { content: "=IF(B43=C43,1, 0)" },
        A44: { content: "DAYS" },
        B44: { content: '=DAYS("2022/03/17", "2021/03/17")' },
        C44: { content: "365" },
        D44: { content: "=IF(B44=C44,1, 0)" },
        A45: { content: "DCOUNT" },
        B45: { content: '=DCOUNT(G1:K9,"Name",H12:H13)' },
        C45: { content: "0" },
        D45: { content: "=IF(B45=C45,1, 0)" },
        A46: { content: "DCOUNTA" },
        B46: { content: '=DCOUNTA(G1:K9,"Name",H12:H13)' },
        C46: { content: "3" },
        D46: { content: "=IF(B46=C46,1, 0)" },
        A47: { content: "DECIMAL" },
        B47: { content: "=DECIMAL(20,16)" },
        C47: { content: "32" },
        D47: { content: "=IF(B47=C47,1, 0)" },
        A48: { content: "DEGREES" },
        B48: { content: "=DEGREES(pi()/4)" },
        C48: { content: "45" },
        D48: { content: "=IF(B48=C48,1, 0)" },
        A49: { content: "DGET" },
        B49: { content: '=DGET(G1:K9, "Hours Played",G12:G13)' },
        C49: { content: "252.4" },
        D49: { content: "=IF(B49=C49,1, 0)" },
        A50: { content: "DMAX" },
        B50: { content: '=DMAX(G1:K9,"Tot. Score", I12:I13)' },
        C50: { content: "=J7" },
        D50: { content: "=IF(B50=C50,1, 0)" },
        A51: { content: "DMIN" },
        B51: { content: '=DMIN(G1:K9,"Tot. Score", H12:H13)' },
        C51: { content: "=J9" },
        D51: { content: "=IF(B51=C51,1, 0)" },
        A52: { content: "DPRODUCT" },
        B52: { content: '=DPRODUCT(G1:K9, "Age",K12:K13)' },
        C52: { content: "333" },
        D52: { content: "=IF(B52=C52,1, 0)" },
        A53: { content: "DSTDEV" },
        B53: { content: '=ROUND(DSTDEV(G1:K9, "Age",H12:H13), 5)' },
        C53: { content: "6.02771" },
        D53: { content: "=IF(B53=C53,1, 0)" },
        A54: { content: "DSTDEVP" },
        B54: { content: '=ROUND(DSTDEVP(G1:K9, "Age",H12:H13), 5)' },
        C54: { content: "4.92161" },
        D54: { content: "=IF(B54=C54,1, 0)" },
        A55: { content: "DSUM" },
        B55: { content: '=DSUM(G1:K9,"Age",I12:I13)' },
        C55: { content: "101" },
        D55: { content: "=IF(B55=C55,1, 0)" },
        A56: { content: "DVAR" },
        B56: { content: '=ROUND(DVAR(G1:K9, "Hours Played",H12:H13),5)' },
        C56: { content: "17560207.92333" },
        D56: { content: "=IF(B56=C56,1, 0)" },
        A57: { content: "DVARP" },
        B57: { content: '=ROUND(DVARP(G1:K9, "Hours Played",H12:H13),5)' },
        C57: { content: "11706805.28222" },
        D57: { content: "=IF(B57=C57,1, 0)" },
        A58: { content: "EDATE" },
        B58: { content: '=EDATE("7/22/1969", -2)' },
        C58: { content: "5/22/1969" },
        D58: { content: "=IF(B58=C58,1, 0)" },
        A59: { content: "EOMONTH" },
        B59: { content: '=EOMONTH("7/21/2020", 1)' },
        C59: { content: "8/31/2020" },
        D59: { content: "=IF(B59=C59,1, 0)" },
        A60: { content: "EXACT" },
        B60: { content: '=EXACT("AbsSdf%", "AbsSdf%")' },
        C60: { content: "TRUE" },
        D60: { content: "=IF(B60=C60,1, 0)" },
        A61: { content: "EXP" },
        B61: { content: "=ROUND(EXP(4),5)" },
        C61: { content: "54.59815" },
        D61: { content: "=IF(B61=C61,1, 0)" },
        A62: { content: "FIND" },
        B62: { content: '=FIND("A", "qbdahbaazo A")' },
        C62: { content: "12" },
        D62: { content: "=IF(B62=C62,1, 0)" },
        A63: { content: "FLOOR" },
        B63: { content: "=FLOOR(5.5, 2)" },
        C63: { content: "4" },
        D63: { content: "=IF(B63=C63,1, 0)" },
        A64: { content: "FLOOR.MATH" },
        B64: { content: "=FLOOR.MATH(-5.55,2, 1)" },
        C64: { content: "-4" },
        D64: { content: "=IF(B64=C64,1, 0)" },
        A65: { content: "FLOOR.PRECISE" },
        B65: { content: "=FLOOR.PRECISE(199,100)" },
        C65: { content: "100" },
        D65: { content: "=IF(B65=C65,1, 0)" },
        A66: { content: "HLOOKUP" },
        B66: { content: '=HLOOKUP("Tot. Score",H1:K9, 4,FALSE)' },
        C66: { content: "110120.5" }, // J4
        D66: { content: "=IF(B66=C66,1, 0)" },
        A67: { content: "HOUR" },
        B67: { content: '=HOUR("2:14:56 AM")' },
        C67: { content: "2" },
        D67: { content: "=IF(B67=C67,1, 0)" },
        A68: { content: "IF" },
        B68: { content: '=IF(TRUE,"TABOURET","JAMBON")' },
        C68: { content: "TABOURET" },
        D68: { content: "=IF(B68=C68,1, 0)" },
        A69: { content: "IFERROR" },
        B69: { content: '=IFERROR(0/0, "no diving by zero.")' },
        C69: { content: "no diving by zero." },
        D69: { content: "=IF(B69=C69,1, 0)" },
        A70: { content: "IFS" },
        B70: {
          content: '=IFS($H2>$H3,"first player is older",$H3>$H2, "second player is older")',
        },
        C70: { content: "first player is older" },
        D70: { content: "=IF(B70=C70,1, 0)" },
        A71: { content: "ISERROR" },
        B71: { content: "=ISERROR(0/0)" },
        C71: { content: "TRUE" },
        D71: { content: "=IF(B71=C71,1, 0)" },
        A72: { content: "ISEVEN" },
        B72: { content: "=ISEVEN(3)" },
        C72: { content: "FALSE" },
        D72: { content: "=IF(B72=C72,1, 0)" },
        A73: { content: "ISLOGICAL" },
        B73: { content: '=ISLOGICAL("TRUE")' },
        C73: { content: "FALSE" },
        D73: { content: "=IF(B73=C73,1, 0)" },
        A74: { content: "ISNONTEXT" },
        B74: { content: "=ISNONTEXT(TRUE)" },
        C74: { content: "TRUE" },
        D74: { content: "=IF(B74=C74,1, 0)" },
        A75: { content: "ISNUMBER" },
        B75: { content: "=ISNUMBER(1231.5)" },
        C75: { content: "TRUE" },
        D75: { content: "=IF(B75=C75,1, 0)" },
        A76: { content: "ISO.CEILING" },
        B76: { content: "=ISO.CEILING(-7.89)" },
        C76: { content: "-7" },
        D76: { content: "=IF(B76=C76,1, 0)" },
        A77: { content: "ISODD" },
        B77: { content: "=ISODD(4)" },
        C77: { content: "FALSE" },
        D77: { content: "=IF(B77=C77,1, 0)" },
        A78: { content: "ISOWEEKNUM" },
        B78: { content: '=ISOWEEKNUM("1/3/2016")' },
        C78: { content: "53" },
        D78: { content: "=IF(B78=C78,1, 0)" },
        A79: { content: "ISTEXT" },
        B79: { content: '=ISTEXT("123")' },
        C79: { content: "TRUE" },
        D79: { content: "=IF(B79=C79,1, 0)" },
        A80: { content: "LARGE" },
        B80: { content: "=LARGE(H2:H9,3)" },
        C80: { content: "30" },
        D80: { content: "=IF(B80=C80,1, 0)" },
        A81: { content: "LEFT" },
        B81: { content: '=LEFT("Mich",4)' },
        C81: { content: "Mich" },
        D81: { content: "=IF(B81=C81,1, 0)" },
        A82: { content: "LEN" },
        B82: { content: '=LEN("anticonstitutionnellement")' },
        C82: { content: "25" },
        D82: { content: "=IF(B82=C82,1, 0)" },
        A83: { content: "LN" },
        B83: { content: "=ROUND(LN(2),5)" },
        C83: { content: "0.69315" },
        D83: { content: "=IF(B83=C83,1, 0)" },
        A84: { content: "LOOKUP" },
        B84: { content: "=LOOKUP(23000,H3:J3,H5:J5)" },
        C84: { content: "50024" },
        D84: { content: "=IF(B84=C84,1, 0)" },
        A85: { content: "LOWER" },
        B85: { content: '=LOWER("オAドB")' },
        C85: { content: "オaドb" },
        D85: { content: "=IF(B85=C85,1, 0)" },
        A86: { content: "MATCH" },
        B86: { content: "=MATCH(42,H2:H9,0)" },
        C86: { content: "4" },
        D86: { content: "=IF(B86=C86,1, 0)" },
        A87: { content: "MAX" },
        B87: { content: "=MAX(N1:N8)" },
        C87: { content: "0.6" },
        D87: { content: "=IF(B87=C87,1, 0)" },
        A88: { content: "MAXA" },
        B88: { content: "=MAXA(N1:N8)" },
        C88: { content: "1" },
        D88: { content: "=IF(B88=C88,1, 0)" },
        A89: { content: "MAXIFS" },
        B89: { content: '=MAXIFS(H2:H9,K2:K9, "<20",K2:K9, "<>4")' },
        C89: { content: "30" },
        D89: { content: "=IF(B89=C89,1, 0)" },
        A90: { content: "MEDIAN" },
        B90: { content: "=MEDIAN(-1, 6, 7, 234, 163845)" },
        C90: { content: "7" },
        D90: { content: "=IF(B90=C90,1, 0)" },
        A91: { content: "MIN" },
        B91: { content: "=MIN(N1:N8)" },
        C91: { content: "0.1" },
        D91: { content: "=IF(B91=C91,1, 0)" },
        A92: { content: "MINA" },
        B92: { content: "=MINA(N1:N8)" },
        C92: { content: "0" },
        D92: { content: "=IF(B92=C92,1, 0)" },
        A93: { content: "MINIFS" },
        B93: { content: '=MINIFS(J2:J9,H2:H9, ">20")' },
        C93: { content: "5000" },
        D93: { content: "=IF(B93=C93,1, 0)" },
        A94: { content: "MINUTE" },
        B94: { content: "=MINUTE(0.126)" },
        C94: { content: "1" },
        D94: { content: "=IF(B94=C94,1, 0)" },
        A95: { content: "MOD" },
        B95: { content: "=MOD(42,12)" },
        C95: { content: "6" },
        D95: { content: "=IF(B95=C95,1, 0)" },
        A96: { content: "MONTH" },
        B96: { content: '=MONTH("5/2/1954")' },
        C96: { content: "5" },
        D96: { content: "=IF(B96=C96,1, 0)" },
        A97: { content: "NETWORKDAYS" },
        B97: { content: '=NETWORKDAYS("1/1/2013", "2/1/2013")' },
        C97: { content: "24" },
        D97: { content: "=IF(B97=C97,1, 0)" },
        A98: { content: "NETWORKDAYS.INTL" },
        B98: { content: '=NETWORKDAYS.INTL("1/1/2013", "2/1/2013", "0000111")' },
        C98: { content: "19" },
        D98: { content: "=IF(B98=C98,1, 0)" },
        A99: { content: "NOT" },
        B99: { content: "=NOT(FALSE)" },
        C99: { content: "TRUE" },
        D99: { content: "=IF(B99=C99,1, 0)" },
        A100: { content: "NOW" },
        B100: { content: "=NOW()" },
        C100: { content: "" },
        D100: { content: "=IF(ISNUMBER(B100),1, 0)" },
        A101: { content: "ODD" },
        B101: { content: "=ODD(4)" },
        C101: { content: "5" },
        D101: { content: "=IF(B101=C101,1, 0)" },
        A102: { content: "OR" },
        B102: { content: '=OR("true", FALSE)' },
        C102: { content: "TRUE" },
        D102: { content: "=IF(B102=C102,1, 0)" },
        A103: { content: "PERCENTILE" },
        B103: { content: "=PERCENTILE(N1:N5,1)" },
        C103: { content: "0.6" },
        D103: { content: "=IF(B103=C103,1, 0)" },
        A104: { content: "PERCENTILE.EXC" },
        B104: { content: "=PERCENTILE.EXC(N1:N5,0.5)" },
        C104: { content: "0.4" },
        D104: { content: "=IF(B104=C104,1, 0)" },
        A105: { content: "PERCENTILE.INC" },
        B105: { content: "=PERCENTILE.INC(N1:N5,0)" },
        C105: { content: "0.1" },
        D105: { content: "=IF(B105=C105,1, 0)" },
        A106: { content: "PI" },
        B106: { content: "=ROUND(PI(), 5)" },
        C106: { content: "3.14159" },
        D106: { content: "=IF(B106=C106,1, 0)" },
        A107: { content: "POWER" },
        B107: { content: "=POWER(42,2)" },
        C107: { content: "1764" },
        D107: { content: "=IF(B107=C107,1, 0)" },
        A108: { content: "PRODUCT" },
        B108: { content: "=PRODUCT(1,2,3)" },
        C108: { content: "6" },
        D108: { content: "=IF(B108=C108,1, 0)" },
        A109: { content: "QUARTILE" },
        B109: { content: "=QUARTILE(N1:N5, 0)" },
        C109: { content: "0.1" },
        D109: { content: "=IF(B109=C109,1, 0)" },
        A110: { content: "QUARTILE.EXC" },
        B110: { content: "=ROUND(QUARTILE.EXC(N1:N5, 1),5)" },
        C110: { content: "0.15" },
        D110: { content: "=IF(B110=C110,1, 0)" },
        A111: { content: "QUARTILE.INC" },
        B111: { content: "=QUARTILE.INC(N1:N5 ,4)" },
        C111: { content: "0.6" },
        D111: { content: "=IF(B111=C111,1, 0)" },
        A112: { content: "RAND" },
        B112: { content: "=RAND()" },
        C112: { content: "" },
        D112: { content: "=IF(AND(B112>=0,B112<1 ),1, 0)" },
        A113: { content: "RANDBETWEEN" },
        B113: { content: "=RANDBETWEEN(1.1,2)" },
        C113: { content: "2" },
        D113: { content: "=IF(B113=C113,1, 0)" },
        A114: { content: "REPLACE" },
        B114: { content: '=REPLACE("ABZ", 2, 1, "Y")' },
        C114: { content: "AYZ" },
        D114: { content: "=IF(B114=C114,1, 0)" },
        A115: { content: "RIGHT" },
        B115: { content: '=RIGHT("kikou", 2)' },
        C115: { content: "ou" },
        D115: { content: "=IF(B115=C115,1, 0)" },
        A116: { content: "ROUND" },
        B116: { content: "=ROUND(49.9)" },
        C116: { content: "50" },
        D116: { content: "=IF(B116=C116,1, 0)" },
        A117: { content: "ROUNDDOWN" },
        B117: { content: "=ROUNDDOWN(42, -1)" },
        C117: { content: "40" },
        D117: { content: "=IF(B117=C117,1, 0)" },
        A118: { content: "ROUNDUP" },
        B118: { content: "=ROUNDUP(-1.6,0)" },
        C118: { content: "-2" },
        D118: { content: "=IF(B118=C118,1, 0)" },
        A119: { content: "ROW" },
        B119: { content: "=ROW(A234)" },
        C119: { content: "234" },
        D119: { content: "=IF(B119=C119,1, 0)" },
        A120: { content: "ROWS" },
        B120: { content: "=ROWS(B3:C40)" },
        C120: { content: "38" },
        D120: { content: "=IF(B120=C120,1, 0)" },
        A121: { content: "SEARCH" },
        B121: { content: '=SEARCH("C", "ABCD")' },
        C121: { content: "3" },
        D121: { content: "=IF(B121=C121,1, 0)" },
        A122: { content: "SEC" },
        B122: { content: "=ROUND(SEC(PI()/3),5)" },
        C122: { content: "2" },
        D122: { content: "=IF(B122=C122,1, 0)" },
        A123: { content: "SECH" },
        B123: { content: "=ROUND(SECH(1), 5)" },
        C123: { content: "0.64805" },
        D123: { content: "=IF(B123=C123,1, 0)" },
        A124: { content: "SECOND" },
        B124: { content: '=SECOND("0:21:42")' },
        C124: { content: "42" },
        D124: { content: "=IF(B124=C124,1, 0)" },
        A125: { content: "SIN" },
        B125: { content: "=ROUND(SIN(PI()/6),5)" },
        C125: { content: "0.5" },
        D125: { content: "=IF(B125=C125,1, 0)" },
        A126: { content: "SINH" },
        B126: { content: "=ROUND(SINH(1),5)" },
        C126: { content: " 1.1752" },
        D126: { content: "=IF(B126=C126,1, 0)" },
        A127: { content: "SMALL" },
        B127: { content: "=SMALL(H2:H9, 3)" },
        C127: { content: "26" },
        D127: { content: "=IF(B127=C127,1, 0)" },
        A128: { content: "SQRT" },
        B128: { content: "=SQRT(4)" },
        C128: { content: "2" },
        D128: { content: "=IF(B128=C128,1, 0)" },
        A129: { content: "STDEV" },
        B129: { content: "=STDEV(-2,0,2)" },
        C129: { content: "2" },
        D129: { content: "=IF(B129=C129,1, 0)" },
        A130: { content: "STDEV.P" },
        B130: { content: "=STDEV.P(2,4)" },
        C130: { content: "1" },
        D130: { content: "=IF(B130=C130,1, 0)" },
        A131: { content: "STDEV.S" },
        B131: { content: "=STDEV.S(2,4,6)" },
        C131: { content: "2" },
        D131: { content: "=IF(B131=C131,1, 0)" },
        A132: { content: "STDEVA" },
        B132: { content: "=STDEVA(TRUE, 3,5)" },
        C132: { content: "2" },
        D132: { content: "=IF(B132=C132,1, 0)" },
        A133: { content: "STDEVP" },
        B133: { content: "=ROUND(STDEVP(2,5,8),2)" },
        C133: { content: "2.45" },
        D133: { content: "=IF(B133=C133,1, 0)" },
        A134: { content: "STDEVPA" },
        B134: { content: "=ROUND(STDEVPA(TRUE, 4,7),2)" },
        C134: { content: "2.45" },
        D134: { content: "=IF(B134=C134,1, 0)" },
        A135: { content: "SUBSTITUTE" },
        B135: { content: '=SUBSTITUTE("SAP is best", "SAP", "Odoo")' },
        C135: { content: "Odoo is best" },
        D135: { content: "=IF(B135=C135,1, 0)" },
        A136: { content: "SUM" },
        B136: { content: "=SUM(1,2,3,4,5)" },
        C136: { content: "15" },
        D136: { content: "=IF(B136=C136,1, 0)" },
        A137: { content: "SUMIF" },
        B137: { content: '=SUMIF(K2:K9, "<100")' },
        C137: { content: "52" },
        D137: { content: "=IF(B137=C137,1, 0)" },
        A138: { content: "SUMIFS" },
        B138: { content: '=SUMIFS(H2:H9,K2:K9, "<100")' },
        C138: { content: "201" },
        D138: { content: "=IF(B138=C138,1, 0)" },
        A139: { content: "TAN" },
        B139: { content: "=ROUND(TAN(PI()/4),5)" },
        C139: { content: "1" },
        D139: { content: "=IF(B139=C139,1, 0)" },
        A140: { content: "TANH" },
        B140: { content: "=ROUND(TANH(1),5)" },
        C140: { content: "0.76159" },
        D140: { content: "=IF(B140=C140,1, 0)" },
        A141: { content: "TEXTJOIN" },
        B141: { content: '=TEXTJOIN("-",TRUE,"","1","A","%")' },
        C141: { content: "1-A-%" },
        D141: { content: "=IF(B141=C141,1, 0)" },
        A142: { content: "TIME" },
        B142: { content: "=TIME(9,11,31)" },
        C142: { content: "9:11:31 AM", format: "hh:mm:ss a" },
        D142: { content: "=IF(B142=C142,1, 0)" },
        A143: { content: "TIMEVALUE" },
        B143: { content: '=TIMEVALUE("1899 10 08 18:00")' },
        C143: { content: "0.75" },
        D143: { content: "=IF(B143=C143,1, 0)" },
        A144: { content: "TODAY" },
        B144: { content: "=TODAY()" },
        C144: { content: "" },
        D144: { content: "=IF(ISNUMBER(B144),1, 0)" },
        A145: { content: "TRIM" },
        B145: { content: '=TRIM(" Jean Ticonstitutionnalise ")' },
        C145: { content: "Jean Ticonstitutionnalise" },
        D145: { content: "=IF(B145=C145,1, 0)" },
        A146: { content: "TRUNC" },
        B146: { content: "=TRUNC(42.42, 1)" },
        C146: { content: "42.4" },
        D146: { content: "=IF(B146=C146,1, 0)" },
        A147: { content: "UPPER" },
        B147: { content: '=UPPER("grrrr !")' },
        C147: { content: "GRRRR !" },
        D147: { content: "=IF(B147=C147,1, 0)" },
        A148: { content: "VAR" },
        B148: { content: "=ROUND(VAR(K1:K5),5)" },
        C148: { content: "2.91667" },
        D148: { content: "=IF(B148=C148,1, 0)" },
        A149: { content: "VAR.P" },
        B149: { content: "=ROUND(VAR.P(K1:K5),5)" },
        C149: { content: "2.1875" },
        D149: { content: "=IF(B149=C149,1, 0)" },
        A150: { content: "VAR.S" },
        B150: { content: "=VAR.S(2,5,8)" },
        C150: { content: "9" },
        D150: { content: "=IF(B150=C150,1, 0)" },
        A151: { content: "VARA" },
        B151: { content: "=ROUND(VARA(K1:K5),5)" },
        C151: { content: "6.7" },
        D151: { content: "=IF(B151=C151,1, 0)" },
        A152: { content: "VARP" },
        B152: { content: "=ROUND(VARP(K1:K5),5)" },
        C152: { content: "2.1875" },
        D152: { content: "=IF(B152=C152,1, 0)" },
        A153: { content: "VARPA" },
        B153: { content: "=ROUND(VARPA(K1:K5),5)" },
        C153: { content: "5.36" },
        D153: { content: "=IF(B153=C153,1, 0)" },
        A154: { content: "VLOOKUP" },
        B154: { content: '=VLOOKUP("NotACheater",G1:K9, 3, FALSE)' },
        C154: { content: "=252.4" }, //I4
        D154: { content: "=IF(B154=C154,1, 0)" },
        A155: { content: "WEEKDAY" },
        B155: { content: '=WEEKDAY("6/12/2021")' },
        C155: { content: "7" },
        D155: { content: "=IF(B155=C155,1, 0)" },
        A156: { content: "WEEKNUM" },
        B156: { content: '=WEEKNUM("6/29/2021")' },
        C156: { content: "27" },
        D156: { content: "=IF(B156=C156,1, 0)" },
        A157: { content: "WORKDAY" },
        B157: { content: '=WORKDAY("3/15/2021", 6)' },
        C157: { content: "3/23/2021" },
        D157: { content: "=IF(B157=C157,1, 0)" },
        A158: { content: "WORKDAY.INTL" },
        B158: { content: '=WORKDAY.INTL("3/15/2021", 6, "0111111")' },
        C158: { content: "4/26/2021" },
        D158: { content: "=IF(B158=C158,1, 0)" },
        A159: { content: "XOR" },
        B159: { content: "=XOR(false, true, false, false)" },
        C159: { content: "TRUE" },
        D159: { content: "=IF(B159=C159,1, 0)" },
        A160: { content: "YEAR" },
        B160: { content: '=YEAR("3/12/2012")' },
        C160: { content: "2012" },
        D160: { content: "=IF(B160=C160,1, 0)" },

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
  styles: {
    1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    2: { italic: true },
    3: { strikethrough: true },
    4: { fillColor: "#e3efd9" },
    5: { fillColor: "#c5e0b3" },
    6: { fillColor: "#a7d08c" },
    7: { align: "left" },
    8: { bold: true, fontSize: 11 },
  },
  borders: {
    1: { left: ["thin", "#000"] },
    2: { top: ["thin", "#000"] },
    3: {
      top: ["thin", "#000"],
      left: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"],
    },
    4: { right: ["thin", "#000"], left: ["thin", "#000"] },
    5: {
      left: ["thin", "#000"],
      right: ["thin", "#000"],
      top: ["thin", "#000"],
    },
    6: {
      left: ["thin", "#000"],
      right: ["thin", "#000"],
      bottom: ["thin", "#000"],
    },
  },
};

// Performance dataset
function _getColumnLetter(number) {
  return number !== -1
    ? _getColumnLetter(Math.floor(number / 26) - 1) + String.fromCharCode(65 + (number % 26))
    : "";
}

function computeCells(cols, rows) {
  const cells = {};
  for (let letter = 0; letter <= cols; letter++) {
    const x = _getColumnLetter(letter);
    if (letter === 0) {
      cells[x + 3] = { content: letter.toString() };
    } else {
      const prev = _getColumnLetter(letter - 1);
      cells[x + 3] = {
        formula: { text: "=2*|0|", dependencies: [`${prev}${rows}`] },
      };
    }
    for (let index = 4; index <= rows; index++) {
      cells[x + index] = {
        formula: { text: "=|0|+1", dependencies: [`${x}${index - 1}`] },
      };
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i <= rows; i++) {
    cells[nextLetter + i] = {
      formula: { text: "=SUM(|0|)", dependencies: [`A${i}:${letter}${i}`] },
    };
  }
  return cells;
}

export function makeLargeDataset(cols, rows) {
  return {
    version: 6,
    sheets: [
      {
        name: "Sheet1",
        colNumber: cols,
        rowNumber: rows,
        cols: { 1: {}, 3: {} },
        rows: {},
        cells: computeCells(cols, rows),
      },
    ],
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
      2: { italic: true },
      3: { strikethrough: true },
      4: { fillColor: "#e3efd9" },
      5: { fillColor: "#c5e0b3" },
      6: { fillColor: "#a7d08c" },
    },
    borders: {},
  };
}
