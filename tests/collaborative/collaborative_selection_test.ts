import { Model } from "../../src";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import { addColumns } from "../commands_helpers";
import "../jest_extend";
import "../canvas.mock";

describe("Collaborative selection", () => {
  let alice: Model;
  let bob: Model;
  let charly: Model;

  beforeEach(() => {
    ({ alice, bob, charly } = setupCollaborativeEnv());
  });

  test("Everyone starts in A1", () => {
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charly]).toHaveSynchronizedValue(
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
          id: "charly",
          name: "Charly",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("active cell is transfered to other users", () => {
    alice.dispatch("SELECT_CELL", {
      col: 2,
      row: 2,
    });
    bob.dispatch("MOVE_POSITION", {
      deltaX: 1,
      deltaY: 1,
    });
    const sheetId = alice.getters.getActiveSheetId();
    expect([alice, bob, charly]).toHaveSynchronizedValue(
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
          id: "charly",
          name: "Charly",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Cell selected is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("SELECT_CELL", { col: 1, row: 0 });
    addColumns(bob, "before", "B", 2);

    expect([alice, bob, charly]).toHaveSynchronizedValue(
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
          id: "charly",
          name: "Charly",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Cell selected of remote client is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    bob.dispatch("SELECT_CELL", { col: 1, row: 0 });
    addColumns(alice, "before", "B", 2);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
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
          id: "charly",
          name: "Charly",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });

  test("Cell selected is updated select an entire column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    bob.dispatch("SELECT_COLUMN", { index: 1 });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
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
          id: "charly",
          name: "Charly",
          position: { col: 0, row: 0, sheetId },
        },
      ])
    );
  });
});
