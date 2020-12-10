import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { WorkbookData } from "../../src/types";
import { clearCell, getCell, getCellContent, setCellContent } from "../helpers";
import { MockNetwork } from "../__mocks__/network";
import "../canvas.mock";

describe("Multi users synchronisation", () => {
  let network: MockNetwork;
  let emptySheetData: WorkbookData;
  let alice: Model;
  let bob: Model;
  let charly: Model;

  // @ts-ignore
  const startDebug = () => {
    alice["stateReplicator2000"].printDebug = true;
    bob["stateReplicator2000"].printDebug = true;
    charly["stateReplicator2000"].printDebug = true;
  };

  // @ts-ignore
  const endDebug = () => {
    alice["stateReplicator2000"].printDebug = false;
    bob["stateReplicator2000"].printDebug = false;
    charly["stateReplicator2000"].printDebug = false;
  };

  beforeEach(() => {
    network = new MockNetwork();
    emptySheetData = new Model().exportData();

    alice = new Model(emptySheetData, { network });
    bob = new Model(emptySheetData, { network });
    charly = new Model(emptySheetData, { network });

    // TODO find a better way to overwrite client ids
    // @ts-ignore
    alice["stateReplicator2000"]["clientId"] = "alice";
    alice["stateReplicator2000"]["stateVector"] = { alice: 0 };
    // @ts-ignore
    bob["stateReplicator2000"]["clientId"] = "bob";
    bob["stateReplicator2000"]["stateVector"] = { bob: 0 };
    // @ts-ignore
    charly["stateReplicator2000"]["clientId"] = "charly";
    charly["stateReplicator2000"]["stateVector"] = { charly: 0 };
  });

  test("update two different cells concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello in A1");

      setCellContent(bob, "B2", "hello in B2");
    });
    expect(getCellContent(alice, "A1")).toBe("hello in A1");
    expect(getCellContent(alice, "B2")).toBe("hello in B2");
    expect(getCellContent(bob, "A1")).toBe("hello in A1");
    expect(getCellContent(bob, "B2")).toBe("hello in B2");
    expect(getCellContent(charly, "A1")).toBe("hello in A1");
    expect(getCellContent(charly, "B2")).toBe("hello in B2");
  });

  test("update the same cell concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello Bob");
      expect(getCellContent(alice, "A1")).toBe("hello Bob");

      setCellContent(bob, "A1", "Hi Alice");
      expect(getCellContent(bob, "A1")).toBe("Hi Alice");
    });
    expect(getCellContent(alice, "A1")).toBe("Hi Alice");
    expect(getCellContent(bob, "A1")).toBe("Hi Alice");
    expect(getCellContent(charly, "A1")).toBe("Hi Alice");
  });

  test("update the same cell sequentially", () => {
    setCellContent(alice, "A1", "hello Bob");
    expect(getCellContent(alice, "A1")).toBe("hello Bob");
    expect(getCellContent(bob, "A1")).toBe("hello Bob");
    expect(getCellContent(charly, "A1")).toBe("hello Bob");
    setCellContent(bob, "A1", "Hi Alice");
    expect(getCellContent(alice, "A1")).toBe("Hi Alice");
    expect(getCellContent(bob, "A1")).toBe("Hi Alice");
    expect(getCellContent(charly, "A1")).toBe("Hi Alice");
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
    expect(getCellContent(alice, "A1")).toBe("Hi");
    expect(getCellContent(bob, "A1")).toBe("Hi");
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      expect(getCellContent(alice, "A1")).toBe("hello");

      clearCell(bob, "A1");
      expect(getCell(bob, "A1")).toBeUndefined();
    });
    expect(getCell(alice, "A1")).toBeUndefined();
    expect(getCell(bob, "A1")).toBeUndefined();
    expect(getCell(charly, "A1")).toBeUndefined();
  });

  test("delete and update the same empty cell concurrently", () => {
    setCellContent(alice, "A1", "hello");
    expect(getCellContent(alice, "A1")).toBe("hello");
    expect(getCellContent(bob, "A1")).toBe("hello");
    expect(getCellContent(charly, "A1")).toBe("hello");
    network.concurrent(() => {
      clearCell(alice, "A1");
      setCellContent(bob, "A1", "Hi");
    });
    expect(getCellContent(alice, "A1")).toBe("Hi");
    expect(getCellContent(bob, "A1")).toBe("Hi");
    expect(getCellContent(charly, "A1")).toBe("Hi");
  });

  test("Update a cell and merge a cell concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "B2", "Hi Bob");
      bob.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        zone: toZone("A1:B2"),
      });
    });
    expect(getCell(alice, "B2")).toBeUndefined();
    expect(getCell(bob, "B2")).toBeUndefined();
    expect(getCell(charly, "B2")).toBeUndefined();
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
    expect(getCell(alice, "B3")).toBeUndefined();
    expect(getCell(bob, "B3")).toBeUndefined();
    expect(getCell(charly, "B3")).toBeUndefined();
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

  describe("Undo/Redo", () => {
    test("Undo/redo is propagated to other clients", () => {
      alice.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: "hello",
        sheetId: alice.getters.getActiveSheetId(),
      });
      expect(getCellContent(alice, "A1")).toBe("hello");
      expect(getCellContent(bob, "A1")).toBe("hello");
      expect(getCellContent(charly, "A1")).toBe("hello");
      const spy = jest.spyOn(network, "sendMessage");
      alice.dispatch("UNDO");
      expect(spy).toHaveBeenCalledTimes(1);
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      alice.dispatch("REDO");
      expect(getCellContent(alice, "A1")).toBe("hello");
      expect(getCellContent(bob, "A1")).toBe("hello");
      expect(getCellContent(charly, "A1")).toBe("hello");
    });
    test("Undo/redo your own change only", () => {
      setCellContent(alice, "A1", "hello in A1");
      setCellContent(bob, "B2", "hello in B2");
      expect(getCellContent(alice, "A1")).toBe("hello in A1");
      expect(getCellContent(bob, "A1")).toBe("hello in A1");
      expect(getCellContent(charly, "A1")).toBe("hello in A1");
      expect(getCellContent(alice, "B2")).toBe("hello in B2");
      expect(getCellContent(bob, "B2")).toBe("hello in B2");
      expect(getCellContent(charly, "B2")).toBe("hello in B2");
      alice.dispatch("UNDO");
      expect(getCell(alice, "A1")).toBeUndefined();
      expect(getCell(bob, "A1")).toBeUndefined();
      expect(getCell(charly, "A1")).toBeUndefined();
      expect(getCellContent(alice, "B2")).toBe("hello in B2");
      expect(getCellContent(bob, "B2")).toBe("hello in B2");
      expect(getCellContent(charly, "B2")).toBe("hello in B2");
      alice.dispatch("REDO");
      expect(getCellContent(alice, "A1")).toBe("hello in A1");
      expect(getCellContent(bob, "A1")).toBe("hello in A1");
      expect(getCellContent(charly, "A1")).toBe("hello in A1");
      expect(getCellContent(alice, "B2")).toBe("hello in B2");
      expect(getCellContent(bob, "B2")).toBe("hello in B2");
      expect(getCellContent(charly, "B2")).toBe("hello in B2");
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
