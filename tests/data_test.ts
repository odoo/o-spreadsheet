import { load } from "../src/data";
import { mockUuidV4To } from "./helpers";
jest.mock("../src/helpers/uuid", () => require("./__mocks__/uuid"));

describe("load data", () => {
  test("create empty workbookdata when loading nothing", () => {
    mockUuidV4To(123);
    expect(load()).toEqual({
      version: 5,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          id: "123",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: [],
          figures: {},
        },
      ],
      activeSheet: "123",
    });

    expect(load({})).toEqual({
      version: 5,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          id: "124",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: [],
          figures: {},
        },
      ],
      activeSheet: "124",
    });
  });

  test("assign sheet name if missing", () => {
    expect(
      load({
        sheets: [{ id: "asdf", merges: ["A1:B2"] }],
      })
    ).toEqual({
      version: 5,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          id: "asdf",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: [],
          figures: {},
        },
      ],
      activeSheet: "asdf",
    });
  });

  test("assign sheet id if missing", () => {
    mockUuidV4To(12);
    expect(
      load({
        sheets: [{ name: "Sheet1", merges: ["A1:B2"] }],
      })
    ).toEqual({
      version: 5,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          id: "13",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: [],
          figures: {},
        },
      ],
      activeSheet: "13",
    });
  });

  test("assign two different sheet names if missing", () => {
    expect(
      load({
        sheets: [
          { id: "1", merges: ["A1:B2"] },
          { id: "asdf", merges: ["C3:D4"] },
        ],
      }).sheets
    ).toEqual([
      {
        id: "1",
        name: "Sheet1",
        cells: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["A1:B2"],
        conditionalFormats: [],
        figures: {},
      },
      {
        id: "asdf",
        name: "Sheet2",
        cells: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["C3:D4"],
        conditionalFormats: [],
        figures: {},
      },
    ]);
  });

  test("sanitize input data, even if versioned", () => {
    mockUuidV4To(133);
    expect(
      load({
        version: 3,
        sheets: [{ merges: ["A1:B2"] }],
      })
    ).toEqual({
      version: 5,
      borders: {},
      styles: {},
      entities: {},
      sheets: [
        {
          id: "134",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: [],
          figures: {},
        },
      ],
      activeSheet: "134",
    });
  });
});
