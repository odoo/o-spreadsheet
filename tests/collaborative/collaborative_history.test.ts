import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "@odoo/o-spreadsheet-engine/constants";
import { StateUpdateMessage } from "@odoo/o-spreadsheet-engine/types/collaborative/transport_service";
import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { CommandResult, UpdateCellCommand } from "../../src/types";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  addRows,
  clearCells,
  createSheet,
  createTable,
  deleteColumns,
  deleteRows,
  deleteSheet,
  duplicateSheet,
  freezeColumns,
  hideSheet,
  redo,
  renamePivot,
  resizeColumns,
  setCellContent,
  setFormatting,
  setSelection,
  snapshot,
  undo,
  unfreezeColumns,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";
import { createModel, spyUiPluginHandle, target } from "../test_helpers/helpers";
import { addPivot, removePivot, updatePivot } from "../test_helpers/pivot_helpers";
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

  test("Concurrent undo, undo last", async () => {
    setCellContent(alice, "A1", "hello");
    await network.concurrent(async () => {
      setCellContent(bob, "B1", "hello");
      undo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo, undo first", async () => {
    setCellContent(alice, "A1", "A1");
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(bob, "B1", "B1");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "B1");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Undo a pending revision", async () => {
    await network.concurrent(async () => {
      setCellContent(alice, "A1", "hello");
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo and a non-related pending revision", async () => {
    setCellContent(alice, "A1", "hello");
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo, redo last", async () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(bob, "B1", "hello");
    setCellContent(bob, "C1", "hello");
    undo(bob);
    await network.concurrent(async () => {
      undo(alice);
      redo(bob);
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent redo, undo first", async () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(bob, "B1", "hello");
    undo(bob);
    await network.concurrent(async () => {
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
    setFormatting(bob, "H2:J6", { fillColor: "#121212" });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getStyle(user, "H2"), {
      fillColor: "#121212",
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(alice, "N2"),
      undefined
    );
  });

  test("Load model with a simple initial messages", () => {
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
    const model = createModel(
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

  test("Load empty model with initial messages, with wrong sheetId", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        nextRevisionId: "1",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [
          { type: "UPDATE_CELL", col: 0, row: 0, sheetId: "ARandomSheetId", content: "Hello" },
        ],
        serverRevisionId: DEFAULT_REVISION_ID,
      },
    ];
    const model = createModel({}, {}, initialMessages);
    expect(getCellContent(model, "A1")).toBe("Hello");
  });

  test("Load empty model with initial messages, with multiple sheets and wrong sheetIds", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        serverRevisionId: DEFAULT_REVISION_ID,
        nextRevisionId: "1",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [
          { type: "UPDATE_CELL", col: 0, row: 0, sheetId: "ARandomSheetId", content: "Hello" },
        ],
      },
      {
        type: "REMOTE_REVISION",
        serverRevisionId: "1",
        nextRevisionId: "2",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [
          { type: "CREATE_SHEET", sheetId: "newSheetId", name: "newSheetName", position: 1 },
        ],
      },
      {
        type: "REMOTE_REVISION",
        serverRevisionId: "2",
        nextRevisionId: "3",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [{ type: "UPDATE_CELL", col: 0, row: 0, sheetId: "newSheetId", content: "Hi" }],
      },
      {
        type: "REMOTE_REVISION",
        serverRevisionId: "3",
        nextRevisionId: "4",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [
          {
            type: "UPDATE_CELL",
            col: 1,
            row: 0,
            sheetId: "ARandomSheetId",
            content: "Good morning",
          },
        ],
      },
    ];
    const model = createModel({}, {}, initialMessages);
    expect(getCellContent(model, "A1")).toBe("Hello");
    expect(getCellContent(model, "B1")).toBe("Good morning");
    expect(getCellContent(model, "A1", "newSheetId")).toBe("Hi");
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
    const model = createModel(
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

  test("The revisions are rebased", async () => {
    addRows(alice, "after", 11, 1);
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(charlie, "A1", "Hello"); // This command is not transformed
      setCellContent(charlie, "A13", "Hello"); // This command is transformed (and destroyed)
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A12"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A13"), undefined);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
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
    const model = createModel(
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

  test("Initial sort command is dropped", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: MESSAGE_VERSION,
        nextRevisionId: "1",
        clientId: "bob",
        commands: [
          {
            // @ts-ignore SORT_CELLS was a core command (see commit message)
            type: "SORT_CELLS",
            col: 1,
            row: 0,
            sheetId: "sheet1",
            zone: toZone("A1:A3"),
            sortDirection: "asc",
          },
        ],
        serverRevisionId: "initial_revision",
      },
    ];
    const data = {
      revisionId: "initial_revision",
      sheets: [
        {
          id: "sheet1",
          cells: { A1: "1", A2: "2", A3: "3" },
        },
      ],
    };
    const model = createModel(data, {}, initialMessages);
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("2");
    expect(getCellContent(model, "A3")).toBe("3");
  });

  test("Initial set decimal command is dropped", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: MESSAGE_VERSION,
        nextRevisionId: "1",
        clientId: "bob",
        commands: [
          {
            // @ts-ignore SET_DECIMAL was a core command (see commit message)
            type: "SET_DECIMAL",
            target: target("A1"),
            sheetId: "sheet1",
            step: 1,
          },
        ],
        serverRevisionId: "initial_revision",
      },
    ];
    const data = {
      revisionId: "initial_revision",
      sheets: [
        {
          id: "sheet1",
          cells: { A1: "1" },
        },
      ],
    };
    const model = createModel(data, {}, initialMessages);
    expect(getCell(model, "A1")?.format).toBeUndefined();
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
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello in D1");
  });

  test("Undo with pending which requires a transformation", async () => {
    addColumns(alice, "before", "A", 1);
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
  });

  test("Undo or redo block the next commands until it's accepted", async () => {
    setCellContent(alice, "A1", "hello");
    await network.concurrent(async () => {
      undo(alice);
      expect(setCellContent(alice, "A2", "test")).toBeCancelledBecause(
        CommandResult.WaitingSessionConfirmation
      );
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);
    expect(setCellContent(alice, "A2", "test")).toBeSuccessfullyDispatched();
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "test");
  });

  test("Update cell, undo, remove sheet, redo", () => {
    const sheetId = "42";
    createSheet(charlie, { sheetId });
    expect(all).toHaveSynchronizedExportedData();
    setCellContent(alice, "A1", "hello", sheetId);
    undo(alice);
    deleteSheet(bob, sheetId);
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

  test("Undo a concurrent command which requires a transformation", async () => {
    setCellContent(alice, "A1", "salut");
    setCellContent(alice, "A1", "hello");
    await network.concurrent(async () => {
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
    createSheet(alice, { sheetId, position: 0 });
    setCellContent(bob, "A1", "Hello in A1", sheetId);
    expect(all).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1", sheetId),
      "Hello in A1"
    );
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => user.getters.getSheetIds(), [sheet1Id]);
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

  test("Active sheet is correctly recomputed after concurrent sheet modifications", async () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "sheet2", name: "Sheet2", position: 1 });
    await network.concurrent(async () => {
      deleteSheet(bob, "sheet2");
      createSheet(alice, { sheetId: "sheet3", position: 1, name: "Sheet3" });
      deleteSheet(charlie, firstSheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("local history is cleared and cannot repeat last command after snapshot", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(alice, "A2", "hello");
    undo(alice);
    snapshot(bob);
    expect(undo(alice)).toBeCancelledBecause(CommandResult.EmptyUndoStack);
    expect(redo(alice)).toBeCancelledBecause(CommandResult.EmptyRedoStack);
  });

  test("concurrently dispatch after history cleared", async () => {
    const bobData = bob.exportData();
    await network.concurrent(async () => {
      snapshot(bob);
      setCellContent(alice, "A2", "Hi");
    });
    expect(createModel(network.snapshot)).toExport(bobData);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("concurrently clear history after dispatch", async () => {
    const bobData = bob.exportData();
    await network.concurrent(async () => {
      setCellContent(alice, "A2", "Hi");
      snapshot(bob);
    });
    expect(network.snapshot).not.toEqual(bobData);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("concurrent snapshot is refused if arrives after", async () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(alice, "A2", "hello");
    const bobData = bob.exportData();
    await network.concurrent(async () => {
      undo(alice);
      snapshot(bob);
    });
    expect(network.snapshot).not.toEqual(bobData);
    expect(getCellContent(alice, "A2")).toBeFalsy();
    setCellContent(alice, "A2", "Hi"); // can still dispatch
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("local history can be cleared while undoing: clear first", async () => {
    setCellContent(alice, "A1", "hello");
    await network.concurrent(async () => {
      snapshot(bob);
      undo(alice);
    });
    expect(getCellContent(alice, "A1")).toBe("hello");
    setCellContent(alice, "A2", "Hi"); // can still dispatch
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("snapshot is sent", () => {
    const data = alice.exportData();
    createModel(data, { transportService: network, snapshotRequested: true });
    expect(createModel(network.snapshot)).toExport(data);
  });

  test("snapshot is sent with a new revision id", () => {
    const revisionId = alice.exportData().revisionId;
    snapshot(alice);
    expect(network.snapshot?.revisionId).not.toBe(revisionId);
  });

  test("undone & redone commands are transformed", async () => {
    const david = createModel(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David" },
    });
    const elisa = createModel(alice.exportData(), {
      transportService: network,
      client: { id: "elisa", name: "Elisa" },
    });
    const command: UpdateCellCommand = {
      type: "UPDATE_CELL",
      col: 0,
      row: 0,
      sheetId: david.getters.getActiveSheetId(),
      content: "hello",
    };
    await network.concurrent(async () => {
      addColumns(alice, "before", "A", 1);
      david.dispatch(command.type, command);
    });
    const davidPluginHandle = spyUiPluginHandle(david);
    const elisePluginHandle = spyUiPluginHandle(elisa);
    undo(david);
    expect(davidPluginHandle).toHaveBeenCalledWith({
      type: "UNDO",
      commands: [{ ...command, col: 1 }],
    });
    expect(elisePluginHandle).toHaveBeenCalledWith({
      type: "UNDO",
      commands: [{ ...command, col: 1 }],
    });
    redo(david);
    expect(davidPluginHandle).toHaveBeenCalledWith({
      type: "REDO",
      commands: [{ ...command, col: 1 }],
    });
    expect(elisePluginHandle).toHaveBeenCalledWith({
      type: "REDO",
      commands: [{ ...command, col: 1 }],
    });
  });
  test("dispatch command after concurrent action with another user", async () => {
    addColumns(bob, "before", "A", 1);
    await network.concurrent(async () => {
      undo(bob);
      setCellContent(charlie, "D25", "D");
    });
    setCellContent(bob, "A13", "A");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A13"),
      "A"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo with actions from at least two users", async () => {
    setCellContent(bob, "A1", "Hello");
    await network.concurrent(async () => {
      undo(bob);
      addColumns(alice, "before", "A", 1);
      setCellContent(charlie, "B2", "Alice");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Concurrent redo with actions from at least two users", async () => {
    setCellContent(bob, "A1", "Hello");
    undo(bob);
    await network.concurrent(async () => {
      redo(bob);
      addColumns(alice, "before", "A", 1);
      setCellContent(charlie, "B2", "Alice");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("dont remove last sheet with undo", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(alice, {});
    deleteSheet(bob, firstSheetId);
    undo(alice);
    expect(all).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheetIds(),
      [firstSheetId]
    );
  });

  test("Evaluation is re-triggered after a replay of dupplicate sheet", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    await network.concurrent(async () => {
      deleteRows(bob, [0], "Sheet1");
      setCellContent(alice, "A1", "hello", "Sheet1");
    });
    await network.concurrent(async () => {
      clearCells(alice, ["A1:B2"], "Sheet1");
      duplicateSheet(charlie, "Sheet1", "duplicateSheetId");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedEvaluation();
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Evaluation is the same after a sheet deletion replayed", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "hello");
    duplicateSheet(charlie, "Sheet1", "duplicateSheetId");
    await network.concurrent(async () => {
      hideSheet(bob, "Sheet1");
      deleteSheet(charlie, "Sheet1");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedEvaluation();
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Replay a REMOVE_TABLE in empty sheet after a local CREATE_TABLE", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    setCellContent(charlie, "A1", "Hello", "Sheet1");
    alice.dispatch("REMOVE_TABLE", {
      target: [
        { left: 4, right: 7, top: 4, bottom: 5 },
        { left: 5, right: 7, top: 3, bottom: 8 },
      ],
      sheetId: "Sheet1",
    });
    await network.concurrent(async () => {
      undo(charlie);
      createTable(alice, "3:11", {});
    });
    expect([alice, bob, charlie]).toHaveSynchronizedEvaluation();
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("transform target command with column addition before the target edge", async () => {
    addColumns(charlie, "before", "B", 1);
    await network.concurrent(async () => {
      undo(charlie);
      setFormatting(bob, "A1", { bold: true });
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1")?.style, { bold: true });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1")?.style, undefined);
    redo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1")?.style, { bold: true });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1")?.style, undefined);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Pivot payload replayed is the same as the original", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    await network.concurrent(async () => {
      setCellContent(alice, "A1", "hello");
      addPivot(charlie, "A1:A2", { name: "pivot" }, "1");
      renamePivot(charlie, "1", "newName");
    });
    undo(charlie);
    expect([alice, bob, charlie]).toHaveSynchronizedEvaluation();
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("updated pivot payload transformed is the same as the original", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    addPivot(charlie, "A1:A2", { name: "pivot" }, "1");
    deleteRows(alice, [0]);
    redo(alice);
    await network.concurrent(async () => {
      setCellContent(charlie, "A10", "hello");
      updatePivot(alice, "1", {
        dataSet: { sheetId: alice.getters.getActiveSheetId(), zone: toZone("A1:B1") },
      });
      renamePivot(alice, "1", "newName");
      undo(alice);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedEvaluation();
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("remove pivot, new user joins, then undo", () => {
    const network = new MockTransportService();
    const data = {
      revisionId: DEFAULT_REVISION_ID,
      sheets: [
        {
          id: "sheet1",
          cells: {
            A1: "=PIVOT(1)",
            A10: "Price",
            A11: "10",
          },
        },
      ],
      pivots: {
        "1": {
          formulaId: "1",
          name: "Pivot",
          type: "SPREADSHEET",
          dataSet: {
            zone: toZone("A10:A11"),
            sheetId: "sheet1",
          },
          rows: [],
          columns: [],
          measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
        },
      },
    };

    // intercept Alice's messages to give them as initial messages to Bob
    const messages: StateUpdateMessage[] = [];
    network.onNewMessage("dd", (message) => messages.push(message));

    const alice = createModel(data, {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });
    removePivot(alice, "1");

    // Bob joins the spreadsheet later
    const configBob = {
      transportService: network,
      client: { id: "bob", name: "Bob" },
    };
    const bob = createModel(data, configBob, messages);
    undo(alice);
    expect(getEvaluatedCell(bob, "B3").value).toEqual(10);
  });

  test("Concurrently undo a command on which another is based", async () => {
    /**
     * This test is a bit tricky. Let's begin with the use case:
     * 1) A command is created by Alice
     * 2) Concurrently, Alice undo her command, and Bob do a command that is
     * valid with the command of Alice, but not anymore without. (Ex: insert
     * a cell in a sheet that was created by Alice. If the command of Alice
     * is removed (aka undo-ed), the sheet does not exist anymore).
     * 3) Alice redo her command.
     *
     * At this point, the command of Bob would be valid as the sheet is here.
     * But, when Bob try to send his command, the command is empty (have been
     * transformed with the inverse of CREATE_SHEET). So, if he sends his
     * command, Alice will not be able to insert his command in all of her
     * branches, because obviously it's not possible to retrieve the
     * SET_CELL_CONTENT from an empty command.
     *
     * To solve this, the behavior is to rebase the command (and all the following)
     * if the *local* command is empty.
     */
    createSheet(alice, { sheetId: "sheet2" });
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(bob, "B2", "B2", "sheet2");
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("do not transformed revisions with concurrently rejected commands", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    const initialCols = alice.getters.getNumberCols("Sheet1");
    duplicateSheet(charlie, "Sheet1");
    await network.concurrent(async () => {
      undo(charlie);

      // DELETE_SHEET is initially accepted (there's 2 sheets) but later
      // rejected because there's only one sheet left when DUPLICATE_SHEET is undone
      deleteSheet(bob, "Sheet1");
    });
    await network.concurrent(async () => {
      undo(bob);

      // ADD_COLUMNS_ROWS no longer makes sense because the sheet has been finally deleted
      // and the transformation drops the command
      addRows(alice, "after", 0, 1, "Sheet1");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getNumberCols("Sheet1"),
      initialCols
    );
    redo(charlie);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getNumberCols("Sheet1"),
      initialCols
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo where the transformation partially destroys the other", async () => {
    addColumns(alice, "before", "C", 3);
    await network.concurrent(async () => {
      undo(alice);
      resizeColumns(bob, ["A", "B", "C", "D", "E"], 20);
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Transform command with preceding concurrent command when previous command is redone", async () => {
    setCellContent(alice, "E10", "hello");
    addColumns(alice, "before", "F", 3);
    undo(alice);
    await network.concurrent(async () => {
      addColumns(bob, "before", "B", 2);
      // Charlie's command should be transformed with Bob's command when Alice redo
      // her command
      addColumns(charlie, "before", "E", 1);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "H10"),
      "hello"
    );
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "G10"),
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("inverse delete rows then replay the command", async () => {
    deleteRows(bob, [6, 5, 4, 3, 2]);
    await network.concurrent(async () => {
      undo(bob);
      setCellContent(alice, "C4", "hello");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C9"),
      "hello"
    );
    redo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C4"),
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("All locals commands", async () => {
    createSheet(alice, { sheetId: "sheet2" });
    await network.concurrent(async () => {
      undo(alice);
      setCellContent(bob, "B2", "B2", "sheet2");
      setCellContent(bob, "A1", "Hello");
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "Hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2", "sheet2"),
      ""
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("redo destroyed command", async () => {
    setCellContent(charlie, "A1", "hi");
    await network.concurrent(async () => {
      deleteRows(bob, [6, 5, 4, 3, 2]);
      setCellContent(charlie, "C5", "hi");
      undo(charlie);
    });
    const result = redo(charlie);
    expect(result).toBeSuccessfullyDispatched();
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "C5"), undefined);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("can undo/redo command previous to a destroyed command", async () => {
    setCellContent(charlie, "A1", "hello");
    await network.concurrent(async () => {
      deleteRows(bob, [6, 5, 4, 3, 2]);
      setCellContent(charlie, "C5", "hi");
    });
    undo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "C5"), undefined);
    undo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "C5"), undefined);
    redo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "C5"), "");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("cannot redo command after a destroyed command", async () => {
    setCellContent(charlie, "A1", "hello");
    undo(charlie);
    await network.concurrent(async () => {
      deleteRows(bob, [6, 5, 4, 3, 2]);
      setCellContent(charlie, "C5", "hi");
    });

    redo(charlie);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("undo operation before unfreeze and sheet creation", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    freezeColumns(alice, 1, firstSheetId);
    setCellContent(alice, "A1", "hello");
    unfreezeColumns(charlie, firstSheetId);
    // charlies's active sheet is "sheet2" but "sheet2" does not exists when
    // "UNFREEZE_COLUMNS" is replayed.
    createSheet(charlie, { sheetId: "sheet2", activate: true });
    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => user.getters.getPaneDivisions(firstSheetId), {
      xSplit: 0,
      ySplit: 0,
    });
  });

  test("can repeat command after receiving remote revisions", () => {
    setCellContent(alice, "A1", "hello there");
    setCellContent(bob, "A2", "general kenobi");
    setSelection(alice, ["A3"]);
    redo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "hello there");
  });

  test("can repeat command concurrently with remote revisions", async () => {
    setCellContent(alice, "A1", "hello there");
    setSelection(alice, ["A3"]);
    await network.concurrent(async () => {
      setCellContent(bob, "A3", "general kenobi");
      redo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "hello there");
  });

  test("Can concurrently hide and delete a sheet", async () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    duplicateSheet(charlie, "Sheet1", "duplicateSheetId");
    await network.concurrent(async () => {
      hideSheet(bob, "Sheet1");
      deleteSheet(charlie, "Sheet1");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("rejected new sheet with the same name", async () => {
    const name = "Sheet2";
    createSheet(bob, { name, position: 1, sheetId: "Sheet2" });
    deleteSheet(bob, "Sheet2");
    await network.concurrent(async () => {
      undo(bob);
      // this create sheet is rejected because it has a duplicated
      // sheet name
      createSheet(alice, { name, position: 1, sheetId: "Sheet2bis" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });
});
