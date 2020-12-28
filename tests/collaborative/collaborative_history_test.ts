import { Model } from "../../src";
import { getCellContent, getCell } from "../getters_helpers";
import { setCellContent, undo, redo, addColumns } from "../commands_helpers";
import { MockNetwork } from "../__mocks__/network";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import "../canvas.mock";

describe("Collaborative UNDO - REDO", () => {
  let network: MockNetwork;
  let alice: Model;
  let bob: Model;
  let charly: Model;

  beforeEach(() => {
    ({ network, alice, bob, charly } = setupCollaborativeEnv());
  });

  test("Undo is propagated to other clients", () => {
    setCellContent(alice, "A1", "hello");

    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );

    const spy = jest.spyOn(network, "sendMessage");
    undo(alice);
    expect(spy).toHaveBeenCalledTimes(2); // TODO handle client_moved correctly qsjfmqsjdf

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
  });

  test("Undo/redo is propagated to other clients", () => {
    setCellContent(alice, "A1", "hello");

    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );

    const spy = jest.spyOn(network, "sendMessage");
    undo(alice);
    expect(spy).toHaveBeenCalledTimes(2); // TODO handle client_moved correctly qsjfmqsjdf

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);

    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Undo/redo your own change only", () => {
    setCellContent(alice, "A1", "hello in A1");
    setCellContent(bob, "B2", "hello in B2");

    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello in A1"
    );
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "hello in B2"
    );
    undo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "hello in B2"
    );
    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello in A1"
    );
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "hello in B2"
    );
  });

  test("Undo two commands from differents users, Alice first", () => {
    /**
     * START ....... A ....... B ....... Undo A ....... Undo B
     *
     * START .. A .. B .. C .. D .. E .. F .. G .. H .. I
     * UNDO G:
     *  Checkout F
     *  Cherry pick H // G-1
     *  Cherry pick I // G-1
     * START .. A .. B .. C .. D .. E .. F .. UNDOG
     *  UNDOG: commit de merge avec H' et I'
     *  [id: UNDOG]: G .. H .. I
     *
     *
     * START .. A .. B .. C .. D .. E .. F .. UNDOG .. M .. N
     *  REDOG:
     *  Checkout F
     *  rebase [id:UNDOG] G .. H .. I
     *  Cherry pick M // G
     *  Cherry pick N // G
     * START .. A .. B .. C .. D .. E .. F .. G .. H .. I .. M .. N
     *
     * -------------------------------------------------------------------------
     *
     *
     *
     * START .. A .. B .. C .. D
     * [Undo A] *************************:
     *  Checkout START
     *  UNDOA: B' C' D'
     *  [id: UNDOA]: A .. B .. C .. D
     * MASTER : START
     * START: 0 .. A .. B
     *        0 .. UNDOA ..
     *
     * [Update cell E] ******************:
     * START .. UNDOA .. E
     *
     * [Undo C] *************************:
     *  Checkout START:
     *  - In UNDOA:
     *    Checkout C'
     *    UNDOC: D''
     *    [id: UNDOC]: C' D'
     *    UNDOA: B' UNDOC
     *  - Cherry pick E // C-1
     *  START .. UNDOA ........... E'
     *             |          |
     *             --> B' D'' |
     *
     * [REDO A] *************************:
     *  Checkout START:
     *  Cherry-pick A
     *  ( START .. A .. Rebase en cours)
     *  UNDOA: (foreach(commit => commit // A))
     *  E': (foreach(commit => commit // A))
     *
     * START .. A .. UNDOC' .......... E''
     *                 |            |
     *                 --> B'' D''' |
     *
     *
     *
     * Undo A:
     *  Revert juste avant A (A et B)
     *  Marqué A comme cancelled
     *  Apply B ot// inverseA
     *  Ajouter Undo A sur la stack
     * START ........ A (cancelled) ....... B ....... Undo A  (B')
     *
     * Undo B':
     *  Revert juste avant B':
     *  Marqué B' comme cancelled
     *  Apply Undo A:
     *    Revert juste avant A'
     *
     */
    addColumns(alice, "before", "B", 1);
    addColumns(bob, "after", "A", 1);
    setCellContent(charly, "D1", "hello in D1");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "D1"),
      "hello in D1"
    );
    undo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello in D1"
    );
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello in D1"
    );
  });

  test("Undo two commands from differents users, Bob first", () => {
    addColumns(alice, "before", "B", 1);
    addColumns(bob, "after", "A", 1);
    setCellContent(charly, "D1", "hello in D1");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "D1"),
      "hello in D1"
    );
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello in D1"
    );
    undo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello in D1"
    );
  });

  test("pending undo is correctly re-applied", () => {
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      setCellContent(bob, "B2", "B2");
      undo(alice);
      expect(getCell(alice, "A1")).toBe(undefined);
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B2"),
      "B2"
    );
  });

  test("Undo with pending which requires a transformation", () => {
    addColumns(alice, "before", "A", 1);
    network.concurrent(() => {
      undo(alice);
      setCellContent(bob, "B1", "hello");
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
  });

  test("concurrent Redo", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    network.concurrent(() => {
      setCellContent(bob, "B2", "B2");
      redo(alice);
      expect(getCellContent(alice, "A1")).toBe("hello");
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Redo with concurrent command", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    network.concurrent(() => {
      redo(alice);
      setCellContent(bob, "B2", "B2");
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Redo which requires a transformation", () => {
    setCellContent(alice, "A1", "hello");
    undo(alice);
    addColumns(bob, "before", "A", 1);
    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello"
    );
  });

  test("Undo a concurrent command which requires a transformation", () => {
    setCellContent(alice, "A1", "salut");
    setCellContent(alice, "A1", "hello");
    network.concurrent(() => {
      addColumns(bob, "before", "A", 1);
      undo(alice);
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "A1"), undefined);

    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "salut"
    );
  });

  test("Undo during a pending phase", () => {
    network.concurrent(() => {
      setCellContent(bob, "A1", "hello");
      setCellContent(alice, "A1", "salut");
      undo(alice);
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Undo and redo concurrently", () => {
    network.concurrent(() => {
      setCellContent(bob, "A1", "hello");
      setCellContent(alice, "A1", "salut");
      undo(alice);
      redo(alice);
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "salut"
    );
  });

  test("Remove columns and undo/redo the change", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("REMOVE_COLUMNS", {
      sheetId,
      columns: [0, 1, 5],
    });
    setCellContent(bob, "A1", "hello");
    undo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello"
    );
    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Remove rows and undo/redo the change", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("REMOVE_ROWS", {
      sheetId,
      rows: [0, 1, 5],
    });
    setCellContent(bob, "A1", "hello");
    undo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A3"),
      "hello"
    );
    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1"),
      "hello"
    );
  });

  test("Undo a create sheet command", () => {
    const sheet1Id = alice.getters.getActiveSheetId();
    const sheetId = "42";
    alice.dispatch("CREATE_SHEET", { sheetId, position: 0 });
    setCellContent(bob, "A1", "Hello in A1", sheetId);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "A1", sheetId),
      "Hello in A1"
    );
    undo(alice);
    // expect(undo(bob)).toEqual({
    //   status: "CANCELLED",
    //   reason: CancelledReason.EmptyUndoStack,
    // });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      [sheet1Id]
    );
  });

  test("Invalid state detected 😱", () => {
    const sheetId = alice.getters.getActiveSheetId();
    setCellContent(bob, "F9", "hello");
    alice.dispatch("ADD_ROWS", {
      sheetId,
      position: "after",
      quantity: 1,
      row: 5,
    });
    undo(bob);
    // C'est normal que le state soit différent, dans le cas du Undo on a pas
    // encore revert jusqu'au state commun
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("undo twice, redo twice", () => {
    setCellContent(bob, "F9", "hello");
    setCellContent(bob, "F9", "hello world");
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "F9"),
      "hello"
    );
    undo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCellContent(user, "F9"), "");
    redo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "F9"),
      "hello"
    );
    redo(bob);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "F9"),
      "hello world"
    );
  });

  test("Undo a add column, and redo", () => {
    addColumns(alice, "after", "A", 1);
    setCellContent(bob, "B1", "hello");
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello"
    );
    undo(alice);

    expect([alice, bob, charly]).toHaveSynchronizedValue((user) => getCell(user, "B1"), undefined);
    redo(alice);
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "B1"),
      "hello"
    );
  });
});
