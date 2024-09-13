import { DEFAULT_REVISION_ID } from "../../src/constants";
import { CURRENT_VERSION, load } from "../../src/migrations/data";
import { DEFAULT_LOCALE } from "../../src/types";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

describe("load data", () => {
  test("create empty workbookdata when loading nothing", () => {
    const emptyWorkbook = load({});
    expect(emptyWorkbook).toMatchObject({
      version: CURRENT_VERSION,
      borders: {},
      styles: {},
      formats: {},
      settings: { locale: DEFAULT_LOCALE },
      revisionId: DEFAULT_REVISION_ID,
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: [],
          conditionalFormats: [],
          figures: [],
          tables: [],
          isVisible: true,
        },
      ],
      uniqueFigureIds: true,
    });

    expect(load({})).toEqual(emptyWorkbook);
  });

  test("assign sheet name if missing", () => {
    expect(
      load({
        sheets: [{ id: "asdf", merges: ["A1:B2"] }],
      })
    ).toMatchObject({
      version: CURRENT_VERSION,
      borders: {},
      styles: {},
      formats: {},
      revisionId: DEFAULT_REVISION_ID,
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
          figures: [],
          tables: [],
          isVisible: true,
        },
      ],
      uniqueFigureIds: true,
    });
  });

  test("assign sheet id if missing", () => {
    expect(
      load({
        sheets: [{ name: "Sheet1", merges: ["A1:B2"] }],
      })
    ).toMatchObject({
      version: CURRENT_VERSION,
      borders: {},
      styles: {},
      formats: {},
      revisionId: DEFAULT_REVISION_ID,
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: [],
          figures: [],
          tables: [],
          isVisible: true,
        },
      ],
      uniqueFigureIds: true,
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
        styles: {},
        borders: {},
        formats: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["A1:B2"],
        conditionalFormats: [],
        figures: [],
        tables: [],
        isVisible: true,
      },
      {
        id: "asdf",
        name: "Sheet2",
        cells: {},
        styles: {},
        borders: {},
        formats: {},
        colNumber: 26,
        rowNumber: 100,
        cols: {},
        rows: {},
        merges: ["C3:D4"],
        conditionalFormats: [],
        figures: [],
        tables: [],
        isVisible: true,
      },
    ]);
  });

  test("sanitize input data, even if versioned", () => {
    expect(
      load({
        version: 3,
        sheets: [{ merges: ["A1:B2"] }],
      })
    ).toMatchObject({
      version: CURRENT_VERSION,
      borders: {},
      styles: {},
      formats: {},
      revisionId: DEFAULT_REVISION_ID,
      sheets: [
        {
          id: "Sheet1",
          name: "Sheet1",
          cells: {},
          colNumber: 26,
          rowNumber: 100,
          cols: {},
          rows: {},
          merges: ["A1:B2"],
          conditionalFormats: [],
          figures: [],
          tables: [],
          isVisible: true,
        },
      ],
      uniqueFigureIds: true,
    });
  });

  test("figure data are correctly updated", () => {
    expect(
      load({
        version: 15,
        sheets: [
          {
            name: "Sheet1",
            id: "Sheet1",
            cells: {},
            figures: [
              {
                id: "1",
                data: {
                  type: "line",
                  title: "Line",
                  labelRange: "Sheet1!A27:A35",
                  dataSets: ["Sheet1!B26:B35", "Sheet1!C26:C35"],
                  dataSetsHaveTitle: true,
                },
              },
            ],
          },
        ],
      })
    ).toMatchObject({
      version: CURRENT_VERSION,
      sheets: [
        {
          figures: [
            {
              data: {
                title: { text: "Line" },
                dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
                dataSetsHaveTitle: true,
              },
            },
          ],
        },
      ],
    });
  });
});
