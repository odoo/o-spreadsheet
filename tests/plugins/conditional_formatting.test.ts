import { toCartesian, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, ConditionalFormattingOperatorValues } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  redo,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { createColorScale, createEqualCF } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

beforeEach(() => {
  model = new Model();
});

describe("conditional format", () => {
  test("works", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1:A4")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      target: [toZone("A1:A4")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toEqual([
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
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toEqual({
      fillColor: "#0000FF",
    });
  });

  test("Add conditional formatting on inactive sheet", () => {
    model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet] = model.getters.getSheets();
    expect(sheet.id).not.toBe(model.getters.getActiveSheetId());
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      target: [toZone("A1:A4")],
      sheetId: sheet.id,
    });
    activateSheet(model, "42");
    expect(model.getters.getConditionalFormats("42")).toEqual([
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

  test("add conditional format outside the sheet", () => {
    model = new Model();
    createSheet(model, { sheetId: "42" });
    const sheetId = model.getters.getActiveSheetId();
    expect(
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
        target: [toZone("A1:A4000")],
        sheetId: sheetId,
      })
    ).toBe(CommandResult.TargetOutOfSheet);
  });

  test("remove a conditional format rule", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1:A4")],
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      target: [toZone("A1:A4")],
      sheetId,
    });
    expect(model.getters.getConditionalFormats(sheetId)).toEqual([
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
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toEqual({
      fillColor: "#0000FF",
    });
    model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: "2",
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toBeUndefined();
  });

  test("works on multiple ranges", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can be undo/redo", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });

    undo(model);

    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();

    redo(model);

    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("Still correct after ADD_COLUMNS_ROWS with dimension col and UNDO/REDO", () => {
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "B1", "1");
    setCellContent(model, "B2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("B1"), toZone("B2")],
      sheetId,
    });
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toEqual({
      fillColor: "#FF0000",
    });
    addColumns(model, "after", "A", 1);
    expect(model.getters.getConditionalFormats(sheetId)).toStrictEqual([
      {
        id: "1",
        ranges: ["C1", "C2"],
        rule: {
          operator: "Equal",
          style: { fillColor: "#FF0000" },
          type: "CellIsRule",
          values: ["1"],
        },
      },
    ]);
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toEqual({
      fillColor: "#FF0000",
    });

    undo(model);
    expect(model.getters.getConditionalFormats(sheetId)).toStrictEqual([
      {
        id: "1",
        ranges: ["B1", "B2"],
        rule: {
          operator: "Equal",
          style: { fillColor: "#FF0000" },
          type: "CellIsRule",
          values: ["1"],
        },
      },
    ]);
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toBeUndefined();

    redo(model);
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("is saved/restored", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1:A4")],
      sheetId: model.getters.getActiveSheetId(),
    });
    const workbookData = model.exportData();
    const newModel = new Model(workbookData);
    const sheetId = model.getters.getActiveSheetId();
    expect(newModel.getters.getConditionalFormats(sheetId)).toEqual(
      model.getters.getConditionalFormats(sheetId)
    );
  });

  test("works after value update", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    setCellContent(model, "A1", "2");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    setCellContent(model, "A1", "1");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    setCellContent(model, "A1", "=A2");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("works when cells are in error", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    setCellContent(model, "A1", "=BLA");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
  });

  test("multiple conditional formats for one cell", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { textColor: "#445566" }, "2"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566",
    });
  });

  test("multiple conditional formats with same style", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "2"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test.skip("multiple conditional formats using stopIfTrue flag", () => {
    setCellContent(model, "A1", "2");

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        rule: {
          values: ["2"],
          operator: "Equal",
          type: "CellIsRule",
          style: { fillColor: "#FF0000" },
        },
        id: "1",
        stopIfTrue: true,
      },
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#445566" }, "2"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("Set conditionalFormat on empty cell", () => {
    let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(result).toEqual(CommandResult.Success);
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
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
      const sheetId = model.getters.getActiveSheetId();
      deleteRows(model, [1, 3]);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1"], rule },
        { id: "3", ranges: ["C2"], rule },
        { id: "4", ranges: ["D1"], rule },
        { id: "5", ranges: ["E2"], rule },
        { id: "6", ranges: ["F1:F2"], rule },
        { id: "7", ranges: ["G1:G2"], rule },
      ]);
      expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
      expect(model.getters.getConditionalStyle(...toCartesian("C2"))!.fillColor).toBe("orange");
      expect(model.getters.getConditionalStyle(...toCartesian("C3"))).toBeUndefined();
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
              { id: "8", ranges: ["A7", "B7:D7"], rule },
              { id: "9", ranges: ["A7", "B7", "C7", "D7"], rule },
            ],
          },
        ],
      });
      deleteColumns(model, ["B", "D"]);
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1"], rule },
        { id: "3", ranges: ["B3"], rule },
        { id: "4", ranges: ["A4"], rule },
        { id: "5", ranges: ["B5"], rule },
        { id: "6", ranges: ["A6:B6"], rule },
        { id: "7", ranges: ["A7:B7"], rule },
        { id: "8", ranges: ["A7", "B7"], rule },
        { id: "9", ranges: ["A7", "B7"], rule },
      ]);
      expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
      expect(model.getters.getConditionalStyle(...toCartesian("B3"))!.fillColor).toBe("orange");
      expect(model.getters.getConditionalStyle(...toCartesian("C3"))).toBeUndefined();
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
      const sheetId = model.getters.getActiveSheetId();
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "C", 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1:F1"], rule },
        { id: "2", ranges: ["A2:C2"], rule },
        { id: "3", ranges: ["C3:F3"], rule },
        { id: "4", ranges: ["C4"], rule },
      ]);
      expect(model.getters.getConditionalStyle(...toCartesian("B4"))).toBeUndefined();
      expect(model.getters.getConditionalStyle(...toCartesian("C4"))!.fillColor).toBe("orange");
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
      const sheetId = model.getters.getActiveSheetId();
      addRows(model, "before", 1, 1);
      addRows(model, "after", 2, 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1:A6"], rule },
        { id: "2", ranges: ["B1:B3"], rule },
        { id: "3", ranges: ["C3:C6"], rule },
        { id: "4", ranges: ["D3"], rule },
      ]);
      expect(model.getters.getConditionalStyle(...toCartesian("D2"))).toBeUndefined();
      expect(model.getters.getConditionalStyle(...toCartesian("D3"))!.fillColor).toBe("orange");
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "aaa");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "qsdfmlkqjsdf");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "0");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "1");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "1.5");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "3");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "3.5");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      setCellContent(model, "A1", "hello");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "helabclo");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "hello");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "helloqsdf");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      setCellContent(model, "A1", "5");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "12");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "13");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "5");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "12");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "13");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "11");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "10");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "9");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "11");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "10");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "9");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "4");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "0");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "5");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "10");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "10.1");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "hellqsdfo");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "hello");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
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
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });

      setCellContent(model, "A1", "hellqsdfo");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "hello");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "qsdf");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    });

    test("Operator IsEmpty", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "IsEmpty",
            values: [],
            style: { fillColor: "#ff0f0f" },
          },
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      setCellContent(model, "A1", "");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", " ");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A2", "");
      setCellContent(model, "A1", "=A2");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", '=""');
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", '=" "');
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "helabclo");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    });

    test("Operator IsNotEmpty", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "IsNotEmpty",
            values: [],
            style: { fillColor: "#ff0f0f" },
          },
          id: "11",
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      setCellContent(model, "A1", "");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", " ");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();

      setCellContent(model, "A1", "helabclo");
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test.each([
      ["IsEmpty", ["", ""]],
      ["IsEmpty", []],
      ["IsEmpty", [""]],
      ["IsNotEmpty", ["", ""]],
      ["IsNotEmpty", []],
      ["IsNotEmpty", [""]],
      ["GreaterThan", ["1", ""]],
      ["GreaterThan", ["1"]],
      ["GreaterThanOrEqual", ["1", ""]],
      ["GreaterThanOrEqual", ["1"]],
      ["LessThan", ["1"]],
      ["LessThan", ["1", ""]],
      ["LessThanOrEqual", ["1"]],
      ["LessThanOrEqual", ["1", ""]],
      ["BeginsWith", ["1"]],
      ["BeginsWith", ["1", ""]],
      ["ContainsText", ["1"]],
      ["ContainsText", ["1", ""]],
      ["EndsWith", ["1"]],
      ["EndsWith", ["1", ""]],
      ["NotContains", ["1"]],
      ["NotContains", ["1", ""]],
      ["Between", ["1", "1"]],
      ["NotBetween", ["1", "1"]],
    ])(
      "%s operator with valid number of arguments: %s",
      (operator: ConditionalFormattingOperatorValues, values: []) => {
        let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: {
            rule: {
              type: "CellIsRule",
              operator: operator,
              values: values,
              style: { fillColor: "#ff0f0f" },
            },
            id: "11",
          },
          target: [toZone("A1")],
          sheetId: model.getters.getActiveSheetId(),
        });
        expect(result).toBe(CommandResult.Success);
      }
    );

    test.each([
      ["GreaterThan", []],
      ["GreaterThan", [""]],
      ["GreaterThan", ["", "1"]],
      ["GreaterThanOrEqual", []],
      ["GreaterThanOrEqual", [""]],
      ["LessThan", []],
      ["LessThan", [""]],
      ["LessThanOrEqual", []],
      ["LessThanOrEqual", [""]],
      ["BeginsWith", []],
      ["BeginsWith", [""]],
      ["ContainsText", []],
      ["ContainsText", [""]],
      ["EndsWith", []],
      ["EndsWith", [""]],
      ["NotContains", []],
      ["NotContains", [""]],
      ["Between", ["1"]],
      ["Between", ["1", ""]],
      ["NotBetween", ["1"]],
      ["NotBetween", ["1", ""]],
    ])(
      "%s operator with invalid number of arguments %s",
      (operator: ConditionalFormattingOperatorValues, values: []) => {
        let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: {
            rule: {
              type: "CellIsRule",
              operator: operator,
              values: values,
              style: { fillColor: "#ff0f0f" },
            },
            id: "11",
          },
          target: [toZone("A1")],
          sheetId: model.getters.getActiveSheetId(),
        });
        expect(result).toBe(CommandResult.InvalidNumberOfArgs);
      }
    );
  });

  describe("Icon set", () => {
    describe.each(["", "aaaa", "=SUM(1, 2)"])(
      "dispatch is not allowed if value is not a number",
      (value) => {
        test("lower inflationpoint is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "IconSetRule",
                upperInflectionPoint: { type: "number", value: value, operator: "gt" },
                lowerInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "arrowNeutral",
                  lower: "arrowBad",
                },
              },
            },
          });
          expect(result).toBe(CommandResult.ValueUpperInflectionNaN);
        });
        test("upper inflationpoint is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "IconSetRule",
                lowerInflectionPoint: { type: "number", value: value, operator: "gt" },
                upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "arrowNeutral",
                  lower: "arrowBad",
                },
              },
            },
          });
          expect(result).toBe(CommandResult.ValueLowerInflectionNaN);
        });
      }
    );

    describe.each([
      ["number", "number"],
      ["percentage", "percentage"],
      ["percentile", "percentile"],
    ])(
      "dispatch is not allowed if points not ascending (upper: %s , lower: %s)",
      (
        lowerInflectionPoint: "number" | "percentage" | "percentile",
        upperInflectionPoint: "number" | "percentage" | "percentile"
      ) => {
        test("upper bigger than lower", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "IconSetRule",
                lowerInflectionPoint: { type: lowerInflectionPoint, value: "10", operator: "gt" },
                upperInflectionPoint: { type: upperInflectionPoint, value: "1", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "arrowNeutral",
                  lower: "arrowBad",
                },
              },
            },
          });
          expect(result).toBe(CommandResult.LowerBiggerThanUpper);
        });
      }
    );
    test("single cell", () => {
      setCellContent(model, "A1", "5");
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
            upperInflectionPoint: { type: "number", value: "10", operator: "gt" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual(undefined);
      expect(model.getters.getConditionalIcon(...toCartesian("A1"))).toEqual("arrowNeutral");
    });

    test("2 points with 'gt', value scale", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      setCellContent(model, "A3", "5");
      setCellContent(model, "A4", "7");
      setCellContent(model, "A5", "10");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "number", value: "3", operator: "gt" },
            upperInflectionPoint: { type: "number", value: "7", operator: "gt" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalIcon(...toCartesian("A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A2"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A3"))).toEqual("arrowNeutral");
      expect(model.getters.getConditionalIcon(...toCartesian("A4"))).toEqual("arrowNeutral");
      expect(model.getters.getConditionalIcon(...toCartesian("A5"))).toEqual("arrowGood");
    });

    test("2 points with 'ge', value scale", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      setCellContent(model, "A3", "5");
      setCellContent(model, "A4", "7");
      setCellContent(model, "A5", "10");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "number", value: "3", operator: "ge" },
            upperInflectionPoint: { type: "number", value: "7", operator: "ge" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalIcon(...toCartesian("A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A2"))).toEqual("arrowNeutral");
      expect(model.getters.getConditionalIcon(...toCartesian("A3"))).toEqual("arrowNeutral");
      expect(model.getters.getConditionalIcon(...toCartesian("A4"))).toEqual("arrowGood");
      expect(model.getters.getConditionalIcon(...toCartesian("A5"))).toEqual("arrowGood");
    });

    test("same upper and lower inflationpoint", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      setCellContent(model, "A3", "5");
      setCellContent(model, "A4", "7");
      setCellContent(model, "A5", "10");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "number", value: "7", operator: "gt" },
            upperInflectionPoint: { type: "number", value: "7", operator: "gt" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalIcon(...toCartesian("A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A2"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A3"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A4"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(...toCartesian("A5"))).toEqual("arrowGood");
    });
  });
  describe("color scale", () => {
    describe.each(["", "aaaa", "=SUM(1, 2)"])(
      "dispatch is not allowed if value is not a number",
      (value) => {
        test("minimum is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "number", color: 1, value: value },
                maximum: { type: "number", color: 1, value: "1000" },
              },
            },
          });
          expect(result).toBe(CommandResult.MinNaN);
        });
        test("midpoint is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "number", color: 1, value: "1" },
                midpoint: { type: "number", color: 1, value: value },
                maximum: { type: "number", color: 1, value: "1000" },
              },
            },
          });
          expect(result).toBe(CommandResult.MidNaN);
        });
        test("maximum is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "number", color: 1, value: "1" },
                maximum: { type: "number", color: 1, value: value },
              },
            },
          });
          expect(result).toBe(CommandResult.MaxNaN);
        });
      }
    );

    describe.each([
      ["number", "number", "number"],
      ["percentage", "percentage", "percentage"],
      ["percentile", "percentile", "percentile"],
    ])(
      "dispatch is not allowed if points not ascending (min: %s , mid: %s, max: %s )",
      (
        minType: "number" | "percentage" | "percentile",
        midType: "number" | "percentage" | "percentile",
        maxType: "number" | "percentage" | "percentile"
      ) => {
        test("min bigger than max", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: minType, color: 1, value: "10" },
                maximum: { type: maxType, color: 1, value: "1" },
              },
            },
          });
          expect(result).toBe(CommandResult.MinBiggerThanMax);
        });
        test("mid bigger than max", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: minType, color: 1, value: "1" },
                midpoint: { type: midType, color: 1, value: "100" },
                maximum: { type: maxType, color: 1, value: "10" },
              },
            },
          });
          expect(result).toBe(CommandResult.MidBiggerThanMax);
        });
        test("min bigger than mid", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId: model.getters.getActiveSheetId(),
            target: [toZone("A1")],
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: minType, color: 1, value: "5" },
                midpoint: { type: midType, color: 1, value: "1" },
                maximum: { type: maxType, color: 1, value: "10" },
              },
            },
          });
          expect(result).toBe(CommandResult.MinBiggerThanMid);
        });
      }
    );
    test("1 point, value scale", () => {
      setCellContent(model, "A1", "10");
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1")],
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual(undefined);
    });

    test("2 points, value scale", () => {
      setCellContent(model, "A1", "10");
      setCellContent(model, "A2", "11");
      setCellContent(model, "A3", "17");
      setCellContent(model, "A4", "19");
      setCellContent(model, "A5", "20");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff00ff",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
        fillColor: "#e705ee",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toEqual({
        fillColor: "#592489",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toEqual({
        fillColor: "#2a2f67",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A5"))).toEqual({
        fillColor: "#123456",
      });
    });

    test("2 points, value scale with other min and max", () => {
      setCellContent(model, "A1", "100");
      setCellContent(model, "A2", "110");
      setCellContent(model, "A3", "170");
      setCellContent(model, "A4", "190");
      setCellContent(model, "A5", "200");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff00ff",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
        fillColor: "#e705ee",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toEqual({
        fillColor: "#592489",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toEqual({
        fillColor: "#2a2f67",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A5"))).toEqual({
        fillColor: "#123456",
      });
    });

    test("2 points, value scale with minimum = 0", () => {
      setCellContent(model, "A1", "0");
      setCellContent(model, "A2", "1");
      setCellContent(model, "A3", "7");
      setCellContent(model, "A4", "9");
      setCellContent(model, "A5", "10");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#ff00ff",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
        fillColor: "#e705ee",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toEqual({
        fillColor: "#592489",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toEqual({
        fillColor: "#2a2f67",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A5"))).toEqual({
        fillColor: "#123456",
      });
    });

    test("2 points, value scale with any value 0", () => {
      setCellContent(model, "A1", "0");
      setCellContent(model, "A2", "-5");
      setCellContent(model, "A3", "5");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff0000 },
          { type: "value", color: 0x00ff00 }
        ),
        target: [toZone("A1:A5")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
        fillColor: "#808000",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
        fillColor: "#ff0000",
      });
      expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toEqual({
        fillColor: "#00ff00",
      });
    });

    test("2 points, value scale with same min/max", () => {
      setCellContent(model, "A1", "10");
      setCellContent(model, "A2", "10");
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A2")],
        sheetId: model.getters.getActiveSheetId(),
      });

      expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual(undefined);
      expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual(undefined);
    });

    test("async values do not crash the evaluation", () => {
      setCellContent(model, "A1", "=wait(100)");
      setCellContent(model, "A2", "110");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A2")],
        sheetId: model.getters.getActiveSheetId(),
      });
      expect(true).toBeTruthy(); // no error
    });

    test("CF is not updated with insert/delete cells", () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        target: [toZone("A1:A10")],
        sheetId,
      });
      deleteCells(model, "A2:A3", "up");
      expect(model.getters.getConditionalFormats(sheetId)[0].ranges[0]).toBe("A1:A10");
    });
  });
});
