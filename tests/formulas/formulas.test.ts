import { Model } from "../../src";
import { INCORRECT_RANGE_STRING } from "../../src/constants";
import { ValidFormulaCell } from "../../src/types";
import { createSheetWithName, setCellContent } from "../test_helpers/commands_helpers";

function moveFormula(model: Model, formula: string, offsetX: number, offsetY: number): string {
  const sheetId = model.getters.getActiveSheetId();
  setCellContent(model, "A1", formula);
  const cell = model.getters.getCell(sheetId, 0, 0) as ValidFormulaCell;
  const newDependencies = model.getters.createAdaptedRanges(
    cell.dependencies,
    offsetX,
    offsetY,
    sheetId
  );
  return model.getters.buildFormulaContent(sheetId, cell, newDependencies);
}

describe("createAdaptedRanges", () => {
  test("simple changes", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(moveFormula(model, "=A1", 1, 1)).toEqual("=B2");
    expect(moveFormula(model, "=A1 + B3", 1, 1)).toEqual("=B2 + C4");
  });

  test("can handle negative offsets", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(moveFormula(model, "=B2", 0, -1)).toEqual("=B1");
    expect(moveFormula(model, "=B2", -1, 0)).toEqual("=A2");
    expect(moveFormula(model, "=B2", -1, -1)).toEqual("=A1");
    expect(moveFormula(model, "=B2", 0, -4)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=B2", -4, 0)).toEqual(`=${INCORRECT_RANGE_STRING}`);
  });

  test("can handle offsets outside the sheet", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(moveFormula(model, "=B2", 0, -4)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=B10", 0, 2)).toEqual("=B12");
    expect(moveFormula(model, "=J1", 2, 0)).toEqual("=L1");
  });

  test("can handle other formulas", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(moveFormula(model, "=AND(true, B2)", 0, 1)).toEqual("=AND(true, B3)");
  });

  test("can handle cross-sheet formulas", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
        {
          name: "Sheet2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    expect(moveFormula(model, "=Sheet2!B2", 0, 1)).toEqual("=Sheet2!B3");
    expect(moveFormula(model, "='Sheet2'!B2", 0, 1)).toEqual("=Sheet2!B3");
    expect(moveFormula(model, "=Sheet2!B2", 0, -2)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=Sheet2!B2", -2, 0)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=Sheet2!B2", 1, 1)).toEqual("=Sheet2!C3");
    expect(moveFormula(model, "=Sheet2!B2", 1, 10)).toEqual("=Sheet2!C12");
  });

  test("can handle sheet reference with space in its name", () => {
    const model = new Model();
    createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
    expect(moveFormula(model, "='Sheet 2'!B2", 1, 10)).toEqual("='Sheet 2'!C12");
  });
});
