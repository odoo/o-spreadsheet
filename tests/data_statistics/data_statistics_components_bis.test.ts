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

describe("drag and drop statistics", () => {
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
  test("dragging a 2-column category stat item creates a scorecard with SUMIF formula", async () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      B1: "100",
      A2: "Meat",
      B2: "200",
      A3: "Fruits",
      B3: "150",
    });
    const sheetId = model.getters.getActiveSheetId();
    await mountSpreadsheet({ model });

    setSelection(model, ["A1:B3"]);
    await simulateClick(".o-data-analysis-button");

    await clickAndDrag(`[data-test-id="fruits"]`, { x: 150, y: 100 }, undefined, true);

    const chartIds = model.getters.getChartIds(sheetId);
    expect(chartIds).toHaveLength(1);
    const definition = model.getters.getChartDefinition(chartIds[0]);

    expect(definition).toMatchObject({
      type: "scorecard",
      keyValue: `=SUMIF(A1:A3,"Fruits",B1:B3)`,
    });
  });
});

describe("columns type", () => {
  test("updates category sum stat items when a cell value changes", async () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      B1: "100",
      A2: "Fruits",
      B2: "200",
    });
    await mountSpreadsheet({ model });

    setSelection(model, ["A1:B2"]);
    await simulateClick(".o-data-analysis-button");

    expect(`[data-test-id="fruits"]`).toHaveText("300");

    setCellContent(model, "B1", "500");
    await nextTick();

    expect(`[data-test-id="fruits"]`).toHaveText("700");
  });

  test("updates date sums when changing granularity dropdown in 2-columns mode", async () => {
    const model = createModelFromGrid({
      A1: "2026-01-01",
      B1: "100",
      A2: "2026-02-01",
      B2: "200",
      A3: "2026-01-15",
      B3: "150",
    });
    await mountSpreadsheet({ model });

    setSelection(model, ["A1:B3"]);
    await simulateClick(".o-data-analysis-button");

    await simulateClick(".o-stat-sort-header .o-select");
    await simulateClick(`.o-select-option[data-id="year"]`);
    expect(`[data-test-id="2026"]`).toHaveText("450");
  });
});

describe("hovering a stat row highlights matching cells", () => {
  test("hovering a category sum row highlights matching category cells : category-value case", async () => {
    const model = createModelFromGrid({
      A1: "Fruits",
      B1: "100",
      A2: "Meat",
      B2: "200",
      A3: "Fruits",
      B3: "150",
    });
    const { env } = await mountSpreadsheet({ model });

    setSelection(model, ["A1:B3"]);
    await simulateClick(".o-data-analysis-button");

    triggerMouseEvent(`[data-test-id="fruits"]`, "mouseenter");
    await nextTick();

    expect(getHighlightsFromStore(env)).toHaveLength(4);

    triggerMouseEvent(`[data-test-id="fruits"]`, "mouseleave");
    await nextTick();
    expect(getHighlightsFromStore(env)).toHaveLength(0);
  });

  const granularitiesToTest = [
    { name: "year", targetID: "2024" },
    { name: "quarter", targetID: "q1" },
    { name: "month", targetID: "m3" },
    { name: "week", targetID: "14" },
    { name: "weekday", targetID: "d4" },
    { name: "day", targetID: "d4" },
    { name: "date", targetID: "45386" },
  ];
  for (const { name, targetID } of granularitiesToTest) {
    test(`hovering a category sum row highlights matching category cells : date-value case (${name})`, async () => {
      const model = createModelFromGrid({
        A1: "3/4/2024",
        A2: "3/4/2024",
        A3: "4/4/2024",
        A4: "3/4/2024",
        B1: "100",
        B2: "200",
        B3: "450",
        B4: "200",
      });

      const { env } = await mountSpreadsheet({ model });

      setSelection(model, ["A1:B4"]);
      await simulateClick(".o-data-analysis-button");

      if (name !== "month") {
        await simulateClick(".o-stat-sort-header .o-select");
        await simulateClick(`.o-select-option[data-id=${name}]`);
      }

      triggerMouseEvent(`[data-test-id=${targetID}]`, "mouseenter");
      await nextTick();

      expect(getHighlightsFromStore(env)).not.toHaveLength(0);

      triggerMouseEvent(`[data-test-id=${targetID}]`, `mouseleave`);
      await nextTick();
      expect(getHighlightsFromStore(env)).toHaveLength(0);
    });
  }
});
