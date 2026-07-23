import { Model } from "../../src/model";
import { CorePlugin } from "../../src/plugins/core_plugin";
import { corePluginRegistry } from "../../src/plugins/plugin_registries";
import { GenericFormulaEvaluator } from "../../src/plugins/ui_core_views/formula_manager/generic_formula_evaluator";
import { CommandTypes } from "../../src/types/commands";
import { FormulaOwnerRecord, makeFormulaOwnerId } from "../../src/types/formula_owner";
import { merge, setCellContent } from "../test_helpers/commands_helpers";

const TEST_OWNER_ID = makeFormulaOwnerId("test", "owner1");

class TestFormulaOwnerPlugin extends CorePlugin {
  getFormulaOwners(): Iterable<FormulaOwnerRecord> {
    const sheetId = this.getters.getSheetIds()[0];
    return [{ id: TEST_OWNER_ID, sheetId, formulaString: "=C1+1", onAdapt: () => {} }];
  }

  getExtraInvalidationCommands(): Iterable<CommandTypes> {
    return ["ADD_MERGE"];
  }
}

describe("FormulaManagerPlugin end-to-end with a registered test formula owner", () => {
  beforeAll(() => {
    corePluginRegistry.add("test_formula_owner", TestFormulaOwnerPlugin);
  });

  afterAll(() => {
    corePluginRegistry.remove("test_formula_owner");
  });

  test("compiles and evaluates a formula owner that reads cells", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=A1+1");
    setCellContent(model, "C1", "=B1+1");

    expect(model.getters.getFormulaOwnerValue(TEST_OWNER_ID)).toBe(4);
  });

  test("only recomputes when a cell it actually (transitively) depends on changes", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=A1+1");
    setCellContent(model, "C1", "=B1+1");

    const evaluateSpy = jest.spyOn(GenericFormulaEvaluator.prototype, "evaluate");

    expect(model.getters.getFormulaOwnerValue(TEST_OWNER_ID)).toBe(4);
    expect(evaluateSpy).toHaveBeenCalledTimes(1);

    // Unrelated cell change: cached result is reused, no recomputation.
    setCellContent(model, "D1", "unrelated");
    expect(model.getters.getFormulaOwnerValue(TEST_OWNER_ID)).toBe(4);
    expect(evaluateSpy).toHaveBeenCalledTimes(1);

    // A1 -> B1 -> C1 is a 2-hop dependency chain; the owner only depends on
    // C1 directly, so this exercises the cascade-exposure hook.
    setCellContent(model, "A1", "10");
    expect(model.getters.getFormulaOwnerValue(TEST_OWNER_ID)).toBe(13);
    expect(evaluateSpy).toHaveBeenCalledTimes(2);

    evaluateSpy.mockRestore();
  });

  test("getExtraInvalidationCommands is called once, at construction, not per command", () => {
    const spy = jest.spyOn(TestFormulaOwnerPlugin.prototype, "getExtraInvalidationCommands");

    const model = new Model();
    expect(spy).toHaveBeenCalledTimes(1);

    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=A1+1");
    merge(model, "D1:D2");

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
