import { Model } from "../../src";
import { ColumnStatisticsStore } from "../../src/components/side_panel/column_stats/column_stats_store";
import { formatValue } from "../../src/helpers";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
import { Store } from "../../src/types/store_engine";
import {
  deleteRows,
  selectCell,
  setCellContent,
  setCellFormat,
} from "../test_helpers/commands_helpers";
import { mountSpreadsheet, setGrid } from "../test_helpers/helpers";

function getStoreStatistics(
  store: Store<ColumnStatisticsStore>
): Record<string, number | string | undefined> {
  const results: Record<string, number | string | undefined> = {};
  for (const [fnName, result] of Object.entries(store.statisticFnResults)) {
    results[fnName] = result?.value?.();
  }
  return results;
}

describe("column statistics sidePanel store", () => {
  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ model, env } = await mountSpreadsheet());
  });

  test("Store computes correct statistics for numerical data", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30", A4: "40", A5: "50", A6: "10" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);
    const statistics = getStoreStatistics(store);

    expect(statistics["Total rows"]).toBe(100);
    expect(statistics["Unique values"]).toBe(5);
    expect(statistics["Sum"]).toBe(160);
    expect(statistics["Average"]).toBeCloseTo(26.67, 2);
    expect(statistics["Median"]).toBe(25);
    expect(statistics["Minimum value"]).toBe(10);
    expect(statistics["Maximum value"]).toBe(50);

    const frequency = store.valueFrequencies;
    expect(frequency).toEqual([
      { value: "10.00", count: 2, positions: expect.any(Array) },
      { value: "20.00", count: 1, positions: expect.any(Array) },
      { value: "30.00", count: 1, positions: expect.any(Array) },
      { value: "40.00", count: 1, positions: expect.any(Array) },
      { value: "50.00", count: 1, positions: expect.any(Array) },
    ]);
  });

  test("Store computes correct statistics for string data", async () => {
    setGrid(model, { A1: "a", A2: "b", A3: "c", A4: "d", A5: "e", A6: "a" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);
    const statistics = getStoreStatistics(store);

    expect(statistics["Total rows"]).toBe(100);
    expect(statistics["Unique values"]).toBe(5);
    expect(statistics["Sum"]).toBeUndefined();
    expect(statistics["Average"]).toBeUndefined();
    expect(statistics["Median"]).toBeUndefined();
    expect(statistics["Minimum value"]).toBeUndefined();
    expect(statistics["Maximum value"]).toBeUndefined();

    const frequency = store.valueFrequencies;
    expect(frequency).toEqual([
      { value: "a", count: 2, positions: expect.any(Array) },
      { value: "b", count: 1, positions: expect.any(Array) },
      { value: "c", count: 1, positions: expect.any(Array) },
      { value: "d", count: 1, positions: expect.any(Array) },
      { value: "e", count: 1, positions: expect.any(Array) },
    ]);
  });

  test("Store computes correct statistics for empty data", async () => {
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);
    const statistics = getStoreStatistics(store);

    expect(statistics["Total rows"]).toBe(100);
    expect(statistics["Unique values"]).toBeUndefined();
    expect(statistics["Sum"]).toBeUndefined();
    expect(statistics["Average"]).toBeUndefined();
    expect(statistics["Median"]).toBeUndefined();
    expect(statistics["Minimum value"]).toBeUndefined();
    expect(statistics["Maximum value"]).toBeUndefined();

    const frequency = store.valueFrequencies;
    expect(frequency).toEqual([]);
  });

  test("String data are ignored in the store when there is numerical data in the same column", async () => {
    setGrid(model, { A1: "a", A2: "10", A3: "20", A4: "30", A5: "b", A6: "c" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);
    const statistics = getStoreStatistics(store);

    expect(statistics["Total rows"]).toBe(100);
    expect(statistics["Unique values"]).toBe(6);
    expect(statistics["Sum"]).toBe(60);
    expect(statistics["Average"]).toBe(20);
    expect(statistics["Median"]).toBe(20);
    expect(statistics["Minimum value"]).toBe(10);
    expect(statistics["Maximum value"]).toBe(30);

    const frequency = store.valueFrequencies;
    expect(frequency).toEqual([
      { value: "10.00", count: 1, positions: expect.any(Array) },
      { value: "20.00", count: 1, positions: expect.any(Array) },
      { value: "30.00", count: 1, positions: expect.any(Array) },
    ]);
  });

  test("Store reacts to change of selected column", async () => {
    setGrid(model, { A1: "10", A2: "20", B1: "30", B2: "40" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(30);

    selectCell(model, "B1");

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(70);
  });

  test("Store take into account ignored rows", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30", A4: "40" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(100);

    store.updateIgnoredRows(2);

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(70);
  });

  test("Store reacts to change of cell content", async () => {
    setGrid(model, { A1: "10", A2: "20" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(30);

    setCellContent(model, "A3", "30");

    expect(store.statisticFnResults["Sum"]?.value?.()).toBe(60);
  });

  test("Store reacts to deletion of row", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30" });
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);

    expect(store.statisticFnResults["Unique values"]?.value?.()).toBe(3);

    deleteRows(model, [1]);

    expect(store.statisticFnResults["Unique values"]?.value?.()).toBe(2);
  });

  test("Store use correct number format", async () => {
    setGrid(model, { A1: "10.5", A2: "20.3", A3: "30.7" });
    setCellFormat(model, "A1", "[$$]#,##0.00");
    selectCell(model, "A1");
    const store = env.getStore(ColumnStatisticsStore);

    const localeFormat = { locale: model.getters.getLocale(), format: "[$$]#,##0.00" };
    expect(store.valueFrequencies).toEqual([
      { value: formatValue(10.5, localeFormat), count: 1, positions: expect.any(Array) },
      { value: formatValue(20.3, localeFormat), count: 1, positions: expect.any(Array) },
      { value: formatValue(30.7, localeFormat), count: 1, positions: expect.any(Array) },
    ]);
  });
});
