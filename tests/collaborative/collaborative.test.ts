import { Model, UIPlugin } from "../../src";
import { DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../../src/constants";
import { functionRegistry } from "../../src/functions";
import { getDefaultCellHeight, range, toZone } from "../../src/helpers";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { featurePluginRegistry } from "../../src/plugins";
import { Command, CommandResult, CoreCommand, DataValidationCriterion } from "../../src/types";
import { CollaborationMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  activateSheet,
  addDataValidation,
  addRows,
  changeCFPriority,
  clearCell,
  copy,
  createChart,
  createSheet,
  createTable,
  createTableStyle,
  deleteRows,
  deleteSheet,
  groupHeaders,
  hideRows,
  hideSheet,
  merge,
  paste,
  redo,
  setCellContent,
  setStyle,
  undo,
  ungroupHeaders,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getEvaluatedCell,
  getMerges,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  createEqualCF,
  getDataValidationRules,
  target,
  toRangesData,
} from "../test_helpers/helpers";
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
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "Hi Bob"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getMerges(user), {});
  });

  test("copy/paste style", () => {
    setCellContent(alice, "A1", "hello");
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      style: { fillColor: "#fefefe" },
    });
    copy(alice, "A1");
    paste(alice, "A2");
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
    copy(alice, "A1");
    paste(alice, "B2");
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
      { bottom: 2, left: 0, top: 0, right: 1 },
    ]);
    expect(bob.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1 },
    ]);
    expect(charlie.getters.getMerges(sheetId)).toMatchObject([
      { bottom: 2, left: 0, top: 0, right: 1 },
    ]);
    undo(bob);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "B3"), undefined);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCell(user, "C1"), undefined);
    expect(undo(bob)).toBeCancelledBecause(CommandResult.EmptyUndoStack);
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
      bob.dispatch("SET_ZONE_BORDERS", {
        sheetId,
        target: [toZone("B2:C3")],
        border: { position: "external" },
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getBorder(user, "B2"), null);
  });

  test("merge is transformed to fit sheet size", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      merge(alice, "A80:A100");
      deleteRows(bob, [98, 99]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getMerges(sheetId),
      [
        {
          ...toZone("A80:A98"),
          id: 1,
        },
      ]
    );
  });

  test("Command not allowed is not dispatched to others users", () => {
    const spy = jest.spyOn(network, "sendMessage");
    setCellContent(alice, "A1", "hello", "invalidSheetId");
    expect(spy).toHaveBeenCalledTimes(0);
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "");
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("UI remote commands are transformed with the pending ones.", () => {
    createSheet(charlie, {});
    network.concurrent(() => {
      setCellContent(bob, "A1", "coucou", "Sheet1");
      addRows(alice, "after", 14, 1);
      deleteSheet(bob, "Sheet1");
    });
  });

  test("duplicate sheet does not activate sheet", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    alice.dispatch("DUPLICATE_SHEET", {
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

  test("cannot delete all sheets concurrently", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "sheet2" });
    network.concurrent(() => {
      deleteSheet(alice, firstSheetId);
      deleteSheet(bob, "sheet2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheetIds(),
      ["sheet2"]
    );
  });

  test("hide all sheets concurrently", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(charlie, { sheetId: "sheet2" });
    network.concurrent(() => {
      hideSheet(alice, firstSheetId);
      hideSheet(bob, "sheet2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheetIds(),
      ["sheet2"]
    );
  });

  test("hide all columns concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    const nRows = alice.getters.getNumberRows(sheetId);
    network.concurrent(() => {
      hideRows(alice, range(0, 10));
      hideRows(bob, range(10, nRows));
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [range(0, 10)]
    );
  });

  test("Do not resend pending revisions with a non-core command", () => {
    network.concurrent(() => {
      setCellContent(alice, "A1", "hello");
      const spy = jest.spyOn(network, "sendMessage");
      alice.dispatch("COPY");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  test("duplicated chart are the same", () => {
    createChart(
      alice,
      {
        dataSets: [
          {
            dataRange: "A8:D8",
          },
          {
            dataRange: "A9:D9",
          },
        ],
        labelRange: "B7:D7",
        type: "line",
      },
      "1"
    );
    alice.dispatch("DUPLICATE_SHEET", {
      sheetId: alice.getters.getActiveSheetId(),
      sheetIdTo: "Sheet2",
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
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

  test("Do not handle duplicated message", () => {
    const serverRevisionId = alice["session"]["serverRevisionId"];
    const length = alice.getters.getNumberCols(alice.getters.getActiveSheetId());
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
    expect(david.getters.getNumberCols(david.getters.getActiveSheetId())).toBe(length + 50);
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
      expect(getEvaluatedCell(alice, "A1").value).toBe(5);
      expect(getEvaluatedCell(bob, "A1").value).toBe(5);
    });
    test("Cell value is correctly re-evaluated after undo", () => {
      setCellContent(alice, "A1", "=5");
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getEvaluatedCell(user, "A1").value,
        5
      );
      setCellContent(alice, "A1", "=10");
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getEvaluatedCell(user, "A1").value,
        10
      );
      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => getEvaluatedCell(user, "A1").value,
        5
      );
    });

    test("async computation resolving when in other sheet", () => {
      let value: string | number = "LOADING...";
      functionRegistry.add("GET.ASYNC.VALUE", {
        description: "Get value",
        compute: () => value,
        args: [],
      });
      const firstSheetId = alice.getters.getActiveSheetId();
      createSheet(alice, { sheetId: "sheet2" });
      activateSheet(bob, "sheet2");

      // the cell is evaluated once, with the pending value
      setCellContent(alice, "A1", "=GET.ASYNC.VALUE()", "sheet2");
      expect(getEvaluatedCell(bob, "A1", "sheet2").value).toBe("LOADING...");
      activateSheet(bob, firstSheetId);
      // the value resolves while Bob is on another sheet
      // the active sheet is re-evaluated
      value = 2;
      bob.dispatch("EVALUATE_CELLS", { sheetId: bob.getters.getActiveSheetId() });

      activateSheet(bob, "sheet2");
      expect(getEvaluatedCell(bob, "A1", "sheet2").value).toBe(2);
      functionRegistry.remove("GET.ASYNC.VALUE");
    });

    test("reference to async computation resolving when in other sheet", () => {
      let value: string | number = "LOADING...";
      functionRegistry.add("GET.ASYNC.VALUE", {
        description: "Get value",
        compute: () => value,
        args: [],
      });
      const firstSheetId = alice.getters.getActiveSheetId();
      createSheet(alice, { sheetId: "sheet2" });
      setCellContent(alice, "A1", "=Sheet2!A1", firstSheetId);
      activateSheet(bob, "sheet2");

      // the cell is evaluated once, with the pending value
      setCellContent(alice, "A1", "=GET.ASYNC.VALUE()", "sheet2");

      activateSheet(bob, firstSheetId);
      // the value resolves while Bob is on another sheet,
      // the active sheet is re-evaluated
      value = 2;
      bob.dispatch("EVALUATE_CELLS", { sheetId: bob.getters.getActiveSheetId() });

      expect(getEvaluatedCell(bob, "A1", firstSheetId).value).toBe(2);
      expect(getEvaluatedCell(bob, "A1", "sheet2").value).toBe(2);
      functionRegistry.remove("GET.ASYNC.VALUE");
    });
  });

  test("Reorder formatting rules concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    setCellContent(alice, "A1", "1");
    alice.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    alice.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    alice.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#00FF00" }, "3"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    network.concurrent(() => {
      changeCFPriority(bob, "3", 1, sheetId);
      changeCFPriority(alice, "3", 1, sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue((user) => getStyle(user, "A1"), {
      fillColor: "#00FF00",
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConditionalFormats(sheetId)[0].id,
      "3"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConditionalFormats(sheetId)[1].id,
      "1"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getConditionalFormats(sheetId)[2].id,
      "2"
    );
  });

  test("Reorder and delete formatting rules concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    setCellContent(alice, "A1", "1");
    alice.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    alice.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#0000FF" }, "2"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    network.concurrent(() => {
      changeCFPriority(bob, "2", -1, sheetId);
      alice.dispatch("REMOVE_CONDITIONAL_FORMAT", {
        id: "2",
        sheetId: sheetId,
      });
    });
    expect([alice, bob]).toHaveSynchronizedValue((user) => getStyle(user, "A1"), {
      fillColor: "#FF0000",
    });
  });

  test("Create overlapping tables concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      createTable(alice, "A1:B4");
      createTable(bob, "B1:C4");
    });

    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getTables(sheetId).length,
      1
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getTables(sheetId).map((table) => table.range.zone),
      alice.getters.getTables(sheetId).map((table) => table.range.zone)
    );
  });

  test("Create overlapping tables then merges concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      createTable(alice, "A1:B4");
      merge(bob, "B1:C4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getTables(sheetId).length,
      1
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getMerges(sheetId),
      []
    );
  });

  test("Create overlapping merges then tables concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      merge(bob, "B1:C4");
      createTable(alice, "A1:B4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getMerges(sheetId).length,
      0
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getTables(sheetId).length,
      1
    );
  });

  test("duplicate sheet and create tables concurrently", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("DUPLICATE_SHEET", {
        sheetId: "Sheet1",
        sheetIdTo: "sheet2",
      });
      createTable(charlie, "A1:B4", undefined, undefined, firstSheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getTables("sheet2"),
      []
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFilterHiddenValues({ sheetId: "sheet2", col: 0, row: 0 }),
      []
    );
  });

  test("row size for a duplicated sheet and the original sheet deleted", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      setStyle(bob, "A1", { fontSize: 36 });
      setCellContent(bob, "A1", "text");
      charlie.dispatch("DUPLICATE_SHEET", {
        sheetId: firstSheetId,
        sheetIdTo: "sheet2",
      });
      charlie.dispatch("DELETE_SHEET", { sheetId: firstSheetId });
    });
    const colSize = alice.getters.getColSize("sheet2", 0);
    const ctx = document.createElement("canvas").getContext("2d")!;
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getRowSize("sheet2", 0),
      getDefaultCellHeight(ctx, getCell(alice, "A1"), colSize)
    );
  });

  test.each(["COL", "ROW"] as const)("Can group headers concurrently", (dimension) => {
    const sheetId = alice.getters.getActiveSheetId();

    network.concurrent(() => {
      groupHeaders(bob, dimension, 0, 1);
      groupHeaders(alice, dimension, 2, 4); // Should merge with first group since they are contiguous
      groupHeaders(charlie, dimension, 3, 6); // Intersects with merged group => group starts should be swapped
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHeaderGroups(sheetId, dimension).sort((a, b) => a.start - b.start),
      [
        { start: 0, end: 6 },
        { start: 3, end: 4 },
      ]
    );
  });

  test.each(["COL", "ROW"] as const)("Can ungroup headers concurrently", (dimension) => {
    const sheetId = alice.getters.getActiveSheetId();
    groupHeaders(alice, dimension, 0, 1);
    groupHeaders(alice, dimension, 0, 5);

    network.concurrent(() => {
      // First ungroup should remove header from group [0, 1], second ungroup from group [0, 5]
      ungroupHeaders(bob, dimension, 0, 0);
      ungroupHeaders(alice, dimension, 0, 0);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHeaderGroups(sheetId, dimension),
      [
        { start: 1, end: 5 },
        { start: 1, end: 1 },
      ]
    );
  });

  test("Overlapping data validation rules created concurrently", () => {
    const criterion: DataValidationCriterion = { type: "textContains", values: ["1"] };
    network.concurrent(() => {
      addDataValidation(alice, "A1:A5", "id", criterion);
      addDataValidation(bob, "A3:A7", "id2", criterion);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getDataValidationRules(user),
      [
        { id: "id", ranges: ["A1:A2"], criterion, isBlocking: false },
        { id: "id2", ranges: ["A3:A7"], criterion, isBlocking: false },
      ]
    );
  });

  describe("Table style", () => {
    test("Create a table with a style, and delete the style at the same time", () => {
      createTableStyle(alice, "MyStyle");
      network.concurrent(() => {
        alice.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
        createTable(bob, "A1:B4", { styleId: "MyStyle" });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        DEFAULT_TABLE_CONFIG.styleId
      );
    });

    test("Update a table with a style, and delete the style at the same time", () => {
      createTableStyle(alice, "MyStyle");
      createTable(alice, "A1:B4");
      network.concurrent(() => {
        alice.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
        updateTableConfig(bob, "A1:B4", { styleId: "MyStyle" });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        DEFAULT_TABLE_CONFIG.styleId
      );
    });

    test("Undo create table style with another user that created a table with this style", () => {
      createTableStyle(alice, "MyStyle");
      createTable(bob, "A1:B4", { styleId: "MyStyle" });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        "MyStyle"
      );

      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        DEFAULT_TABLE_CONFIG.styleId
      );

      redo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        "MyStyle"
      );
    });

    test("Undo delete table style have synchronized values", () => {
      createTableStyle(alice, "MyStyle");
      network.concurrent(() => {
        alice.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
        createTable(bob, "A1:B4", { styleId: "MyStyle" });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        DEFAULT_TABLE_CONFIG.styleId
      );

      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getTables(user.getters.getActiveSheetId())[0].config.styleId,
        DEFAULT_TABLE_CONFIG.styleId
      );
    });
  });
});

test("UI plugins cannot refuse core command and de-synchronize the users", () => {
  class MyUIPlugin extends UIPlugin {
    allowDispatch(cmd: Command) {
      if (cmd.type === "UPDATE_CELL") {
        return this.getters.getClient().name === "Alice"
          ? CommandResult.Success
          : CommandResult.CancelledForUnknownReason;
      }
      return CommandResult.Success;
    }
  }
  featurePluginRegistry.add("myUIPlugin", MyUIPlugin);
  const { alice, bob } = setupCollaborativeEnv();

  setCellContent(alice, "A1", "hello");
  expect([alice, bob]).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
  featurePluginRegistry.remove("myUIPlugin");
});
