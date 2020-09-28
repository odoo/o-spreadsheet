import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { BorderDescr } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import { CURRENT_VERSION } from "../../src/data";
import { getMerges, mockUuidV4To } from "../helpers";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheet();
    // 96 is default cell width
    expect(model.getters.getCol(sheet, 0).size).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.getters.getCol(sheet, 1).size).toEqual(DEFAULT_CELL_WIDTH);
  });
});

describe("Migrations", () => {
  test("Can upgrade from 1 to 5", () => {
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
          name: "My sheet",
          conditionalFormats: [],
        },
      ],
    });
    const data = model.exportData();
    expect(data.activeSheet).toBe("My sheet");
    expect(data.version).toBe(5);
    expect(data.sheets[0].id).toBeDefined();
    expect(data.sheets[0].figures).toBeDefined();
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
    const sheet = model.getters.getActiveSheet();
    expect(model.getters.getCol(sheet, 0).size).toBe(42);
    expect(model.getters.getCol(sheet, 1).size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getRow(sheet, 0).size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRow(sheet, 1).size).toBe(13);
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
      sheet: sheet1,
      zone: { left: 0, top: 1, right: 5, bottom: 1 },
    });
    model.dispatch("ACTIVATE_SHEET", { from: sheet1, to: sheet2 });
    expect(Object.keys(getMerges(model))).toHaveLength(0);
    model.dispatch("ACTIVATE_SHEET", { from: sheet2, to: sheet1 });
    expect(Object.keys(getMerges(model))).toHaveLength(1);
    expect(Object.values(getMerges(model))[0].topLeft).toBe("A2");
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
      sheet: model.getters.getActiveSheet(),
      cols: [1],
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
      sheet: model.getters.getActiveSheet(),
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
    expect(exp.sheets![0].cells!.A1.format).toBe("0.00%");
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
        merges: ["A1:A2", "B1:C1"],
        cols: {
          0: { size: 42 },
        },
        rows: {
          1: { size: 13 },
        },
        cells: {
          A1: { content: "hello" },
          B1: { content: "=a1", style: 99, border: 8, format: "0.00%" },
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
    activeSheet: "someuuid_2",
    entities: {},
    styles: {
      99: { bold: true, textColor: "#3A3791", fontSize: 12 },
    },
    borders: {
      8: {
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
    activeSheet: "someuuid",
    entities: {},
    styles: {},
    borders: {},
  };
  const model = new Model(modelData);
  expect(model.exportData()).toEqual(modelData);
});
