import { Model } from "../../src";
import { Session } from "../../src/collaborative/session";
import { DEBOUNCE_TIME, MESSAGE_VERSION } from "../../src/constants";
import { lazy } from "../../src/helpers";
import { buildRevisionLog } from "../../src/history/factory";
import { Client, CommandResult, WorkbookData } from "../../src/types";
import { MockTransportService } from "../__mocks__/transport_service";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { nextTick } from "../test_helpers/helpers";

describe("Collaborative session", () => {
  let transport: MockTransportService;
  let session: Session;
  let client: Client;

  beforeEach(() => {
    jest.useFakeTimers();

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
    session = new Session(revisionLog, transport);
    session.join(client);
  });

  test("local client move", () => {
    session.move({ sheetId: "sheetId", col: 0, row: 0 });
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    const spy = jest.spyOn(transport, "sendMessage");

    session.move({ sheetId: "sheetId", col: 1, row: 2 });
    expect(spy).not.toHaveBeenCalled(); // Wait for debounce

    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_MOVED",
      version: MESSAGE_VERSION,
      client: { ...client, position: { sheetId: "sheetId", col: 1, row: 2 } },
    });

    expect(session.getConnectedClients()).toEqual(
      new Set([{ ...client, position: { sheetId: "sheetId", col: 1, row: 2 } }])
    );
  });

  test("local client leaves", () => {
    const spy = jest.spyOn(transport, "sendMessage");
    session.leave(lazy({} as WorkbookData));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: client.id,
    });
    expect(session.getConnectedClients()).toEqual(new Set());
  });

  test("local client leaves with no other clients and changes", () => {
    transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    const data = { sheets: [{}] } as WorkbookData;
    session.leave(lazy(data));
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
      model.leaveSession();
    });
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "REMOTE_REVISION" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "CLIENT_LEFT" }));
  });

  test("local client leaves with other connected clients and changes", () => {
    transport.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "bob",
        name: "Bob",
        position: { sheetId: "sheet1", col: 0, row: 0 },
      },
    });
    expect(session.getConnectedClients().size).toBe(2);
    transport.sendMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      clientId: "client_42",
      commands: [],
      serverRevisionId: transport["serverRevisionId"],
    });
    const spy = jest.spyOn(transport, "sendMessage");
    const data = { sheets: [{}] } as WorkbookData;
    session.leave(lazy(data));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: client.id,
    });
  });

  test("remote client move", () => {
    transport.sendMessage({
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
    transport.sendMessage({
      type: "CLIENT_LEFT",
      version: MESSAGE_VERSION,
      clientId: "bob",
    });
    expect(session.getConnectedClients()).toEqual(new Set([client]));
  });

  test("remote client joins", () => {
    session.move({ sheetId: "sheetId", col: 0, row: 0 });
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    const spy = jest.spyOn(transport, "sendMessage");
    transport.sendMessage({
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
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
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
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
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
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
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

  test("Leave the session do not crash", () => {
    session.move({ sheetId: "sheetId", col: 1, row: 2 });
    session.leave(lazy({} as WorkbookData));
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
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

  test.each(messages)("Receiving a bad revision id should trigger", (message) => {
    const spy = jest.spyOn(session, "trigger");
    // simulate a revision not in sync with the server
    // e.g. the session missed a revision or received a revision from the past
    transport["serverRevisionId"] = message.serverRevisionId;
    transport.sendMessage(message);
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
