import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { importData } from "../../src/model/import_export";
import { BorderDescr, GridModel } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new GridModel();

    // 96 is default cell width
    expect(model.state.cols[0].size).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[1].size).toEqual(DEFAULT_CELL_WIDTH);
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
    model.dispatch({ type: "SELECT_ROW", index: 1 });
    model.dispatch({
      type: "ADD_MERGE",
      sheet: "Sheet1",
      zone: { left: 0, top: 1, right: 5, bottom: 1 }
    });
    model.dispatch({ type: "ACTIVATE_SHEET", sheet: "Sheet2" });
    expect(Object.keys(model.state.merges)).toHaveLength(0);
    model.dispatch({ type: "ACTIVATE_SHEET", sheet: "Sheet1" });
    expect(Object.keys(model.state.merges)).toHaveLength(1);
    expect(Object.values(model.state.merges)[0].topLeft).toBe("A2");
  });
});

describe("Export", () => {
  test("Can export col size", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({
      type: "RESIZE_COLUMNS",
      sheet: "Sheet1",
      cols: [1],
      size: 150
    });
    const exp = model.exportData();
    expect(exp.sheets![0].cols![1].size).toBe(150);
  });

  test("Can export row size", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({
      type: "RESIZE_ROWS",
      sheet: "Sheet1",
      rows: [1],
      size: 150
    });
    const exp = model.exportData();
    expect(exp.sheets![0].rows![1].size).toBe(150);
  });

  test("Can export merges", () => {
    const model = new GridModel({
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

  test("Can export format", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "145", format: "0.00%" }
          }
        }
      ]
    });
    const exp = model.exportData();
    expect(exp.sheets![0].cells!.A1.format).toBe("0.00%");
  });
});

describe("complete import, then export", () => {
  const modelData = {
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
          B1: { content: "=a1", style: 99, border: 8, format: "0.00%" },
          C1: { content: "=mqdlskjfqmslfkj(++%//@@@)" }
        },
        name: "My sheet",
        conditionalFormats: []
      }
    ],
    entities: {},
    styles: {
      99: { bold: true, textColor: "#3A3791", fontSize: 12 }
    },
    borders: {
      8: {
        top: ["thin", "#000"] as BorderDescr
      }
    }
  };
  const model = new GridModel(modelData);
  expect(model.exportData()).toEqual(modelData);
});
