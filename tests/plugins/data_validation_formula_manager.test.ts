import { Model } from "../../src/model";
import { getDataValidationFormulaOwnerId } from "../../src/plugins/core/data_validation";
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
});
