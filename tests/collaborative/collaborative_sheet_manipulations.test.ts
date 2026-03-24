import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { BarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import { CellIsRule, FormulaCell, LiteralCell, Model } from "../../src";
import { lettersToNumber, numberToLetters, range, toZone } from "../../src/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  activateSheet,
  addCfRule,
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
  setGridLinesVisibility,
  undo,
  unfreezeColumns,
  unfreezeRows,
  unhideColumns,
  unhideRows,
  updateChart,
  updateFigure,
} from "../test_helpers/commands_helpers";
import { getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { createEqualCF, getDataValidationRules } from "../test_helpers/helpers";
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

  beforeEach(async () => {
    ({ network, alice, bob, charlie } = await setupCollaborativeEnv());
  });

  test("create and delete sheet concurrently", async () => {
    const sheet1 = alice.getters.getActiveSheetId();
    await createSheet(alice, { sheetId: "42" });
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "2" });
      await deleteSheet(bob, "42");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      [sheet1, "2"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("color and delete sheet concurrently", async () => {
    const sheet1 = alice.getters.getActiveSheetId();
    await createSheet(alice, { sheetId: "42" });
    await network.concurrent(async () => {
      await colorSheet(alice, "42", "#FF0000");
      await deleteSheet(bob, "42");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      [sheet1]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Create two sheets concurrently", async () => {
    const sheet1 = alice.getters.getActiveSheetId();
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "2" });
      await createSheet(bob, { sheetId: "3" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      [sheet1, "2", "3"]
    );
    expect(alice.getters.getSheetName("2")).not.toEqual(alice.getters.getSheetName("3"));
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Create two sheets concurrently with the same id", async () => {
    const { network, alice, bob, charlie } = await setupCollaborativeEnv();
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "sheet2", name: "Sheet2" });
      await createSheet(charlie, { sheetId: "sheet2", name: "Sheet2" });
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

  test("recreate a sheet with the same id from an undo", async () => {
    const { network, alice, bob, charlie } = await setupCollaborativeEnv();
    const firstSheetId = alice.getters.getActiveSheetId();
    await createSheet(alice, { sheetId: "sheet2" });
    await deleteSheet(alice, firstSheetId);
    await network.concurrent(async () => {
      await undo(alice); // Sheet1 is recreated
      await createSheet(charlie, { sheetId: firstSheetId, name: "from Charlie" });
    });
    await redo(alice);
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("concurrently create three numbered sheets with the same name", async () => {
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "alice42", name: "Sheet2" });
      await createSheet(bob, { sheetId: "bob42", name: "Sheet2" });
      await createSheet(charlie, { sheetId: "charlie42", name: "Sheet2" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds().map(user.getters.getSheetName),
      ["Sheet1", "Sheet2", "Sheet3", "Sheet4"]
    );
  });

  test("concurrently create three sheets with the same name", async () => {
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "alice42", name: "Sheet" });
      await createSheet(bob, { sheetId: "bob42", name: "Sheet" });
      await createSheet(charlie, { sheetId: "charlie42", name: "Sheet" });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds().map(user.getters.getSheetName),
      ["Sheet1", "Sheet", "Sheet~", "Sheet~~"]
    );
  });

  test("create sheet and move sheet concurrently", async () => {
    const sheet1 = alice.getters.getActiveSheetId();
    await createSheet(bob, { sheetId: "42", activate: true });
    await network.concurrent(async () => {
      await createSheet(alice, { sheetId: "2", position: 1 });
      await moveSheet(bob, 1, sheet1);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      ["2", sheet1, "42"]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Move two sheets concurrently", async () => {
    const sheet1 = alice.getters.getActiveSheetId();
    await createSheet(bob, { sheetId: "1", activate: true, position: 1 });
    await createSheet(bob, { sheetId: "2", activate: true, position: 2 });
    await network.concurrent(async () => {
      await moveSheet(alice, 1, sheet1);
      await moveSheet(bob, -1, "2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getSheetIds(),
      ["1", "2", sheet1]
    );
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("delete sheet and update figure concurrently", async () => {
    const sheetId = "42";
    await createSheet(bob, { sheetId, activate: true });
    await createFigure(bob, {
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
    await network.concurrent(async () => {
      await deleteSheet(alice, sheetId);
      await updateFigure(bob, {
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

  test("delete sheet and update chart concurrently", async () => {
    const sheetId = "42";
    const chartId = "24";
    await createSheet(bob, { sheetId, activate: true });
    await createChart(
      bob,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:A10" }],
        labelRange: "A1",
      },
      chartId,
      sheetId
    );
    await network.concurrent(async () => {
      await deleteSheet(alice, sheetId);
      await updateChart(
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

  test("rename sheet and update cell with sheet ref concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    const sheetName = bob.getters.getSheet(sheetId).name;
    await network.concurrent(async () => {
      await renameSheet(alice, sheetId, "NewName");
      await setCellContent(bob, "A1", `=${sheetName}!A2`);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellText(user, "A1"),
      "=NewName!A2"
    );
  });

  test("adding columns after adapts selection", async () => {
    await selectCell(alice, "B1");
    await selectCell(bob, "A1");
    await selectCell(charlie, "F1");
    await addColumns(alice, "after", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("adding columns before adapts selection", async () => {
    await selectCell(alice, "B1");
    await selectCell(bob, "A1");
    await selectCell(charlie, "F1");
    await addColumns(alice, "before", "B", 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H1"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("D1"));
  });

  test("adding rows after adapts selection", async () => {
    await selectCell(alice, "A3");
    await selectCell(bob, "A1");
    await selectCell(charlie, "A10");
    await addRows(alice, "after", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
  });

  test("adding rows before adapts selection", async () => {
    await selectCell(alice, "A3");
    await selectCell(bob, "A1");
    await selectCell(charlie, "A10");
    await addRows(alice, "before", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  test("removing rows adapts selection", async () => {
    await selectCell(alice, "A3");
    await selectCell(bob, "A1");
    await selectCell(charlie, "A10");
    await deleteRows(alice, [1]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A2"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A9"));
  });

  test("selection is correctly updated with concurrent add rows", async () => {
    await network.concurrent(async () => {
      await addRows(alice, "before", 1, 1);
      await addRows(bob, "after", 0, 1);
      await selectCell(bob, "A2");
    });
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A2"));
  });

  test("remove the selected row and all following rows", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await selectCell(bob, "A10");
    const nRows = bob.getters.getNumberRows(sheetId);
    await deleteRows(alice, range(2, nRows));
    expect(bob.getters.getSelectedZones()).toEqual([toZone("A2")]);
  });

  test("remove the selected col when it is the last col", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await selectCell(bob, "F1");
    const nCols = bob.getters.getNumberCols(sheetId);
    await deleteColumns(alice, range(2, nCols).map(numberToLetters));
    expect(bob.getters.getSelectedZones()).toEqual([toZone("B1")]);
  });

  test("adding rows adapts selection", async () => {
    await selectCell(alice, "A3");
    await selectCell(bob, "A1");
    await selectCell(charlie, "A10");
    await addRows(alice, "before", 2, 2);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A12"));
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  test("removing the selected column", async () => {
    await selectCell(alice, "B3");
    await selectCell(bob, "B1");
    await selectCell(charlie, "B10");
    await deleteColumns(alice, ["B"]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B3"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("B1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("B10"));
  });

  test("removing the first column while selected", async () => {
    await selectCell(alice, "A3");
    await selectCell(bob, "A1");
    await selectCell(charlie, "A10");
    await deleteColumns(alice, ["A"]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("A3"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("A10"));
  });

  test("removing the selected row", async () => {
    await selectCell(alice, "B2");
    await selectCell(bob, "C2");
    await selectCell(charlie, "D2");
    await deleteRows(alice, [1]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("B2"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("C2"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("D2"));
  });

  test("removing the first rows while selected", async () => {
    await selectCell(alice, "C1");
    await selectCell(bob, "A1");
    await selectCell(charlie, "K1");
    await deleteRows(alice, [0]);
    expect(alice.getters.getSelectedZone()).toEqual(toZone("C1"));
    expect(bob.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("K1"));
  });

  test("Adding/removing columns/rows does not update the selection of clients on another sheet", async () => {
    await selectCell(bob, "D4");
    await createSheet(alice, { sheetId: "42", activate: true });
    await activateSheet(charlie, "42");
    await selectCell(charlie, "D4");
    /** Columns */
    await addColumns(alice, "before", "A", 5);
    await deleteColumns(alice, ["A"]);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("D4"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H4"));
    /** Rows */
    await addRows(alice, "before", 0, 5);
    await deleteRows(alice, [0]);
    expect(bob.getters.getSelectedZone()).toEqual(toZone("D4"));
    expect(charlie.getters.getSelectedZone()).toEqual(toZone("H8"));
  });

  test("Hide and add columns concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await network.concurrent(async () => {
      await addColumns(alice, "before", "A", 10, sheetId);
      await hideColumns(bob, ["C"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["M"]])
    );
  });

  test("Hide and remove rows concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await network.concurrent(async () => {
      await deleteRows(alice, [2], sheetId);
      await hideRows(bob, [4], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[3]]
    );
  });

  test("Hide and add rows concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await network.concurrent(async () => {
      await addRows(alice, "after", 5, 10, sheetId);
      await hideRows(bob, [2], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[2]]
    );
  });

  test("Unhide and add rows concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await hideRows(alice, [2], sheetId);
    await network.concurrent(async () => {
      await addRows(alice, "before", 0, 10, sheetId);
      await unhideRows(bob, [2], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      []
    );
  });

  test("Unhide and remove columns concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await hideColumns(alice, ["F", "H"], sheetId);
    await network.concurrent(async () => {
      await deleteColumns(alice, ["F"], sheetId);
      await unhideColumns(bob, ["F"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["G"]])
    );
  });

  test("Unhide and add columns concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await hideColumns(alice, ["C", "D"], sheetId);
    await network.concurrent(async () => {
      await addColumns(alice, "after", "F", 10, sheetId);
      await unhideColumns(bob, ["C"], sheetId);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["D"]])
    );
  });

  test("Hide different rows concurrent", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await network.concurrent(async () => {
      await hideRows(alice, [1], sheetId);
      expect(alice.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
      await hideRows(bob, [2, 3], sheetId);
      expect(bob.getters.getHiddenRowsGroups(sheetId)).toEqual([[2, 3]]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[1, 2, 3]]
    );
  });

  test("Unhide different rows concurrent", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await hideRows(alice, [5, 6, 8], sheetId);
    await network.concurrent(async () => {
      await unhideRows(alice, [5], sheetId);
      expect(alice.getters.getHiddenRowsGroups(sheetId)).toEqual([[6], [8]]);
      await unhideRows(bob, [6], sheetId);
      expect(bob.getters.getHiddenRowsGroups(sheetId)).toEqual([[5], [8]]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenRowsGroups(sheetId),
      [[8]]
    );
  });

  test("Hide and unhide columns concurrently", async () => {
    const sheetId = alice.getters.getActiveSheetId();
    await hideColumns(alice, ["C"], sheetId);
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      [[2]]
    );
    await network.concurrent(async () => {
      await hideColumns(alice, ["B", "C", "D"], sheetId);
      await unhideColumns(bob, ["C"]);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getHiddenColsGroups(sheetId),
      toNumbers([["B"], ["D"]])
    );
  });

  test("Delete cells on columns deleted", async () => {
    await setCellContent(alice, "F1", "hello");
    await network.concurrent(async () => {
      await deleteColumns(alice, ["D"]);
      await deleteCells(bob, "C1:E1", "left");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellContent(user, "C1"),
      "hello"
    );
  });

  describe("conditional formatting", () => {
    test("Concurrent new conditional format and new columns", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const rule = createEqualCF("1", { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await addColumns(alice, "before", "D", 2);
        await addCfRule(bob, "A1:A3,C1:D3,F1:F3", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "C1:F3", "H1:H3"],
            rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and removed columns", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const rule = createEqualCF("1", { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await deleteColumns(alice, ["C", "D", "F"]);
        await addCfRule(bob, "A1:A3,C1:D3,F1:G3", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "D1:D3"],
            rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and new rows", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const rule = createEqualCF("1", { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await addRows(alice, "before", 9, 2);
        await addCfRule(bob, "A1:A3,A4:A10,A11:A12", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "A4:A12", "A13:A14"],
            rule,
          },
        ]
      );
    });

    test("Concurrent new conditional format and removed rows", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const rule = createEqualCF("1", { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await deleteRows(alice, [3, 4, 10]);
        await addCfRule(bob, "A1:A3,A4:A5,A11:A12", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A1:A3", "A9"],
            rule,
          },
        ]
      );
    });

    test("Concurrent conditional format update and rename sheet", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const sheetName = bob.getters.getSheetName(sheetId);
      const newSheetName = "NewName";
      const rule = createEqualCF(`=${sheetName}!A1`, { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await renameSheet(alice, sheetId, newSheetName);
        await addCfRule(bob, "A2", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...rule,
              values: [`=${newSheetName}!A1`],
            } as CellIsRule,
          },
        ]
      );
      await undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...rule,
              values: [`=${sheetName}!A1`],
            } as CellIsRule,
          },
        ]
      );
    });

    test("Concurrent conditional format update and delete sheet", async () => {
      const sheetId = bob.getters.getActiveSheetId();
      const secondSheetId = "42";
      const secondSheetName = "SecondSheet";
      await createSheet(alice, { sheetId: secondSheetId, name: secondSheetName, activate: true });
      const rule = createEqualCF(`=${secondSheetName}!A1`, { fillColor: "#FF0000" }, "1").rule;
      await network.concurrent(async () => {
        await deleteSheet(alice, secondSheetId);
        await addCfRule(bob, "A2", rule, "1");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...rule,
              values: [`=${secondSheetName}!A1`],
            } as CellIsRule,
          },
        ]
      );
      await undo(alice);
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getConditionalFormats(sheetId),
        [
          {
            id: "1",
            ranges: ["A2"],
            rule: {
              ...rule,
              values: [`=${secondSheetName}!A1`],
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
      humanize: false,
    };

    test(`Concurrently chart creation & update and add columns`, async () => {
      await network.concurrent(async () => {
        await addColumns(alice, "before", "D", 2);
        await createChart(bob, chartDef, chartId);
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getChartDefinition(chartId),
        {
          ...chartDef,
          dataSets: [{ dataRange: "A1:A3", yAxisId: "y" }, { dataRange: "H1:H3" }],
          labelRange: "H3",
        }
      );
      await network.concurrent(async () => {
        await addColumns(alice, "before", "D", 2);
        await updateChart(bob, chartId, {
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

    test(`Concurrently chart creation & update and removed columns`, async () => {
      await network.concurrent(async () => {
        await deleteColumns(alice, ["C", "F"]);
        await createChart(
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
      await network.concurrent(async () => {
        await deleteColumns(alice, ["C", "F"]);
        await updateChart(bob, chartId, {
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

    test(`Concurrently chart creation & update and new rows`, async () => {
      await network.concurrent(async () => {
        await addRows(alice, "before", 9, 2);
        await createChart(
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
      await network.concurrent(async () => {
        await addRows(alice, "before", 9, 2);
        await updateChart(bob, chartId, {
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

    test("Set grid lines visibility is correctly shared", async () => {
      await createSheet(alice, { sheetId: "42" });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getGridLinesVisibility("42"),
        true
      );
      await setGridLinesVisibility(alice, false, "42");
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.getGridLinesVisibility("42"),
        false
      );
    });

    test("Set grid lines visibility with a sheet deletion", async () => {
      await createSheet(alice, { sheetId: "42" });
      await network.concurrent(async () => {
        await deleteSheet(bob, "42");
        await setGridLinesVisibility(alice, false, "42");
      });
      expect([alice, bob, charlie]).toHaveSynchronizedValue(
        (user) => user.getters.tryGetSheet("42"),
        undefined
      );
    });

    test(`Concurrently chart creation & update and removed rows`, async () => {
      await network.concurrent(async () => {
        await deleteRows(alice, [3, 4, 10]);
        await createChart(
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
      await network.concurrent(async () => {
        await deleteRows(alice, [3, 4, 10]);
        await updateChart(bob, chartId, {
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

    test("Rename a sheet and update a chart concurrently", async () => {
      const sheetId = alice.getters.getActiveSheetId();
      const chartId = "42";
      const sheetName2 = "sheet2";
      const sheetId2 = "sh2";
      const newName = "NewName";
      await createSheet(bob, { sheetId: sheetId2, name: sheetName2, activate: true });
      await createChart(alice, chartDef, chartId, sheetId);
      await network.concurrent(async () => {
        await renameSheet(alice, sheetId2, newName);
        await updateChart(bob, chartId, {
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
      await undo(alice);
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

  test(`Concurrently Add a pane split and remove columns`, async () => {
    await network.concurrent(async () => {
      await deleteColumns(alice, ["G"]);
      await freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 4,
        ySplit: 0,
      }
    );
    await network.concurrent(async () => {
      await unfreezeColumns(bob);
    });
    await network.concurrent(async () => {
      await deleteColumns(alice, ["C", "F"]);
      await freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 3,
        ySplit: 0,
      }
    );
    await network.concurrent(async () => {
      await deleteColumns(alice, ["A"]);
      await unfreezeColumns(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and add columns`, async () => {
    await network.concurrent(async () => {
      await addColumns(alice, "after", "G", 5);
      await freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 4,
        ySplit: 0,
      }
    );
    await network.concurrent(async () => {
      await unfreezeColumns(bob);
    });
    await network.concurrent(async () => {
      await addColumns(alice, "after", "C", 1);
      await freezeColumns(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 5,
        ySplit: 0,
      }
    );
    await network.concurrent(async () => {
      await addColumns(alice, "before", "A", 1);
      await unfreezeColumns(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and remove rows`, async () => {
    await network.concurrent(async () => {
      await deleteRows(alice, [6]);
      await freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 4,
      }
    );
    await network.concurrent(async () => {
      await unfreezeRows(bob);
    });
    await network.concurrent(async () => {
      await deleteRows(alice, [2, 5]);
      await freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 3,
      }
    );
    await network.concurrent(async () => {
      await deleteRows(alice, [0]);
      await unfreezeRows(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test(`Concurrently Add a pane split and add rows`, async () => {
    await network.concurrent(async () => {
      await addRows(alice, "after", 6, 5);
      await freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 4,
      }
    );
    await network.concurrent(async () => {
      await unfreezeRows(bob);
    });
    await network.concurrent(async () => {
      await addRows(alice, "after", 2, 1);
      await freezeRows(bob, 4);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 5,
      }
    );
    await network.concurrent(async () => {
      await addRows(alice, "before", 0, 1);
      await unfreezeRows(bob);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getPaneDivisions(user.getters.getActiveSheetId()),
      {
        xSplit: 0,
        ySplit: 0,
      }
    );
  });

  test("merge does not prevent freeze in other sheet", async () => {
    const firstSheetId = alice.getters.getActiveSheetId();
    await createSheet(bob, { sheetId: "sheet2", activate: true });
    await merge(alice, "A1:A10");
    // Bob's active sheet is sheet2, Alice's is sheet1
    await freezeRows(bob, 4, "sheet2");
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

test("test undo redo", async () => {
  const sheetId = "sid";
  const sheetName = "SheetName";
  const otherSheetId = "othersid";
  const otherSheetName = "OtherSheetName";

  const newSheetName = "NewSheetName";

  const { alice, bob, charlie } = await setupCollaborativeEnv({
    sheets: [
      { id: sheetId, name: sheetName },
      { id: otherSheetId, name: otherSheetName },
    ],
  });

  await setCellContent(alice, "E1", "25", otherSheetId);
  await deleteColumns(alice, ["C"], otherSheetId);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) =>
      (user.getters.getCell({ sheetId: otherSheetId, col: 3, row: 0 }) as LiteralCell)?.content,
    "25"
  );

  await setCellContent(bob, "A1", "=" + otherSheetName + "!D1", sheetId);
  await renameSheet(bob, otherSheetId, newSheetName);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) =>
      (
        user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 }) as FormulaCell
      )?.compiledFormula.toFormulaString(user.getters),
    "=" + newSheetName + "!D1"
  );

  await undo(alice);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) =>
      (
        user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 }) as FormulaCell
      )?.compiledFormula.toFormulaString(user.getters),
    "=" + newSheetName + "!E1"
  );

  await redo(alice);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) =>
      (
        user.getters.getCell({ sheetId: sheetId, col: 0, row: 0 }) as FormulaCell
      )?.compiledFormula.toFormulaString(user.getters),
    "=" + newSheetName + "!D1"
  );

  await setCellContent(alice, "A4", "=" + newSheetName + "!D1", sheetId);
  await undo(bob);

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) =>
      (
        user.getters.getCell({ sheetId: sheetId, col: 0, row: 3 }) as FormulaCell
      )?.compiledFormula.toFormulaString(user.getters),
    "=" + otherSheetName + "!D1"
  );
});

test("Concurrent datavalidation create and rename sheet", async () => {
  const sheetId = "sid";
  const sheetName = "SheetName";

  const newSheetName = "NewSheetName";

  const { network, alice, bob, charlie } = await setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });

  await network.concurrent(async () => {
    await renameSheet(alice, sheetId, newSheetName);
    await addDataValidation(bob, "B1", "id", {
      type: "containsText",
      values: [`=${sheetName}!A1`],
    });
  });

  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => getDataValidationRules(user, sheetId),
    [
      {
        id: "id",
        criterion: { type: "containsText", values: [`=${newSheetName}!A1`] },
        ranges: ["B1"],
        isBlocking: false,
      },
    ]
  );
  await undo(alice);
  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => getDataValidationRules(user, sheetId),
    [
      {
        id: "id",
        criterion: { type: "containsText", values: [`=${sheetName}!A1`] },
        ranges: ["B1"],
        isBlocking: false,
      },
    ]
  );
});

test("concurrent pivot computed measure and rename sheet", async () => {
  const sheetId = "sid";
  const sheetName = "SheetName";
  const newSheetName = "NewSheetName";

  const { network, alice, bob, charlie } = await setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });

  await setCellContent(alice, "A1", "1", sheetId);
  await setCellContent(alice, "B1", "2", sheetId);
  await setCellContent(alice, "A2", "3", sheetId);
  await setCellContent(alice, "B2", "4", sheetId);

  await network.concurrent(async () => {
    await renameSheet(bob, sheetId, newSheetName);
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

  await undo(bob);
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

test("concurrent pivot computed measure and delete sheet", async () => {
  const sheetId = "sid";
  const sheetName = "SheetName";

  const secondSheetId = "42";
  const secondSheetName = "SecondSheet";
  const { network, alice, bob, charlie } = await setupCollaborativeEnv({
    sheets: [{ id: sheetId, name: sheetName }],
  });
  await createSheet(bob, { sheetId: secondSheetId, name: secondSheetName });

  await setCellContent(alice, "A1", "1", sheetId);
  await setCellContent(alice, "B1", "2", sheetId);
  await setCellContent(alice, "A2", "3", sheetId);
  await setCellContent(alice, "B2", "4", sheetId);

  await network.concurrent(async () => {
    await deleteSheet(alice, secondSheetId);
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
        computedBy: { formula: `=${secondSheetName}!A1*2`, sheetId: secondSheetId },
      },
    ]
  );

  await undo(alice);
  expect([alice, bob, charlie]).toHaveSynchronizedValue(
    (user) => user.getters.getPivotCoreDefinition("pivot1").measures,
    [
      {
        id: "measure",
        fieldName: "mm",
        aggregator: "sum",
        computedBy: { formula: `=${secondSheetName}!A1*2`, sheetId: secondSheetId },
      },
    ]
  );
});
