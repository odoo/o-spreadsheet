import { Model } from "../../src";
import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { CoreCommand } from "../../src/types";
import { CollaborationMessage } from "../../src/types/collaborative/transport_service";
import {
  activateSheet,
  addColumns,
  addRows,
  clearCell,
  createSheet,
  deleteColumns,
  deleteRows,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent } from "../test_helpers/getters_helpers";
import { target, toPosition } from "../test_helpers/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Multi users synchronisation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  test("update two different cells concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello in A1");

      setCellContent(bob, "B2", "hello in B2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello in A1"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
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
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi Alice"
    );
  });

  test("update the same cell sequentially", () => {
    setCellContent(alice, "A1", "hello Bob");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello Bob"
    );

    setCellContent(bob, "A1", "Hi Alice");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi Alice"
    );
  });

  test("update and delete the same cell concurrently", () => {
    setCellContent(alice, "A1", "Hi");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi"
    );

    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      expect(getCellContent(alice, "A1")).toBe("hello");

      clearCell(bob, "A1");
      expect(getCell(bob, "A1")).toBeUndefined();
    });

    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("Command while the previous command is not acknowledged", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello A1");
      setCellContent(alice, "B1", "hello B1");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello A1"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello B1"
    );
  });

  test("Do not receive command after leaving the session", () => {
    let called = false;
    alice["session"].on("collaborative-event-received", alice, () => (called = true));
    alice.leaveSession();
    setCellContent(bob, "A1", "salut");
    expect(called).toBe(false);
  });

  test("Can export data after leaving the session", () => {
    alice.leaveSession();
    alice.exportData();
  });

  test("Do not listen for new message before catchup messages", () => {
    const transport = new MockTransportService();
    const command: CoreCommand = {
      type: "UPDATE_CELL",
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "fist command",
    };
    const catchupMessage: CollaborationMessage = {
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "1",
      serverRevisionId: DEFAULT_REVISION_ID,
      clientId: "alice",
      commands: [command],
    };
    const nextMessage: CollaborationMessage = {
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "2",
      serverRevisionId: "1",
      clientId: "alice",
      commands: [{ ...command, content: "second command" }],
    };
    // we simulate a message from the network which is supposed to come after
    // the messages given as initial messages
    jest.spyOn(transport, "onNewMessage").mockImplementation((id, callback) => {
      callback(nextMessage);
    });
    const data = alice.exportData();
    const david = new Model(data, { transportService: transport }, [catchupMessage]);
    expect(getCellContent(david, "A1")).toBe("second command");
  });

  test("Correctly set the active sheet after a sheet deletion", () => {
    const sheetId = "sheet1";
    const message: CollaborationMessage = {
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "1",
      serverRevisionId: DEFAULT_REVISION_ID,
      clientId: "alice",
      commands: [{ type: "DELETE_SHEET", sheetId }],
    };
    const model = new Model(
      {
        sheets: [{ id: sheetId }, { id: "sheet2" }],
        activeSheetId: sheetId,
      },
      {},
      [message]
    );
    expect(model.getters.getActiveSheetId()).toBe("sheet2");
  });

  test("delete and update the same empty cell concurrently", () => {
    setCellContent(alice, "A1", "hello");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );

    network.concurrent(() => {
      clearCell(alice, "A1");
      setCellContent(bob, "A1", "Hi");
    });

    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hi"
    );
  });

  test("Update a cell and merge a cell concurrently", () => {
    network.concurrent(() => {
      setCellContent(alice, "B2", "Hi Bob");
      bob.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        target: target("A1:B2"),
      });
    });

    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "B2"), undefined);
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
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "A1")!.style, {
      fillColor: "#fefefe",
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "A2")!.style, {
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
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
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
        target: target("A1:B3"),
      });
      setCellContent(bob, "B3", "Hi Alice");
    });

    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect(alice.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    expect(bob.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    expect(charlie.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1, topLeft: toPosition("A1") },
    ]);
    undo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello"
    );
    undo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "C1"), undefined);
  });

  test("2-Merge a cell and update a cell concurrently, then remove the merge", () => {
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId: alice.getters.getActiveSheetId(),
        target: target("A1:B2"),
      });
      setCellContent(bob, "B2", "Hi Alice");
    });
    const sheetId = alice.getters.getActiveSheetId();
    expect(alice.getters.getMerges(sheetId)).toHaveLength(1);
    alice.dispatch("REMOVE_MERGE", {
      target: target("A1:B2"),
      sheetId,
    });
    expect(alice.getters.getMerges(sheetId)).toHaveLength(0);
    expect(bob.getters.getMerges(sheetId)).toHaveLength(0);
    expect(charlie.getters.getMerges(sheetId)).toHaveLength(0);
  });

  test("delete content & merge concurrently", () => {
    setCellContent(alice, "B2", "hello");
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        target: target("B2:C3"),
      });
      bob.dispatch("DELETE_CONTENT", {
        sheetId,
        target: [toZone("A1:B2")],
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Set formatting & merge concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("ADD_MERGE", {
        sheetId,
        target: target("A1:B2"),
      });
      bob.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2:C3")],
        border: "external",
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getBorder(user, "B2"), null);
  });

  test("Command not allowed is not dispatched to others users", () => {
    const spy = jest.spyOn(network, "sendMessage");
    setCellContent(alice, "A1", "hello", "invalidSheetId");
    expect(spy).toHaveBeenCalledTimes(0);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Updatecell & composer on different cells", () => {
    alice.dispatch("START_EDITION");
    setCellContent(bob, "A2", "A2");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A2"),
      "A2"
    );
  });

  test("Updatecell & composer on the same cell", () => {
    alice.dispatch("START_EDITION");
    alice.dispatch("SET_CURRENT_CONTENT", { content: "bla" });
    setCellContent(bob, "A1", "A1");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "bla"
    );
  });

  test("Updatecell & composer on the same cell when cancelling edition", () => {
    alice.dispatch("START_EDITION");
    alice.dispatch("SET_CURRENT_CONTENT", { content: "bla" });
    setCellContent(bob, "A1", "A1");
    expect(alice.getters.getEditionMode()).toBe("editing");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
    alice.dispatch("STOP_EDITION", { cancel: true });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "A1"
    );
  });

  test("duplicate sheet does not activate sheet", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    alice.dispatch("DUPLICATE_SHEET", {
      name: "Duplicated Sheet",
      sheetId: firstSheetId,
      sheetIdTo: "42",
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getActiveSheetId(),
      firstSheetId
    );
    activateSheet(alice, "42");
    expect(alice.getters.getActiveSheetId()).toBe("42");
    expect(bob.getters.getActiveSheetId()).toBe(firstSheetId);
    expect(charlie.getters.getActiveSheetId()).toBe(firstSheetId);
  });

  test("Do not resend pending revisions with a non-core command", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      const spy = jest.spyOn(network, "sendMessage");
      alice.dispatch("START_EDITION");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  test("Composer is moved when column is added before it", () => {
    selectCell(alice, "D2");
    alice.dispatch("START_EDITION", { text: "hello" });
    addColumns(bob, "after", "B", 1);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "E2"),
      "hello"
    );
  });

  test("Composer is not moved when column is added after it", () => {
    selectCell(alice, "A2");
    alice.dispatch("START_EDITION", { text: "hello" });
    addColumns(bob, "after", "B", 1);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A2"),
      "hello"
    );
  });

  test("Composer is moved when column is removed before it", () => {
    selectCell(alice, "D2");
    alice.dispatch("START_EDITION", { text: "hello" });
    deleteColumns(bob, ["B"]);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C2"),
      "hello"
    );
  });

  test("Composer is not moved when column is removed after it", () => {
    selectCell(alice, "D2");
    alice.dispatch("START_EDITION", { text: "hello" });
    deleteColumns(bob, ["E"]);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "D2"),
      "hello"
    );
  });

  test("Composer is moved when column is removed on it", () => {
    selectCell(alice, "D2");
    const spy = jest.spyOn(alice["config"], "notifyUser");
    alice.dispatch("START_EDITION", { text: "hello" });
    deleteColumns(bob, ["D"]);
    expect(spy).toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Composer is moved when row is added before it", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    addRows(bob, "after", 1, 1);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A5"),
      "hello"
    );
  });

  test("Composer is not moved when row is added after it", () => {
    selectCell(alice, "A2");
    alice.dispatch("START_EDITION", { text: "hello" });
    addRows(bob, "after", 5, 1);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A2"),
      "hello"
    );
  });

  test("Composer is moved when row is removed before it", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    deleteRows(bob, [1]);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A3"),
      "hello"
    );
  });

  test("Composer is not moved when row is removed after it", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    deleteRows(bob, [10]);
    alice.dispatch("STOP_EDITION");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A4"),
      "hello"
    );
  });

  test("Delete row & Don't notify cell is deleted when composer is active", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    const spy = jest.spyOn(alice["config"], "notifyUser");
    deleteRows(bob, [3]);
    expect(spy).toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is active", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    const spy = jest.spyOn(alice["config"], "notifyUser");
    deleteColumns(bob, ["A"]);
    expect(spy).toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is active", () => {
    const activeSheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    const spy = jest.spyOn(alice["config"], "notifyUser");
    alice.dispatch("DELETE_SHEET", { sheetId: activeSheetId });
    expect(spy).toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete row & Don't notify cell is deleted when composer is not active", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    alice.dispatch("STOP_EDITION");
    const spy = jest.spyOn(alice["config"], "notifyUser");
    deleteRows(bob, [3]);
    expect(spy).not.toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is not active", () => {
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    alice.dispatch("STOP_EDITION");
    const spy = jest.spyOn(alice["config"], "notifyUser");
    deleteColumns(bob, ["A"]);
    expect(spy).not.toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is not active", () => {
    const activeSheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    selectCell(alice, "A4");
    alice.dispatch("START_EDITION", { text: "hello" });
    alice.dispatch("STOP_EDITION");
    const spy = jest.spyOn(alice["config"], "notifyUser");
    alice.dispatch("DELETE_SHEET", { sheetId: activeSheetId });
    expect(spy).not.toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Delete the same figure concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      x: 100,
      y: 100,
    };
    alice.dispatch("CREATE_FIGURE", {
      sheetId,
      figure,
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigures(sheetId),
      [figure]
    );
    network.concurrent(() => {
      alice.dispatch("DELETE_FIGURE", { id: "someuuid", sheetId });
      bob.dispatch("DELETE_FIGURE", { id: "someuuid", sheetId });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigures(sheetId),
      []
    );
  });

  test("Composing in a sheet when the sheet is deleted", () => {
    createSheet(alice, { sheetId: "42" });
    activateSheet(alice, "42");
    selectCell(alice, "A4");
    const spy = jest.spyOn(alice["config"], "notifyUser");
    alice.dispatch("START_EDITION", { text: "hello" });
    bob.dispatch("DELETE_SHEET", { sheetId: "42" });
    expect(spy).toHaveBeenCalled();
    expect(alice.getters.getEditionMode()).toBe("inactive");
  });

  test("Do not handle duplicated message", () => {
    const serverRevisionId = alice["session"]["serverRevisionId"];
    const length = alice.getters.getActiveSheet().cols.length;
    const data = alice.exportData();
    const commands: CoreCommand[] = [
      {
        type: "ADD_COLUMNS_ROWS",
        dimension: "COL",
        position: "before",
        sheetId: alice.getters.getActiveSheetId(),
        base: 1,
        quantity: 50,
      },
    ];
    const message: CollaborationMessage = {
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      nextRevisionId: "42",
      serverRevisionId,
      clientId: "alice",
      commands,
    };
    // The message is received once as initial message and once from the network
    const david = new Model(data, { transportService: network }, [message]);
    network.sendMessage(message);
    expect(david.getters.getActiveSheet().cols.length).toBe(length + 50);
  });

  test("Selected figure Id is not modified if the create sheet comes from someone else", () => {
    const figure = { id: "42", x: 0, y: 0, width: 100, height: 100, tag: "text" };
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("CREATE_FIGURE", { sheetId, figure });
    alice.dispatch("SELECT_FIGURE", { id: "42" });
    expect(alice.getters.getSelectedFigureId()).toBe("42");
    expect(bob.getters.getSelectedFigureId()).toBeNull();
  });

  test("Spreadsheet in readonly still receive commands", () => {
    const david = new Model(alice.exportData(), { transportService: network, mode: "readonly" });
    setCellContent(alice, "A1", "hello");
    expect([alice, bob, charlie, david]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
    setCellContent(david, "A1", "I'm David and I want access !");
    expect([alice, bob, charlie, david]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  describe("Evaluation", () => {
    test("Evaluation is correctly triggered after cell updated", () => {
      setCellContent(alice, "A1", "=5");
      expect(getCell(alice, "A1")!.value).toBe(5);
      expect(getCell(bob, "A1")!.value).toBe(5);
    });
    test("Cell value is correctly re-evaluated after undo", () => {
      setCellContent(alice, "A1", "=5");
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1")!.value,
        5
      );
      setCellContent(alice, "A1", "=10");
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1")!.value,
        10
      );
      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getCell(user, "A1")!.value,
        5
      );
    });
  });
});
