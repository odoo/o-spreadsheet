import { load } from "../src/data";

describe("load data", () => {
  test("create empty workbookdata when loading nothing", () => {
    expect(load()).toEqual({
      version: 1,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: []
        }
      ]
    });

    expect(load({})).toEqual({
      version: 1,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: []
        }
      ]
    });
  });

  test("assign sheet name if missing", () => {
    expect(
      load({
        sheets: [{ merges: ["A1:B2"] }]
      })
    ).toEqual({
      version: 1,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: []
        }
      ]
    });
  });

  test("assign two different sheet names if missing", () => {
    expect(
      load({
        sheets: [{ merges: ["A1:B2"] }, { merges: ["C3:D4"] }]
      }).sheets
    ).toEqual([
      {
        name: "Sheet1",
        cells: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["A1:B2"],
        conditionalFormats: []
      },
      {
        name: "Sheet2",
        cells: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["C3:D4"],
        conditionalFormats: []
      }
    ]);
  });
});
