import { Model, Mode } from "../src/model";
import "./canvas.mock";
import { WHistory } from "../src/history";
import { CellPlugin } from "../src/plugins/core/cell";
import { MergePlugin } from "../src/plugins/core/merge";
import { FormattingPlugin } from "../src/plugins/core/formatting";
import { ConditionalFormatPlugin } from "../src/plugins/core/conditional_format";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";
import { FigurePlugin } from "../src/plugins/core/figures";
import { ChartPlugin } from "../src/plugins/core/chart";
import { getCell, setCellContent } from "./helpers";
import { SheetPlugin } from "../src/plugins/core/sheet";
import { FindAndReplacePlugin } from "../src/plugins/ui/find_and_replace";
import { SheetUIPlugin } from "../src/plugins/ui/ui_sheet";
import { UIPlugin } from "../src/plugins/ui_plugin";
import { RangePlugin } from "../src/plugins/core/range";

function getNbrPlugin(mode: Mode): number {
  return (
    corePluginRegistry
      .getAll()
      .reduce((acc, plugin) => (plugin.modes.includes(mode) ? acc + 1 : acc), 0) +
    uiPluginRegistry
      .getAll()
      .reduce((acc, plugin) => (plugin.modes.includes(mode) ? acc + 1 : acc), 0)
  );
}

describe("Model", () => {
  test("can create model in headless mode", () => {
    const model = new Model({}, { mode: "headless" });
    expect(model["handlers"]).toHaveLength(11);
    expect(model["handlers"][0]).toBeInstanceOf(WHistory);
    expect(model["handlers"][1]).toBeInstanceOf(SheetPlugin);
    expect(model["handlers"][2]).toBeInstanceOf(RangePlugin);
    expect(model["handlers"][3]).toBeInstanceOf(CellPlugin);
    expect(model["handlers"][4]).toBeInstanceOf(MergePlugin);
    expect(model["handlers"][5]).toBeInstanceOf(FormattingPlugin);
    expect(model["handlers"][6]).toBeInstanceOf(ConditionalFormatPlugin);
    expect(model["handlers"][7]).toBeInstanceOf(FigurePlugin);
    expect(model["handlers"][8]).toBeInstanceOf(ChartPlugin);
    expect(model["handlers"][9]).toBeInstanceOf(SheetUIPlugin);
    expect(model["handlers"][10]).toBeInstanceOf(FindAndReplacePlugin);
  });

  test("All plugin compatible with normal mode are loaded on normal mode", () => {
    const model = new Model();
    const nbr = getNbrPlugin("normal");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("All plugin compatible with headless mode are loaded on headless mode", () => {
    const model = new Model({}, { mode: "headless" });
    const nbr = getNbrPlugin("headless");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("All plugin compatible with readonly mode are loaded on readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    const nbr = getNbrPlugin("readonly");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for WHistory
  });

  test("Model in headless mode should not evaluate cells", () => {
    const model = new Model({}, { mode: "headless" });
    setCellContent(model, "A1", "=1");
    expect(getCell(model, "A1")!.value).not.toBe("1");
  });

  test("can add a Plugin only in headless mode", () => {
    class NormalPlugin extends UIPlugin {
      static modes: Mode[] = ["normal"];
    }
    class HeadlessPlugin extends UIPlugin {
      static modes: Mode[] = ["headless"];
    }
    class ReadOnlyPlugin extends UIPlugin {
      static modes: Mode[] = ["readonly"];
    }
    uiPluginRegistry.add("normalPlugin", NormalPlugin);
    uiPluginRegistry.add("headlessPlugin", HeadlessPlugin);
    uiPluginRegistry.add("readonlyPlugin", ReadOnlyPlugin);
    const modelNormal = new Model();
    expect(modelNormal["handlers"][modelNormal["handlers"].length - 1]).toBeInstanceOf(
      NormalPlugin
    );
    const modelHeadless = new Model({}, { mode: "headless" });
    expect(modelHeadless["handlers"][modelHeadless["handlers"].length - 1]).toBeInstanceOf(
      HeadlessPlugin
    );
    const modelReadonly = new Model({}, { mode: "readonly" });
    expect(modelReadonly["handlers"][modelReadonly["handlers"].length - 1]).toBeInstanceOf(
      ReadOnlyPlugin
    );
  });
});
