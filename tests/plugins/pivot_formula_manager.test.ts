import { PivotCorePlugin } from "../../src/plugins/core/pivot";
import { makeFormulaOwnerId } from "../../src/types/formula_owner";
import { createSheet } from "../test_helpers/commands_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("PivotCorePlugin formula manager integration", () => {
  test("a calculated measure is discoverable via getFormulaOwnerRecords", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times 2",
          fieldName: "Price times 2",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });

    const records = model.getters.getFormulaOwnerRecords();
    const id = makeFormulaOwnerId("pivot", "1", "measure", "Price times 2");
    const record = records.find((r) => r.id === id);
    expect(record).toBeDefined();
    expect(record?.formulaString).toBe("=Price*2");

    // The manager still compiles/caches whatever is declared (it doesn't
    // distinguish "declare-only" owners), but pivot's real read path
    // (getMeasureCompiledFormula/getMeasureFullDependencies) is unchanged
    // and does not depend on this at all.
    expect(model.getters.getFormulaOwnerCompiledFormula(id)?.toFormulaString(model.getters)).toBe(
      "=Price*2"
    );
  });

  test("the formula owner id is computed once per measure, not on every getFormulaOwners repull", () => {
    const buildSpy = jest.spyOn(PivotCorePlugin.prototype as any, "buildMeasureFormulaOwnerId");

    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times 2",
          fieldName: "Price times 2",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    model.getters.getFormulaOwnerRecords();
    expect(buildSpy).toHaveBeenCalledTimes(1);

    // Creating an unrelated sheet forces FormulaManagerPlugin to re-pull the
    // owner list (CREATE_SHEET is in the shared invalidation set), but the
    // pivot measure itself is unchanged, so the id must be reused from
    // cache, not recomputed.
    createSheet(model, { sheetId: "sheet2" });
    model.getters.getFormulaOwnerRecords();
    expect(buildSpy).toHaveBeenCalledTimes(1);

    buildSpy.mockRestore();
  });
});
