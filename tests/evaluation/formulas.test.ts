import { Model } from "../../src";
import { FormulaCell } from "../../src/types";
import { CellErrorType } from "../../src/types/errors";
import {
  createSheetWithName,
  deleteColumns,
  deleteRows,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";

function moveFormula(model: Model, formula: string, offsetX: number, offsetY: number): string {
  const sheetId = model.getters.getActiveSheetId();
  setCellContent(model, "A1", formula);
  const cell = getCell(model, "A1") as FormulaCell;
  return model.getters.getTranslatedCellFormula(
    sheetId,
    offsetX,
    offsetY,
    cell.compiledFormula.tokens
  );
}

describe("createAdaptedRanges", () => {
  test("simple changes", () => {
    const model = Model.BuildSync({
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
    const model = Model.BuildSync({
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
    expect(moveFormula(model, "=B2", 0, -4)).toEqual(`=${CellErrorType.InvalidReference}`);
    expect(moveFormula(model, "=B2", -4, 0)).toEqual(`=${CellErrorType.InvalidReference}`);
  });

  test("can handle offsets outside the sheet", () => {
    const model = Model.BuildSync({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(moveFormula(model, "=B2", 0, -4)).toEqual(`=${CellErrorType.InvalidReference}`);
    expect(moveFormula(model, "=B10", 0, 2)).toEqual("=B12");
    expect(moveFormula(model, "=J1", 2, 0)).toEqual("=L1");
  });

  test("can handle other formulas", () => {
    const model = Model.BuildSync({
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
    const model = Model.BuildSync({
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
    expect(moveFormula(model, "=Sheet2!B2", 0, -2)).toEqual(`=${CellErrorType.InvalidReference}`);
    expect(moveFormula(model, "=Sheet2!B2", -2, 0)).toEqual(`=${CellErrorType.InvalidReference}`);
    expect(moveFormula(model, "=Sheet2!B2", 1, 1)).toEqual("=Sheet2!C3");
    expect(moveFormula(model, "=Sheet2!B2", 1, 10)).toEqual("=Sheet2!C12");
  });

  test("can handle sheet reference with space in its name", () => {
    const model = Model.BuildSync();
    createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
    expect(moveFormula(model, "='Sheet 2'!B2", 1, 10)).toEqual("='Sheet 2'!C12");
  });
});

describe("Remove columns/rows that are references of formula", () => {
  let model: Model;
  beforeEach(() => {
    model = Model.BuildSync();
  });

  test("delete multiple columns, including the one in formula and the one before it", () => {
    setCellContent(model, "A1", "=SUM(C1,D1)");
    deleteColumns(model, ["B", "C"]);
    expect(getCellContent(model, "A1")).toEqual("#REF");
    expect(getCellText(model, "A1")).toEqual("=SUM(#REF,B1)");
  });

  test("delete multiple columns, including the one in formula and the one after it", () => {
    setCellContent(model, "A1", "=SUM(C1,D1)");
    deleteColumns(model, ["C", "D"]);
    expect(getCellContent(model, "A1")).toEqual("#REF");
    expect(getCellText(model, "A1")).toEqual("=SUM(#REF,#REF)");
  });

  test("delete multiple rows, including the one in formula and the one before it", () => {
    setCellContent(model, "A1", "=SUM(C3,C4)");
    deleteRows(model, [1, 2]);
    expect(getCellContent(model, "A1")).toEqual("#REF");
    expect(getCellText(model, "A1")).toEqual("=SUM(#REF,C2)");
  });

  test("delete multiple rows, including the one in formula and the one after it", () => {
    setCellContent(model, "A1", "=SUM(C3,C4)");
    deleteRows(model, [2, 3]);
    expect(getCellContent(model, "A1")).toEqual("#REF");
    expect(getCellText(model, "A1")).toEqual("=SUM(#REF,#REF)");
  });
});
