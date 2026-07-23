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
      },
    ]);
    registry.addProvider(() => [
      {
        id: makeFormulaOwnerId("dv", "sheet1", "dv1", "0"),
        sheetId: "sheet1",
        formulaString: "=B1",
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

  test("aggregates extra invalidation commands from every registered provider, deduplicated", () => {
    const registry = new FormulaOwnerRegistry();
    registry.addExtraInvalidationProvider(() => ["UPDATE_PIVOT"]);
    registry.addExtraInvalidationProvider(() => ["UPDATE_PIVOT", "ADD_PIVOT"]);

    const commands = registry.getFormulaOwnerExtraInvalidationCommands();
    expect(commands).toEqual(new Set(["UPDATE_PIVOT", "ADD_PIVOT"]));
  });
});
