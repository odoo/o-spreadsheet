import { Model } from "../../src";
import { getCell } from "../getters_helpers";
import { addColumns, addRows, createSheet, selectCell } from "../commands_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import "../canvas.mock";
import { toZone } from "../../src/helpers";

describe("Collaborative Sheet manipulation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charly: Model;

  beforeEach(() => {
    ({ network, alice, bob, charly } = setupCollaborativeEnv());
  });

  test("create and delete sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2" });
      bob.dispatch("DELETE_SHEET", { sheetId: "42" });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      [sheet1, "2"]
    );
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("Create two sheets concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2" });
      createSheet(bob, { sheetId: "3" });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      [sheet1, "3", "2"]
    );
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("create sheet and move sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "42", activate: true });
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2", position: 1 });
      bob.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "right" });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      ["2", sheet1, "42"]
    );
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("Move two sheets concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "1", activate: true, position: 1 });
    createSheet(bob, { sheetId: "2", activate: true, position: 2 });
    network.concurrent(() => {
      alice.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "right" });
      bob.dispatch("MOVE_SHEET", { sheetId: "2", direction: "left" });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getVisibleSheets(),
      ["1", "2", sheet1]
    );
    expect([alice, bob, charly]).toHaveSynchronizedExportedData();
  });

  test("delete sheet and udpate figure concurrently", () => {
    createSheet(bob, { sheetId: "1", activate: true });
    bob.dispatch("CREATE_FIGURE", {
      sheetId: "1",
      figure: {
        data: "hello",
        height: 100,
        width: 100,
        id: "456",
        tag: "test",
        x: 0,
        y: 0,
      },
    });
    network.concurrent(() => {
      alice.dispatch("DELETE_SHEET", { sheetId: "1" });
      bob.dispatch("UPDATE_FIGURE", {
        id: "456",
        data: "coucou",
      });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure<string>("456"),
      undefined
    );
  });

  test("delete sheet and udpate chart concurrently", () => {
    createSheet(bob, { sheetId: "1", activate: true });
    bob.dispatch("CREATE_CHART", {
      sheetId: "1",
      id: "456",
      definition: {
        dataSets: ["A1:A10"],
        labelRange: "B1:B10",
        seriesHasTitle: false,
        title: "test chart",
        type: "bar",
      },
    });
    network.concurrent(() => {
      alice.dispatch("DELETE_SHEET", { sheetId: "1" });
      bob.dispatch("UPDATE_CHART", {
        id: "456",
        definition: {
          dataSets: ["A1:A11"],
          labelRange: "B1:B11",
          seriesHasTitle: false,
          title: "test chart",
          type: "bar",
        },
      });
    });
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure<string>("456"),
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
    expect([alice, bob, charly]).toHaveSynchronizedValue(
      (user) => getCell(user, "A1")!.error,
      `Invalid sheet name: ${sheetName}`
    );
  });

  test("adding columns after adapts selection", () => {
    selectCell(alice, "B1");
    selectCell(bob, "A1");
    selectCell(charly, "F1");
    addColumns(alice, "after", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charly.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("adding columns before adapts selection", () => {
    selectCell(alice, "B1");
    selectCell(bob, "A1");
    selectCell(charly, "F1");
    addColumns(alice, "before", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charly.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("D1"));
  });

  test("adding rows after adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charly, "A10");
    addRows(alice, "after", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charly.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
  });

  test("adding rows before adapts selection", () => {
    selectCell(alice, "A3");
    selectCell(bob, "A1");
    selectCell(charly, "A10");
    addRows(alice, "before", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charly.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  // test("removing rows adapts selection", () => {
  //   selectCell(alice, "A3");
  //   selectCell(bob, "A1");
  //   selectCell(charly, "A10");
  //   alice.dispatch("REMOVE_ROWS", {
  //     sheetId: alice.getters.getActiveSheetId(),
  //     rows: [1]
  //   })
  //   expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
  //   expect(charly.getters.getSelectedZone()).toEqual(toZone("A12"));
  //   expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
  // });

  // test("removing columns adapts selection", () => {
  //   selectCell(alice, "A3");
  //   selectCell(bob, "A1");
  //   selectCell(charly, "A10");
  //   addRows(alice, "before", 2, 2);
  //   expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
  //   expect(charly.getters.getSelectedZone()).toEqual(toZone("A12"));
  //   expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  // });
});
