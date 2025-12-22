import { createModelFromGrid } from "../test_helpers/helpers";

describe("squish similar formulas", () => {
  it("should squish identical formulas", () => {
    const model = createModelFromGrid({
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
    });
    console.log(JSON.stringify(model.exportData().sheets));
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
          A1: "=SUM(B1:B10)",
          A2: {},
          A3: { R: ["B1:B11"] },
          A5: '=IF(AND(F20819<=Sheet1!$M$1,F20819>=Sheet1!$L$1),IFERROR(MID(C20819,SEARCH("(",C20819)+1,SEARCH(")",C20819)-SEARCH("(",C20819)-1),""))',
          A6: { R: ["+R1", "=", "+R1", "=", "+R1", "+R1", "+R1", "+R1"] },
          A7: { R: ["+R1", "=", "+R1", "=", "+R1", "+R1", "+R1", "+R1"] },
          B1: "1",
          B2: "2",
          B3: "3",
          C1: "=B1",
          C2: { R: ["+R1"] },
          C3: { R: ["+R1"] },
          C4: "=B4 + 2",
          C5: { N: ["+1"] },
          C6: { N: ["+2997"] },
          C7: { N: ["+1"] },
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
    expect(model.exportData().sheets).toEqual(result);
  });

  it("should not squish different formulas", () => {});
});
