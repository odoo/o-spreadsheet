import { Model, Mode } from "../../src/model";
import "../canvas.mock";
import { WHistory } from "../../src/history";
import { CorePlugin } from "../../src/plugins/core";
import { MergePlugin } from "../../src/plugins/merge";
import { FormattingPlugin } from "../../src/plugins/formatting";
import { ConditionalFormatPlugin } from "../../src/plugins/conditional_format";
import { EntityPlugin } from "../../src/plugins/entity";
import { BasePlugin } from "../../src/base_plugin";
import { pluginRegistry } from "../../src/plugins/index";

describe("Model", () => {
  test("can create model in headless mode", () => {
    const model = new Model({}, "headless");
    expect(model["handlers"]).toHaveLength(6);
    expect(model["handlers"][0]).toBeInstanceOf(WHistory);
    expect(model["handlers"][1]).toBeInstanceOf(CorePlugin);
    expect(model["handlers"][2]).toBeInstanceOf(MergePlugin);
    expect(model["handlers"][3]).toBeInstanceOf(FormattingPlugin);
    expect(model["handlers"][4]).toBeInstanceOf(ConditionalFormatPlugin);
    expect(model["handlers"][5]).toBeInstanceOf(EntityPlugin);
  });

  test("All plugin compatible with normal mode are loaded on normal mode", () => {
    const model = new Model();
    const nbr = pluginRegistry
      .getAll()
      .reduce((acc, plugin) => (plugin.modes.includes("normal") ? acc + 1 : acc), 0);
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("All plugin compatible with headless mode are loaded on headless mode", () => {
    const model = new Model({}, "headless");
    const nbr = pluginRegistry
      .getAll()
      .reduce((acc, plugin) => (plugin.modes.includes("headless") ? acc + 1 : acc), 0);
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("All plugin compatible with readonly mode are loaded on readonly mode", () => {
    const model = new Model({}, "readonly");
    const nbr = pluginRegistry
      .getAll()
      .reduce((acc, plugin) => (plugin.modes.includes("readonly") ? acc + 1 : acc), 0);
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("Model in headless mode should not evaluate cells", () => {
    const model = new Model({}, "headless");
    model.dispatch("SET_VALUE", { xc: "A1", text: "=1" });
    expect(model["workbook"].cells.A1.value).not.toBe("1");
  });

  test("can add a Plugin only in headless mode", () => {
    class NormalPlugin extends BasePlugin {
      static modes: Mode[] = ["normal"];
    }
    class HeadlessPlugin extends BasePlugin {
      static modes: Mode[] = ["headless"];
    }
    class ReadOnlyPlugin extends BasePlugin {
      static modes: Mode[] = ["readonly"];
    }
    pluginRegistry.add("normalPlugin", NormalPlugin);
    pluginRegistry.add("headlessPlugin", HeadlessPlugin);
    pluginRegistry.add("readonlyPlugin", ReadOnlyPlugin);
    const modelNormal = new Model();
    expect(modelNormal["handlers"][modelNormal["handlers"].length - 1]).toBeInstanceOf(
      NormalPlugin
    );
    const modelHeadless = new Model({}, "headless");
    expect(modelHeadless["handlers"][modelHeadless["handlers"].length - 1]).toBeInstanceOf(
      HeadlessPlugin
    );
    const modelReadonly = new Model({}, "readonly");
    expect(modelReadonly["handlers"][modelReadonly["handlers"].length - 1]).toBeInstanceOf(
      ReadOnlyPlugin
    );
  });
});
