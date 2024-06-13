import { Model, UIPlugin } from "../../src";
import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { featurePluginRegistry } from "../../src/plugins";
import { CommandResult, UpdateCellCommand } from "../../src/types";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  createSheet,
  deleteColumns,
  deleteRows,
  deleteSheet,
  freezeColumns,
  redo,
  setCellContent,
  setSelection,
  setStyle,
  snapshot,
  undo,
  unfreezeColumns,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getStyle } from "../test_helpers/getters_helpers";
import { getPlugin, target } from "../test_helpers/helpers";
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
    undo(bob);
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
    setStyle(bob, "H2:J6", { fillColor: "#121212" });
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
    const model = Model.BuildSync(
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
    const model = Model.BuildSync({}, {}, initialMessages);
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
        commands: [{ type: "CREATE_SHEET", sheetId: "newSheetId", position: 1 }],
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
    const model = Model.BuildSync({}, {}, initialMessages);
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
    const model = Model.BuildSync(
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
    const model = Model.BuildSync(
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
            sortDirection: "ascending",
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
          cells: { A1: { content: "1" }, A2: { content: "2" }, A3: { content: "3" } },
        },
      ],
    };
    const model = Model.BuildSync(data, {}, initialMessages);
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
          cells: { A1: { content: "1" } },
        },
      ],
    };
    const model = Model.BuildSync(data, {}, initialMessages);
    expect(getCell(model, "A1")?.format).toBeUndefined();
  });

  test("Update chart revisions contain the full definition", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: MESSAGE_VERSION,
        nextRevisionId: "1",
        clientId: "bob",
        commands: [
          {
            type: "UPDATE_CHART",
            id: "fig1",
            //@ts-ignore the old command would handle a partial definition
            definition: { dataSets: [{ dataRange: "A1:A3" }] },
          },
          {
            type: "CREATE_CHART",
            sheetId: "sheet1",
            id: "fig2",
            position: {
              x: 0,
              y: 0,
            },
            size: {
              width: 100,
              height: 100,
            },
            definition: {
              title: { text: "" },
              dataSets: [{ dataRange: "A1", yAxisId: "y" }],
              type: "bar",
              stacked: false,
              dataSetsHaveTitle: false,
              legendPosition: "none",
            },
          },
          {
            type: "UPDATE_CHART",
            id: "fig2",
            //@ts-ignore the old command would handle a partial definition
            definition: { dataSets: [{ dataRange: "B1:B3" }] },
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
          figures: [
            {
              id: "fig1",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "line",
                dataSetsHaveTitle: false,
                dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
                legendPosition: "top",
                title: "Line",
                stacked: false,
                cumulative: false,
              },
            },
          ],
        },
      ],
    };
    const model = Model.BuildSync(data, {}, initialMessages);
    const definition1 = model.getters.getChartDefinition("fig1") as LineChartDefinition;
    expect(definition1.dataSets).toEqual([{ dataRange: "A1:A3" }]);
    const definition2 = model.getters.getChartDefinition("fig2") as LineChartDefinition;
    expect(definition2.dataSets).toEqual([{ dataRange: "B1:B3" }]);
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

  test("local history is cleared and cannot repeat last command after snapshot", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(alice, "A2", "hello");
    undo(alice);
    snapshot(bob);
    expect(undo(alice)).toBeCancelledBecause(CommandResult.EmptyUndoStack);
    expect(redo(alice)).toBeCancelledBecause(CommandResult.EmptyRedoStack);
  });

  test("concurrently dispatch after history cleared", () => {
    const bobData = bob.exportData();
    network.concurrent(() => {
      snapshot(bob);
      setCellContent(alice, "A2", "Hi");
    });
    expect(Model.BuildSync(network.snapshot)).toExport(bobData);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("concurrently clear history after dispatch", () => {
    const bobData = bob.exportData();
    network.concurrent(() => {
      setCellContent(alice, "A2", "Hi");
      snapshot(bob);
    });
    expect(network.snapshot).not.toEqual(bobData);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("concurrent snapshot is refused if arrives after", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(alice, "A2", "hello");
    const bobData = bob.exportData();
    network.concurrent(() => {
      undo(alice);
      snapshot(bob);
    });
    expect(network.snapshot).not.toEqual(bobData);
    expect(getCellContent(alice, "A2")).toBeFalsy();
    setCellContent(alice, "A2", "Hi"); // can still dispatch
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("local history can be cleared while undoing: clear first", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      snapshot(bob);
      undo(alice);
    });
    expect(getCellContent(alice, "A1")).toBe("hello");
    setCellContent(alice, "A2", "Hi"); // can still dispatch
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Hi");
  });

  test("snapshot is sent", () => {
    const data = alice.exportData();
    Model.BuildSync(data, { transportService: network, snapshotRequested: true });
    expect(Model.BuildSync(network.snapshot)).toExport(data);
  });

  test("snapshot is sent with a new revision id", () => {
    const revisionId = alice.exportData().revisionId;
    snapshot(alice);
    expect(network.snapshot?.revisionId).not.toBe(revisionId);
  });

  test("undone & redone commands are transformed", () => {
    class TestPlugin extends UIPlugin {}
    featurePluginRegistry.add("test-plugin", TestPlugin);
    const david = Model.BuildSync(alice.exportData(), {
      transportService: network,
      client: { id: "david", name: "David" },
    });
    const elisa = Model.BuildSync(alice.exportData(), {
      transportService: network,
      client: { id: "elisa", name: "Elisa" },
    });
    featurePluginRegistry.remove("test-plugin");
    const command: UpdateCellCommand = {
      type: "UPDATE_CELL",
      col: 0,
      row: 0,
      sheetId: david.getters.getActiveSheetId(),
      content: "hello",
    };
    network.concurrent(() => {
      addColumns(alice, "before", "A", 1);
      david.dispatch(command.type, command);
    });
    const pluginDavid = getPlugin(david, TestPlugin);
    const pluginElisa = getPlugin(elisa, TestPlugin);
    pluginDavid.handle = jest.fn((cmd) => {});
    pluginElisa.handle = jest.fn((cmd) => {});
    undo(david);
    expect(pluginDavid.handle).toHaveBeenCalledWith({
      type: "UNDO",
      commands: [{ ...command, col: 1 }],
    });
    expect(pluginElisa.handle).toHaveBeenCalledWith({
      type: "UNDO",
      commands: [{ ...command, col: 1 }],
    });
    redo(david);
    expect(pluginDavid.handle).toHaveBeenCalledWith({
      type: "REDO",
      commands: [{ ...command, col: 1 }],
    });
    expect(pluginElisa.handle).toHaveBeenCalledWith({
      type: "REDO",
      commands: [{ ...command, col: 1 }],
    });
  });
  test("dispatch command after concurrent action with another user", () => {
    addColumns(bob, "before", "A", 1);
    network.concurrent(() => {
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

  test("Concurrent undo with actions from at least two users", () => {
    setCellContent(bob, "A1", "Hello");
    network.concurrent(() => {
      undo(bob);
      addColumns(alice, "before", "A", 1);
      setCellContent(charlie, "B2", "Alice");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Concurrent redo with actions from at least two users", () => {
    setCellContent(bob, "A1", "Hello");
    undo(bob);
    network.concurrent(() => {
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

  test("transform target command with column addition before the target edge", () => {
    addColumns(charlie, "before", "B", 1);
    network.concurrent(() => {
      undo(charlie);
      setStyle(bob, "A1", { bold: true });
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1")?.style, { bold: true });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1")?.style, undefined);
    redo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1")?.style, { bold: true });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1")?.style, undefined);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrently undo a command on which another is based", () => {
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
     * To solve this, the behavior is to drop a command (and all the following)
     * is the command is *local* and is empty.
     */
    createSheet(alice, { sheetId: "sheet2" });
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B2", "B2", "sheet2");
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Transform command with preceding concurrent command when previous command is redone", () => {
    setCellContent(alice, "E10", "hello");
    addColumns(alice, "before", "F", 3);
    undo(alice);
    network.concurrent(() => {
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

  test("inverse delete rows then replay the command", () => {
    deleteRows(bob, [6, 5, 4, 3, 2]);
    network.concurrent(() => {
      undo(bob);
      setCellContent(alice, "C4", "hello");
    });
    redo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C4"),
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("All locals commands", () => {
    createSheet(alice, { sheetId: "sheet2" });
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B2", "B2", "sheet2");
      setCellContent(bob, "A1", "Hello");
    });
    redo(alice);
    /**
     * // @implementation-limitation
     * The UPDATE_CELL command triggered by Bob to insert "Hello" in B2 is done
     * on the sheet that Alice is currently undoing the creation. So, this command
     * should be drop.
     * As the command is drop, the following command (UPDATE_CELL of A1) is also
     * drop.
     */
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("redo dropped command", () => {
    setCellContent(charlie, "A1", "hi");
    network.concurrent(() => {
      deleteRows(bob, [6, 5, 4, 3, 2]);
      setCellContent(charlie, "C5", "hi");
      undo(charlie);
    });
    const result = redo(charlie);
    expect(result).not.toBeCancelledBecause(CommandResult.WaitingSessionConfirmation);
    expect(getCellContent(charlie, "C5")).not.toBe("hi");
    expect(getCellContent(charlie, "A1")).toBe("hi");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("can undo/redo command previous to dropped command", () => {
    setCellContent(charlie, "A1", "hello");
    network.concurrent(() => {
      deleteRows(bob, [6, 5, 4, 3, 2]);
      setCellContent(charlie, "C5", "hi");
    });
    undo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    redo(charlie);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedExportedData();
  });

  test("cannot redo command previous to dropped command", () => {
    setCellContent(charlie, "A1", "hello");
    undo(charlie);
    network.concurrent(() => {
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

  test("can repeat command concurrently with remote revisions", () => {
    setCellContent(alice, "A1", "hello there");
    setSelection(alice, ["A3"]);
    network.concurrent(() => {
      setCellContent(bob, "A3", "general kenobi");
      redo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "hello there");
  });
});
