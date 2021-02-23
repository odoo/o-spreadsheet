import { Model } from "../../src";
import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { CommandResult } from "../../src/types";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import {
  addColumns,
  createSheet,
  deleteColumns,
  deleteRows,
  redo,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative local history", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  let all: Model[];

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
    all = [alice, bob, charlie];
  });

  test("Undo is propagated to other clients", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("Redo is propagated to other clients", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
  });

  test("Can undo two consecutive operations, and then redo them", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(alice, "A1", "test");

    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");

    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);

    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");

    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "test");
  });

  test("Concurrent undo, undo last", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      setCellContent(bob, "B1", "hello");
      undo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo, undo first", () => {
    setCellContent(alice, "A1", "A1");
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B1", "B1");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "B1");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Undo a pending revision", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo, redo last", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(bob, "B1", "hello");
    setCellContent(bob, "C1", "hello");
    undo(bob);
    network.concurrent(() => {
      undo(alice);
      redo(bob);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent redo, undo first", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(bob, "B1", "hello");
    undo(alice);
    network.concurrent(() => {
      redo(bob);
      undo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("revision id changes with each command", () => {
    expect(all).toHaveSynchronizedValue(
      (user) => user.exportData().revisionId,
      DEFAULT_REVISION_ID
    );
    setCellContent(alice, "A1", "hello");
    expect(alice.exportData().revisionId).not.toBe(DEFAULT_REVISION_ID);
    expect(bob.exportData().revisionId).not.toBe(DEFAULT_REVISION_ID);
    expect(charlie.exportData().revisionId).not.toBe(DEFAULT_REVISION_ID);
  });

  test("Add a column and set a formatting on it", () => {
    addColumns(alice, "before", "C", 4);
    undo(alice);
    bob.dispatch("SET_FORMATTING", {
      sheetId: bob.getters.getActiveSheetId(),
      target: [toZone("H2:J6")],
      style: { fillColor: "#121212" },
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getCellStyle(getCell(alice, "H2")!),
      { fillColor: "#121212" }
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(alice, "N2"),
      undefined
    );
  });

  test("Load model with initial messages", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: MESSAGE_VERSION,
        nextRevisionId: "1",
        clientId: "bob",
        commands: [{ type: "UPDATE_CELL", col: 1, row: 0, sheetId: "sheet1", content: "hello" }],
        serverRevisionId: "initial_revision",
      },
    ];
    const model = new Model(
      {
        revisionId: "initial_revision",
        sheets: [{ id: "sheet1" }],
      },
      {
        transportService: network,
        client: { id: "alice", name: "Alice" },
      },
      initialMessages
    );
    expect(getCellContent(model, "B1")).toBe("hello");
    expect(model.exportData().revisionId).toBe("1");
  });

  test("Load model with initial messages, with undo", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        nextRevisionId: "1",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [{ type: "UPDATE_CELL", col: 1, row: 0, sheetId: "sheet1", content: "hello" }],
        serverRevisionId: "initial_revision",
      },
      {
        type: "REVISION_UNDONE",
        version: MESSAGE_VERSION,
        nextRevisionId: "2",
        serverRevisionId: "1",
        undoneRevisionId: "1",
      },
    ];
    const model = new Model(
      {
        revisionId: "initial_revision",
        sheets: [{ id: "sheet1" }],
      },
      {
        transportService: network,
        client: { id: "alice", name: "Alice" },
      },
      initialMessages
    );
    expect(getCell(model, "B1")).toBeUndefined();
    expect(model.exportData().revisionId).toBe("2");
  });

  test("Load model with initial messages, with redo", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: MESSAGE_VERSION,
        nextRevisionId: "1",
        clientId: "bob",
        commands: [{ type: "UPDATE_CELL", col: 1, row: 0, sheetId: "sheet1", content: "hello" }],
        serverRevisionId: "initial_revision",
      },
      {
        type: "REVISION_UNDONE",
        version: MESSAGE_VERSION,
        nextRevisionId: "2",
        serverRevisionId: "1",
        undoneRevisionId: "1",
      },
      {
        type: "REVISION_REDONE",
        version: MESSAGE_VERSION,
        nextRevisionId: "3",
        serverRevisionId: "2",
        redoneRevisionId: "1",
      },
    ];
    const model = new Model(
      {
        revisionId: "initial_revision",
        sheets: [{ id: "sheet1" }],
      },
      {
        transportService: network,
        client: { id: "alice", name: "Alice" },
      },
      initialMessages
    );
    expect(getCellContent(model, "B1")).toBe("hello");
    expect(model.exportData().revisionId).toBe("3");
  });

  test("Undo/redo your own change only", () => {
    setCellContent(alice, "A1", "hello in A1");
    setCellContent(bob, "B2", "hello in B2");

    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello in A1");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "hello in B2");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "hello in B2");
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello in A1");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "hello in B2");
  });

  test("Undo two commands from different users, Alice first", () => {
    addColumns(alice, "before", "B", 1);
    addColumns(bob, "after", "A", 1);
    setCellContent(charlie, "D1", "hello in D1");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "D1"), "hello in D1");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in D1");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello in D1");
  });

  test("Undo two commands from different users, Bob first", () => {
    addColumns(alice, "before", "B", 1);
    addColumns(bob, "after", "A", 1);
    setCellContent(charlie, "D1", "hello in D1");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "D1"), "hello in D1");

    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in D1");
    undo(alice);
    expect(all).toHaveSynchronizedExportedData();
    // console.log(alice.exportData());
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello in D1");
  });

  test("Undo with pending which requires a transformation", () => {
    addColumns(alice, "before", "A", 1);
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
  });

  test("Undo or redo block the next commands until it's accepted", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      undo(alice);
      expect(setCellContent(alice, "A2", "test")).toBe(CommandResult.WaitingSessionConfirmation);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);
    expect(setCellContent(alice, "A2", "test")).toEqual(CommandResult.Success);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "test");
  });

  test("Update cell, undo, remove sheet, redo", () => {
    const sheetId = "42";
    createSheet(charlie, { sheetId, name: "Sheet42" });
    expect(all).toHaveSynchronizedExportedData();
    setCellContent(alice, "A1", "hello", sheetId);
    undo(alice);
    bob.dispatch("DELETE_SHEET", { sheetId });
    redo(alice);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Update, remove column, undo and redo", () => {
    setCellContent(alice, "A1", "hello");
    deleteColumns(bob, ["A"]);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    redo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("add column, update cell in col, undo and redo", () => {
    addColumns(alice, "after", "A", 1);
    setCellContent(bob, "B1", "hello");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
  });

  test("Redo which requires a transformation", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    addColumns(bob, "before", "A", 1);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
  });

  test("Undo a concurrent command which requires a transformation", () => {
    setCellContent(alice, "A1", "salut");
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      addColumns(bob, "before", "A", 1);
      undo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);

    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "salut");
  });

  test("Remove columns and undo/redo the change", () => {
    deleteColumns(alice, ["A", "B", "F"]);
    setCellContent(bob, "A1", "hello");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello");
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
  });

  test("Remove rows and undo/redo the change", () => {
    deleteRows(alice, [0, 1, 5]);
    setCellContent(bob, "A1", "hello");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "hello");
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
  });

  test("Undo a create sheet command", () => {
    const sheet1Id = alice.getters.getActiveSheetId();
    const sheetId = "42";
    alice.dispatch("CREATE_SHEET", { sheetId, position: 0 });
    setCellContent(bob, "A1", "Hello in A1", sheetId);
    expect(all).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1", sheetId),
      "Hello in A1"
    );
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => user.getters.getVisibleSheets(), [sheet1Id]);
  });

  test("Add column, update cell, undo/redo", () => {
    addColumns(alice, "after", "A", 1);
    setCellContent(bob, "B1", "hello");
    undo(alice);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
  });

  test("undo twice, redo twice", () => {
    setCellContent(bob, "F9", "hello");
    setCellContent(bob, "F9", "hello world");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "F9"), "hello");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "F9"), "");
    redo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "F9"), "hello");
    redo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "F9"), "hello world");
  });

  test("Undo a add column, and redo", () => {
    addColumns(alice, "after", "A", 1);
    setCellContent(bob, "B1", "hello");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    undo(alice);

    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
  });

  test("Add column, undo and redo does not impact the selection", () => {
    setCellContent(alice, "A1", "salut");
    addColumns(bob, "before", "A", 1);
    const aliceSelection = alice.getters.getSelectedZone();
    const bobSelection = bob.getters.getSelectedZone();
    undo(alice);
    redo(alice);
    expect(aliceSelection).toEqual(alice.getters.getSelectedZone());
    expect(bobSelection).toEqual(bob.getters.getSelectedZone());
  });

  test("Add two columns, fill them, then undo redo", () => {
    addColumns(alice, "after", "B", 1);
    addColumns(alice, "after", "C", 1);
    setCellContent(bob, "D1", "hello in D");
    setCellContent(bob, "C1", "hello in C");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in C");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "D1"), "hello in D");
    undo(alice);
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "C1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "D1"), undefined);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in C");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "D1"), undefined);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in C");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "D1"), "hello in D");
  });

  test("Add two columns, fill them and another, then undo redo", () => {
    addColumns(alice, "after", "B", 1);
    setCellContent(bob, "F1", "hello in F");
    setCellContent(bob, "G1", "hello in G");
    setCellContent(charlie, "C1", "hello in C");
    undo(bob);
    undo(bob);
    undo(alice);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in C");
  });

  test("Add two columns, fill one, undo, fill two, then undo redo", () => {
    addColumns(alice, "after", "B", 1);
    setCellContent(bob, "F1", "hello in F");
    undo(bob);
    setCellContent(bob, "G1", "hello in G");
    setCellContent(charlie, "C1", "hello in C");
    undo(bob);
    undo(alice);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello in C");
  });

  test("undo ADD_COLUMNS_ROWS with dimension COL when the column has been removed", () => {
    addColumns(alice, "after", "B", 1);
    setCellContent(bob, "F1", "hello");
    deleteColumns(bob, ["A", "B", "C", "D", "E"]);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "E1"), "hello");
  });

  test("undo/redo ADD_COLUMNS_ROWS with dimension COL when the column has been removed", () => {
    addColumns(alice, "after", "B", 1);
    setCellContent(bob, "F1", "hello");
    deleteColumns(bob, ["A", "B", "C", "D", "E"]);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    undo(alice);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "F1"), "hello");
  });
});
