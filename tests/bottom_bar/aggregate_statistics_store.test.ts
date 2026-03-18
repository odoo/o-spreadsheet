import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { Model } from "../../src";
import { AggregateStatisticsStore } from "../../src/components/bottom_bar/bottom_bar_statistic/aggregate_statistics_store";
import {
  activateSheet,
  addCellToSelection,
  createSheet,
  hideRows,
  selectAll,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setSelection,
} from "../test_helpers/commands_helpers";
import { getCellError, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { addToRegistry, createModel } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

describe("Aggregate statistic functions", () => {
  test("functions are applied on deduplicated cells in zones", async () => {
    const { store, model } = await makeStore(AggregateStatisticsStore);
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");

    await setSelection(model, ["A1:A2"]);
    let statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Count"]?.value?.()).toBe(2);

    // expand selection with the range A3:A2
    await addCellToSelection(model, "A3");
    await setAnchorCorner(model, "A2");

    // A2 is now present in two selection
    statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Count"]?.value?.()).toBe(3);
  });

  test("statistic function should not include hidden rows/columns in calculations", async () => {
    const { store, model } = await makeStore(AggregateStatisticsStore);
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");

    await setSelection(model, ["A1:A4"]);
    let statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Sum"]?.value?.()).toBe(6);

    await hideRows(model, [1, 2]);
    statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Sum"]?.value?.()).toBe(1);
  });

  describe("return undefined if the types handled by the function are not present among the types of the selected cells", () => {
    let model: Model;
    let store: AggregateStatisticsStore;
    beforeEach(async () => {
      ({ store, model } = await makeStore(AggregateStatisticsStore));
      await setCellContent(model, "A1", "24");
      await setCellContent(model, "A2", "=42");
      await setCellContent(model, "A3", "107% of people don't get statistics");
      await setCellContent(model, "A4", "TRUE");
      await setCellContent(model, "A5", "=A5");
      await setCellContent(model, "A6", "=A7");
    });

    test('return the "SUM" value only on cells interpreted as number', async () => {
      // select the range A1:A7
      await selectCell(model, "A1");
      await setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Sum"]?.value?.()).toBe(66);

      await selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Sum"]?.value).toBe(undefined);
    });

    test('return the "Avg" result only on cells interpreted as number', async () => {
      // select the range A1:A7
      await selectCell(model, "A1");
      await setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Avg"]?.value?.()).toBe(22);

      await selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Avg"]?.value).toBe(undefined);
    });

    test('return "Min" value only on cells interpreted as number', async () => {
      // select the range A1:A7
      await selectCell(model, "A1");
      await setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Min"]?.value?.()).toBe(0);

      await selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Min"]?.value).toBe(undefined);
    });

    test('return the "Max" value only on cells interpreted as number', async () => {
      // select the range A1:A7
      await selectCell(model, "A1");
      await setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Max"]?.value?.()).toBe(42);

      await selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Max"]?.value).toBe(undefined);
    });

    test('return the "Count" value on all types of interpreted cells except on cells interpreted as empty', async () => {
      // select the range A1:A7
      await selectCell(model, "A1");
      await setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]?.value?.()).toBe(6);

      await selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]?.value).toBe(undefined);
    });

    test('return the "Count numbers" value on all types of interpreted cells except on cells interpreted as empty', async () => {
      await selectCell(model, "A1");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.value?.()).toBe(1);

      await selectCell(model, "A2");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.value?.()).toBe(1);

      await selectCell(model, "A3");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.value?.()).toBe(0);

      await selectCell(model, "A4");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.value?.()).toBe(0);

      await selectCell(model, "A5");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.value?.()).toBe(0);

      // select the range A6:A7
      await selectCell(model, "A6");
      await setAnchorCorner(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]?.value?.()).toBe(1);
    });
  });

  test("raise error from compilation with specific error message", async () => {
    addToRegistry(functionRegistry, "TWOARGSNEEDED", {
      description: "any function",
      compute: () => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"] },
      ],
    });

    const model = await createModel();
    await setCellContent(model, "A1", "=TWOARGSNEEDED(42)");

    expect(getEvaluatedCell(model, "A1").value).toBe("#BAD_EXPR");
    expect(getCellError(model, "A1")).toBe(
      `Invalid number of arguments for the TWOARGSNEEDED function. Expected 2 minimum, but got 1 instead.`
    );
  });

  test("Statistics are recomputed when switching sheets", async () => {
    const { store, model } = await makeStore(AggregateStatisticsStore);
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await selectAll(model);
    const sId1 = model.getters.getActiveSheetId();
    const sId2 = "sh2";
    await createSheet(model, { sheetId: sId2 });
    await setCellContent(model, "A2", "4", sId2);
    await setCellContent(model, "A3", "4", sId2);
    expect(store.statisticFnResults["Count"]?.value?.()).toBe(3);
    await activateSheet(model, sId2);
    await selectAll(model);
    expect(store.statisticFnResults["Count"]?.value?.()).toBe(2);
    await activateSheet(model, sId1);
    await selectAll(model);
    expect(store.statisticFnResults["Count"]?.value?.()).toBe(3);
  });

  test("statistic is updated when a cell format changes", async () => {
    const { store, model } = await makeStore(AggregateStatisticsStore);
    await setCellContent(model, "A1", '=IF(CELL("format",B1)="0.00%",3,0)');
    await setSelection(model, ["A1"]);

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(0);

    await setFormat(model, "B1", "0.00%");
    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(3);
  });
});
