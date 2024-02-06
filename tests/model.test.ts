import { CommandResult, CorePlugin } from "../src";
import { toZone } from "../src/helpers";
import { Model, ModelConfig } from "../src/model";
import { corePluginRegistry, uiPluginRegistry } from "../src/plugins/index";
import { UIPlugin } from "../src/plugins/ui_plugin";
import { Command, CoreCommand, coreTypes, DispatchResult } from "../src/types";
import { setupCollaborativeEnv } from "./collaborative/collaborative_helpers";
import { copy, selectCell, setCellContent } from "./test_helpers/commands_helpers";
import { getCellText } from "./test_helpers/getters_helpers";

describe("Model", () => {
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
    copy(model, "A1");
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
    copy(model, "A1");
    expect(result).toBeSuccessfullyDispatched();
    expect(getCellText(model, "A2")).toBe("copy&paste me");
    uiPluginRegistry.remove("myUIPlugin");
  });

  test("Can open a model in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(model.getters.isReadonly()).toBe(true);
  });

  test("Some commands are not dispatched in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(setCellContent(model, "A1", "hello")).toBeCancelledBecause(CommandResult.Readonly);
  });

  test("Moving the selection is allowed in readonly mode", () => {
    const model = new Model({}, { mode: "readonly" });
    expect(selectCell(model, "A15")).toBeSuccessfullyDispatched();
  });

  test("Can add custom elements in the config of model", () => {
    const model = new Model({}, { custom: "42" } as unknown as ModelConfig);
    expect(model["config"]["custom"]).toBe("42");
  });

  test("Cannot add an already existing core getters", () => {
    class MyCorePlugin1 extends CorePlugin {
      static getters = ["getSomething"];

      getSomething() {}
    }

    class MyCorePlugin2 extends CorePlugin {
      static getters = ["getSomething"];

      getSomething() {}
    }
    corePluginRegistry.add("myCorePlugin1", MyCorePlugin1);
    corePluginRegistry.add("myCorePlugin2", MyCorePlugin2);

    expect(() => new Model()).toThrowError(`Getter "getSomething" is already defined.`);

    corePluginRegistry.remove("myCorePlugin1");
    corePluginRegistry.remove("myCorePlugin2");
  });

  test("Cannot add an already existing getters", () => {
    class MyUIPlugin1 extends UIPlugin {
      static getters = ["getSomething"];

      getSomething() {}
    }

    class MyUIPlugin2 extends UIPlugin {
      static getters = ["getSomething"];

      getSomething() {}
    }
    uiPluginRegistry.add("myUIPlugin1", MyUIPlugin1);
    uiPluginRegistry.add("myUIPlugin2", MyUIPlugin2);

    expect(() => new Model()).toThrowError(`Getter "getSomething" is already defined.`);

    uiPluginRegistry.remove("myUIPlugin1");
    uiPluginRegistry.remove("myUIPlugin2");
  });

  test("Replayed commands are not send to UI plugins", () => {
    let numberCall = 0;
    //@ts-ignore
    coreTypes.add("MY_CMD_1");
    //@ts-ignore
    coreTypes.add("MY_CMD_2");
    class MyUIPlugin extends UIPlugin {
      handle(cmd: Command) {
        //@ts-ignore
        if (cmd.type === "MY_CMD_2") {
          if (this.getters.getClient().id === "bob") {
            numberCall++;
          }
        }
      }
    }
    uiPluginRegistry.add("myUIPlugin", MyUIPlugin);

    class MyCorePlugin extends CorePlugin {
      public readonly state: number = 0;
      handle(cmd: CoreCommand) {
        //@ts-ignore
        if (cmd.type === "MY_CMD_1") {
          this.history.update("state", 1);
          //@ts-ignore
          this.dispatch("MY_CMD_2");
        }
      }
    }
    corePluginRegistry.add("myCorePlugin", MyCorePlugin);

    const { alice, bob, network } = setupCollaborativeEnv();
    network.concurrent(() => {
      setCellContent(alice, "A1", "Hello");
      //@ts-ignore
      bob.dispatch("MY_CMD_1");
    });
    expect(numberCall).toEqual(1);
    uiPluginRegistry.remove("myUIPlugin");
    corePluginRegistry.remove("myCorePlugin");
  });

  test("export formula with unbound zone stays unbound", () => {
    const modelData = {
      sheets: [
        {
          cells: {
            A1: { content: "=SUM(A3:3)" },
            A2: { content: "=SUM(A3:A)" },
          },
        },
      ],
    };
    const model = new Model(modelData);
    expect(model.exportData()).toMatchSnapshot();
  });
});
