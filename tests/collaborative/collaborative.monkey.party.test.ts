import seedrandom from "seedrandom";
import { Model } from "../../src";
import { range } from "../../src/helpers";
import { Command } from "../../src/types";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

const revisions = [
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 0,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [],
  },
  {
    type: "REMOTE_REVISION",
    commands: [],
  },
  {
    type: "REMOTE_REVISION",
    commands: [],
  },
  {
    type: "REMOTE_REVISION",
    commands: [],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 1,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 24,
        style: null,
        content: "=D22",
        format: "",
      },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 25,
        style: null,
        content: "=D23",
        format: "",
      },
    ],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "6912f214-8ca0-4e46-9a91-a7bb19e9b15c",
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 12, content: "A" }],
  },
];

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
    const groupSize = randomIntFromInterval(1, 4);
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
  const seeds = range(0, 1).map((i) => (now + i).toString());
  seeds;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  // 1643123096815 1643123155749

  // test.each(["1643123096815"])("monkey party with seed %s", (seed) => {
  test("collaborative monkey party with seed", () => {
    seedrandom("1643123155749", { global: true });
    shuffle;
    const actions = assignUser(commands, [alice, bob, charlie]);
    const commandGroups = randomGroup(actions);
    for (const commandGroup of commandGroups) {
      network.concurrent(() => {
        for (const { commands, user } of commandGroup) {
          for (const command of commands) {
            user.dispatch(command.type, command);
          }
        }
      });
      console.log(
        commandGroup.map(({ commands, user }) => {
          return `${user.getters.getClient().name}`;
        }),
        commandGroup.map(({ commands, user }) => commands)
      );
      expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    }
    // const firstSheetId = alice.getters.getSheets()[0].id;
    // console.log(alice.getters.getFigures(firstSheetId));
    // console.log(bob.getters.getFigures(firstSheetId));
    // const sheetId = alice.getters.getSheets()[1].id;
    // console.log(alice.getters.getFigures(sheetId));
    // console.log(bob.getters.getFigures(sheetId));
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });
});
