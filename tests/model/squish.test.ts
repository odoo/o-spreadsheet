import { createRangeFromXc } from "@odoo/o-spreadsheet-engine/helpers/range";
import { Model } from "@odoo/o-spreadsheet-engine/model";
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
    const fullExport = model.exportData(false);
    const importedFromSquishedExport = new Model(model.exportData(true));
    const exportedWithoutSquishing = importedFromSquishedExport.exportData(false);
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
          "A6:A7": { R: "+R1|=|+R1|=|+R1|+R1|+R1|+R1" },
          B1: "1",
          B2: "2",
          B3: "3",
          C1: "=B1",
          "C2:C3": { R: "+R1" },
          C4: "=B4 + 2",
          C5: { N: "+1" },
          C6: { N: "+2997" },
          C7: { N: "+1" },
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
    expect(model.exportData(true).sheets).toEqual(result);
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
    const exportSquished = model.exportData(true);
    expect(exportSquished.sheets[0].cells).toEqual({ A1: "=SUM(B1)", A2: { R: "+R1" } });
    expect(exportSquished.sheets[1].cells).toEqual({ A1: "=SUM(B3)", A2: { R: "+R1" } });
  });

  test.each([
    // different cells
    [["=SUM(B1)", "=SUM(B2)"], { R: "+R1" }],
    [["=SUM(B2)", "=SUM(B1)"], { R: "+R-1" }],
    [["=SUM(B1)", "=SUM(A1)"], { R: "+C-1" }],
    [["=SUM(A1)", "=SUM(B1)"], { R: "+C1" }],
    [["=SUM(1,2)", "=SUM(1,3)"], { N: "=|+1" }],
    [["=SUM(1,2)", "=SUM(2,1)"], { N: "+1|+-1" }],
    [["=SUM(1)", "=SUM(1,2)"], "=SUM(1,2)"],
    [["=SUM(1,1)", "=SUM(1)"], "=SUM(1)"],

    // mixed absolute and relative references
    [["=SUM(B1)", "=SUM($B1)"], { R: "$B1" }],
    [["=SUM(B1)", "=SUM($B$1)"], { R: "$B$1" }],
    [["=SUM(B1)", "=SUM(B$1)"], { R: "B$1" }],
    // mixed absolute and relative references + 1 small change
    [["=SUM(B1)", "=SUM($B2)"], { R: "$B2" }],
    [["=SUM(B1)", "=SUM($B$2)"], { R: "$B$2" }],
    [["=SUM(B1)", "=SUM(B$2)"], { R: "B$2" }],

    //changing sheet name
    [["=SUM(Sheet1!B1)", "=SUM(Sheet2!B1)"], { R: "Sheet2!B1" }],
    [["=SUM(Sheet1!B1)", "=SUM(Sheet2!B2)"], { R: "Sheet2!B2" }],
    [["=SUM(B1)", "=SUM(Sheet1!B1)"], { R: "Sheet1!B1" }],
    [["=SUM(B1)", "=SUM('Shee  t2'!B1)"], { R: "'Shee  t2'!B1" }],

    // ising a range that looks like a change
    [["=SUM(R1)", "=SUM(R2)"], { R: "+R1" }],
    [["=SUM(R2)", "=SUM(R3)"], { R: "+R1" }],
    [["=SUM(R3)", "=SUM(R2)"], { R: "+R-1" }],
    [["=SUM(C1)", "=SUM(C2)"], { R: "+R1" }],
    [["=SUM(C2)", "=SUM(C3)"], { R: "+R1" }],
    [["=SUM(C2)", "=SUM(C1)"], { R: "+R-1" }],
    [["=SUM(C2)", "=SUM(B2)"], { R: "+C-1" }],
    [["=SUM(C2)", "=SUM(D2)"], { R: "+C1" }],
    [["=SUM(B2)", "=SUM(C3)"], { R: "C3" }],

    // using unauthorized characters in the sheet name should still work
    [["=SUM(B1)", "=SUM('Shee*t2'!B1)"], { R: "'Shee*t2'!B1" }],

    // incorrect ranges should still work
    [["=SUM(B1)", "=SUM(2B)"], "=SUM(2B)"],

    // using the squish separator character in the sheet name is valid
    [["=SUM(B1)", "=SUM('Shee|t2'!B1)"], { R: ["'Shee|t2'!B1"] }],
  ])("difference in cell dependencies should be handled properly", (received, expected) => {
    const A1 = received[0];
    const A2 = received[1];
    const model = createModelFromGrid({ A1, A2 }, true);
    const exportSquished = model.exportData(true);
    expect(exportSquished.sheets[0].cells.A2).toEqual(expected);

    const importedFromSquished = new Model(exportSquished);
    const exportUnSquished = importedFromSquished.exportData(false);
    expect(exportUnSquished.sheets[0].cells.A1).toEqual(A1);
    expect(exportUnSquished.sheets[0].cells.A2).toEqual(A2);
  });

  test.each([
    // identical formulas
    [
      { A1: "=SUM(B1)", A2: "=SUM(B1)", A3: "=SUM(B1)", B1: "=SUM(B1)" },
      { "A1:A3": "=SUM(B1)", B1: {} },
    ],
    // identical transformations
    [
      { A1: "=SUM(B1)", A2: "=SUM(B2)", A3: "=SUM(B3)" },
      { A1: "=SUM(B1)", "A2:A3": { R: "+R1" } },
    ],
    // identical transformations and positions not following each other
    [
      { A1: "=SUM(B1)", A2: "=SUM(B2)", A4: "=SUM(B3)" },
      { A1: "=SUM(B1)", A2: { R: "+R1" }, A4: {} },
    ],

    // formula followed by string (not formula) followed by same formula does not interrupt squishing
    [
      { A1: "=SUM(B1)", A2: "coucou", A3: "=SUM(B3)" },
      { A1: "=SUM(B1)", A2: "coucou", A3: { R: "+R2" } },
    ],
    [
      { A1: "=SUM(B1)", A2: "coucou", B1: "=SUM(B1)" },
      { A1: "=SUM(B1)", A2: "coucou", B1: {} },
    ],
    [
      { A1: "=SUM(B1)", B1: "coucou", B2: "=SUM(B3)" },
      { A1: "=SUM(B1)", B1: "coucou", B2: { R: "+R2" } },
    ],
  ])(
    "same formulas at following positions are grouped on the same range",
    (sheetContent, squishedContent) => {
      const model = createModelFromGrid(sheetContent);
      const exportSquished = model.exportData(true);
      expect(exportSquished.sheets[0].cells).toEqual(squishedContent);

      const importedFromSquished = new Model(exportSquished);
      const exportUnSquished = importedFromSquished.exportData(false);
      expect(exportUnSquished.sheets[0].cells).toEqual(sheetContent);
    }
  );

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
    const exportSquished = model.exportData(true);
    expect(exportSquished.sheets[0].cells).toEqual(squishedContent);

    const importedFromSquished = new Model(exportSquished);
    const exportUnSquished = importedFromSquished.exportData(false);
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
            A2: { R: "+R1" },
            A3: { R: "+R1" },
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
    const exportedSquished = model.exportData(true);
    expect(exportedSquished.sheets[0].cells).toEqual({
      A1: "=SUM(B1)",
      A2: { R: "+R1" },
      A4: { R: "+R2" },
      "B1:B2": "=AVERAGE(C1)",
      B4: {},
    });
    const exported = model.exportData(false);
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
