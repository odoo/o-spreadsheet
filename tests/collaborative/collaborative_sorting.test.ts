import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { Position } from "../../src/types";
import {
  addColumns,
  deleteColumns,
  merge,
  redo,
  setCellContent,
  undo,
  unMerge,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Multi users synchronisation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  let users: Model[];

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
    users = [alice, bob, charlie];
    /**
     * X  1
     * Z  3
     * Y  2
     */
    setCellContent(alice, "A1", "X");
    setCellContent(alice, "A2", "Z");
    setCellContent(alice, "A3", "Y");
    setCellContent(alice, "B1", "1");
    setCellContent(alice, "B2", "3");
    setCellContent(alice, "B3", "2");
  });

  test("simple sort is synced", () => {
    alice.dispatch("SORT_CELLS", {
      col: 0,
      row: 0,
      sheetId: alice.getters.getActiveSheetId(),
      sortDirection: "ascending",
      zone: toZone("A1:B3"),
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "2");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B3"), "3");
  });

  test.each([[{ col: 0, row: 0 }], [{ col: 1, row: 0 }]])(
    "concurrently sort and add a column in the zone with anchor %s",
    (anchor: Position) => {
      const sheetId = alice.getters.getActiveSheetId();
      network.concurrent(() => {
        addColumns(bob, "after", "A", 1);
        alice.dispatch("SORT_CELLS", {
          ...anchor,
          sheetId,
          sortDirection: "ascending",
          zone: toZone("A1:B3"),
        });
      });
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Y");
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "1");
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C2"), "2");
      expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C3"), "3");
      expect(users).toHaveSynchronizedValue(
        (user) => user.getters.isEmpty(sheetId, toZone("B1:B3")),
        true
      );
    }
  );

  test("sort and add a column in the zone, then undo/redo the sort", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("SORT_CELLS", {
      col: 1,
      row: 0,
      sheetId,
      sortDirection: "ascending",
      zone: toZone("A1:B3"),
    });
    addColumns(bob, "after", "A", 1);
    undo(alice);
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Z");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C2"), "3");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C3"), "2");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isEmpty(sheetId, toZone("B1:B3")),
      true
    );
    redo(alice);
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C2"), "2");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "C3"), "3");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isEmpty(sheetId, toZone("B1:B3")),
      true
    );
  });

  test("concurrently sort and remove the zone entirely", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("SORT_CELLS", {
        col: 0,
        row: 0,
        sheetId,
        sortDirection: "ascending",
        zone: toZone("A1:B3"),
      });
      deleteColumns(bob, ["A", "B"]);
    });
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isEmpty(sheetId, toZone("A1:B3")),
      true
    );
  });

  test("concurrently sort and merge cells in the zone", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      alice.dispatch("SORT_CELLS", {
        col: 0,
        row: 0,
        sheetId,
        sortDirection: "ascending",
        zone: toZone("A1:B3"),
      });
      merge(bob, "A1:A2");
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "2");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B3"), "3");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2")),
      true
    );
  });

  test("concurrently merge and sort cells in the zone", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      merge(bob, "A1:A2");
      alice.dispatch("SORT_CELLS", {
        col: 0,
        row: 0,
        sheetId,
        sortDirection: "ascending",
        zone: toZone("A1:B3"),
      });
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "2");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B3"), "3");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2")),
      false
    );
  });

  test("merge and sort cells in the zone, then undo/redo merge", () => {
    const sheetId = alice.getters.getActiveSheetId();
    merge(bob, "A1:A2");
    undo(bob);
    alice.dispatch("SORT_CELLS", {
      col: 0,
      row: 0,
      sheetId,
      sortDirection: "ascending",
      zone: toZone("A1:B3"),
    });
    redo(bob);
    // @implementation-limitation
    // Same strange behavior as Google Sheet
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "2");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B3"), "3");
    expect(users).toHaveSynchronizedValue((user) => user.getters.getMerges(sheetId), []);
    undo(alice);
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "X");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A2"), "");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B1"), "1");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B2"), "3");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "B3"), "2");
  });

  test("concurrently sort and remove a merge", () => {
    const sheetId = alice.getters.getActiveSheetId();
    merge(alice, "A1:A2");
    merge(alice, "A3:A4");
    setCellContent(alice, "A1", "Z");
    setCellContent(alice, "A3", "Y");
    network.concurrent(() => {
      alice.dispatch("SORT_CELLS", {
        col: 0,
        row: 0,
        sheetId,
        sortDirection: "ascending",
        zone: toZone("A1:A4"),
      });
      unMerge(bob, "A1:A2");
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2")),
      false
    );
  });

  test("concurrently remove a merge and sort", () => {
    const sheetId = alice.getters.getActiveSheetId();
    merge(alice, "A1:A2");
    merge(alice, "A3:A4");
    setCellContent(alice, "A1", "Z");
    setCellContent(alice, "A3", "Y");
    network.concurrent(() => {
      unMerge(bob, "A1:A2");
      alice.dispatch("SORT_CELLS", {
        col: 0,
        row: 0,
        sheetId,
        sortDirection: "ascending",
        zone: toZone("A1:A4"),
      });
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    // @implementation-limitation
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2")),
      true
    );
  });

  test("redo/undo sort when a merge has been removed", () => {
    const sheetId = alice.getters.getActiveSheetId();
    merge(alice, "A1:A2");
    merge(alice, "A3:A4");
    setCellContent(alice, "A1", "Z");
    setCellContent(alice, "A3", "Y");
    alice.dispatch("SORT_CELLS", {
      col: 0,
      row: 0,
      sheetId,
      sortDirection: "ascending",
      zone: toZone("A1:A4"),
    });
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    undo(alice);
    unMerge(bob, "A1:A2");
    redo(alice);
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Y");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Z");
    expect(users).toHaveSynchronizedValue(
      (user) => user.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2")),
      false
    );
    undo(alice);
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A1"), "Z");
    expect(users).toHaveSynchronizedValue((user) => getCellContent(user, "A3"), "Y");
  });
});
