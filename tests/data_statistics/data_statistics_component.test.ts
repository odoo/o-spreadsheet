import { ClipboardMIMEType } from "../../src";
import {
  clickAndDrag,
  extendMockGetBoundingClientRect,
  setCellContent,
  setSelection,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers";
import {
  createModelFromGrid,
  getHighlightsFromStore,
  mockChart,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

describe("data statistics", () => {
  beforeEach(() => {
    mockChart();
    extendMockGetBoundingClientRect({
      "o-grid-overlay": () => ({
        height: 1000,
        width: 1000,
        top: 0,
        left: 0,
        bottom: 1000,
        right: 1000,
      }),
    });
  });

  test("renders 7 rows for general statistics + one row per unique category", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    expect(".o-data-analysis-row").toHaveCount(9);
    expect('[data-test-id="unique"]').toHaveText("2");
    expect('[data-test-id="apple"]').toHaveText("1");
    expect('[data-test-id="banana"]').toHaveText("2");
  });

  test("statistics occurrences are case insensitive", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "BANANA" });
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    expect('[data-test-id="banana"]').toHaveText("2");
  });

  test("statistics are updated if the selection changes", async () => {
    const grid = { A1: "apple", A2: "banana", A3: "banana" };
    const model = createModelFromGrid(grid);
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    expect('[data-test-id="unique"]').toHaveText("2");
    setSelection(model, ["A2:A3"]);
    await nextTick();
    expect('[data-test-id="unique"]').toHaveText("1");
  });

  test("statistics are updated when a cell's content changes", async () => {
    const grid = { A1: "apple", A2: "banana", A3: "banana" };
    const model = createModelFromGrid(grid);
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    expect('[data-test-id="unique"]').toHaveText("2");
    setCellContent(model, "A3", "cherry");
    await nextTick();
    expect('[data-test-id="unique"]').toHaveText("3");
  });

  describe("sorting occurrences", () => {
    test("occurrences are sorted by descending count", async () => {
      const grid = { A1: "apple", A2: "banana", A3: "cherry", A4: "cherry" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A4"]);
      await simulateClick(".o-data-analysis-button");
      const rows = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTexts = Array.from(rows).map((row) => row.textContent);
      expect(rowTexts).toEqual(["cherry", "apple", "banana"]);
    });

    test("occurrences can be sorted alphabetically, or by apparition order if no sorting", async () => {
      const grid = { A1: "banana", A2: "apple", A3: "cherry", A4: "cherry" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A4"]);
      await simulateClick(".o-data-analysis-button");
      await simulateClick("[data-test-id='o-sort-occurrences']");
      const rows = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTexts = Array.from(rows).map((row) => row.textContent);
      expect(rowTexts).toEqual(["apple", "banana", "cherry"]);
      await simulateClick("[data-test-id='o-sort-occurrences']");
      const rowsDesc = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTextsDesc = Array.from(rowsDesc).map((row) => row.textContent);
      expect(rowTextsDesc).toEqual(["cherry", "banana", "apple"]);
      await simulateClick("[data-test-id='o-sort-occurrences']");
      const rowsNone = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTextsNone = Array.from(rowsNone).map((row) => row.textContent);
      expect(rowTextsNone).toEqual(["banana", "apple", "cherry"]);
    });

    test("occurrences can be sorted by count, or by apparition order if no sorting", async () => {
      const grid = { A1: "banana", A2: "apple", A3: "cherry", A4: "cherry" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A4"]);
      await simulateClick(".o-data-analysis-button");
      const sortButtons = document.querySelectorAll("[data-test-id='o-sort-occurrences']");
      await simulateClick(sortButtons[1]);
      const rowsDesc = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTextsDesc = Array.from(rowsDesc).map((row) => row.textContent);
      expect(rowTextsDesc).toEqual(["apple", "banana", "cherry"]);
      await simulateClick(sortButtons[1]);
      const rows = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTexts = Array.from(rows).map((row) => row.textContent);
      expect(rowTexts).toEqual(["banana", "apple", "cherry"]);
    });
  });

  describe("drag and drop statistics", () => {
    test("dragging a stat row onto the grid creates a scorecard chart using its formula", async () => {
      const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
      const sheetId = model.getters.getActiveSheetId();
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      await clickAndDrag(".o-data-analysis-row", { x: 150, y: 100 }, undefined, true);
      const chartIds = model.getters.getChartIds(sheetId);
      expect(chartIds).toHaveLength(1);
      const definition = model.getters.getChartDefinition(chartIds[0]);
      expect(definition).toMatchObject({
        type: "scorecard",
        keyValue: "=COUNTA(A1:A3)",
        title: { text: "Non-empty cells" },
      });
    });

    test("a non-primary mouse button does not start a chart drag", async () => {
      const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
      const sheetId = model.getters.getActiveSheetId();
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      triggerMouseEvent(".o-data-analysis-row", "pointerdown", 10, 10, { button: 2 });
      triggerMouseEvent(".o-data-analysis-row", "pointermove", 150, 100, { button: 2 });
      await nextTick();
      expect(".o-chart-drag-preview").toHaveCount(0);
      triggerMouseEvent(".o-data-analysis-row", "pointerup", 150, 100, { button: 2 });
      await nextTick();
      expect(model.getters.getChartIds(sheetId)).toHaveLength(0);
    });
  });

  describe("context menu", () => {
    test("right-clicking a stat row opens a menu with copy and insert-scorecard actions", async () => {
      const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      triggerMouseEvent(".o-data-analysis-row", "contextmenu", 10, 10);
      await nextTick();
      expect(".o-menu-item").toHaveCount(2);
      expect('.o-menu-item[data-name="copy_to_clipboard"]').toHaveCount(1);
      expect('.o-menu-item[data-name="insert_scorecard"]').toHaveCount(1);
    });

    test("'Insert scorecard' creates a scorecard chart and closes the menu", async () => {
      const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
      const sheetId = model.getters.getActiveSheetId();
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      triggerMouseEvent(".o-data-analysis-row", "contextmenu", 10, 10);
      await nextTick();
      await simulateClick('.o-menu-item[data-name="insert_scorecard"]');
      expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
      expect(".o-menu-item").toHaveCount(0);
    });

    test("'Copy formula to clipboard'", async () => {
      const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "banana" });
      const { env } = await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      triggerMouseEvent(".o-data-analysis-row", "contextmenu", 10, 10);
      await nextTick();
      await simulateClick('.o-menu-item[data-name="copy_to_clipboard"]');
      const clipboard = await env.clipboard.read!();
      expect(clipboard.status).toBe("ok");
      if (clipboard.status === "ok") {
        expect(clipboard.content[ClipboardMIMEType.PlainText]).toBe("=COUNTA(A1:A3)");
      }
    });
  });

  describe("columns type", () => {
    test("statistics are available for booleans columns", async () => {
      const grid = { A1: "true", A2: "false", A3: "true" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      expect('[data-test-id="unique"]').toHaveText("2");
      const rows = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTexts = Array.from(rows).map((row) => row.textContent);
      expect(rowTexts).toEqual(["TRUE", "FALSE"]);
    });

    test("statistics are available for numbers columns", async () => {
      const grid = { A1: "1", A2: "2", A3: "1" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      expect('[data-test-id="non_empty"]').toHaveText("3");
      expect('[data-test-id="unique"]').toHaveText("2");
      expect('[data-test-id="sum"]').toHaveText("4");
      expect('[data-test-id="median"]').toHaveText("1");
      expect('[data-test-id="average"]').toHaveText("1.3333");
      expect('[data-test-id="max"]').toHaveText("2");
      expect('[data-test-id="min"]').toHaveText("1");
      const rows = document.querySelectorAll(
        "[data-test-id='Occurrences'] [data-test-id='stat-name']"
      );
      const rowTexts = Array.from(rows).map((row) => row.textContent);
      expect(rowTexts).toEqual(["1", "2"]);
    });

    test("statistics are available for date columns", async () => {
      const grid = { A1: "2023-01-01", A2: "2023-01-02", A3: "2023-01-01" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      expect('[data-test-id="non_empty"]').toHaveText("3");
      expect('[data-test-id="unique"]').toHaveText("2");
      expect('[data-test-id="median"]').toHaveText("2023-01-01");
      expect('[data-test-id="average"]').toHaveText("2023-01-01");
      expect('[data-test-id="max"]').toHaveText("2023-01-02");
      expect('[data-test-id="min"]').toHaveText("2023-01-01");
      expect('[data-test-id="m0"]').toHaveText("3");
    });

    test("date occurrences can be calculated by granularity", async () => {
      const grid = { A1: "2023-01-01", A2: "2023-01-02", A3: "2023-01-01" };
      const model = createModelFromGrid(grid);
      await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      await simulateClick(".o-stat-sort-header .o-select");
      const options = document.querySelectorAll<HTMLOptionElement>(".o-popover .o-select-option");
      const optionValues = Array.from(options).map((option) => option.dataset.id);
      expect(optionValues).toEqual(["year", "month", "day"]);
      await simulateClick('.o-select-option[data-id="year"]');
      expect('[data-test-id="2023"]').toHaveText("3");
      await simulateClick(".o-stat-sort-header .o-select");
      await simulateClick('.o-select-option[data-id="day"]');
      expect('[data-test-id="d0"]').toHaveText("2");
      expect('[data-test-id="d1"]').toHaveText("1");
    });
  });

  describe("hovering a stat row highlights matching cells", () => {
    test("hovering a stat row highlights matching cells", async () => {
      const grid = { A1: "apple", A2: "banana", A3: "banana" };
      const model = createModelFromGrid(grid);
      const { env } = await mountSpreadsheet({ model });
      setSelection(model, ["A1:A3"]);
      await simulateClick(".o-data-analysis-button");
      triggerMouseEvent('[data-test-id="banana"]', "mouseenter");
      await nextTick();
      expect(getHighlightsFromStore(env)).toHaveLength(2);
      triggerMouseEvent('[data-test-id="banana"]', "mouseleave");
      await nextTick();
      expect(getHighlightsFromStore(env)).toHaveLength(0);
    });
  });
});
