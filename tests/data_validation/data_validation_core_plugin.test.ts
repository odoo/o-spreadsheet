import { CommandResult, Model } from "../../src";
import { DataValidationCriterion, UID } from "../../src/types";
import {
  addColumns,
  addDataValidation,
  addRows,
  deleteColumns,
  deleteRows,
  duplicateSheet,
  redo,
  removeDataValidation,
  undo,
} from "../test_helpers/commands_helpers";
import { getDataValidationRules } from "../test_helpers/helpers";

describe("Data validation", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("allowDispatch results", () => {
    test("Cannot add unknown criterion type", () => {
      const result = addDataValidation(model, "A1", "id", { type: "random" as any, values: ["1"] });
      expect(result).toBeCancelledBecause(CommandResult.UnknownDataValidationCriterionType);
    });

    test("Cannot add invalid criterion values", () => {
      let result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["abc", "oi"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidDataValidationCriterionValue);

      result = addDataValidation(model, "A1", "id", {
        type: "isValueInList",
        values: ["=56", "oi"], // Formulas are not allowed in isValueInList
        displayStyle: "arrow",
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidDataValidationCriterionValue);

      result = addDataValidation(model, "A1", "id", {
        type: "customFormula",
        values: ["oi"], // Only formulas are allowed in customFormula
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidDataValidationCriterionValue);
    });

    test("Cannot have too few or too many criterion values", () => {
      let result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["5"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidNumberOfCriterionValues);

      result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["5", "8", "78"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidNumberOfCriterionValues);
    });

    test("Cannot remove invalid data validation", () => {
      const result = removeDataValidation(model, "notAnExistingId");
      expect(result).toBeCancelledBecause(CommandResult.UnknownDataValidationRule);
    });
  });

  test("Can add a data validation rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
  });

  test("Duplicate values will be filtered out when adding a rule for value in the list", () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["1", "1", "2", "3", "2"],
      displayStyle: "arrow",
    });

    expect(getDataValidationRules(model, sheetId)[0].criterion.values).toEqual(["1", "2", "3"]);
  });

  test("Adding a rule with an existing id will replace the old one", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    addDataValidation(model, "A1:C2", "id", { type: "isBetween", values: ["1", "5"] });

    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "isBetween", values: ["1", "5"] },
        ranges: ["A1:C2"],
      },
    ]);
  });

  test("Can add data validation on an unbounded zone", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A:A", "id", criterion);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A:A"] },
    ]);
  });

  describe("Cell can only have a single rule applied to them", () => {
    test("Overlapping ranges", () => {
      addDataValidation(model, "A1:A5", "id", { type: "textContains", values: ["1"] });
      addDataValidation(model, "2:2", "id2", { type: "textContains", values: ["2"] });
      addDataValidation(model, "A2:B3", "id3", { type: "textContains", values: ["3"] });

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id", ranges: ["A1", "A4:A5"], criterion: { type: "textContains", values: ["1"] } },
        { id: "id2", ranges: ["C2:2"], criterion: { type: "textContains", values: ["2"] } },
        { id: "id3", ranges: ["A2:B3"], criterion: { type: "textContains", values: ["3"] } },
      ]);
    });

    test("When modifying existing range", () => {
      addDataValidation(model, "A1:A5", "id", { type: "textContains", values: ["1"] });
      addDataValidation(model, "B1:B5", "id2", { type: "textContains", values: ["2"] });

      addDataValidation(model, "A1:A2", "id2", { type: "textContains", values: ["2"] });

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id", ranges: ["A3:A5"], criterion: { type: "textContains", values: ["1"] } },
        { id: "id2", ranges: ["A1:A2"], criterion: { type: "textContains", values: ["2"] } },
      ]);
    });

    test("Rule is removed if another rule is applied to all its cells", () => {
      addDataValidation(model, "A1:A5", "id", { type: "textContains", values: ["1"] });
      addDataValidation(model, "A1:B6", "id2", { type: "textContains", values: ["1"] });

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id2", ranges: ["A1:B6"], criterion: { type: "textContains", values: ["1"] } },
      ]);
    });
  });

  test("data validation on sheet duplication", () => {
    const criterion: DataValidationCriterion = { type: "isBetween", values: ["1", "5"] };
    addDataValidation(model, "A1", "id", criterion);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1"] },
    ]);

    duplicateSheet(model, sheetId, "newSheet");
    expect(getDataValidationRules(model, "newSheet")).toMatchObject([
      { id: "id", criterion, ranges: ["A1"] },
    ]);
  });

  test("Can remove a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    expect(getDataValidationRules(model, sheetId)).not.toEqual([]);

    removeDataValidation(model, "id");
    expect(getDataValidationRules(model, sheetId)).toEqual([]);
  });

  test("Can undo/redo adding a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    addDataValidation(model, "A1:C2", "id", { type: "isBetween", values: ["1", "5"] });

    undo(model);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
    undo(model);
    expect(getDataValidationRules(model, sheetId)).toEqual([]);

    redo(model);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
    redo(model);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "isBetween", values: ["1", "5"] },
        ranges: ["A1:C2"],
      },
    ]);
  });

  test("Can undo/redo removing a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    removeDataValidation(model, "id");

    undo(model);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);

    redo(model);
    expect(getDataValidationRules(model, sheetId)).toEqual([]);
  });

  test("Can import/export data validation rules", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    addDataValidation(model, "B:B", "id2", { type: "isBetween", values: ["1", "8"] }, "blocking");

    const exported = model.exportData();

    expect(exported.sheets[0].dataValidationRules).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
        isBlocking: false,
      },
      {
        id: "id2",
        criterion: { type: "isBetween", values: ["1", "8"] },
        ranges: ["B:B"],
        isBlocking: true,
      },
    ]);

    const newModel = new Model(exported);
    expect(getDataValidationRules(newModel, sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
        isBlocking: false,
      },
      {
        id: "id2",
        criterion: { type: "isBetween", values: ["1", "8"] },
        ranges: ["B:B"],
        isBlocking: true,
      },
    ]);
  });

  describe("Grid manipulation", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };

    test("On row addition", () => {
      addDataValidation(model, "A1", "id1", criterion);
      addDataValidation(model, "B1:B2", "id2", criterion);
      addDataValidation(model, "C4:D4", "id3", criterion);
      addDataValidation(model, "F1, F7", "id4", criterion);

      addRows(model, "after", 0, 2);

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id1", ranges: ["A1"], criterion, isBlocking: false },
        { id: "id2", ranges: ["B1:B4"], criterion, isBlocking: false },
        { id: "id3", ranges: ["C6:D6"], criterion, isBlocking: false },
        { id: "id4", ranges: ["F1", "F9"], criterion, isBlocking: false },
      ]);
    });

    test("On column addition", () => {
      addDataValidation(model, "A1", "id1", criterion);
      addDataValidation(model, "A2:B2", "id2", criterion);
      addDataValidation(model, "C4:D5", "id3", criterion);
      addDataValidation(model, "A7, F7", "id4", criterion);

      addColumns(model, "after", "A", 2);

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id1", ranges: ["A1"], criterion, isBlocking: false },
        { id: "id2", ranges: ["A2:D2"], criterion, isBlocking: false },
        { id: "id3", ranges: ["E4:F5"], criterion, isBlocking: false },
        { id: "id4", ranges: ["A7", "H7"], criterion, isBlocking: false },
      ]);
    });

    test("On row deletion", () => {
      addDataValidation(model, "A1", "id1", criterion);
      addDataValidation(model, "B1:B2", "id2", criterion);
      addDataValidation(model, "E2:E3", "id3", criterion);
      addDataValidation(model, "C4:D4", "id4", criterion);
      addDataValidation(model, "F2, F7", "id5", criterion);

      deleteRows(model, [1, 2]);

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id1", ranges: ["A1"], criterion, isBlocking: false },
        { id: "id2", ranges: ["B1"], criterion, isBlocking: false },
        { id: "id4", ranges: ["C2:D2"], criterion, isBlocking: false },
        { id: "id5", ranges: ["F5"], criterion, isBlocking: false },
      ]);
    });

    test("On column deletion", () => {
      addDataValidation(model, "A1", "id1", criterion);
      addDataValidation(model, "A2:B2", "id2", criterion);
      addDataValidation(model, "B3:C3", "id3", criterion);
      addDataValidation(model, "D4:E5", "id4", criterion);
      addDataValidation(model, "B7, F7", "id5", criterion);

      deleteColumns(model, ["B", "C"]);

      expect(getDataValidationRules(model, sheetId)).toMatchObject([
        { id: "id1", ranges: ["A1"], criterion, isBlocking: false },
        { id: "id2", ranges: ["A2"], criterion, isBlocking: false },
        { id: "id4", ranges: ["B4:C5"], criterion, isBlocking: false },
        { id: "id5", ranges: ["D7"], criterion, isBlocking: false },
      ]);
    });
  });
});
