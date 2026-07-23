import { Model } from "../../src/model";
import { makeFormulaOwnerId } from "../../src/types/formula_owner";
import { addColumns, redo, setCellContent, undo } from "../test_helpers/commands_helpers";

describe("FormulaManagerPlugin (no owners registered yet)", () => {
  test("getFormulaOwnerResult/getFormulaOwnerValue are no-ops for any id", () => {
    const model = new Model();
    const id = makeFormulaOwnerId("cf", "sheet1", "cf1", "0");
    expect(model.getters.getFormulaOwnerResult(id)).toBeUndefined();
    expect(model.getters.getFormulaOwnerValue(id)).toBeUndefined();
  });

  test("stays inert across cell edits, structural changes and undo/redo", () => {
    const model = new Model();
    const id = makeFormulaOwnerId("cf", "sheet1", "cf1", "0");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1+1");
    addColumns(model, "before", "A", 1);
    undo(model);
    redo(model);
    expect(model.getters.getFormulaOwnerResult(id)).toBeUndefined();
    expect(model.getters.getFormulaOwnerValue(id)).toBeUndefined();
  });
});
