import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { getBorder, getCell, getCellContent } from "../getters_helpers";
import { clearCell, setCellContent, undo } from "../commands_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import "../canvas.mock";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import { toPosition } from "../helpers";

describe("Multi users synchronisation", () => {
  let network: MockTransportService;
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
    setCellContent(bob, "C1", "hello");
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        zone: toZone("A1:B3"),
      });
      setCellContent(bob, "B3", "Hi Alice");
    });

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect(alice.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    expect(bob.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    expect(charly.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello");
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "C1"), undefined);
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

  test("Do not resend pending revisions with a non-core command", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      const spy = jest.spyOn(network, "sendMessage");
      alice.dispatch("START_EDITION");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Export data", () => {
    test("exportData throws if there are pending revisions", () => {
      network.concurrent(() => {
        setCellContent(alice, "A1", "hello");
        expect(() => alice.exportData()).toThrow();
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
      expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.value, 5);
      setCellContent(alice, "A1", "=10");
      expect([alice, bob, charly]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1")!.value,
        10
      );
      undo(alice);
      expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.value, 5);
    });
  });
});
