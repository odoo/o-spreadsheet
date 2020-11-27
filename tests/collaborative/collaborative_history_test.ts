import { Model } from "../../src";
import { getCellContent, getCell } from "../getters_helpers";
import { setCellContent, undo, redo } from "../commands_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import "../canvas.mock";
import { CancelledReason, RevisionData } from "../../src/types";
import { CollaborativeSession } from "../../src/collaborative/collaborative_session";
import { DEFAULT_REVISION_ID } from "../../src/constants";

describe("Collaborative global history", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charly: Model;
  let all: Model[];

  beforeEach(() => {
    ({ network, alice, bob, charly } = setupCollaborativeEnv());
    all = [alice, bob, charly];
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

  test("Undo is global", () => {
    setCellContent(alice, "A1", "hello");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("Redo is global", () => {
    setCellContent(alice, "A1", "hello");
    undo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    redo(charly);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
  });

  test("Cannot redo when the last operation is not an undo", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    setCellContent(bob, "A2", "hello");
    expect(redo(alice)).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.EmptyRedoStack,
    });
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Undo two commands from differents users", () => {
    setCellContent(alice, "A1", "hello A1");
    setCellContent(bob, "A2", "hello A2");

    undo(alice);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello A1");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);

    redo(bob);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello A1");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "hello A2");

    undo(charly);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello A1");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);

    undo(charly);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);

    expect(undo(charly)).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.EmptyUndoStack,
    });
  });

  // @limitation
  test("Concurrent undo, undo last", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      setCellContent(bob, "B1", "hello");
      undo(alice);
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    expect(all).toHaveSynchronizedExportedData();
  });

  test("Concurrent undo, undo first", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
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

  // @limitation
  test("Concurrent undo, redo last", () => {
    setCellContent(alice, "A1", "hello");
    setCellContent(bob, "B1", "hello");
    setCellContent(bob, "C1", "hello");
    undo(bob);
    network.concurrent(() => {
      undo(alice);
      redo(bob);
    });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "C1"), undefined);
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
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "hello");
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
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
    expect(charly.exportData().revisionId).not.toBe(DEFAULT_REVISION_ID);
  });

  test("Load model with initial commands", () => {
    const initialCommands: RevisionData[] = [
      {
        clientId: "alice",
        id: "1",
        commands: [{ type: "UPDATE_CELL", col: 1, row: 0, sheetId: "sheet1", content: "hello" }],
      },
    ];
    const session = new CollaborativeSession(network, {
      id: "alice",
      name: "Alice",
    });
    const model = new Model(
      {
        revisionId: "initial_revision",
        sheets: [
          {
            id: "sheet1",
            name: "Sheet1",
            colNumber: 26,
            rowNumber: 100,
          },
        ],
      },
      {
        collaborativeSession: session,
      },
      initialCommands
    );
    expect(getCellContent(model, "B1")).toBe("hello");
    expect(model.exportData().revisionId).toBe("1");
  });

  test("Undo or redo block the next commands until it's accepted", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      undo(alice);
      expect(setCellContent(alice, "A2", "test")).toEqual({
        status: "CANCELLED",
        reason: CancelledReason.WaitingForNetwork,
      });
    });
    expect(all).toHaveSynchronizedValue((user) => getCell(user, "A2"), undefined);
    expect(setCellContent(alice, "A2", "test")).toEqual({ status: "SUCCESS" });
    expect(all).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "test");
  });
});
