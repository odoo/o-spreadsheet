import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import {
  clearCell,
  createSheet,
  getBorder,
  getCell,
  getCellContent,
  setCellContent,
  undo,
} from "../helpers";
import { MockNetwork } from "../__mocks__/network";
import "../canvas.mock";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Multi users synchronisation", () => {
  let network: MockNetwork;
  let alice: Model;
  let bob: Model;
  let charly: Model;

  beforeEach(() => {
    ({ network, alice, bob, charly } = setupCollaborativeEnv());
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

  test("copy/paste style", () => {
    setCellContent(alice, "A1", "hello");
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      style: { fillColor: "#fefefe" },
    });
    alice.dispatch("COPY", { target: [toZone("A1")] });
    alice.dispatch("PASTE", { target: [toZone("A2")] });
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.style, {
      fillColor: "#fefefe",
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A2")!.style, {
      fillColor: "#fefefe",
    });
  });

  test("copy/paste on styled cell", () => {
    setCellContent(alice, "A1", "hello");
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 1,
      row: 1,
      style: { fillColor: "#fefefe" },
    });
    alice.dispatch("COPY", { target: [toZone("A1")] });
    alice.dispatch("PASTE", { target: [toZone("B2")] });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCell(user, "B2")!.style,
      undefined
    );
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

  test("Updatecell & composer on different cells", () => {
    alice.dispatch("START_EDITION");
    setCellContent(bob, "A2", "A2");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A2"),
      "A2"
    );
  });

  test("Updatecell & composer on the same cell", () => {
    alice.dispatch("START_EDITION");
    alice.dispatch("SET_CURRENT_CONTENT", { content: "bla" });
    setCellContent(bob, "A1", "A1");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "bla"
    );
  });

  test("Updatecell & composer on the same cell when cancelling edition", () => {
    alice.dispatch("START_EDITION");
    alice.dispatch("SET_CURRENT_CONTENT", { content: "bla" });
    setCellContent(bob, "A1", "A1");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
    alice.dispatch("STOP_EDITION", { cancel: true });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
  });

  test("duplicate sheet does not activate sheet", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    alice.dispatch("DUPLICATE_SHEET", {
      name: "Duplicated Sheet",
      sheetIdFrom: firstSheetId,
      sheetIdTo: "42",
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getActiveSheetId(),
      firstSheetId
    );
    alice.dispatch("ACTIVATE_SHEET", { sheetIdFrom: firstSheetId, sheetIdTo: "42" });
    expect(alice.getters.getActiveSheetId()).toBe("42");
    expect(bob.getters.getActiveSheetId()).toBe(firstSheetId);
    expect(charly.getters.getActiveSheetId()).toBe(firstSheetId);
  });

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
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCellContent(user, "A1"),
        "Hi"
      );
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
      expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.value, 5);
      setCellContent(alice, "A1", "=10");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1")!.value,
        10
      );
      // undo(alice);
      // expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.value, 5);
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
          style: null,
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
          style: null,
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
        createSheet(alice, { sheetId: "alice1", activate: true });
        createSheet(bob, { sheetId: "bob1", activate: true });
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
        undo(alice);
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
