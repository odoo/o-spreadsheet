import { CellErrorType, Model } from "@odoo/o-spreadsheet-engine";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { CommandResult } from "../../src";
import {
  createNamedRange,
  createSheet,
  deleteNamedRange,
  getCell,
  getEvaluatedCell,
  redo,
  setCellContent,
  undo,
  updateNamedRange,
} from "../test_helpers";

let model: Model;

beforeEach(() => {
  model = new Model();
});

describe("Named range plugin", () => {
  describe("Command results", () => {
    test("Cannot create a named range with an already existing name", () => {
      expect(createNamedRange(model, "MyRange", "A1")).toBeSuccessfullyDispatched();
      expect(createNamedRange(model, "MyRange", "A1")).toBeCancelledBecause(
        CommandResult.NamedRangeNameAlreadyExists
      );
    });

    test("Cannot create a named range with an invalid name", () => {
      expect(createNamedRange(model, "AB12", "A1")).toBeCancelledBecause(
        CommandResult.NamedRangeNameLooksLikeCellReference
      );
      expect(createNamedRange(model, "Invalid Name", "A1")).toBeCancelledBecause(
        CommandResult.NamedRangeNameWithInvalidCharacter
      );
      expect(createNamedRange(model, "InvalidName!", "A1")).toBeCancelledBecause(
        CommandResult.NamedRangeNameWithInvalidCharacter
      );
      expect(createNamedRange(model, "122", "A1")).toBeCancelledBecause(
        CommandResult.NamedRangeNameWithInvalidCharacter
      );
    });

    test("Cannot update a named range that does not exist", () => {
      expect(updateNamedRange(model, "NonExistentRange", "NewName", "C3:D4")).toBeCancelledBecause(
        CommandResult.NamedRangeNotFound
      );
    });

    test("Cannot update a named range to an already existing or invalid name", () => {
      createNamedRange(model, "RangeOne", "A1");
      createNamedRange(model, "RangeTwo", "A1");

      expect(updateNamedRange(model, "RangeTwo", "RangeOne", "C3:D4")).toBeCancelledBecause(
        CommandResult.NamedRangeNameAlreadyExists
      );
      expect(updateNamedRange(model, "RangeTwo", "Invalid Name", "C3:D4")).toBeCancelledBecause(
        CommandResult.NamedRangeNameWithInvalidCharacter
      );
    });

    test("Cannot delete a named range that does not exist", () => {
      createNamedRange(model, "RangeOne", "A1");
      expect(deleteNamedRange(model, "RangeOne")).toBeSuccessfullyDispatched();
      expect(deleteNamedRange(model, "RangeOne")).toBeCancelledBecause(
        CommandResult.NamedRangeNotFound
      );
    });
  });

  test("Can create, update, and delete a named range", () => {
    createNamedRange(model, "MyRange", "A1:B2");
    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "MyRange",
      range: { zone: toZone("A1:B2") },
    });

    updateNamedRange(model, "MyRange", "RenamedRange", "C3:D4");
    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "RenamedRange",
      range: { zone: toZone("C3:D4") },
    });

    deleteNamedRange(model, "RenamedRange");
    expect(model.getters.getNamedRanges()).toHaveLength(0);
  });

  test("Updating a named range keep the order of the ranges", () => {
    createNamedRange(model, "FirstRange", "A1");
    createNamedRange(model, "SecondRange", "B2");
    createNamedRange(model, "ThirdRange", "C3");

    updateNamedRange(model, "SecondRange", "UpdatedSecondRange", "D4");

    expect(model.getters.getNamedRanges()).toMatchObject([
      { rangeName: "FirstRange" },
      { rangeName: "UpdatedSecondRange" },
      { rangeName: "ThirdRange" },
    ]);
  });

  test("Renaming a named range changes the formulas with this ranges", () => {
    createNamedRange(model, "FirstRange", "A1");
    createNamedRange(model, "SecondRange", "B2");
    createNamedRange(model, "SUM", "C3");

    setCellContent(model, "A1", "=FirstRange + SecondRange");
    setCellContent(model, "A2", "=SECONDRange * 2");
    setCellContent(model, "A3", "SecondRange");
    setCellContent(model, "A4", '="SecondRange"');

    updateNamedRange(model, "SecondRange", "HelloThere", "A1");
    expect(getCell(model, "A1")?.content).toEqual("=FirstRange + HelloThere");
    expect(getCell(model, "A2")?.content).toEqual("=HelloThere * 2");
    expect(getCell(model, "A3")?.content).toEqual("SecondRange");
    expect(getCell(model, "A4")?.content).toEqual('="SecondRange"');

    createNamedRange(model, "SUM", "C3");
    setCellContent(model, "A5", "=SUM(25)");
    setCellContent(model, "A6", "=SUM + 10");

    updateNamedRange(model, "SUM", "SUMMIT", "A1");
    expect(getCell(model, "A5")?.content).toEqual("=SUM(25)"); // SUM functions should not be changed
    expect(getCell(model, "A6")?.content).toEqual("=SUMMIT + 10");
  });

  test("Named ranges are case insensitive", () => {
    createNamedRange(model, "FirstRange", "A1");
    expect(createNamedRange(model, "firstrange", "B2")).toBeCancelledBecause(
      CommandResult.NamedRangeNameAlreadyExists
    );

    expect(model.getters.getNamedRange("FIRSTRANGE")).toMatchObject({ rangeName: "FirstRange" });

    setCellContent(model, "A1", "10");
    setCellContent(model, "B1", "=FiRstRaNgE");
    expect(getEvaluatedCell(model, "B1").value).toBe(10);
  });

  test("Can undo/redo named ranges commands", () => {
    createNamedRange(model, "MyRange", "A1:B2");
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("MyRange");

    undo(model);
    expect(model.getters.getNamedRanges()).toHaveLength(0);

    redo(model);
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("MyRange");

    updateNamedRange(model, "MyRange", "RenamedRange", "C3:D4");
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("RenamedRange");

    undo(model);
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("MyRange");

    redo(model);
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("RenamedRange");

    deleteNamedRange(model, "RenamedRange");
    expect(model.getters.getNamedRanges()).toHaveLength(0);

    undo(model);
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("RenamedRange");

    redo(model);
    expect(model.getters.getNamedRanges()).toHaveLength(0);
  });

  test("Can export/import named ranges", () => {
    createNamedRange(model, "MyRange", "A1:B2");
    createSheet(model, { sheetId: "sh2" });
    createNamedRange(model, "AnotherRange", "C3:D4", "sh2");

    const exportedData = model.exportData();
    expect(exportedData.namedRanges).toEqual([
      { rangeName: "MyRange", rangeString: "Sheet1!A1:B2" },
      { rangeName: "AnotherRange", rangeString: "Sheet2!C3:D4" },
    ]);

    const newModel = new Model(exportedData);
    expect(newModel.getters.getNamedRanges()).toHaveLength(2);
    expect(newModel.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "MyRange",
      range: { zone: toZone("A1:B2"), sheetId: newModel.getters.getActiveSheetId() },
    });
    expect(newModel.getters.getNamedRanges()[1]).toMatchObject({
      rangeName: "AnotherRange",
      range: { zone: toZone("C3:D4"), sheetId: "sh2" },
    });
  });

  test("Can use named ranges in formulas", () => {
    createNamedRange(model, "MyRange", "A1:A3");
    setCellContent(model, "B1", "=SUM(MyRange)");
    setCellContent(model, "A1", "10");
    setCellContent(model, "A2", "20");

    expect(getEvaluatedCell(model, "B1").value).toBe(30);

    setCellContent(model, "C1", "=MyRange + 5");
    expect(getEvaluatedCell(model, "C1").value).toBe(15);
    expect(getEvaluatedCell(model, "C2").value).toBe(25);
    expect(getEvaluatedCell(model, "C3").value).toBe(5);
  });

  test("Can use unbounded zones in named ranges", () => {
    createSheet(model, { sheetId: "sh2", rows: 3 });
    createNamedRange(model, "MyRange", "A:A", "sh2");

    const namedRange = model.getters.getNamedRanges()[0];
    expect(model.getters.getRangeString(namedRange.range)).toEqual("Sheet2!A:A");

    setCellContent(model, "A1", "5", "sh2");
    setCellContent(model, "A1", "=MyRange + 10");

    expect(getEvaluatedCell(model, "A1").value).toBe(15);
    expect(getEvaluatedCell(model, "A2").value).toBe(10);
    expect(getEvaluatedCell(model, "A3").value).toBe(10);
    expect(getEvaluatedCell(model, "A4").value).toBe(null);
  });

  test("Creating/updating/deleting a named range re-evaluate cells", () => {
    setCellContent(model, "A1", "10");
    setCellContent(model, "B1", "=SUM(MyRange)");
    setCellContent(model, "C1", "=SUM(MyRange2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(CellErrorType.BadExpression);

    createNamedRange(model, "MyRange", "A1:A2");
    expect(getEvaluatedCell(model, "B1").value).toBe(10);
    expect(getEvaluatedCell(model, "C1").value).toBe(CellErrorType.BadExpression);

    updateNamedRange(model, "MyRange", "MyRange2", "A1:A3");
    expect(getEvaluatedCell(model, "B1").value).toBe(10);
    expect(getEvaluatedCell(model, "C1").value).toBe(10);

    deleteNamedRange(model, "MyRange2");
    expect(getEvaluatedCell(model, "B1").value).toBe(CellErrorType.BadExpression);
    expect(getEvaluatedCell(model, "C1").value).toBe(CellErrorType.BadExpression);
  });

  test("Updating the values in a named range re-evaluates formulas with this named range", () => {
    setCellContent(model, "A1", "10");
    createNamedRange(model, "MyRange", "A1:A2");
    setCellContent(model, "B1", "=SUM(MyRange)");

    expect(getEvaluatedCell(model, "B1").value).toBe(10);

    setCellContent(model, "A2", "20");
    expect(getEvaluatedCell(model, "B1").value).toBe(30);
  });

  test("Evaluation cycles are detected in named ranges", () => {
    createNamedRange(model, "MyRange", "A1:A2");
    setCellContent(model, "A1", "=SUM(MyRange)");
    expect(getEvaluatedCell(model, "A1").value).toBe(CellErrorType.CircularDependency);
  });

  test("Can use named range in getter evaluateFormula", () => {
    createNamedRange(model, "MyRange", "A1:A2");
    setCellContent(model, "A1", "15");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.evaluateFormula(sheetId, "=SUM(MyRange) + 5")).toBe(20);
  });

  test("Named ranges works both for single cell and multiple cell ranges", () => {
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");

    createNamedRange(model, "SingleCellRange", "A1");
    expect(model.getters.evaluateFormula(sheetId, "=SingleCellRange")).toEqual(42);

    createNamedRange(model, "MultiCellRange", "A1:A2");
    expect(model.getters.evaluateFormula(sheetId, "=MultiCellRange")).toEqual([[42, 0]]);
  });
});
