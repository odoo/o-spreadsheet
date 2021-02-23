import { Model, normalize } from "../../src";
import { INCORRECT_RANGE_STRING } from "../../src/constants";

function moveFormula(model: Model, formula: string, offsetX: number, offsetY: number): string {
  const sheetId = model.getters.getActiveSheetId();
  const normalizedFormula = normalize(formula);
  const content = normalizedFormula.text;
  const dependencies = normalizedFormula.dependencies.map((dep) =>
    model.getters.getRangeFromSheetXC(sheetId, dep)
  );
  const ranges = model.getters.createAdaptedRanges(dependencies, offsetX, offsetY, sheetId);
  return model.getters.buildFormulaContent(sheetId, content, ranges);
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
    expect(moveFormula(model, "=B2", 0, -4)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=B2", -4, 0)).toEqual(`=${INCORRECT_RANGE_STRING}`);
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
    expect(moveFormula(model, "=Sheet2!B2", 0, -2)).toEqual(`=${INCORRECT_RANGE_STRING}`);
    expect(moveFormula(model, "=Sheet2!B2", 1, 1)).toEqual("=Sheet2!C3");
  });
});
