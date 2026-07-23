import { FormulaOwnerRegistry } from "../../src/plugins/core/formula_owner_registry";
import { makeFormulaOwnerId } from "../../src/types/formula_owner";

describe("FormulaOwnerRegistry", () => {
  test("aggregates formula owners from every registered provider", () => {
    const registry = new FormulaOwnerRegistry();
    registry.addProvider(() => [
      {
        id: makeFormulaOwnerId("cf", "sheet1", "cf1", "0"),
        sheetId: "sheet1",
        formulaString: "=A1",
        onAdapt: () => {},
      },
    ]);
    registry.addProvider(() => [
      {
        id: makeFormulaOwnerId("dv", "sheet1", "dv1", "0"),
        sheetId: "sheet1",
        formulaString: "=B1",
        onAdapt: () => {},
      },
    ]);

    const records = registry.getFormulaOwnerRecords();
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.formulaString)).toEqual(["=A1", "=B1"]);
  });

  test("returns an empty list when no provider is registered", () => {
    const registry = new FormulaOwnerRegistry();
    expect(registry.getFormulaOwnerRecords()).toEqual([]);
  });

  test("aggregates extra invalidation commands from every registered call, deduplicated", () => {
    const registry = new FormulaOwnerRegistry();
    registry.addExtraInvalidationCommands(["UPDATE_PIVOT"]);
    registry.addExtraInvalidationCommands(["UPDATE_PIVOT", "ADD_PIVOT"]);

    const commands = registry.getFormulaOwnerExtraInvalidationCommands();
    expect(commands).toEqual(new Set(["UPDATE_PIVOT", "ADD_PIVOT"]));
  });

  test("adaptRanges calls onAdapt only for owners whose formula string actually changed", () => {
    const registry = new FormulaOwnerRegistry();
    const onAdaptChanged = jest.fn();
    const onAdaptUnchanged = jest.fn();
    registry.addProvider(() => [
      {
        id: makeFormulaOwnerId("cf", "sheet1", "cf1", "0"),
        sheetId: "sheet1",
        formulaString: "=A1",
        onAdapt: onAdaptChanged,
      },
      {
        id: makeFormulaOwnerId("cf", "sheet1", "cf2", "0"),
        sheetId: "sheet1",
        formulaString: "=B1",
        onAdapt: onAdaptUnchanged,
      },
    ]);

    registry.adaptRanges({
      applyChange: (range) => ({ changeType: "NONE", range }),
      adaptRangeString: (sheetId, xc) => ({ changeType: "NONE", range: xc }),
      adaptFormulaString: (sheetId, formula) => (formula === "=A1" ? "=A2" : formula),
      adaptCompiledFormula: (compiledFormula) => compiledFormula,
    });

    expect(onAdaptChanged).toHaveBeenCalledWith("=A2");
    expect(onAdaptUnchanged).not.toHaveBeenCalled();
  });
});
