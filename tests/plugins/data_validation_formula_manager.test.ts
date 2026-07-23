import { Model } from "../../src/model";
import {
  DataValidationPlugin,
  getDataValidationFormulaOwnerId,
} from "../../src/plugins/core/data_validation";
import { addDataValidation, setCellContent } from "../test_helpers/commands_helpers";

describe("DataValidationPlugin formula manager integration", () => {
  test("customFormula criterion is exposed as a formula owner", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    addDataValidation(model, "B1:B3", "dv1", { type: "customFormula", values: ["=A1>3"] });

    const id = getDataValidationFormulaOwnerId(model.getters.getActiveSheetId(), "dv1", 0);
    expect(model.getters.getFormulaOwnerCompiledFormula(id)?.toFormulaString(model.getters)).toBe(
      "=A1>3"
    );
  });

  test("the base compiled formula is a stable cached reference across unrelated edits", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    addDataValidation(model, "B1:B3", "dv1", { type: "customFormula", values: ["=A1>3"] });

    const id = getDataValidationFormulaOwnerId(model.getters.getActiveSheetId(), "dv1", 0);
    const first = model.getters.getFormulaOwnerCompiledFormula(id);
    setCellContent(model, "Z1", "unrelated");
    const second = model.getters.getFormulaOwnerCompiledFormula(id);
    expect(second).toBe(first);
  });

  test("the formula owner id is computed once per rule, not on every read", () => {
    const buildSpy = jest.spyOn(
      DataValidationPlugin.prototype as any,
      "buildDataValidationFormulaOwnerIds"
    );

    const model = new Model();
    setCellContent(model, "A1", "5");
    addDataValidation(model, "B1:B3", "dv1", { type: "customFormula", values: ["=A1>3"] });
    model.getters.isDataValidationInvalid({
      sheetId: model.getters.getActiveSheetId(),
      col: 1,
      row: 0,
    });
    expect(buildSpy).toHaveBeenCalledTimes(1);

    // Unrelated cell edit invalidates DV's own derived-result cache, forcing
    // re-evaluation - but the underlying rule object is unchanged, so the id
    // must be reused from cache, not recomputed.
    setCellContent(model, "Z1", "unrelated");
    model.getters.isDataValidationInvalid({
      sheetId: model.getters.getActiveSheetId(),
      col: 1,
      row: 1,
    });
    expect(buildSpy).toHaveBeenCalledTimes(1);

    buildSpy.mockRestore();
  });
});
