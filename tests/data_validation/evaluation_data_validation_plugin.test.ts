import { Model } from "../../src";
import { CellPosition, DataValidationCriterion, UID } from "../../src/types";
import {
  addDataValidation,
  duplicateSheet,
  removeDataValidation,
  setCellContent,
  setFormat,
} from "../test_helpers/commands_helpers";
import { toCellPosition } from "../test_helpers/helpers";

describe("Data validation evaluation", () => {
  let model: Model;
  let sheetId: UID;
  let A1: CellPosition;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    A1 = { sheetId, col: 0, row: 0 };
  });

  test("data validation rule", () => {
    addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });

    setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(model.getters.getInvalidDataValidationMessage(A1)?.toString()).toEqual(
      'The value must be a text that contains "test"'
    );

    setCellContent(model, "A1", "random text test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    expect(model.getters.getInvalidDataValidationMessage(A1)).toBeUndefined();
  });

  test("empty cells are not invalid", () => {
    addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("data validation on sheet duplication", () => {
    addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });

    setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(model.getters.getInvalidDataValidationMessage(A1)?.toString()).toEqual(
      'The value must be a text that contains "test"'
    );

    duplicateSheet(model, sheetId, "newSheet");
    expect(model.getters.isDataValidationInvalid({ ...A1, sheetId: "newSheet" })).toEqual(true);
    expect(
      model.getters.getInvalidDataValidationMessage({ ...A1, sheetId: "newSheet" })?.toString()
    ).toEqual('The value must be a text that contains "test"');
  });

  test("style is applied in cell with arrow display", () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A", "B"],
      colors: { B: "#EA9999" },
      displayStyle: "arrow",
    };
    addDataValidation(model, "A1", "id", criterion);
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    setCellContent(model, "A1", "B");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({
      fillColor: "#EA9999",
      textColor: "#FDF5F5",
    });
  });

  test("style is removed when data validation is removed", () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A"],
      colors: { A: "#EA9999" },
      displayStyle: "arrow",
    };
    addDataValidation(model, "A1", "id", criterion);
    setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({
      fillColor: "#EA9999",
      textColor: "#FDF5F5",
    });
    removeDataValidation(model, "id");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
  });

  test("style is applied in cell with chip display", () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A", "B"],
      colors: { B: "#EA9999" },
      displayStyle: "chip",
    };
    addDataValidation(model, "A1", "id", criterion);
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    setCellContent(model, "A1", "B");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    expect(model.getters.getDataValidationChipStyle(A1)).toEqual({
      textColor: "#FDF5F5",
      fillColor: "#EA9999",
    });
  });

  test("style is applied on numbers", () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["4"],
      colors: { 4: "#EA9999" },
      displayStyle: "arrow",
    };
    const expectedStyle = {
      fillColor: "#EA9999",
      textColor: "#FDF5F5",
    };
    addDataValidation(model, "A1", "id", criterion);
    setCellContent(model, "A1", "4");
    expect(model.getters.getCellComputedStyle(A1)).toEqual(expectedStyle);
    setFormat(model, "A1", "0.00");
    expect(model.getters.getCellComputedStyle(A1)).toEqual(expectedStyle);
  });

  describe("Formula values", () => {
    test("Can use formula values", () => {
      addDataValidation(model, "A1", "id", {
        type: "containsText",
        values: ['=CONCAT("te", "st")'],
      });

      setCellContent(model, "A1", "random text");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      setCellContent(model, "A1", "random test");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("applies data validation correctly when formula returns a 1x1 matrix", () => {
      addDataValidation(model, "A1:A2", "id", {
        type: "containsText",
        values: ['=IF(1=1, $A$1, "something else")'],
      });

      setCellContent(model, "A1", "random text");
      setCellContent(model, "A2", "text");
      expect(model.getters.isDataValidationInvalid(A1)).toBe(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 0, row: 1 })).toBe(true);
    });

    test("Criterion with spreading formula values is ignored ", () => {
      addDataValidation(model, "A1", "id", {
        type: "isGreaterThan",
        values: ["=MUNIT(3)"],
      });

      setCellContent(model, "A1", "8");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("Can use references in formula values", () => {
      addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["=B1", "=B2"],
      });
      setCellContent(model, "B1", "5");
      setCellContent(model, "B2", "10");

      setCellContent(model, "A1", "4");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      setCellContent(model, "A1", "5");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("References in formula are translated based on the cell offset in the validation rule", () => {
      addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=C1"],
        dateValue: "exactDate",
      });
      setCellContent(model, "C1", "1/1/2020");
      setCellContent(model, "D2", "1/2/2020");

      setCellContent(model, "A1", "1/1/2020");
      setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });

    test("References in formula are not shifted with fixed references", () => {
      addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=$C$1"],
        dateValue: "exactDate",
      });
      setCellContent(model, "C1", "1/1/2020");
      setCellContent(model, "D2", "1/2/2020");

      setCellContent(model, "A1", "1/1/2020");
      setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(true);

      setCellContent(model, "B2", "1/1/2020");
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });
  });

  test("data validation is updated on cell format change", () => {
    setFormat(model, "A2", "0.00");
    addDataValidation(model, "A1", "id", { type: "containsText", values: ["m"] });

    setCellContent(model, "A1", '=CELL("format", A2)');
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    setFormat(model, "A2", "mm/dd/yyyy");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("DV evaluation can be based on position-related formulas", () => {
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "5");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    setCellContent(model, "B3", "3");
    setCellContent(model, "B4", "2");
    setCellContent(model, "B5", "4");
    setCellContent(model, "B6", "6");
    addDataValidation(model, "A1:A4,B3:B6", "id", { type: "isEqual", values: ["=ROW()"] });
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A1"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A2"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A3"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A4"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B3"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B4"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B5"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B6"))).toEqual(false);

    addDataValidation(model, "A1:B6", "id", { type: "isEqual", values: ["=ROW()"] });
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A1"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A2"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A3"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "A4"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B3"))).toEqual(false);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B4"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B5"))).toEqual(true);
    expect(model.getters.isDataValidationInvalid(toCellPosition(sheetId, "B6"))).toEqual(false);
  });
});
