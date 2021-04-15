import { Model } from "../src/model";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";

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
});
