import { Model } from "@odoo/o-spreadsheet-engine/model";
import {
  ConditionalFormat,
  ConditionalFormatRule,
} from "@odoo/o-spreadsheet-engine/types/conditional_formatting";
import { CommandResult, ConditionalFormattingOperatorValues, UID } from "../../src/types";
import {
  activateSheet,
  addCfRule,
  addColumns,
  addRows,
  changeCFPriority,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  redo,
  setCellContent,
  setFormat,
  setStyle,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getDataBarFill, getStyle } from "../test_helpers/getters_helpers";
import {
  createColorScale,
  createEqualCF,
  createModelFromGrid,
  toCellPosition,
  toRangesData,
} from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("conditional format", () => {
  test("works", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A:A"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("5", { fillColor: "#0000FF" }, "3"),
      ranges: toRangesData(sheetId, "A3:A"),
      sheetId,
    });

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("6", { fillColor: "#0000FF" }, "4"),
      ranges: toRangesData(sheetId, "C3:3"),
      sheetId,
    });
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toEqual([
      {
        rule: {
          values: ["2"],
          operator: "isEqual",
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
          operator: "isEqual",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "2",
        ranges: ["A:A"],
      },
      {
        rule: {
          values: ["5"],
          operator: "isEqual",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "3",
        ranges: ["A3:A"],
      },
      {
        rule: {
          values: ["6"],
          operator: "isEqual",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "4",
        ranges: ["C3:3"],
      },
    ]);
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A3")).toEqual({});
    expect(getStyle(model, "A4")).toEqual({
      fillColor: "#0000FF",
    });
  });

  test("getCellComputedStyle", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    setStyle(model, "A1", { fillColor: "blue" });
    setStyle(model, "A2", { bold: true });
    setStyle(model, "A3", { fillColor: "orange" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1, A2"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
      bold: true,
    });
    expect(getStyle(model, "A3")).toEqual({
      fillColor: "orange",
    });
    expect(getStyle(model, "A4")).toEqual({});
  });

  test("falsy CF attributes do not overwrite cell style in getCellComputedStyle", () => {
    setCellContent(model, "A1", "1");
    setStyle(model, "A1", { bold: true, fillColor: "#FF0000" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { bold: false, fillColor: undefined }, "cfId"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({ bold: true, fillColor: "#FF0000" });
  });

  test("Add conditional formatting on inactive sheet", () => {
    model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheetId] = model.getters.getSheetIds();
    expect(sheetId).not.toBe(model.getters.getActiveSheetId());
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    activateSheet(model, "42");
    expect(model.getters.getConditionalFormats("42")).toEqual([
      {
        rule: {
          values: ["4"],
          operator: "isEqual",
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

  test("is correctly duplicated when the sheet is duplicated", () => {
    model = new Model();
    const cf = createEqualCF("4", { fillColor: "#0000FF" }, "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    model.dispatch("DUPLICATE_SHEET", {
      sheetId,
      sheetIdTo: "Sheet2",
      sheetNameTo: "Copy of Sheet1",
    });
    expect(model.getters.getConditionalFormats("Sheet2")).toEqual([
      {
        id: expect.any(String),
        ranges: ["A1:A4"],
        rule: cf.rule,
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
        ranges: toRangesData(sheetId, "A1:A4000"),
        sheetId: sheetId,
      })
    ).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
  });

  test("Dispatch is refused if no changes are made", () => {
    model = new Model();
    createSheet(model, { sheetId: "42" });
    const sheetId = model.getters.getActiveSheetId();
    const cmd = {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId: sheetId,
    };
    expect(model.dispatch("ADD_CONDITIONAL_FORMAT", cmd)).toBeSuccessfullyDispatched();
    expect(model.dispatch("ADD_CONDITIONAL_FORMAT", cmd)).toBeCancelledBecause(
      CommandResult.NoChanges
    );
  });

  test("remove a conditional format rule", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    expect(model.getters.getConditionalFormats(sheetId)).toEqual([
      {
        rule: {
          values: ["2"],
          operator: "isEqual",
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
          operator: "isEqual",
          type: "CellIsRule",
          style: {
            fillColor: "#0000FF",
          },
        },
        id: "2",
        ranges: ["A1:A4"],
      },
    ]);
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A3")).toEqual({});
    expect(getStyle(model, "A4")).toEqual({
      fillColor: "#0000FF",
    });
    model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: "2",
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A3")).toEqual({});
    expect(getStyle(model, "A4")).toEqual({});
  });

  test("works on multiple ranges", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1, A2"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can be undo/redo", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1, A2"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });

    undo(model);

    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({});

    redo(model);

    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("Conditional formatting with an unbounded range on an invalid sheet", () => {
    const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData("not-a-valid-sheet-id", "B1,A1:A"),
      sheetId,
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("Conditional formatting with empty target", () => {
    const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("4", { fillColor: "#0000FF" }, "2"),
      ranges: [],
      sheetId,
    });
    expect(result).toBeCancelledBecause(CommandResult.EmptyRange);
    expect(model.getters.getConditionalFormats(sheetId)).toHaveLength(0);
  });

  test("Still correct after ADD_COLUMNS_ROWS with dimension col and UNDO/REDO", () => {
    setCellContent(model, "B1", "1");
    setCellContent(model, "B2", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "B1,B2"),
      sheetId,
    });
    expect(getStyle(model, "B1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "B2")).toEqual({
      fillColor: "#FF0000",
    });
    addColumns(model, "after", "A", 1);
    expect(model.getters.getConditionalFormats(sheetId)).toStrictEqual([
      {
        id: "1",
        ranges: ["C1", "C2"],
        rule: {
          operator: "isEqual",
          style: { fillColor: "#FF0000" },
          type: "CellIsRule",
          values: ["1"],
        },
      },
    ]);
    expect(getStyle(model, "B1")).toEqual({});
    expect(getStyle(model, "B2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({
      fillColor: "#FF0000",
    });

    undo(model);
    expect(model.getters.getConditionalFormats(sheetId)).toStrictEqual([
      {
        id: "1",
        ranges: ["B1", "B2"],
        rule: {
          operator: "isEqual",
          style: { fillColor: "#FF0000" },
          type: "CellIsRule",
          values: ["1"],
        },
      },
    ]);
    expect(getStyle(model, "B1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "B2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C1")).toEqual({});
    expect(getStyle(model, "C2")).toEqual({});

    redo(model);
    expect(getStyle(model, "B1")).toEqual({});
    expect(getStyle(model, "B2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("delete cf when range is deleted with previous rows", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A4"),
      sheetId,
    });
    deleteRows(model, [2, 3]);
    expect(model.getters.getConditionalFormats(sheetId)).toEqual([]);
  });

  test("is saved/restored", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1:A4"),
      sheetId,
    });
    const workbookData = model.exportData();
    const newModel = new Model(workbookData);
    expect(newModel.getters.getConditionalFormats(sheetId)).toEqual(
      model.getters.getConditionalFormats(sheetId)
    );
  });

  test("works after value update", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({});
    setCellContent(model, "A1", "2");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    setCellContent(model, "A1", "1");
    expect(getStyle(model, "A1")).toEqual({});
    setCellContent(model, "A1", "=A2");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("works after format update that updates a value", () => {
    setCellContent(model, "A1", '=CELL("format", A2)');
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("mm/dd/yyyy", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({});
    setFormat(model, "A2", "mm/dd/yyyy");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("works when cells are in error", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    setCellContent(model, "A1", "=BLA");
    expect(getStyle(model, "A1")).toEqual({});
  });

  test("multiple conditional formats for one cell", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { textColor: "#445566" }, "2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
      textColor: "#445566",
    });
  });

  test("multiple conditional formats with same style", () => {
    setCellContent(model, "A1", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("multiple conditional formats using stopIfTrue flag", () => {
    setCellContent(model, "A1", "2");

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        rule: {
          values: ["2"],
          operator: "isEqual",
          type: "CellIsRule",
          style: { fillColor: "#FF0000" },
        },
        id: "1",
        stopIfTrue: true,
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#445566" }, "2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
  });

  describe("Grid Manipulation Range", () => {
    const rule = {
      values: ["42"],
      operator: "isEqual",
      type: "CellIsRule",
      style: { fillColor: "orange" },
    };
    test("On row deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            cells: { C3: "42" },
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
      deleteRows(model, [1, 3]);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1"], rule },
        { id: "3", ranges: ["C2"], rule },
        { id: "4", ranges: ["D1"], rule },
        { id: "5", ranges: ["E2"], rule },
        { id: "6", ranges: ["F1:F2"], rule },
        { id: "7", ranges: ["G1:G2"], rule },
      ]);
      expect(getStyle(model, "B2")).toEqual({});
      expect(getStyle(model, "C2")!.fillColor).toBe("orange");
      expect(getStyle(model, "C3")).toEqual({});
    });
    test("On column deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 7,
            cells: { C3: "42" },
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
      expect(getStyle(model, "B2")).toEqual({});
      expect(getStyle(model, "B3")!.fillColor).toBe("orange");
      expect(getStyle(model, "C3")).toEqual({});
    });
    test("On column addition", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 4,
            cells: { B4: "42" },
            conditionalFormats: [
              { id: "1", ranges: ["A1:C1"], rule },
              { id: "2", ranges: ["A2:B2"], rule },
              { id: "3", ranges: ["B3:C3"], rule },
              { id: "4", ranges: ["B4:B4"], rule },
            ],
          },
        ],
      });
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "C", 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1:F1"], rule },
        { id: "2", ranges: ["A2:C2"], rule },
        { id: "3", ranges: ["C3:F3"], rule },
        { id: "4", ranges: ["C4"], rule },
      ]);
      expect(getStyle(model, "B4")).toEqual({});
      expect(getStyle(model, "C4")!.fillColor).toBe("orange");
    });
    test("On row addition", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 3,
            cells: { D2: "42" },
            conditionalFormats: [
              { id: "1", ranges: ["A1:A3"], rule },
              { id: "2", ranges: ["B1:B2"], rule },
              { id: "3", ranges: ["C2:C3"], rule },
              { id: "4", ranges: ["D2:D2"], rule },
            ],
          },
        ],
      });
      addRows(model, "before", 1, 1);
      addRows(model, "after", 2, 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual([
        { id: "1", ranges: ["A1:A6"], rule },
        { id: "2", ranges: ["B1:B3"], rule },
        { id: "3", ranges: ["C3:C6"], rule },
        { id: "4", ranges: ["D3"], rule },
      ]);
      expect(getStyle(model, "D2")).toEqual({});
      expect(getStyle(model, "D3")!.fillColor).toBe("orange");
    });
  });

  describe("Grid Manipulation Formulas", () => {
    function cellIsRuleEqual(formula: string): ConditionalFormatRule {
      return {
        type: "CellIsRule",
        values: [formula],
        operator: "isEqual",
        style: { fillColor: "orange" },
      };
    }

    function cellIsRuleBetween(formula: string): ConditionalFormatRule {
      return {
        type: "CellIsRule",
        values: [formula, formula],
        operator: "isBetween",
        style: { fillColor: "orange" },
      };
    }

    function colorScaleRule(formula: string): ConditionalFormatRule {
      return {
        type: "ColorScaleRule",
        minimum: {
          type: "formula",
          value: formula,
          color: 0,
        },
        maximum: {
          type: "formula",
          value: formula,
          color: 0,
        },
        midpoint: {
          type: "formula",
          value: formula,
          color: 0,
        },
      };
    }

    function iconSetRule(formula: string): ConditionalFormatRule {
      return {
        type: "IconSetRule",
        icons: {
          upper: "u",
          middle: "m",
          lower: "l",
        },
        upperInflectionPoint: {
          type: "formula",
          operator: "gt",
          value: formula,
        },
        lowerInflectionPoint: {
          type: "formula",
          operator: "gt",
          value: formula,
        },
      };
    }

    function formulasToCFs(
      formulas: string[],
      cfrule: (formula: string) => ConditionalFormatRule
    ): ConditionalFormat[] {
      return formulas
        .map((formula) => cfrule(formula))
        .map((rule) => {
          return {
            id: "1",
            rule,
            ranges: ["A1"],
          };
        });
    }

    const cfGenerators = [
      ["cellIsRuleEqual", cellIsRuleEqual],
      ["cellIsRuleBetween", cellIsRuleBetween],
      ["colorScaleRule", colorScaleRule],
      ["IconSetRule", iconSetRule],
    ] as const;

    test.each(cfGenerators)("On row deletion %s", (name, cfrule) => {
      const formulas = [
        "=A1",
        "=A5",
        "=F1",
        "=F5",
        "=$F$5",
        "=$F$10",
        "=F5*5",
        "=F5*10",
        "=SUM(A1:F5)",
      ];
      const expected = [
        "=A1",
        "=A3",
        "=F1",
        "=F3",
        "=$F$3",
        "=$F$8",
        "=F3*5",
        "=F3*10",
        "=SUM(A1:F3)",
      ];
      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            conditionalFormats: formulasToCFs(formulas, cfrule),
          },
        ],
      });
      deleteRows(model, [1, 3]);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual(formulasToCFs(expected, cfrule));
    });

    test.each(cfGenerators)("On column deletion %s", (name, cfrule) => {
      const formulas = [
        "=A1",
        "=A5",
        "=F1",
        "=F5",
        "=$F$5",
        "=$F$10",
        "=F5*5",
        "=F5*10",
        "=SUM(A1:F5)",
      ];
      const expected = [
        "=A1",
        "=A5",
        "=D1",
        "=D5",
        "=$D$5",
        "=$D$10",
        "=D5*5",
        "=D5*10",
        "=SUM(A1:D5)",
      ];

      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            conditionalFormats: formulasToCFs(formulas, cfrule),
          },
        ],
      });
      deleteColumns(model, ["B", "E"]);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual(formulasToCFs(expected, cfrule));
    });

    test.each(cfGenerators)("On column addition %s", (name, cfrule) => {
      const formulas = [
        "=A1",
        "=A5",
        "=F1",
        "=F5",
        "=$F$5",
        "=$F$10",
        "=F5*5",
        "=F5*10",
        "=SUM(A1:F5)",
      ];
      const expected = [
        "=A1",
        "=A5",
        "=H1",
        "=H5",
        "=$H$5",
        "=$H$10",
        "=H5*5",
        "=H5*10",
        "=SUM(A1:H5)",
      ];

      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            conditionalFormats: formulasToCFs(formulas, cfrule),
          },
        ],
      });
      addColumns(model, "after", "B", 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual(formulasToCFs(expected, cfrule));
    });

    test.each(cfGenerators)("On row addition %s", (name, cfrule) => {
      const formulas = [
        "=A1",
        "=A5",
        "=F1",
        "=F5",
        "=$F$5",
        "=$F$10",
        "=F5*5",
        "=F5*10",
        "=SUM(A1:F5)",
      ];
      const expected = [
        "=A1",
        "=A7",
        "=F1",
        "=F7",
        "=$F$7",
        "=$F$12",
        "=F7*5",
        "=F7*10",
        "=SUM(A1:F7)",
      ];

      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            conditionalFormats: formulasToCFs(formulas, cfrule),
          },
        ],
      });
      addRows(model, "after", 2, 2);
      expect(model.getters.getConditionalFormats(sheetId)).toEqual(formulasToCFs(expected, cfrule));
    });

    test.each(cfGenerators)("On another sheet %s", (name, cfrule) => {
      const formulas = [
        "=OtherSheet!A1",
        "=OtherSheet!A5",
        "=OtherSheet!F1",
        "=OtherSheet!F5",
        "=OtherSheet!$F$5",
        "=OtherSheet!$F$10",
        "=OtherSheet!F5*5",
        "=OtherSheet!F5*10",
        "=SUM(OtherSheet!A1:F5)",
      ];
      const expected = [
        "=OtherSheet!A1",
        "=OtherSheet!A3",
        "=OtherSheet!F1",
        "=OtherSheet!F3",
        "=OtherSheet!$F$3",
        "=OtherSheet!$F$8",
        "=OtherSheet!F3*5",
        "=OtherSheet!F3*10",
        "=SUM(OtherSheet!A1:F3)",
      ];
      model = new Model({
        sheets: [
          {
            colNumber: 7,
            rowNumber: 4,
            conditionalFormats: formulasToCFs(formulas, cfrule),
            name: "Sheet1",
          },
          {
            name: "OtherSheet",
            id: "otherSheet",
          },
        ],
      });
      deleteRows(model, [1, 3], "otherSheet");
      expect(model.getters.getConditionalFormats(sheetId)).toEqual(formulasToCFs(expected, cfrule));
    });
  });

  test("cannot send invalid arguments to *move* conditional format rules command", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "idRule1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "idRule2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });

    expect(changeCFPriority(model, "3", 1, sheetId)).not.toBeSuccessfullyDispatched();
    expect(changeCFPriority(model, "idRule2", 1, "notAnId")).not.toBeSuccessfullyDispatched();
    expect(changeCFPriority(model, "idRule1", 1, sheetId)).not.toBeSuccessfullyDispatched();
    expect(changeCFPriority(model, "idRule2", -1, sheetId)).not.toBeSuccessfullyDispatched();
  });

  test("Reorder conditional format rules command", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "idRule1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "idRule2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#00FF00" }, "idRule3"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });

    let formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule1");
    expect(formats[1].id).toEqual("idRule2");

    changeCFPriority(model, "idRule2", 1);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule2");
    expect(formats[1].id).toEqual("idRule1");

    changeCFPriority(model, "idRule2", -1);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule1");
    expect(formats[1].id).toEqual("idRule2");

    changeCFPriority(model, "idRule1", -2);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule2");
    expect(formats[1].id).toEqual("idRule3");
    expect(formats[2].id).toEqual("idRule1");

    changeCFPriority(model, "idRule1", 2);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule1");
    expect(formats[1].id).toEqual("idRule2");
    expect(formats[2].id).toEqual("idRule3");
  });

  test("Reorder format rules command can be undo/redo", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "idRule1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "idRule2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    let formats = model.getters.getConditionalFormats(sheetId);
    changeCFPriority(model, "idRule1", -1);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule2");
    expect(formats[1].id).toEqual("idRule1");

    undo(model);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule1");
    expect(formats[1].id).toEqual("idRule2");

    redo(model);
    formats = model.getters.getConditionalFormats(sheetId);
    expect(formats[0].id).toEqual("idRule2");
    expect(formats[1].id).toEqual("idRule1");
  });

  test("conditional format is re-evaluated when order changes", () => {
    setCellContent(model, "A1", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "idRule1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "idRule2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    changeCFPriority(model, "idRule2", 1, sheetId);
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#0000FF",
    });
  });
});

describe("conditional formats types", () => {
  describe("CellIs condition", () => {
    describe("Operator textBeginsWith", () => {
      test.each([
        ["aaa", false],
        ["42", false],
        ["ahi", false],
        ["hi", true],
        ["highway to hell", true],
        [`="highway to hell"`, true],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "beginsWithText",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["aaa", false],
        ["42", true],
        ["422", true],
        ["=422", true],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "beginsWithText",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });
    });

    test("Operator isBetween", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isBetween",
        values: ["1", "3"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "0");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "1");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "1.5");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "3");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "3.5");
      expect(getStyle(model, "A1")).toEqual({});
    });

    describe("Operator textContains", () => {
      test.each([
        ["aaa", false],
        ["42", false],
        ["hi", true],
        ["highway to hell", true],
        ["this", true],
        ["ahi", true],
        [`="ahi"`, true],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "containsText",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["aaa", false],
        ["42", true],
        ["422", true],
        ["2422", true],
        [`="2422"`, true],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "containsText",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test("applies conditional formatting correctly when formula returns a 1x1 matrix", () => {
        setCellContent(model, "A1", "test");
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "containsText",
          values: ['=IF(TRUE, $A$1, "something else")'],
          style: { fillColor: "#ff0f0f" },
        });

        expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
        expect(getStyle(model, "A2")).toEqual({});
      });
    });

    describe("Operator EndsWith", () => {
      test.each([
        ["aaa", false],
        ["42", false],
        ["highway to hell", false],
        ["hi", true],
        ["ahi", true],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "endsWithText",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["aaa", false],
        ["422", false],
        ["442", true],
        ["=442", true],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "endsWithText",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });
    });

    test("Operator GreaterThan", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["12"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "5");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "12");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "13");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator GreaterThan with simple reference", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=A2"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "A2", "0");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B1")).toEqual({});
      expect(getStyle(model, "A2")).toEqual({});
      expect(getStyle(model, "B2")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThan with full-fixed simple reference", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=$A$2"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "3");
      setCellContent(model, "B1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B1")).toEqual({});
      expect(getStyle(model, "A2")).toEqual({});
      expect(getStyle(model, "B2")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThan with column-fixed simple reference", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=$A2"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "3");
      setCellContent(model, "B1", "3");
      setCellContent(model, "A2", "2");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B2")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator GreaterThan with row-fixed simple reference", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=A$2"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "3");
      setCellContent(model, "B1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      expect(getStyle(model, "B1")).toEqual({});
      expect(getStyle(model, "A2")).toEqual({});
      expect(getStyle(model, "B2")).toEqual({});
    });

    test("Operator GreaterThan with formula", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=SUM(A1:B2)/4"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "A2", "3");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({});
      for (const cell of ["A2", "B1", "B2"]) {
        expect(getStyle(model, cell)).toEqual({
          fillColor: "#ff0f0f",
        });
      }
    });

    test("Operator GreaterThan with formula and fixed row/col", () => {
      addCfRule(model, "A1:B2", {
        type: "CellIsRule",
        operator: "isGreaterThan",
        values: ["=SUM($A$1:$B$2)/4"],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "A2", "3");
      setCellContent(model, "B2", "4");
      expect(getStyle(model, "A1")).toEqual({});
      expect(getStyle(model, "B1")).toEqual({});
      expect(getStyle(model, "A2")).toEqual({
        fillColor: "#ff0f0f",
      });
      expect(getStyle(model, "B2")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("CF with spreading formula is disabled", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "notContainsText",
        values: ["=MUNIT(3)"],
        style: { fillColor: "#ff0f0f" },
      });

      expect(getStyle(model, "A1")).toEqual({});
    });

    test("Operator GreaterThanOrEqual", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isGreaterOrEqualTo",
        values: ["12"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "5");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "12");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "13");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator LessThan", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isLessThan",
        values: ["10"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "11");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "10");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "9");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator LessThanOrEqual", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isLessOrEqualTo",
        values: ["10"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "11");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "10");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "9");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator isNotBetween", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isNotBetween",
        values: ["5", "10"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "4");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "0");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "5");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "10");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "10.1");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator textNotContains", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "notContainsText",
        values: ["qsdf"],
        style: { fillColor: "#ff0f0f" },
      });
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "hellqsdfo");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "hello");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    describe("Operator textBeginsWith", () => {
      test.each([
        ["aaa", false],
        ["42", false],
        ["ahi", false],
        ["hi", true],
        ["highway to hell", true],
        [`="highway to hell"`, true],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "beginsWithText",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["aaa", false],
        ["42", true],
        ["422", true],
        ["=422", true],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "beginsWithText",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });
    });

    describe("Operator NotEqual", () => {
      test.each([
        ["hi", false],
        [`="hi"`, false],
        ["aaa", true],
        ["42", true],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isNotEqual",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["42", false],
        [`=42`, false],
        [`="42"`, true],
        ["aaa", true],
        ["422", true],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isNotEqual",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["12/12/2021", false],
        ["=DATE(2021, 12, 12)", false],
        [`=42`, true],
        ["aaa", true],
        ["42", true],
      ])("a date %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isNotEqual",
          values: ["12/12/2021"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });
    });

    describe("Operator Equal", () => {
      test.each([
        ["hi", true],
        [`="hi"`, true],
        ["aaa", false],
        ["42", false],
      ])("a string %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isEqual",
          values: ["hi"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["42", true],
        [`=42`, true],
        [`="42"`, false],
        ["aaa", false],
        ["422", false],
      ])("a number %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isEqual",
          values: ["42"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test.each([
        ["12/12/2021", true],
        ["=DATE(2021, 12, 12)", true],
        [`=42`, false],
        ["aaa", false],
        ["42", false],
      ])("a date %s", (cellContent, shouldMatch) => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isEqual",
          values: ["12/12/2021"],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", cellContent);
        const computedStyle = shouldMatch ? { fillColor: "#ff0f0f" } : {};
        expect(getStyle(model, "A1")).toEqual(computedStyle);
      });

      test("With a formula value that can be parsed as a number", () => {
        addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isEqual",
          values: ['="42"'],
          style: { fillColor: "#ff0f0f" },
        });
        setCellContent(model, "A1", "42");
        expect(getStyle(model, "A1")).toEqual({});
        setCellContent(model, "A1", "=CONCAT(4, 2)");
        expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      });
    });

    test("Operator IsEmpty", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isEmpty",
        values: [],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", " ");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A2", "");
      setCellContent(model, "A1", "=A2");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", '=""');
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", '=" "');
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });

      setCellContent(model, "A1", "helabclo");
      expect(getStyle(model, "A1")).toEqual({});
    });

    test("Operator IsNotEmpty", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "isNotEmpty",
        values: [],
        style: { fillColor: "#ff0f0f" },
      });
      setCellContent(model, "A1", "");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", " ");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "helabclo");
      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#ff0f0f",
      });
    });

    test("Operator dateIs", () => {
      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "dateIs",
        dateValue: "exactDate",
        values: ["10/10/2022"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "11/10/2022");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "10/10/2022");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
    });

    test("Operator dateIsAfter", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("01/01/2021 12:00:00"));

      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "dateIsAfter",
        dateValue: "today",
        values: ["10/10/2022"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "01/01/2021");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "01/02/2021");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      jest.useRealTimers();
    });

    test("Operator dateIsBefore", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("01/01/2021 12:00:00"));

      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "dateIsBefore",
        dateValue: "lastYear",
        values: ["10/10/2022"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "01/01/2020");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "12/31/2019");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      jest.useRealTimers();
    });

    test("Operator dateIsOnOrBefore", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("01/01/2021 12:00:00"));

      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "dateIsOnOrBefore",
        dateValue: "today",
        values: ["10/10/2022"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "01/02/2021");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "01/01/2021");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      jest.useRealTimers();
    });

    test("Operator dateIsOnOrAfter", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("01/01/2021 12:00:00"));

      addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: "dateIsOnOrAfter",
        dateValue: "lastYear",
        values: ["10/10/2022"],
        style: { fillColor: "#ff0f0f" },
      });

      setCellContent(model, "A1", "12/31/2019");
      expect(getStyle(model, "A1")).toEqual({});

      setCellContent(model, "A1", "01/01/2020");
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#ff0f0f" });
      jest.useRealTimers();
    });

    test.each([
      ["isEmpty", ["", ""]],
      ["isEmpty", []],
      ["isEmpty", [""]],
      ["isNotEmpty", ["", ""]],
      ["isNotEmpty", []],
      ["isNotEmpty", [""]],
      ["isGreaterThan", ["1", ""]],
      ["isGreaterThan", ["1"]],
      ["isGreaterOrEqualTo", ["1", ""]],
      ["isGreaterOrEqualTo", ["1"]],
      ["isLessThan", ["1"]],
      ["isLessThan", ["1", ""]],
      ["isLessOrEqualTo", ["1"]],
      ["isLessOrEqualTo", ["1", ""]],
      ["beginsWithText", ["1"]],
      ["beginsWithText", ["1", ""]],
      ["containsText", ["1"]],
      ["containsText", ["1", ""]],
      ["endsWithText", ["1"]],
      ["endsWithText", ["1", ""]],
      ["notContainsText", ["1"]],
      ["notContainsText", ["1", ""]],
      ["isBetween", ["1", "1"]],
      ["isNotBetween", ["1", "1"]],
    ])("%s operator with valid number of arguments: %s", (operator: string, values: string[]) => {
      const result = addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: operator as ConditionalFormattingOperatorValues,
        values: values,
        style: { fillColor: "#ff0f0f" },
      });
      expect(result).toBeSuccessfullyDispatched();
    });

    test.each([
      ["isEqual", []],
      ["isEqual", [""]],
      ["isNotEqual", []],
      ["isNotEqual", [""]],
      ["isGreaterThan", []],
      ["isGreaterThan", [""]],
      ["isGreaterThan", ["", "1"]],
      ["isGreaterOrEqualTo", []],
      ["isGreaterOrEqualTo", [""]],
      ["isLessThan", []],
      ["isLessThan", [""]],
      ["isLessOrEqualTo", []],
      ["isLessOrEqualTo", [""]],
      ["beginsWithText", []],
      ["beginsWithText", [""]],
      ["containsText", []],
      ["containsText", [""]],
      ["endsWithText", []],
      ["endsWithText", [""]],
      ["notContainsText", []],
      ["notContainsText", [""]],
      ["isBetween", ["", "1"]],
      ["isNotBetween", ["", "1"]],
    ])("%s operator with missing first argument %s", (operator: string, values: string[]) => {
      const result = addCfRule(model, "A1", {
        type: "CellIsRule",
        operator: operator as ConditionalFormattingOperatorValues,
        values: values,
        style: { fillColor: "#ff0f0f" },
      });
      expect(result).toBeCancelledBecause(CommandResult.FirstArgMissing);
    });

    test.each(["=$c:$2", "=suùù("])(
      "Invalid formula ('%s') cannot be set as CF value",
      (formula: string) => {
        const result = addCfRule(model, "A1", {
          type: "CellIsRule",
          operator: "isGreaterThan",
          values: [formula],
          style: { fillColor: "#ff0f0f" },
        });
        expect(result).toBeCancelledBecause(CommandResult.ValueCellIsInvalidFormula);
      }
    );
  });
  test.each([
    ["isBetween", ["1"]],
    ["isBetween", ["1", ""]],
    ["isNotBetween", ["1"]],
    ["isNotBetween", ["1", ""]],
  ])("%s operator with missing second argument %s", (operator: string, values: string[]) => {
    const result = addCfRule(model, "A1", {
      type: "CellIsRule",
      operator: operator as ConditionalFormattingOperatorValues,
      values: values,
      style: { fillColor: "#ff0f0f" },
    });
    expect(result).toBeCancelledBecause(CommandResult.SecondArgMissing);
  });
  test.each([
    ["isBetween", ["", ""]],
    ["isNotBetween", ["", ""]],
  ])("%s operator with both arguments missing %s", (operator: string, values: string[]) => {
    const result = addCfRule(model, "A1", {
      type: "CellIsRule",
      operator: operator as ConditionalFormattingOperatorValues,
      values: values,
      style: { fillColor: "#ff0f0f" },
    });
    expect(result).toBeCancelledBecause(
      CommandResult.FirstArgMissing,
      CommandResult.SecondArgMissing
    );
  });

  test("CF with cell referencing empty cell is treated as zero", () => {
    addCfRule(model, "A1", {
      values: ["0"],
      operator: "isEqual",
      type: "CellIsRule",
      style: { fillColor: "#FF0FFF" },
    });
    setCellContent(model, "A1", "=B1");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0FFF",
    });
  });

  describe("Icon set", () => {
    describe.each(["", "aaaa", "=SUM(1, 2)"])(
      "dispatch is not allowed if value is not a number",
      (value) => {
        test("lower inflection point is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.ValueUpperInflectionNaN);
        });
        test("upper inflection point is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.ValueLowerInflectionNaN);
        });
      }
    );

    test("refuse invalid formulas %s", () => {
      const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
        sheetId,
        ranges: toRangesData(sheetId, "A1"),
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "formula", value: "=INVALID(", operator: "gt" },
            upperInflectionPoint: { type: "formula", value: "=INVALID(", operator: "gt" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
      });
      expect(result).toBeCancelledBecause(
        CommandResult.ValueLowerInvalidFormula,
        CommandResult.ValueUpperInvalidFormula
      );
    });

    describe.each([
      ["number", "number"],
      ["percentage", "percentage"],
      ["percentile", "percentile"],
    ] as const)(
      "dispatch is not allowed if points not ascending (upper: %s , lower: %s)",
      (
        lowerInflectionPoint: "number" | "percentage" | "percentile",
        upperInflectionPoint: "number" | "percentage" | "percentile"
      ) => {
        test("upper bigger than lower", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.LowerBiggerThanUpper);
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
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
      expect(getStyle(model, "A1")).toEqual({});
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A1"))).toEqual(
        "arrowNeutral"
      );
    });

    test.each(["hello", "TRUE", "=TRUE", `="hello"`, ""])(
      "is not applied if cell is not a number: %s",
      (content) => {
        setCellContent(model, "A1", content);
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
          ranges: toRangesData(sheetId, "A1"),
          sheetId,
        });
        expect(getStyle(model, "A1")).toEqual({});
        expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A1"))).toBeUndefined();
      }
    );

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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A2"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A3"))).toEqual(
        "arrowNeutral"
      );
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A4"))).toEqual(
        "arrowNeutral"
      );
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A5"))).toEqual("arrowGood");
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A2"))).toEqual(
        "arrowNeutral"
      );
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A3"))).toEqual(
        "arrowNeutral"
      );
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A4"))).toEqual("arrowGood");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A5"))).toEqual("arrowGood");
    });

    test("same upper and lower inflection point", () => {
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A1"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A2"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A3"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A4"))).toEqual("arrowBad");
      expect(model.getters.getConditionalIcon(toCellPosition(sheetId, "A5"))).toEqual("arrowGood");
    });
  });
  describe("color scale", () => {
    describe.each(["", "aaaa", "=SUM(1, 2)"])(
      "dispatch is not allowed if value is not a number",
      (value) => {
        test("minimum is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "number", color: 1, value: value },
                maximum: { type: "number", color: 1, value: "1000" },
              },
            },
          });
          expect(result).toBeCancelledBecause(CommandResult.MinNaN);
        });
        test("midpoint is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.MidNaN);
        });
        test("maximum is NaN", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "number", color: 1, value: "1" },
                maximum: { type: "number", color: 1, value: value },
              },
            },
          });
          expect(result).toBeCancelledBecause(CommandResult.MaxNaN);
        });
      }
    );

    describe.each([
      ["number", "number", "number"],
      ["percentage", "percentage", "percentage"],
      ["percentile", "percentile", "percentile"],
    ] as const)(
      "dispatch is not allowed if points not ascending (min: %s , mid: %s, max: %s )",
      (
        minType: "number" | "percentage" | "percentile",
        midType: "number" | "percentage" | "percentile",
        maxType: "number" | "percentage" | "percentile"
      ) => {
        test("min bigger than max", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
            cf: {
              id: "1",
              rule: {
                type: "ColorScaleRule",
                minimum: { type: minType, color: 1, value: "10" },
                maximum: { type: maxType, color: 1, value: "1" },
              },
            },
          });
          expect(result).toBeCancelledBecause(CommandResult.MinBiggerThanMax);
        });
        test("mid bigger than max", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.MidBiggerThanMax);
        });
        test("min bigger than mid", () => {
          const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            ranges: toRangesData(sheetId, "A1"),
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
          expect(result).toBeCancelledBecause(CommandResult.MinBiggerThanMid);
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
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
      expect(getStyle(model, "A1")).toEqual({});
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#FF00FF",
      });
      expect(getStyle(model, "A2")).toEqual({
        fillColor: "#E705EE",
      });
      expect(getStyle(model, "A3")).toEqual({
        fillColor: "#592489",
      });
      expect(getStyle(model, "A4")).toEqual({
        fillColor: "#2A2F67",
      });
      expect(getStyle(model, "A5")).toEqual({
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#FF00FF",
      });
      expect(getStyle(model, "A2")).toEqual({
        fillColor: "#E705EE",
      });
      expect(getStyle(model, "A3")).toEqual({
        fillColor: "#592489",
      });
      expect(getStyle(model, "A4")).toEqual({
        fillColor: "#2A2F67",
      });
      expect(getStyle(model, "A5")).toEqual({
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#FF00FF",
      });
      expect(getStyle(model, "A2")).toEqual({
        fillColor: "#E705EE",
      });
      expect(getStyle(model, "A3")).toEqual({
        fillColor: "#592489",
      });
      expect(getStyle(model, "A4")).toEqual({
        fillColor: "#2A2F67",
      });
      expect(getStyle(model, "A5")).toEqual({
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
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });

      expect(getStyle(model, "A1")).toEqual({
        fillColor: "#808000",
      });
      expect(getStyle(model, "A2")).toEqual({
        fillColor: "#FF0000",
      });
      expect(getStyle(model, "A3")).toEqual({
        fillColor: "#00FF00",
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
        ranges: toRangesData(sheetId, "A1:A2"),
        sheetId,
      });

      expect(getStyle(model, "A1")).toEqual({});
      expect(getStyle(model, "A2")).toEqual({});
    });

    test("CF is updated with insert/delete cells", () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        ranges: toRangesData(sheetId, "A1:A10"),
        sheetId,
      });
      deleteCells(model, "A2:A3", "up");
      expect(model.getters.getConditionalFormats(sheetId)[0].ranges[0]).toBe("A1:A8");
    });

    test("Color scale with error cell in range", () => {
      setCellContent(model, "A1", "10");
      setCellContent(model, "A2", "=0/0");
      setCellContent(model, "A3", "1");

      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "1",
          { type: "value", color: 0xff00ff },
          { type: "value", color: 0x123456 }
        ),
        ranges: toRangesData(sheetId, "A1:A3"),
        sheetId,
      });
      expect(getStyle(model, "A1")).toEqual({ fillColor: "#123456" });
      expect(getStyle(model, "A2")).toEqual({});
      expect(getStyle(model, "A3")).toEqual({ fillColor: "#FF00FF" });
    });
  });

  test("CF evaluation uses default locale, and not current locale", () => {
    updateLocale(model, FR_LOCALE);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("01/12/2012", { fillColor: "#0000FF" }, "id"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    setCellContent(model, "A1", "01/12/2012");
    // Cf is 12 of January (commands should use canonical formatting), but cell is 1 of December (input in french locale)
    expect(getStyle(model, "A1")).toEqual({});
  });

  test("Can add a data bar rule with rangeValue having a differnet size than the cf range", () => {
    const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
          rangeValues: "A1:A2",
        },
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(result).toBeSuccessfullyDispatched;
  });

  test("Can add a data bar cf based on itself", () => {
    // prettier-ignore
    const grid = {
        A1: "2",
        A2: "4",
        A3: "8",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(25);
    expect(getDataBarFill(model, "A2")?.percentage).toBe(50);
    expect(getDataBarFill(model, "A3")?.percentage).toBe(100);
  });

  test("Can add a data bar cf based on another range", () => {
    // prettier-ignore
    const grid = {
        A1: "2", B1: "Hello",
        A2: "4", B2: "World",
        A3: "8", B3: "!",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
          rangeValues: "A1:A3",
        },
      },
      ranges: toRangesData(sheetId, "B1:B3"),
      sheetId,
    });
    expect(getDataBarFill(model, "B1")?.percentage).toBe(25);
    expect(getDataBarFill(model, "B2")?.percentage).toBe(50);
    expect(getDataBarFill(model, "B3")?.percentage).toBe(100);
  });

  test("Adding a data bar rule with rangeValues having smaller size than cf range should only apply rule on matching cells", () => {
    // prettier-ignore
    const grid = {
        A1: "A", B1: "2",
        A2: "B", B2: "4",
        A3: "C", B3: "8",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
          rangeValues: "B1:B2",
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(50);
    expect(getDataBarFill(model, "A2")?.percentage).toBe(100);
    expect(getDataBarFill(model, "A3")?.percentage).toBeUndefined();
  });

  test("Adding a data bar rule with rangeValues having bigger size than cf range should only apply rule on matching cells", () => {
    // prettier-ignore
    const grid = {
      A1: "A", B1: "2",
      A2: "B", B2: "4",
      A3: "C", B3: "8",
  };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
          rangeValues: "B1:B4",
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(25);
    expect(getDataBarFill(model, "A2")?.percentage).toBe(50);
    expect(getDataBarFill(model, "A3")?.percentage).toBe(100);
    expect(getDataBarFill(model, "A4")?.percentage).toBeUndefined();
  });

  test("Data bar CF with negative values", () => {
    // prettier-ignore
    const grid = {
        A1: "-2",
        A2: "-4",
        A3: "-8",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")).toBeUndefined();
    expect(getDataBarFill(model, "A2")).toBeUndefined();
    expect(getDataBarFill(model, "A3")).toBeUndefined();
  });

  test("Data bar CF with 0 values", () => {
    // prettier-ignore
    const grid = {
        A1: "2",
        A2: "1",
        A3: "0",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(100);
    expect(getDataBarFill(model, "A2")?.percentage).toBe(50);
    expect(getDataBarFill(model, "A3")).toBeUndefined();
  });

  test("Data bar CF with 0 as maximum", () => {
    // prettier-ignore
    const grid = {
        A1: "0",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")).toBeUndefined();
  });

  test("Ignore not number cells", () => {
    // prettier-ignore
    const grid = {
        A1: "10",
        A2: "Hello",
        A3: "World",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(100);
    expect(getDataBarFill(model, "A2")).toBeUndefined();
    expect(getDataBarFill(model, "A3")).toBeUndefined();
  });

  test("Ignore negative number cells", () => {
    // prettier-ignore
    const grid = {
        A1: "10",
        A2: "-10",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
        },
      },
      ranges: toRangesData(sheetId, "A1:A2"),
      sheetId,
    });
    expect(getDataBarFill(model, "A1")?.percentage).toBe(100);
    expect(getDataBarFill(model, "A2")).toBeUndefined();
  });

  test("range value range is adapted", () => {
    // prettier-ignore
    const grid = {
        B1: "2", C1: "Hello",
        B2: "4", C2: "World",
        B3: "8", C3: "!",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: 0xff0000,
          rangeValues: "B1:B3",
        },
      },
      ranges: toRangesData(sheetId, "C1:C3"),
      sheetId,
    });
    deleteColumns(model, ["A"]);
    expect(getDataBarFill(model, "B1")?.percentage).toBe(25);
    expect(getDataBarFill(model, "B2")?.percentage).toBe(50);
    expect(getDataBarFill(model, "B3")?.percentage).toBe(100);
  });

  test("conditional format with simple custom formula", () => {
    const grid = {
      A1: "2",
      A2: "4",
      A3: "2",
      A4: "4",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          values: ["=A1>3"],
          operator: "customFormula",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
      },
      ranges: toRangesData(sheetId, "C1:C6"),
      sheetId,
    });
    expect(getStyle(model, "C1")).toEqual({ fillColor: undefined });
    expect(getStyle(model, "C2")).toEqual({ fillColor: "#FF0000" });
    expect(getStyle(model, "C3")).toEqual({ fillColor: undefined });
    expect(getStyle(model, "C4")).toEqual({ fillColor: "#FF0000" });
  });

  test("conditional format with simple custom formula containing fixed range", () => {
    const grid = {
      A1: "2",
      A2: "4",
      A3: "2",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          values: ["=$A$2>3"],
          operator: "customFormula",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
      },
      ranges: toRangesData(sheetId, "C1:C6"),
      sheetId,
    });
    expect(getStyle(model, "C1")).toEqual({ fillColor: "#FF0000" });
    expect(getStyle(model, "C2")).toEqual({ fillColor: "#FF0000" });
    expect(getStyle(model, "C3")).toEqual({ fillColor: "#FF0000" });
  });

  test("custom formula not returning a boolean", () => {
    const grid = {
      B1: "Seattle",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          values: ["=1"],
          operator: "customFormula",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
      },
      ranges: toRangesData(sheetId, "B1:B10"),
      sheetId,
    });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "#FF0000" });
  });

  test("custom formula resulting to an error", () => {
    const grid = {
      B1: "Seattle",
    };
    const model = createModelFromGrid(grid);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          values: ["=0/0"],
          operator: "customFormula",
          type: "CellIsRule",
          style: {
            fillColor: "#FF0000",
          },
        },
      },
      ranges: toRangesData(sheetId, "B1:B10"),
      sheetId,
    });
    expect(getStyle(model, "B1")).toEqual({ fillColor: undefined });
  });
});
