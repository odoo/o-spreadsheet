import { CoreCommand, Model, RemoteRevisionMessage } from "../../src";
import { CommandSquisher, SquishedCoreCommand } from "../../src/collaborative/command_squisher";
import { toZone } from "../../src/helpers/zones";
import { MockTransportService } from "../__mocks__/transport_service";
import { addRows, autofill, deleteRows, getCellContent, undo } from "../test_helpers";
import { setCellContent } from "../test_helpers/commands_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative session", () => {
  test("Update_cell on same value and contiguous cells", () => {
    const transport = new MockTransportService();
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Hello" } }] },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1", "A5");
    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          targetRange: "A2:A5",
          sheetId: "sheet1",
          content: "Hello",
          format: "",
          style: null,
          type: "SQUISHED_UPDATE_CELL",
        },
        {
          sheetId: "sheet1",
          target: [toZone("A2:A5")],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });

  test("receiving an SQUISHED_UPDATE_CELL message should unsquish", () => {
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Hello" } }] },
      { transportService: new MockTransportService(), client: { id: "alice", name: "Alice" } },
      [
        {
          clientId: "alice",
          commands: [
            {
              sheetId: "sheet1",
              target: [toZone("A2:A5")],
              type: "SET_BORDERS_ON_TARGET",
              border: undefined,
            },
            {
              targetRange: "A2:A5",
              sheetId: "sheet1",
              content: "Hello",
              format: "",
              style: null,
              type: "SQUISHED_UPDATE_CELL",
            },
          ],
          nextRevisionId: expect.any(String),
          serverRevisionId: "START_REVISION",
          type: "REMOTE_REVISION",
          version: 1,
        },
      ]
    );

    expect(getCellContent(model, "A1")).toBe("Hello");
    expect(getCellContent(model, "A2")).toBe("Hello");
    expect(getCellContent(model, "A3")).toBe("Hello");
    expect(getCellContent(model, "A4")).toBe("Hello");
    expect(getCellContent(model, "A5")).toBe("Hello");
  });
});

describe("commands", () => {
  test("squish should respect differences in format", () => {
    const commands: readonly CoreCommand[] = [
      {
        sheetId: "Sheet1",
        col: 0,
        row: 0,
        content: "Hello",
        format: "#,##0.00",
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 1,
        content: "Hello",
        format: "[$$]#,##0.00",
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 2,
        content: "Hello",
        format: "#,##0.00",
        type: "UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish should respect differences in style", () => {
    const commands: readonly CoreCommand[] = [
      {
        sheetId: "Sheet1",
        col: 0,
        row: 0,
        content: "Hello",
        style: { bold: true },
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 1,
        content: "Hello",
        style: { italic: true },
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 2,
        content: "Hello",
        style: { bold: true },
        type: "UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish consecutive formulas with the same normalized formula", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=SUM(B1)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=SUM(B2)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "=SUM(B3)", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=SUM(B1)", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { R: "+R1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish consecutive numbers", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish does not change the order of commands across a block of update_cell and should restart if a series of update_cell is interrupted by a different command", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("squish should only merge the commands of consecutive cells", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish string that looks like a formula should not compile or squish", () => {
    const commands: readonly CoreCommand[] = [
      // the content starts with '+' which looks like a formula but is actually a string
      { sheetId: "Sheet1", col: 0, row: 0, content: "+SUM(A1)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "+SUM(A2)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "+SUM(A3)", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish should restart on a different column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish should restart on a different column and sort by column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("squish should restart on a different column with formulas", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "=3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 0, content: "=4", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "=5", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 2, content: "=6", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("commands in incorrect order cannot be unsquish and generate an error", () => {
    const commands: readonly CoreCommand[] | (CoreCommand | SquishedCoreCommand)[] = [
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(() => new CommandSquisher(model.getters).unsquish(commands)).toThrow();
  });

  test("squish a block of update_cell sorts the commands by sheet", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 1, content: "5", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 2, content: "6", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet2",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("does not squish if any update cell position appear more than once in a block of update_cell", () => {
    const commandsThatCannotBeSquished: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, style: { bold: true }, type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commandsThatCannotBeSquished)).toStrictEqual(
      commandsThatCannotBeSquished
    );
    expect(new CommandSquisher(model.getters).unsquish(commandsThatCannotBeSquished)).toStrictEqual(
      commandsThatCannotBeSquished
    );
  });

  test("does not squish a single update_cell command", () => {
    const transport = new MockTransportService();
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: {} }] },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    setCellContent(model, "A1", "Hello", "sheet1");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 0,
          sheetId: "sheet1",
          content: "Hello",
          type: "UPDATE_CELL",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });
});

describe("Collaborative session - clientId preservation", () => {
  /**
   * This test verifies that the clientId in a REMOTE_REVISION message sent by a client
   * always matches the original sender, even after the revision is OT-transformed and
   * rebased.
   *
   * The scenario exercises the `revision.commands.length === 0` branch in
   * `sendPendingMessage`: when bob's autofill commands target rows that alice concurrently
   * removes (via undo), OT-transformation drops those commands (empty array), triggering a
   * rebase.  The resent message MUST still carry `clientId: "bob"` so that bob's own session
   * recognizes the server echo as its own revision and does not re-apply it, which would
   * corrupt the shared state.
   */
  test("clientId is preserved in resent REMOTE_REVISION after OT-transformation to empty commands", () => {
    const { network, alice, bob } = setupCollaborativeEnv({
      sheets: [{ id: "sheet1", cells: { A1: { content: "hello" } } }],
    });

    // Alice adds 4 rows sequentially — all clients now have 5 rows (rows 0–4).
    addRows(alice, "after", 0, 4);

    // Capture every message that hits the transport from this point onward.
    const spy = jest.spyOn(network, "sendMessage");

    // Concurrent block:
    //   - Alice's REVISION_UNDONE is sent first and accepted by the server.
    //     This removes the 4 added rows from the shared state.
    //   - Bob's REMOTE_REVISION (autofill A1→A5, targeting rows 1–4) is sent
    //     second and rejected by the server because the serverRevisionId no
    //     longer matches.
    //
    // After the block the mock broadcasts Alice's undo to all listeners.
    // Bob's session processes it, OT-transforms his pending autofill revision
    // (rows 1–4 no longer exist → commands become []), and then rebases and
    // resends the revision.
    network.concurrent(() => {
      undo(alice); // accepted first — undoes addRows, deletes rows 1–4
      autofill(bob, "A1", "A5"); // targets the now-deleted rows 1–4
    });

    // Every REMOTE_REVISION sent by bob must carry clientId: "bob".
    // If the clientId were wrong (e.g. "empty" from the internal buildEmpty
    // placeholder), bob's session would fail to recognize the server echo as
    // its own revision and would re-apply it, duplicating the changes.
    const bobRevisions = spy.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "REMOTE_REVISION" && msg.clientId === "bob");

    expect(bobRevisions.length).toBeGreaterThan(0);
    for (const msg of bobRevisions) {
      expect((msg as RemoteRevisionMessage).clientId).toBe("bob");
    }

    // Both clients must converge to the same exported state.
    expect([alice, bob]).toHaveSynchronizedExportedData();
  });

  test("clientId is preserved when a pending revision is resent after concurrent row deletion", () => {
    const { network, alice, bob } = setupCollaborativeEnv({
      sheets: [{ id: "sheet1", cells: { A1: { content: "1" }, A2: { content: "2" } } }],
    });

    const spy = jest.spyOn(network, "sendMessage");

    // Bob autofills concurrently while Alice deletes a row that overlaps with
    // Bob's autofill target.  Alice is accepted first, so Bob must resend his
    // revision after OT.  The resent message must still carry clientId: "bob".
    network.concurrent(() => {
      deleteRows(alice, [1]); // delete row 1 (A2); accepted first
      autofill(bob, "A1:A2", "A5"); // targets rows 2–4; gets OT-transformed
    });

    const bobRevisions = spy.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "REMOTE_REVISION" && msg.clientId === "bob");

    expect(bobRevisions.length).toBeGreaterThan(0);
    for (const msg of bobRevisions) {
      expect((msg as RemoteRevisionMessage).clientId).toBe("bob");
    }

    expect([alice, bob]).toHaveSynchronizedExportedData();
  });
});
