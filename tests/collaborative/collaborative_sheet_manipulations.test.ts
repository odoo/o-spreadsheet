import { CellErrorType, CellIsRule, Model } from "../../src";
import { BACKGROUND_CHART_COLOR } from "../../src/constants";
import { lettersToNumber, numberToLetters, range, toZone } from "../../src/helpers";
import { BarChartDefinition } from "../../src/types/chart/bar_chart";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  activateSheet,
  addColumns,
  addDataValidation,
  addRows,
  colorSheet,
  createChart,
  createFigure,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  deleteSheet,
  freezeColumns,
  freezeRows,
  hideColumns,
  hideRows,
  merge,
  moveSheet,
  redo,
  renameSheet,
  selectCell,
  setCellContent,
  undo,
  unfreezeColumns,
  unfreezeRows,
  unhideColumns,
  unhideRows,
  updateChart,
} from "../test_helpers/commands_helpers";
import { getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { createEqualCF, getDataValidationRules, toRangesData } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";
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
      deleteSheet(bob, "42");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      [sheet1, "2"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("color and delete sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "42" });
    network.concurrent(() => {
      colorSheet(alice, "42", "#FF0000");
      deleteSheet(bob, "42");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      [sheet1]
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
      (user) => user.getters.getSheetIds(),
      [sheet1, "2", "3"]
    );
    expect(alice.getters.getSheetName("2")).not.toEqual(alice.getters.getSheetName("3"));
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Create two sheets concurrently with the same id", () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    network.concurrent(() => {
      createSheet(alice, { sheetId: "sheet2", name: "Sheet2" });
      createSheet(charlie, { sheetId: "sheet2", name: "Sheet2" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      ["Sheet1", "sheet2", "sheet2~"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds().map(user.getters.getSheetName),
      ["Sheet1", "Sheet2", "Sheet3"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("recreate a sheet with the same id from an undo", () => {
    const { network, alice, bob, charlie } = setupCollaborativeEnv();
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(alice, { sheetId: "sheet2" });
    deleteSheet(alice, firstSheetId);
    network.concurrent(() => {
      undo(alice); // Sheet1 is recreated
      createSheet(charlie, { sheetId: firstSheetId, name: "from Charlie" });
    });
    redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("concurrently create three numbered sheets with the same name", () => {
    network.concurrent(() => {
      createSheet(alice, { sheetId: "alice42", name: "Sheet2" });
      createSheet(bob, { sheetId: "bob42", name: "Sheet2" });
      createSheet(charlie, { sheetId: "charlie42", name: "Sheet2" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds().map(user.getters.getSheetName),
      ["Sheet1", "Sheet2", "Sheet3", "Sheet4"]
    );
  });

  test("concurrently create three sheets with the same name", () => {
    network.concurrent(() => {
      createSheet(alice, { sheetId: "alice42", name: "Sheet" });
      createSheet(bob, { sheetId: "bob42", name: "Sheet" });
      createSheet(charlie, { sheetId: "charlie42", name: "Sheet" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds().map(user.getters.getSheetName),
      ["Sheet1", "Sheet", "Sheet~", "Sheet~~"]
    );
  });

  test("create sheet and move sheet concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "42", activate: true });
    network.concurrent(() => {
      createSheet(alice, { sheetId: "2", position: 1 });
      moveSheet(bob, 1, sheet1);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      ["2", sheet1, "42"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Move two sheets concurrently", () => {
    const sheet1 = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "1", activate: true, position: 1 });
    createSheet(bob, { sheetId: "2", activate: true, position: 2 });
    network.concurrent(() => {
      moveSheet(alice, 1, sheet1);
      moveSheet(bob, -1, "2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      ["1", "2", sheet1]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("delete sheet and update figure concurrently", () => {
    const sheetId = "42";
    createSheet(bob, { sheetId, activate: true });
    createFigure(bob, {
      sheetId,
      height: 100,
      width: 100,
      id: "456",
      offset: {
        x: 0,
        y: 0,
      },
      col: 0,
      row: 0,
    });
    network.concurrent(() => {
      deleteSheet(alice, sheetId);
      bob.dispatch("UPDATE_FIGURE", {
        figureId: "456",
        sheetId,
        col: 0,
        row: 0,
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure(sheetId, "456"),
      undefined
    );
  });

  test("delete sheet and update chart concurrently", () => {
    const sheetId = "42";
    const chartId = "24";
    createSheet(bob, { sheetId, activate: true });
    createChart(
      bob,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:A10" }],
        labelRange: "A1",
      },
      chartId,
      sheetId
    );
    network.concurrent(() => {
      deleteSheet(alice, sheetId);
      updateChart(
        bob,
        chartId,
        {
          dataSets: [{ dataRange: "A1:A11" }],
        },
        sheetId
      );
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getFigure(sheetId, chartId),
      undefined
    );
  });

  test("rename sheet and update cell with sheet ref concurrently", () => {
    const sheetId = alice.getters.getActiveSheetId();
    const sheetName = bob.getters.getSheet(sheetId).name;
    network.concurrent(() => {
      renameSheet(alice, sheetId, "NewName");
      setCellContent(bob, "A1", `=${sheetName}!A2`);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellText(user, "A1"),
      "=NewName!A2"
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

  test("selection is correctly updated with concurrent add rows", () => {
    network.concurrent(() => {
      addRows(alice, "before", 1, 1);
      addRows(bob, "after", 0, 1);
      selectCell(bob, "A2");
    });
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A2"));
  });

  test("remove the selected row and all following rows", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "A10");
    const nRows = bob.getters.getNumberRows(sheetId);
    deleteRows(alice, range(2, nRows));
    expect(bob.getters.getSelectedZones()).toEqual([toZone("A2")]);
  });

  test("remove the selected col when it is the last col", () => {
    const sheetId = alice.getters.getActiveSheetId();
    selectCell(bob, "F1");
    const nCols = bob.getters.getNumberCols(sheetId);
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

  test("Delete cells on columns deleted", () => {
    setCellContent(alice, "F1", "hello");
    network.concurrent(() => {
      deleteColumns(alice, ["D"]);
      deleteCells(bob, "C1:E1", "left");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello"
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
          ranges: toRangesData(sheetId, "A1:A3,C1:D3,F1:F3"),
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
          ranges: toRangesData(sheetId, "A1:A3,C1:D3,F1:G3"),
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
          ranges: toRangesData(sheetId, "A1:A3,A4:A10,A11:A12"),
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
          ranges: toRangesData(sheetId, "A1:A3,A4:A5,A11:A12"),
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

    test("Concurrent conditional format update and rename sheet", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const sheetName = bob.getters.getSheetName(sheetId);
      const newSheetName = "NewName";
      const cf = createEqualCF(`=${sheetName}!A1`, { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        renameSheet(alice, sheetId, newSheetName);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          ranges: toRangesData(sheetId, "A2"),
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...cf.rule,
              values: [`=${newSheetName}!A1`],
            } as CellIsRule,
          },
        ]
      );
      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...cf.rule,
              values: [`=${sheetName}!A1`],
            } as CellIsRule,
          },
        ]
      );
    });

    test("Concurrent conditional format update and delete sheet", () => {
      const sheetId = bob.getters.getActiveSheetId();
      const secondSheetId = "42";
      const secondSheetName = "SecondSheet";
      createSheet(alice, { sheetId: secondSheetId, name: secondSheetName, activate: true });
      const cf = createEqualCF(`=${secondSheetName}!A1`, { fillColor: "#FF0000" }, "1");
      network.concurrent(() => {
        deleteSheet(alice, secondSheetId);
        bob.dispatch("ADD_CONDITIONAL_FORMAT", {
          sheetId,
          cf,
          ranges: toRangesData(sheetId, "A2"),
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...cf.rule,
              values: [`=${CellErrorType.InvalidReference}`],
            } as CellIsRule,
          },
        ]
      );
      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...cf.rule,
              values: [`=${CellErrorType.InvalidReference}`],
            } as CellIsRule,
          },
        ]
      );
    });
  });

  describe("Chart creation & update", () => {
    const chartId = "42";
    const chartDef: BarChartDefinition = {
      dataSets: [{ dataRange: "A1:A3", yAxisId: "y" }, { dataRange: "F1:F3" }],
      labelRange: "F3",
      title: { text: "chart title" },
      dataSetsHaveTitle: false,
      type: "bar",
      stacked: false,
      background: BACKGROUND_CHART_COLOR,
      legendPosition: "top",
      aggregated: false,
    };

    test(`Concurrently chart creation & update and add columns`, () => {
      network.concurrent(() => {
        addColumns(alice, "before", "D", 2);
        createChart(bob, chartDef, chartId);
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3", yAxisId: "y" }, { dataRange: "H1:H3" }],
          labelRange: "H3",
        }
      );
      network.concurrent(() => {
        addColumns(alice, "before", "D", 2);
        updateChart(bob, chartId, {
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "F1:F3" }],
          labelRange: "F3",
          dataSetsHaveTitle: false,
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "H1:H3" }],
          labelRange: "H3",
        }
      );
    });

    test(`Concurrently chart creation & update and removed columns`, () => {
      network.concurrent(() => {
        deleteColumns(alice, ["C", "F"]);
        createChart(
          bob,
          {
            ...chartDef,
            dataSets: [{ dataRange: "A1:A3" }, { dataRange: "C1:C3" }, { dataRange: "F:G" }],
          },
          chartId
        );
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "E:E" }],
          labelRange: undefined,
        }
      );
      network.concurrent(() => {
        deleteColumns(alice, ["C", "F"]);
        updateChart(bob, chartId, {
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "C1:C3" }, { dataRange: "F1:G3" }],
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "E1:E3" }],
          labelRange: undefined,
        }
      );
    });

    test(`Concurrently chart creation & update and new rows`, () => {
      network.concurrent(() => {
        addRows(alice, "before", 9, 2);
        createChart(
          bob,
          {
            ...chartDef,
            dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A10" }, { dataRange: "A11:A12" }],
            labelRange: "F10",
          },
          chartId
        );
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A12" }, { dataRange: "A13:A14" }],
          labelRange: "F12",
        }
      );
      network.concurrent(() => {
        addRows(alice, "before", 9, 2);
        updateChart(bob, chartId, {
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A10" }, { dataRange: "A11:A12" }],
          labelRange: "F10",
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A12" }, { dataRange: "A13:A14" }],
          labelRange: "F12",
        }
      );
    });

    test("Set grid lines visibility is correctly shared", () => {
      createSheet(alice, { sheetId: "42" });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getGridLinesVisibility("42"),
        true
      );
      alice.dispatch("SET_GRID_LINES_VISIBILITY", { sheetId: "42", areGridLinesVisible: false });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getGridLinesVisibility("42"),
        false
      );
    });

    test("Set grid lines visibility with a sheet deletion", () => {
      createSheet(alice, { sheetId: "42" });
      network.concurrent(() => {
        deleteSheet(bob, "42");
        alice.dispatch("SET_GRID_LINES_VISIBILITY", { sheetId: "42", areGridLinesVisible: false });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.tryGetSheet("42"),
        undefined
      );
    });

    test(`Concurrently chart creation & update and removed rows`, () => {
      network.concurrent(() => {
        deleteRows(alice, [3, 4, 10]);
        createChart(
          bob,
          {
            ...chartDef,
            dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A5" }, { dataRange: "A11:A12" }],
            labelRange: "F10",
          },
          chartId
        );
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A9" }],
          labelRange: "F8",
        }
      );
      network.concurrent(() => {
        deleteRows(alice, [3, 4, 10]);
        updateChart(bob, chartId, {
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A4:A5" }, { dataRange: "A11:A12" }],
          labelRange: "10:10",
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3" }, { dataRange: "A9" }],
          labelRange: "8:8",
        }
      );
    });

    test("Rename a sheet and update a chart concurrently", () => {
      const sheetId = alice.getters.getActiveSheetId();
      const chartId = "42";
      const sheetName2 = "sheet2";
      const sheetId2 = "sh2";
      const newName = "NewName";
      createSheet(bob, { sheetId: sheetId2, name: sheetName2, activate: true });
      createChart(alice, chartDef, chartId, sheetId);
      network.concurrent(() => {
        renameSheet(alice, sheetId2, newName);
        updateChart(bob, chartId, {
          dataSets: [{ dataRange: `${sheetName2}!A1:A3` }],
          labelRange: `${sheetName2}!F3`,
        });
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: `${newName}!A1:A3` }],
          labelRange: `${newName}!F3`,
        }
      );
      undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: `${sheetName2}!A1:A3` }],
          labelRange: `${sheetName2}!F3`,
        }
      );
    });
  });

  test(`Concurrently Add a pane split and remove columns`, () => {
    network.concurrent(() => {
      deleteColumns(alice, ["G"]);
      freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 4,
        ySplit: 0,
      }
    );
    network.concurrent(() => {
      unfreezeColumns(bob);
    });
    network.concurrent(() => {
      deleteColumns(alice, ["C", "F"]);
      freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 3,
        ySplit: 0,
      }
    );
    network.concurrent(() => {
      deleteColumns(alice, ["A"]);
      unfreezeColumns(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and add columns`, () => {
    network.concurrent(() => {
      addColumns(alice, "after", "G", 5);
      freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 4,
        ySplit: 0,
      }
    );
    network.concurrent(() => {
      unfreezeColumns(bob);
    });
    network.concurrent(() => {
      addColumns(alice, "after", "C", 1);
      freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 5,
        ySplit: 0,
      }
    );
    network.concurrent(() => {
      addColumns(alice, "before", "A", 1);
      unfreezeColumns(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and remove rows`, () => {
    network.concurrent(() => {
      deleteRows(alice, [6]);
      freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 4,
      }
    );
    network.concurrent(() => {
      unfreezeRows(bob);
    });
    network.concurrent(() => {
      deleteRows(alice, [2, 5]);
      freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 3,
      }
    );
    network.concurrent(() => {
      deleteRows(alice, [0]);
      unfreezeRows(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and add rows`, () => {
    network.concurrent(() => {
      addRows(alice, "after", 6, 5);
      freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 4,
      }
    );
    network.concurrent(() => {
      unfreezeRows(bob);
    });
    network.concurrent(() => {
      addRows(alice, "after", 2, 1);
      freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 5,
      }
    );
    network.concurrent(() => {
      addRows(alice, "before", 0, 1);
      unfreezeRows(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test("merge does not prevent freeze in other sheet", () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    createSheet(bob, { sheetId: "sheet2", activate: true });
    merge(alice, "A1:A10");
    // Bob's active sheet is sheet2, Alice's is sheet1
    freezeRows(bob, 4, "sheet2");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions("sheet2"),
      {
        xSplit: 0,
        ySplit: 4,
      }
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(firstSheetId),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });
});

test("test undo redo", () => {
  const sheetId = "sid";
  const sheetName = "SheetName";
  const otherSheetId = "othersid";
  const otherSheetName = "OtherSheetName";

  const newSheetName = "NewSheetName";

  const { alice, bob, charlie } = setupCollaborativeEnv({
    sheets: [
      { id: sheetId, name: sheetName },
      { id: otherSheetId, name: otherSheetName },
    ],
  });

  setCellContent(alice, "E1", "25", otherSheetId);
  deleteColumns(alice, ["C"], otherSheetId);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getCell({ sheetId: otherSheetId, col: 3, row: 0 })?.content,
    "25"
  );

  setCellContent(bob, "A1", "=" + otherSheetName + "!D1", sheetId);
  renameSheet(bob, otherSheetId, newSheetName);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 })?.content,
    "=" + newSheetName + "!D1"
  );

  undo(alice);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 })?.content,
    "=" + newSheetName + "!E1"
  );

  redo(alice);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 })?.content,
    "=" + newSheetName + "!D1"
  );

  setCellContent(alice, "A4", "=" + newSheetName + "!D1", sheetId);
  undo(bob);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getCell({ sheetId: sheetId, col: 0, row: 3 })?.content,
    "=" + otherSheetName + "!D1"
  );
});

test("Concurrent datavalidation create and rename sheet", () => {
  const sheetId = "sid";
  const sheetName = "SheetName";

  const newSheetName = "NewSheetName";

  const { network, alice, bob, charlie } = setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });

  network.concurrent(() => {
    renameSheet(alice, sheetId, newSheetName);
    addDataValidation(bob, "B1", "id", { type: "textContains", values: [`=${sheetName}!A1`] });
  });

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => getDataValidationRules(user, sheetId),
    [
      {
        id: "id",
        criterion: { type: "textContains", values: [`=${newSheetName}!A1`] },
        ranges: ["B1"],
        isBlocking: false,
      },
    ]
  );
  undo(alice);
  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => getDataValidationRules(user, sheetId),
    [
      {
        id: "id",
        criterion: { type: "textContains", values: [`=${sheetName}!A1`] },
        ranges: ["B1"],
        isBlocking: false,
      },
    ]
  );
});

test("concurrent pivot computed measure and rename sheet", () => {
  const sheetId = "sid";
  const sheetName = "SheetName";
  const newSheetName = "NewSheetName";

  const { network, alice, bob, charlie } = setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });

  setCellContent(alice, "A1", "1", sheetId);
  setCellContent(alice, "B1", "2", sheetId);
  setCellContent(alice, "A2", "3", sheetId);
  setCellContent(alice, "B2", "4", sheetId);

  network.concurrent(() => {
    renameSheet(bob, sheetId, newSheetName);
    addPivot(
      alice,
      "A1:B2",
      {
        measures: [
          {
            id: "measure",
            fieldName: "mm",
            aggregator: "sum",
            computedBy: { formula: `=${sheetName}!A1*2`, sheetId },
          },
        ],
      },
      "pivot1"
    );
  });

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getPivotCoreDefinition("pivot1").measures,
    [
      {
        id: "measure",
        fieldName: "mm",
        aggregator: "sum",
        computedBy: { formula: `=${newSheetName}!A1*2`, sheetId },
      },
    ]
  );

  undo(bob);
  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getPivotCoreDefinition("pivot1").measures,
    [
      {
        id: "measure",
        fieldName: "mm",
        aggregator: "sum",
        computedBy: { formula: `=${sheetName}!A1*2`, sheetId },
      },
    ]
  );
});

test("concurrent pivot computed measure and delete sheet", () => {
  const sheetId = "sid";
  const sheetName = "SheetName";

  const secondSheetId = "42";
  const secondSheetName = "SecondSheet";
  const { network, alice, bob, charlie } = setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });
  createSheet(bob, { sheetId: secondSheetId, name: secondSheetName });

  setCellContent(alice, "A1", "1", sheetId);
  setCellContent(alice, "B1", "2", sheetId);
  setCellContent(alice, "A2", "3", sheetId);
  setCellContent(alice, "B2", "4", sheetId);

  network.concurrent(() => {
    deleteSheet(alice, secondSheetId);
    addPivot(
      bob,
      "A1:B2",
      {
        measures: [
          {
            id: "measure",
            fieldName: "mm",
            aggregator: "sum",
            computedBy: { formula: `=${secondSheetName}!A1*2`, sheetId: secondSheetId },
          },
        ],
      },
      "pivot1"
    );
  });

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getPivotCoreDefinition("pivot1").measures,
    [
      {
        id: "measure",
        fieldName: "mm",
        aggregator: "sum",
        computedBy: { formula: `=${CellErrorType.InvalidReference}*2`, sheetId: secondSheetId },
      },
    ]
  );

  undo(alice);
  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getPivotCoreDefinition("pivot1").measures,
    [
      {
        id: "measure",
        fieldName: "mm",
        aggregator: "sum",
        computedBy: { formula: `=${CellErrorType.InvalidReference}*2`, sheetId: secondSheetId },
      },
    ]
  );
});
