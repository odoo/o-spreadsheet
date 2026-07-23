import { Model } from "../../src/model";
import {
  ConditionalFormatPlugin,
  getCellIsRuleFormulaOwnerId,
} from "../../src/plugins/core/conditional_format";
import { addCfRule, setCellContent } from "../test_helpers/commands_helpers";
import { getStyle } from "../test_helpers/getters_helpers";

describe("ConditionalFormatPlugin formula manager integration", () => {
  test("CellIsRule custom formula is exposed as a formula owner", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    addCfRule(
      model,
      "B1:B3",
      {
        type: "CellIsRule",
        operator: "customFormula",
        values: ["=A1>3"],
        style: { fillColor: "#FF0000" },
      },
      "cf1"
    );
    const id = getCellIsRuleFormulaOwnerId(model.getters.getActiveSheetId(), "cf1", 0);
    expect(model.getters.getFormulaOwnerCompiledFormula(id)?.toFormulaString(model.getters)).toBe(
      "=A1>3"
    );
    expect(getStyle(model, "B1")).toEqual({ fillColor: "#FF0000" });
  });

  test("the base compiled formula is a stable cached reference across renders and unrelated edits", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    addCfRule(
      model,
      "B1:B3",
      {
        type: "CellIsRule",
        operator: "customFormula",
        values: ["=A1>3"],
        style: { fillColor: "#FF0000" },
      },
      "cf1"
    );
    const id = getCellIsRuleFormulaOwnerId(model.getters.getActiveSheetId(), "cf1", 0);
    const first = model.getters.getFormulaOwnerCompiledFormula(id);
    getStyle(model, "B1");
    getStyle(model, "B2");
    getStyle(model, "B3");
    setCellContent(model, "Z1", "unrelated");
    const second = model.getters.getFormulaOwnerCompiledFormula(id);
    expect(second).toBe(first);
  });

  test("the formula owner id is computed once per rule, not on every read", () => {
    const buildSpy = jest.spyOn(
      ConditionalFormatPlugin.prototype as any,
      "buildCellIsRuleFormulaOwnerIds"
    );

    const model = new Model();
    setCellContent(model, "A1", "5");
    addCfRule(
      model,
      "B1:B3",
      {
        type: "CellIsRule",
        operator: "customFormula",
        values: ["=A1>3"],
        style: { fillColor: "#FF0000" },
      },
      "cf1"
    );
    getStyle(model, "B1");
    expect(buildSpy).toHaveBeenCalledTimes(1);

    // Unrelated cell edit invalidates CF's own derived-style cache, forcing
    // getComputedStyles to run again - but the underlying rule object is
    // unchanged, so the id must be reused from cache, not recomputed.
    setCellContent(model, "Z1", "unrelated");
    getStyle(model, "B2");
    expect(buildSpy).toHaveBeenCalledTimes(1);

    buildSpy.mockRestore();
  });
});
