import {
  BACKGROUND_CHART_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_REVISION_ID,
  FORBIDDEN_SHEET_CHARS,
} from "../../src/constants";
import { toCartesian } from "../../src/helpers";
import { CURRENT_VERSION } from "../../src/migrations/data";
import { Model } from "../../src/model";
import { BorderDescr, ColorScaleRule, IconSetRule } from "../../src/types/index";
import {
  activateSheet,
  resizeColumns,
  resizeRows,
  setCellContent,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getMerges } from "../test_helpers/getters_helpers";
import "../test_helpers/helpers";

jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));
describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    // 96 is default cell width
    expect(model.getters.getColSize(sheet, 0)).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(sheet, 1)).toEqual(DEFAULT_CELL_WIDTH);
  });
});

describe("Migrations", () => {
  test("Can upgrade from 1 to 12", () => {
    const model = new Model({
      version: 1,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: { 0: { size: 42 } },
          rows: { 0: { size: 12 } },
          cells: { A1: { content: "=a1" } },
          name: "My sheet",
          conditionalFormats: [],
        },
      ],
    });
    const data = model.exportData();
    expect(data.version).toBe(12);
    expect(data.sheets[0].id).toBeDefined();
    expect(data.sheets[0].figures).toBeDefined();
    expect(data.sheets[0].cells.A1!.content).toBe("=A1");
    expect(data.sheets[0].isVisible).toBe(true);
  });
  test("migrate version 5: normalize formulas", () => {
    const model = new Model({
      version: 5,
      sheets: [
        {
          cells: {
            A1: { content: "=A1" },
            A2: { content: "=1" },
            A3: { content: `="hello"` },
            A4: { content: "=A1+A1+A2" },
            A5: { content: `=A1+1+"2"` },
          },
        },
      ],
    });
    const data = model.exportData();
    const cells = data.sheets[0].cells;
    expect(data.version).toBe(12);
    // formulas are de-normalized with version 9
    expect(cells.A1?.content).toBe("=A1");
    expect(cells.A2?.content).toBe("=1");
    expect(cells.A3?.content).toBe(`="hello"`);
    expect(cells.A4?.content).toBe("=A1+A1+A2");
    expect(cells.A5?.content).toBe(`=A1+1+"2"`);
  });
  test("migrate version 6: charts", () => {
    const model = new Model({
      version: 6,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: { 0: { size: 42 } },
          rows: { 0: { size: 12 } },
          cells: { A1: { content: "=a1" } },
          name: "My sheet",
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
                title: "demo chart",
                labelRange: "My sheet!A27:A35",
                dataSets: [
                  { labelCell: "My sheet!B26", dataRange: "My sheet!B27:B35" },
                  { labelCell: "My sheet!C26", dataRange: "My sheet!C27:C35" },
                ],
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
                labelRange: "My sheet!A27:A35",
                dataSets: [
                  { labelCell: undefined, dataRange: "My sheet!B27:B35" },
                  { dataRange: "My sheet!C27:C35" },
                ],
              },
            },
            {
              id: "3",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 500,
              data: {
                type: "bar",
                title: "demo chart 3",
                labelRange: "My sheet!A27",
                dataSets: [{ labelCell: "My sheet!B26", dataRange: "My sheet!B27" }],
              },
            },
            {
              id: "4",
              tag: "chart",
              width: 400,
              height: 300,
              x: 600,
              y: 500,
              data: {
                type: "bar",
                title: "demo chart 4",
                labelRange: "My sheet!A27",
                dataSets: [{ dataRange: "My sheet!B27" }],
              },
            },
          ],
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].figures[0].data).toEqual({
      type: "line",
      title: "demo chart",
      labelRange: "'My sheet'!A27:A35",
      dataSets: ["B26:B35", "C26:C35"],
      dataSetsHaveTitle: true,
      background: BACKGROUND_CHART_COLOR,
      verticalAxisPosition: "left",
      legendPosition: "top",
      stacked: false,
    });
    expect(data.sheets[0].figures[1].data).toEqual({
      type: "bar",
      title: "demo chart 2",
      labelRange: "'My sheet'!A27:A35",
      dataSets: ["B27:B35", "C27:C35"],
      dataSetsHaveTitle: false,
      background: BACKGROUND_CHART_COLOR,
      verticalAxisPosition: "left",
      legendPosition: "top",
      stacked: false,
    });
    expect(data.sheets[0].figures[2].data).toEqual({
      type: "bar",
      title: "demo chart 3",
      labelRange: "'My sheet'!A27",
      dataSets: ["B26:B27"],
      dataSetsHaveTitle: true,
      background: BACKGROUND_CHART_COLOR,
      verticalAxisPosition: "left",
      legendPosition: "top",
      stacked: false,
    });
    expect(data.sheets[0].figures[3].data).toEqual({
      type: "bar",
      title: "demo chart 4",
      labelRange: "'My sheet'!A27",
      dataSets: ["B27"],
      dataSetsHaveTitle: false,
      background: BACKGROUND_CHART_COLOR,
      verticalAxisPosition: "left",
      legendPosition: "top",
      stacked: false,
    });
  });
  test.each(FORBIDDEN_SHEET_CHARS)("migrate version 7: sheet Names", (char) => {
    const model = new Model({
      version: 7,
      sheets: [
        { name: "My sheet" },
        {
          name: `sheetName${char}`,
          cells: { A1: { formula: { text: "=|0|", dependencies: [`sheetName${char}!A2`] } } },
          figures: [
            {
              id: "1",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              type: "chart",
              data: {
                dataSets: [`=sheetName${char}!A1:A2`, "My sheet!A1:A2"],
                dataSetsHaveTitle: true,
                labelRange: `=sheetName${char}!B1:B2`,
                type: "bar",
              },
            },
          ],
          conditionalFormats: [
            {
              id: 1,
              ranges: [`=sheetName${char}!A1:A2`],
              rule: {
                type: "ColorScaleRule",
                maximum: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
                midpoint: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
                minimum: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
              },
            },
            {
              id: 2,
              ranges: ["D5:D6"],
              rule: {
                type: "IconSetRule",
                icons: { upper: "arrowGood", middle: "dotNeutral", lower: "arrowBad" },
                lowerInflectionPoint: {
                  type: "formula",
                  value: `=sheetName${char}!B1`,
                  operator: "gt",
                },
                upperInflectionPoint: {
                  type: "formula",
                  value: `=sheetName${char}!B1`,
                  operator: "gt",
                },
              },
            },
            {
              id: 3,
              ranges: [`=sheetName${char}!A1:A2`],
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "percentage", value: "33", color: 16711680 },
                midpoint: { type: "number", value: "13", color: 16711680 },
                maximum: { type: "value", color: 16711680 },
              },
            },
          ],
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].name).toBe("My sheet");
    expect(data.sheets[1].name).toBe("sheetName_");

    const cells = data.sheets[1].cells;
    expect(cells.A1!.content).toBe("=sheetName_!A2");

    const figures = data.sheets[1].figures;
    expect(figures[0].data?.dataSets).toEqual(["=sheetName_!A1:A2", "My sheet!A1:A2"]);
    expect(figures[0].data?.labelRange).toBe("=sheetName_!B1:B2");

    const cfs = data.sheets[1].conditionalFormats;
    const rule1 = cfs[0].rule as ColorScaleRule;
    expect(cfs[0].ranges).toEqual(["=sheetName_!A1:A2"]);
    expect(rule1.minimum.value).toEqual("=sheetName_!B1");
    expect(rule1.midpoint?.value).toEqual("=sheetName_!B1");
    expect(rule1.maximum.value).toEqual("=sheetName_!B1");

    const rule2 = cfs[1].rule as IconSetRule;
    expect(cfs[1].ranges).toEqual(["D5:D6"]);
    expect(rule2.lowerInflectionPoint.value).toEqual("=sheetName_!B1");
    expect(rule2.upperInflectionPoint.value).toEqual("=sheetName_!B1");

    const rule3 = cfs[2].rule as ColorScaleRule;
    expect(cfs[2].ranges).toEqual(["=sheetName_!A1:A2"]);
    expect(rule3.minimum.value).toEqual("33");
    expect(rule3.midpoint?.value).toEqual("13");
    expect(rule3.maximum.value).toBeUndefined();
  });

  test("migrate version 7: duplicated sheet Names without forbidden characters", () => {
    const model = new Model({
      version: 7,
      sheets: [
        { name: "My sheet?" },
        { name: "My sheet]" },
        { name: "My sheet[" },
        { name: "?" },
        { name: "*" },
        { name: "__" },
        { name: "[]" },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].name).toBe("My sheet_");
    expect(data.sheets[1].name).toBe("My sheet_1");
    expect(data.sheets[2].name).toBe("My sheet_2");
    expect(data.sheets[3].name).toBe("_");
    expect(data.sheets[4].name).toBe("_1");
    expect(data.sheets[5].name).toBe("__");
    expect(data.sheets[6].name).toBe("__1");
  });

  test("migrate version 9: de-normalize formulas", () => {
    const model = new Model({
      version: 9,
      sheets: [
        {
          cells: {
            A1: { content: "1" },
            A2: { formula: { text: "=|0|+|1|", dependencies: ["A1", "A3"] } },
          },
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].cells.A1!.content).toBe("1");
    expect(data.sheets[0].cells.A2!.content).toBe("=A1+A3");
    expect("formula" in data.sheets[0].cells.A2!).toBe(false);
  });

  test("migrate version 10: normalized cell formats", () => {
    const model = new Model({
      version: 10,
      sheets: [
        {
          id: "1",
          colNumber: 10,
          rowNumber: 10,
          cells: { A1: { content: "1000", format: "#,##0" }, A2: { content: "1000" } },
        },
        {
          id: "2",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "21000", format: "#,##0" },
            A2: { content: "12-31-2020", format: "mm/dd/yyyy" },
          },
        },
      ],
    });
    const data = model.exportData();
    expect(data.formats).toEqual({
      "1": "#,##0",
      "2": "mm/dd/yyyy",
    });
    expect(data.sheets[0].cells["A1"]?.format).toEqual(1);
    expect(data.sheets[0].cells["A2"]?.format).toBeUndefined();
    expect(data.sheets[1].cells["A1"]?.format).toEqual(1);
    expect(data.sheets[1].cells["A2"]?.format).toEqual(2);
  });
});

describe("Import", () => {
  test("Import sheet with rows/cols size defined.", () => {
    const model = new Model({
      sheets: [
        { colNumber: 2, rowNumber: 2, cols: { 0: { size: 42 } }, rows: { 1: { size: 13 } } },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    expect(model.getters.getColSize(sheet, 0)).toBe(42);
    expect(model.getters.getColSize(sheet, 1)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getRowSize(sheet, 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheet, 1)).toBe(13);
  });

  test("Import 2 sheets with merges", () => {
    const model = new Model({
      sheets: [
        { colNumber: 2, rowNumber: 2, merges: ["A2:B2"] },
        { colNumber: 2, rowNumber: 2 },
      ],
    });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    activateSheet(model, sheet2);
    expect(Object.keys(getMerges(model))).toHaveLength(0);
    activateSheet(model, sheet1);
    expect(Object.keys(getMerges(model))).toHaveLength(1);
    expect(Object.values(getMerges(model))[0].topLeft).toEqual(toCartesian("A2"));
  });

  test("can import cell without content", () => {
    const model = new Model({
      sheets: [{ id: "1", cells: { A1: { format: 1 } } }],
      formats: { 1: "0.00%" },
    });
    expect(getCell(model, "A1")?.content).toBe("");
    expect(getCell(model, "A1")?.format).toBe("0.00%");
  });
});

describe("Export", () => {
  test("Can export col size", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    resizeColumns(model, ["B"], 150);
    const exp = model.exportData();
    expect(exp.sheets![0].cols![1].size).toBe(150);
  });

  test("Can export row size", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    resizeRows(model, [1], 150);
    const exp = model.exportData();
    expect(exp.sheets![0].rows![1].size).toBe(150);
  });

  test("Can export merges", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2", "B1:C1", "D1:E2"] }],
    });
    const exp = model.exportData();
    expect(exp.sheets![0].merges).toHaveLength(3);
  });

  test("Can export format", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: { content: "145", format: 1 } } }],
      formats: { 1: "0.00%" },
    });
    const exp = model.exportData();
    expect(exp.sheets![0].cells!.A1!.format).toBe(1);
  });

  test("empty content is not exported", () => {
    const model = new Model();
    setStyle(model, "A1", { fillColor: "#123456" });
    const exp = model.exportData();
    expect(exp.sheets![0].cells!.A1!).toEqual({ style: 1 });
  });

  test("chart figures without a definition are not exported", () => {
    const model = new Model({
      sheets: [
        {
          id: "someuuid",
          figures: [
            {
              id: "otheruuid",
              x: 100,
              y: 100,
              width: 100,
              height: 100,
              tag: "chart",
              data: {
                type: "line",
                title: "demo chart",
                labelRange: "A1:A4",
                dataSets: ["B1:B4", "C1:C4"],
              },
            },
            { id: "id2", x: 100, y: 100, width: 100, height: 100 },
          ],
        },
      ],
    });
    model.dispatch("DELETE_FIGURE", { id: "otheruuid", sheetId: "someuuid" });
    expect(model.exportData()).toMatchObject({
      sheets: [
        {
          id: "someuuid",
          figures: [
            {
              id: "id2",
              x: 100,
              y: 100,
              width: 100,
              height: 100,
            },
          ],
        },
      ],
    });
  });
});

test("complete import, then export", () => {
  const modelData = {
    version: CURRENT_VERSION,
    revisionId: DEFAULT_REVISION_ID,
    sheets: [
      {
        id: "someuuid",
        colNumber: 10,
        rowNumber: 10,
        merges: ["A1:A2"],
        cols: {
          0: { size: 42 },
        },
        rows: {
          1: { size: 13 },
        },
        cells: {
          A1: { content: "hello" },
          B1: {
            content: "=A1",
            style: 1,
            border: 1,
            format: 1,
          },
          C1: { content: "=mqdlskjfqmslfkj(++%//@@@)" },
          D1: { content: '="This is a quote \\""' },
        },
        name: "My sheet",
        conditionalFormats: [],
        figures: [],
        filterTables: [],
        areGridLinesVisible: true,
        isVisible: true,
        panes: { ySplit: 1, xSplit: 5 },
      },
      {
        id: "someuuid_2",
        colNumber: 10,
        rowNumber: 10,
        merges: [],
        cols: {},
        rows: {},
        cells: {
          A1: { content: "hello" },
        },
        name: "My sheet 2",
        conditionalFormats: [],
        figures: [],
        filterTables: [],
        areGridLinesVisible: false,
        isVisible: true,
      },
    ],
    entities: {},
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    },
    formats: {
      1: "0.00%",
    },
    borders: {
      1: {
        top: ["thin", "#000"] as BorderDescr,
      },
    },
    uniqueFigureIds: true,
  };
  const model = new Model(modelData);
  expect(model).toExport(modelData);
  // We test here a that two import with the same data give the same result.
  const model2 = new Model(modelData);
  expect(model2.exportData()).toEqual(modelData);
});

test("can import cells outside sheet size", () => {
  const sheetId = "someuuid";
  const modelData = {
    version: CURRENT_VERSION,
    sheets: [
      {
        id: sheetId,
        colNumber: 10,
        rowNumber: 10,
        cols: {},
        rows: {},
        cells: {
          Z100: { content: "hello" },
        },
      },
    ],
  };
  const model = new Model(modelData);
  expect(model.getters.getNumberRows(sheetId)).toBe(100);
  expect(model.getters.getNumberCols(sheetId)).toBe(26);
  const { col, row } = toCartesian("Z100");

  expect(model.getters.getCell({ sheetId, col, row })?.content).toBe("hello");
});

test("Data of a duplicate sheet are correctly duplicated", () => {
  const model = new Model();
  setCellContent(model, "A1", "hello");
  const sheetId = model.getters.getActiveSheetId();
  model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo: "42" });
  expect(getCellContent(model, "A1", sheetId)).toBe("hello");
  expect(getCellContent(model, "A1", "42")).toBe("hello");
  const data = model.exportData();
  expect(Object.keys(data.sheets[0].cells)).toHaveLength(1);
  expect(Object.keys(data.sheets[1].cells)).toHaveLength(1);
});

test("import then export (figures)", () => {
  const modelData = {
    version: CURRENT_VERSION,
    revisionId: DEFAULT_REVISION_ID,
    sheets: [
      {
        id: "someuuid",
        colNumber: 10,
        rowNumber: 10,
        merges: [],
        cols: {},
        rows: {},
        cells: {},
        name: "My sheet",
        conditionalFormats: [],
        figures: [{ id: "otheruuid", x: 100, y: 100, width: 100, height: 100 }],
        filterTables: [],
        areGridLinesVisible: true,
        isVisible: true,
      },
    ],
    entities: {},
    styles: {},
    formats: {},
    borders: {},
    uniqueFigureIds: true,
  };
  const model = new Model(modelData);
  expect(model).toExport(modelData);
});

test("Can import spreadsheet with only version", () => {
  new Model({ version: 1 });
  // We expect the model to be loaded without traceback
  expect(true).toBeTruthy();
});
