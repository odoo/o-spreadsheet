import { CommandResult, CorePlugin } from "../src";
import { toZone } from "../src/helpers";
import { LocalHistory } from "../src/history/local_history";
import { Mode, Model, ModelConfig } from "../src/model";
import { BordersPlugin } from "../src/plugins/core/borders";
import { CellPlugin } from "../src/plugins/core/cell";
import { ChartPlugin } from "../src/plugins/core/chart";
import { ConditionalFormatPlugin } from "../src/plugins/core/conditional_format";
import { FigurePlugin } from "../src/plugins/core/figures";
import { MergePlugin } from "../src/plugins/core/merge";
import { RangeAdapter } from "../src/plugins/core/range";
import { SheetPlugin } from "../src/plugins/core/sheet";
import { UserHeaderSizePlugin } from "../src/plugins/core/user_header_size";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";
import { AutomaticSumPlugin } from "../src/plugins/ui/automatic_sum";
import { FindAndReplacePlugin } from "../src/plugins/ui/find_and_replace";
import { SortPlugin } from "../src/plugins/ui/sort";
import { SheetUIPlugin } from "../src/plugins/ui/ui_sheet";
import { UIPlugin } from "../src/plugins/ui_plugin";
import { Command, CoreCommand, DispatchResult } from "../src/types";
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
    const expectedPlugins = [
      RangeAdapter,
      SheetPlugin,
      UserHeaderSizePlugin,
      CellPlugin,
      MergePlugin,
      BordersPlugin,
      ConditionalFormatPlugin,
      FigurePlugin,
      ChartPlugin,
      SheetUIPlugin,
      FindAndReplacePlugin,
      SortPlugin,
      AutomaticSumPlugin,
      LocalHistory,
    ];
    expect(model["handlers"]).toHaveLength(expectedPlugins.length);
    for (let i of model["handlers"].keys()) {
      expect(model["handlers"][i]).toBeInstanceOf(expectedPlugins[i]);
    }
  });

  test("All plugin compatible with normal mode are loaded on normal mode", () => {
    const model = new Model();
    const nbr = getNbrPlugin("normal");
    expect(model["handlers"]).toHaveLength(nbr + 2); //+1 for Range +1 for History
  });

  test("All plugin compatible with headless mode are loaded on headless mode", () => {
    const model = new Model({}, { mode: "headless" });
    const nbr = getNbrPlugin("headless");
    expect(model["handlers"]).toHaveLength(nbr + 2); //+1 for Range +1 for History
  });

  test("Model in headless mode should not evaluate cells", () => {
    const model = new Model({ sheets: [{ id: "sheet1" }] }, { mode: "headless" });
    setCellContent(model, "A1", "=1", "sheet1");
    expect(getCell(model, "A1", "sheet1")!.evaluated.value).not.toBe("1");
  });

  test("can add a Plugin only in headless mode", () => {
    class NormalPlugin extends UIPlugin {
      static modes: Mode[] = ["normal"];
    }
    class HeadlessPlugin extends UIPlugin {
      static modes: Mode[] = ["headless"];
    }
    uiPluginRegistry.add("normalPlugin", NormalPlugin);
    uiPluginRegistry.add("headlessPlugin", HeadlessPlugin);
    const modelNormal = new Model();
    expect(modelNormal["handlers"].find((handler) => handler instanceof NormalPlugin)).toBeTruthy();
    expect(
      modelNormal["handlers"].find((handler) => handler instanceof HeadlessPlugin)
    ).toBeFalsy();
    const modelHeadless = new Model({}, { mode: "headless" });
    expect(
      modelHeadless["handlers"].find((handler) => handler instanceof NormalPlugin)
    ).toBeFalsy();
    expect(
      modelHeadless["handlers"].find((handler) => handler instanceof HeadlessPlugin)
    ).toBeTruthy();
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
    let result: DispatchResult | undefined = undefined;
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
    expect(result).toBeCancelledBecause(CommandResult.CancelledForUnknownReason);
    uiPluginRegistry.remove("myUIPlugin");
    corePluginRegistry.remove("myCorePlugin");
  });

  test("core plugin cannot refuse command from core plugin", () => {
    let result: DispatchResult | undefined = undefined;
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
    expect(result).toBeSuccessfullyDispatched();
    expect(getCellText(model, "A1", "42")).toBe("Hello");
    corePluginRegistry.remove("myCorePlugin");
  });

  test("UI plugin cannot refuse command from UI plugin", () => {
    let result: DispatchResult | undefined = undefined;
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
    expect(result).toBeSuccessfullyDispatched();
    expect(getCellText(model, "A2")).toBe("copy&paste me");
    corePluginRegistry.remove("myUIPlugin");
  });

  test("Can open a model in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(model.getters.isReadonly()).toBe(true);
  });

  test("Some commands are not dispatched in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(setCellContent(model, "A1", "hello")).toBeCancelledBecause(CommandResult.Readonly);
  });

  test("Moving the selection is allowed in readonly mode", () => {
    const model = new Model({}, { isReadonly: true });
    expect(selectCell(model, "A15")).toBeSuccessfullyDispatched();
  });

  test("Can add custom elements in the config of model", () => {
    const model = new Model({}, { custom: "42" } as unknown as ModelConfig);
    expect(model["config"]["custom"]).toBe("42");
  });
});
