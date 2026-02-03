import { createRangeFromXc } from "@odoo/o-spreadsheet-engine/helpers/range";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { createSheet } from "../test_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

describe("squish - unsquish", () => {
  let model: Model;
  beforeEach(() => {
    model = createModelFromGrid({
      A1: "=SUM(B1:B10)",
      A2: "=SUM(B1:B10)",
      A3: "=SUM(B1:B11)",
      B1: "1",
      B2: "2",
      B3: "3",
      C1: "=B1",
      C2: "=B2",
      C3: "=B3",
      C4: "=B4 + 2",
      C5: "=B4 + 3",
      C6: "=B4 + 3000",
      C7: "=B4 + 3001",
      A5: '=IF(AND(F20819<=\'Sheet1\'!$M$1,F20819>=\'Sheet1\'!$L$1),IFERROR(MID(C20819,SEARCH("(",C20819)+1,SEARCH(")",C20819)-SEARCH("(",C20819)-1),""))',
      A6: '=IF(AND(F20820<=\'Sheet1\'!$M$1,F20820>=\'Sheet1\'!$L$1),IFERROR(MID(C20820,SEARCH("(",C20820)+1,SEARCH(")",C20820)-SEARCH("(",C20820)-1),""))',
      A7: '=IF(AND(F20821<=\'Sheet1\'!$M$1,F20821>=\'Sheet1\'!$L$1),IFERROR(MID(C20821,SEARCH("(",C20821)+1,SEARCH(")",C20821)-SEARCH("(",C20821)-1),""))',
      D1: '="Test"+"Test"',
      D2: '="Test"+"Test"',
      D3: '="Test2"',
      D4: '="Test2"',
      D5: '="Test2"',
    });
  });

  test("should squish identical formulas", () => {
    const fullExport = model._exportData(false);
    const importedFromSquishedExport = new Model(model._exportData(true));
    const exportedWithoutSquishing = importedFromSquishedExport._exportData(false);
    expect(exportedWithoutSquishing).toEqual(fullExport);
  });

  test("squished version correctness", () => {
    const result = [
      {
        id: "Sheet1",
        name: "Sheet1",
        colNumber: 26,
        rowNumber: 100,
        rows: {},
        cols: {},
        merges: [],
        cells: {
          "A1:A2": "=SUM(B1:B10)",
          A3: { R: "B1:B11" },
          A5: '=IF(AND(F20819<=Sheet1!$M$1,F20819>=Sheet1!$L$1),IFERROR(MID(C20819,SEARCH("(",C20819)+1,SEARCH(")",C20819)-SEARCH("(",C20819)-1),""))',
          "A6:A7": { N: "=|=", R: "+R1|=|+R1|=|+R1|+R1|+R1|+R1", S: ["=", "=", "=", "="] },
          B1: "1",
          B2: "2",
          B3: "3",
          C1: "=B1",
          "C2:C3": { R: "+R1" },
          C4: "=B4 + 2",
          C5: { N: "+1", R: "=" },
          C6: { N: "+2997", R: "=" },
          C7: { N: "+1", R: "=" },
          "D1:D2": '="Test"+"Test"',
          "D3:D5": '="Test2"',
        },
        styles: {},
        formats: {},
        borders: {},
        conditionalFormats: [],
        dataValidationRules: [],
        figures: [],
        tables: [],
        areGridLinesVisible: true,
        isVisible: true,
        headerGroups: { ROW: [], COL: [] },
      },
    ];
    expect(model._exportData(true).sheets).toEqual(result);
  });
});

describe("squish - unsquish specific cases", () => {
  test("squish always reset when changing sheet", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: "=SUM(B1)",
            A2: "=SUM(B2)",
          },
        },
        {
          id: "Sheet2",
          name: "Sheet2",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: "=SUM(B3)",
            A2: "=SUM(B4)",
          },
        },
      ],
    });
    const exportSquished = model._exportData(true);
    expect(exportSquished.sheets[0].cells).toEqual({ A1: "=SUM(B1)", A2: { R: "+R1" } });
    expect(exportSquished.sheets[1].cells).toEqual({ A1: "=SUM(B3)", A2: { R: "+R1" } });
  });

  test.each([
    // different cells
    [["=SUM(B1)", "=SUM(B2)"], { R: "+R1" }],
    [["=SUM(B2)", "=SUM(B1)"], { R: "-R1" }],
    [["=SUM(B1)", "=SUM(A1)"], { R: "-C1" }],
    [["=SUM(A1)", "=SUM(B1)"], { R: "+C1" }],
    [["=SUM(A1)", "=SUM(B2)"], { R: "B2" }],
    [["=SUM(1,2)", "=SUM(1,3)"], { N: "=|+1" }],
    [["=SUM(1,2)", "=SUM(2,1)"], { N: "+1|+-1" }],
    [["=SUM(1)", "=SUM(1,2)"], "=SUM(1,2)"],
    [["=SUM(1,1)", "=SUM(1)"], "=SUM(1)"],
    [["=SUM($B1)", "=SUM($B2)"], { R: "+R1" }],
    [["=SUM($B1)", "=SUM($C1)"], { R: "+C1" }],
    [["=SUM(B$1)", "=SUM(B$2)"], { R: "+R1" }],
    [["=SUM(B$1)", "=SUM(C$1)"], { R: "+C1" }],
    [["=SUM($B$1)", "=SUM($B$2)"], { R: "+R1" }],
    [["=SUM($B$1)", "=SUM($C$1)"], { R: "+C1" }],
    [["=SUM(Sheet1!A1)", "=SUM(Sheet1!A2)"], { R: "+R1" }],
    [["=SUM(Sheet1!A1)", "=SUM(Sheet1!B1)"], { R: "+C1" }],

    // unbound ranges
    [["=SUM(B1:B)", "=SUM(C1:C)"], { R: "C1:C" }],
    [["=SUM(B:B)", "=SUM(C:C)"], { R: "C:C" }],
    [["=SUM(B1:3)", "=SUM(C1:3)"], { R: "C1:3" }],
    [["=SUM($B1:3)", "=SUM($C1:3)"], { R: "$C1:3" }],
    [["=SUM($B1:3)", "=SUM(B1:3)"], { R: "B1:3" }],
    [["=SUM(B1:3)", "=SUM(B1:$3)"], { R: "B1:$3" }],

    // mixed absolute and relative references
    [["=SUM(B1)", "=SUM($B1)"], { R: "$B1" }],
    [["=SUM(B1)", "=SUM($B$1)"], { R: "$B$1" }],
    [["=SUM(B1)", "=SUM(B$1)"], { R: "B$1" }],
    // mixed absolute and relative references + 1 small change
    [["=SUM(B1)", "=SUM($B2)"], { R: "$B2" }],
    [["=SUM(B1)", "=SUM($B$2)"], { R: "$B$2" }],
    [["=SUM(B1)", "=SUM(B$2)"], { R: "B$2" }],

    // changing sheet name
    [["=SUM(Sheet1!B1)", "=SUM(Sheet2!B1)"], { R: "Sheet2!B1" }],
    [["=SUM(Sheet1!B1)", "=SUM(Sheet2!B2)"], { R: "Sheet2!B2" }],
    [["=SUM(B1)", "=SUM(Sheet1!B1)"], { R: "Sheet1!B1" }],
    [["=SUM(B1)", "=SUM('Shee  t2'!B1)"], { R: "'Shee  t2'!B1" }],

    // using a range that looks like a change
    [["=SUM(R1)", "=SUM(R2)"], { R: "+R1" }],
    [["=SUM(R2)", "=SUM(R3)"], { R: "+R1" }],
    [["=SUM(R3)", "=SUM(R2)"], { R: "-R1" }],
    [["=SUM(C1)", "=SUM(C2)"], { R: "+R1" }],
    [["=SUM(C2)", "=SUM(C3)"], { R: "+R1" }],
    [["=SUM(C2)", "=SUM(C1)"], { R: "-R1" }],
    [["=SUM(C2)", "=SUM(B2)"], { R: "-C1" }],
    [["=SUM(C2)", "=SUM(D2)"], { R: "+C1" }],
    [["=SUM(B2)", "=SUM(C3)"], { R: "C3" }],
    [["=SUM(B2)", "=SUM(E2)"], { R: "+C3" }],
    [["=SUM(B2)", "=SUM(B9)"], { R: "+R7" }],
    [["=SUM(E2)", "=SUM(B2)"], { R: "-C3" }],
    [["=SUM(B9)", "=SUM(B2)"], { R: "-R7" }],

    // using ranges
    [["=SUM(B2:B3)", "=SUM(B3:B4)"], { R: "B3:B4" }],
    [["=SUM(B2:B3)", "=SUM(B2:B4)"], { R: "B2:B4" }],
    [["=SUM(B2:B3)", "=SUM(B2)"], "=SUM(B2)"],
    [["=SUM(B2:B3)", "=SUM(B2:C3)"], { R: "B2:C3" }],
    [["=SUM(B2:B3)", "=SUM(A2:B3)"], { R: "A2:B3" }],
    [["=SUM(B2:B3)", "=SUM($B2:B3)"], { R: "$B2:B3" }],
    [["=SUM(B2:B3)", "=SUM(B$2:B3)"], { R: "B$2:B3" }],
    [["=SUM(B2:B3)", "=SUM(B2:$B3)"], { R: "B2:$B3" }],
    [["=SUM(B2:B3)", "=SUM(B2:B$3)"], { R: "B2:B$3" }],
    [["=SUM(B2:B3)", "=SUM(B2:$B$3)"], { R: "B2:$B$3" }],
    [["=SUM(B2:B3)", "=SUM($B$2:$B$3)"], { R: "$B$2:$B$3" }],
    [["=SUM(B2:B3)", "=SUM(Sheet1!B2:B3)"], { R: "Sheet1!B2:B3" }],

    [["=SUM($B2:B3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM(B$2:B3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM(B2:$B3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM(B2:B$3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM(B2:$B$3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM($B$2:$B$3)", "=SUM(B2:B3)"], { R: "B2:B3" }],
    [["=SUM(Sheet1!B2:B3)", "=SUM(B2:B3)"], { R: "B2:B3" }],

    // using unauthorized characters in the sheet name should still work
    [["=SUM(B1)", "=SUM('Shee*t2'!B1)"], { R: "'Shee*t2'!B1" }],

    // incorrect ranges should still work
    [["=SUM(B1)", "=SUM(2B)"], "=SUM(2B)"],

    // using the squish separator character in the sheet name is valid
    [["=SUM(B1)", "=SUM('Shee|t2'!B1)"], { R: ["'Shee|t2'!B1"] }],

    // using the squish separator character in string is valid
    [['=CONCAT("cou|cou", "hello")', '=CONCAT("sa|lut", "hello")'], { S: ["sa|lut", "="] }],
  ])("difference in formula parameters should be handled properly", (received, expected) => {
    const A1 = received[0];
    const A2 = received[1];
    const model = createModelFromGrid({ A1, A2 });
    createSheet(model, { sheetId: "Sheet2" });
    const exportSquished = model._exportData(true);
    expect(exportSquished.sheets[0].cells.A2).toEqual(expected);

    const importedFromSquished = new Model(exportSquished);
    const exportUnSquished = importedFromSquished._exportData(false);
    expect(exportUnSquished.sheets[0].cells.A1).toEqual(A1);
    expect(exportUnSquished.sheets[0].cells.A2).toEqual(A2);
  });

  test.each([
    // identical formulas
    [
      { A1: "=SUM(B1)", A2: "=SUM(B1)", A3: "=SUM(B1)", B1: "=SUM(B1)" },
      { "A1:A3": "=SUM(B1)", B1: "=SUM(B1)" },
    ],
    // identical transformations
    [
      { A1: "=SUM(B1)", A2: "=SUM(B2)", A3: "=SUM(B3)" },
      { A1: "=SUM(B1)", "A2:A3": { R: "+R1" } },
    ],
    // identical transformations and positions not following each other
    [
      { A1: "=SUM(B1)", A2: "=SUM(B2)", A4: "=SUM(B3)", A5: "=SUM(B4)" },
      { A1: "=SUM(B1)", A2: { R: "+R1" }, "A4:A5": { R: "+R1" } },
    ],

    // formula followed by string (not formula) followed by same formula interrupt squishing
    [
      { A1: "=SUM(B1)", A2: "coucou", A3: "=SUM(B3)" },
      { A1: "=SUM(B1)", A2: "coucou", A3: "=SUM(B3)" },
    ],
    [
      { A1: "=SUM(B1)", A2: "coucou", B1: "=SUM(B1)" },
      { A1: "=SUM(B1)", A2: "coucou", B1: "=SUM(B1)" },
    ],
    [
      { A1: "=SUM(B1)", B1: "coucou", B2: "=SUM(B3)" },
      { A1: "=SUM(B1)", B1: "coucou", B2: "=SUM(B3)" },
    ],

    // transformation that carry over a column change after row changes with text interrupting (column title) reset the squishing
    [
      {
        A1: "title A1",
        A2: "=SUM($B1,$D$1,$B1)",
        A3: "=SUM($B2,$D$1,$B2)",
        A4: "=SUM($B3,$D$1,$B3)",
        B1: "title B1",
        B2: "=SUM($C1,$D$1,$B1)",
        B3: "=SUM($C2,$D$1,$B2)",
        B4: "=SUM($C3,$D$1,$B3)",
        C1: "title C1",
        C2: "=SUM($D2,$D$1,$B1)",
        C3: "=SUM($D3,$D$1,$B2)",
        C4: "=SUM($D4,$D$1,$B3)",
      },
      {
        A1: "title A1",
        A2: "=SUM($B1,$D$1,$B1)",
        "A3:A4": { R: "+R1|=|+R1" },
        B1: "title B1",
        B2: "=SUM($C1,$D$1,$B1)",
        "B3:B4": { R: "+R1|=|+R1" },
        C1: "title C1",
        C2: "=SUM($D2,$D$1,$B1)",
        "C3:C4": { R: "+R1|=|+R1" },
      },
    ],
    [
      {
        D1: '=AND(10,"company_id")',
        D2: '=COUNT(10,1,"company_id")',
        D3: '=COUNT(10,2,"company_id")',
        D4: '=COUNT(10,3,"company_id")',
        E1: "ID",
        E2: '=COUNT(10,1,"id")',
        E3: '=COUNT(10,2,"id")',
        E4: '=COUNT(10,3,"id")',
      },
      {
        D1: '=AND(10,"company_id")',
        D2: '=COUNT(10,1,"company_id")',
        "D3:D4": { N: "=|+1", S: ["="] },
        E1: "ID",
        E2: '=COUNT(10,1,"id")',
        "E3:E4": { N: "=|+1", S: ["="] },
      },
    ],

    // transformation that carry over a column change after row changes without text interrupting continue the squishing
    [
      {
        A1: "title A1",
        A2: "=SUM($B1,$D$1,$B1)",
        A3: "=SUM($B2,$D$1,$B2)",
        A4: "=SUM($B3,$D$1,$B3)",
        B2: "=SUM($C1,$D$1,$B1)",
        B3: "=SUM($C2,$D$1,$B2)",
        B4: "=SUM($C3,$D$1,$B3)",
        C2: "=SUM($D2,$D$1,$B1)",
        C3: "=SUM($D3,$D$1,$B2)",
        C4: "=SUM($D4,$D$1,$B3)",
      },
      {
        A1: "title A1",
        A2: "=SUM($B1,$D$1,$B1)",
        "A3:A4": { R: "+R1|=|+R1" },
        B2: { R: "$C1|=|-R2" },
        "B3:B4": { R: "+R1|=|+R1" },
        C2: { R: "$D2|=|-R2" },
        "C3:C4": { R: "+R1|=|+R1" },
      },
    ],
    [
      {
        D1: '=AND(10,"company_id")',
        D2: '=COUNT(10,1,"company_id")',
        D3: '=COUNT(10,2,"company_id")',
        D4: '=COUNT(10,3,"company_id")',
        E2: '=COUNT(10,1,"id")',
        E3: '=COUNT(10,2,"id")',
        E4: '=COUNT(10,3,"id")',
      },
      {
        D1: '=AND(10,"company_id")',
        D2: '=COUNT(10,1,"company_id")',
        "D3:D4": { N: "=|+1", S: ["="] },
        E2: { N: "=|+-2", S: ["id"] },
        "E3:E4": { N: "=|+1", S: ["="] },
      },
    ],

    // same formula with drastic changes
    [
      {
        A1: '=AND(2,"project_id")',
        A2: '=COUNT(2,1,"project_id")',
        A3: '=COUNT(2,2,"project_id")',
        A4: '=COUNT(2,3,"project_id")',
        A5: '=COUNT(2,4,"project_id")',
        A6: '=COUNT(2,5,"project_id")',
        A7: '=COUNT(2,6,"project_id")',
        A8: '=COUNT(2,1,"user_ids")',
        A9: '=COUNT(2,1,"user_ids")',
        A10: '=COUNT(2,1,"user_ids")',
      },
      {
        A1: '=AND(2,"project_id")',
        A2: '=COUNT(2,1,"project_id")',
        "A3:A7": { N: "=|+1", S: ["="] },
        A8: { N: "=|+-5", S: ["user_ids"] },
        "A9:A10": { N: "=|=", S: ["="] },
      },
    ],

    // same formula with a change, then a fixed value, then the same change
    [
      {
        F42: "=E42*K$3-D42",
        F43: "=E43*K$3-D43",
        F44: "=E44*K$3-D44",
        F45: "=E45*K$3-D45",
        F46: "=E46*K$3-D46",
        F47: "=E47*K$3-D47",
        F48: "=E48*K$3-D48",
        F49: "=E49*K42-N49",
        F50: "=E50*K$3-D50",
        F51: "=E51*K$3-D51",
        F52: "=E52*K$3-D52",
        F53: "=E53*K$3-D53",
      },
      {
        F42: "=E42*K$3-D42",
        "F43:F48": { R: "+R1|=|+R1" },
        F49: { R: "+R1|K42|N49" },
        F50: { R: "+R1|K$3|D50" },
        "F51:F53": { R: "+R1|=|+R1" },
      },
    ],

    // formula with #REF followed by same formula with correct REF
    [
      {
        B5: "=#REF",
        B6: "=A1",
      },
      {
        B5: "=#REF",
        B6: { R: "A1" },
      },
    ],
    [
      {
        B4: "=A1",
        B5: "=#REF",
        B6: "=A1",
      },
      {
        B4: "=A1",
        B5: { R: "#REF" },
        B6: { R: "A1" },
      },
    ],
    [
      {
        B4: "=A1",
        B5: "=#REF",
        B6: "=#REF",
        B7: "=#REF",
      },
      {
        B4: "=A1",
        B5: { R: "#REF" },
        "B6:B7": { R: "=" },
      },
    ],
  ])(
    "same formulas at following positions are grouped on the same range %s",
    (sheetContent, squishedContent) => {
      const model = createModelFromGrid(sheetContent);
      const exportSquished = model._exportData(true);
      expect(exportSquished.sheets[0].cells).toEqual(squishedContent);

      const importedFromSquished = new Model(exportSquished);
      const exportUnSquished = importedFromSquished._exportData(false);
      expect(exportUnSquished.sheets[0].cells).toEqual(sheetContent);
    }
  );

  test("empty cell do not generate positions", () => {
    const sheetContent = {};
    const squishedContent = {};
    const model = createModelFromGrid(sheetContent);
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ top: 0, left: 0, bottom: 2, right: 2 }],
      style: { bold: true },
    });
    const exportSquished = model._exportData(true);
    expect(exportSquished.sheets[0].cells).toEqual(squishedContent);

    const importedFromSquished = new Model(exportSquished);
    const exportUnSquished = importedFromSquished._exportData(false);
    expect(exportUnSquished.sheets[0].cells).toEqual(sheetContent);
  });

  test.each([
    // invalid formulas
    [
      { A1: "=SUM(B1,/2)", A2: "=SUM(B2,/2)" },
      { A1: "=SUM(B1,/2)", A2: "=SUM(B2,/2)" },
    ],
    [
      { A1: "=C1{C2", A2: "=C2{C3" },
      { A1: "=C1{C2", A2: "=C2{C3" },
    ],

    [{ A1: "=SUM(B1,/2)", A2: "=SUM(B1,/2)" }, { "A1:A2": "=SUM(B1,/2)" }],
  ])("invalid formulas are not squished", (sheetContent, squishedContent) => {
    const model = createModelFromGrid(sheetContent);
    const exportSquished = model._exportData(true);
    expect(exportSquished.sheets[0].cells).toEqual(squishedContent);

    const importedFromSquished = new Model(exportSquished);
    const exportUnSquished = importedFromSquished._exportData(false);
    expect(exportUnSquished.sheets[0].cells).toEqual(sheetContent);
  });
});

describe("Models created from squished data behavior", () => {
  test("adapt ranges when inserting rows/columns", () => {
    const squishedData = {
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: "=SUM(B1)",
            "A2:A3": { R: "+R1" },
            "B1:B3": "=AVERAGE(C1)",
          },
        },
      ],
    };
    const model = new Model(squishedData);
    model.dispatch("ADD_COLUMNS_ROWS", {
      sheetId: "Sheet1",
      sheetName: "Sheet1",
      dimension: "ROW",
      position: "after",
      base: 1,
      quantity: 1,
    });
    const exportedSquished = model._exportData(true);
    expect(exportedSquished.sheets[0].cells).toEqual({
      A1: "=SUM(B1)",
      A2: { R: "+R1" }, // =SUM(B2)
      A4: { R: "+R2" }, // =SUM(B4)
      "B1:B2": "=AVERAGE(C1)",
      B4: "=AVERAGE(C1)",
    });
    const exported = model._exportData(false);
    expect(exported.sheets[0].cells).toEqual({
      A1: "=SUM(B1)",
      A2: "=SUM(B2)",
      A4: "=SUM(B4)",
      B1: "=AVERAGE(C1)",
      B2: "=AVERAGE(C1)",
      B4: "=AVERAGE(C1)",
    });
  });
});

describe("do not rely on order of keys in squished data", () => {
  test("importing squished data with different key order works", () => {
    const squishedData1 = {
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          colNumber: 100,
          rowNumber: 100,
          cells: {
            AA1: "=AVERAGE(AA2)",
            A2: { R: "+R1" },
            Z1: { R: "+C1" },
            A99: { R: "+R94" },
            A1: "=SUM(B1)",
            "A3:A5": { R: "+R1" },
            AA2: { R: "+C1" },
          },
        },
      ],
    };
    const model = new Model(squishedData1);
    const exported = model._exportData(false);
    expect(exported.sheets[0].cells).toEqual({
      A1: "=SUM(B1)",
      A2: "=SUM(B2)",
      A3: "=SUM(B3)",
      A4: "=SUM(B4)",
      A5: "=SUM(B5)",
      A99: "=SUM(B99)",
      Z1: "=SUM(C99)",
      AA1: "=AVERAGE(AA2)",
      AA2: "=AVERAGE(AB2)",
    });
  });
});

describe("We did not add properties to Range without adding the behavior in Squish/Unsquish", () => {
  test("range didn't change", () => {
    const model = new Model();
    const range = createRangeFromXc(
      {
        xc: "B9:C11",
        sheetId: model.getters.getActiveSheetId(),
      },
      model.getters.getSheetSize
    );
    expect(Object.keys(range).sort()).toEqual(
      ["zone", "unboundedZone", "parts", "prefixSheet", "sheetId", "invalidSheetName"].sort()
    );
    expect(Object.keys(range.zone).sort()).toEqual(["left", "top", "right", "bottom"].sort());
    expect(Object.keys(range.unboundedZone).sort()).toEqual(
      ["left", "top", "right", "bottom"].sort()
    );
    expect(range.parts.length).toBe(2);
    expect(Object.keys(range.parts[0]).sort()).toEqual(["colFixed", "rowFixed"]);
    expect(Object.keys(range.parts[1]).sort()).toEqual(["colFixed", "rowFixed"]);
  });
});
