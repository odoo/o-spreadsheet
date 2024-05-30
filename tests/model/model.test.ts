import { CommandResult, CorePlugin } from "../../src";
import { toZone } from "../../src/helpers";
import { Model, ModelConfig } from "../../src/model";
import { corePluginRegistry, featurePluginRegistry } from "../../src/plugins/index";
import { UIPlugin } from "../../src/plugins/ui_plugin";
import { Command, CommandTypes, CoreCommand, DispatchResult, coreTypes } from "../../src/types";
import { setupCollaborativeEnv } from "../collaborative/collaborative_helpers";
import { copy, redo, selectCell, setCellContent, undo } from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getCellText,
  getEvaluatedCell,
} from "../test_helpers/getters_helpers";
import { addTestPlugin } from "../test_helpers/helpers";

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
    addTestPlugin(featurePluginRegistry, MyUIPlugin);
    addTestPlugin(corePluginRegistry, MyCorePlugin);
    const model = new Model();
    copy(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.CancelledForUnknownReason);
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
    addTestPlugin(corePluginRegistry, MyCorePlugin);
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    expect(result).toBeSuccessfullyDispatched();
    expect(getCellText(model, "A1", "42")).toBe("Hello");
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
    addTestPlugin(featurePluginRegistry, MyUIPlugin);
    const model = new Model();
    setCellContent(model, "A1", "copy&paste me");
    copy(model, "A1");
    expect(result).toBeSuccessfullyDispatched();
    expect(getCellText(model, "A2")).toBe("copy&paste me");
  });

  test("UI plugins cannot refuse core commands", () => {
    class MyUIPlugin extends UIPlugin {
      allowDispatch(cmd: Command) {
        if (cmd.type === "UPDATE_CELL") {
          return CommandResult.CancelledForUnknownReason;
        }
        return CommandResult.Success;
      }
    }
    addTestPlugin(featurePluginRegistry, MyUIPlugin);
    const model = new Model();

    setCellContent(model, "A1", "hello");
    expect(getCellContent(model, "A1")).toBe("hello");
  });

  test("Core plugins allowDispatch don't receive UI commands", () => {
    const receivedCommands: CommandTypes[] = [];
    class MyCorePlugin extends CorePlugin {
      allowDispatch(cmd: CoreCommand): CommandResult {
        receivedCommands.push(cmd.type);
        return CommandResult.Success;
      }
    }
    addTestPlugin(corePluginRegistry, MyCorePlugin);
    const model = new Model();
    model.dispatch("COPY");
    expect(receivedCommands).not.toContain("COPY");
  });

  test("Core plugins handle don't receive UI commands", () => {
    const receivedCommands: CommandTypes[] = [];
    class MyCorePlugin extends CorePlugin {
      handle(cmd: CoreCommand) {
        receivedCommands.push(cmd.type);
      }
    }
    addTestPlugin(corePluginRegistry, MyCorePlugin);
    const model = new Model();
    model.dispatch("COPY");
    expect(receivedCommands).not.toContain("COPY");
  });

  test("canDispatch method is exposed and works", () => {
    class MyCorePlugin extends CorePlugin {
      allowDispatch(cmd: CoreCommand) {
        if (cmd.type === "CREATE_SHEET") {
          return CommandResult.CancelledForUnknownReason;
        }
        return CommandResult.Success;
      }
    }
    addTestPlugin(corePluginRegistry, MyCorePlugin);
    const model = new Model();
    expect(model.canDispatch("CREATE_SHEET", { sheetId: "42", position: 1 })).toBeCancelledBecause(
      CommandResult.CancelledForUnknownReason
    );
    expect(model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 })).toBeCancelledBecause(
      CommandResult.CancelledForUnknownReason
    );

    const sheetId = model.getters.getActiveSheetId();
    expect(
      model.canDispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "hey" })
    ).toBeSuccessfullyDispatched();
    expect(
      model.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "hey" })
    ).toBeSuccessfullyDispatched();
    corePluginRegistry.remove("myCorePlugin");
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

  test("type property in command payload is ignored", () => {
    const model = new Model();
    const payload = {
      col: 0,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      content: "hello",
      type: "greeting",
    };
    model.dispatch("UPDATE_CELL", payload);
    expect(getCell(model, "A1")?.content).toBe("hello");
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
    addTestPlugin(corePluginRegistry, MyCorePlugin1);
    addTestPlugin(corePluginRegistry, MyCorePlugin2);

    expect(() => new Model()).toThrowError(`Getter "getSomething" is already defined.`);
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
    addTestPlugin(featurePluginRegistry, MyUIPlugin1);
    addTestPlugin(featurePluginRegistry, MyUIPlugin2);

    expect(() => new Model()).toThrowError(`Getter "getSomething" is already defined.`);
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
    addTestPlugin(featurePluginRegistry, MyUIPlugin);

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
    addTestPlugin(corePluginRegistry, MyCorePlugin);

    const { alice, bob, network } = setupCollaborativeEnv();
    network.concurrent(() => {
      setCellContent(alice, "A1", "Hello");
      //@ts-ignore
      bob.dispatch("MY_CMD_1");
    });
    expect(numberCall).toEqual(1);
  });

  test("Initial commands are not sent to UI plugins", () => {
    class MyUIPlugin extends UIPlugin {
      handle(cmd: Command) {
        if (cmd.type === "UPDATE_CELL") {
          throw new Error("Should not be called");
        }
      }
    }
    addTestPlugin(featurePluginRegistry, MyUIPlugin);
    const data = {
      sheets: [{ id: "sheet1" }],
      revisionId: "initialRevision",
    };
    const model = new Model(data, {}, [
      {
        type: "REMOTE_REVISION",
        nextRevisionId: "1",
        serverRevisionId: "initialRevision",
        commands: [
          {
            type: "UPDATE_CELL",
            sheetId: "sheet1",
            col: 0,
            row: 0,
            content: "=1+5",
          },
        ],
        clientId: "1",
        version: 1,
      },
    ]);
    expect(getEvaluatedCell(model, "A1").value).toBe(6);
  });

  test("Core commands which dispatch UPDATE_CELL should trigger evaluation", () => {
    //@ts-ignore
    coreTypes.add("MY_CMD_1");
    class MyCorePlugin extends CorePlugin {
      handle(cmd: CoreCommand) {
        //@ts-ignore
        if (cmd.type === "MY_CMD_1") {
          this.dispatch("UPDATE_CELL", {
            //@ts-ignore
            sheetId: cmd.sheetId,
            col: 0,
            row: 0,
            content: "=5",
          });
        }
      }
    }
    addTestPlugin(corePluginRegistry, MyCorePlugin);

    const { alice, bob, charlie } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "=3");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "3"
    );
    //@ts-ignore
    alice.dispatch("MY_CMD_1", { sheetId: alice.getters.getActiveSheetId() });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "5"
    );
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

  describe("withOneHistoryStep callback", () => {
    test("Can execute multiple commands with the withOneHistoryStep callback", () => {
      const model = new Model();
      model.withOneHistoryStep(() => {
        setCellContent(model, "A1", "hello");
        setCellContent(model, "A2", "world");
      });
      expect(getCellContent(model, "A1")).toBe("hello");
      expect(getCellContent(model, "A2")).toBe("world");
    });
  });

  test("Can undo/redo withOneHistoryStep callback", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    model.withOneHistoryStep(() => {
      setCellContent(model, "A1", "world");
      setCellContent(model, "A2", "world");
    });

    expect(getCellContent(model, "A1")).toBe("world");
    expect(getCellContent(model, "A2")).toBe("world");

    undo(model);
    expect(getCellContent(model, "A1")).toBe("hello");
    expect(getCellContent(model, "A2")).toBe("");

    undo(model);
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellContent(model, "A2")).toBe("");

    redo(model);
    expect(getCellContent(model, "A1")).toBe("hello");
    expect(getCellContent(model, "A2")).toBe("");

    redo(model);
    expect(getCellContent(model, "A1")).toBe("world");
    expect(getCellContent(model, "A2")).toBe("world");
  });

  test("Cannot use batch multiple commands with undo", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");

    expect(() => {
      model.withOneHistoryStep(() => {
        undo(model);
        setCellContent(model, "A1", "hey");
      });
    }).toThrowError();
  });

  test("Cannot use batch multiple commands with redo", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    undo(model);

    expect(() => {
      model.withOneHistoryStep(() => {
        redo(model);
        setCellContent(model, "A1", "hey");
      });
    }).toThrowError();
  });
});
