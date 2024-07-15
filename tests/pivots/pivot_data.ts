import { toZone } from "../../src/helpers/index";

export const pivotModelData = function (xc: string) {
  return {
    version: 19,
    sheets: [
      {
        id: "pivot",
        name: "Pivot",
        colNumber: 26,
        rowNumber: 100,
        rows: {},
        cols: {},
        merges: [],
        cells: {
          A1: {
            content: "Created on",
          },
          A2: {
            content: "04/03/2024",
          },
          A3: {
            content: "03/03/2024",
          },
          A4: {
            content: "02/02/2024",
          },
          A5: {
            content: "04/02/2024",
          },
          A6: {
            content: "03/28/2024",
          },
          A7: {
            content: "04/02/2024",
          },
          A8: {
            content: "04/02/2024",
          },
          A9: {
            content: "02/27/2024",
          },
          A10: {
            content: "04/01/2024",
          },
          A11: {
            content: "04/02/2024",
          },
          A12: {
            content: "04/03/2024",
          },
          A13: {
            content: "02/03/2024",
          },
          A14: {
            content: "03/03/2024",
          },
          A15: {
            content: "01/26/2024",
          },
          A16: {
            content: "03/27/2024",
          },
          A17: {
            content: "03/27/2024",
          },
          A18: {
            content: "03/31/2024",
          },
          A19: {
            content: "01/31/2024",
          },
          A20: {
            content: "04/02/2024",
          },
          A21: {
            content: "04/05/2024",
          },
          A22: {
            content: "19/05/2024",
          },
          B1: {
            content: "Opportunity",
          },
          B2: {
            content: "my opportunity",
          },
          B3: {
            content: "test opportunity",
          },
          B4: {
            content: "interested in tables",
          },
          B5: {
            content: "Interest in your products",
          },
          B6: {
            content: "Open Space Design",
          },
          B7: {
            content: "Modern Open Space",
          },
          B8: {
            content: "Office Design and Architecture",
          },
          B9: {
            content: "Distributor Contract",
          },
          B10: {
            content: "Furnitures",
          },
          B11: {
            content: "Office Design Project",
          },
          B12: {
            content: "abc opportunity",
          },
          B13: {
            content: "Quote for 600 Chairs",
          },
          B14: {
            content: "Devis pour 150 tapis",
          },
          B15: {
            content: "5 VP Chairs",
          },
          B16: {
            content: "Customizable Desk",
          },
          B17: {
            content: "DeltaPC: 10 Computer Desks",
          },
          B18: {
            content: "Potential Distributor",
          },
          B19: {
            content: "Info about services",
          },
          B20: {
            content: "Quote for 12 Tables",
          },
          B21: {
            content: "Need 20 Desks",
          },
          B22: {
            content: "Access to Online Catalog",
          },
          C1: {
            content: "Contact Name",
          },
          C2: {
            content: "Michel",
          },
          C4: {
            content: "Alice",
          },
          C7: {
            content: "Bob",
          },
          C9: {
            content: "Charlie",
          },
          C10: {
            content: "Robin",
          },
          C13: {
            content: "Erik",
          },
          C14: {
            content: "Erik",
          },
          C15: {
            content: "Carlos",
          },
          C16: {
            content: "Charles",
          },
          C17: {
            content: "Roger",
          },
          C18: {
            content: "Mich-Mich",
          },
          C20: {
            content: "Will",
          },
          D1: {
            content: "Email",
          },
          D2: {
            content: "admin@yourcompany.example.com",
          },
          D3: {
            content: "info@yourcompany.example.com",
          },
          D4: {
            content: "adam@example.com",
          },
          D5: {
            content: "info@example.com",
          },
          D6: {
            content: "info@example.com",
          },
          D7: {
            content: "henry@exemple.com",
          },
          D8: {
            content: "info@my.example.com",
          },
          D9: {
            content: "john@tech.info",
          },
          D10: {
            content: "info@my.example.com",
          },
          D11: {
            content: "info@exemple.com",
          },
          D12: {
            content: "info@yourcompany.example.com",
          },
          D13: {
            content: "erik@blop.com",
          },
          D14: {
            content: "erik@blop.com",
          },
          D15: {
            content: "info@yourcompany.example.com",
          },
          D16: {
            content: "info@yourcompany.example.com",
          },
          D17: {
            content: "info@my.example.com",
          },
          D18: {
            content: "Carlos@inc.sa",
          },
          D19: {
            content: "info@mycompany.com",
          },
          D20: {
            content: "Will@example.com",
          },
          D21: {
            content: "info@mycompany.net",
          },
          D22: {
            content: "mich-mich@example.com",
          },
          E1: {
            content: "Salesperson",
          },
          E2: {
            content: "Kevin",
          },
          E3: {
            content: "Kevin",
          },
          E4: {
            content: "Kevin",
          },
          E5: {
            content: "Eden",
          },
          E6: {
            content: "Eden",
          },
          E7: {
            content: "Kevin",
          },
          E8: {
            content: "Kevin",
          },
          E9: {
            content: "Kevin",
          },
          E10: {
            content: "Kevin",
          },
          E11: {
            content: "Eden",
          },
          E12: {
            content: "Kevin",
          },
          E13: {
            content: "Kevin",
          },
          E14: {
            content: "Kevin",
          },
          E15: {
            content: "Kevin",
          },
          E16: {
            content: "Eden",
          },
          E17: {
            content: "Eden",
          },
          E18: {
            content: "Eden",
          },
          E19: {
            content: "Kevin",
          },
          E20: {
            content: "Kevin",
          },
          E21: {
            content: "Kevin",
          },
          E22: {
            content: "Eden",
          },
          F1: {
            content: "Expected Revenue",
          },
          F2: {
            format: 1,
            content: "2000",
          },
          F3: {
            format: 1,
            content: "11000",
          },
          F4: {
            format: 1,
            content: "4500",
          },
          F5: {
            format: 1,
          },
          F6: {
            format: 1,
          },
          F7: {
            format: 1,
          },
          F8: {
            format: 1,
            content: "9000",
          },
          F9: {
            format: 1,
            content: "19800",
          },
          F10: {
            format: 1,
            content: "3800",
          },
          F11: {
            format: 1,
            content: "24000",
          },
          F12: {
            format: 1,
          },
          F13: {
            format: 1,
            content: "22500",
          },
          F14: {
            format: 1,
            content: "40000",
          },
          F15: {
            format: 1,
            content: "5600",
          },
          F16: {
            format: 1,
            content: "15000",
          },
          F17: {
            format: 1,
            content: "35000",
          },
          F18: {
            format: 1,
            content: "1000",
          },
          F19: {
            format: 1,
            content: "25000",
          },
          F20: {
            format: 1,
            content: "40000",
          },
          F21: {
            format: 1,
            content: "60000",
          },
          F22: {
            format: 1,
            content: "2000",
          },
          G1: {
            content: "Expected MRR",
          },
          G7: {
            content: "333.33",
          },
          H1: {
            content: "Stage",
          },
          H2: {
            content: "New",
          },
          H3: {
            content: "New",
          },
          H4: {
            content: "New",
          },
          H5: {
            content: "Won",
          },
          H6: {
            content: "Proposition",
          },
          H7: {
            content: "Won",
          },
          H8: {
            content: "Proposition",
          },
          H9: {
            content: "Won",
          },
          H10: {
            content: "Qualified",
          },
          H11: {
            content: "New",
          },
          H12: {
            content: "New",
          },
          H13: {
            content: "Qualified",
          },
          H14: {
            content: "New",
          },
          H15: {
            content: "Proposition",
          },
          H16: {
            content: "Proposition",
          },
          H17: {
            content: "Qualified",
          },
          H18: {
            content: "Qualified",
          },
          H19: {
            content: "Qualified",
          },
          H20: {
            content: "New",
          },
          H21: {
            content: "Proposition",
          },
          H22: {
            content: "Won",
          },
          I1: {
            content: "Active",
          },
          I2: {
            content: "TRUE",
          },
          I3: {
            content: "FALSE",
          },
          I4: {
            content: "TRUE",
          },
          I5: {
            content: "TRUE",
          },
          I6: {
            content: "TRUE",
          },
          I7: {
            content: "TRUE",
          },
          I8: {
            content: "TRUE",
          },
          I9: {
            content: "TRUE",
          },
          I10: {
            content: "TRUE",
          },
          I11: {
            content: "TRUE",
          },
          I12: {
            content: "FALSE",
          },
          I13: {
            content: "FALSE",
          },
          I14: {
            content: "FALSE",
          },
          I15: {
            content: "FALSE",
          },
          I16: {
            content: "FALSE",
          },
          I17: {
            content: "FALSE",
          },
          I18: {
            content: "FALSE",
          },
          I19: {
            content: "FALSE",
          },
          I20: {
            content: "FALSE",
          },
          I21: {
            content: "FALSE",
          },
          I22: {
            content: "FALSE",
          },
        },
        conditionalFormats: [],
        figures: [],
        tables: [],
        areGridLinesVisible: true,
        isVisible: true,
        headerGroups: {
          ROW: [],
          COL: [],
        },
        dataValidationRules: [],
      },
    ],
    styles: {},
    formats: {
      "1": "[$$]#,##0.00",
    },
    borders: {},
    revisionId: "fbf5c369-70ff-4a05-929e-859e0608c53a",
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
    pivots: {
      "1": {
        type: "SPREADSHEET",
        columns: [
          {
            fieldName: "Expected Revenue",
          },
        ],
        rows: [],
        measures: [
          {
            id: "__count:sum",
            fieldName: "__count",
            aggregator: "sum",
          },
        ],
        name: "My pivot",
        dataSet: {
          zone: toZone(xc),
          sheetId: "pivot",
        },
        formulaId: "1",
      },
    },
    pivotNextId: 2,
  };
};
