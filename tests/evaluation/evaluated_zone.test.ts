import { toZone } from "../../src/helpers/zones";
import { Model } from "../../src/model";
import {
  createSheet,
  deleteContent,
  evaluateCells,
  setAutomaticEvaluation,
  setCellContent,
  setFormat,
} from "../test_helpers/commands_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

function getEvaluatedZone(model: Model, sheetId = model.getters.getActiveSheetId()) {
  return model.getters.getSheetEvaluatedZone(sheetId);
}

function getOptimalEvaluatedZone(model: Model, sheetId = model.getters.getActiveSheetId()) {
  return model.getters.getSheetOptimalEvaluatedZone(sheetId);
}

describe("getSheetEvaluatedZone", () => {
  test("empty sheet has no evaluated zone", () => {
    const model = new Model();
    expect(getEvaluatedZone(model)).toBeUndefined();
  });

  test("evaluated zone of a model loaded with data", () => {
    const model = createModelFromGrid({ B2: "1", D5: "2" });
    expect(getEvaluatedZone(model)).toEqual(toZone("B2:D5"));
  });

  test("zone is updated when updating a cell", () => {
    const model = new Model();
    setCellContent(model, "C3", "1");
    expect(getEvaluatedZone(model)).toEqual(toZone("C3"));
  });

  test("zone grows to include every updated cell", () => {
    const model = new Model();
    setCellContent(model, "C3", "1");
    setCellContent(model, "A5", "1");
    expect(getEvaluatedZone(model)).toEqual(toZone("A3:C5"));
    setCellContent(model, "E1", "1");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:E5"));
  });

  test("zone includes cells with a format but no content", () => {
    const model = new Model();
    setFormat(model, "B2", "0.00%");
    expect(getEvaluatedZone(model)).toEqual(toZone("B2"));
  });

  test("zone is updated when updating a cell that spreads", () => {
    const model = new Model();
    setCellContent(model, "B2", "=MUNIT(3)");
    expect(getEvaluatedZone(model)).toEqual(toZone("B2:D4"));
  });

  test("zone is updated when a spreading formula grows", () => {
    const model = new Model();
    setCellContent(model, "B2", "=MUNIT(2)");
    expect(getEvaluatedZone(model)).toEqual(toZone("B2:C3"));
    setCellContent(model, "B2", "=MUNIT(4)");
    expect(getEvaluatedZone(model)).toEqual(toZone("B2:E5"));
  });

  test("zone is updated when a referenced cell makes a formula spread", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=MUNIT(A1)");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:B1"));
    setCellContent(model, "A1", "3");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:D3"));
  });

  test("zone is updated when a blocked spreading formula is unblocked", () => {
    const model = new Model();
    setCellContent(model, "B2", "blocker");
    setCellContent(model, "A1", "=MUNIT(3)");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:B2"));
    deleteContent(model, ["B2"]);
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:C3"));
  });

  test("zone is reset when the evaluation is recomputed", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "E5", "1");
    deleteContent(model, ["E5"]);
    evaluateCells(model);
    expect(getEvaluatedZone(model)).toEqual(toZone("A1"));
  });

  test("zone is reset to the new spread when the evaluation is recomputed", () => {
    const model = new Model();
    setCellContent(model, "A1", "=MUNIT(3)");
    setCellContent(model, "A1", "=MUNIT(2)");
    evaluateCells(model);
    expect(getEvaluatedZone(model)).toEqual(toZone("A1:B2"));
  });

  test("zone is undefined when the evaluation is recomputed on an emptied sheet", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    deleteContent(model, ["A1"]);
    evaluateCells(model);
    expect(getEvaluatedZone(model)).toBeUndefined();
  });

  test("zone is not computed when automatic evaluation is disabled", () => {
    const model = new Model();
    setAutomaticEvaluation(model, false);
    setCellContent(model, "B2", "=MUNIT(2)");
    expect(getEvaluatedZone(model)).toBeUndefined();
  });

  test("zone is reset when the evaluation is recomputed with automatic evaluation disabled", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "E5", "1");
    setAutomaticEvaluation(model, false);
    deleteContent(model, ["E5"]);
    evaluateCells(model);
    expect(getEvaluatedZone(model)).toEqual(toZone("A1"));
  });

  test("zones are tracked independently per sheet", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sh2" });
    setCellContent(model, "B2", "1", "sh2");
    expect(getEvaluatedZone(model, sheetId)).toBeUndefined();
    expect(getEvaluatedZone(model, "sh2")).toEqual(toZone("B2"));
    setCellContent(model, "D4", "1", sheetId);
    expect(getEvaluatedZone(model, sheetId)).toEqual(toZone("D4"));
    expect(getEvaluatedZone(model, "sh2")).toEqual(toZone("B2"));
  });

  test("empty cells read by a range reference are not part of the zone", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(C3:E5)");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1"));
  });

  test("empty cell read by a single reference is not part of the zone", () => {
    const model = new Model();
    setCellContent(model, "A1", "=Z100");
    expect(getEvaluatedZone(model)).toEqual(toZone("A1"));
  });
});

describe("getSheetOptimalEvaluatedZone", () => {
  test("zone is updated when removing a cell content", () => {
    const model = new Model();
    setCellContent(model, "C3", "1");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3"));
    setCellContent(model, "E5", "1");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3:E5"));
    setCellContent(model, "E5", "");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3"));
  });

  test("zone is updated when resizing a cell spread", () => {
    const model = new Model();
    setCellContent(model, "C3", "1");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3"));
    setCellContent(model, "E5", "=MUNIT(5)");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3:I9"));
    setCellContent(model, "E5", "=MUNIT(2)");
    expect(getOptimalEvaluatedZone(model)).toEqual(toZone("C3:F6"));
  });
});
