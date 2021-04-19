import { CommandResult } from "../src";
import { Model } from "../src/model";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";
import { selectCell, setCellContent } from "./test_helpers/commands_helpers";

function getNbrPlugin(): number {
  return corePluginRegistry.getAll().length + uiPluginRegistry.getAll().length;
}

describe("Model", () => {
  test("All plugin compatible with normal mode are loaded on normal mode", () => {
    const model = new Model();
    const nbr = getNbrPlugin();
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for Range
  });

  test("Can open a model in headless mode", () => {
    const model = new Model({}, { isHeadless: true });
    expect(model["handlers"]).toHaveLength(corePluginRegistry.getAll().length + 1); //+1 for Range
  });

  test("Can open a model in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(model.getters.isReadonly()).toBe(true);
  });

  test("Some commands are not dispatched in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(setCellContent(model, "A1", "hello")).toBe(CommandResult.Readonly);
  });

  test("Moving the selection is allowed in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(selectCell(model, "A15")).toBe(CommandResult.Success);
  });
});
