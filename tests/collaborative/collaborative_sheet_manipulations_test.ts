import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import {
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  selectCell,
} from "../commands_helpers";
import { getCell } from "../getters_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative Sheet manipulation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  test("create and delete sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2" });
      bob.dispatch("DELETE_SHEET", { sheetId: "42" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      [sheet1, "2"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Create two sheets concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2" });
      createSheet(bob, { sheetId: "3" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      [sheet1, "3", "2"]
    );
    expect(alice.getters.getSheetName("2")).not.toEqual(alice.getters.getSheetName("3"));
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("create sheet and move sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "42", activate: true });
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2", position: 1 });
      bob.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "right" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      ["2", sheet1, "42"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Move two sheets concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "1", activate: true, position: 1 });
    createSheet(bob, { sheetId: "2", activate: true, position: 2 });
    network.concurrent(() => {
      alice.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "right" });
      bob.dispatch("MOVE_SHEET", { sheetId: "2", direction: "left" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      ["1", "2", sheet1]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("delete sheet and update figure concurrently", () => {
    const sheetId = "42";
    createSheet(bob, { sheetId, activate: true });
    bob.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        height: 100,
        width: 100,
        id: "456",
        tag: "test",
        x: 0,
        y: 0,
      },
    });
    network.concurrent(() => {
      alice.dispatch("DELETE_SHEET", { sheetId });
      bob.dispatch("UPDATE_FIGURE", {
        id: "456",
        sheetId,
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure(sheetId, "456"),
      undefined
    );
  });

  test("delete sheet and update chart concurrently", () => {
    const sheetId = "42";
    createSheet(bob, { sheetId, activate: true });
    bob.dispatch("CREATE_CHART", {
      sheetId,
      id: "456",
      definition: {
        dataSets: ["A1:A10"],
        labelRange: "B1:B10",
        dataSetsHaveTitle: false,
        title: "test chart",
        type: "bar",
      },
    });
    network.concurrent(() => {
      alice.dispatch("DELETE_SHEET", { sheetId });
      bob.dispatch("UPDATE_CHART", {
        id: "456",
        sheetId,
        definition: {
          dataSets: ["A1:A11"],
          labelRange: "B1:B11",
          dataSetsHaveTitle: false,
          title: "test chart",
          type: "bar",
        },
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure(sheetId, "456"),
      undefined
    );
  });

  test("rename sheet and update cell with sheet ref concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    const sheetName = bob.getters.getSheet(sheetId).name;
    network.concurrent(() => {
      alice.dispatch("RENAME_SHEET", {
        sheetId,
        name: "NewName",
      });
      bob.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        content: `=${sheetName}!A2`,
        sheetId,
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A1")!.error,
      `Invalid sheet name: ${sheetName}`
    );
  });

  test("adding columns after adapts selection", () => {
    selectCell(alice, "B1");
    selectCell(bob, "A1");
    selectCell(charlie, "F1");
    addColumns(alice, "after", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("adding columns before adapts selection", () => {
    selectCell(alice, "B1");
    selectCell(bob, "A1");
    selectCell(charlie, "F1");
    addColumns(alice, "before", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("D1"));
  });

  test("adding rows after adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charlie, "A10");
    addRows(alice, "after", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
  });

  test("adding rows before adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charlie, "A10");
    addRows(alice, "before", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  test("removing rows adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charlie, "A10");
    deleteRows(alice, [1]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A2"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A9"));
  });

  test("adding rows adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charlie, "A10");
    addRows(alice, "before", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  test("removing the selected column", () => {
    selectCell(alice, "B3");
    selectCell(bob, "B1");
    selectCell(charlie, "B10");
    deleteColumns(alice, ["B"]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A10"));
  });

  test("removing the first column while selected", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charlie, "A10");
    deleteColumns(alice, ["A"]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A10"));
  });

  test("removing the selected row", () => {
    selectCell(alice, "B2");
    selectCell(bob, "C2");
    selectCell(charlie, "D2");
    deleteRows(alice, [1]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B1"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("C1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("D1"));
  });

  test("removing the first rows while selected", () => {
    selectCell(alice, "C1");
    selectCell(bob, "A1");
    selectCell(charlie, "K1");
    deleteRows(alice, [0]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("C1"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("K1"));
  });
});
