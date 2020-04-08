import { Model } from "../../src/model";
import { ColorScaleThreshold, ConditionalFormat, Style } from "../../src/types";
import "../canvas.mock";
import { setInputValueAndTrigger, triggerMouseEvent } from "../dom_helper";
import { GridParent, makeTestFixture, mockUuidV4To, nextTick } from "../helpers";

let model: Model;

function createEqualCF(
  ranges: string[],
  value: string,
  style: Style,
  id: string
): ConditionalFormat {
  return {
    ranges,
    id,
    rule: { values: [value], operator: "Equal", type: "CellIsRule", style }
  };
}

function createColorScale(
  id: string,
  ranges: string[],
  min: ColorScaleThreshold,
  max: ColorScaleThreshold,
  mid?: ColorScaleThreshold
): ConditionalFormat {
  return {
    ranges,
    id,
    rule: { type: "ColorScaleRule", minimum: min, maximum: max, midpoint: mid }
  };
}

beforeEach(() => {
  model = new Model();
});

describe("conditional format", () => {
  test("works", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "3" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "4" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }, "1")
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" }, "2")
    });
    expect(model.getters.getConditionalFormats()).toEqual([
      {
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000"
          }
        },
        id: "1",
        ranges: ["A1:A4"]
      },
      {
        rule: {
          values: ["4"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF"
          }
        },
        id: "2",
        ranges: ["A1:A4"]
      }
    ]);
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A3")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#0000FF" });
  });

  test("works on multiple ranges", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "1" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
  });

  test("can be undo/redo", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "1" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });

    model.dispatch({ type: "UNDO" });

    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();

    model.dispatch({ type: "REDO" });

    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
  });

  test("is saved/restored", () => {
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }, "1")
    });
    const workbookData = model.exportData();
    const newModel = new Model(workbookData);
    expect(newModel.getters.getConditionalFormats()).toBe(model.getters.getConditionalFormats());
  });

  test("works after value update", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1")
    });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=A2" });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test("works when cells are in error", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1")
    });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=BLA" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
  });

  test("multiple conditional formats for one cell", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1")
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { textColor: "#445566" }, "2")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566"
    });
  });

  test("multiple conditional formats with same style", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1")
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "2")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test.skip("multiple conditional formats using stopIfTrue flag", () => {
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "2" });

    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: {
        ranges: ["A1"],
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: { fillColor: "#FF0000" }
        },
        id: "1",
        stopIfTrue: true
      }
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "2", { fillColor: "#445566" }, "2")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test("Set conditionalFormat on empty cell", () => {
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1"], "", { fillColor: "#FF0000" }, "1")
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  describe("Grid Manipulation", () => {
    const rule = {
      values: ["42"],
      operator: "Equal",
      type: "CellIsRule",
      style: { fillColor: "orange" }
    };
    test("On row deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            cells: {
              C3: { content: "42" }
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A1"], rule },
              { id: "2", ranges: ["B2:B2"], rule },
              { id: "3", ranges: ["C3:C3"], rule },
              { id: "4", ranges: ["D1:D2"], rule },
              { id: "5", ranges: ["E2:E3"], rule },
              { id: "6", ranges: ["F1:F3"], rule },
              { id: "7", ranges: ["G1:G4"], rule }
            ]
          }
        ]
      });
      model.dispatch({
        type: "REMOVE_ROWS",
        sheet: model.state.activeSheet,
        rows: [1, 3]
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A1"], rule },
        { id: "3", ranges: ["C2:C2"], rule },
        { id: "4", ranges: ["D1:D1"], rule },
        { id: "5", ranges: ["E2:E2"], rule },
        { id: "6", ranges: ["F1:F2"], rule },
        { id: "7", ranges: ["G1:G2"], rule }
      ]);
      expect(model.getters.getConditionalStyle("B2")).toBeUndefined();
      expect(model.getters.getConditionalStyle("C2")!.fillColor).toBe("orange");
      expect(model.getters.getConditionalStyle("C3")).toBeUndefined();
    });
    test("On column deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 7,
            cells: {
              C3: { content: "42" }
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A1"], rule },
              { id: "2", ranges: ["B2:B2"], rule },
              { id: "3", ranges: ["C3:C3"], rule },
              { id: "4", ranges: ["A4:B4"], rule },
              { id: "5", ranges: ["B5:C5"], rule },
              { id: "6", ranges: ["A6:C6"], rule },
              { id: "7", ranges: ["A7:D7"], rule }
            ]
          }
        ]
      });
      model.dispatch({
        type: "REMOVE_COLUMNS",
        sheet: model.state.activeSheet,
        columns: [1, 3]
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A1"], rule },
        { id: "3", ranges: ["B3:B3"], rule },
        { id: "4", ranges: ["A4:A4"], rule },
        { id: "5", ranges: ["B5:B5"], rule },
        { id: "6", ranges: ["A6:B6"], rule },
        { id: "7", ranges: ["A7:B7"], rule }
      ]);
      expect(model.getters.getConditionalStyle("B2")).toBeUndefined();
      expect(model.getters.getConditionalStyle("B3")!.fillColor).toBe("orange");
      expect(model.getters.getConditionalStyle("C3")).toBeUndefined();
    });
    test("On column addition", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 4,
            cells: {
              B4: { content: "42" }
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:C1"], rule },
              { id: "2", ranges: ["A2:B2"], rule },
              { id: "3", ranges: ["B3:C3"], rule },
              { id: "4", ranges: ["B4:B4"], rule }
            ]
          }
        ]
      });
      model.dispatch({
        type: "ADD_COLUMNS",
        sheet: model.state.activeSheet,
        column: 1,
        position: "before",
        quantity: 1
      });
      model.dispatch({
        type: "ADD_COLUMNS",
        sheet: model.state.activeSheet,
        column: 2,
        position: "after",
        quantity: 2
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:F1"], rule },
        { id: "2", ranges: ["A2:C2"], rule },
        { id: "3", ranges: ["C3:F3"], rule },
        { id: "4", ranges: ["C4:C4"], rule }
      ]);
      expect(model.getters.getConditionalStyle("B4")).toBeUndefined();
      expect(model.getters.getConditionalStyle("C4")!.fillColor).toBe("orange");
    });
    test("On row addition", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 3,
            cells: {
              D2: { content: "42" }
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A3"], rule },
              { id: "2", ranges: ["B1:B2"], rule },
              { id: "3", ranges: ["C2:C3"], rule },
              { id: "4", ranges: ["D2:D2"], rule }
            ]
          }
        ]
      });
      model.dispatch({
        type: "ADD_ROWS",
        sheet: model.state.activeSheet,
        row: 1,
        position: "before",
        quantity: 1
      });
      model.dispatch({
        type: "ADD_ROWS",
        sheet: model.state.activeSheet,
        row: 2,
        position: "after",
        quantity: 2
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A6"], rule },
        { id: "2", ranges: ["B1:B3"], rule },
        { id: "3", ranges: ["C3:C6"], rule },
        { id: "4", ranges: ["D3:D3"], rule }
      ]);
      expect(model.getters.getConditionalStyle("D2")).toBeUndefined();
      expect(model.getters.getConditionalStyle("D3")!.fillColor).toBe("orange");
    });
  });
});

describe("conditional formats types", () => {
  describe("CellIs condition", () => {
    test("Operator BeginsWith", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "BeginsWith",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "aaa" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "qsdfmlkqjsdf" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator Between", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "Between",
            values: ["1", "3"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "0" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1.5" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "3" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "3.5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    });

    test("Operator ContainsText", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "ContainsText",
            values: ["abc"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });
      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "helabclo" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator EndsWith", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "EndsWith",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "helloqsdf" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThan", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "GreaterThan",
            values: ["12"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });
      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "12" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "13" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThanOrEqual", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "GreaterThanOrEqual",
            values: ["12"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "12" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "13" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator LessThan", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "LessThan",
            values: ["10"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "11" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "9" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator LessThanOrEqual", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "LessThanOrEqual",
            values: ["10"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "11" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "9" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotBetween", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotBetween",
            values: ["5", "10"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "4" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "0" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "10.1" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotContains", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotContains",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hellqsdfo" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotEqual", () => {
      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotEqual",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" }
          },
          ranges: ["A1"],
          id: "11"
        }
      });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hellqsdfo" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "qsdf" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    });
  });

  describe("color scale", () => {
    test("2 points, value scale", () => {
      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "10" });
      model.dispatch({ type: "SET_VALUE", xc: "A2", text: "11" });
      model.dispatch({ type: "SET_VALUE", xc: "A3", text: "17" });
      model.dispatch({ type: "SET_VALUE", xc: "A4", text: "19" });
      model.dispatch({ type: "SET_VALUE", xc: "A5", text: "20" });

      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        )
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff00ff" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#e705ee" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#592489" });
      expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#2a2f67" });
      expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#123456" });
    });

    test("2 points, value scale with other min and max", () => {
      model.dispatch({ type: "SET_VALUE", xc: "A1", text: "100" });
      model.dispatch({ type: "SET_VALUE", xc: "A2", text: "110" });
      model.dispatch({ type: "SET_VALUE", xc: "A3", text: "170" });
      model.dispatch({ type: "SET_VALUE", xc: "A4", text: "190" });
      model.dispatch({ type: "SET_VALUE", xc: "A5", text: "200" });

      model.dispatch({
        type: "ADD_CONDITIONAL_FORMAT",
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        )
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff00ff" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#e705ee" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#592489" });
      expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#2a2f67" });
      expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#123456" });
    });
  });
  describe("icon scale", () => {});
});

describe("UI of conditional formats", () => {
  let fixture: HTMLElement;
  let parent: any;

  beforeEach(async () => {
    fixture = makeTestFixture();
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:A2"], "2", { fillColor: "#FF0000" }, "1")
    });
    model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createColorScale(
        "2",
        ["B1:B5"],
        { type: "value", color: 0xff00ff },
        { type: "value", color: 0x123456 }
      )
    });
    parent = new GridParent(model);
    await parent.mount(fixture);

    parent.env.spreadsheet.openSidePanel("ConditionalFormatting");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });

  const selectors = {
    listPreview: ".o-cf .o-cf-preview",
    rangeInput: ".o-cf-ruleEditor .o-range",
    cellIsEditor: {
      operatorInput: ".o-cf-ruleEditor .o-cell-is-operator",
      value1Input: ".o-cf-ruleEditor .o-cell-is-value",
      bold: "div.o-tool[title='Bold']",
      italic: "div.o-tool[title='Italic']",
      strikethrough: "div.o-tool[title='Strikethrough']",
      colorDropdown: ".o-tool o-dropdown .o-with-color"
    },
    colorScaleEditor: {
      minColor: ".o-threshold-minimum .o-tool.o-dropdown.o-with-color span",
      minType: ".o-threshold-minimum > select",
      minValue: ".o-threshold-minimum .o-threshold-value",
      maxColor: ".o-threshold-maximum .o-tool.o-dropdown.o-with-color span",
      maxType: ".o-threshold-maximum > select",
      maxValue: ".o-threshold-maximum .o-threshold-value",
      colorPickerBlue: ".o-dropdown-content div[data-color='#445569']",
      colorPickerYellow: ".o-dropdown-content div[data-color='#ffc001']"
    },
    radioColorScale: "input[value=ColorScaleRule]",
    buttonSave: ".o-cf-buttons .o-cf-save",
    buttonAdd: ".o-cf-add"
  };

  test("simple snapshot", () => {
    expect(fixture.querySelector(".o-sidePanel")!).toMatchSnapshot();
  });

  test("the list of CF has a correct preview", () => {
    // check the html of the list (especially the colors)
    let previews = document.querySelectorAll(selectors.listPreview);
    expect(previews).toHaveLength(2);

    // --> should be the style for CellIsRule
    expect(previews[0].textContent).toBe("A1:A2");
    expect(window.getComputedStyle(previews[0]).backgroundColor).toBe("rgb(255, 0, 0)");

    // --> should be a nothing of color gradient for ColorScaleRule
    expect(previews[1].textContent).toBe("B1:B5");
    expect(window.getComputedStyle(previews[1]).backgroundColor).toBe("");
    // TODO VSC: see how we can test the gradient background image
  });

  test("can edit an existing CellIsRule", async () => {
    model.dispatch = jest.fn(command => "COMPLETED");

    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.rangeInput, "A1:A3", "input");
    setInputValueAndTrigger(selectors.cellIsEditor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.cellIsEditor.value1Input, "3", "input");

    triggerMouseEvent(selectors.cellIsEditor.bold, "click");
    triggerMouseEvent(selectors.cellIsEditor.italic, "click");
    triggerMouseEvent(selectors.cellIsEditor.strikethrough, "click");

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.dispatch).toHaveBeenCalledWith({
      cf: {
        id: "1",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""]
        }
      },
      type: "ADD_CONDITIONAL_FORMAT"
    });
  });

  test("can edit an existing ColorScaleRule", async () => {
    model.dispatch = jest.fn(command => "COMPLETED");

    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[1], "click");
    await nextTick();
    // change every value
    setInputValueAndTrigger(selectors.rangeInput, "B2:B5", "input");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentage", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.dispatch).toHaveBeenCalledWith({
      cf: {
        id: "2",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffc001,
            type: "percentage"
          },
          midpoint: undefined,
          minimum: {
            color: 0x445569,
            type: "number",
            value: "33"
          },
          type: "ColorScaleRule"
        }
      },
      type: "ADD_CONDITIONAL_FORMAT"
    });
  });

  test("can create a new CellIsRule", async () => {
    model.dispatch = jest.fn(command => "COMPLETED");
    mockUuidV4To("42");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.rangeInput, "A1:A3", "input");
    setInputValueAndTrigger(selectors.cellIsEditor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.cellIsEditor.value1Input, "3", "input");

    triggerMouseEvent(selectors.cellIsEditor.bold, "click");
    triggerMouseEvent(selectors.cellIsEditor.italic, "click");
    triggerMouseEvent(selectors.cellIsEditor.strikethrough, "click");

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.dispatch).toHaveBeenCalledWith({
      cf: {
        id: "42",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""]
        }
      },
      type: "ADD_CONDITIONAL_FORMAT"
    });
  });

  test("can create a new ColorScaleRule", async () => {
    model.dispatch = jest.fn(command => "COMPLETED");
    mockUuidV4To("43");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(selectors.radioColorScale, "click");
    document
      .querySelector(selectors.radioColorScale)!
      .dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.rangeInput, "B2:B5", "input");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentage", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.dispatch).toHaveBeenCalledWith({
      cf: {
        id: "43",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffc001,
            type: "percentage"
          },
          midpoint: undefined,
          minimum: {
            color: 0x445569,
            type: "number",
            value: "33"
          },
          type: "ColorScaleRule"
        }
      },
      type: "ADD_CONDITIONAL_FORMAT"
    });
  });
  test("switching sheet changes the content of CF and cancels the edition", async () => {});
});
