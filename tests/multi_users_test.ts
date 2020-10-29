import { MockNetwork } from "./__mocks__/network";
import { Model } from "../src";
import { WorkbookData } from "../src/types";
import { NetworkSynchronizedState } from "../src/multi_user/synchronised_state";
import "./canvas.mock";
import { toZone } from "../src/helpers";
import { SelectionMultiuserPlugin } from "../src/plugins/selection_multiuser";
import { ClientId } from "../src/types/multi_user";
import { getCell } from "./helpers";

describe("Multi users synchronisation", () => {
  let network: MockNetwork;
  let emptySheetData: WorkbookData;
  let alice: Model;
  let bob: Model;
  let charly: Model;
  // @ts-ignore
  let aliceClientId: ClientId;
  // @ts-ignore
  let bobClientId: ClientId;
  // @ts-ignore
  let charlyClientId: ClientId;
  beforeEach(() => {
    network = new MockNetwork();
    emptySheetData = new Model().exportData();

    const aliceState = new NetworkSynchronizedState(network);
    const bobState = new NetworkSynchronizedState(network);
    const charlyState = new NetworkSynchronizedState(network);
    // @ts-ignore
    aliceClientId = aliceState.clientId;
    // @ts-ignore
    bobClientId = bobState.clientId;
    // @ts-ignore
    charlyClientId = charlyState.clientId;
    alice = new Model(emptySheetData, {
      synchronizedState: aliceState,
    });
    bob = new Model(emptySheetData, {
      synchronizedState: bobState,
    });
    charly = new Model(emptySheetData, {
      synchronizedState: charlyState,
    });
  });

  test("update two different cells concurrently", () => {
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello in A1",
        sheetId: alice.getters.getActiveSheetId(),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "hello in B2",
        sheetId: alice.getters.getActiveSheetId(),
      });
    });
    expect(getCell(alice, "A1")!.content).toBe("hello in A1");
    expect(getCell(alice, "B2")!.content).toBe("hello in B2");
    expect(getCell(bob, "A1")!.content).toBe("hello in A1");
    expect(getCell(bob, "B2")!.content).toBe("hello in B2");
    expect(getCell(charly, "A1")!.content).toBe("hello in A1");
    expect(getCell(charly, "B2")!.content).toBe("hello in B2");
  });

  test("update the same cell concurrently", () => {
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello Bob",
        sheetId: alice.getters.getActiveSheetId(),
      });
      expect(getCell(alice, "A1")!.content).toBe("hello Bob");
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "Hi Alice",
        sheetId: alice.getters.getActiveSheetId(),
      });
      expect(getCell(bob, "A1")!.content).toBe("Hi Alice");
    });
    expect(getCell(alice, "A1")!.content).toBe("hello Bob");
    expect(getCell(bob, "A1")!.content).toBe("hello Bob");
    expect(getCell(charly, "A1")!.content).toBe("hello Bob");
  });

  test("update the same cell sequentially", () => {
    alice.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      content: "hello Bob",
      sheetId: alice.getters.getActiveSheetId(),
    });
    expect(getCell(alice, "A1")!.content).toBe("hello Bob");
    expect(getCell(bob, "A1")!.content).toBe("hello Bob");
    expect(getCell(charly, "A1")!.content).toBe("hello Bob");
    bob.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      content: "Hi Alice",
      sheetId: alice.getters.getActiveSheetId(),
    });
    expect(getCell(alice, "A1")!.content).toBe("Hi Alice");
    expect(getCell(bob, "A1")!.content).toBe("Hi Alice");
    expect(getCell(charly, "A1")!.content).toBe("Hi Alice");
  });

  test("three concurrent and conflicting updates while one client is disconnected", () => {
    network.disconnect(charlyClientId);
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello Bob",
        sheetId: alice.getters.getActiveSheetId(),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "Hi Alice",
        sheetId: alice.getters.getActiveSheetId(),
      });
    });

    expect(getCell(alice, "A1")!.content).toBe("hello Bob");
    expect(getCell(bob, "A1")!.content).toBe("hello Bob");
    expect(getCell(charly, "A1")).toBeUndefined();
    charly.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      content: "Hi Alice & bob",
      sheetId: alice.getters.getActiveSheetId(),
    });
    network.reconnect(charlyClientId);
    expect(getCell(alice, "A1")!.content).toBe("hello Bob");
    expect(getCell(bob, "A1")!.content).toBe("hello Bob");
    expect(getCell(charly, "A1")!.content).toBe("hello Bob");
  });

  test("update the style and content of the same cell concurrently", () => {
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
      bob.dispatch("SET_FORMATTING", {
        sheetId: bob.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { fillColor: "#555" },
      });
    });
    const aliceCell = getCell(alice, "A1")!;
    const bobCell = getCell(bob, "A1")!;
    expect(aliceCell).toEqual(bobCell);
    expect(aliceCell.content).toBe("hello");
    expect(alice.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
    expect(bob.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
    expect(charly.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
  });

  test("set content and remove style concurrently", () => {
    alice.dispatch("SET_FORMATTING", {
      target: [toZone("A1")],
      style: { fillColor: "#555" },
      sheetId: alice.getters.getActiveSheetId(),
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        style: undefined,
        sheetId: bob.getters.getActiveSheetId(),
      });
    });
    const aliceCell = getCell(alice, "A1")!;
    const bobCell = getCell(bob, "A1")!;
    expect(aliceCell).toEqual(bobCell);
    expect(aliceCell.content).toBe("hello");
    expect(alice.getters.getCellStyle(aliceCell)).toEqual({});
    expect(bob.getters.getCellStyle(aliceCell)).toEqual({});
    expect(charly.getters.getCellStyle(aliceCell)).toEqual({});
  });

  test("remove style and set content concurrently", () => {
    alice.dispatch("SET_FORMATTING", {
      target: [toZone("A1")],
      style: { fillColor: "#555" },
      sheetId: alice.getters.getActiveSheetId(),
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        style: undefined,
        sheetId: bob.getters.getActiveSheetId(),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
    });
    const aliceCell = getCell(alice, "A1")!;
    const bobCell = getCell(bob, "A1")!;
    expect(aliceCell).toEqual(bobCell);
    expect(aliceCell.content).toBe("hello");
    expect(alice.getters.getCellStyle(aliceCell)).toEqual({});
    expect(bob.getters.getCellStyle(aliceCell)).toEqual({});
    expect(charly.getters.getCellStyle(aliceCell)).toEqual({});
  });

  test("update and delete the same cell concurrently", () => {
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "Hi",
    });
    expect(getCell(alice, "A1")!.content).toBe("Hi");
    expect(getCell(bob, "A1")!.content).toBe("Hi");
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
      expect(getCell(alice, "A1")!.content).toBe("hello");
      bob.dispatch("CLEAR_CELL", {
        sheetId: bob.getters.getActiveSheetId(),
        col: 0,
        row: 0,
      });
      expect(getCell(bob, "A1")).toBeUndefined();
    });
    const aliceCell = getCell(alice, "A1")!;
    const bobCell = getCell(bob, "A1")!;
    const charlyCell = getCell(charly, "A1")!;
    expect(aliceCell.content).toBe("hello");
    expect(bobCell.content).toBe("hello");
    expect(aliceCell).toEqual(bobCell);
    expect(aliceCell).toEqual(charlyCell);
  });

  test("delete and update the same cell concurrently", () => {
    network.concurrent(() => {
      alice.dispatch("CLEAR_CELL", {
        sheetId: bob.getters.getActiveSheetId(),
        col: 0,
        row: 0,
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
    });
    expect(getCell(alice, "A1")!.content).toBe("hello");
    expect(getCell(bob, "A1")!.content).toBe("hello");
    expect(getCell(charly, "A1")!.content).toBe("hello");
  });

  test("delete and update the same cell concurrently", () => {
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "hello",
    });
    expect(getCell(alice, "A1")!.content).toBe("hello");
    expect(getCell(bob, "A1")!.content).toBe("hello");
    expect(getCell(charly, "A1")!.content).toBe("hello");
    network.concurrent(() => {
      alice.dispatch("CLEAR_CELL", {
        sheetId: bob.getters.getActiveSheetId(),
        col: 0,
        row: 0,
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "Hi",
        sheetId: alice.getters.getActiveSheetId(),
      });
    });
    expect(getCell(alice, "A1")).toBeUndefined();
    expect(getCell(bob, "A1")).toBeUndefined();
    expect(getCell(charly, "A1")).toBeUndefined();
  });

  test("Update a cell and merge a cell concurrently", () => {
    // The result is not logical but at least it's synchronized.
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "Hi Bob",
        sheetId: bob.getters.getActiveSheetId(),
      });
      bob.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
    });
    expect(getCell(alice, "B2")!.content).toBe("Hi Bob");
    expect(getCell(bob, "B2")!.content).toBe("Hi Bob");
    expect(getCell(charly, "B2")!.content).toBe("Hi Bob");
  });

  test("Merge a cell and update a cell concurrently", () => {
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "Hi Alice",
        sheetId: bob.getters.getActiveSheetId(),
      });
    });
    const sheetId = alice.getters.getActiveSheetId();
    expect(getCell(alice, "B2")).toEqual(getCell(bob, "B2"));
    expect(alice.getters.getMerges(sheetId)).toEqual(bob.getters.getMerges(sheetId));
    expect(getCell(alice, "B2")).toEqual(getCell(charly, "B2"));
    expect(alice.getters.getMerges(sheetId)).toEqual(charly.getters.getMerges(sheetId));
  });

  test.skip("Merge a cell and update a cell concurrently, then remove the merge", () => {
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "Hi Alice",
        sheetId: bob.getters.getActiveSheetId(),
      });
    });
    const sheetId = alice.getters.getActiveSheetId();
    expect(alice.getters.getMerges(sheetId)).toHaveLength(1);
    alice.dispatch("REMOVE_MERGE", {
      zone: toZone("A1:B2"),
      sheetId,
    });
    expect(alice.getters.getMerges(sheetId)).toHaveLength(0);
    expect(bob.getters.getMerges(sheetId)).toHaveLength(0);
    expect(charly.getters.getMerges(sheetId)).toHaveLength(0);
    expect(getCell(alice, "B2")).toBeUndefined();
    expect(getCell(bob, "B2")).toBeUndefined();
    expect(getCell(charly, "B2")).toBeUndefined();
  });

  test.skip("active cell is transfered to other users", () => {
    alice.dispatch("SELECT_CELL", {
      col: 2,
      row: 2,
    });
    bob.dispatch("MOVE_POSITION", {
      deltaX: 1,
      deltaY: 1,
    });
    const selectionAlicePlugin = alice["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    const selectionBobPlugin = bob["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    const selectionCharlyPlugin = charly["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    const sheetId = alice.getters.getActiveSheetId();
    const aliceId = selectionAlicePlugin["userId"];
    const aliceName = selectionAlicePlugin["userName"];
    const bobId = selectionBobPlugin["userId"];
    const bobName = selectionBobPlugin["userName"];
    const charlyId = selectionAlicePlugin["userId"];
    const charlyName = selectionAlicePlugin["userName"];
    expect(selectionAlicePlugin.selections).toEqual({
      [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
      [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
      [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
    });
    expect(selectionBobPlugin.selections).toEqual({
      [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
      [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
      [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
    });
    expect(selectionCharlyPlugin.selections).toEqual({
      [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
      [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
      [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
    });
  });

  test("select cell in merge", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("ADD_MERGE", {
      sheetId,
      zone: toZone("B1:C4"),
    });
    alice.dispatch("SELECT_CELL", {
      col: 2,
      row: 2,
    });
    const selectionAlicePlugin = alice["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    const aliceId = selectionAlicePlugin["userId"];
    const aliceName = selectionAlicePlugin["userName"];
    expect(selectionAlicePlugin.selections[aliceId]).toEqual({
      col: 1,
      row: 0,
      sheetId,
      displayName: aliceName,
    });
  });

  describe("Undo/Redo", () => {
    test("Undo/redo is propagated to other clients", () => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
      expect(getCell(alice, "A1")!.content).toBe("hello");
      expect(getCell(bob, "A1")!.content).toBe("hello");
      expect(getCell(charly, "A1")!.content).toBe("hello");
      alice.dispatch("UNDO");
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      alice.dispatch("REDO");
      expect(getCell(alice, "A1")!.content).toBe("hello");
      expect(getCell(bob, "A1")!.content).toBe("hello");
      expect(getCell(charly, "A1")!.content).toBe("hello");
    });
    test("Undo/redo your own change only", () => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello in A1",
        sheetId: alice.getters.getActiveSheetId(),
      });
      bob.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "hello in B2",
        sheetId: bob.getters.getActiveSheetId(),
      });
      expect(getCell(alice, "A1")!.content).toBe("hello in A1");
      expect(getCell(bob, "A1")!.content).toBe("hello in A1");
      expect(getCell(charly, "A1")!.content).toBe("hello in A1");
      expect(getCell(alice, "B2")!.content).toBe("hello in B2");
      expect(getCell(bob, "B2")!.content).toBe("hello in B2");
      expect(getCell(charly, "B2")!.content).toBe("hello in B2");
      alice.dispatch("UNDO");
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      expect(getCell(alice, "B2")!.content).toBe("hello in B2");
      expect(getCell(bob, "B2")!.content).toBe("hello in B2");
      expect(getCell(charly, "B2")!.content).toBe("hello in B2");
      alice.dispatch("REDO");
      expect(getCell(alice, "A1")!.content).toBe("hello in A1");
      expect(getCell(bob, "A1")!.content).toBe("hello in A1");
      expect(getCell(charly, "A1")!.content).toBe("hello in A1");
      expect(getCell(alice, "B2")!.content).toBe("hello in B2");
      expect(getCell(bob, "B2")!.content).toBe("hello in B2");
      expect(getCell(charly, "B2")!.content).toBe("hello in B2");
    });
    test("Bob updates are not added to Alice's history after a command which does not change the state", () => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello in A1",
        sheetId: alice.getters.getActiveSheetId(),
      });
      // @ts-ignore
      alice.dispatch("A_DUMMY_COMMAND"); // dispatch a command which does not update the history
      bob.dispatch("UPDATE_CELL", {
        col: 1,
        row: 1,
        content: "hello in B2",
        sheetId: bob.getters.getActiveSheetId(),
      });
      expect(getCell(alice, "A1")!.content).toBe("hello in A1");
      expect(getCell(bob, "A1")!.content).toBe("hello in A1");
      expect(getCell(charly, "A1")!.content).toBe("hello in A1");
      expect(getCell(alice, "B2")!.content).toBe("hello in B2");
      expect(getCell(bob, "B2")!.content).toBe("hello in B2");
      expect(getCell(charly, "B2")!.content).toBe("hello in B2");
      alice.dispatch("UNDO");
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      expect(getCell(alice, "B2")!.content).toBe("hello in B2");
      expect(getCell(bob, "B2")!.content).toBe("hello in B2");
      expect(getCell(charly, "B2")!.content).toBe("hello in B2");
    });
  });
});
