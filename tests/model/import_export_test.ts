import { GridModel, CURRENT_VERSION, BorderDescr } from "../../src/model/index";
import { DEFAULT_STYLE, importData } from "../../src/model/import_export";
import { DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT } from "../../src/constants";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new GridModel();

    // 96 is default cell width
    expect(model.state.cols[0].size).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[1].size).toEqual(DEFAULT_CELL_WIDTH);
  });

  test("get default values in style 0", () => {
    const model = new GridModel();

    expect(model.state.styles[0].fillColor).toEqual(DEFAULT_STYLE.fillColor);
  });

  test("importing data with no version number should fail", () => {
    expect(() => {
      importData({ some: "state" } as any);
    }).toThrow("Missing version number");
  });
});

describe("Import", () => {
  test("Import sheet with rows/cols size defined.", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: {
            0: { size: 42 }
          },
          rows: {
            1: { size: 13 }
          }
        }
      ]
    });
    expect(model.state.cols[0].size).toBe(42);
    expect(model.state.cols[1].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.rows[0].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[1].size).toBe(13);
  });
  test("Import 2 sheets with merges", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2
        },
        {
          colNumber: 2,
          rowNumber: 2
        }
      ]
    });
    model.selectRow(1, false);
    model.merge();
    model.activateSheet(1);
    expect(Object.keys(model.state.merges)).toHaveLength(0);
    model.activateSheet(0);
    expect(Object.keys(model.state.merges)).toHaveLength(1);
    expect(Object.values(model.state.merges)[0].topLeft).toBe("A2");
  });
});

describe("Export", () => {
  test("Can export col size", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.setColSize(1, 150);
    const exp = model.exportData();
    expect(exp.sheets![0].cols![1].size).toBe(150);
  });
  test("Can export row size", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.setRowSize(1, 150);
    const exp = model.exportData();
    expect(exp.sheets![0].rows![1].size).toBe(150);
  });
  test("Can export merges", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:A2", "B1:C1", "D1:E2"]
        }
      ]
    });
    const exp = model.exportData();
    expect(exp.sheets![0].merges).toHaveLength(3);
  });
});

describe("complete import, then export", () => {
  const modelData = {
    version: CURRENT_VERSION,
    sheets: [
      {
        colNumber: 10,
        rowNumber: 10,
        merges: ["A1:A2", "B1:C1"],
        cols: {
          0: { size: 42 }
        },
        rows: {
          1: { size: 13 }
        },
        cells: {
          A1: { content: "hello" },
          B1: { content: "=a1", style: 99, border: 8 },
          C1: { content: "=mqdlskjfqmslfkj(++%//@@@)" }
        },
        name: "My sheet"
      }
    ],
    objects: {},
    styles: {
      99: { bold: true, textColor: "#3A3791", fontSize: 12 }
    },
    borders: {
      8: {
        top: ["thin", "#000"] as BorderDescr
      }
    }
  };
  const model = new GridModel();
  model.load(modelData);
  expect(model.exportData()).toEqual(modelData);
});
