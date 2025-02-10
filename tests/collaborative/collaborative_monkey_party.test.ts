import seedrandom from "seedrandom";
import { Model } from "../../src";
import { deepCopy, deepEquals, range, reorderZone, zoneToXc } from "../../src/helpers";
import {
  Command,
  CoreCommand,
  isPositionDependent,
  isRangeDependant,
  isSheetDependent,
  isTargetDependent,
  UnboundedZone,
} from "../../src/types";
import { getRangeValues } from "../test_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

/**
 * The monkey party test simulates random user actions in a collaborative environment
 * to ensure all users remain synchronized.
 *
 * If a randomly generated test fails, it minimizes the failing commands and
 * generates a minimal test case that you can copy-paste from the console.
 *
 * By default, this test runs once with a deterministic seed to prevent
 * non-deterministic behavior in the CI pipeline.
 *
 * It is intended to be run locally from time to time by increasing `PARTY_COUNT`.
 */

const PARTY_COUNT: number = 1; // increase this number to run more tests and enjoy the parties 🐵🎉

describe("monkey party", () => {
  const now = Date.now();
  const seeds = range(0, PARTY_COUNT).map((i) => (now + i).toString());

  test.each(PARTY_COUNT === 1 ? ["deterministic-seed"] : seeds)(
    "monkey party with seed %s",
    (seed) => {
      seedrandom(seed, { global: true });
      const { network, alice, bob, charlie } = setupCollaborativeEnv();

      // duplicate commands to test the same command interacting with itself
      const commands = deepCopy(Object.values(TEST_COMMANDS).concat(Object.values(TEST_COMMANDS)));
      addUndoRedo(commands);
      randomizeCommandsPayload(commands);

      const actions = assignUser(shuffle(commands), [alice, bob, charlie]);
      const concurrentActions = randomizeConcurrentActions(actions);
      const { fail, executedActions } = run(network, [alice, bob, charlie], concurrentActions);
      if (fail) {
        const generatedTestCode = actionsToTestCode(
          `failed with seed ${seed}`,
          minimizeFailingCommands(executedActions)
        );
        console.log(generatedTestCode);
        expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
        throw new Error(`Failed with seed ${seed}!`);
      }
      expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    }
  );
});

function addUndoRedo(commands: CoreCommand[]) {
  const undoRedoRatio = 0.2;
  const undoRedoCount = Math.floor(commands.length * undoRedoRatio);
  commands.push(
    ...new Array(undoRedoCount).fill({ type: "REQUEST_UNDO" }),
    ...new Array(undoRedoCount).fill({ type: "REQUEST_REDO" })
  );
}

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

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomizeConcurrentActions(commands: UserAction[]): UserAction[][] {
  const result: UserAction[][] = [];
  while (commands.length) {
    const groupSize = randomIntFromInterval(1, 6);
    result.push(commands.splice(0, groupSize));
  }
  return result;
}

function assignUser(commands: CoreCommand[], users: Model[]): UserAction[] {
  return commands.map((cmd) => ({ command: cmd, user: randomChoice(users) }));
}

function actionsToTestCode(testTitle: string, actions: UserAction[][]) {
  const code: string[] = [];
  code.push(`test("${testTitle}", () => {`);
  code.push("const { network, alice, bob, charlie } = setupCollaborativeEnv();");
  for (const commandGroup of actions) {
    if (commandGroup.length === 1) {
      appendCommand(code, commandGroup[0]);
    } else {
      code.push("network.concurrent(() => {");
      for (const action of commandGroup) {
        appendCommand(code, action);
      }
      code.push("});");
    }
  }
  code.push("expect([alice, bob, charlie]).toHaveSynchronizedExportedData();", "});");
  return code.join("\n");
}

function appendCommand(code: string[], { user, command }: UserAction) {
  const userName = user.getters.getClient().name.toLowerCase();
  if (command.type === "REQUEST_UNDO") {
    code.push(`undo(${userName});`);
  } else if (command.type === "REQUEST_REDO") {
    code.push(`redo(${userName});`);
  } else {
    const cmdPayload = JSON.stringify({ ...command, type: undefined });
    code.push(`${userName}.dispatch("${command.type}", ${cmdPayload});`);
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
        // reduce the chunk command-by-command
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

function evaluationsAreSynced(users: Model[]): boolean {
  for (let i = 0; i < users.length - 1; i++) {
    for (const sheetId of users[i].getters.getSheetIds()) {
      const sheetZoneXc = zoneToXc(users[i].getters.getSheetZone(sheetId));
      const valuesUserA = getRangeValues(users[i], sheetZoneXc, sheetId);
      const valuesUserB = getRangeValues(users[i + 1], sheetZoneXc, sheetId);
      if (!deepEquals(valuesUserA, valuesUserB)) {
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
      expect(evaluationsAreSynced(users)).toBe(true);
    } catch (e) {
      console.error(e);
      concurrentlyExecuted.length = 0;
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

function randomizeCommandsPayload(commands: CoreCommand[]) {
  const allSheetIds = commands.map((cmd) => cmd.sheetId).filter(Boolean);
  for (const command of commands) {
    if (isSheetDependent(command)) {
      command.sheetId = randomChoice(allSheetIds);
    }
    if (isTargetDependent(command)) {
      command.target = Array.from(range(1, randomIntFromInterval(2, 3)), generateRandomZone);
    } else if (isPositionDependent(command)) {
      command.col = randomIntFromInterval(0, 10);
      command.row = randomIntFromInterval(0, 10);
    } else if (isRangeDependant(command)) {
      command.ranges = command.ranges.map((range) => ({
        _sheetId: randomChoice(allSheetIds),
        _zone: generateUnboundedRandomZone(),
      }));
    }
  }
}

function generateUnboundedRandomZone(): UnboundedZone {
  switch (randomChoice(["bounded", "full-row", "full-col"])) {
    case "full-row": {
      const hasHeader = Math.random() > 0.5;
      const zone = {
        hasHeader,
        left: !hasHeader ? 0 : randomIntFromInterval(0, 10),
        right: undefined,
        top: randomIntFromInterval(0, 10),
        bottom: randomIntFromInterval(0, 10),
      };
      reorderZone(zone);
      return zone;
    }
    case "full-col": {
      const hasHeader = Math.random() > 0.5;
      const zone = {
        hasHeader,
        left: randomIntFromInterval(0, 10),
        right: randomIntFromInterval(0, 10),
        top: !hasHeader ? 0 : randomIntFromInterval(0, 10),
        bottom: undefined,
      };
      reorderZone(zone);
      return zone;
    }
    default:
      return generateRandomZone();
  }
}

function generateRandomZone() {
  const zone = {
    left: randomIntFromInterval(0, 10),
    right: randomIntFromInterval(0, 10),
    top: randomIntFromInterval(0, 10),
    bottom: randomIntFromInterval(0, 10),
  };
  reorderZone(zone);
  return zone;
}
