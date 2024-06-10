import { Model } from "../../src";
import { AggregateStatisticsStore } from "../../src/components/bottom_bar_statistic/aggregate_statistics_store";
import { functionRegistry } from "../../src/functions";
import {
  activateSheet,
  addCellToSelection,
  createSheet,
  hideRows,
  selectAll,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { getCellError, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { makeStore } from "../test_helpers/stores";

describe("Aggregate statistic functions", () => {
  test("functions are applied on deduplicated cells in zones", () => {
    const { store, model } = makeStore(AggregateStatisticsStore);
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");

    setSelection(model, ["A1:A2"]);
    let statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Count"]?.()).toBe(2);

    // expand selection with the range A3:A2
    addCellToSelection(model, "A3");
    setAnchorCorner(model, "A2");

    // A2 is now present in two selection
    statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Count"]?.()).toBe(3);
  });

  test("statistic function should not include hidden rows/columns in calculations", () => {
    const { store, model } = makeStore(AggregateStatisticsStore);
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");

    setSelection(model, ["A1:A4"]);
    let statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Sum"]?.()).toBe(6);

    hideRows(model, [1, 2]);
    statisticFnResults = store.statisticFnResults;
    expect(statisticFnResults["Sum"]?.()).toBe(1);
  });

  describe("return undefined if the types handled by the function are not present among the types of the selected cells", () => {
    let model: Model;
    let store: AggregateStatisticsStore;
    beforeEach(() => {
      ({ store, model } = makeStore(AggregateStatisticsStore));
      setCellContent(model, "A1", "24");
      setCellContent(model, "A2", "=42");
      setCellContent(model, "A3", "107% of people don't get statistics");
      setCellContent(model, "A4", "TRUE");
      setCellContent(model, "A5", "=A5");
      setCellContent(model, "A6", "=A7");
    });

    test('return the "SUM" value only on cells interpreted as number', () => {
      // select the range A1:A7
      selectCell(model, "A1");
      setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Sum"]?.()).toBe(66);

      selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Sum"]).toBe(undefined);
    });

    test('return the "Avg" result only on cells interpreted as number', () => {
      // select the range A1:A7
      selectCell(model, "A1");
      setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Avg"]?.()).toBe(22);

      selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Avg"]).toBe(undefined);
    });

    test('return "Min" value only on cells interpreted as number', () => {
      // select the range A1:A7
      selectCell(model, "A1");
      setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Min"]?.()).toBe(0);

      selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Min"]).toBe(undefined);
    });

    test('return the "Max" value only on cells interpreted as number', () => {
      // select the range A1:A7
      selectCell(model, "A1");
      setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Max"]?.()).toBe(42);

      selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Max"]).toBe(undefined);
    });

    test('return the "Count" value on all types of interpreted cells except on cells interpreted as empty', () => {
      // select the range A1:A7
      selectCell(model, "A1");
      setAnchorCorner(model, "A7");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]?.()).toBe(6);

      selectCell(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]).toBe(undefined);
    });

    test('return the "Count numbers" value on all types of interpreted cells except on cells interpreted as empty', () => {
      selectCell(model, "A1");
      let statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.()).toBe(1);

      selectCell(model, "A2");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.()).toBe(1);

      selectCell(model, "A3");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.()).toBe(0);

      selectCell(model, "A4");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.()).toBe(0);

      selectCell(model, "A5");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count Numbers"]?.()).toBe(0);

      // select the range A6:A7
      selectCell(model, "A6");
      setAnchorCorner(model, "A7");
      statisticFnResults = store.statisticFnResults;
      expect(statisticFnResults["Count"]?.()).toBe(1);
    });
  });

  test("raise error from compilation with specific error message", () => {
    functionRegistry.add("TWOARGSNEEDED", {
      description: "any function",
      compute: () => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"] },
      ],
    });

    const model = new Model();
    setCellContent(model, "A1", "=TWOARGSNEEDED(42)");

    expect(getEvaluatedCell(model, "A1").value).toBe("#BAD_EXPR");
    expect(getCellError(model, "A1")).toBe(
      `Invalid number of arguments for the TWOARGSNEEDED function. Expected 2 minimum, but got 1 instead.`
    );
    functionRegistry.remove("TWOARGSNEEDED");
  });

  test("Statistics are recomputed when switching sheets", () => {
    const { store, model } = makeStore(AggregateStatisticsStore);
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    selectAll(model);
    const sId1 = model.getters.getActiveSheetId();
    const sId2 = "sh2";
    createSheet(model, { sheetId: sId2 });
    setCellContent(model, "A2", "4", sId2);
    setCellContent(model, "A3", "4", sId2);
    expect(store.statisticFnResults["Count"]?.()).toBe(3);
    activateSheet(model, sId2);
    selectAll(model);
    expect(store.statisticFnResults["Count"]?.()).toBe(2);
    activateSheet(model, sId1);
    selectAll(model);
    expect(store.statisticFnResults["Count"]?.()).toBe(3);
  });
});
