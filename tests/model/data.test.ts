import { DEFAULT_REVISION_ID } from "../../src/constants";
import { createEmptySheet, getCurrentVersion, load } from "../../src/migrations/data";
import { DEFAULT_LOCALE } from "../../src/types";

describe("load data", () => {
  test("create empty workbookdata when loading nothing", () => {
    const emptyWorkbook = load({});
    expect(emptyWorkbook).toMatchObject({
      version: getCurrentVersion(),
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
          dataValidationRules: [],
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
      version: getCurrentVersion(),
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
          dataValidationRules: [],
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
      version: getCurrentVersion(),
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
          dataValidationRules: [],
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
      { ...createEmptySheet("1", "Sheet1"), merges: ["A1:B2"] },
      { ...createEmptySheet("asdf", "Sheet2"), merges: ["C3:D4"] },
    ]);
  });

  test("sanitize input data, even if versioned", () => {
    expect(
      load({
        version: 3,
        sheets: [{ merges: ["A1:B2"] }],
      })
    ).toMatchObject({
      version: getCurrentVersion(),
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
          dataValidationRules: [],
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
      version: getCurrentVersion(),
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
