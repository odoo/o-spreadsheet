import {
  Client,
  Command,
  CommandResult,
  CoreCommand,
  HistoryChange,
  Model,
  WorkbookData,
} from "../../src";
import { ICommandSquisher, SquishedCoreCommand } from "../../src/collaborative/command_squisher";
import { Session } from "../../src/collaborative/session";
import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../../src/constants";
import { lazy } from "../../src/helpers/misc";
import { buildRevisionLog } from "../../src/history/factory";
import { MockTransportService } from "../__mocks__/transport_service";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { nextTick, useJestFakeTimers } from "../test_helpers/helpers";

class MockCommandSquisher implements ICommandSquisher {
  public squish(
    allCommands: readonly (CoreCommand | SquishedCoreCommand)[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    return [...allCommands];
  }
  public unsquish(
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): CoreCommand[] {
    return commands as CoreCommand[];
  }
}

/** A squisher whose unsquish does not reproduce what was squished, simulating a squishing bug. */
class LossyCommandSquisher implements ICommandSquisher {
  public squish(commands: readonly CoreCommand[]): (CoreCommand | SquishedCoreCommand)[] {
    return commands.map((x) => Object.assign(x, { type: "SQUISHED_UPDATE_CELL" }));
  }
  public unsquish(): CoreCommand[] {
    return [];
  }
}

function createSession(
  transport: MockTransportService,
  squisher: ICommandSquisher,
  shouldVerifySquish?: boolean
): Session {
  const revisionLog = buildRevisionLog({
    initialRevisionId: DEFAULT_REVISION_ID,
    recordChanges: () => ({ changes: [], commands: [] }),
    dispatch: () => CommandResult.Success,
  });
  const session = new Session(
    revisionLog,
    transport,
    DEFAULT_REVISION_ID,
    squisher,
    shouldVerifySquish
  );
  session.join({ id: "alice", name: "Alice" });
  return session;
}

describe("Collaborative session", () => {
  let transport: MockTransportService;
  let session: Session;
  let client: Client;

  beforeEach(() => {
    useJestFakeTimers();

    transport = new MockTransportService();
    client = {
      id: "alice",
      name: "Alice",
    };
    const revisionLog = buildRevisionLog({
      initialRevisionId: "START_REVISION",
      recordChanges: () => ({ changes: [], commands: [] }),
      dispatch: () => CommandResult.Success,
    });
    session = new Session(revisionLog, transport, DEFAULT_REVISION_ID, new MockCommandSquisher());
    session.join(client);
  });

  test("local client move", () => {
    session.move({ sheetId: "sheetId", col: 0, row: 0 });
    const spy = jest.spyOn(transport, "sendMessage");

    session.move({ sheetId: "sheetId", col: 1, row: 2 });

    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_MOVED",
      version: MESSAGE_VERSION,
      client: { ...client, position: { sheetId: "sheetId", col: 1, row: 2 } },
    });

    expect(session.getConnectedClients()).toEqual(
      new Set([{ ...client, position: { sheetId: "sheetId", col: 1, row: 2 } }])
    );
  });

  test("local client leaves", async () => {
    const spy = jest.spyOn(transport, "sendMessage");
    await session.leave(lazy({} as WorkbookData));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: client.id,
    });
    expect(session.getConnectedClients()).toEqual(new Set());
  });

  test("local client leaves with no other clients and changes", async () => {
    await transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    const data = { sheets: [{}] } as WorkbookData;
    await session.leave(lazy(data));
    expect(spy).toHaveBeenCalledWith({
      type: "SNAPSHOT",
      version: MESSAGE_VERSION,
      nextRevisionId: expect.any(String),
      serverRevisionId: "42",
      data: { ...data, revisionId: expect.any(String) },
    });
  });

  test("do not snapshot when leaving if there are pending change", async () => {
    const model = new Model(
      {},
      {
        transportService: transport,
        client: { id: "alice", name: "Alice" },
      }
    );
    setCellContent(model, "A1", "hello"); // send a revision
    const spy = jest.spyOn(transport, "sendMessage");
    transport.concurrent(() => {
      // send another revision
      setCellContent(model, "A2", "world");
      // and leave before receiving the acknowledgement

      // As concurrent is not yet async
      void model.leaveSession();
    });
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "REMOTE_REVISION" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });

  test("do not snapshot when leaving in read-only mode", async () => {
    const model = new Model(
      {},
      {
        mode: "readonly",
        transportService: transport,
        client: { id: "alice", name: "Alice" },
      }
    );
    await transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    await model.leaveSession();
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "SNAPSHOT" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });

  test("do not snapshot when leaving if there are no revisions since the last snapshot", async () => {
    const model = new Model(
      {},
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    await transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    await transport.sendMessage({
      type: "SNAPSHOT_CREATED",
      version: MESSAGE_VERSION,
      nextRevisionId: "43",
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    await model.leaveSession();
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "SNAPSHOT" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });

  test("local client leaves with other connected clients and changes", async () => {
    await transport.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "bob",
        name: "Bob",
        position: { sheetId: "sheet1", col: 0, row: 0 },
      },
    });
    expect(session.getConnectedClients().size).toBe(2);
    await transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    const data = { sheets: [{}] } as WorkbookData;
    await session.leave(lazy(data));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: client.id,
    });
  });

  test("remote client move", async () => {
    await transport.sendMessage({
      type: "CLIENT_MOVED",
      version: MESSAGE_VERSION,
      client: { id: "bob", name: "Bob", position: { sheetId: "sheetId", col: 1, row: 2 } },
    });
    expect(session.getConnectedClients()).toEqual(
      new Set([
        client,
        {
          position: { sheetId: "sheetId", col: 1, row: 2 },
          id: "bob",
          name: "Bob",
        },
      ])
    );
    await transport.sendMessage({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: "bob",
    });
    expect(session.getConnectedClients()).toEqual(new Set([client]));
  });

  test("remote client joins", async () => {
    session.move({ sheetId: "sheetId", col: 0, row: 0 });
    const spy = jest.spyOn(transport, "sendMessage");
    await transport.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "bob", name: "Bob", position: { sheetId: "sheetId", col: 1, row: 2 } },
    });
    expect(spy).toHaveBeenNthCalledWith(2, {
      type: "CLIENT_MOVED",
      version: MESSAGE_VERSION,
      client: { ...client, position: { sheetId: "sheetId", col: 0, row: 0 } },
    });
  });

  test("local client joins", () => {
    const spy = jest.spyOn(transport, "sendMessage");
    session.move({ sheetId: "sheetId", col: 1, row: 2 });
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { ...client, position: { sheetId: "sheetId", col: 1, row: 2 } },
    });
  });

  test("Can send custom data in client", () => {
    const spy = jest.spyOn(transport, "sendMessage");
    const model = new Model(
      {},
      {
        transportService: transport,
        client: { id: "alice", name: "Alice", customId: "1" } as Client,
      }
    );
    const sheetId = model.getters.getActiveSheetId();
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "alice",
        name: "Alice",
        customId: "1",
        position: { sheetId, col: 0, row: 0 },
      },
    });
    selectCell(model, "B1");
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_MOVED",
      version: MESSAGE_VERSION,
      client: {
        id: "alice",
        name: "Alice",
        customId: "1",
        position: { sheetId, col: 1, row: 0 },
      },
    });
  });

  test("Leave the session do not crash", async () => {
    session.move({ sheetId: "sheetId", col: 1, row: 2 });
    await session.leave(lazy({} as WorkbookData));
  });

  const messages = [
    {
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: "invalid",
    },
    {
      type: "SNAPSHOT_CREATED",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      serverRevisionId: "invalid",
    },
    {
      type: "REVISION_REDONE",
      version: MESSAGE_VERSION,
      redoneRevisionId: "24",
      nextRevisionId: "42",
      serverRevisionId: "invalid",
    },
    {
      type: "REVISION_UNDONE",
      version: MESSAGE_VERSION,
      undoneRevisionId: "24",
      nextRevisionId: "42",
      serverRevisionId: "invalid",
    },
  ] as const;

  test.each(messages)("Receiving a bad revision id should trigger", async (message) => {
    const spy = jest.spyOn(session, "trigger");
    // simulate a revision not in sync with the server
    // e.g. the session missed a revision or received a revision from the past
    transport["serverRevisionId"] = message.serverRevisionId;
    await transport.sendMessage(message);
    expect(spy).toHaveBeenNthCalledWith(1, "unexpected-revision-id");
    expect(spy).not.toHaveBeenCalledWith("remote-revision-received");
  });

  test.each(messages)("Bad initial revisions should be ignored", (message) => {
    expect(() => {
      session.loadInitialMessages([
        {
          type: "REMOTE_REVISION",
          version: MESSAGE_VERSION,
          nextRevisionId: "42",
          clientId: "client_42",
          commands: [],
          serverRevisionId: transport["serverRevisionId"],
        },
        message,
      ]);
    }).not.toThrow();
  });
});

describe("Command squish verification", () => {
  const command = {
    type: "UPDATE_CELL",
    sheetId: "sheet1",
    col: 0,
    row: 0,
    content: "hello",
  } as CoreCommand;

  test("falls back to the original commands and flags the message when the squish round-trip does not match", () => {
    const transport = new MockTransportService();
    const session = createSession(transport, new LossyCommandSquisher(), true);
    const spy = jest.spyOn(transport, "sendMessage");

    session.save({ type: "UPDATE_CELL" } as Command, [command], [{} as HistoryChange]);

    expect(spy).toHaveBeenCalledWith({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      clientId: "alice",
      commands: [command],
      squishedFailed: true,
      nextRevisionId: expect.any(String),
      serverRevisionId: DEFAULT_REVISION_ID,
    });
  });

  test("skips verification and sends the (possibly incorrect) squished commands when shouldVerifySquish is false", () => {
    const transport = new MockTransportService();
    const session = createSession(transport, new LossyCommandSquisher(), false);
    const spy = jest.spyOn(transport, "sendMessage");

    session.save({ type: "UPDATE_CELL" } as Command, [command], [{} as HistoryChange]);

    expect(spy).toHaveBeenCalledWith({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      clientId: "alice",
      commands: [command], // LossyCommandSquisher.squish is the identity here
      nextRevisionId: expect.any(String),
      serverRevisionId: DEFAULT_REVISION_ID,
    });
  });

  test("verifies by default when shouldVerifySquish is not provided", () => {
    const transport = new MockTransportService();
    const session = createSession(transport, new LossyCommandSquisher());
    const spy = jest.spyOn(transport, "sendMessage");

    session.save({ type: "UPDATE_CELL" } as Command, [command], [{} as HistoryChange]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ squishedFailed: true }));
  });
});
