import { Model } from "../src/model";
import "./canvas.mock";
import { WHistory } from "../src/history";
import { CorePlugin } from "../src/plugins/base/core";
import { MergePlugin } from "../src/plugins/base/merge";
import { FormattingPlugin } from "../src/plugins/base/formatting";
import { ConditionalFormatPlugin } from "../src/plugins/base/conditional_format";
import { FigurePlugin } from "../src/plugins/base/figures";
import { ChartPlugin } from "../src/plugins/base/chart";

describe("Model", () => {
  test("can create model in headless mode", () => {
    const model = new Model({}, { mode: "headless" });
    expect(model["commandHandlers"]).toHaveLength(7);
    expect(model["commandHandlers"][0]).toBeInstanceOf(WHistory);
    expect(model["commandHandlers"][1]).toBeInstanceOf(CorePlugin);
    expect(model["commandHandlers"][2]).toBeInstanceOf(MergePlugin);
    expect(model["commandHandlers"][3]).toBeInstanceOf(FormattingPlugin);
    expect(model["commandHandlers"][4]).toBeInstanceOf(ConditionalFormatPlugin);
    expect(model["commandHandlers"][5]).toBeInstanceOf(FigurePlugin);
    expect(model["commandHandlers"][6]).toBeInstanceOf(ChartPlugin);
  });

  // test("All plugin compatible with normal mode are loaded on normal mode", () => {
  //   const model = new Model();
  //   const nbr = toRemovePluginRegistry
  //     .getAll()
  //     .reduce((acc, plugin) => (plugin.modes.includes("normal") ? acc + 1 : acc), 0);
  //   expect(model["commandHandlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  // });

  // test("All plugin compatible with headless mode are loaded on headless mode", () => {
  //   const model = new Model({}, { mode: "headless" });
  //   const nbr = toRemovePluginRegistry
  //     .getAll()
  //     .reduce((acc, plugin) => (plugin.modes.includes("headless") ? acc + 1 : acc), 0);
  //   expect(model["commandHandlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  // });

  // test("All plugin compatible with readonly mode are loaded on readonly mode", () => {
  //   const model = new Model({}, { mode: "readonly" });
  //   const nbr = toRemovePluginRegistry
  //     .getAll()
  //     .reduce((acc, plugin) => (plugin.modes.includes("readonly") ? acc + 1 : acc), 0);
  //   expect(model["commandHandlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  // });

  // test("Model in headless mode should not evaluate cells", () => {
  //   const model = new Model({}, { mode: "headless" });
  //   model.dispatch("SET_VALUE", { xc: "A1", text: "=1" });
  //   expect(model.getters.getCells().A1.value).not.toBe("1");
  // });

  // test("can add a Plugin only in headless mode", () => {
  //   class NormalPlugin extends OldBasePlugin {
  //     static modes: Mode[] = ["normal"];
  //   }
  //   class HeadlessPlugin extends OldBasePlugin {
  //     static modes: Mode[] = ["headless"];
  //   }
  //   class ReadOnlyPlugin extends OldBasePlugin {
  //     static modes: Mode[] = ["readonly"];
  //   }
  //   toRemovePluginRegistry.add("normalPlugin", NormalPlugin);
  //   toRemovePluginRegistry.add("headlessPlugin", HeadlessPlugin);
  //   toRemovePluginRegistry.add("readonlyPlugin", ReadOnlyPlugin);
  //   const modelNormal = new Model();
  //   expect(modelNormal["commandHandlers"][modelNormal["commandHandlers"].length - 1]).toBeInstanceOf(
  //     NormalPlugin
  //   );
  //   const modelHeadless = new Model({}, { mode: "headless" });
  //   expect(modelHeadless["commandHandlers"][modelHeadless["commandHandlers"].length - 1]).toBeInstanceOf(
  //     HeadlessPlugin
  //   );
  //   const modelReadonly = new Model({}, { mode: "readonly" });
  //   expect(modelReadonly["commandHandlers"][modelReadonly["commandHandlers"].length - 1]).toBeInstanceOf(
  //     ReadOnlyPlugin
  //   );
  // });
});
