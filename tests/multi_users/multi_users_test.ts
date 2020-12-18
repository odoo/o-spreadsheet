import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { CancelledReason, WorkbookData } from "../../src/types";
import {
  addColumns,
  clearCell,
  getBorder,
  getCell,
  getCellContent,
  setCellContent,
} from "../helpers";
import { MockNetwork } from "../__mocks__/network";
import "../canvas.mock";

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check that the given models are synchronized, i.e. they have the same
       * exportData
       */
      toHaveSynchronizedExportedData(): R;
      /**
       * Check that the same callback on each users give the same expected value
       */
      toHaveSynchronizedValue<T>(callback: (model: Model) => T, expected: T): R;
    }
  }
}

expect.extend({
  toHaveSynchronizedValue(users: Model[], callback: (model: Model) => any, expected: any) {
    for (let user of users) {
      const result = callback(user);
      if (!this.equals(result, expected)) {
        const userId = user.getters.getUserId();
        return {
          pass: this.isNot,
          message: () =>
            `${userId} does not have the expected value: \nReceived: ${this.utils.printReceived(
              result
            )}\nExpected: ${this.utils.printExpected(expected)}`,
        };
      }
    }
    return { pass: !this.isNot, message: () => "" };
  },
  toHaveSynchronizedExportedData(users: Model[]) {
    for (let a of users) {
      for (let b of users) {
        if (a === b) {
          continue;
        }
        const exportA = a.exportData();
        const exportB = b.exportData();
        if (!this.equals(exportA, exportB)) {
          const clientA = a.getters.getUserId();
          const clientB = b.getters.getUserId();
          return {
            pass: this.isNot,
            message: () =>
              `${clientA} and ${clientB} are not synchronized: \n${this.utils.printDiffOrStringify(
                exportA,
                exportB,
                clientA,
                clientB,
                false
              )}`,
          };
        }
      }
    }
    return { pass: !this.isNot, message: () => "" };
  },
});

describe("Multi users synchronisation", () => {
  let network: MockNetwork;
  let emptySheetData: WorkbookData;
  let alice: Model;
  let bob: Model;
  let charly: Model;

  beforeEach(() => {
    network = new MockNetwork();
    emptySheetData = new Model().exportData();

    alice = new Model(emptySheetData, { network, userId: "alice" });
    bob = new Model(emptySheetData, { network, userId: "bob" });
    charly = new Model(emptySheetData, { network, userId: "charly" });
  });

  test("update two different cells concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello in A1");

      setCellContent(bob, "B2", "hello in B2");
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello in A1"
    );
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "hello in B2"
    );
  });

  test("update the same cell concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello Bob");
      expect(getCellContent(alice, "A1")).toBe("hello Bob");

      setCellContent(bob, "A1", "Hi Alice");
      expect(getCellContent(bob, "A1")).toBe("Hi Alice");
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi Alice"
    );
  });

  test("update the same cell sequentially", () => {
    setCellContent(alice, "A1", "hello Bob");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello Bob"
    );

    setCellContent(bob, "A1", "Hi Alice");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi Alice"
    );
  });

  // test("three concurrent and conflicting updates while one client is disconnected", () => {
  //   network.disconnect(charlyClientId);
  //   network.concurrent(() => {
  //     alice.dispatch("UPDATE_CELL", {
  //       col: 0,
  //       row: 0,
  //       content: "hello Bob",
  //       sheetId: alice.getters.getActiveSheetId(),
  //     });
  //     bob.dispatch("UPDATE_CELL", {
  //       col: 0,
  //       row: 0,
  //       content: "Hi Alice",
  //       sheetId: alice.getters.getActiveSheetId(),
  //     });
  //   });

  //   expect(getCell(alice, "A1")).toBe("hello Bob");
  //   expect(getCell(bob, "A1")).toBe("hello Bob");
  //   expect(getCell(charly, "A1")).toBeUndefined();
  //   charly.dispatch("UPDATE_CELL", {
  //     col: 0,
  //     row: 0,
  //     content: "Hi Alice & bob",
  //     sheetId: alice.getters.getActiveSheetId(),
  //   });
  //   network.reconnect(charlyClientId);
  //   expect(getCell(alice, "A1")).toBe("hello Bob");
  //   expect(getCell(bob, "A1")).toBe("hello Bob");
  //   expect(getCell(charly, "A1")).toBe("hello Bob");
  // });

  // test.skip("new user joins later", () => {
  //   // arf cannot be tested like that, we would be testing the mock
  //   alice.dispatch("UPDATE_CELL", {
  //     col: 0,
  //     row: 0,
  //     content: "hello in A1",
  //     sheetId: alice.getters.getActiveSheetId(),
  //   });

  //   const dave = new Model(emptySheetData, {
  //     synchronizedState: new NetworkSynchronizedState(network),
  //   });
  //   expect(getCell(dave, "A1")).toBeDefined();
  //   expect(getCell(dave, "A1")).toBe("hello in A1");
  // });

  test("update and delete the same cell concurrently", () => {
    setCellContent(alice, "A1", "Hi");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi"
    );

    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      expect(getCellContent(alice, "A1")).toBe("hello");

      clearCell(bob, "A1");
      expect(getCell(bob, "A1")).toBeUndefined();
    });

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("delete and update the same empty cell concurrently", () => {
    setCellContent(alice, "A1", "hello");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );

    network.concurrent(() => {
      clearCell(alice, "A1");
      setCellContent(bob, "A1", "Hi");
    });

    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi"
    );
  });

  test("Update a cell and merge a cell concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "B2", "Hi Bob");
      bob.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
    });

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B2"), undefined);
  });

  test("Merge a cell and update a cell concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        zone: toZone("A1:B3"),
      });
      setCellContent(bob, "B3", "Hi Alice");
    });

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect(alice.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: "A1" },
    ]);
    expect(bob.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: "A1" },
    ]);
    expect(charly.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: "A1" },
    ]);
  });

  test("2-Merge a cell and update a cell concurrently, then remove the merge", () => {
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
      setCellContent(bob, "B2", "Hi Alice");
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
  });

  test("delete content & merge concurrently", () => {
    setCellContent(alice, "B2", "hello");
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        zone: toZone("B2:C3"),
      });
      bob.dispatch("DELETE_CONTENT", {
        sheetId,
        target: [toZone("A1:B2")],
      });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "");
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("Set formatting & merge concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        zone: toZone("A1:B2"),
      });
      bob.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2:C3")],
        border: "external",
      });
    });
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "");
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getBorder(user, "B2"), null);
  });

  test("Command not allowed is not dispatched to others users", () => {
    const spy = jest.spyOn(network, "sendMessage");
    setCellContent(alice, "A1", "hello", "invalidSheetId");
    expect(spy).toHaveBeenCalledTimes(0);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "");
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  // test.skip("active cell is transfered to other users", () => {
  //   alice.dispatch("SELECT_CELL", {
  //     col: 2,
  //     row: 2,
  //   });
  //   bob.dispatch("MOVE_POSITION", {
  //     deltaX: 1,
  //     deltaY: 1,
  //   });
  //   const selectionAlicePlugin = alice["handlers"].find(
  //     (p) => p instanceof SelectionMultiuserPlugin
  //   )! as SelectionMultiuserPlugin;
  //   const selectionBobPlugin = bob["handlers"].find(
  //     (p) => p instanceof SelectionMultiuserPlugin
  //   )! as SelectionMultiuserPlugin;
  //   const selectionCharlyPlugin = charly["handlers"].find(
  //     (p) => p instanceof SelectionMultiuserPlugin
  //   )! as SelectionMultiuserPlugin;
  //   const sheetId = alice.getters.getActiveSheetId();
  //   const aliceId = selectionAlicePlugin["userId"];
  //   const aliceName = selectionAlicePlugin["userName"];
  //   const bobId = selectionBobPlugin["userId"];
  //   const bobName = selectionBobPlugin["userName"];
  //   const charlyId = selectionCharlyPlugin["userId"];
  //   const charlyName = selectionCharlyPlugin["userName"];
  //   expect(selectionAlicePlugin.selections).toEqual({
  //     [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
  //     [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
  //     [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
  //   });
  //   expect(selectionBobPlugin.selections).toEqual({
  //     [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
  //     [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
  //     [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
  //   });
  //   expect(selectionCharlyPlugin.selections).toEqual({
  //     [aliceId]: { col: 2, row: 2, sheetId, displayName: aliceName },
  //     [bobId]: { col: 1, row: 1, sheetId, displayName: bobName },
  //     [charlyId]: { col: 0, row: 0, sheetId, displayName: charlyName },
  //   });
  // });

  // test("select cell in merge", () => {
  //   const sheetId = alice.getters.getActiveSheetId();
  //   alice.dispatch("ADD_MERGE", {
  //     sheetId,
  //     zone: toZone("B1:C4"),
  //   });
  //   alice.dispatch("SELECT_CELL", {
  //     col: 2,
  //     row: 2,
  //   });
  //   const selectionAlicePlugin = alice["handlers"].find(
  //     (p) => p instanceof SelectionMultiuserPlugin
  //   )! as SelectionMultiuserPlugin;
  //   const aliceId = selectionAlicePlugin["userId"];
  //   const aliceName = selectionAlicePlugin["userName"];
  //   expect(selectionAlicePlugin.selections[aliceId]).toEqual({
  //     col: 1,
  //     row: 0,
  //     sheetId,
  //     displayName: aliceName,
  //   });
  // });

  describe("Export data", () => {
    test("Can export without pending revisions", () => {
      setCellContent(alice, "A1", "salut");
      expect(alice["stateReplicator2000"]["pendingRevisions"]).toHaveLength(0);
      const exportedData = alice.exportData();
      expect(exportedData.sheets[0].cells.A1?.content).toBe("salut");
    });

    test("Can export with pending revisions by reverting to last shared revision", () => {
      setCellContent(alice, "A1", "salut");
      network.concurrent(() => {
        setCellContent(bob, "A1", "coucou");
        setCellContent(alice, "A1", "Hi");
        const exportedData = alice.exportData();
        expect(exportedData.sheets[0].cells.A1?.content).toBe("salut");
        expect([alice, bob, charly]).toHaveSynchronizedExportedData();
      });
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

      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
      const spy = jest.spyOn(network, "sendMessage");
      alice.dispatch("UNDO");
      expect(spy).toHaveBeenCalledTimes(1);
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      alice.dispatch("REDO");

      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
      // expect([alice, bob, charly]).toBeSynchronized()
    });
    test("Undo/redo your own change only", () => {
      setCellContent(alice, "A1", "hello in A1");
      setCellContent(bob, "B2", "hello in B2");

      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello in A1"
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B2"),
        "hello in B2"
      );
      alice.dispatch("UNDO");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1"),
        undefined
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B2"),
        "hello in B2"
      );
      alice.dispatch("REDO");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello in A1"
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B2"),
        "hello in B2"
      );
    });
    test("Undo two commands from differents users", () => {
      addColumns(alice, "before", "B", 1);
      addColumns(bob, "after", "A", 1);
      setCellContent(charly, "D1", "hello in D1");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "D1"),
        "hello in D1"
      );
      alice.dispatch("UNDO");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "C1"),
        "hello in D1"
      );
      bob.dispatch("UNDO");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B1"),
        "hello in D1"
      );
    });
    test("Undo concurrently", () => {
      setCellContent(alice, "A1", "hello");
      network.concurrent(() => {
        setCellContent(bob, "B2", "B2");
        alice.dispatch("UNDO");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1"),
        undefined
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B2"),
        "B2"
      );
    });
    test("Undo with pending which requires a transformation", () => {
      addColumns(alice, "before", "A", 1);
      network.concurrent(() => {
        alice.dispatch("UNDO");
        setCellContent(bob, "B1", "hello");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "B1"),
        undefined
      );
    });
    test("concurrent Redo", () => {
      setCellContent(alice, "A1", "hello");
      alice.dispatch("UNDO");
      network.concurrent(() => {
        setCellContent(bob, "B2", "B2");
        alice.dispatch("REDO");
        expect(getCellContent(alice, "A1")).toBe("hello");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
    });
    test("Redo with concurrent command", () => {
      setCellContent(alice, "A1", "hello");
      alice.dispatch("UNDO");
      network.concurrent(() => {
        alice.dispatch("REDO");
        setCellContent(bob, "B2", "B2");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
    });
    test("Redo which requires a transformation", () => {
      setCellContent(alice, "A1", "hello");
      alice.dispatch("UNDO");
      addColumns(bob, "before", "A", 1);
      alice.dispatch("REDO");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1"),
        undefined
      );
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B1"),
        "hello"
      );
    });
    test("Undo a concurrent command which requires a transformation", () => {
      setCellContent(alice, "A1", "salut");
      setCellContent(alice, "A1", "hello");
      network.concurrent(() => {
        addColumns(bob, "before", "A", 1);
        alice.dispatch("UNDO");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1"),
        undefined
      );

      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "B1"),
        "salut"
      );
    });
    test("Undo during a pending phase", () => {
      const spy = jest.spyOn(network, "notifyListeners");
      network.concurrent(() => {
        setCellContent(bob, "A1", "hello");
        setCellContent(alice, "A1", "salut");
        alice.dispatch("UNDO");
      });
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "hello"
      );
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test.skip("Undo a create sheet command", () => {
      const sheetId = "42";
      alice.dispatch("CREATE_SHEET", { sheetId, position: 0 });
      setCellContent(bob, "A1", "Hello in A1", sheetId);
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1", sheetId),
        "Hello in A1"
      );
      alice.dispatch("UNDO");
      expect(bob.dispatch("UNDO")).toEqual({
        status: "CANCELLED",
        reason: CancelledReason.EmptyUndoStack,
      });
    });
  });

  describe("Evaluation", () => {
    test("Evaluation is correctly triggered after cell updated", () => {
      setCellContent(alice, "A1", "=5");
      expect(getCell(alice, "A1")!.value).toBe(5);
      expect(getCell(bob, "A1")!.value).toBe(5);
    });
    test("Cell value is correctly re-evaluated after undo", () => {
      setCellContent(alice, "A1", "=5");
      expect(getCell(alice, "A1")!.value).toBe(5);
      expect(getCell(bob, "A1")!.value).toBe(5);
      setCellContent(alice, "A1", "=10");
      expect(getCell(alice, "A1")!.value).toBe(10);
      expect(getCell(bob, "A1")!.value).toBe(10);
      alice.dispatch("UNDO");
      expect(getCell(alice, "A1")!.value).toBe(5);
      expect(getCell(bob, "A1")!.value).toBe(5);
    });
  });

  describe.skip("Limitations", () => {
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
      expect(getCellContent(alice, "A1")).toBe("hello");
      expect(alice.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
      expect(bob.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
      expect(charly.getters.getCellStyle(aliceCell).fillColor).toBe("#555");
    });

    test("Two merges concurrently", () => {
      setCellContent(alice, "C3", "test");
      const sheetId = alice.getters.getActiveSheetId();
      network.concurrent(() => {
        alice.dispatch("ADD_MERGE", { sheetId, zone: toZone("A1:B2") });
        bob.dispatch("ADD_MERGE", { sheetId, zone: toZone("B2:C3"), force: true });
      });
      expect(getCell(alice, "C3")).toBeDefined();
      expect(getCellContent(alice, "C3")).toEqual("test");
      expect(getCell(bob, "C3")).toBeDefined();
      expect(getCellContent(bob, "C3")).toEqual("test");
      const aliceMerges = alice.getters.getMerges(sheetId);
      const bobMerges = bob.getters.getMerges(sheetId);
      const charlyMerges = charly.getters.getMerges(sheetId);
      // the second merge is not created, but C3's content has been cleated.
      expect(aliceMerges).toHaveLength(1);
      expect(aliceMerges).toEqual(bobMerges);
      expect(aliceMerges).toEqual(charlyMerges);
    });

    test("set content and remove style concurrently", async () => {
      alice.dispatch("SET_FORMATTING", {
        target: [toZone("A1")],
        style: { fillColor: "#555" },
        sheetId: alice.getters.getActiveSheetId(),
      });
      await network.concurrent(() => {
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
      expect(getCellContent(alice, "A1")).toBe("hello");
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
      expect(getCellContent(alice, "A1")).toBe("hello");
      expect(alice.getters.getCellStyle(aliceCell)).toEqual({});
      expect(bob.getters.getCellStyle(aliceCell)).toEqual({});
      expect(charly.getters.getCellStyle(aliceCell)).toEqual({});
    });

    test("create two sheets concurrently", () => {
      const sheetId = alice.getters.getActiveSheetId();
      network.concurrent(() => {
        alice.dispatch("CREATE_SHEET", {
          sheetId: "alice1",
          activate: true,
          position: 1,
        });
        bob.dispatch("CREATE_SHEET", {
          sheetId: "bob1",
          activate: true,
          position: 1,
        });
      });
      const aliceSheets = alice.getters.getSheets();
      const bobSheets = bob.getters.getSheets();
      const charlySheets = charly.getters.getSheets();
      expect(aliceSheets).toEqual(bobSheets);
      expect(aliceSheets).toEqual(charlySheets);
      expect(aliceSheets).toHaveLength(3);
      expect(alice.getters.getActiveSheetId()).toEqual("alice1");
      expect(bob.getters.getActiveSheetId()).toEqual("bob1");
      expect(charly.getters.getActiveSheetId()).toEqual(sheetId);
    });

    test("cells under a merge should be cleared", () => {
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
      alice.dispatch("REMOVE_MERGE", {
        zone: toZone("A1:B2"),
        sheetId,
      });
      expect(getCell(alice, "B2")).toBeUndefined();
      expect(getCell(bob, "B2")).toBeUndefined();
      expect(getCell(charly, "B2")).toBeUndefined();
    });

    test("Undo and update_cell concurrently", () => {
      setCellContent(alice, "A1", "test");
      const sheetId = alice.getters.getActiveSheetId();
      network.concurrent(() => {
        alice.dispatch("UNDO");
        bob.dispatch("SET_FORMATTING", {
          sheetId,
          target: [toZone("A1")],
          style: { fillColor: "#555" },
        });
      });

      expect(getCell(alice, "A1")).toBeDefined(); // currently undefined
      // because the cell position is removed from the grid (undo)
      expect(getCell(alice, "A1")!.style).toEqual({ fillColor: "#555" });
      expect(getCellContent(alice, "A1")).toBe("");
      expect(getCell(bob, "A1")).toBeDefined();
      expect(getCell(bob, "A1")!.style).toEqual({ fillColor: "#555" });
      expect(getCellContent(bob, "A1")).toBe("");
      expect(getCell(charly, "A1")).toBeDefined();
      expect(getCell(charly, "A1")!.style).toEqual({ fillColor: "#555" });
      expect(getCellContent(charly, "A1")).toBe("");
    });
  });
});
