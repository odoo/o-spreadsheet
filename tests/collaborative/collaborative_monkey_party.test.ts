import { Model } from "../../src";
import { deepEquals, range } from "../../src/helpers";
import { Command } from "../../src/types";
// import { redo, undo } from "../test_helpers/commands_helpers";
import seedrandom from "seedrandom";
import { FunctionCodeBuilder } from "../../src/formulas/code_builder";
import { MockTransportService } from "../__mocks__/transport_service";
import { createSheet, deleteSheet, redo, undo } from "../test_helpers/commands_helpers";
import { printDebugModel } from "../test_helpers/debug_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import { commands } from "./revisions_party";

type UserAction = { command: Command; user: Model };

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomConcurrencyGroup(commands: UserAction[]): UserAction[][] {
  const result: any[] = [];
  while (commands.length) {
    const groupSize = randomIntFromInterval(1, 6);
    result.push(commands.splice(0, groupSize));
  }
  return result;
}

function assignUser(commands: Command[], users: Model[]): UserAction[] {
  return commands.map((cmd) => ({ command: cmd, user: randomChoice(users) }));
}

function actionsToTestCode(testTitle, actions: UserAction[][]) {
  const code = new FunctionCodeBuilder();
  code.append(`test("${testTitle}", () => {`);
  for (const commandGroup of actions) {
    if (commandGroup.length === 1) {
      appendCommand(code, commandGroup[0]);
    } else {
      code.append("network.concurrent(() => {");
      for (const { command, user } of commandGroup) {
        appendCommand(code, { user, command });
      }
      code.append("});");
    }
  }
  code.append("expect([alice, bob, charlie]).toHaveSynchronizedExportedData();", "});");
  return code.toString();
}

function appendCommand(code: FunctionCodeBuilder, { user, command }: UserAction) {
  const userName = user.getters.getClient().name.toLowerCase();
  if (command.type === "REQUEST_UNDO") {
    code.append(`undo(${userName});`);
  } else if (command.type === "REQUEST_REDO") {
    code.append(`redo(${userName});`);
  } else {
    const cmdPayload = JSON.stringify({ ...command, type: undefined });
    code.append(`${userName}.dispatch("${command.type}", ${cmdPayload});`);
  }
}

function rerunTest(actions: UserAction[][]) {
  const { network, alice, bob, charlie } = setupCollaborativeEnv();
  const newUsers = { alice, bob, charlie };
  for (const concurrentChunk of actions) {
    for (const action of concurrentChunk) {
      action.user = newUsers[action.user.getters.getClient().name.toLowerCase()];
    }
  }
  return run(network, [alice, bob, charlie], actions);
}

function minimizeFailingCommands(actions: UserAction[][]) {
  // try removing concurrent actions chunk by chunk
  let reduced = true;
  while (reduced) {
    reduced = false;
    for (let chunkIndex = 0; chunkIndex < actions.length; chunkIndex++) {
      const testCase = actions.slice(0, chunkIndex).concat(actions.slice(chunkIndex + 1));

      const { fail } = rerunTest(testCase);
      if (fail) {
        actions = testCase;
        reduced = true;
      } else {
        // reduce the chunck command-by-command
        let chunkReduced = true;
        while (chunkReduced) {
          chunkReduced = false;
          const chunk = actions[chunkIndex];
          for (let cmdIndex = 0; cmdIndex < chunk.length; cmdIndex++) {
            const testChunkCase = [...actions];
            testChunkCase[chunkIndex] = chunk.slice(0, cmdIndex).concat(chunk.slice(cmdIndex + 1));
            const { fail } = rerunTest(testChunkCase);
            if (fail) {
              actions = testChunkCase;
              chunkReduced = true;
            }
          }
        }
      }
    }
  }
  return actions;
}

function areSynced(users: Model[]): boolean {
  for (let i = 0; i < users.length - 1; i++) {
    if (!deepEquals(users[i].exportData(), users[i + 1].exportData())) {
      return false;
    }
  }
  return true;
}

function run(network: MockTransportService, users: Model[], actions: UserAction[][]) {
  const executed: UserAction[][] = [];
  for (const commandGroup of actions) {
    const concurrentlyExecuted: UserAction[] = [];
    executed.push(concurrentlyExecuted);
    try {
      network.concurrent(() => {
        for (const { command, user } of commandGroup) {
          const result = user.dispatch(command.type, command);
          if (result.isSuccessful) {
            concurrentlyExecuted.push({ command, user });
          }
        }
      });
    } catch (e) {
      concurrentlyExecuted.push(...commandGroup);
      return {
        fail: true,
        executedActions: executed,
      };
    }
  }
  return {
    fail: !areSynced(users),
    executedActions: executed,
  };
}

describe("monkey party", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  const now = Date.now();
  const seeds = range(0, 500).map((i) => (now + i).toString());
  seeds;
  let print = () => {
    printDebugModel(alice);
    printDebugModel(bob);
    printDebugModel(charlie);
  };
  print;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  // add some undo/redo
  const undoRedoRatio = 0.1;
  const undoRedoCount = Math.floor(commands.length * undoRedoRatio);
  const commandsWithUndoRedo = [...commands];
  commandsWithUndoRedo.push(
    ...new Array(undoRedoCount).fill({ type: "REQUEST_UNDO" }),
    ...new Array(undoRedoCount).fill({ type: "REQUEST_REDO" })
  );

  // test.each(["1738925119284"])("monkey party with seed %s", (seed) => {
  test.each(seeds)("monkey party with seed %s", (seed) => {
    // :)
    seedrandom(seed, { global: true });

    const actions = assignUser(shuffle(commandsWithUndoRedo), [alice, bob, charlie]);
    const concurrencyGroups = randomConcurrencyGroup(actions);

    const { fail, executedActions } = run(network, [alice, bob, charlie], concurrencyGroups);
    if (fail) {
      // console.log(actionsToTestCode(seed, executedActions));
      // console.log(minimizeFailingCommands(executedActions).length);
      console.log(actionsToTestCode(seed, minimizeFailingCommands(executedActions)));
      expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
      throw new Error("Failed"); // state can be synced even if a crash occurs
      // console.log(executedActions.length);
    }
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1738925119284", () => {
    bob.dispatch("CREATE_SHEET", {
      sheetId: "sheet2",
      position: 1,
      name: "Sheet2",
    });
    charlie.dispatch("DUPLICATE_SHEET", {
      sheetId: "sheet2",
      sheetIdTo: "sheet3",
    });
    alice.dispatch("HIDE_SHEET", { sheetId: "sheet2" });
    network.concurrent(() => {
      bob.dispatch("DELETE_SHEET", { sheetId: "sheet3" });
      alice.dispatch("CREATE_SHEET", {
        sheetId: "sheet4",
        name: "New pivot (copy) (Pivot #2)",
        position: 2,
      });
      charlie.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1738851888923", () => {
    bob.dispatch("CREATE_SHEET", {
      sheetId: "5d17252a-7b7a-448e-9c9b-706349d797cb",
      name: "Pivot #1",
      position: 1,
    });
    network.concurrent(() => {
      bob.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 4, content: "4" });
      charlie.dispatch("SET_FORMATTING", { sheetId: "Sheet1", target: [], format: "" });
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 0, content: "4" });
      // charlie.dispatch("DELETE_SHEET", { "sheetId": "Sheet1" });
    });
    // expect([alice, bob, charlie]).toHaveSynchronizedValue(
    //   (usef) => getEvaluatedCell(usef, "A1").value,
    //   4
    // );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    printDebugModel(bob);
    printDebugModel(charlie);
    // debugger
    redo(bob);
  });

  test("1738939279712", () => {
    bob.dispatch("CREATE_SHEET", {
      sheetId: "57047cd7-c980-4231-b9f2-1da2a98a3136",
      position: 1,
      name: "Sheet2",
    });
    bob.dispatch("DUPLICATE_SHEET", {
      sheetId: "57047cd7-c980-4231-b9f2-1da2a98a3136",
      sheetIdTo: "5c555a62-a750-4877-97ac-654f3b85e287",
    });
    network.concurrent(() => {
      charlie.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
      alice.dispatch("UNGROUP_HEADERS", {
        sheetId: "Sheet1",
        dimension: "COL",
        start: 3,
        end: 5,
      });
      alice.dispatch("DELETE_SHEET", { sheetId: "5c555a62-a750-4877-97ac-654f3b85e287" });
    });
    charlie.dispatch("HIDE_SHEET", { sheetId: "57047cd7-c980-4231-b9f2-1da2a98a3136" });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1738939279745", () => {
    const name = "Sheet2";
    createSheet(bob, { name, position: 1, sheetId: "Sheet2" });
    deleteSheet(bob, "Sheet2");
    network.concurrent(() => {
      undo(bob);

      // this create sheet is rejected and should not be replayed
      // to UI plugins.
      createSheet(alice, { name, position: 1, sheetId: "Sheet2bis" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1738954896185 header position is not recreated when the DELETE_SHEET is dropped", () => {
    bob.dispatch("CREATE_SHEET", { sheetId: "sheet2", position: 1, name: "Sheet2" });
    bob.dispatch("DUPLICATE_SHEET", { sheetId: "sheet2", sheetIdTo: "sheet3" });
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId: "Sheet1",
        target: [{ left: 4, right: 5, top: 9, bottom: 11 }],
      });
      charlie.dispatch("SET_FORMATTING", { sheetId: "Sheet1", target: [], format: "" });
      charlie.dispatch("DELETE_SHEET", { sheetId: "sheet3" });
    });
    bob.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: "Sheet1",
      elements: [2],
      size: 61,
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739001275639 dropped UPDATE_CELL command targets sheet1 that was just deleted", () => {
    bob.dispatch("CREATE_SHEET", { sheetId: "sheet2", position: 1, name: "Sheet2" });
    bob.dispatch("UPDATE_CELL", { sheetId: "sheet2", col: 2, row: 19, content: "7" });
    network.concurrent(() => {
      alice.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
      redo(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739002942601", () => {
    charlie.dispatch("CREATE_SHEET", { sheetId: "sheet2", position: 1, name: "Sheet2" });
    network.concurrent(() => {
      alice.dispatch("HIDE_SHEET", { sheetId: "sheet2" });

      // UI plugins are not aware that this command was rejected when replayed after the HIDE_SHEET
      // and that sheet1 actually exists.
      charlie.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739004045806", () => {
    alice.dispatch("GROUP_HEADERS", { sheetId: "Sheet1", dimension: "ROW", start: 6, end: 8 });
    charlie.dispatch("CREATE_SHEET", { sheetId: "sheet2", name: "Pivot #1", position: 1 });
    charlie.dispatch("FOLD_HEADER_GROUP", {
      sheetId: "Sheet1",
      dimension: "ROW",
      start: 6,
      end: 8,
    });
    // the plugin was notified that FOLD_HEADER_GROUP was undone
    // at this point, sheet1 exists.
    // DELETE_SHEET is replayed only on core plugins. The viewport plugin thinks that sheet1 is still there
    // and did not update its dirty viewports.
    charlie.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    undo(alice);
    // when replaying FOLD_HEADER_GROUP, it adds sheet1 to the dirty viewports.
    // but the plugin is not aware that the sheet is later deleted when replaying DELETE_SHEET.
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739004046070", () => {
    bob.dispatch("ADD_DATA_VALIDATION_RULE", {
      sheetId: "Sheet1",
      ranges: [{ _zone: { top: 3, left: 6, bottom: 7, right: 6 }, _sheetId: "Sheet1" }],
      rule: {
        id: "e860d4a8-477d-465f-ad74-0b45d370c0d6",
        criterion: { type: "isValueInList", values: [], displayStyle: "arrow" },
      },
    });
    network.concurrent(() => {
      charlie.dispatch("CREATE_SHEET", {
        sheetId: "57047cd7-c980-4231-b9f2-1da2a98a3136",
        position: 1,
        name: "Sheet2",
      });
      alice.dispatch("REMOVE_DATA_VALIDATION_RULE", {
        sheetId: "Sheet1",
        id: "e860d4a8-477d-465f-ad74-0b45d370c0d6",
      });
    });
    alice.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    undo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739010417637", () => {
    charlie.dispatch("CREATE_SHEET", { sheetId: "sheet2", position: 1, name: "Sheet2" });
    alice.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    network.concurrent(() => {
      undo(alice);
      charlie.dispatch("ADD_PIVOT", {
        pivotId: "4277f7bf-dd74-4ebb-85b8-9dee21b261c5",
        pivot: {
          dataSet: { zone: { left: 6, right: 6, top: 3, bottom: 7 }, sheetId: "Sheet1" },
          columns: [],
          rows: [],
          measures: [],
          name: "New pivot",
          type: "SPREADSHEET",
        },
      });
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("1739178771385", () => {
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 4, content: "4" });

      // this command is dropped. UI plugins needs to be aware and recompute their state
      // at finalize
      charlie.dispatch("SET_FORMATTING", { sheetId: "Sheet1", target: [], format: "" });
    });
    charlie.dispatch("UNFREEZE_COLUMNS_ROWS", { sheetId: "Sheet1" });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });
});
