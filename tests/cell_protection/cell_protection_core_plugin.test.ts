import { Model } from "../../src";
import { CommandResult, UID } from "../../src/types";
import {
  addCellProtectionRule,
  createSheet,
  duplicateSheet,
  redo,
  removeCellProtectionRule,
  undo,
} from "../test_helpers/commands_helpers";
import { getCellProtectionRule } from "../test_helpers/helpers";

describe("Cell protection", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can add a range cell protection rule", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
  });

  test("Can add a range cell protection rule with multipe ranges", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1", "B1:C2"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1", "B1:C2"],
    });
  });

  test("Cannot add a range cell protection rule with an empty range", () => {
    const result = addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: [],
    });
    expect(result.reasons).toEqual([CommandResult.EmptyRange]);
  });

  test("Cannot add a range cell protection rule with an invalid range", () => {
    const result = addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["OK"],
    });
    expect(result.reasons).toEqual([CommandResult.InvalidRange]);
  });

  test("Cannot add a range cell protection rule with an invalid sheet", () => {
    const result = addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId: "OK",
      ranges: ["A1"],
    });
    expect(result.reasons).toEqual([CommandResult.InvalidSheetId]);
  });

  test("Can add a sheet cell protection rule excluding certains cells", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1"],
    });
  });

  test("Can add a sheet cell protection rule excluding multiple ranges", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1", "B1:C2"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1", "B1:C2"],
    });
  });

  test("Can add a sheet cell protection rule for a whole sheet", () => {
    addCellProtectionRule(model, { id: "id", type: "sheet", sheetId: "Sheet1", excludeRanges: [] });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: [],
    });
  });

  test("Cannot add a sheet cell protection rule with invalid excluded ranges", () => {
    const result = addCellProtectionRule(model, {
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["OK"],
    });
    expect(result.reasons).toEqual([CommandResult.InvalidRange]);
  });

  test("Add a sheet cell protection rule with a sheet that already has protection updates the existing rule", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: [],
    });
    addCellProtectionRule(model, {
      id: "newId",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "sheet",
      sheetId: "Sheet1",
      excludeRanges: ["A1"],
    });
  });

  test("Adding a range cell protection rule with an existing id should replace the old one", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1:B2"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1:B2"],
    });
  });

  test("Can add a cell protection rule on an unbounded zone", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A:A"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A:A"],
    });
  });

  test("cell protection rules should not be copied on sheet duplication", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    duplicateSheet(model, sheetId, "newSheet");
    expect(getCellProtectionRule(model, "newSheet")).toBeUndefined();
  });

  test("Can remove a cell protection rule", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    expect(getCellProtectionRule(model, sheetId)).toBeDefined();
    removeCellProtectionRule(model, sheetId);
    expect(getCellProtectionRule(model, sheetId)).toBeUndefined();
  });

  test("Can undo/redo adding a cell protection rule", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    undo(model);
    expect(getCellProtectionRule(model, sheetId)).toBeUndefined();
    redo(model);
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
  });

  test("Can undo/redo removing a rule", () => {
    addCellProtectionRule(model, {
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    removeCellProtectionRule(model, sheetId);
    undo(model);
    expect(getCellProtectionRule(model, sheetId)).toMatchObject({
      id: "id",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    redo(model);
    expect(getCellProtectionRule(model, sheetId)).toBeUndefined();
  });

  test("Can import/export cell protection rules", () => {
    const sheet2 = "Sheet4";
    const sheet3 = "Sheet3";
    createSheet(model, { sheetId: sheet3 });
    createSheet(model, { sheetId: sheet2 });
    addCellProtectionRule(model, {
      id: "id1",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    addCellProtectionRule(model, {
      id: "id2",
      type: "range",
      sheetId: sheet2,
      ranges: ["B1:C2"],
    });
    addCellProtectionRule(model, {
      id: "id3",
      type: "sheet",
      sheetId: sheet3,
      excludeRanges: ["A1"],
    });
    const exported = model.exportData();
    expect(exported.sheets[0].cellProtectionRule).toEqual({
      id: "id1",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    expect(exported.sheets[1].cellProtectionRule).toEqual({
      id: "id2",
      type: "range",
      sheetId: sheet2,
      ranges: ["B1:C2"],
    });
    expect(exported.sheets[2].cellProtectionRule).toEqual({
      id: "id3",
      type: "sheet",
      sheetId: sheet3,
      excludeRanges: ["A1"],
    });
    const newModel = new Model(exported);
    expect(getCellProtectionRule(newModel, sheetId)).toEqual({
      id: "id1",
      type: "range",
      sheetId,
      ranges: ["A1"],
    });
    expect(getCellProtectionRule(newModel, sheet2)).toEqual({
      id: "id2",
      type: "range",
      sheetId: sheet2,
      ranges: ["B1:C2"],
    });
    expect(getCellProtectionRule(model, sheet3)).toMatchObject({
      id: "id3",
      type: "sheet",
      sheetId: sheet3,
      excludeRanges: ["A1"],
    });
  });
});
