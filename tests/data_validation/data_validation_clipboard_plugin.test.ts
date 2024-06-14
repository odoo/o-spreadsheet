import { Model } from "../../src";
import { DataValidationCriterion, UID } from "../../src/types";
import {
  activateSheet,
  addDataValidation,
  copy,
  createSheet,
  cut,
  deleteSheet,
  paste,
  removeDataValidation,
} from "../test_helpers/commands_helpers";
import { getDataValidationRules } from "../test_helpers/helpers";

describe("Data validation", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can copy data validation rule on same sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    copy(model, "A1:A5");

    paste(model, "C1");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1:A5", "C1:C5"] },
    ]);
  });

  test("Can copy data validation rule on another sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    copy(model, "A1:A5");

    createSheet(model, { sheetId: "sheet2", activate: true });
    paste(model, "C1");
    expect(getDataValidationRules(model, "sheet2")).toMatchObject([
      { id: expect.any(String), criterion, ranges: ["C1:C5"] },
    ]);

    paste(model, "E1");
    expect(getDataValidationRules(model, "sheet2")).toMatchObject([
      { id: expect.any(String), criterion, ranges: ["C1:C5", "E1:E5"] },
    ]);
  });

  test("Can cut/paste part of data validation rule on same sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    cut(model, "A4");
    paste(model, "C1");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1:A3", "A5", "C1"] },
    ]);
  });

  test("Can cut/paste whole data validation rule on same sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    cut(model, "A1:A5");
    paste(model, "C1");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["C1:C5"] },
    ]);
  });

  test("Can cut/paste part of data validation rule on another sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    cut(model, "A4");

    createSheet(model, { sheetId: "sheet2", activate: true });
    paste(model, "C1");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1:A3", "A5"] },
    ]);
    expect(getDataValidationRules(model, "sheet2")).toMatchObject([
      { id: expect.any(String), criterion, ranges: ["C1"] },
    ]);
  });

  test("Can cut/paste whole validation rule on another sheet", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    cut(model, "A1:A5");

    createSheet(model, { sheetId: "sheet2", activate: true });
    paste(model, "C1");
    expect(getDataValidationRules(model, sheetId)).toEqual([]);
    expect(getDataValidationRules(model, "sheet2")).toMatchObject([
      { id: expect.any(String), criterion, ranges: ["C1:C5"] },
    ]);
  });

  test("Paste as value or paste format only don't paste data validation", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    copy(model, "A1:A5");
    paste(model, "C1", "onlyFormat");

    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1:A5"] },
    ]);

    paste(model, "C1", "asValue");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["A1:A5"] },
    ]);
  });

  test("copy paste DV in another sheet => change DV => copy paste again doesnt overwrite the previously pasted DV", () => {
    const model = new Model();
    createSheet(model, { sheetId: "sheet2" });
    const sheet1Id = model.getters.getSheetIds()[0];
    const sheet2Id = model.getters.getSheetIds()[1];

    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });

    copy(model, "A1");
    activateSheet(model, sheet2Id);
    paste(model, "A1");
    expect(getDataValidationRules(model, sheet2Id)).toMatchObject([
      { criterion: { values: ["1"] }, ranges: ["A1"] },
    ]);

    activateSheet(model, sheet1Id);
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["5"] });
    copy(model, "A1");
    activateSheet(model, sheet2Id);
    paste(model, "B2");
    expect(getDataValidationRules(model, sheet2Id)).toMatchObject([
      { criterion: { values: ["1"] }, ranges: ["A1"] },
      { criterion: { values: ["5"] }, ranges: ["B2"] },
    ]);
  });

  test("Can copy/paste empty cell to clear data validation rule", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    copy(model, "A6");
    paste(model, "A1");

    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: expect.any(String), criterion, ranges: ["A2:A5"] },
    ]);
  });

  test("copy cells with DV => delete original DV => paste => should paste cells with copied DV", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    addDataValidation(model, "A1:A5", "id", criterion);
    copy(model, "A1:A5");

    removeDataValidation(model, "id");

    paste(model, "C1");

    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id", criterion, ranges: ["C1:C5"] },
    ]);
  });

  test("copy zone with independant multiple DV => delete original DV => paste => should paste cells with copied DV", () => {
    const criterion1: DataValidationCriterion = { type: "textContains", values: ["1"] };
    const criterion2: DataValidationCriterion = { type: "textContains", values: ["2"] };
    addDataValidation(model, "A1:A5", "id1", criterion1);
    addDataValidation(model, "C1:C5", "id2", criterion2);

    copy(model, "A1:C5");

    removeDataValidation(model, "id1");
    removeDataValidation(model, "id2");

    paste(model, "E1");

    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { id: "id1", criterion: criterion1, ranges: ["E1:E5"] },
      { id: "id2", criterion: criterion2, ranges: ["G1:G5"] },
    ]);
  });

  test("copy zone with independant multiple DV => delete origin sheet => paste => should paste cells with copied DV", () => {
    const criterion1: DataValidationCriterion = { type: "textContains", values: ["1"] };
    const criterion2: DataValidationCriterion = { type: "textContains", values: ["2"] };
    addDataValidation(model, "A1:A5", "id1", criterion1);
    addDataValidation(model, "C1:C5", "id2", criterion2);

    copy(model, "A1:C5");

    createSheet(model, { sheetId: "Sheet2" });
    deleteSheet(model, sheetId);

    paste(model, "E1");

    expect(getDataValidationRules(model, "Sheet2")).toMatchObject([
      { criterion: criterion1, ranges: ["E1:E5"] },
      { criterion: criterion2, ranges: ["G1:G5"] },
    ]);
  });
});
