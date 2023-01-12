import seedrandom from "seedrandom";
import { Model } from "../../src";
import { deepCopy, range } from "../../src/helpers";
import { Command } from "../../src/types";
// import { redo, undo } from "../test_helpers/commands_helpers";
import { printDebugModel } from "../test_helpers/debug_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import { revisions } from "./revisions_party";

const commands: Command[][] = revisions.map((revision) => {
  switch (revision.type) {
    case "REMOTE_REVISION":
      if (revision.commands === undefined) {
        console.log(revision);
      }
      return revision.commands as Command[];
    case "REVISION_UNDONE":
      return [{ type: "REQUEST_UNDO" }];
    case "REVISION_REDONE":
      return [{ type: "REQUEST_REDO" }];
    default:
      return [];
  }
});

type UserAction = { commands: Command[]; user: Model };

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

function assignUser(commands: Command[][], users: Model[]): UserAction[] {
  return commands.map((commands) => ({ commands, user: randomChoice(users) }));
}

describe("monkey party", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  const now = Date.now();
  const seeds = range(0, 200).map((i) => (now + i).toString());
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
  //1643365577223
  // 1643639531275 1643639531325
  // export cells 1643724900272
  test.each(["1673524871000"])("monkey party with seed %s", (seed) => {
    //   test.each(seeds)("monkey party with seed %s", (seed) => {
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
        for (const { commands, user } of commandGroup) {
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
          for (const command of commands) {
            x.push(
              `${user["config"].client.name.toLowerCase()}.dispatch("${
                command.type
              }", ${JSON.stringify({ ...command, type: undefined })});`
            );
            user.dispatch(command.type, deepCopy(command));
          }
        }
        if (count === 12) {
          // console.log(x.join("\n"));
        }
      });
      x.push("});");
      // console.log(count);
      // printDebugModel(alice);
      // printDebugModel(bob);
      // if (count === 15) {
      // }
      // expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    }
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Tu dois foirer", () => {
    seedrandom("1643639531275", { global: true });
  });
});
