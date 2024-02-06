/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 14,
  sheets: [
    {
      id: "sh1",
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 120,
      rows: {},
      cols: {},
      merges: ["H2:I5", "K3:K8"],
      cells: {
        A21: {
          content: "[Sheet2 => B2:](o-spreadsheet://sh2)",
        },
        A23: {
          content: "https://odoo.com",
        },
        A27: {
          content: "Emily Anderson (Emmy)",
        },
        A28: {
          content: "Sophie Allen (Saffi)",
        },
        A29: {
          content: "Chloe Adams",
        },
        A30: {
          content: "Megan Alexander (Meg)",
        },
        A31: {
          content: "Lucy Arnold (Lulu)",
        },
        A32: {
          content: "Hannah Alvarez",
        },
        A33: {
          content: "Jessica Alcock (Jess)",
        },
        A34: {
          content: "Charlotte Anaya",
        },
        A35: {
          content: "Lauren Anthony",
        },
        B2: {
          style: 1,
          content: "[Owl is awesome](https://github.com/odoo/owl)",
        },
        B4: {
          style: 2,
          content: "Numbers",
        },
        B9: {
          style: 3,
          content: "Formulas",
        },
        B14: {
          style: 4,
          content: "Errors",
        },
        B21: {
          content: "=~0",
          formulaTokens: ["Charts!B2"],
        },
        B26: {
          content: "first dataset",
        },
        B27: {
          content: "12",
        },
        B28: {
          content: "=floor(RAND()*50)",
        },
        B29: {
          content: "=floor(RAND()*50)",
        },
        B30: {
          content: "=floor(RAND()*50)",
        },
        B31: {
          content: "=floor(RAND()*50)",
        },
        B32: {
          content: "=floor(RAND()*50)",
        },
        B33: {
          content: "=floor(RAND()*50)",
        },
        B34: {
          content: "19",
        },
        B35: {
          content: "=floor(RAND()*50)",
        },
        C1: {
          content: "CF =42",
        },
        C4: {
          content: "12.4",
        },
        C5: {
          content: "42",
        },
        C7: {
          content: "3",
        },
        C9: {
          content: "= SUM( ~0 )",
          formulaTokens: ["C4:C5"],
        },
        C10: {
          content: "=SUM(~0)",
          formulaTokens: ["C4:C7"],
        },
        C11: {
          content: "=-(3 + ~0 *SUM(~1))",
          formulaTokens: ["C7", "C4:C7"],
        },
        C12: {
          content: "=SUM(~0)",
          formulaTokens: ["C9:C11"],
        },
        C14: {
          content: "=~0",
          formulaTokens: ["C14"],
        },
        C15: {
          content: "=(+",
        },
        C16: {
          content: "=~0",
          formulaTokens: ["C15"],
        },
        C17: {
          content: "=(+)",
        },
        C18: {
          content: "=C1{C2",
        },
        C23: {
          format: 1,
          content: "0.43",
        },
        C24: {
          format: 2,
          content: "10",
        },
        C25: {
          format: 2,
          content: "10.123",
        },
        C26: {
          content: "second dataset",
        },
        C27: {
          content: "=floor(RAND()*50)",
        },
        C28: {
          content: "=floor(RAND()*50)",
        },
        C29: {
          content: "=floor(RAND()*50)",
        },
        C30: {
          content: "=floor(RAND()*50)",
        },
        C31: {
          content: "=floor(RAND()*50)",
        },
        C32: {
          content: "=floor(RAND()*50)",
        },
        C33: {
          content: "=floor(RAND()*50)",
        },
        C34: {
          content: "=floor(RAND()*50)",
        },
        C35: {
          content: "=floor(RAND()*50)",
        },
        D10: {
          content: "note that C7 is empty",
        },
        D12: {
          content: "this is a sum of sums",
        },
        F2: {
          style: 5,
          content: "italic blablah",
        },
        F3: {
          style: 6,
          content: "strikethrough",
        },
        F4: {
          style: 7,
          content: "underline",
        },
        G1: {
          content: "CF color scale:",
        },
        G2: {
          content: "5",
        },
        G3: {
          content: "8",
        },
        G4: {
          content: "9",
        },
        G5: {
          content: "15",
        },
        G6: {
          content: "22",
        },
        G8: {
          content: "30",
        },
        G13: {
          content: "=~0+~1+~2+~3+~4+~5+~6+~7+~8+~9+~10+~11+~12+~13+~14+~15+~16+~17",
          formulaTokens: [
            "A1",
            "A2",
            "A3",
            "A4",
            "A5",
            "A6",
            "A7",
            "A8",
            "A9",
            "A10",
            "A11",
            "A12",
            "A13",
            "A14",
            "A15",
            "A16",
            "A17",
            "A18",
          ],
        },
        H2: {
          content: "merged content",
        },
        H22: {
          content: "Col 1",
        },
        H23: {
          content: "0",
        },
        H24: {
          content: "1",
        },
        H25: {
          content: "2",
        },
        H26: {
          content: "3",
        },
        H27: {
          content: "4",
        },
        H28: {
          content: "5",
        },
        H29: {
          content: "6",
        },
        H30: {
          content: "7",
        },
        H31: {
          content: "8",
        },
        H32: {
          content: "9",
        },
        H33: {
          content: "10",
        },
        I22: {
          content: "Col 2",
        },
        I23: {
          content: "0",
        },
        I24: {
          content: "1",
        },
        I25: {
          content: "2",
        },
        I26: {
          content: "3",
        },
        I27: {
          content: "4",
        },
        I28: {
          content: "5",
        },
        I29: {
          content: "4",
        },
        I30: {
          content: "3",
        },
        I31: {
          content: "2",
        },
        I32: {
          content: "1",
        },
        I33: {
          content: "0",
        },
      },
      conditionalFormats: [
        {
          id: "1",
          ranges: ["C1:C100"],
          rule: {
            values: ["42"],
            operator: "Equal",
            type: "CellIsRule",
            style: {
              fillColor: "#FFA500",
            },
          },
        },
        {
          id: "2",
          ranges: ["G1:G100"],
          rule: {
            type: "ColorScaleRule",
            minimum: {
              type: "value",
              color: 16777215,
            },
            maximum: {
              type: "value",
              color: 16711680,
            },
          },
        },
        {
          id: "3",
          ranges: ["H23:H33"],
          rule: {
            type: "IconSetRule",
            upperInflectionPoint: {
              type: "percentage",
              value: "66",
              operator: "gt",
            },
            lowerInflectionPoint: {
              type: "percentage",
              value: "33",
              operator: "gt",
            },
            icons: {
              upper: "arrowGood",
              middle: "dotNeutral",
              lower: "arrowBad",
            },
          },
        },
        {
          id: "4",
          ranges: ["I23:I33"],
          rule: {
            type: "IconSetRule",
            upperInflectionPoint: {
              type: "number",
              value: "4",
              operator: "ge",
            },
            lowerInflectionPoint: {
              type: "number",
              value: "2",
              operator: "ge",
            },
            icons: {
              upper: "smileyGood",
              middle: "smileyNeutral",
              lower: "smileyBad",
            },
          },
        },
      ],
      figures: [],
      filterTables: [
        {
          range: "H22:I33",
        },
      ],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [],
    },
    {
      id: "sh2",
      name: "Charts",
      colNumber: 26,
      rowNumber: 100,
      rows: {},
      cols: {},
      merges: [],
      cells: {
        B2: {
          content: "42",
        },
      },
      conditionalFormats: [],
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
            dataSetsHaveTitle: true,
            background: "#FFFFFF",
            dataSets: ["Sheet1!B26:B35", "Sheet1!C26:C35"],
            legendPosition: "top",
            verticalAxisPosition: "left",
            labelRange: "Sheet1!A27:A35",
            title: "Line",
            stacked: false,
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
            dataSetsHaveTitle: false,
            background: "#FFFFFF",
            dataSets: ["Sheet1!B27:B35", "Sheet1!C27:C35"],
            legendPosition: "top",
            verticalAxisPosition: "left",
            labelRange: "Sheet1!A27:A35",
            title: "Bar",
            stacked: false,
          },
        },
        {
          id: "3",
          tag: "chart",
          width: 900,
          height: 400,
          x: 100,
          y: 420,
          data: {
            type: "pie",
            dataSetsHaveTitle: true,
            background: "#FFFFFF",
            dataSets: ["Sheet1!B26:B35", "Sheet1!C26:C35"],
            legendPosition: "top",
            labelRange: "Sheet1!A27:A35",
            title: "Pie",
          },
        },
        {
          id: "4",
          x: 1015,
          y: 102,
          height: 296,
          width: 465,
          tag: "chart",
          data: {
            baselineColorDown: "#DC6965",
            baselineColorUp: "#00A04A",
            baselineMode: "absolute",
            title: "Scorecard",
            type: "scorecard",
            background: "#FFFFFF",
            baseline: "Sheet1!B28",
            baselineDescr: "Descr",
            keyValue: "Sheet1!B29",
          },
        },
        {
          id: "5",
          x: 1015,
          y: 420,
          height: 400,
          width: 465,
          tag: "chart",
          data: {
            background: "#FFFFFF",
            sectionRule: {
              colors: {
                lowerColor: "#cc0000",
                middleColor: "#f1c232",
                upperColor: "#6aa84f",
              },
              rangeMin: "0",
              rangeMax: "100",
              lowerInflectionPoint: {
                type: "percentage",
                value: "15",
              },
              upperInflectionPoint: {
                type: "percentage",
                value: "40",
              },
            },
            title: "Gauge",
            type: "gauge",
            dataRange: "Sheet1!B29",
          },
        },
      ],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [],
    },
    {
      id: "sh3",
      name: "Split Panes",
      colNumber: 41,
      rowNumber: 60,
      rows: {},
      cols: {
        0: {
          size: 61,
        },
        1: {
          size: 97,
        },
        2: {
          size: 25,
        },
        3: {
          size: 25,
        },
        4: {
          size: 25,
        },
        5: {
          size: 25,
        },
        6: {
          size: 25,
        },
        7: {
          size: 25,
        },
        8: {
          size: 25,
        },
        9: {
          size: 25,
        },
        10: {
          size: 25,
        },
        11: {
          size: 25,
        },
        12: {
          size: 25,
        },
        13: {
          size: 25,
        },
        14: {
          size: 25,
        },
        15: {
          size: 25,
        },
        16: {
          size: 25,
        },
      },
      merges: [],
      cells: {
        B1: {
          content: "won't scroll",
        },
        B7: {
          content: "scroll vertically",
        },
        D2: {
          content: "scroll horizontally",
        },
        D6: {
          style: 8,
        },
        D7: {
          style: 8,
        },
        D8: {
          style: 8,
        },
        D9: {
          style: 8,
        },
        D10: {
          style: 8,
        },
        D11: {
          style: 8,
        },
        D12: {
          style: 8,
        },
        D13: {
          style: 8,
        },
        D14: {
          style: 8,
        },
        D15: {
          style: 8,
        },
        D16: {
          style: 8,
        },
        D17: {
          style: 8,
        },
        E6: {
          style: 8,
        },
        E7: {
          style: 8,
        },
        E8: {
          style: 8,
        },
        E9: {
          style: 8,
        },
        E14: {
          style: 8,
        },
        E15: {
          style: 8,
        },
        E16: {
          style: 8,
        },
        E17: {
          style: 8,
        },
        F6: {
          style: 8,
        },
        F7: {
          style: 8,
        },
        F8: {
          style: 8,
        },
        F15: {
          style: 8,
        },
        F16: {
          style: 8,
        },
        F17: {
          style: 8,
        },
        G6: {
          style: 8,
        },
        G7: {
          style: 8,
        },
        G16: {
          style: 8,
        },
        G17: {
          style: 8,
        },
        H6: {
          style: 8,
        },
        H8: {
          style: 9,
        },
        H9: {
          style: 9,
        },
        H10: {
          style: 9,
        },
        H17: {
          style: 8,
        },
        I6: {
          style: 8,
        },
        I7: {
          style: 9,
        },
        I8: {
          style: 9,
        },
        I9: {
          style: 9,
        },
        I10: {
          style: 9,
        },
        I11: {
          style: 9,
        },
        I17: {
          style: 8,
        },
        J6: {
          style: 8,
        },
        J7: {
          style: 9,
        },
        J8: {
          style: 9,
        },
        J10: {
          style: 9,
        },
        J11: {
          style: 9,
        },
        J14: {
          style: 9,
        },
        J17: {
          style: 8,
        },
        K6: {
          style: 8,
        },
        K7: {
          style: 9,
        },
        K8: {
          style: 9,
        },
        K9: {
          style: 9,
        },
        K10: {
          style: 9,
        },
        K11: {
          style: 9,
        },
        K17: {
          style: 8,
        },
        L6: {
          style: 8,
        },
        L7: {
          style: 9,
        },
        L8: {
          style: 9,
        },
        L9: {
          style: 9,
        },
        L10: {
          style: 9,
        },
        L11: {
          style: 9,
        },
        L12: {
          style: 9,
        },
        L16: {
          style: 9,
        },
        L17: {
          style: 8,
        },
        M6: {
          style: 8,
        },
        M7: {
          style: 8,
        },
        M8: {
          style: 9,
        },
        M9: {
          style: 9,
        },
        M10: {
          style: 9,
        },
        M11: {
          style: 9,
        },
        M12: {
          style: 9,
        },
        M13: {
          style: 9,
        },
        M14: {
          style: 9,
        },
        M15: {
          style: 9,
        },
        M16: {
          style: 8,
        },
        M17: {
          style: 8,
        },
        N6: {
          style: 8,
        },
        N7: {
          style: 8,
        },
        N8: {
          style: 8,
        },
        N9: {
          style: 9,
        },
        N10: {
          style: 9,
        },
        N11: {
          style: 9,
        },
        N12: {
          style: 9,
        },
        N13: {
          style: 9,
        },
        N14: {
          style: 9,
        },
        N15: {
          style: 8,
        },
        N16: {
          style: 8,
        },
        N17: {
          style: 8,
        },
        O6: {
          style: 8,
        },
        O7: {
          style: 8,
        },
        O8: {
          style: 8,
        },
        O9: {
          style: 8,
        },
        O10: {
          style: 9,
        },
        O11: {
          style: 9,
        },
        O12: {
          style: 9,
        },
        O13: {
          style: 9,
        },
        O14: {
          style: 8,
        },
        O15: {
          style: 8,
        },
        O16: {
          style: 8,
        },
        O17: {
          style: 8,
        },
        P6: {
          style: 8,
        },
        P7: {
          style: 8,
        },
        P8: {
          style: 8,
        },
        P9: {
          style: 8,
        },
        P10: {
          style: 8,
        },
        P11: {
          style: 8,
        },
        P12: {
          style: 8,
        },
        P13: {
          style: 8,
        },
        P14: {
          style: 8,
        },
        P15: {
          style: 8,
        },
        P16: {
          style: 8,
        },
        P17: {
          style: 8,
        },
      },
      conditionalFormats: [
        {
          id: "1AAAB",
          ranges: ["A1:AO4", "A5:B60"],
          rule: {
            values: [],
            operator: "IsEmpty",
            type: "CellIsRule",
            style: {
              fillColor: "#AECFBB",
            },
          },
        },
      ],
      figures: [],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      panes: {
        xSplit: 2,
        ySplit: 4,
      },
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [],
    },
    {
      id: "sh4",
      name: "Excel Formulas",
      colNumber: 26,
      rowNumber: 223,
      rows: {},
      cols: {},
      merges: [],
      cells: {
        A1: {
          content: "formulas",
        },
        A2: {
          content: "ABS",
        },
        A3: {
          content: "ACOS",
        },
        A4: {
          content: "ACOSH",
        },
        A5: {
          content: "ACOT",
        },
        A6: {
          content: "ACOTH",
        },
        A7: {
          content: "AND",
        },
        A8: {
          content: "ASIN",
        },
        A9: {
          content: "ASINH",
        },
        A10: {
          content: "ATAN",
        },
        A11: {
          content: "ATAN2",
        },
        A12: {
          content: "ATANH",
        },
        A13: {
          content: "AVEDEV",
        },
        A14: {
          content: "AVERAGE",
        },
        A15: {
          content: "AVERAGEA",
        },
        A16: {
          content: "AVERAGEIF",
        },
        A17: {
          content: "AVERAGEIFS",
        },
        A18: {
          content: "CEILING",
        },
        A19: {
          content: "CEILING.MATH",
        },
        A20: {
          content: "CEILING.PRECISE",
        },
        A21: {
          content: "CHAR",
        },
        A22: {
          content: "COLUMN",
        },
        A23: {
          content: "COLUMNS",
        },
        A24: {
          content: "CONCAT",
        },
        A25: {
          content: "CONCATENATE",
        },
        A26: {
          content: "COS",
        },
        A27: {
          content: "COSH",
        },
        A28: {
          content: "COT",
        },
        A29: {
          content: "COTH",
        },
        A30: {
          content: "COUNT",
        },
        A31: {
          content: "COUNTA",
        },
        A32: {
          content: "COUNTBLANK",
        },
        A33: {
          content: "COUNTIF",
        },
        A34: {
          content: "COUNTIFS",
        },
        A35: {
          content: "COVAR",
        },
        A36: {
          content: "COVARIANCE.P",
        },
        A37: {
          content: "COVARIANCE.S",
        },
        A38: {
          content: "CSC",
        },
        A39: {
          content: "CSCH",
        },
        A40: {
          content: "DATE",
        },
        A41: {
          content: "DATEVALUE",
        },
        A42: {
          content: "DAVERAGE",
        },
        A43: {
          content: "DAY",
        },
        A44: {
          content: "DAYS",
        },
        A45: {
          content: "DCOUNT",
        },
        A46: {
          content: "DCOUNTA",
        },
        A47: {
          content: "DECIMAL",
        },
        A48: {
          content: "DEGREES",
        },
        A49: {
          content: "DGET",
        },
        A50: {
          content: "DMAX",
        },
        A51: {
          content: "DMIN",
        },
        A52: {
          content: "DPRODUCT",
        },
        A53: {
          content: "DSTDEV",
        },
        A54: {
          content: "DSTDEVP",
        },
        A55: {
          content: "DSUM",
        },
        A56: {
          content: "DVAR",
        },
        A57: {
          content: "DVARP",
        },
        A58: {
          content: "EDATE",
        },
        A59: {
          content: "EOMONTH",
        },
        A60: {
          content: "EXACT",
        },
        A61: {
          content: "EXP",
        },
        A62: {
          content: "FIND",
        },
        A63: {
          content: "FLOOR",
        },
        A64: {
          content: "FLOOR.MATH",
        },
        A65: {
          content: "FLOOR.PRECISE",
        },
        A66: {
          content: "HLOOKUP",
        },
        A67: {
          content: "HOUR",
        },
        A68: {
          content: "IF",
        },
        A69: {
          content: "IFERROR",
        },
        A70: {
          content: "IFS",
        },
        A71: {
          content: "ISERROR",
        },
        A72: {
          content: "ISEVEN",
        },
        A73: {
          content: "ISLOGICAL",
        },
        A74: {
          content: "ISNONTEXT",
        },
        A75: {
          content: "ISNUMBER",
        },
        A76: {
          content: "ISO.CEILING",
        },
        A77: {
          content: "ISODD",
        },
        A78: {
          content: "ISOWEEKNUM",
        },
        A79: {
          content: "ISTEXT",
        },
        A80: {
          content: "LARGE",
        },
        A81: {
          content: "LEFT",
        },
        A82: {
          content: "LEN",
        },
        A83: {
          content: "LN",
        },
        A84: {
          content: "LOOKUP",
        },
        A85: {
          content: "LOWER",
        },
        A86: {
          content: "MATCH",
        },
        A87: {
          content: "MAX",
        },
        A88: {
          content: "MAXA",
        },
        A89: {
          content: "MAXIFS",
        },
        A90: {
          content: "MEDIAN",
        },
        A91: {
          content: "MIN",
        },
        A92: {
          content: "MINA",
        },
        A93: {
          content: "MINIFS",
        },
        A94: {
          content: "MINUTE",
        },
        A95: {
          content: "MOD",
        },
        A96: {
          content: "MONTH",
        },
        A97: {
          content: "NETWORKDAYS",
        },
        A98: {
          content: "NETWORKDAYS.INTL",
        },
        A99: {
          content: "NOT",
        },
        A100: {
          content: "NOW",
        },
        A101: {
          content: "ODD",
        },
        A102: {
          content: "OR",
        },
        A103: {
          content: "PERCENTILE",
        },
        A104: {
          content: "PERCENTILE.EXC",
        },
        A105: {
          content: "PERCENTILE.INC",
        },
        A106: {
          content: "PI",
        },
        A107: {
          content: "POWER",
        },
        A108: {
          content: "PRODUCT",
        },
        A109: {
          content: "QUARTILE",
        },
        A110: {
          content: "QUARTILE.EXC",
        },
        A111: {
          content: "QUARTILE.INC",
        },
        A112: {
          content: "RAND",
        },
        A113: {
          content: "RANDBETWEEN",
        },
        A114: {
          content: "REPLACE",
        },
        A115: {
          content: "RIGHT",
        },
        A116: {
          content: "ROUND",
        },
        A117: {
          content: "ROUNDDOWN",
        },
        A118: {
          content: "ROUNDUP",
        },
        A119: {
          content: "ROW",
        },
        A120: {
          content: "ROWS",
        },
        A121: {
          content: "SEARCH",
        },
        A122: {
          content: "SEC",
        },
        A123: {
          content: "SECH",
        },
        A124: {
          content: "SECOND",
        },
        A125: {
          content: "SIN",
        },
        A126: {
          content: "SINH",
        },
        A127: {
          content: "SMALL",
        },
        A128: {
          content: "SQRT",
        },
        A129: {
          content: "STDEV",
        },
        A130: {
          content: "STDEV.P",
        },
        A131: {
          content: "STDEV.S",
        },
        A132: {
          content: "STDEVA",
        },
        A133: {
          content: "STDEVP",
        },
        A134: {
          content: "STDEVPA",
        },
        A135: {
          content: "SUBSTITUTE",
        },
        A136: {
          content: "SUM",
        },
        A137: {
          content: "SUMIF",
        },
        A138: {
          content: "SUMIFS",
        },
        A139: {
          content: "TAN",
        },
        A140: {
          content: "TANH",
        },
        A141: {
          content: "TEXTJOIN",
        },
        A142: {
          content: "TIME",
        },
        A143: {
          content: "TIMEVALUE",
        },
        A144: {
          content: "TODAY",
        },
        A145: {
          content: "TRIM",
        },
        A146: {
          content: "TRUNC",
        },
        A147: {
          content: "UPPER",
        },
        A148: {
          content: "VAR",
        },
        A149: {
          content: "VAR.P",
        },
        A150: {
          content: "VAR.S",
        },
        A151: {
          content: "VARA",
        },
        A152: {
          content: "VARP",
        },
        A153: {
          content: "VARPA",
        },
        A154: {
          content: "VLOOKUP",
        },
        A155: {
          content: "WEEKDAY",
        },
        A156: {
          content: "WEEKNUM",
        },
        A157: {
          content: "WORKDAY",
        },
        A158: {
          content: "WORKDAY.INTL",
        },
        A159: {
          content: "XOR",
        },
        A160: {
          content: "YEAR",
        },
        A161: {
          content: "DELTA",
        },
        A162: {
          content: "NA",
        },
        A163: {
          content: "ISNA",
        },
        A164: {
          content: "ISERR",
        },
        A165: {
          content: "TEXT",
        },
        A166: {
          content: "ISBLANK",
        },
        A167: {
          content: "IFNA",
        },
        A168: {
          content: "CLEAN",
        },
        A169: {
          content: "PROPER",
        },
        A170: {
          content: "MID",
        },
        A171: {
          content: "XLOOKUP",
        },
        A172: {
          content: "ACCRINTM",
        },
        A173: {
          content: "AMORLINC",
        },
        A174: {
          content: "COUPDAYS",
        },
        A175: {
          content: "COUPDAYBS",
        },
        A176: {
          content: "COUPDAYSNC",
        },
        A177: {
          content: "COUPNCD",
        },
        A178: {
          content: "COUPNUM",
        },
        A179: {
          content: "COUPPCD",
        },
        A180: {
          content: "CUMIPMT",
        },
        A181: {
          content: "CUMPRINC",
        },
        A182: {
          content: "DB",
        },
        A183: {
          content: "DDB",
        },
        A184: {
          content: "DISC",
        },
        A185: {
          content: "DOLLARDE",
        },
        A186: {
          content: "DOLLARFR",
        },
        A187: {
          content: "DURATION",
        },
        A188: {
          content: "EFFECT",
        },
        A189: {
          content: "FV",
        },
        A190: {
          content: "FVSCHEDULE",
        },
        A191: {
          content: "INTRATE",
        },
        A192: {
          content: "IPMT",
        },
        A193: {
          content: "IRR",
        },
        A194: {
          content: "ISPMT",
        },
        A195: {
          content: "MDURATION",
        },
        A196: {
          content: "MIRR",
        },
        A197: {
          content: "NOMINAL",
        },
        A198: {
          content: "NPER",
        },
        A199: {
          content: "NPV",
        },
        A200: {
          content: "PDURATION",
        },
        A201: {
          content: "PMT",
        },
        A202: {
          content: "PPMT",
        },
        A203: {
          content: "PV",
        },
        A204: {
          content: "PRICE",
        },
        A205: {
          content: "PRICEDISC",
        },
        A206: {
          content: "PRICEMAT",
        },
        A207: {
          content: "RATE",
        },
        A208: {
          content: "RECEIVED",
        },
        A209: {
          content: "RRI",
        },
        A210: {
          content: "SLN",
        },
        A211: {
          content: "SYD",
        },
        A212: {
          content: "TBILLPRICE",
        },
        A213: {
          content: "TBILLEQ",
        },
        A214: {
          content: "TBILLYIELD",
        },
        A215: {
          content: "VDB",
        },
        A216: {
          content: "XIRR",
        },
        A217: {
          content: "XNPV",
        },
        A218: {
          content: "YIELD",
        },
        A219: {
          content: "YIELDDISC",
        },
        A220: {
          content: "YIELDMAT",
        },
        A221: {
          content: "DAYS360",
        },
        A222: {
          content: "DATEDIF",
        },
        A223: {
          content: "ADDRESS",
        },
        B1: {
          content: "evaluation",
        },
        B2: {
          content: "=ABS(-5.5)",
        },
        B3: {
          content: "=ACOS(1)",
        },
        B4: {
          content: "=ROUND(ACOSH(2),5)",
        },
        B5: {
          content: "=ROUND(ACOT(1),5)",
        },
        B6: {
          content: "=ROUND(ACOTH(2),5)",
        },
        B7: {
          content: "=AND(TRUE,TRUE)",
        },
        B8: {
          content: "=ROUND(ASIN(0.5),5)",
        },
        B9: {
          content: "=ROUND(ASINH(2), 5)",
        },
        B10: {
          content: "=ROUND(ATAN(1),5)",
        },
        B11: {
          content: "=ROUND(ATAN2(-1,0),5)",
        },
        B12: {
          content: "=ROUND(ATANH(0.7),5)",
        },
        B13: {
          content: "=ROUND(AVEDEV(~0),5)",
          formulaTokens: ["I2:I9"],
        },
        B14: {
          content: "=ROUND(AVERAGE(~0),5)",
          formulaTokens: ["H2:H9"],
        },
        B15: {
          content: "=AVERAGEA(~0)",
          formulaTokens: ["G2:H9"],
        },
        B16: {
          content: '=ROUND(AVERAGEIF(~0,">150000" ),5)',
          formulaTokens: ["J2:J9"],
        },
        B17: {
          content: '=ROUND(AVERAGEIFS(~0,~1,">=30",~2, "<10"),5)',
          formulaTokens: ["I2:I9", "H2:H9", "K2:K9"],
        },
        B18: {
          content: "=CEILING(20.4,1)",
        },
        B19: {
          content: "=CEILING.MATH(-5.5,1,0)",
        },
        B20: {
          content: "=CEILING.PRECISE(230, 100)",
        },
        B21: {
          content: "=CHAR(74)",
        },
        B22: {
          content: "=COLUMN(~0)",
          formulaTokens: ["C4"],
        },
        B23: {
          content: "=COLUMNS(~0)",
          formulaTokens: ["A5:D12"],
        },
        B24: {
          content: "=CONCAT(1,23)",
        },
        B25: {
          content: '=CONCATENATE("BUT, ", "MICHEL")',
        },
        B26: {
          content: "=ROUND(COS(PI()/3),2)",
        },
        B27: {
          content: "=ROUND(COSH(2),5)",
        },
        B28: {
          content: "=ROUND(COT(PI()/6),5)",
        },
        B29: {
          content: "=ROUND(COTH(.5),5)",
        },
        B30: {
          content: '=COUNT(1,"a","5", "03/14/2021")',
        },
        B31: {
          content: '=COUNTA(1,"a","5", "03/14/2021")',
        },
        B32: {
          content: "=COUNTBLANK(~0)",
          formulaTokens: ["F1:G1"],
        },
        B33: {
          content: '=COUNTIF(~0,">30")',
          formulaTokens: ["H2:H9"],
        },
        B34: {
          content: '=COUNTIFS(~0, ">25",~1,"<4")',
          formulaTokens: ["H2:H9", "K2:K9"],
        },
        B35: {
          content: "=ROUND(COVAR(~0,~1),5)",
          formulaTokens: ["H2:H9", "K2:K9"],
        },
        B36: {
          content: "=ROUND(COVARIANCE.P(~0,~1),5)",
          formulaTokens: ["K2:K9", "H2:H9"],
        },
        B37: {
          content: "=ROUND(COVARIANCE.P(~0,~1),5)",
          formulaTokens: ["I2:I9", "J2:J9"],
        },
        B38: {
          content: "=ROUND(CSC(PI()/4),5)",
        },
        B39: {
          content: "=ROUND(CSCH(pi()/3),5)",
        },
        B40: {
          content: "=DATE(2020,5,25)",
        },
        B41: {
          content: '=DATEVALUE("1969/08/15")',
        },
        B42: {
          content: '=ROUND(DAVERAGE(~0,"Tot. Score",~1),5)',
          formulaTokens: ["G1:K9", "J12:J13"],
        },
        B43: {
          content: '=DAY("2020/03/17")',
        },
        B44: {
          content: '=DAYS("2022/03/17", "2021/03/17")',
        },
        B45: {
          content: '=DCOUNT(~0,"Name",~1)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B46: {
          content: '=DCOUNTA(~0,"Name",~1)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B47: {
          content: "=DECIMAL(20,16)",
        },
        B48: {
          content: "=DEGREES(pi()/4)",
        },
        B49: {
          content: '=DGET(~0, "Hours Played",~1)',
          formulaTokens: ["G1:K9", "G12:G13"],
        },
        B50: {
          content: '=DMAX(~0,"Tot. Score", ~1)',
          formulaTokens: ["G1:K9", "I12:I13"],
        },
        B51: {
          content: '=DMIN(~0,"Tot. Score", ~1)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B52: {
          content: '=DPRODUCT(~0, "Age",~1)',
          formulaTokens: ["G1:K9", "K12:K13"],
        },
        B53: {
          content: '=ROUND(DSTDEV(~0, "Age",~1), 5)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B54: {
          content: '=ROUND(DSTDEVP(~0, "Age",~1), 5)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B55: {
          content: '=DSUM(~0,"Age",~1)',
          formulaTokens: ["G1:K9", "I12:I13"],
        },
        B56: {
          content: '=ROUND(DVAR(~0, "Hours Played",~1),5)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B57: {
          content: '=ROUND(DVARP(~0, "Hours Played",~1),5)',
          formulaTokens: ["G1:K9", "H12:H13"],
        },
        B58: {
          content: '=EDATE("7/22/1969", -2)',
        },
        B59: {
          content: '=EOMONTH("7/21/2020", 1)',
        },
        B60: {
          content: '=EXACT("AbsSdf%", "AbsSdf%")',
        },
        B61: {
          content: "=ROUND(EXP(4),5)",
        },
        B62: {
          content: '=FIND("A", "qbdahbaazo A")',
        },
        B63: {
          content: "=FLOOR(5.5, 2)",
        },
        B64: {
          content: "=FLOOR.MATH(-5.55,2, 1)",
        },
        B65: {
          content: "=FLOOR.PRECISE(199,100)",
        },
        B66: {
          content: '=HLOOKUP("Tot. Score",~0, 4,FALSE)',
          formulaTokens: ["H1:K9"],
        },
        B67: {
          content: '=HOUR("2:14:56 AM")',
        },
        B68: {
          content: '=IF(TRUE,"TABOURET","JAMBON")',
        },
        B69: {
          content: '=IFERROR(0/0, "no diving by zero.")',
        },
        B70: {
          content: '=IFS(~0>~1,"first player is older",~2>~3, "second player is older")',
          formulaTokens: ["$H2", "$H3", "$H3", "$H2"],
        },
        B71: {
          content: "=ISERROR(0/0)",
        },
        B72: {
          content: "=ISEVEN(3)",
        },
        B73: {
          content: '=ISLOGICAL("TRUE")',
        },
        B74: {
          content: "=ISNONTEXT(TRUE)",
        },
        B75: {
          content: "=ISNUMBER(1231.5)",
        },
        B76: {
          content: "=ISO.CEILING(-7.89)",
        },
        B77: {
          content: "=ISODD(4)",
        },
        B78: {
          content: '=ISOWEEKNUM("1/3/2016")',
        },
        B79: {
          content: '=ISTEXT("123")',
        },
        B80: {
          content: "=LARGE(~0,3)",
          formulaTokens: ["H2:H9"],
        },
        B81: {
          content: '=LEFT("Mich",4)',
        },
        B82: {
          content: '=LEN("anticonstitutionnellement")',
        },
        B83: {
          content: "=ROUND(LN(2),5)",
        },
        B84: {
          content: "=LOOKUP(23000,~0,~1)",
          formulaTokens: ["H3:J3", "H5:J5"],
        },
        B85: {
          content: '=LOWER("オAドB")',
        },
        B86: {
          content: "=MATCH(42,~0,0)",
          formulaTokens: ["H2:H9"],
        },
        B87: {
          content: "=MAX(~0)",
          formulaTokens: ["N1:N8"],
        },
        B88: {
          content: "=MAXA(~0)",
          formulaTokens: ["N1:N8"],
        },
        B89: {
          content: '=MAXIFS(~0,~1, "<20",~2, "<>4")',
          formulaTokens: ["H2:H9", "K2:K9", "K2:K9"],
        },
        B90: {
          content: "=MEDIAN(-1, 6, 7, 234, 163845)",
        },
        B91: {
          content: "=MIN(~0)",
          formulaTokens: ["N1:N8"],
        },
        B92: {
          content: "=MINA(~0)",
          formulaTokens: ["N1:N8"],
        },
        B93: {
          content: '=MINIFS(~0,~1, ">20")',
          formulaTokens: ["J2:J9", "H2:H9"],
        },
        B94: {
          content: "=MINUTE(0.126)",
        },
        B95: {
          content: "=MOD(42,12)",
        },
        B96: {
          content: '=MONTH("5/2/1954")',
        },
        B97: {
          content: '=NETWORKDAYS("1/1/2013", "2/1/2013")',
        },
        B98: {
          content: '=NETWORKDAYS.INTL("1/1/2013", "2/1/2013", "0000111")',
        },
        B99: {
          content: "=NOT(FALSE)",
        },
        B100: {
          content: "=NOW()",
        },
        B101: {
          content: "=ODD(4)",
        },
        B102: {
          content: '=OR("true", FALSE)',
        },
        B103: {
          content: "=PERCENTILE(~0,1)",
          formulaTokens: ["N1:N5"],
        },
        B104: {
          content: "=PERCENTILE.EXC(~0,0.5)",
          formulaTokens: ["N1:N5"],
        },
        B105: {
          content: "=PERCENTILE.INC(~0,0)",
          formulaTokens: ["N1:N5"],
        },
        B106: {
          content: "=ROUND(PI(), 5)",
        },
        B107: {
          content: "=POWER(42,2)",
        },
        B108: {
          content: "=PRODUCT(1,2,3)",
        },
        B109: {
          content: "=QUARTILE(~0, 0)",
          formulaTokens: ["N1:N5"],
        },
        B110: {
          content: "=ROUND(QUARTILE.EXC(~0, 1),5)",
          formulaTokens: ["N1:N5"],
        },
        B111: {
          content: "=QUARTILE.INC(~0 ,4)",
          formulaTokens: ["N1:N5"],
        },
        B112: {
          content: "=RAND()",
        },
        B113: {
          content: "=RANDBETWEEN(1.1,2)",
        },
        B114: {
          content: '=REPLACE("ABZ", 2, 1, "Y")',
        },
        B115: {
          content: '=RIGHT("kikou", 2)',
        },
        B116: {
          content: "=ROUND(49.9)",
        },
        B117: {
          content: "=ROUNDDOWN(42, -1)",
        },
        B118: {
          content: "=ROUNDUP(-1.6,0)",
        },
        B119: {
          content: "=ROW(~0)",
          formulaTokens: ["A234"],
        },
        B120: {
          content: "=ROWS(~0)",
          formulaTokens: ["B3:C40"],
        },
        B121: {
          content: '=SEARCH("C", "ABCD")',
        },
        B122: {
          content: "=ROUND(SEC(PI()/3),5)",
        },
        B123: {
          content: "=ROUND(SECH(1), 5)",
        },
        B124: {
          content: '=SECOND("0:21:42")',
        },
        B125: {
          content: "=ROUND(SIN(PI()/6),5)",
        },
        B126: {
          content: "=ROUND(SINH(1),5)",
        },
        B127: {
          content: "=SMALL(~0, 3)",
          formulaTokens: ["H2:H9"],
        },
        B128: {
          content: "=SQRT(4)",
        },
        B129: {
          content: "=STDEV(-2,0,2)",
        },
        B130: {
          content: "=STDEV.P(2,4)",
        },
        B131: {
          content: "=STDEV.S(2,4,6)",
        },
        B132: {
          content: "=STDEVA(TRUE, 3,5)",
        },
        B133: {
          content: "=ROUND(STDEVP(2,5,8),2)",
        },
        B134: {
          content: "=ROUND(STDEVPA(TRUE, 4,7),2)",
        },
        B135: {
          content: '=SUBSTITUTE("SAP is best", "SAP", "Odoo")',
        },
        B136: {
          content: "=SUM(1,2,3,4,5)",
        },
        B137: {
          content: '=SUMIF(~0, "<100")',
          formulaTokens: ["K2:K9"],
        },
        B138: {
          content: '=SUMIFS(~0,~1, "<100")',
          formulaTokens: ["H2:H9", "K2:K9"],
        },
        B139: {
          content: "=ROUND(TAN(PI()/4),5)",
        },
        B140: {
          content: "=ROUND(TANH(1),5)",
        },
        B141: {
          content: '=TEXTJOIN("-",TRUE,"","1","A","%")',
        },
        B142: {
          content: "=TIME(9,11,31)",
        },
        B143: {
          content: '=TIMEVALUE("1899 10 08 18:00")',
        },
        B144: {
          content: "=TODAY()",
        },
        B145: {
          content: '=TRIM(" Jean Ticonstitutionnalise ")',
        },
        B146: {
          content: "=TRUNC(42.42, 1)",
        },
        B147: {
          content: '=UPPER("grrrr !")',
        },
        B148: {
          content: "=ROUND(VAR(~0),5)",
          formulaTokens: ["K1:K5"],
        },
        B149: {
          content: "=ROUND(VAR.P(~0),5)",
          formulaTokens: ["K1:K5"],
        },
        B150: {
          content: "=VAR.S(2,5,8)",
        },
        B151: {
          content: "=ROUND(VARA(~0),5)",
          formulaTokens: ["K1:K5"],
        },
        B152: {
          content: "=ROUND(VARP(~0),5)",
          formulaTokens: ["K1:K5"],
        },
        B153: {
          content: "=ROUND(VARPA(~0),5)",
          formulaTokens: ["K1:K5"],
        },
        B154: {
          content: '=VLOOKUP("NotACheater",~0, 3, FALSE)',
          formulaTokens: ["G1:K9"],
        },
        B155: {
          content: '=WEEKDAY("6/12/2021")',
        },
        B156: {
          content: '=WEEKNUM("6/29/2021")',
        },
        B157: {
          content: '=WORKDAY("3/15/2021", 6)',
        },
        B158: {
          content: '=WORKDAY.INTL("3/15/2021", 6, "0111111")',
        },
        B159: {
          content: "=XOR(false, true, false, false)",
        },
        B160: {
          content: '=YEAR("3/12/2012")',
        },
        B161: {
          content: "=DELTA(1,1)",
        },
        B162: {
          content: "=NA()",
        },
        B163: {
          content: "=ISNA(NA())",
        },
        B164: {
          content: "=ISERR(NA())",
        },
        B165: {
          content: '=TEXT(5, "#,##0.00")',
        },
        B166: {
          content: "=ISBLANK(~0)",
          formulaTokens: ["E166"],
        },
        B167: {
          content: '=IFNA(NA(), "hello")',
        },
        B168: {
          content: '=CLEAN("a"&CHAR(10))',
        },
        B169: {
          content: '=PROPER("this is a sentence")',
        },
        B170: {
          content: '=MID("Odoo", 2, 5)',
        },
        B171: {
          content: '=XLOOKUP("robot4", ~0, ~1)',
          formulaTokens: ["G2:G9", "H2:H9"],
        },
        B172: {
          content: '=ACCRINTM("01/01/2020", "01/01/2021", 0.1, 100, 0)',
        },
        B173: {
          content: '=AMORLINC(50, "01/01/2021", "06/01/2021", 5, 1, 0.1)',
        },
        B174: {
          content: '=COUPDAYS("01/01/2021", "01/01/2022", 1, 0)',
        },
        B175: {
          content: '=COUPDAYBS("01/01/2021", "01/01/2022", 1, 0)',
        },
        B176: {
          content: '=COUPDAYSNC("01/01/2021", "01/01/2022", 1, 0)',
        },
        B177: {
          content: '=COUPNCD("01/01/2021", "01/01/2022", 1, 0)',
        },
        B178: {
          content: '=COUPNUM("01/01/2021", "01/01/2022", 1, 0)',
        },
        B179: {
          content: '=COUPPCD("01/01/2021", "01/01/2022", 1, 0)',
        },
        B180: {
          content: "=CUMIPMT(0.1, 12, 100, 1, 1, 1)",
        },
        B181: {
          content: "=CUMPRINC(0.1, 12, 100, 1, 1, 1)",
        },
        B182: {
          content: "=DB(50, 5, 12, 1, 1)",
        },
        B183: {
          content: "=DDB(50, 5, 12, 1, 2)",
        },
        B184: {
          content: '=DISC("01/01/2021", "01/01/2022", 50, 100, 0)',
        },
        B185: {
          content: "=DOLLARDE(10.25, 8)",
        },
        B186: {
          content: "=DOLLARFR(10.12, 8)",
        },
        B187: {
          content: '=DURATION("01/01/2021", "01/01/2022", 0.1, 50, 1, 0)',
        },
        B188: {
          content: "=EFFECT(0.1, 12)",
        },
        B189: {
          content: "=FV(0.1, 12, -10, 100, 1)",
        },
        B190: {
          content: "=FVSCHEDULE(100, ~0)",
          formulaTokens: ["I25:I27"],
        },
        B191: {
          content: '=INTRATE("01/01/2021", "01/01/2022", 100, 100, 0)',
        },
        B192: {
          content: "=IPMT(0.1, 1, 12, 100, 5, 1)",
        },
        B193: {
          content: "=IRR(~0, 0.1)",
          formulaTokens: ["H25:H27"],
        },
        B194: {
          content: "=ISPMT(0.1, 1, 12, 100)",
        },
        B195: {
          content: '=MDURATION("01/01/2021", "01/01/2022", 0.1, 50, 1, 0)',
        },
        B196: {
          content: "=MIRR(~0, 0.12, 0.1)",
          formulaTokens: ["H25:H27"],
        },
        B197: {
          content: "=NOMINAL(0.12, 12)",
        },
        B198: {
          content: "=NPER(0.1, -10, 100, 5, 1)",
        },
        B199: {
          content: "=NPV(0.1, 50, 60)",
        },
        B200: {
          content: "=PDURATION(0.1, 100, 5)",
        },
        B201: {
          content: "=PMT(0.1, 12, 100, 5, 1)",
        },
        B202: {
          content: "=PPMT(0.1, 1, 12, 100, 5, 1)",
        },
        B203: {
          content: "=PV(0.1, 12, -10, 5, 1)",
        },
        B204: {
          content: '=PRICE("01/01/2021", "01/01/2022", 0.1, 50, 100, 1, 0)',
        },
        B205: {
          content: '=PRICEDISC("01/01/2021", "01/01/2022", 0.1, 100, 0)',
        },
        B206: {
          content: '=PRICEMAT("01/01/2021", "01/01/2022", "01/01/2020", 0.1, 50, 0)',
        },
        B207: {
          content: "=RATE(12, -10, 100, 5, 1, 0.1)",
        },
        B208: {
          content: '=RECEIVED("01/01/2021", "01/01/2022", 100, 0.1, 0)',
        },
        B209: {
          content: "=RRI(12, 100, 5)",
        },
        B210: {
          content: "=SLN(50, 5, 12)",
        },
        B211: {
          content: "=SYD(50, 5, 12, 1)",
        },
        B212: {
          content: '=TBILLPRICE("01/01/2021", "01/01/2022", 0.1)',
        },
        B213: {
          content: '=TBILLEQ("01/01/2021", "01/01/2022", 0.1)',
        },
        B214: {
          content: '=TBILLYIELD("01/01/2021", "01/01/2022", 50)',
        },
        B215: {
          content: "=VDB(50, 5, 12, 1, 2, 2, 0)",
        },
        B216: {
          content: "=XIRR(~0, ~1, 0.1)",
          formulaTokens: ["H25:H27", "J25:J27"],
        },
        B217: {
          content: "=XNPV(0.1, ~0, ~1)",
          formulaTokens: ["H25:H27", "J25:J27"],
        },
        B218: {
          content: '=YIELD("01/01/2021", "01/01/2022", 0.1, 50, 100, 1, 0)',
        },
        B219: {
          content: '=YIELDDISC("01/01/2021", "01/01/2022", 50, 100, 0)',
        },
        B220: {
          content: '=YIELDMAT("01/01/2021", "01/01/2022", "01/01/2020", 0.1, 50, 0)',
        },
        B221: {
          content: '=DAYS360("01/01/2020", "12/31/2020")',
        },
        B222: {
          content: '=DATEDIF("2001/09/15", "2003/06/10", "MD")',
        },
        B223: {
          content: '=ADDRESS(27, 53, 1, TRUE, "sheet!")',
        },
        C1: {
          content: "expected value",
        },
        C2: {
          content: "5.5",
        },
        C3: {
          content: "0",
        },
        C4: {
          content: "1.31696",
        },
        C5: {
          content: "0.7854",
        },
        C6: {
          content: "0.54931",
        },
        C7: {
          content: "true",
        },
        C8: {
          content: "0.5236",
        },
        C9: {
          content: "1.44364",
        },
        C10: {
          content: "0.7854",
        },
        C11: {
          content: "3.14159",
        },
        C12: {
          content: "0.8673",
        },
        C13: {
          content: "2959.1625",
        },
        C14: {
          content: "26.25",
        },
        C15: {
          content: "13.125",
        },
        C16: {
          content: "222797",
        },
        C17: {
          content: "8376.65",
        },
        C18: {
          content: "21",
        },
        C19: {
          content: "-5",
        },
        C20: {
          content: "300",
        },
        C21: {
          content: "J",
        },
        C22: {
          content: "3",
        },
        C23: {
          content: "4",
        },
        C24: {
          content: '="123"',
        },
        C25: {
          content: "BUT, MICHEL",
        },
        C26: {
          content: "0.5",
        },
        C27: {
          content: "3.7622",
        },
        C28: {
          content: "=ROUND(SQRT(3),5)",
        },
        C29: {
          content: "2.16395",
        },
        C30: {
          content: "2",
        },
        C31: {
          content: "4",
        },
        C32: {
          content: "1",
        },
        C33: {
          content: "2",
        },
        C34: {
          content: "3",
        },
        C35: {
          content: "-2119.25",
        },
        C36: {
          content: "-2119.25",
        },
        C37: {
          content: "237217364.71641",
        },
        C38: {
          content: "=ROUND(SQRT(2),5)",
        },
        C39: {
          content: "0.80041",
        },
        C40: {
          format: 3,
          content: "43976",
        },
        C41: {
          content: "25430",
        },
        C42: {
          content: "151434.625",
        },
        C43: {
          content: "17",
        },
        C44: {
          content: "365",
        },
        C45: {
          content: "0",
        },
        C46: {
          content: "3",
        },
        C47: {
          content: "32",
        },
        C48: {
          content: "45",
        },
        C49: {
          content: "252.4",
        },
        C50: {
          content: "=~0",
          formulaTokens: ["J7"],
        },
        C51: {
          content: "=~0",
          formulaTokens: ["J9"],
        },
        C52: {
          content: "333",
        },
        C53: {
          content: "6.02771",
        },
        C54: {
          content: "4.92161",
        },
        C55: {
          content: "101",
        },
        C56: {
          content: "17560207.92333",
        },
        C57: {
          content: "11706805.28222",
        },
        C58: {
          content: "25345",
        },
        C59: {
          content: "44074",
        },
        C60: {
          content: "true",
        },
        C61: {
          content: "54.59815",
        },
        C62: {
          content: "12",
        },
        C63: {
          content: "4",
        },
        C64: {
          content: "-4",
        },
        C65: {
          content: "100",
        },
        C66: {
          content: "110120.5",
        },
        C67: {
          content: "2",
        },
        C68: {
          content: "TABOURET",
        },
        C69: {
          content: "no diving by zero.",
        },
        C70: {
          content: "first player is older",
        },
        C71: {
          content: "true",
        },
        C72: {
          content: "false",
        },
        C73: {
          content: "false",
        },
        C74: {
          content: "true",
        },
        C75: {
          content: "true",
        },
        C76: {
          content: "-7",
        },
        C77: {
          content: "false",
        },
        C78: {
          content: "53",
        },
        C79: {
          content: "true",
        },
        C80: {
          content: "30",
        },
        C81: {
          content: "Mich",
        },
        C82: {
          content: "25",
        },
        C83: {
          content: "0.69315",
        },
        C84: {
          content: "50024",
        },
        C85: {
          content: "オaドb",
        },
        C86: {
          content: "4",
        },
        C87: {
          content: "0.6",
        },
        C88: {
          content: "1",
        },
        C89: {
          content: "30",
        },
        C90: {
          content: "7",
        },
        C91: {
          content: "0.1",
        },
        C92: {
          content: "0",
        },
        C93: {
          content: "5000",
        },
        C94: {
          content: "1",
        },
        C95: {
          content: "6",
        },
        C96: {
          content: "5",
        },
        C97: {
          content: "24",
        },
        C98: {
          content: "19",
        },
        C99: {
          content: "true",
        },
        C101: {
          content: "5",
        },
        C102: {
          content: "true",
        },
        C103: {
          content: "0.6",
        },
        C104: {
          content: "0.4",
        },
        C105: {
          content: "0.1",
        },
        C106: {
          content: "3.14159",
        },
        C107: {
          content: "1764",
        },
        C108: {
          content: "6",
        },
        C109: {
          content: "0.1",
        },
        C110: {
          content: "0.15",
        },
        C111: {
          content: "0.6",
        },
        C113: {
          content: "2",
        },
        C114: {
          content: "AYZ",
        },
        C115: {
          content: "ou",
        },
        C116: {
          content: "50",
        },
        C117: {
          content: "40",
        },
        C118: {
          content: "-2",
        },
        C119: {
          content: "234",
        },
        C120: {
          content: "38",
        },
        C121: {
          content: "3",
        },
        C122: {
          content: "2",
        },
        C123: {
          content: "0.64805",
        },
        C124: {
          content: "42",
        },
        C125: {
          content: "0.5",
        },
        C126: {
          content: "1.1752",
        },
        C127: {
          content: "26",
        },
        C128: {
          content: "2",
        },
        C129: {
          content: "2",
        },
        C130: {
          content: "1",
        },
        C131: {
          content: "2",
        },
        C132: {
          content: "2",
        },
        C133: {
          content: "2.45",
        },
        C134: {
          content: "2.45",
        },
        C135: {
          content: "Odoo is best",
        },
        C136: {
          content: "15",
        },
        C137: {
          content: "52",
        },
        C138: {
          content: "201",
        },
        C139: {
          content: "1",
        },
        C140: {
          content: "0.76159",
        },
        C141: {
          content: "1-A-%",
        },
        C142: {
          format: 4,
          content: "0.3829976851851852",
        },
        C143: {
          content: "0.75",
        },
        C145: {
          content: "Jean Ticonstitutionnalise",
        },
        C146: {
          content: "42.4",
        },
        C147: {
          content: "GRRRR !",
        },
        C148: {
          content: "2.91667",
        },
        C149: {
          content: "2.1875",
        },
        C150: {
          content: "9",
        },
        C151: {
          content: "6.7",
        },
        C152: {
          content: "2.1875",
        },
        C153: {
          content: "5.36",
        },
        C154: {
          content: "=252.4",
        },
        C155: {
          content: "7",
        },
        C156: {
          content: "27",
        },
        C157: {
          content: "44278",
        },
        C158: {
          content: "44312",
        },
        C159: {
          content: "true",
        },
        C160: {
          content: "2012",
        },
        C161: {
          content: "1",
        },
        C162: {
          content: "#N/A",
        },
        C163: {
          content: "true",
        },
        C164: {
          content: "false",
        },
        C165: {
          content: '="5.00"',
        },
        C166: {
          content: "=TRUE",
        },
        C167: {
          content: '="hello"',
        },
        C168: {
          content: '="a"',
        },
        C169: {
          content: '="This Is A Sentence"',
        },
        C170: {
          content: '="doo"',
        },
        C171: {
          content: "=42",
        },
        C172: {
          content: "10",
        },
        C173: {
          content: "5",
        },
        C174: {
          content: "360",
        },
        C175: {
          content: "0",
        },
        C176: {
          content: "360",
        },
        C177: {
          content: "44562",
        },
        C178: {
          content: "1",
        },
        C179: {
          content: "44197",
        },
        C180: {
          content: "0",
        },
        C181: {
          content: "-13.34211955",
        },
        C182: {
          content: "0.729166667",
        },
        C183: {
          content: "8.333333333",
        },
        C184: {
          content: "0.5",
        },
        C185: {
          content: "10.3125",
        },
        C186: {
          content: "10.096",
        },
        C187: {
          content: "1",
        },
        C188: {
          content: "0.104713067",
        },
        C189: {
          content: "-78.61571623",
        },
        C190: {
          content: "158.125",
        },
        C191: {
          content: "0",
        },
        C192: {
          content: "0",
        },
        C193: {
          content: "0.421954446",
        },
        C194: {
          content: "-9.166666667",
        },
        C195: {
          content: "0.019607843",
        },
        C196: {
          content: "-0.060608807",
        },
        C197: {
          content: "0.113865515",
        },
        C198: {
          content: "25.62524843",
        },
        C199: {
          content: "95.04132231",
        },
        C200: {
          content: "-31.43139883",
        },
        C201: {
          content: "-13.55468008",
        },
        C202: {
          content: "-13.55468008",
        },
        C203: {
          content: "73.35745596",
        },
        C204: {
          content: "2.156862745",
        },
        C205: {
          content: "90",
        },
        C206: {
          content: "-7.647058824",
        },
        C207: {
          content: "0.027937424",
        },
        C208: {
          content: "111.1111111",
        },
        C209: {
          content: "-0.220922192",
        },
        C210: {
          content: "3.75",
        },
        C211: {
          content: "6.923076923",
        },
        C212: {
          content: "89.86111111",
        },
        C213: {
          content: "0.109813678",
        },
        C214: {
          content: "0.98630137",
        },
        C215: {
          content: "6.944444444",
        },
        C216: {
          content: "0.420899528",
        },
        C217: {
          content: "-404.5918575",
        },
        C218: {
          content: "1.2",
        },
        C219: {
          content: "1",
        },
        C220: {
          content: "1",
        },
        C221: {
          content: "360",
        },
        C222: {
          content: "26",
        },
        C223: {
          content: "'sheet!'!$BA$27",
        },
        D1: {
          content: "is it compatible ?",
        },
        D2: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B2", "C2"],
        },
        D3: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B3", "C3"],
        },
        D4: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B4", "C4"],
        },
        D5: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B5", "C5"],
        },
        D6: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B6", "C6"],
        },
        D7: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B7", "C7"],
        },
        D8: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B8", "C8"],
        },
        D9: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B9", "C9"],
        },
        D10: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B10", "C10"],
        },
        D11: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B11", "C11"],
        },
        D12: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B12", "C12"],
        },
        D13: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B13", "C13"],
        },
        D14: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B14", "C14"],
        },
        D15: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B15", "C15"],
        },
        D16: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B16", "C16"],
        },
        D17: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B17", "C17"],
        },
        D18: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B18", "C18"],
        },
        D19: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B19", "C19"],
        },
        D20: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B20", "C20"],
        },
        D21: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B21", "C21"],
        },
        D22: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B22", "C22"],
        },
        D23: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B23", "C23"],
        },
        D24: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B24", "C24"],
        },
        D25: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B25", "C25"],
        },
        D26: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B26", "C26"],
        },
        D27: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B27", "C27"],
        },
        D28: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B28", "C28"],
        },
        D29: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B29", "C29"],
        },
        D30: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B30", "C30"],
        },
        D31: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B31", "C31"],
        },
        D32: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B32", "C32"],
        },
        D33: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B33", "C33"],
        },
        D34: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B34", "C34"],
        },
        D35: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B35", "C35"],
        },
        D36: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B36", "C36"],
        },
        D37: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B37", "C37"],
        },
        D38: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B38", "C38"],
        },
        D39: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B39", "C39"],
        },
        D40: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B40", "C40"],
        },
        D41: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B41", "C41"],
        },
        D42: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B42", "C42"],
        },
        D43: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B43", "C43"],
        },
        D44: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B44", "C44"],
        },
        D45: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B45", "C45"],
        },
        D46: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B46", "C46"],
        },
        D47: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B47", "C47"],
        },
        D48: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B48", "C48"],
        },
        D49: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B49", "C49"],
        },
        D50: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B50", "C50"],
        },
        D51: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B51", "C51"],
        },
        D52: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B52", "C52"],
        },
        D53: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B53", "C53"],
        },
        D54: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B54", "C54"],
        },
        D55: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B55", "C55"],
        },
        D56: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B56", "C56"],
        },
        D57: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B57", "C57"],
        },
        D58: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B58", "C58"],
        },
        D59: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B59", "C59"],
        },
        D60: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B60", "C60"],
        },
        D61: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B61", "C61"],
        },
        D62: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B62", "C62"],
        },
        D63: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B63", "C63"],
        },
        D64: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B64", "C64"],
        },
        D65: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B65", "C65"],
        },
        D66: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B66", "C66"],
        },
        D67: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B67", "C67"],
        },
        D68: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B68", "C68"],
        },
        D69: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B69", "C69"],
        },
        D70: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B70", "C70"],
        },
        D71: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B71", "C71"],
        },
        D72: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B72", "C72"],
        },
        D73: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B73", "C73"],
        },
        D74: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B74", "C74"],
        },
        D75: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B75", "C75"],
        },
        D76: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B76", "C76"],
        },
        D77: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B77", "C77"],
        },
        D78: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B78", "C78"],
        },
        D79: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B79", "C79"],
        },
        D80: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B80", "C80"],
        },
        D81: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B81", "C81"],
        },
        D82: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B82", "C82"],
        },
        D83: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B83", "C83"],
        },
        D84: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B84", "C84"],
        },
        D85: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B85", "C85"],
        },
        D86: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B86", "C86"],
        },
        D87: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B87", "C87"],
        },
        D88: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B88", "C88"],
        },
        D89: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B89", "C89"],
        },
        D90: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B90", "C90"],
        },
        D91: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B91", "C91"],
        },
        D92: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B92", "C92"],
        },
        D93: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B93", "C93"],
        },
        D94: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B94", "C94"],
        },
        D95: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B95", "C95"],
        },
        D96: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B96", "C96"],
        },
        D97: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B97", "C97"],
        },
        D98: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B98", "C98"],
        },
        D99: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B99", "C99"],
        },
        D100: {
          content: "=IF(ISNUMBER(~0),1, 0)",
          formulaTokens: ["B100"],
        },
        D101: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B101", "C101"],
        },
        D102: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B102", "C102"],
        },
        D103: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B103", "C103"],
        },
        D104: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B104", "C104"],
        },
        D105: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B105", "C105"],
        },
        D106: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B106", "C106"],
        },
        D107: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B107", "C107"],
        },
        D108: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B108", "C108"],
        },
        D109: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B109", "C109"],
        },
        D110: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B110", "C110"],
        },
        D111: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B111", "C111"],
        },
        D112: {
          content: "=IF(AND(~0>=0,~1<1 ),1, 0)",
          formulaTokens: ["B112", "B112"],
        },
        D113: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B113", "C113"],
        },
        D114: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B114", "C114"],
        },
        D115: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B115", "C115"],
        },
        D116: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B116", "C116"],
        },
        D117: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B117", "C117"],
        },
        D118: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B118", "C118"],
        },
        D119: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B119", "C119"],
        },
        D120: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B120", "C120"],
        },
        D121: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B121", "C121"],
        },
        D122: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B122", "C122"],
        },
        D123: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B123", "C123"],
        },
        D124: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B124", "C124"],
        },
        D125: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B125", "C125"],
        },
        D126: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B126", "C126"],
        },
        D127: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B127", "C127"],
        },
        D128: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B128", "C128"],
        },
        D129: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B129", "C129"],
        },
        D130: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B130", "C130"],
        },
        D131: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B131", "C131"],
        },
        D132: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B132", "C132"],
        },
        D133: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B133", "C133"],
        },
        D134: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B134", "C134"],
        },
        D135: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B135", "C135"],
        },
        D136: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B136", "C136"],
        },
        D137: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B137", "C137"],
        },
        D138: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B138", "C138"],
        },
        D139: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B139", "C139"],
        },
        D140: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B140", "C140"],
        },
        D141: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B141", "C141"],
        },
        D142: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B142", "C142"],
        },
        D143: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B143", "C143"],
        },
        D144: {
          content: "=IF(ISNUMBER(~0),1, 0)",
          formulaTokens: ["B144"],
        },
        D145: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B145", "C145"],
        },
        D146: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B146", "C146"],
        },
        D147: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B147", "C147"],
        },
        D148: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B148", "C148"],
        },
        D149: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B149", "C149"],
        },
        D150: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B150", "C150"],
        },
        D151: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B151", "C151"],
        },
        D152: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B152", "C152"],
        },
        D153: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B153", "C153"],
        },
        D154: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B154", "C154"],
        },
        D155: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B155", "C155"],
        },
        D156: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B156", "C156"],
        },
        D157: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B157", "C157"],
        },
        D158: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B158", "C158"],
        },
        D159: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B159", "C159"],
        },
        D160: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B160", "C160"],
        },
        D161: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B161", "C161"],
        },
        D162: {
          content: "=IF(ISNA(~0),1, 0)",
          formulaTokens: ["B162"],
        },
        D163: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B163", "C163"],
        },
        D164: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B164", "C164"],
        },
        D165: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B165", "C165"],
        },
        D166: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B166", "C166"],
        },
        D167: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B167", "C167"],
        },
        D168: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B168", "C168"],
        },
        D169: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B169", "C169"],
        },
        D170: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B170", "C170"],
        },
        D171: {
          content: "=IF(~0=~1,1, 0)",
          formulaTokens: ["B171", "C171"],
        },
        D172: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B172", "C172"],
        },
        D173: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B173", "C173"],
        },
        D174: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B174", "C174"],
        },
        D175: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B175", "C175"],
        },
        D176: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B176", "C176"],
        },
        D177: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B177", "C177"],
        },
        D178: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B178", "C178"],
        },
        D179: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B179", "C179"],
        },
        D180: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B180", "C180"],
        },
        D181: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B181", "C181"],
        },
        D182: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B182", "C182"],
        },
        D183: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B183", "C183"],
        },
        D184: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B184", "C184"],
        },
        D185: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B185", "C185"],
        },
        D186: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B186", "C186"],
        },
        D187: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B187", "C187"],
        },
        D188: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B188", "C188"],
        },
        D189: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B189", "C189"],
        },
        D190: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B190", "C190"],
        },
        D191: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B191", "C191"],
        },
        D192: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B192", "C192"],
        },
        D193: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B193", "C193"],
        },
        D194: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B194", "C194"],
        },
        D195: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B195", "C195"],
        },
        D196: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B196", "C196"],
        },
        D197: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B197", "C197"],
        },
        D198: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B198", "C198"],
        },
        D199: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B199", "C199"],
        },
        D200: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B200", "C200"],
        },
        D201: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B201", "C201"],
        },
        D202: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B202", "C202"],
        },
        D203: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B203", "C203"],
        },
        D204: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B204", "C204"],
        },
        D205: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B205", "C205"],
        },
        D206: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B206", "C206"],
        },
        D207: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B207", "C207"],
        },
        D208: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B208", "C208"],
        },
        D209: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B209", "C209"],
        },
        D210: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B210", "C210"],
        },
        D211: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B211", "C211"],
        },
        D212: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B212", "C212"],
        },
        D213: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B213", "C213"],
        },
        D214: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B214", "C214"],
        },
        D215: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B215", "C215"],
        },
        D216: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B216", "C216"],
        },
        D217: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B217", "C217"],
        },
        D218: {
          content: "=IF(FLOOR(~0, 0.0001)=FLOOR(~1, 0.0001), 1, 0)",
          formulaTokens: ["B218", "C218"],
        },
        D219: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B219", "C219"],
        },
        D220: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B220", "C220"],
        },
        D221: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B221", "C221"],
        },
        D222: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B222", "C222"],
        },
        D223: {
          content: "=IF(~0=~1, 1, 0)",
          formulaTokens: ["B223", "C223"],
        },
        G1: {
          style: 10,
          content: "Name",
        },
        G2: {
          content: "Robot1",
        },
        G3: {
          content: "Robot2",
        },
        G4: {
          content: "NotACheater",
        },
        G5: {
          content: "Robot4",
        },
        G6: {
          content: "Robot3",
        },
        G7: {
          content: "Robot6",
        },
        G8: {
          content: "Michel",
        },
        G9: {
          content: "Robot7",
        },
        G11: {
          content: "criteria",
        },
        G12: {
          style: 10,
          content: "Name",
        },
        G13: {
          content: "NotACheater",
        },
        H1: {
          style: 10,
          content: "Age",
        },
        H2: {
          content: "26",
        },
        H3: {
          content: "13",
        },
        H4: {
          content: "26",
        },
        H5: {
          content: "42",
        },
        H6: {
          content: "9",
        },
        H7: {
          content: "27",
        },
        H8: {
          content: "30",
        },
        H9: {
          content: "37",
        },
        H12: {
          style: 10,
          content: "Age",
        },
        H13: {
          content: ">29",
        },
        H24: {
          style: 10,
          content: "Cashflows",
        },
        H25: {
          content: "1000",
        },
        H26: {
          content: "-1000",
        },
        H27: {
          content: "-600",
        },
        H34: {
          content: "UNIQUE",
          border: 2,
        },
        H38: {
          content: "EXPAND",
          border: 2,
        },
        H42: {
          content: "FILTER",
          border: 2,
        },
        H46: {
          content: "TRANSPOSE",
          border: 2,
        },
        H50: {
          content: "MUNIT",
          border: 2,
        },
        H54: {
          content: "FLATTEN",
          border: 2,
        },
        H60: {
          content: "FREQUENCY",
          border: 2,
        },
        H64: {
          content: "ARRAY.CONSTRAIN",
          border: 2,
        },
        H68: {
          content: "CHOOSECOLS",
          border: 2,
        },
        H72: {
          content: "CHOOSEROWS",
          border: 2,
        },
        H76: {
          content: "SUMPRODUCT",
          border: 2,
        },
        H80: {
          content: "MINVERSE",
          border: 2,
        },
        H84: {
          content: "MDETERM",
          border: 2,
        },
        H88: {
          content: "MMULT",
          border: 2,
        },
        H92: {
          content: "SUMX2MY2",
          border: 2,
        },
        H96: {
          content: "SUMX2PY2",
          border: 2,
        },
        H100: {
          content: "SUMXMY2",
          border: 2,
        },
        H104: {
          content: "TOCOL",
          border: 2,
        },
        H110: {
          content: "TOROW",
          border: 2,
        },
        H114: {
          content: "SPLIT",
          border: 2,
        },
        H117: {
          content: "HSTACK",
          border: 2,
        },
        H121: {
          content: "VSTACK",
          border: 2,
        },
        H127: {
          content: "WRAPCOLS",
          border: 2,
        },
        H132: {
          content: "WRAPROWS",
          border: 2,
        },
        I1: {
          style: 10,
          content: "Hours Played",
        },
        I2: {
          content: "1204.7",
        },
        I3: {
          content: "500.9",
        },
        I4: {
          content: "252.4",
        },
        I5: {
          content: "4701.3",
        },
        I6: {
          content: "12.1",
        },
        I7: {
          content: "4000",
        },
        I8: {
          content: "12052",
        },
        I9: {
          content: "4890.1",
        },
        I12: {
          style: 10,
          content: "Hours Played",
        },
        I13: {
          content: "<4500",
        },
        I24: {
          style: 10,
          content: "Rates",
        },
        I25: {
          content: "0.1",
        },
        I26: {
          content: "0.15",
        },
        I27: {
          content: "0.25",
        },
        I34: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L34", "N34", "M34", "O34"],
          border: 4,
        },
        I38: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["K38", "M38", "L38", "N38", "K39", "M39", "L39", "N39"],
          border: 4,
        },
        I42: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L42", "N42", "M42", "O42"],
          border: 4,
        },
        I46: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L46", "N46", "M46", "O46", "L47", "N47", "M47", "O47"],
          border: 4,
        },
        I50: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["J50", "L50", "K50", "M50", "J51", "L51", "K51", "M51"],
          border: 4,
        },
        I54: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L54", "M54", "L55", "M55", "L56", "M56", "L57", "M57"],
          border: 4,
        },
        I60: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L60", "M60", "L61", "M61"],
          border: 4,
        },
        I64: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L64", "M64", "L65", "M65"],
          border: 4,
        },
        I68: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L68", "M68", "L69", "M69"],
          border: 4,
        },
        I72: {
          content: "=IF(AND(~0=~1, ~2=~3), 1, 0)",
          formulaTokens: ["L72", "N72", "M72", "O72"],
          border: 4,
        },
        I76: {
          content: "=IF(AND(~0=~1), 1, 0)",
          formulaTokens: ["L76", "M76"],
          border: 4,
        },
        I80: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L80", "N80", "M80", "O80", "L81", "N81", "M81", "O81"],
          border: 4,
        },
        I84: {
          content: "=IF(AND(~0=~1), 1, 0)",
          formulaTokens: ["L84", "M84"],
          border: 4,
        },
        I88: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L88", "N88", "M88", "O88", "L89", "N89", "M89", "O89"],
          border: 4,
        },
        I92: {
          content: "=IF(AND(~0=~1), 1, 0)",
          formulaTokens: ["L92", "M92"],
          border: 4,
        },
        I96: {
          content: "=IF(AND(~0=~1), 1, 0)",
          formulaTokens: ["L96", "M96"],
          border: 4,
        },
        I100: {
          content: "=IF(AND(~0=~1), 1, 0)",
          formulaTokens: ["L100", "M100"],
          border: 4,
        },
        I104: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L104", "M104", "L105", "M105", "L106", "M106", "L107", "M107"],
          border: 4,
        },
        I110: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L110", "P110", "M110", "Q110", "N110", "R110", "O110", "S110"],
          border: 4,
        },
        I114: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["K114", "O114", "L114", "P114", "M114", "Q114", "N114", "R114"],
          border: 4,
        },
        I117: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L117", "P117", "M117", "Q117", "N117", "R117", "O117", "S117"],
          border: 4,
        },
        I121: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5, ~6=~7), 1, 0)",
          formulaTokens: ["L121", "M121", "L122", "M122", "L123", "M123", "L124", "M124"],
          border: 4,
        },
        I127: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5), 1, 0)",
          formulaTokens: ["K127", "L127", "K128", "L128", "K129", "L129"],
          border: 4,
        },
        I132: {
          content: "=IF(AND(~0=~1, ~2=~3, ~4=~5), 1, 0)",
          formulaTokens: ["K132", "N132", "L132", "O132", "M132", "P132"],
          border: 4,
        },
        J1: {
          style: 10,
          content: "Tot. Score",
        },
        J2: {
          content: "25618",
        },
        J3: {
          content: "23000",
        },
        J4: {
          content: "110120.5",
        },
        J5: {
          content: "50024",
        },
        J6: {
          content: "2",
        },
        J7: {
          content: "189576",
        },
        J8: {
          content: "256018",
        },
        J9: {
          content: "5000",
        },
        J12: {
          style: 10,
          content: "Tot. Score",
        },
        J13: {
          content: ">42000",
        },
        J24: {
          style: 10,
          content: "Dates",
        },
        J25: {
          content: "=DATE(2020, 01, 01)",
        },
        J26: {
          content: "=DATE(2021, 01, 01)",
        },
        J27: {
          content: "=DATE(2022, 01, 01)",
        },
        J33: {
          content: "Arguments",
          border: 6,
        },
        J34: {
          content: "1",
          border: 7,
        },
        J35: {
          content: "1",
          border: 8,
        },
        J37: {
          content: "Arguments",
          border: 9,
        },
        J38: {
          content: "1",
          border: 10,
        },
        J41: {
          content: "Arguments",
          border: 6,
        },
        J42: {
          content: "1",
          border: 7,
        },
        J43: {
          content: "0",
          border: 8,
        },
        J45: {
          content: "Arguments",
          border: 6,
        },
        J46: {
          content: "1",
          border: 7,
        },
        J47: {
          content: "3",
          border: 8,
        },
        J49: {
          content: "Results",
          border: 6,
        },
        J50: {
          content: "=MUNIT(2)",
          border: 7,
        },
        J53: {
          content: "Arguments",
          border: 6,
        },
        J54: {
          content: "1",
          border: 7,
        },
        J55: {
          content: "3",
          border: 8,
        },
        J59: {
          content: "Arguments",
          border: 6,
        },
        J60: {
          content: "1",
          border: 7,
        },
        J61: {
          content: "0",
          border: 8,
        },
        J63: {
          content: "Arguments",
          border: 6,
        },
        J64: {
          content: "1",
          border: 7,
        },
        J65: {
          content: "3",
          border: 8,
        },
        J67: {
          content: "Arguments",
          border: 6,
        },
        J68: {
          content: "1",
          border: 7,
        },
        J69: {
          content: "3",
          border: 8,
        },
        J71: {
          content: "Arguments",
          border: 6,
        },
        J72: {
          content: "1",
          border: 7,
        },
        J73: {
          content: "3",
          border: 8,
        },
        J75: {
          content: "Arguments",
          border: 6,
        },
        J76: {
          content: "1",
          border: 7,
        },
        J77: {
          content: "3",
          border: 8,
        },
        J79: {
          content: "Arguments",
          border: 6,
        },
        J80: {
          content: "1",
          border: 7,
        },
        J81: {
          content: "3",
          border: 8,
        },
        J83: {
          content: "Arguments",
          border: 6,
        },
        J84: {
          content: "1",
          border: 7,
        },
        J85: {
          content: "3",
          border: 8,
        },
        J87: {
          content: "Arguments",
          border: 6,
        },
        J88: {
          content: "1",
          border: 7,
        },
        J89: {
          content: "3",
          border: 8,
        },
        J91: {
          content: "Arguments",
          border: 6,
        },
        J92: {
          content: "1",
          border: 7,
        },
        J93: {
          content: "3",
          border: 8,
        },
        J95: {
          content: "Arguments",
          border: 6,
        },
        J96: {
          content: "1",
          border: 7,
        },
        J97: {
          content: "3",
          border: 8,
        },
        J99: {
          content: "Arguments",
          border: 6,
        },
        J100: {
          content: "1",
          border: 7,
        },
        J101: {
          content: "3",
          border: 8,
        },
        J103: {
          content: "Arguments",
          border: 6,
        },
        J104: {
          content: "1",
          border: 7,
        },
        J105: {
          content: "3",
          border: 8,
        },
        J109: {
          content: "Arguments",
          border: 6,
        },
        J110: {
          content: "1",
          border: 7,
        },
        J111: {
          content: "3",
          border: 8,
        },
        J113: {
          content: "Arguments",
          border: 9,
        },
        J114: {
          content: "Hello there; General Kenobi",
          border: 10,
        },
        J116: {
          content: "Arguments",
          border: 6,
        },
        J117: {
          content: "1",
          border: 7,
        },
        J118: {
          content: "3",
          border: 8,
        },
        J120: {
          content: "Arguments",
          border: 6,
        },
        J121: {
          content: "1",
          border: 7,
        },
        J122: {
          content: "3",
          border: 8,
        },
        J126: {
          content: "Arguments",
          border: 9,
        },
        J127: {
          content: "1",
          border: 10,
        },
        J128: {
          content: "3",
          border: 11,
        },
        J131: {
          content: "Arguments",
          border: 9,
        },
        J132: {
          content: "1",
          border: 10,
        },
        J133: {
          content: "3",
          border: 11,
        },
        K1: {
          style: 10,
          content: "Rank (lower the better)",
        },
        K2: {
          content: "5",
        },
        K3: {
          content: "7",
        },
        K4: {
          content: "3",
        },
        K5: {
          content: "4",
        },
        K6: {
          content: "1000",
        },
        K7: {
          content: "2",
        },
        K8: {
          content: "1",
        },
        K9: {
          content: "30",
        },
        K12: {
          style: 10,
          content: "Rank (lower the better)",
        },
        K13: {
          content: ">25",
        },
        K34: {
          content: "2",
          border: 4,
        },
        K35: {
          content: "2",
          border: 5,
        },
        K37: {
          content: "Results",
          border: 6,
        },
        K38: {
          content: "=EXPAND(~0, 2, 2, 0)",
          formulaTokens: ["J38"],
          border: 7,
        },
        K42: {
          content: "2",
          border: 4,
        },
        K43: {
          content: "4",
          border: 5,
        },
        K46: {
          content: "2",
          border: 4,
        },
        K47: {
          content: "4",
          border: 5,
        },
        K54: {
          content: "2",
          border: 4,
        },
        K55: {
          content: "4",
          border: 5,
        },
        K60: {
          content: "2",
          border: 4,
        },
        K61: {
          content: "4",
          border: 5,
        },
        K64: {
          content: "2",
          border: 4,
        },
        K65: {
          content: "4",
          border: 5,
        },
        K68: {
          content: "2",
          border: 4,
        },
        K69: {
          content: "4",
          border: 5,
        },
        K72: {
          content: "2",
          border: 4,
        },
        K73: {
          content: "4",
          border: 5,
        },
        K76: {
          content: "2",
          border: 4,
        },
        K77: {
          content: "4",
          border: 5,
        },
        K80: {
          content: "2",
          border: 4,
        },
        K81: {
          content: "4",
          border: 5,
        },
        K84: {
          content: "2",
          border: 4,
        },
        K85: {
          content: "4",
          border: 5,
        },
        K88: {
          content: "2",
          border: 4,
        },
        K89: {
          content: "4",
          border: 5,
        },
        K92: {
          content: "2",
          border: 4,
        },
        K93: {
          content: "4",
          border: 5,
        },
        K96: {
          content: "2",
          border: 4,
        },
        K97: {
          content: "4",
          border: 5,
        },
        K100: {
          content: "2",
          border: 4,
        },
        K101: {
          content: "4",
          border: 5,
        },
        K104: {
          content: "2",
          border: 4,
        },
        K105: {
          content: "4",
          border: 5,
        },
        K110: {
          content: "2",
          border: 4,
        },
        K111: {
          content: "4",
          border: 5,
        },
        K113: {
          content: "Results",
          border: 6,
        },
        K114: {
          content: '=SPLIT(~0, " ")',
          formulaTokens: ["J114"],
          border: 7,
        },
        K117: {
          content: "2",
          border: 4,
        },
        K118: {
          content: "4",
          border: 5,
        },
        K121: {
          content: "2",
          border: 4,
        },
        K122: {
          content: "4",
          border: 5,
        },
        K126: {
          content: "Results",
          border: 9,
        },
        K127: {
          content: "=WRAPCOLS(~0, 3, 0)",
          formulaTokens: ["J127:J128"],
          border: 10,
        },
        K131: {
          content: "Results",
          border: 6,
        },
        K132: {
          content: "=WRAPROWS(~0, 3, 0)",
          formulaTokens: ["J132:J133"],
          border: 7,
        },
        L33: {
          content: "Results",
          border: 6,
        },
        L34: {
          content: "=UNIQUE(~0)",
          formulaTokens: ["J34:K35"],
          border: 7,
        },
        L41: {
          content: "Results",
          border: 6,
        },
        L42: {
          content: "=FILTER(~0, ~1)",
          formulaTokens: ["J42:K43", "J42:J43"],
          border: 7,
        },
        L45: {
          content: "Results",
          border: 6,
        },
        L46: {
          content: "=TRANSPOSE(~0)",
          formulaTokens: ["J46:K47"],
          border: 7,
        },
        L49: {
          content: "Expected",
          border: 6,
        },
        L50: {
          content: "1",
          border: 7,
        },
        L51: {
          content: "0",
          border: 8,
        },
        L53: {
          content: "Results",
          border: 9,
        },
        L54: {
          content: "=FLATTEN(~0)",
          formulaTokens: ["J54:K55"],
          border: 10,
        },
        L59: {
          content: "Results",
          border: 9,
        },
        L60: {
          content: "=FREQUENCY(~0, 2)",
          formulaTokens: ["J60:K61"],
          border: 10,
        },
        L63: {
          content: "Results",
          border: 9,
        },
        L64: {
          content: "=ARRAY.CONSTRAIN(~0, 2, 1)",
          formulaTokens: ["J64:K65"],
          border: 10,
        },
        L67: {
          content: "Results",
          border: 9,
        },
        L68: {
          content: "=CHOOSECOLS(~0, 2)",
          formulaTokens: ["J68:K69"],
          border: 10,
        },
        L71: {
          content: "Results",
          border: 6,
        },
        L72: {
          content: "=CHOOSEROWS(~0, 2)",
          formulaTokens: ["J72:K73"],
          border: 7,
        },
        L75: {
          content: "Results",
          border: 9,
        },
        L76: {
          content: "=SUMPRODUCT(~0, ~1)",
          formulaTokens: ["J76:J77", "K76:K77"],
          border: 10,
        },
        L79: {
          content: "Results",
          border: 6,
        },
        L80: {
          content: "=MINVERSE(~0)",
          formulaTokens: ["J80:K81"],
          border: 7,
        },
        L83: {
          content: "Results",
          border: 9,
        },
        L84: {
          content: "=MDETERM(~0)",
          formulaTokens: ["J84:K85"],
          border: 10,
        },
        L87: {
          content: "Results",
          border: 6,
        },
        L88: {
          content: "=MMULT(~0, ~1)",
          formulaTokens: ["J88:K89", "J88:K89"],
          border: 7,
        },
        L91: {
          content: "Results",
          border: 9,
        },
        L92: {
          content: "=SUMX2MY2(~0, ~1)",
          formulaTokens: ["J92:J93", "K92:K93"],
          border: 10,
        },
        L95: {
          content: "Results",
          border: 9,
        },
        L96: {
          content: "=SUMX2PY2(~0, ~1)",
          formulaTokens: ["J96:J97", "K96:K97"],
          border: 10,
        },
        L99: {
          content: "Results",
          border: 9,
        },
        L100: {
          content: "=SUMXMY2(~0, ~1)",
          formulaTokens: ["J100:J101", "K100:K101"],
          border: 10,
        },
        L103: {
          content: "Results",
          border: 9,
        },
        L104: {
          content: "=TOCOL(~0)",
          formulaTokens: ["J104:K105"],
          border: 10,
        },
        L109: {
          content: "Results",
          border: 6,
        },
        L110: {
          content: "=TOROW(~0)",
          formulaTokens: ["J110:K111"],
          border: 7,
        },
        L116: {
          content: "Results",
          border: 6,
        },
        L117: {
          content: "=HSTACK(~0, ~1)",
          formulaTokens: ["J117:K117", "J118:K118"],
          border: 7,
        },
        L120: {
          content: "Results",
          border: 9,
        },
        L121: {
          content: "=VSTACK(~0, ~1)",
          formulaTokens: ["J121:J122", "K121:K122"],
          border: 10,
        },
        L126: {
          content: "Expected",
          border: 6,
        },
        L127: {
          content: "1",
          border: 7,
        },
        L128: {
          content: "3",
          border: 8,
        },
        L129: {
          content: "0",
          border: 8,
        },
        M37: {
          content: "Expected",
          border: 6,
        },
        M38: {
          content: "1",
          border: 7,
        },
        M39: {
          content: "0",
          border: 8,
        },
        M50: {
          content: "0",
          border: 2,
        },
        M51: {
          content: "1",
        },
        M53: {
          content: "Expected",
          border: 6,
        },
        M54: {
          content: "1",
          border: 7,
        },
        M55: {
          content: "2",
          border: 8,
        },
        M56: {
          content: "3",
          border: 8,
        },
        M57: {
          content: "4",
          border: 8,
        },
        M59: {
          content: "Expected",
          border: 6,
        },
        M60: {
          content: "3",
          border: 7,
        },
        M61: {
          content: "1",
          border: 8,
        },
        M63: {
          content: "Expected",
          border: 6,
        },
        M64: {
          content: "1",
          border: 7,
        },
        M65: {
          content: "3",
          border: 8,
        },
        M67: {
          content: "Expected",
          border: 6,
        },
        M68: {
          content: "2",
          border: 7,
        },
        M69: {
          content: "4",
          border: 8,
        },
        M75: {
          content: "Expected",
          border: 6,
        },
        M76: {
          content: "14",
          border: 7,
        },
        M83: {
          content: "Expected",
          border: 6,
        },
        M84: {
          content: "-2",
          border: 7,
        },
        M91: {
          content: "Expected",
          border: 6,
        },
        M92: {
          content: "-10",
          border: 7,
        },
        M95: {
          content: "Expected",
          border: 6,
        },
        M96: {
          content: "30",
          border: 7,
        },
        M99: {
          content: "Expected",
          border: 6,
        },
        M100: {
          content: "2",
          border: 7,
        },
        M103: {
          content: "Expected",
          border: 6,
        },
        M104: {
          content: "1",
          border: 7,
        },
        M105: {
          content: "2",
          border: 8,
        },
        M106: {
          content: "3",
          border: 8,
        },
        M107: {
          content: "4",
          border: 8,
        },
        M120: {
          content: "Expected",
          border: 6,
        },
        M121: {
          content: "1",
          border: 7,
        },
        M122: {
          content: "3",
          border: 8,
        },
        M123: {
          content: "2",
          border: 8,
        },
        M124: {
          content: "4",
          border: 8,
        },
        N1: {
          content: "0.1",
        },
        N2: {
          content: "0.2",
        },
        N3: {
          content: "0.4",
        },
        N4: {
          content: "0.5",
        },
        N5: {
          content: "0.6",
        },
        N6: {
          content: "A",
        },
        N7: {
          content: "true",
        },
        N8: {
          content: "false",
        },
        N33: {
          content: "Expected",
          border: 6,
        },
        N34: {
          content: "1",
          border: 7,
        },
        N38: {
          content: "0",
          border: 2,
        },
        N39: {
          content: "0",
        },
        N41: {
          content: "Expected",
          border: 6,
        },
        N42: {
          content: "1",
          border: 7,
        },
        N45: {
          content: "Expected",
          border: 6,
        },
        N46: {
          content: "1",
          border: 7,
        },
        N47: {
          content: "2",
          border: 8,
        },
        N71: {
          content: "Expected",
          border: 6,
        },
        N72: {
          content: "3",
          border: 7,
        },
        N79: {
          content: "Expected",
          border: 6,
        },
        N80: {
          content: "-2",
          border: 7,
        },
        N81: {
          content: "1.5",
          border: 8,
        },
        N87: {
          content: "Expected",
          border: 6,
        },
        N88: {
          content: "7",
          border: 7,
        },
        N89: {
          content: "15",
          border: 8,
        },
        N131: {
          content: "Expected",
          border: 6,
        },
        N132: {
          content: "1",
          border: 7,
        },
        O34: {
          content: "2",
          border: 2,
        },
        O42: {
          content: "2",
          border: 2,
        },
        O46: {
          content: "3",
          border: 2,
        },
        O47: {
          content: "4",
        },
        O72: {
          content: "4",
          border: 2,
        },
        O80: {
          content: "1",
          border: 2,
        },
        O81: {
          content: "-0.5",
        },
        O88: {
          content: "10",
          border: 2,
        },
        O89: {
          content: "22",
        },
        O113: {
          content: "Expected",
          border: 6,
        },
        O114: {
          content: "Hello",
          border: 7,
        },
        O132: {
          content: "3",
          border: 2,
        },
        P109: {
          content: "Expected",
          border: 6,
        },
        P110: {
          content: "1",
          border: 7,
        },
        P114: {
          content: "there;",
          border: 2,
        },
        P116: {
          content: "Expected",
          border: 6,
        },
        P117: {
          content: "1",
          border: 7,
        },
        P132: {
          content: "0",
          border: 2,
        },
        Q110: {
          content: "2",
          border: 2,
        },
        Q114: {
          content: "General",
          border: 2,
        },
        Q117: {
          content: "2",
          border: 2,
        },
        R110: {
          content: "3",
          border: 2,
        },
        R114: {
          content: "Kenobi",
          border: 2,
        },
        R117: {
          content: "3",
          border: 2,
        },
        S110: {
          content: "4",
          border: 2,
        },
        S117: {
          content: "4",
          border: 2,
        },
        H33: {
          border: 1,
        },
        H37: {
          border: 1,
        },
        H41: {
          border: 1,
        },
        H45: {
          border: 1,
        },
        H49: {
          border: 1,
        },
        H53: {
          border: 1,
        },
        H59: {
          border: 1,
        },
        H63: {
          border: 1,
        },
        H67: {
          border: 1,
        },
        H71: {
          border: 1,
        },
        H75: {
          border: 1,
        },
        H79: {
          border: 1,
        },
        H83: {
          border: 1,
        },
        H87: {
          border: 1,
        },
        H91: {
          border: 1,
        },
        H95: {
          border: 1,
        },
        H99: {
          border: 1,
        },
        H103: {
          border: 1,
        },
        H109: {
          border: 1,
        },
        H113: {
          border: 1,
        },
        H116: {
          border: 1,
        },
        H120: {
          border: 1,
        },
        H126: {
          border: 1,
        },
        H131: {
          border: 1,
        },
        I33: {
          border: 3,
        },
        I35: {
          border: 5,
        },
        I37: {
          border: 3,
        },
        I39: {
          border: 5,
        },
        I41: {
          border: 3,
        },
        I43: {
          border: 5,
        },
        I45: {
          border: 3,
        },
        I47: {
          border: 5,
        },
        I49: {
          border: 3,
        },
        I51: {
          border: 5,
        },
        I53: {
          border: 3,
        },
        I55: {
          border: 5,
        },
        I56: {
          border: 5,
        },
        I57: {
          border: 5,
        },
        I59: {
          border: 3,
        },
        I61: {
          border: 5,
        },
        I63: {
          border: 3,
        },
        I65: {
          border: 5,
        },
        I67: {
          border: 3,
        },
        I69: {
          border: 5,
        },
        I71: {
          border: 3,
        },
        I73: {
          border: 5,
        },
        I75: {
          border: 3,
        },
        I77: {
          border: 5,
        },
        I79: {
          border: 3,
        },
        I81: {
          border: 5,
        },
        I83: {
          border: 3,
        },
        I85: {
          border: 5,
        },
        I87: {
          border: 3,
        },
        I89: {
          border: 5,
        },
        I91: {
          border: 3,
        },
        I93: {
          border: 5,
        },
        I95: {
          border: 3,
        },
        I97: {
          border: 5,
        },
        I99: {
          border: 3,
        },
        I101: {
          border: 5,
        },
        I103: {
          border: 3,
        },
        I105: {
          border: 5,
        },
        I106: {
          border: 5,
        },
        I107: {
          border: 5,
        },
        I109: {
          border: 3,
        },
        I111: {
          border: 5,
        },
        I113: {
          border: 3,
        },
        I116: {
          border: 3,
        },
        I118: {
          border: 5,
        },
        I120: {
          border: 3,
        },
        I122: {
          border: 5,
        },
        I123: {
          border: 5,
        },
        I124: {
          border: 5,
        },
        I126: {
          border: 3,
        },
        I128: {
          border: 5,
        },
        I129: {
          border: 5,
        },
        I131: {
          border: 3,
        },
        I133: {
          border: 5,
        },
        J39: {
          border: 11,
        },
        J51: {
          border: 8,
        },
        J56: {
          border: 8,
        },
        J57: {
          border: 8,
        },
        J106: {
          border: 8,
        },
        J107: {
          border: 8,
        },
        J123: {
          border: 8,
        },
        J124: {
          border: 8,
        },
        J129: {
          border: 11,
        },
        K33: {
          border: 3,
        },
        K39: {
          border: 8,
        },
        K41: {
          border: 3,
        },
        K45: {
          border: 3,
        },
        K49: {
          border: 3,
        },
        K50: {
          border: 4,
        },
        K51: {
          border: 5,
        },
        K53: {
          border: 3,
        },
        K56: {
          border: 5,
        },
        K57: {
          border: 5,
        },
        K59: {
          border: 3,
        },
        K63: {
          border: 3,
        },
        K67: {
          border: 3,
        },
        K71: {
          border: 3,
        },
        K75: {
          border: 3,
        },
        K79: {
          border: 3,
        },
        K83: {
          border: 3,
        },
        K87: {
          border: 3,
        },
        K91: {
          border: 3,
        },
        K95: {
          border: 3,
        },
        K99: {
          border: 3,
        },
        K103: {
          border: 3,
        },
        K106: {
          border: 5,
        },
        K107: {
          border: 5,
        },
        K109: {
          border: 3,
        },
        K116: {
          border: 3,
        },
        K120: {
          border: 3,
        },
        K123: {
          border: 5,
        },
        K124: {
          border: 5,
        },
        K128: {
          border: 11,
        },
        K129: {
          border: 11,
        },
        K133: {
          border: 8,
        },
        L35: {
          border: 8,
        },
        L37: {
          border: 3,
        },
        L38: {
          border: 4,
        },
        L39: {
          border: 5,
        },
        L43: {
          border: 8,
        },
        L47: {
          border: 8,
        },
        L55: {
          border: 11,
        },
        L56: {
          border: 11,
        },
        L57: {
          border: 11,
        },
        L61: {
          border: 11,
        },
        L65: {
          border: 11,
        },
        L69: {
          border: 11,
        },
        L73: {
          border: 8,
        },
        L77: {
          border: 11,
        },
        L81: {
          border: 8,
        },
        L85: {
          border: 11,
        },
        L89: {
          border: 8,
        },
        L93: {
          border: 11,
        },
        L97: {
          border: 11,
        },
        L101: {
          border: 11,
        },
        L105: {
          border: 11,
        },
        L106: {
          border: 11,
        },
        L107: {
          border: 11,
        },
        L111: {
          border: 8,
        },
        L113: {
          border: 1,
        },
        L114: {
          border: 2,
        },
        L118: {
          border: 8,
        },
        L122: {
          border: 11,
        },
        L123: {
          border: 11,
        },
        L124: {
          border: 11,
        },
        L131: {
          border: 1,
        },
        L132: {
          border: 2,
        },
        M33: {
          border: 3,
        },
        M34: {
          border: 4,
        },
        M35: {
          border: 5,
        },
        M41: {
          border: 3,
        },
        M42: {
          border: 4,
        },
        M43: {
          border: 5,
        },
        M45: {
          border: 3,
        },
        M46: {
          border: 4,
        },
        M47: {
          border: 5,
        },
        M49: {
          border: 1,
        },
        M71: {
          border: 3,
        },
        M72: {
          border: 4,
        },
        M73: {
          border: 5,
        },
        M77: {
          border: 8,
        },
        M79: {
          border: 3,
        },
        M80: {
          border: 4,
        },
        M81: {
          border: 5,
        },
        M85: {
          border: 8,
        },
        M87: {
          border: 3,
        },
        M88: {
          border: 4,
        },
        M89: {
          border: 5,
        },
        M93: {
          border: 8,
        },
        M97: {
          border: 8,
        },
        M101: {
          border: 8,
        },
        M109: {
          border: 1,
        },
        M110: {
          border: 2,
        },
        M113: {
          border: 1,
        },
        M114: {
          border: 2,
        },
        M116: {
          border: 1,
        },
        M117: {
          border: 2,
        },
        M131: {
          border: 3,
        },
        M132: {
          border: 4,
        },
        M133: {
          border: 5,
        },
        N35: {
          border: 8,
        },
        N37: {
          border: 1,
        },
        N43: {
          border: 8,
        },
        N73: {
          border: 8,
        },
        N109: {
          border: 1,
        },
        N110: {
          border: 2,
        },
        N113: {
          border: 3,
        },
        N114: {
          border: 4,
        },
        N116: {
          border: 1,
        },
        N117: {
          border: 2,
        },
        N133: {
          border: 8,
        },
        O33: {
          border: 1,
        },
        O41: {
          border: 1,
        },
        O45: {
          border: 1,
        },
        O71: {
          border: 1,
        },
        O79: {
          border: 1,
        },
        O87: {
          border: 1,
        },
        O109: {
          border: 3,
        },
        O110: {
          border: 4,
        },
        O111: {
          border: 5,
        },
        O116: {
          border: 3,
        },
        O117: {
          border: 4,
        },
        O118: {
          border: 5,
        },
        O131: {
          border: 1,
        },
        P111: {
          border: 8,
        },
        P113: {
          border: 1,
        },
        P118: {
          border: 8,
        },
        P131: {
          border: 1,
        },
        Q109: {
          border: 1,
        },
        Q113: {
          border: 1,
        },
        Q116: {
          border: 1,
        },
        R109: {
          border: 1,
        },
        R113: {
          border: 1,
        },
        R116: {
          border: 1,
        },
        S109: {
          border: 1,
        },
        S116: {
          border: 1,
        },
      },
      conditionalFormats: [
        {
          id: "3",
          ranges: ["D:D"],
          rule: {
            values: ["1"],
            operator: "Equal",
            type: "CellIsRule",
            style: {
              fillColor: "#90EE90",
            },
          },
        },
        {
          id: "4",
          ranges: ["D:D"],
          rule: {
            values: ["0"],
            operator: "Equal",
            type: "CellIsRule",
            style: {
              fillColor: "#EE9090",
            },
          },
        },
        {
          id: "5",
          ranges: ["I33:I"],
          rule: {
            values: ["1"],
            operator: "Equal",
            type: "CellIsRule",
            style: {
              fillColor: "#90EE90",
            },
          },
        },
        {
          id: "6",
          ranges: ["I33:I"],
          rule: {
            values: ["0"],
            operator: "Equal",
            type: "CellIsRule",
            style: {
              fillColor: "#EE9090",
            },
          },
        },
      ],
      figures: [],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [],
    },
    {
      id: "border_sheet",
      name: "Borders",
      colNumber: 26,
      rowNumber: 100,
      rows: {},
      cols: {},
      merges: [],
      cells: {
        B2: {
          content: "left",
          border: 8,
        },
        B4: {
          content: "top",
          border: 2,
        },
        B6: {
          content: "right",
          border: 5,
        },
        B8: {
          content: "bottom",
          border: 1,
        },
        B10: {
          content: "all",
          border: 13,
        },
        D2: {
          content: "thin (default)",
          border: 13,
        },
        D4: {
          content: "medium",
          border: 16,
        },
        D6: {
          content: "thick",
          border: 1,
        },
        D8: {
          content: "dashed",
          border: 6,
        },
        D10: {
          content: "dotted",
          border: 3,
        },
        F2: {
          content: "mixed",
          border: 7,
        },
        A2: {
          border: 5,
        },
        A10: {
          border: 5,
        },
        B3: {
          border: 1,
        },
        B9: {
          border: 12,
        },
        B11: {
          border: 2,
        },
        C2: {
          border: 5,
        },
        C4: {
          border: 14,
        },
        C6: {
          border: 8,
        },
        C8: {
          border: 5,
        },
        C10: {
          border: 8,
        },
        D1: {
          border: 1,
        },
        D3: {
          border: 15,
        },
        D5: {
          border: 17,
        },
        D7: {
          border: 2,
        },
        D9: {
          border: 2,
        },
        D11: {
          border: 2,
        },
        E2: {
          border: 11,
        },
        E4: {
          border: 18,
        },
        E10: {
          border: 8,
        },
        F1: {
          border: 1,
        },
      },
      conditionalFormats: [],
      figures: [],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [],
    },
    {
      id: "sh5",
      name: "Data Validation",
      colNumber: 26,
      rowNumber: 50,
      rows: {},
      cols: {
        5: {
          size: 150,
        },
      },
      merges: [],
      cells: {
        A1: {
          style: 10,
          content: "Data Validation Corner",
          border: 1,
        },
        A2: {
          style: 10,
          border: 7,
        },
        A3: {
          content: "Perceval",
          border: 8,
        },
        A4: {
          content: "Arthur",
        },
        A5: {
          content: "Gauvin",
        },
        A6: {
          content: "Yvain",
          border: 6,
        },
        B2: {
          style: 10,
          content: "Age",
          border: 2,
        },
        B3: {
          content: "unknown",
        },
        B4: {
          content: "42",
        },
        B5: {
          content: "20",
        },
        B6: {
          content: "19",
          border: 1,
        },
        C2: {
          style: 10,
          content: "Birthday",
          border: 2,
        },
        C3: {
          format: 3,
          content: "unknown",
        },
        C4: {
          format: 3,
          content: "-453874",
        },
        C5: {
          format: 3,
          content: "-445626",
        },
        C6: {
          format: 3,
          content: "-445248",
          border: 1,
        },
        D2: {
          style: 10,
          content: "Origin",
          border: 2,
        },
        D3: {
          content: "Wales",
        },
        D4: {
          content: "Britain",
        },
        D5: {
          content: "Britain",
        },
        D6: {
          content: "Britain",
          border: 1,
        },
        E2: {
          style: 10,
          content: "Is king ?",
          border: 2,
        },
        E3: {
          style: 7,
          content: "false",
        },
        E4: {
          style: 7,
          content: "true",
        },
        E5: {
          style: 7,
          content: "false",
        },
        E6: {
          style: 7,
          content: "false",
          border: 1,
        },
        F2: {
          style: 10,
          content: "Email",
          border: 4,
        },
        F3: {
          content: "perceval@odoo.com",
          border: 5,
        },
        F4: {
          content: "arthur@kaamelott.fr",
          border: 5,
        },
        F5: {
          content: "Gauvin@odoo.com",
          border: 5,
        },
        F6: {
          content: "Yvain{at}odoo.com",
          border: 3,
        },
        A7: {
          border: 2,
        },
        B1: {
          border: 1,
        },
        B7: {
          border: 2,
        },
        C1: {
          border: 1,
        },
        C7: {
          border: 2,
        },
        D1: {
          border: 1,
        },
        D7: {
          border: 2,
        },
        E1: {
          border: 1,
        },
        E7: {
          border: 2,
        },
        F1: {
          border: 1,
        },
        F7: {
          border: 2,
        },
        G2: {
          border: 8,
        },
        G3: {
          border: 8,
        },
        G4: {
          border: 8,
        },
        G5: {
          border: 8,
        },
        G6: {
          border: 8,
        },
      },
      conditionalFormats: [],
      figures: [],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: {
        ROW: [],
        COL: [],
      },
      dataValidationRules: [
        {
          id: "dv1",
          criterion: {
            type: "isBetween",
            values: ["0", "100"],
          },
          ranges: ["B3:B6"],
        },
        {
          id: "dv2",
          criterion: {
            type: "dateIsValid",
            values: [],
          },
          ranges: ["C3:C6"],
        },
        {
          id: "dv3",
          criterion: {
            type: "isValueInList",
            values: ["Wales", "Britain", "Rome"],
            displayStyle: "arrow",
          },
          ranges: ["D3:D6"],
        },
        {
          id: "dv4",
          criterion: {
            type: "isBoolean",
            values: [],
          },
          ranges: ["E3:E6"],
        },
        {
          id: "dv5",
          criterion: {
            type: "textIsEmail",
            values: [],
          },
          ranges: ["F3:F6"],
        },
      ],
    },
  ],
  entities: {},
  styles: {
    1: {
      bold: true,
      textColor: "#3A3791",
      fontSize: 18,
    },
    2: {
      fillColor: "#e3efd9",
    },
    3: {
      fillColor: "#c5e0b3",
    },
    4: {
      fillColor: "#a7d08c",
    },
    5: {
      italic: true,
    },
    6: {
      strikethrough: true,
    },
    7: {
      underline: true,
    },
    8: {
      fillColor: "#d9d2e9",
    },
    9: {
      fillColor: "#000000",
    },
    10: {
      bold: true,
      fontSize: 11,
    },
  },
  formats: {
    1: "0.00%",
    2: "#,##0.00",
    3: "m/d/yyyy",
    4: "hh:mm:ss a",
  },
  borders: {
    1: {
      bottom: {
        style: "thin",
        color: "#000",
      },
    },
    2: {
      top: {
        style: "thin",
        color: "#000",
      },
    },
    3: {
      bottom: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    4: {
      top: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    5: {
      right: {
        style: "thin",
        color: "#000",
      },
    },
    6: {
      bottom: {
        style: "thin",
        color: "#000",
      },
      left: {
        style: "thin",
        color: "#000",
      },
    },
    7: {
      top: {
        style: "thin",
        color: "#000",
      },
      left: {
        style: "thin",
        color: "#000",
      },
    },
    8: {
      left: {
        style: "thin",
        color: "#000",
      },
    },
    9: {
      bottom: {
        style: "thin",
        color: "#000",
      },
      left: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    10: {
      top: {
        style: "thin",
        color: "#000",
      },
      left: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    11: {
      left: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    12: {
      top: {
        style: "thin",
        color: "#000",
      },
      bottom: {
        style: "thin",
        color: "#000",
      },
    },
    13: {
      top: {
        style: "thin",
        color: "#000",
      },
      bottom: {
        style: "thin",
        color: "#000",
      },
      left: {
        style: "thin",
        color: "#000",
      },
      right: {
        style: "thin",
        color: "#000",
      },
    },
    14: {
      right: {
        style: "medium",
        color: "#000",
      },
    },
    15: {
      top: {
        style: "thin",
        color: "#000",
      },
      bottom: {
        style: "medium",
        color: "#000",
      },
    },
    16: {
      top: {
        style: "medium",
        color: "#000",
      },
      bottom: {
        style: "medium",
        color: "#000",
      },
      left: {
        style: "medium",
        color: "#000",
      },
      right: {
        style: "medium",
        color: "#000",
      },
    },
    17: {
      top: {
        style: "medium",
        color: "#000",
      },
    },
    18: {
      left: {
        style: "medium",
        color: "#000",
      },
    },
  },
  revisionId: "START_REVISION",
  uniqueFigureIds: true,
  settings: {
    locale: {
      name: "English (US)",
      code: "en_US",
      thousandsSeparator: ",",
      decimalSeparator: ".",
      dateFormat: "m/d/yyyy",
      timeFormat: "hh:mm:ss a",
      formulaArgSeparator: ",",
    },
  },
};

// Performance dataset
function _getColumnLetter(number) {
  return number !== -1
    ? _getColumnLetter(Math.floor(number / 26) - 1) + String.fromCharCode(65 + (number % 26))
    : "";
}

function computeFormulaCells(cols, rows) {
  const cells = {};
  for (let row = 4; row <= rows; row++) {
    cells[`A${row}`] = { content: row.toString() };
    for (let col = 1; col < cols; col++) {
      const colLetter = _getColumnLetter(col);
      const prev = _getColumnLetter(col - 1);
      cells[colLetter + row] = {
        content: `=${prev}${row}+1`,
      };
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i < cols; i++) {
    cells[nextLetter + i] = {
      content: `=SUM(A${i}:${letter}${i})`,
    };
  }
  return cells;
}

function computeNumberCells(cols, rows, type = "numbers") {
  const cells = {};
  for (let col = 0; col < cols; col++) {
    const letter = _getColumnLetter(col);
    for (let index = 1; index < rows - 1; index++) {
      switch (type) {
        case "numbers":
          cells[letter + index] = { content: `${col + index}` };
          break;
        case "floats":
          cells[letter + index] = { content: `${col + index}.123` };
          break;
        case "longFloats":
          cells[letter + index] = { content: `${col + index}.123456789123456` };
          break;
      }
    }
  }
  return cells;
}

function computeStringCells(cols, rows) {
  const cells = {};
  for (let col = 0; col < cols; col++) {
    const letter = _getColumnLetter(col);
    for (let index = 1; index < rows; index++) {
      cells[letter + index] = { content: Math.random().toString(36).substr(2) };
    }
  }
  return cells;
}

/**
 *
 * @param {*} cols
 * @param {*} rows
 * @param {*} sheetsInfo ("numbers"|"strings"|"formulas")[]>
 * @returns
 */
export function makeLargeDataset(cols, rows, sheetsInfo = ["formulas"]) {
  const sheets = [];
  let cells;
  for (let index = 0; index < sheetsInfo.length; index++) {
    switch (sheetsInfo[index]) {
      case "formulas":
        cells = computeFormulaCells(cols, rows);
        break;
      case "numbers":
      case "floats":
      case "longFloats":
        cells = computeNumberCells(cols, rows, sheetsInfo[0]);
        break;
      case "strings":
        cells = computeStringCells(cols, rows);
    }
    sheets.push({
      name: `Sheet${index + 1}`,
      colNumber: cols,
      rowNumber: rows,
      cols: { 1: {}, 3: {} }, // ?
      rows: {},
      cells,
    });
  }
  return {
    version: 10,
    sheets,
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
