import { CommandResult, CorePlugin } from "../src";
import { toZone } from "../src/helpers";
import { Mode, Model } from "../src/model";
import { BordersPlugin } from "../src/plugins/core/borders";
import { CellPlugin } from "../src/plugins/core/cell";
import { ChartPlugin } from "../src/plugins/core/chart";
import { ConditionalFormatPlugin } from "../src/plugins/core/conditional_format";
import { FigurePlugin } from "../src/plugins/core/figures";
import { MergePlugin } from "../src/plugins/core/merge";
import { RangeAdapter } from "../src/plugins/core/range";
import { SheetPlugin } from "../src/plugins/core/sheet";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";
import { FindAndReplacePlugin } from "../src/plugins/ui/find_and_replace";
import { SortPlugin } from "../src/plugins/ui/sort";
import { SheetUIPlugin } from "../src/plugins/ui/ui_sheet";
import { UIPlugin } from "../src/plugins/ui_plugin";
import { Command, CoreCommand } from "../src/types";
import { selectCell, setCellContent } from "./test_helpers/commands_helpers";
import { getCell, getCellText } from "./test_helpers/getters_helpers";

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
    expect(model["handlers"][0]).toBeInstanceOf(RangeAdapter);
    expect(model["handlers"][1]).toBeInstanceOf(SheetPlugin);
    expect(model["handlers"][2]).toBeInstanceOf(CellPlugin);
    expect(model["handlers"][3]).toBeInstanceOf(MergePlugin);
    expect(model["handlers"][4]).toBeInstanceOf(BordersPlugin);
    expect(model["handlers"][5]).toBeInstanceOf(ConditionalFormatPlugin);
    expect(model["handlers"][6]).toBeInstanceOf(FigurePlugin);
    expect(model["handlers"][7]).toBeInstanceOf(ChartPlugin);
    expect(model["handlers"][8]).toBeInstanceOf(SheetUIPlugin);
    expect(model["handlers"][9]).toBeInstanceOf(FindAndReplacePlugin);
    expect(model["handlers"][10]).toBeInstanceOf(SortPlugin);
  });

  test("All plugin compatible with normal mode are loaded on normal mode", () => {
    const model = new Model();
    const nbr = getNbrPlugin("normal");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for Range
  });

  test("All plugin compatible with headless mode are loaded on headless mode", () => {
    const model = new Model({}, { mode: "headless" });
    const nbr = getNbrPlugin("headless");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for Range
  });

  test("All plugin compatible with readonly mode are loaded on readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    const nbr = getNbrPlugin("readonly");
    expect(model["handlers"]).toHaveLength(nbr + 1); //+1 for Range
  });

  test("Model in headless mode should not evaluate cells", () => {
    const model = new Model({ sheets: [{ id: "sheet1" }] }, { mode: "headless" });
    setCellContent(model, "A1", "=1", "sheet1");
    expect(getCell(model, "A1", "sheet1")!.value).not.toBe("1");
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

  test("core plugin can refuse command from UI plugin", () => {
    class MyCorePlugin extends CorePlugin {
      allowDispatch(cmd: CoreCommand) {
        if (cmd.type === "UPDATE_CELL") {
          return CommandResult.CancelledForUnknownReason;
        }
        return CommandResult.Success;
      }
    }
    let result: CommandResult | undefined = undefined;
    class MyUIPlugin extends UIPlugin {
      handle(cmd: Command) {
        if (cmd.type === "COPY") {
          result = this.dispatch("UPDATE_CELL", {
            col: 0,
            row: 0,
            sheetId: this.getters.getActiveSheetId(),
            content: "hello",
          });
        }
      }
    }
    uiPluginRegistry.add("myUIPlugin", MyUIPlugin);
    corePluginRegistry.add("myCorePlugin", MyCorePlugin);
    const model = new Model();
    model.dispatch("COPY", { target: [toZone("A1")] });
    expect(result).toBe(CommandResult.CancelledForUnknownReason);
    uiPluginRegistry.remove("myUIPlugin");
    corePluginRegistry.remove("myCorePlugin");
  });

  test("core plugin cannot refuse command from core plugin", () => {
    let result: CommandResult | undefined = undefined;
    class MyCorePlugin extends CorePlugin {
      allowDispatch(cmd: CoreCommand) {
        if (cmd.type === "UPDATE_CELL") {
          return CommandResult.CancelledForUnknownReason;
        }
        return CommandResult.Success;
      }
      handle(cmd: CoreCommand) {
        if (cmd.type === "CREATE_SHEET") {
          result = this.dispatch("UPDATE_CELL", {
            col: 0,
            row: 0,
            sheetId: cmd.sheetId,
            content: "Hello",
          });
        }
      }
    }
    corePluginRegistry.add("myCorePlugin", MyCorePlugin);
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    expect(result).toBe(CommandResult.Success);
    expect(getCellText(model, "A1", "42")).toBe("Hello");
    corePluginRegistry.remove("myCorePlugin");
  });

  test("UI plugin cannot refuse command from UI plugin", () => {
    let result: CommandResult | undefined = undefined;
    class MyUIPlugin extends UIPlugin {
      allowDispatch(cmd: Command) {
        if (cmd.type === "PASTE") {
          return CommandResult.CancelledForUnknownReason;
        }
        return CommandResult.Success;
      }
      handle(cmd: Command) {
        if (cmd.type === "COPY") {
          result = this.dispatch("PASTE", {
            target: [toZone("A2")],
          });
        }
      }
    }
    uiPluginRegistry.add("myUIPlugin", MyUIPlugin);
    const model = new Model();
    setCellContent(model, "A1", "copy&paste me");
    model.dispatch("COPY", { target: [toZone("A1")] });
    expect(result).toBe(CommandResult.Success);
    expect(getCellText(model, "A2")).toBe("copy&paste me");
    corePluginRegistry.remove("myUIPlugin");
  });

  test("Can open a model in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(model.getters.isReadonly()).toBe(true);
  });

  test("Some commands are not dispatched in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(setCellContent(model, "A1", "hello")).toBe(CommandResult.Readonly);
  });

  test("Moving the selection is allowed in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(selectCell(model, "A15")).toBe(CommandResult.Success);
  });
});
