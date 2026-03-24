import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ChartConfiguration } from "chart.js";
import { Model } from "../../src";
import { ColumnStatisticsStore } from "../../src/components/side_panel/column_stats/column_stats_store";
import { SidePanels } from "../../src/components/side_panel/side_panels/side_panels";
import { click } from "../test_helpers";
import { selectCell, setCellContent, setSelection } from "../test_helpers/commands_helpers";
import {
  mockChart,
  mountComponentWithPortalTarget,
  nextTick,
  setGrid,
} from "../test_helpers/helpers";

mockChart();

describe("column statistics sidePanel component", () => {
  let model: Model;
  let env: SpreadsheetChildEnv;
  let fixture: HTMLElement;

  beforeEach(async () => {
    ({ model, env, fixture } = await mountComponentWithPortalTarget(SidePanels));
  });

  test("Column stats side panel is correctly filled", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30", A4: "40", A5: "50", A6: "10" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect('[data-test-id="Total rows"]').toHaveText("100");
    expect('[data-test-id="Unique values"]').toHaveText("5");
    expect('[data-test-id="Sum"]').toHaveText("160.00");
    expect('[data-test-id="Average"]').toHaveText("26.67");
    expect('[data-test-id="Median"]').toHaveText("25.00");
    expect('[data-test-id="Minimum value"]').toHaveText("10.00");
    expect('[data-test-id="Maximum value"]').toHaveText("50.00");

    const labels = Array.from(fixture.querySelectorAll(".frequency-label")).map(
      (el) => el.textContent
    );
    const values = Array.from(fixture.querySelectorAll(".frequency-value")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["10.00", "20.00", "30.00", "40.00", "50.00"]);
    expect(values).toEqual(["2", "1", "1", "1", "1"]);
  });

  test("Column stats side panel is showing an error message when selecting multiple columns", async () => {
    setGrid(model, { A1: "10", A2: "20", B1: "30", B2: "40" });
    setSelection(model, ["A1", "B1"]);
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect('[data-test-id="Total rows"]').toHaveCount(0);
    expect(".o-column-stats-empty").toHaveText(" Select a single column to view statistics. ");
  });

  test("Can switch to the next/previous column", async () => {
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    const columnStatsStore = env.getStore(ColumnStatisticsStore);
    expect(columnStatsStore.selectedColumn).toBe(0);

    await click(fixture, '[data-test-id="next-column-button"]');
    expect(columnStatsStore.selectedColumn).toBe(1);

    await click(fixture, '[data-test-id="previous-column-button"]');
    expect(columnStatsStore.selectedColumn).toBe(0);
  });

  test("Can ignore header rows", async () => {
    setGrid(model, { A1: "Header", A2: "Header 2", A3: "a", A4: "b", A5: "c" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect('[data-test-id="Unique values"]').toHaveText("5");
    const labels = Array.from(fixture.querySelectorAll(".frequency-label")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["Header", "Header 2", "a", "b", "c"]);

    const input = fixture.querySelector("input.o-ignored-rows-input") as HTMLInputElement;
    input.value = "2";
    input.dispatchEvent(new Event("change"));
    input.dispatchEvent(new Event("blur")); // trigger save if present
    await nextTick();

    expect('[data-test-id="Unique values"]').toHaveText("3");
    const labelsAfter = Array.from(fixture.querySelectorAll(".frequency-label")).map(
      (el) => el.textContent
    );
    expect(labelsAfter).toEqual(["a", "b", "c"]);
  });

  test("Content of the first row is set as side panel title if string", async () => {
    setGrid(model, { A1: "10", A2: "20" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(".o-column-stats-title").toHaveText("Column A");

    setCellContent(model, "A1", "Header");
    await nextTick();

    expect(".o-column-stats-title").toHaveText("Header");
  });

  test("Can change the order of frequency table", async () => {
    setGrid(model, { A1: "b", A2: "a", A3: "c", A4: "a", A5: "b", A6: "a" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    let labels = Array.from(fixture.querySelectorAll(".frequency-label")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["a", "b", "c"]);

    await click(fixture, 'button[data-id="ascending"]');

    labels = Array.from(fixture.querySelectorAll(".frequency-label")).map((el) => el.textContent);
    expect(labels).toEqual(["c", "b", "a"]);
  });

  test("Chart is re-created when switching from distribution to count when there are no distribution chart to display", async () => {
    setGrid(model, { A1: "Alice", A2: "Alice" });
    env.openSidePanel("ColumnStats");
    const ChartMock = window.Chart;
    window.Chart = jest
      .fn()
      .mockImplementation(function (ctx: CanvasRenderingContext2D, config: ChartConfiguration) {
        return new ChartMock(ctx, config);
      }) as any;

    await nextTick();

    expect(".o-column-stats-chart canvas").toHaveCount(1);
    expect(".o-column-stats-no-data").toHaveCount(0);
    expect(window.Chart).toHaveBeenCalledTimes(1);

    await click(fixture, '.o-button[data-id="histogram"]');
    expect(".o-column-stats-chart canvas").toHaveCount(0);
    expect(".o-column-stats-no-data").toHaveText("No numeric values to display.");
    expect(window.Chart).toHaveBeenCalledTimes(1);

    await click(fixture, '.o-button[data-id="count"]');
    expect(".o-column-stats-chart canvas").toHaveCount(1);
    expect(".o-column-stats-no-data").toHaveCount(0);
    expect(window.Chart).toHaveBeenCalledTimes(2);
  });
});
