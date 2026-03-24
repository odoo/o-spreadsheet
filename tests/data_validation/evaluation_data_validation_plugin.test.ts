import { Model } from "../../src";
import { CellPosition, DataValidationCriterion, UID } from "../../src/types";
import {
  addDataValidation,
  duplicateSheet,
  removeDataValidation,
  setCellContent,
  setFormat,
} from "../test_helpers/commands_helpers";
import { createModel } from "../test_helpers/helpers";

describe("Data validation evaluation", () => {
  let model: Model;
  let sheetId: UID;
  let A1: CellPosition;

  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
    A1 = { sheetId, col: 0, row: 0 };
  });

  test("data validation rule", async () => {
    await addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });

    await setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(model.getters.getInvalidDataValidationMessage(A1)?.toString()).toEqual(
      'The value must be a text that contains "test"'
    );

    await setCellContent(model, "A1", "random text test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    expect(model.getters.getInvalidDataValidationMessage(A1)).toBeUndefined();
  });

  test("empty cells are not invalid", async () => {
    await addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("data validation on sheet duplication", async () => {
    await addDataValidation(model, "A1", "id", { type: "containsText", values: ["test"] });

    await setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(model.getters.getInvalidDataValidationMessage(A1)?.toString()).toEqual(
      'The value must be a text that contains "test"'
    );

    await duplicateSheet(model, sheetId, "newSheet");
    expect(model.getters.isDataValidationInvalid({ ...A1, sheetId: "newSheet" })).toEqual(true);
    expect(
      model.getters.getInvalidDataValidationMessage({ ...A1, sheetId: "newSheet" })?.toString()
    ).toEqual('The value must be a text that contains "test"');
  });

  test("style is applied in cell with arrow display", async () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A", "B"],
      colors: { B: "#EA9999" },
      displayStyle: "arrow",
    };
    await addDataValidation(model, "A1", "id", criterion);
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    await setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    await setCellContent(model, "A1", "B");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({
      fillColor: "#EA9999",
      textColor: "#FDF5F5",
    });
  });

  test("style is removed when data validation is removed", async () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A"],
      colors: { A: "#EA9999" },
      displayStyle: "arrow",
    };
    await addDataValidation(model, "A1", "id", criterion);
    await setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({
      fillColor: "#EA9999",
      textColor: "#FDF5F5",
    });
    await removeDataValidation(model, "id");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
  });

  test("style is applied in cell with chip display", async () => {
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["A", "B"],
      colors: { B: "#EA9999" },
      displayStyle: "chip",
    };
    await addDataValidation(model, "A1", "id", criterion);
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    await setCellContent(model, "A1", "A");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    await setCellContent(model, "A1", "B");
    expect(model.getters.getCellComputedStyle(A1)).toEqual({});
    expect(model.getters.getDataValidationChipStyle(A1)).toEqual({
      textColor: "#FDF5F5",
      fillColor: "#EA9999",
    });
  });

  test("style is applied on numbers", async () => {
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
    await addDataValidation(model, "A1", "id", criterion);
    await setCellContent(model, "A1", "4");
    expect(model.getters.getCellComputedStyle(A1)).toEqual(expectedStyle);
    await setFormat(model, "A1", "0.00");
    expect(model.getters.getCellComputedStyle(A1)).toEqual(expectedStyle);
  });

  describe("Formula values", () => {
    test("Can use formula values", async () => {
      await addDataValidation(model, "A1", "id", {
        type: "containsText",
        values: ['=CONCAT("te", "st")'],
      });

      await setCellContent(model, "A1", "random text");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      await setCellContent(model, "A1", "random test");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("applies data validation correctly when formula returns a 1x1 matrix", async () => {
      await addDataValidation(model, "A1:A2", "id", {
        type: "containsText",
        values: ['=IF(1=1, $A$1, "something else")'],
      });

      await setCellContent(model, "A1", "random text");
      await setCellContent(model, "A2", "text");
      expect(model.getters.isDataValidationInvalid(A1)).toBe(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 0, row: 1 })).toBe(true);
    });

    test("Criterion with spreading formula values is ignored ", async () => {
      await addDataValidation(model, "A1", "id", {
        type: "isGreaterThan",
        values: ["=MUNIT(3)"],
      });

      await setCellContent(model, "A1", "8");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("Can use references in formula values", async () => {
      await addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["=B1", "=B2"],
      });
      await setCellContent(model, "B1", "5");
      await setCellContent(model, "B2", "10");

      await setCellContent(model, "A1", "4");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      await setCellContent(model, "A1", "5");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("References in formula are translated based on the cell offset in the validation rule", async () => {
      await addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=C1"],
        dateValue: "exactDate",
      });
      await setCellContent(model, "C1", "1/1/2020");
      await setCellContent(model, "D2", "1/2/2020");

      await setCellContent(model, "A1", "1/1/2020");
      await setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });

    test("References in formula are not shifted with fixed references", async () => {
      await addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=$C$1"],
        dateValue: "exactDate",
      });
      await setCellContent(model, "C1", "1/1/2020");
      await setCellContent(model, "D2", "1/2/2020");

      await setCellContent(model, "A1", "1/1/2020");
      await setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(true);

      await setCellContent(model, "B2", "1/1/2020");
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });
  });

  test("data validation is updated on cell format change", async () => {
    await setFormat(model, "A2", "0.00");
    await addDataValidation(model, "A1", "id", { type: "containsText", values: ["m"] });

    await setCellContent(model, "A1", '=CELL("format", A2)');
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    await setFormat(model, "A2", "mm/dd/yyyy");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });
});
