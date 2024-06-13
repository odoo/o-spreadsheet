import { Client, Model } from "../../src";
import { DEBOUNCE_TIME } from "../../src/constants";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  createSheet,
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
    jest.useFakeTimers();

    ({ alice, bob, charlie, network } = setupCollaborativeEnv());
  });

  test("Everyone starts in A1", () => {
    const sheetId = alice.getters.getActiveSheetId();
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("active cell is transferred to other users", () => {
    selectCell(alice, "C3");
    moveAnchorCell(bob, "down");
    moveAnchorCell(bob, "right");
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 2, row: 2, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 1, row: 1, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Select the same cell does not notify other users", () => {
    selectCell(alice, "B1");
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    const spy = jest.spyOn(network, "sendMessage");
    selectCell(alice, "B1");
    expect(spy).not.toHaveBeenCalled();
  });

  test("Cell selected is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(alice, "B1");
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    addColumns(bob, "before", "B", 2);
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 3, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Cell selected of remote client is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "B1");
    selectCell(alice, "B1");
    addColumns(alice, "before", "B", 2);
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 3, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 3, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Cell selected is updated select an entire column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectColumn(bob, 1, "overrideSelection");
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 1, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Position is remove on client left", () => {
    const sheetId = alice.getters.getActiveSheetId();
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
    const david = Model.BuildSync(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David" },
    });
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie, david]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "david",
          name: "David",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
    david.leaveSession();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("client positions are updated with fallback sheet", () => {
    const sheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    alice.dispatch("DELETE_SHEET", { sheetId });
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId: "42" },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId: "42" },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId: "42" },
        },
      ])
    );
  });

  test("Can send custom data in client", () => {
    const sheetId = alice.getters.getActiveSheetId();
    Model.BuildSync(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David", customId: "1" } as Client,
    });
    jest.advanceTimersByTime(DEBOUNCE_TIME + 100);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConnectedClients(),
      new Set([
        {
          id: "alice",
          name: "Alice",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "bob",
          name: "Bob",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "charlie",
          name: "Charlie",
          position: { col: 0, row: 0, sheetId },
        },
        {
          id: "david",
          customId: "1",
          name: "David",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });
});
