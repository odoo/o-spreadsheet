import { Model } from "../../src";
import { deepEquals, range } from "../../src/helpers";
import { Command } from "../../src/types";
// import { redo, undo } from "../test_helpers/commands_helpers";
import { FunctionCodeBuilder } from "../../src/formulas/code_builder";
import { MockTransportService } from "../__mocks__/transport_service";
import { redo } from "../test_helpers/commands_helpers";
import { printDebugModel } from "../test_helpers/debug_helpers";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
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
  // FIXME we are checking the same combination twice
  for (let a of users) {
    for (let b of users) {
      if (a === b) {
        continue;
      }
      const exportA = a.exportData();
      const exportB = b.exportData();
      if (!deepEquals(exportA, exportB)) {
        return false;
      }
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
  const seeds = range(0, 80).map((i) => (now + i).toString());
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

  test.each(["1738925119284"])("monkey party with seed %s", (seed) => {
    // test.each(seeds)("monkey party with seed %s", (seed) => {
    seedrandom(seed, { global: true });

    // add some undo/redo
    const undoRedoRatio = 0.1;
    const undoRedoCount = Math.floor(commands.length * undoRedoRatio);
    const commandsWithUndoRedo = [...commands];
    commandsWithUndoRedo.push(
      ...new Array(undoRedoCount).fill({ type: "REQUEST_UNDO" }),
      ...new Array(undoRedoCount).fill({ type: "REQUEST_REDO" })
    );
    const actions = assignUser(shuffle(commandsWithUndoRedo), [alice, bob, charlie]);
    const concurrencyGroups = randomConcurrencyGroup(actions);

    const { fail, executedActions } = run(network, [alice, bob, charlie], concurrencyGroups);
    if (fail) {
      // console.log(actionsToTestCode(seed, executedActions));
      // console.log(minimizeFailingCommands(executedActions).length);
      console.log(actionsToTestCode(seed, minimizeFailingCommands(executedActions)));
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
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (usef) => getEvaluatedCell(usef, "A1").value,
      4
    );
    printDebugModel(bob);
    printDebugModel(charlie);
    // debugger
    redo(bob);
  });
});
