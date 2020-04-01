import { GridModel } from "../../src/model";
import { ConditionalFormat, Style } from "../../src/types/index";
import "../canvas.mock";

let model: GridModel;

function createEqualCF(ranges: string[], value: string, style: Style): ConditionalFormat {
  return {
    ranges,
    formatRule: { type: { values: [value], operator: "Equal", kind: "CellIsRule" } },
    style
  };
}

beforeEach(() => {
  model = new GridModel();
});

describe("conditional format", () => {
  test("works", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "3" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "4" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" })
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" })
    });
    expect(model.workbook.activeSheet.conditionalFormats).toEqual([
      {
        formatRule: {
          type: {
            values: ["2"],
            operator: "Equal",
            kind: "CellIsRule"
          }
        },
        ranges: ["A1:A4"],
        style: {
          fillColor: "#FF0000"
        }
      },
      {
        formatRule: {
          type: {
            values: ["4"],
            operator: "Equal",
            kind: "CellIsRule"
          }
        },
        ranges: ["A1:A4"],
        style: {
          fillColor: "#0000FF"
        }
      }
    ]);
    expect(model.workbook.cells["A1"].conditionalStyle).toBeUndefined();
    expect(model.workbook.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.workbook.cells["A3"].conditionalStyle).toBeUndefined();
    expect(model.workbook.cells["A4"].conditionalStyle).toEqual({ fillColor: "#0000FF" });
  });

  test("works on multiple ranges", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "1" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.workbook.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });

  test("can be undo/redo", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "1" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.workbook.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });

    model.dispatch({ type: "UNDO" });

    expect(model.workbook.cells["A1"].conditionalStyle).toBeUndefined();
    expect(model.workbook.cells["A2"].conditionalStyle).toBeUndefined();
  });

  test("is saved/restored", () => {
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" })
    });
    const workbookData = model.exportData();
    const newModel = new GridModel(workbookData);
    expect(newModel.workbook.activeSheet.conditionalFormats).toBe(
      model.workbook.activeSheet.conditionalFormats
    );
  });

  test("works after value update", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toBeUndefined();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    expect(model.workbook.cells["A1"].conditionalStyle).toBeUndefined();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=A2" });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });

  test.skip("works when cells are in error", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=BLA" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toBeUndefined();
  });

  test("multiple conditional formats for one cell", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" })
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { textColor: "#445566" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566"
    });
  });

  test("multiple conditional formats with same style", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" })
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });

  test.skip("multiple conditional formats using stopIfTrue flag", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });

    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: {
        ranges: ["A1"],
        formatRule: {
          type: { values: ["2"], operator: "Equal", kind: "CellIsRule" },
          stopIfTrue: true
        },
        style: { fillColor: "#FF0000" }
      }
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#445566" })
    });
    expect(model.workbook.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });

  test.skip("Set conditionalFormat on empty cell", () => {});
});

describe("conditional formats types", () => {
  describe("CellIs condition", () => {
    test.skip("Operator BeginsWith", () => {});
    test.skip("Operator Between", () => {});
    test.skip("Operator ContainsText", () => {});
    test.skip("Operator EndsWith", () => {});
    test.skip("Operator GreaterThan", () => {});
    test.skip("Operator GreaterThanOrEqual", () => {});
    test.skip("Operator LessThan", () => {});
    test.skip("Operator LessThanOrEqual", () => {});
    test.skip("Operator NotBetween", () => {});
    test.skip("Operator NotContains", () => {});
    test.skip("Operator NotEqual", () => {});
  });
  describe("color scale", () => {});
  describe("icon scale", () => {});
});
