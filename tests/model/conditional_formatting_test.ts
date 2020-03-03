import { GridModel, ConditionalFormat, Style } from "../../src/model";
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
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "3");
    model.setValue("A4", "4");
    model.addConditionalFormat(createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }));
    model.addConditionalFormat(createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" }));
    expect(model.state.activeSheet.conditionalFormats).toEqual([
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
    expect(model.state.cells["A1"].conditionalStyle).toBeUndefined();
    expect(model.state.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.state.cells["A3"].conditionalStyle).toBeUndefined();
    expect(model.state.cells["A4"].conditionalStyle).toEqual({ fillColor: "#0000FF" });
  });
  test("works on multiple ranges", () => {
    model.setValue("A1", "1");
    model.setValue("A2", "1");
    model.addConditionalFormat(createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }));
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.state.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });
  test("can be undo/redo", () => {
    model.setValue("A1", "1");
    model.setValue("A2", "1");
    model.addConditionalFormat(createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }));
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    expect(model.state.cells["A2"].conditionalStyle).toEqual({ fillColor: "#FF0000" });

    model.undo();

    expect(model.state.cells["A1"].conditionalStyle).toBeUndefined();
    expect(model.state.cells["A2"].conditionalStyle).toBeUndefined();
  });
  test("is saved/restored", () => {
    model.addConditionalFormat(createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }));
    const workbookData = model.exportData();
    const newModel = new GridModel(workbookData);
    expect(newModel.state.activeSheet.conditionalFormats).toBe(
      model.state.activeSheet.conditionalFormats
    );
  });
  test("works after value update", () => {
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#FF0000" }));
    expect(model.state.cells["A1"].conditionalStyle).toBeUndefined();
    model.setValue("A1", "2");
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
    model.setValue("A1", "1");
    expect(model.state.cells["A1"].conditionalStyle).toBeUndefined();
    model.setValue("A1", "=A2");
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });
  test.skip("works when cells are in error", () => {
    model.setValue("A1", "=BLA");
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#FF0000" }));
    expect(model.state.cells["A1"].conditionalStyle).toBeUndefined();
  });
  test("multiple conditional formats for one cell", () => {
    model.setValue("A1", "2");
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#FF0000" }));
    model.addConditionalFormat(createEqualCF(["A1"], "2", { textColor: "#445566" }));
    expect(model.state.cells["A1"].conditionalStyle).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566"
    });
  });
  test("multiple conditional formats with same style", () => {
    model.setValue("A1", "2");
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#FF0000" }));
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#FF0000" }));
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
  });
  test.skip("multiple conditional formats using stopIfTrue flag", () => {
    model.setValue("A1", "2");

    model.addConditionalFormat({
      ranges: ["A1"],
      formatRule: {
        type: { values: ["2"], operator: "Equal", kind: "CellIsRule" },
        stopIfTrue: true
      },
      style: { fillColor: "#FF0000" }
    });
    model.addConditionalFormat(createEqualCF(["A1"], "2", { fillColor: "#445566" }));
    expect(model.state.cells["A1"].conditionalStyle).toEqual({ fillColor: "#FF0000" });
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
