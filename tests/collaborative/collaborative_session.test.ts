import { Client, CommandResult, CoreCommand, Model, WorkbookData } from "../../src";
import { ICommandSquisher, SquishedCoreCommand } from "../../src/collaborative/command_squisher";
import { Session } from "../../src/collaborative/session";
import {
  DEFAULT_REVISION_ID,
  MESSAGE_VERSION,
  SAVE_VERSION_EVERY_N_MINUTES,
} from "../../src/constants";
import { lazy } from "../../src/helpers/misc";
import { buildRevisionLog } from "../../src/history/factory";
import { MockTransportService } from "../__mocks__/transport_service";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { nextTick, useJestFakeTimers } from "../test_helpers/helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

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
    // with other connected clients we don't snapshot, but we save an
    // intermediary version of the data before leaving
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({
      type: "INTERMEDIARY_VERSION_SAVED",
      version: MESSAGE_VERSION,
      data,
    });
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

describe("Intermediary version save", () => {
  const MS_PER_MINUTE = 60 * 1000;
  const ABOVE_THRESHOLD = (SAVE_VERSION_EVERY_N_MINUTES + 1) * MS_PER_MINUTE;
  const BELOW_THRESHOLD = (SAVE_VERSION_EVERY_N_MINUTES - 1) * MS_PER_MINUTE;

  function setupModel() {
    useJestFakeTimers();
    const transport = new MockTransportService();
    const model = new Model(
      {},
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    return { model, transport };
  }

  function intermediaryVersionCalls(spy: jest.SpyInstance) {
    return spy.mock.calls.filter(([message]) => message.type === "INTERMEDIARY_VERSION_SAVED");
  }

  test("an intermediary version is saved after the time threshold", () => {
    const { model, transport } = setupModel();
    setCellContent(model, "A1", "hello"); // a first revision, so there is something to save
    const spy = jest.spyOn(transport, "sendMessage");
    jest.advanceTimersByTime(ABOVE_THRESHOLD);
    setCellContent(model, "A2", "world");
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INTERMEDIARY_VERSION_SAVED",
        version: MESSAGE_VERSION,
        data: expect.objectContaining({
          sheets: [expect.objectContaining({ cells: { A1: "hello", A2: "world" } })],
        }),
      })
    );
  });

  test("no intermediary version is saved before the time threshold", () => {
    const { model, transport } = setupModel();
    setCellContent(model, "A1", "hello");
    const spy = jest.spyOn(transport, "sendMessage");
    jest.advanceTimersByTime(BELOW_THRESHOLD);
    setCellContent(model, "A2", "world");
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "INTERMEDIARY_VERSION_SAVED" })
    );
  });

  test("the timer is reset after saving an intermediary version", () => {
    const { model, transport } = setupModel();
    setCellContent(model, "A1", "hello");
    const spy = jest.spyOn(transport, "sendMessage");
    jest.advanceTimersByTime(ABOVE_THRESHOLD);
    setCellContent(model, "A2", "world"); // saves an intermediary version and resets the timer
    jest.advanceTimersByTime(BELOW_THRESHOLD);
    setCellContent(model, "A3", "!"); // below the threshold since the last save: no new version
    expect(intermediaryVersionCalls(spy)).toHaveLength(1);
  });

  test("no intermediary version is saved if no revision has been committed yet", () => {
    const { model, transport } = setupModel();
    const spy = jest.spyOn(transport, "sendMessage");
    // the threshold elapses before any revision is committed
    jest.advanceTimersByTime(ABOVE_THRESHOLD);
    setCellContent(model, "A1", "hello");
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "INTERMEDIARY_VERSION_SAVED" })
    );
  });

  test("an intermediary version is saved when leaving with other connected clients", async () => {
    const { network, alice } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "hello"); // a revision, so there is something to save
    const spy = jest.spyOn(network, "sendMessage");
    await alice.leaveSession();
    // with other connected clients we don't snapshot, but we save an intermediary version
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "SNAPSHOT" }));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "INTERMEDIARY_VERSION_SAVED" })
    );
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });

  test("no intermediary version is saved when leaving with pending messages", async () => {
    const { network, alice } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "hello"); // acknowledged revision
    const spy = jest.spyOn(network, "sendMessage");
    network.concurrent(() => {
      setCellContent(alice, "A2", "world"); // a pending message, not yet acknowledged
      void alice.leaveSession();
    });
    await nextTick();
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "INTERMEDIARY_VERSION_SAVED" })
    );
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });
});
