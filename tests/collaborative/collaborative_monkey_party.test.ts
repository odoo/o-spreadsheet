import seedrandom from "seedrandom";
import { Model } from "../../src";
import { deepCopy, range } from "../../src/helpers";
import { Command } from "../../src/types";
// import { redo, undo } from "../test_helpers/commands_helpers";
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

function randomGroup(commands: UserAction[]): UserAction[][] {
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

  let x: string[] = [];

  test.each(["1738918805500"])("monkey party with seed %s", (seed) => {
    // test.each(seeds)("monkey party with seed %s", (seed) => {
    // test("monkey party with seed %s", () => {
    seedrandom(seed, { global: true });
    shuffle;
    const actions = assignUser(shuffle(commands), [alice, bob, charlie]);
    const commandGroups = randomGroup(actions);
    let count = 0;
    for (const commandGroup of commandGroups) {
      count++;
      x.push("network.concurrent(() => {");
      network.concurrent(() => {
        for (const { command, user } of commandGroup) {
          if (Math.random() > 0.9) {
            const result = user.dispatch("REQUEST_UNDO");
            if (!result.isSuccessful) {
              // x.push(`undo(${user["config"].client.name.toLowerCase()}) // refused`);
            } else {
              x.push(`undo(${user["config"].client.name.toLowerCase()})`);
            }
          } else if (Math.random() > 0.9) {
            const result = user.dispatch("REQUEST_REDO");
            if (!result.isSuccessful) {
              // x.push(`redo(${user["config"].client.name.toLowerCase()}) // refused`);
            } else {
              x.push(`redo(${user["config"].client.name.toLowerCase()})`);
            }
          }
          x.push(
            `${user["config"].client.name.toLowerCase()}.dispatch("${
              command.type
            }", ${JSON.stringify({ ...command, type: undefined })});`
          );
          user.dispatch(command.type, deepCopy(command));
        }
        x.push("});");
      });
      // console.log(count);
      // printDebugModel(alice);
      // printDebugModel(bob);
      // if (count === 15) {
      // }
      // expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    }
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
