import { Model } from "../../src";
import { CellPosition, UID } from "../../src/types";
import {
  addDataValidation,
  duplicateSheet,
  setCellContent,
  setFormat,
} from "../test_helpers/commands_helpers";

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
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["test"] });

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
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["test"] });
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("data validation on sheet duplication", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["test"] });

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

  describe("Formula values", () => {
    test("Can use formula values", () => {
      addDataValidation(model, "A1", "id", {
        type: "textContains",
        values: ['=CONCAT("te", "st")'],
      });

      setCellContent(model, "A1", "random text");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      setCellContent(model, "A1", "random test");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
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
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["m"] });

    setCellContent(model, "A1", '=CELL("format", A2)');
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    setFormat(model, "A2", "mm/dd/yyyy");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });
});
