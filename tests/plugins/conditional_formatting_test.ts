import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import "../canvas.mock";
import { setInputValueAndTrigger, triggerMouseEvent } from "../dom_helper";
import {
  GridParent,
  makeTestFixture,
  mockUuidV4To,
  nextTick,
  target,
  createEqualCF,
  createColorScale,
} from "../helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

beforeEach(() => {
  model = new Model();
});

describe("conditional format", () => {
  test("works", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "3" });
    model.dispatch("SET_VALUE", { xc: "A4", text: "4" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" }, "2"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalFormats()).toEqual([
      {
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
        id: "1",
        ranges: ["A1:A4"],
      },
      {
        rule: {
          values: ["4"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "2",
        ranges: ["A1:A4"],
      },
    ]);
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A3")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#0000FF" });
  });

  test("Add conditional formating on inactive sheet", () => {
    model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const [activeSheet, sheet] = model.getters.getSheets();
    expect(sheet.id).not.toBe(model.getters.getActiveSheetId());
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" }, "2"),
      sheetId: sheet.id,
    });
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: activeSheet.id,
      sheetIdTo: "42",
    });
    expect(model.getters.getConditionalFormats()).toEqual([
      {
        rule: {
          values: ["4"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "2",
        ranges: ["A1:A4"],
      },
    ]);
  });

  test("remove a conditional format rule", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "3" });
    model.dispatch("SET_VALUE", { xc: "A4", text: "4" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "4", { fillColor: "#0000FF" }, "2"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalFormats()).toEqual([
      {
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
        id: "1",
        ranges: ["A1:A4"],
      },
      {
        rule: {
          values: ["4"],
          operator: "Equal",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "2",
        ranges: ["A1:A4"],
      },
    ]);
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A3")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#0000FF" });
    model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: "2",
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A3")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A4")).toBeUndefined();
  });

  test("works on multiple ranges", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
  });

  test("can be undo/redo", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });

    model.dispatch("UNDO");

    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();

    model.dispatch("REDO");

    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
  });

  test("is saved/restored", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A4"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    const workbookData = model.exportData();
    const newModel = new Model(workbookData);
    expect(newModel.getters.getConditionalFormats()).toBe(model.getters.getConditionalFormats());
  });

  test("works after value update", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A2" });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test("works when cells are in error", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=BLA" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
  });

  test("multiple conditional formats for one cell", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { textColor: "#445566" }, "2"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566",
    });
  });

  test("multiple conditional formats with same style", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#FF0000" }, "2"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test.skip("multiple conditional formats using stopIfTrue flag", () => {
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        ranges: ["A1"],
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: { fillColor: "#FF0000" },
        },
        id: "1",
        stopIfTrue: true,
      },
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "2", { fillColor: "#445566" }, "2"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  test("Set conditionalFormat on empty cell", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1"], "", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
  });

  describe("Grid Manipulation", () => {
    const rule = {
      values: ["42"],
      operator: "Equal",
      type: "CellIsRule",
      style: { fillColor: "orange" },
    };
    test("On row deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            cells: {
              C3: { content: "42" },
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A1"], rule },
              { id: "2", ranges: ["B2:B2"], rule },
              { id: "3", ranges: ["C3:C3"], rule },
              { id: "4", ranges: ["D1:D2"], rule },
              { id: "5", ranges: ["E2:E3"], rule },
              { id: "6", ranges: ["F1:F3"], rule },
              { id: "7", ranges: ["G1:G4"], rule },
            ],
          },
        ],
      });
      model.dispatch("REMOVE_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        rows: [1, 3],
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A1"], rule },
        { id: "3", ranges: ["C2:C2"], rule },
        { id: "4", ranges: ["D1:D1"], rule },
        { id: "5", ranges: ["E2:E2"], rule },
        { id: "6", ranges: ["F1:F2"], rule },
        { id: "7", ranges: ["G1:G2"], rule },
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
              C3: { content: "42" },
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A1"], rule },
              { id: "2", ranges: ["B2:B2"], rule },
              { id: "3", ranges: ["C3:C3"], rule },
              { id: "4", ranges: ["A4:B4"], rule },
              { id: "5", ranges: ["B5:C5"], rule },
              { id: "6", ranges: ["A6:C6"], rule },
              { id: "7", ranges: ["A7:D7"], rule },
            ],
          },
        ],
      });
      model.dispatch("REMOVE_COLUMNS", {
        sheetId: model.getters.getActiveSheetId(),
        columns: [1, 3],
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A1"], rule },
        { id: "3", ranges: ["B3:B3"], rule },
        { id: "4", ranges: ["A4:A4"], rule },
        { id: "5", ranges: ["B5:B5"], rule },
        { id: "6", ranges: ["A6:B6"], rule },
        { id: "7", ranges: ["A7:B7"], rule },
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
              B4: { content: "42" },
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:C1"], rule },
              { id: "2", ranges: ["A2:B2"], rule },
              { id: "3", ranges: ["B3:C3"], rule },
              { id: "4", ranges: ["B4:B4"], rule },
            ],
          },
        ],
      });
      model.dispatch("ADD_COLUMNS", {
        sheetId: model.getters.getActiveSheetId(),
        column: 1,
        position: "before",
        quantity: 1,
      });
      model.dispatch("ADD_COLUMNS", {
        sheetId: model.getters.getActiveSheetId(),
        column: 2,
        position: "after",
        quantity: 2,
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:F1"], rule },
        { id: "2", ranges: ["A2:C2"], rule },
        { id: "3", ranges: ["C3:F3"], rule },
        { id: "4", ranges: ["C4:C4"], rule },
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
              D2: { content: "42" },
            },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A3"], rule },
              { id: "2", ranges: ["B1:B2"], rule },
              { id: "3", ranges: ["C2:C3"], rule },
              { id: "4", ranges: ["D2:D2"], rule },
            ],
          },
        ],
      });
      model.dispatch("ADD_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        row: 1,
        position: "before",
        quantity: 1,
      });
      model.dispatch("ADD_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        row: 2,
        position: "after",
        quantity: 2,
      });
      expect(model.getters.getConditionalFormats()).toEqual([
        { id: "1", ranges: ["A1:A6"], rule },
        { id: "2", ranges: ["B1:B3"], rule },
        { id: "3", ranges: ["C3:C6"], rule },
        { id: "4", ranges: ["D3:D3"], rule },
      ]);
      expect(model.getters.getConditionalStyle("D2")).toBeUndefined();
      expect(model.getters.getConditionalStyle("D3")!.fillColor).toBe("orange");
    });
  });
});

describe("conditional formats types", () => {
  describe("CellIs condition", () => {
    test("Operator BeginsWith", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "BeginsWith",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "aaa" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "qsdfmlkqjsdf" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator Between", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "Between",
            values: ["1", "3"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "1.5" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "3.5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    });

    test("Operator ContainsText", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "ContainsText",
            values: ["abc"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });
      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "helabclo" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator EndsWith", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "EndsWith",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "helloqsdf" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThan", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "GreaterThan",
            values: ["12"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });
      model.dispatch("SET_VALUE", { xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "12" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "13" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThanOrEqual", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "GreaterThanOrEqual",
            values: ["12"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "12" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "13" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator LessThan", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "LessThan",
            values: ["10"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "11" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "9" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator LessThanOrEqual", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "LessThanOrEqual",
            values: ["10"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "11" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "9" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotBetween", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotBetween",
            values: ["5", "10"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "4" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "5" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "10.1" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotContains", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotContains",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "hellqsdfo" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();

      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator NotEqual", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "NotEqual",
            values: ["qsdf"],
            style: { fillColor: "#ff0f0f" },
          },
          ranges: ["A1"],
          id: "11",
        },
        sheetId: model.getters.getActiveSheetId(),
      });

      model.dispatch("SET_VALUE", { xc: "A1", text: "hellqsdfo" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff0f0f" });

      model.dispatch("SET_VALUE", { xc: "A1", text: "qsdf" });
      expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    });
  });

  describe("color scale", () => {
    test("1 point, value scale", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(model.getters.getConditionalStyle("A1")).toEqual(undefined);
    });

    test("2 points, value scale", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "11" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "17" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "19" });
      model.dispatch("SET_VALUE", { xc: "A5", text: "20" });

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff00ff" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#e705ee" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#592489" });
      expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#2a2f67" });
      expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#123456" });
    });

    test("2 points, value scale with other min and max", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "100" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "110" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "170" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "190" });
      model.dispatch("SET_VALUE", { xc: "A5", text: "200" });

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff00ff" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#e705ee" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#592489" });
      expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#2a2f67" });
      expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#123456" });
    });

    test("2 points, value scale with minimum = 0", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "7" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "9" });
      model.dispatch("SET_VALUE", { xc: "A5", text: "10" });

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#ff00ff" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#e705ee" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#592489" });
      expect(model.getters.getConditionalStyle("A4")).toEqual({ fillColor: "#2a2f67" });
      expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#123456" });
    });

    test("2 points, value scale with any value 0", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "-5" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "5" });

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A5"],
          { type: "value", color: 0xff0000 },
          { type: "value", color: 0x00ff00 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#808000" });
      expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#ff0000" });
      expect(model.getters.getConditionalStyle("A3")).toEqual({ fillColor: "#00ff00" });
    });

    test("2 points, value scale with same min/max", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "10" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "10" });
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A2"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle("A1")).toEqual(undefined);
      expect(model.getters.getConditionalStyle("A2")).toEqual(undefined);
    });

    test("async values do not crash the evaluation", () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "=wait(100)" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "110" });

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          ["A1:A2"],
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(true).toBeTruthy(); // no error
    });
  });
  describe("icon scale", () => {});
});

describe("UI of conditional formats", () => {
  let fixture: HTMLElement;
  let parent: GridParent;

  beforeEach(async () => {
    fixture = makeTestFixture();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A2"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createColorScale(
        "2",
        ["B1:B5"],
        { type: "value", color: 0xff00ff },
        { type: "value", color: 0x123456 }
      ),
      sheetId: model.getters.getActiveSheetId(),
    });
    parent = new GridParent(model);
    await parent.mount(fixture);

    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });

  const selectors = {
    listPreview: ".o-cf .o-cf-preview",
    ruleEditor: {
      range: ".o-cf .o-cf-ruleEditor .o-cf-range input",
      editor: {
        operatorInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-operator",
        valueInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-value",
        bold: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Bold']",
        italic: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Italic']",
        strikethrough:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Strikethrough']",
        colorDropdown:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools .o-tool.o-dropdown.o-with-color span",
      },
    },
    previewImage: ".o-cf-preview-image",
    description: {
      ruletype: {
        rule: ".o-cf-preview-description-rule",
        values: ".o-cf-preview-description-values",
      },
      range: ".o-cf-preview-range",
    },
    colorScaleEditor: {
      minColor: ".o-threshold-minimum .o-tool.o-dropdown.o-with-color span",
      minType: ".o-threshold-minimum > select",
      minValue: ".o-threshold-minimum .o-threshold-value",
      maxColor: ".o-threshold-maximum .o-tool.o-dropdown.o-with-color span",
      maxType: ".o-threshold-maximum > select",
      maxValue: ".o-threshold-maximum .o-threshold-value",
      colorPickerBlue: ".o-color-picker div[data-color='#0000ff']",
      colorPickerYellow: ".o-color-picker div[data-color='#ffff00']",
    },
    cfTabSelector: ".o-cf-type-selector .o-cf-type-tab",
    buttonSave: ".o-sidePanelButtons .o-cf-save",
    buttonDelete: ".o-cf-delete-button",
    buttonAdd: ".o-cf-add",
    closePanel: ".o-sidePanelClose",
  };

  test("simple snapshot", () => {
    expect(fixture.querySelector(".o-sidePanel")!).toMatchSnapshot();
  });

  test("the list of CF has a correct preview", () => {
    // check the html of the list (especially the colors)
    let previews = document.querySelectorAll(selectors.listPreview);
    expect(previews).toHaveLength(2);

    // --> should be the style for CellIsRule
    expect(previews[0].querySelector(selectors.description.ruletype.rule)!.textContent).toBe(
      "Is equal to"
    );
    expect(previews[0].querySelector(selectors.description.ruletype.values)!.textContent).toBe("2");
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
    expect(
      window.getComputedStyle(previews[0].querySelector(selectors.previewImage)!).backgroundColor
    ).toBe("rgb(255, 0, 0)");

    // --> should be a nothing of color gradient for ColorScaleRule
    expect(previews[1].querySelector(selectors.description.range)!.textContent).toBe("B1:B5");
    expect(
      window.getComputedStyle(previews[1].querySelector(selectors.previewImage)!).backgroundColor
    ).toBe("");
    // TODO VSC: see how we can test the gradient background image
  });

  test("can edit an existing CellIsRule", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "change");
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "input");
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

    triggerMouseEvent(selectors.ruleEditor.editor.bold, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.italic, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.strikethrough, "click");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""],
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("the preview should be bold when the rule is bold", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["C1:C5"], "2", { bold: true, fillColor: "#ff0000" }, "99"),
      sheetId: model.getters.getActiveSheetId(),
    });

    await nextTick();

    let previews = document.querySelectorAll(selectors.listPreview);
    let line = previews[2].querySelector(selectors.previewImage);
    expect(line!.getAttribute("style")).toMatch("font-weight:bold;");
  });

  test("can edit an existing ColorScaleRule", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[1], "click");
    await nextTick();
    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "2",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
          midpoint: undefined,
          minimum: {
            color: 0x0000ff,
            type: "value",
            value: "33",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("toggle color-picker", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
  });

  test.skip("color-picker closes when click elsewhere", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
    triggerMouseEvent(".o-cf-preview-line", "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
  });

  test("can create a new CellIsRule", async () => {
    mockUuidV4To("42");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

    triggerMouseEvent(selectors.ruleEditor.editor.bold, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.italic, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.strikethrough, "click");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "47",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""],
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("displayed range is updated if range changes", async () => {
    const previews = document.querySelectorAll(selectors.listPreview);
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
    model.dispatch("COPY", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("C1") });
    await nextTick();
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2,C1:C2");
  });

  test("can delete Rule", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const previews = document.querySelectorAll(selectors.listPreview);
    triggerMouseEvent(previews[0].querySelector(selectors.buttonDelete), "click");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_CONDITIONAL_FORMAT", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule", async () => {
    mockUuidV4To("43");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "51",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
          midpoint: undefined,
          minimum: {
            color: 0x0000ff,
            type: "value",
            value: "33",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });
  /*
  test("Colorscale input number must yield a number not a string", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[1], "click");
    await nextTick();

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change"); // TODO: type of min = "number" select[name="valueType"]
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "20", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "2",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
          midpoint: undefined,
          minimum: {
            color: 0x0000ff,
            type: "number",
            value: 20, // as a number, not a string
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });*/

  /* TODO "Colorscale inputing wrong minimum value"
     Open side panel CF
     Click on tab ColorScale
     Change minimum type to "number" (selectors.colorScaleEditor.minType)
     Change minimum input to "bla" (selectors.colorScaleEditor.minValue) (.o-threshold-minimum .o-threshold-value)
     Click on save
    ; it expects to have no background on a cell of the range
  */

  test.skip("Colorscale inputing wrong minimum value", async () => {
    // same a previous test but minType = "bla"
    // expects parent.env.dispatch to NOT be called (or to be called with value = undefined ?)
  });

  test("Make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    triggerMouseEvent(selectors.closePanel, "click");
    await nextTick();
    const zone1 = { bottom: 1, left: 1, right: 1, top: 1 };
    const zone2 = { bottom: 2, left: 2, right: 2, top: 2 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1, zone2],
    });
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("Open CF panel, make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    const zone1 = { bottom: 1, left: 1, right: 1, top: 1 };
    const zone2 = { bottom: 2, left: 2, right: 2, top: 2 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1, zone2],
    });
    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("switching sheet changes the content of CF and cancels the edition", async () => {});
});
