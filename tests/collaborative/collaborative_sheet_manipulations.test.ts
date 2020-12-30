import { Model } from "../../src";
import { lettersToNumber, numberToLetters, range, toZone } from "../../src/helpers";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  hideColumns,
  hideRows,
  selectCell,
  setCellContent,
  unhideColumns,
  unhideRows,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { createEqualCF } from "../test_helpers/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

function toNumbers(letters: string[][]): number[][] {
  return letters.map((el) => el.map(lettersToNumber));
}
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
      setCellContent(bob, "A1", `=${sheetName}!A2`);
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

  test("remove the selected row and all following rows", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "A10");
    const nRows = bob.getters.getSheet(sheetId).rows.length;
    deleteRows(alice, range(2, nRows));
    expect(bob.getters.getSelectedZones()).toEqual([toZone("A2")]);
  });

  test("remove the selected col when it is the last col", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "F1");
    const nCols = bob.getters.getSheet(sheetId).cols.length;
    deleteColumns(alice, range(2, nCols).map(numberToLetters));
    expect(bob.getters.getSelectedZones()).toEqual([toZone("B1")]);
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
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B3"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("B1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("B10"));
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
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B2"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("C2"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("D2"));
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

  test("Adding/removing columns/rows does not update the selection of clients on another sheet", () => {
    selectCell(bob, "D4");
    createSheet(alice, { sheetId: "42", activate: true });
    activateSheet(charlie, "42");
    selectCell(charlie, "D4");
    /** Columns */
    addColumns(alice, "before", "A", 5);
    deleteColumns(alice, ["A"]);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("D4"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H4"));
    /** Rows */
    addRows(alice, "before", 0, 5);
    deleteRows(alice, [0]);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("D4"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H8"));
  });

  test("Hide and add columns concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      addColumns(alice, "before", "A", 10, sheetId);
      hideColumns(bob, ["C"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["M"]])
    );
  });

  test("Hide and remove rows concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      deleteRows(alice, [2], sheetId);
      hideRows(bob, [4], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[3]]
    );
  });

  test("Hide and add rows concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      addRows(alice, "after", 5, 10, sheetId);
      hideRows(bob, [2], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[2]]
    );
  });

  test("Unhide and add rows concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    hideRows(alice, [2], sheetId);
    network.concurrent(() => {
      addRows(alice, "before", 0, 10, sheetId);
      unhideRows(bob, [2], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      []
    );
  });

  test("Unhide and remove columns concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    hideColumns(alice, ["F", "H"], sheetId);
    network.concurrent(() => {
      deleteColumns(alice, ["F"], sheetId);
      unhideColumns(bob, ["F"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["G"]])
    );
  });

  test("Unhide and add columns concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    hideColumns(alice, ["C", "D"], sheetId);
    network.concurrent(() => {
      addColumns(alice, "after", "F", 10, sheetId);
      unhideColumns(bob, ["C"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["D"]])
    );
  });

  test("Hide different rows concurrent", () => {
    const sheetId = alice.getters.getActiveSheetId();
    network.concurrent(() => {
      hideRows(alice, [1], sheetId);
      expect(alice.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
      hideRows(bob, [2, 3], sheetId);
      expect(bob.getters.getHiddenRowsGroups(sheetId)).toEqual([[2, 3]]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[1, 2, 3]]
    );
  });

  test("Unhide different rows concurrent", () => {
    const sheetId = alice.getters.getActiveSheetId();
    hideRows(alice, [5, 6, 8], sheetId);
    network.concurrent(() => {
      unhideRows(alice, [5], sheetId);
      expect(alice.getters.getHiddenRowsGroups(sheetId)).toEqual([[6], [8]]);
      unhideRows(bob, [6], sheetId);
      expect(bob.getters.getHiddenRowsGroups(sheetId)).toEqual([[5], [8]]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[8]]
    );
  });

  test("Hide and unhide columns concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    hideColumns(alice, ["C"], sheetId);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      [[2]]
    );
    network.concurrent(() => {
      hideColumns(alice, ["B", "C", "D"], sheetId);
      unhideColumns(bob, ["C"]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["B"], ["D"]])
    );
  });

  describe("conditional formatting", () => {
    test("Concurrent new conditional format and new columns", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const cf = createEqualCF("1", { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        addColumns(alice, "before", "D", 2);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          target: [toZone("A1:A3"), toZone("C1:D3"), toZone("F1:F3")],
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "C1:F3", "H1:H3"],
            rule: cf.rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and removed columns", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const cf = createEqualCF("1", { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        deleteColumns(alice, ["C", "D", "F"]);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          target: [toZone("A1:A3"), toZone("C1:D3"), toZone("F1:G3")],
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "D1:D3"],
            rule: cf.rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and new rows", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const cf = createEqualCF("1", { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        addRows(alice, "before", 9, 2);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          target: [toZone("A1:A3"), toZone("A4:A10"), toZone("A11:A12")],
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "A4:A12", "A13:A14"],
            rule: cf.rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and removed rows", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const cf = createEqualCF("1", { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        deleteRows(alice, [3, 4, 10]);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          target: [toZone("A1:A3"), toZone("A4:A5"), toZone("A11:A12")],
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "A9"],
            rule: cf.rule,
          },
        ]
      );
    });
  });

  describe.each(["CREATE_CHART", "UPDATE_CHART"])(
    "chart creation & update",
    (chartCommand: "CREATE_CHART" | "UPDATE_CHART") => {
      test(`Concurrently ${chartCommand} and add columns`, () => {
        const sheetId = alice.getters.getActiveSheetId();
        network.concurrent(() => {
          addColumns(alice, "before", "D", 2);
          bob.dispatch(chartCommand, {
            sheetId,
            id: "42",
            definition: {
              dataSets: ["A1:A3", "F1:F3"],
              labelRange: "F3",
              title: "chart title",
              dataSetsHaveTitle: false,
              type: "bar",
            },
          });
        });
        expect([alice, bob, charlie]).toHaveSynchronizedValue(
          (user) => user.getters.getChartDefinitionUI(sheetId, "42"),
          {
            dataSets: ["A1:A3", "H1:H3"],
            labelRange: "H3",
            title: "chart title",
            dataSetsHaveTitle: false,
            type: "bar",
          }
        );
      });

      test(`Concurrently ${chartCommand} and removed columns`, () => {
        const sheetId = alice.getters.getActiveSheetId();
        network.concurrent(() => {
          deleteColumns(alice, ["C", "F"]);
          bob.dispatch(chartCommand, {
            sheetId,
            id: "42",
            definition: {
              dataSets: ["A1:A3", "C1:C3", "F1:G3"],
              labelRange: "F3",
              title: "chart title",
              dataSetsHaveTitle: false,
              type: "bar",
            },
          });
        });
        expect([alice, bob, charlie]).toHaveSynchronizedValue(
          (user) => user.getters.getChartDefinitionUI(sheetId, "42"),
          {
            dataSets: ["A1:A3", "E1:E3"],
            labelRange: undefined,
            title: "chart title",
            dataSetsHaveTitle: false,
            type: "bar",
          }
        );
      });

      test(`Concurrently ${chartCommand} and new rows`, () => {
        const sheetId = alice.getters.getActiveSheetId();
        network.concurrent(() => {
          addRows(alice, "before", 9, 2);
          bob.dispatch(chartCommand, {
            sheetId,
            id: "42",
            definition: {
              dataSets: ["A1:A3", "A4:A10", "A11:A12"],
              labelRange: "F10",
              title: "chart title",
              dataSetsHaveTitle: false,
              type: "bar",
            },
          });
        });
        expect([alice, bob, charlie]).toHaveSynchronizedValue(
          (user) => user.getters.getChartDefinitionUI(sheetId, "42"),
          {
            dataSets: ["A1:A3", "A4:A12", "A13:A14"],
            labelRange: "F12",
            title: "chart title",
            dataSetsHaveTitle: false,
            type: "bar",
          }
        );
      });

      test(`Concurrently ${chartCommand} and removed rows`, () => {
        const sheetId = alice.getters.getActiveSheetId();
        network.concurrent(() => {
          deleteRows(alice, [3, 4, 10]);
          bob.dispatch(chartCommand, {
            sheetId,
            id: "42",
            definition: {
              dataSets: ["A1:A3", "A4:A5", "A11:A12"],
              labelRange: "F10",
              title: "chart title",
              dataSetsHaveTitle: false,
              type: "bar",
            },
          });
        });
        expect([alice, bob, charlie]).toHaveSynchronizedValue(
          (user) => user.getters.getChartDefinitionUI(sheetId, "42"),
          {
            dataSets: ["A1:A3", "A9"],
            labelRange: "F8",
            title: "chart title",
            dataSetsHaveTitle: false,
            type: "bar",
          }
        );
      });
    }
  );
});
