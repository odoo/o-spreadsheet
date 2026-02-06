import { Client, ClientWithColor, Model } from "../../src";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  createSheet,
  deleteSheet,
  moveAnchorCell,
  selectCell,
  selectColumn,
} from "../test_helpers/commands_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative selection", () => {
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  let network: MockTransportService;

  beforeEach(() => {
    ({ alice, bob, charlie, network } = setupCollaborativeEnv());
  });

  test("Everyone starts in A1", () => {
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("active cell is transferred to other users", () => {
    selectCell(alice, "C3");
    moveAnchorCell(bob, "down");
    moveAnchorCell(bob, "right");
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 2, row: 2, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 1, row: 1, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Select the same cell does not notify other users", () => {
    selectCell(alice, "B1");
    const spy = jest.spyOn(network, "sendMessage");
    selectCell(alice, "B1");
    expect(spy).not.toHaveBeenCalled();
  });

  test("Cell selected is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(alice, "B1");
    addColumns(bob, "before", "B", 2);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 3, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Cell selected of remote client is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "B1");
    selectCell(alice, "B1");
    addColumns(alice, "before", "B", 2);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 3, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 3, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Cell selected is updated select an entire column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectColumn(bob, 1, "overrideSelection");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 1, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Position is remove on client left", () => {
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
    const david = new Model(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David" },
    });
    expect([alice, bob, charlie, david]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "david",
          name: "David",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
    david.leaveSession();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("client positions are updated with fallback sheet", () => {
    const sheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    deleteSheet(alice, sheetId);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId: "42" },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId: "42" },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId: "42" },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Client positions are updated when changing their active sheet", () => {
    const sheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42", activate: true });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId: "42" },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });

  test("Can send custom data in client", () => {
    const sheetId = alice.getters.getActiveSheetId();
    new Model(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David", customId: "1" } as Client,
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => new Set(user.getters.getConnectedClients()),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
        {
          id: "david",
          customId: "1",
          name: "David",
          position: { col: 0, row: 0, sheetId },
          color: expect.any(String),
        },
      ]) as Set<ClientWithColor>
    );
  });
});
