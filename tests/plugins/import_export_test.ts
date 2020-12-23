import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { CURRENT_VERSION } from "../../src/data";
import { Model } from "../../src/model";
import { BorderDescr } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import { getMerges, mockUuidV4To, toPosition } from "../helpers";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    // 96 is default cell width
    expect(model.getters.getCol(sheet, 0)!.size).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.getters.getCol(sheet, 1)!.size).toEqual(DEFAULT_CELL_WIDTH);
  });
});

describe("Migrations", () => {
  test("Can upgrade from 1 to 7", () => {
    mockUuidV4To(333);
    const model = new Model({
      version: 1,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: {
            0: { size: 42 },
          },
          rows: {
            0: { size: 12 },
          },
          cells: { A1: { content: "=a1" } },
          name: "My sheet",
          conditionalFormats: [],
        },
      ],
    });
    const data = model.exportData();
    expect(data.version).toBe(7);
    expect(data.sheets[0].id).toBeDefined();
    expect(data.sheets[0].figures).toBeDefined();
    expect(data.sheets[0].cells.A1!.formula).toBeDefined();
    expect(data.sheets[0].cells.A1!.formula!.text).toBeDefined();
    expect(data.sheets[0].cells.A1!.formula!.dependencies).toBeDefined();
  });
  test("migration 6 to 7: charts", () => {
    mockUuidV4To(333);
    const model = new Model({
      version: 6,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: {
            0: { size: 42 },
          },
          rows: {
            0: { size: 12 },
          },
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
    });
    expect(data.sheets[0].figures[1].data).toEqual({
      type: "bar",
      title: "demo chart 2",
      labelRange: "'My sheet'!A27:A35",
      dataSets: ["B27:B35", "C27:C35"],
      dataSetsHaveTitle: false,
    });
    expect(data.sheets[0].figures[2].data).toEqual({
      type: "bar",
      title: "demo chart 3",
      labelRange: "'My sheet'!A27",
      dataSets: ["B26:B27"],
      dataSetsHaveTitle: true,
    });
    expect(data.sheets[0].figures[3].data).toEqual({
      type: "bar",
      title: "demo chart 4",
      labelRange: "'My sheet'!A27",
      dataSets: ["B27"],
      dataSetsHaveTitle: false,
    });
  });
});

describe("Import", () => {
  test("Import sheet with rows/cols size defined.", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: {
            0: { size: 42 },
          },
          rows: {
            1: { size: 13 },
          },
        },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    expect(model.getters.getCol(sheet, 0)!.size).toBe(42);
    expect(model.getters.getCol(sheet, 1)!.size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getRow(sheet, 0)!.size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRow(sheet, 1)!.size).toBe(13);
  });

  test("Import 2 sheets with merges", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
        },
        {
          colNumber: 2,
          rowNumber: 2,
        },
      ],
    });
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    model.dispatch("SELECT_ROW", { index: 1 });
    model.dispatch("ADD_MERGE", {
      sheetId: sheet1,
      zone: { left: 0, top: 1, right: 5, bottom: 1 },
    });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet1, sheetIdTo: sheet2 });
    expect(Object.keys(getMerges(model))).toHaveLength(0);
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(Object.keys(getMerges(model))).toHaveLength(1);
    expect(Object.values(getMerges(model))[0].topLeft).toEqual(toPosition("A2"));
  });
});

describe("Export", () => {
  test("Can export col size", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("RESIZE_COLUMNS", {
      sheetId: model.getters.getActiveSheetId(),
      columns: [1],
      size: 150,
    });
    const exp = model.exportData();
    expect(exp.sheets![0].cols![1].size).toBe(150);
  });

  test("Can export row size", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("RESIZE_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      rows: [1],
      size: 150,
    });
    const exp = model.exportData();
    expect(exp.sheets![0].rows![1].size).toBe(150);
  });

  test("Can export merges", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:A2", "B1:C1", "D1:E2"],
        },
      ],
    });
    const exp = model.exportData();
    expect(exp.sheets![0].merges).toHaveLength(3);
  });

  test("Can export format", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "145", format: "0.00%" },
          },
        },
      ],
    });
    const exp = model.exportData();
    expect(exp.sheets![0].cells!.A1!.format).toBe("0.00%");
  });
});

test("complete import, then export", () => {
  const modelData = {
    version: CURRENT_VERSION,
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
            formula: { text: "=|0|", dependencies: ["A1"] },
            style: 1,
            border: 1,
            format: "0.00%",
          },
          C1: { content: "=mqdlskjfqmslfkj(++%//@@@)" },
        },
        name: "My sheet",
        conditionalFormats: [],
        figures: [],
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
      },
    ],
    entities: {},
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    },
    borders: {
      1: {
        top: ["thin", "#000"] as BorderDescr,
      },
    },
  };
  const model = new Model(modelData);
  expect(model.exportData()).toEqual(modelData);
  // We test here a that two import with the same data give the same result.
  const model2 = new Model(modelData);
  expect(model2.exportData()).toEqual(modelData);
});

test("import then export (figures)", () => {
  const modelData = {
    version: CURRENT_VERSION,
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
      },
    ],
    entities: {},
    styles: {},
    borders: {},
  };
  const model = new Model(modelData);
  expect(model.exportData()).toEqual(modelData);
});
