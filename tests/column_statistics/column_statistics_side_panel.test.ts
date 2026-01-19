import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../src";
import { ColumnStatisticsStore } from "../../src/components/side_panel/column_stats/column_stats_store";
import { SidePanels } from "../../src/components/side_panel/side_panels/side_panels";
import { formatValue } from "../../src/helpers";
import { click } from "../test_helpers";
import {
  deleteRows,
  selectCell,
  setCellContent,
  setCellFormat,
  setSelection,
} from "../test_helpers/commands_helpers";
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

  test("Column stats side panel is correctly filled for numerical data", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30", A4: "40", A5: "50", A6: "10" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Total rows"]')?.textContent).toBe("100");
    expect(fixture.querySelector('[data-test-id="Empty cells"]')?.textContent).toBe("94");
    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("5");
    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("160.00");
    expect(fixture.querySelector('[data-test-id="Average"]')?.textContent).toBe("26.67");
    expect(fixture.querySelector('[data-test-id="Median"]')?.textContent).toBe("25.00");
    expect(fixture.querySelector('[data-test-id="Minimum value"]')?.textContent).toBe("10.00");
    expect(fixture.querySelector('[data-test-id="Maximum value"]')?.textContent).toBe("50.00");

    const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    const values = Array.from(fixture.querySelectorAll(".frequency_value")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["10.00", "20.00", "30.00", "40.00", "50.00"]);
    expect(values).toEqual(["2", "1", "1", "1", "1"]);
  });

  test("Column stats side panel is correctly filled for string data", async () => {
    setGrid(model, { A1: "a", A2: "b", A3: "c", A4: "d", A5: "e", A6: "a" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Total rows"]')?.textContent).toBe("100");
    expect(fixture.querySelector('[data-test-id="Empty cells"]')?.textContent).toBe("94");
    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("5");
    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Average"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Median"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Minimum value"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Maximum value"]')?.textContent).toBe("—");

    const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    const values = Array.from(fixture.querySelectorAll(".frequency_value")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["a", "b", "c", "d", "e"]);
    expect(values).toEqual(["2", "1", "1", "1", "1"]);
  });

  test("Column stats side panel is correctly filled for empty data", async () => {
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Total rows"]')?.textContent).toBe("100");
    expect(fixture.querySelector('[data-test-id="Empty cells"]')?.textContent).toBe("100");
    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Average"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Median"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Minimum value"]')?.textContent).toBe("—");
    expect(fixture.querySelector('[data-test-id="Maximum value"]')?.textContent).toBe("—");

    const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    const values = Array.from(fixture.querySelectorAll(".frequency_value")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual([]);
    expect(values).toEqual([]);
  });

  test("String data are ignored in the column stats side panel when there is numerical data in the same column", async () => {
    setGrid(model, { A1: "a", A2: "10", A3: "20", A4: "30", A5: "b", A6: "c" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Total rows"]')?.textContent).toBe("100");
    expect(fixture.querySelector('[data-test-id="Empty cells"]')?.textContent).toBe("94");
    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("6");
    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("60.00");
    expect(fixture.querySelector('[data-test-id="Average"]')?.textContent).toBe("20.00");
    expect(fixture.querySelector('[data-test-id="Median"]')?.textContent).toBe("20.00");
    expect(fixture.querySelector('[data-test-id="Minimum value"]')?.textContent).toBe("10.00");
    expect(fixture.querySelector('[data-test-id="Maximum value"]')?.textContent).toBe("30.00");

    const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    const values = Array.from(fixture.querySelectorAll(".frequency_value")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["10.00", "20.00", "30.00"]);
    expect(values).toEqual(["1", "1", "1"]);
  });

  test("Column stats side panel is correctly updated when changing selection", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30", A4: "40", A5: "50", A6: "10" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("160.00");

    selectCell(model, "B1");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("—");
  });

  test("Column stats side panel is showing an error message when selecting multiple columns", async () => {
    setGrid(model, { A1: "10", A2: "20", B1: "30", B2: "40" });
    setSelection(model, ["A1", "B1"]);
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Total rows"]')).toBeNull();
    expect(fixture.querySelector(".o-column-stats-empty")?.textContent.trim()).toBe(
      "Select a single column to view statistics."
    );
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

  test("Can ignore header cell", async () => {
    setGrid(model, { A1: "Header", A2: "a", A3: "b", A4: "c" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("4");
    const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["Header", "a", "b", "c"]);

    await click(fixture, 'input[name="ignore_header"]');

    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("3");
    const labelsAfter = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    expect(labelsAfter).toEqual(["a", "b", "c"]);
  });

  test("Content of the first row is set as side panel title if string", async () => {
    setGrid(model, { A1: "10", A2: "20" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector(".o-column-stats-title")?.textContent).toBe("Column A");

    setCellContent(model, "A1", "Header");
    await nextTick();

    expect(fixture.querySelector(".o-column-stats-title")?.textContent).toBe("Header");
  });

  test("Side panel reacts to change of cell content", async () => {
    setGrid(model, { A1: "10", A2: "20" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("30.00");

    setCellContent(model, "A3", "30");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe("60.00");
  });

  test("Side panel reacts to deletion of row", async () => {
    setGrid(model, { A1: "10", A2: "20", A3: "30" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("3");

    deleteRows(model, [1]);
    await nextTick();

    expect(fixture.querySelector('[data-test-id="Unique values"]')?.textContent).toBe("2");
  });

  test("Can change the order of frequency table", async () => {
    setGrid(model, { A1: "b", A2: "a", A3: "c", A4: "a", A5: "b", A6: "a" });
    selectCell(model, "A1");
    env.openSidePanel("ColumnStats");
    await nextTick();

    let labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["a", "b", "c"]);

    await click(fixture, 'button[data-id="ascending"]');

    labels = Array.from(fixture.querySelectorAll(".frequency_label")).map((el) => el.textContent);
    expect(labels).toEqual(["c", "b", "a"]);
  });

  test.each(["#,##0.00", "[$$]#,##0.00", "0.00%"])(
    "Column stats side panel use correct number format",
    async (format) => {
      setGrid(model, { A1: "10.5", A2: "20.3", A3: "30.7" });
      setCellFormat(model, "A1", format);
      model.getters.getCellFormat = () => format;
      selectCell(model, "A1");
      env.openSidePanel("ColumnStats");
      await nextTick();
      const localeFormat = { locale: model.getters.getLocale(), format };

      expect(fixture.querySelector('[data-test-id="Sum"]')?.textContent).toBe(
        formatValue(61.5, localeFormat)
      );

      const labels = Array.from(fixture.querySelectorAll(".frequency_label")).map(
        (el) => el.textContent
      );
      expect(labels).toEqual([
        formatValue(10.5, localeFormat),
        formatValue(20.3, localeFormat),
        formatValue(30.7, localeFormat),
      ]);
    }
  );
});
