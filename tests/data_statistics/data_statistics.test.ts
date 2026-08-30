import { ClipboardMIMEType } from "../../src";
import {
  clickAndDrag,
  extendMockGetBoundingClientRect,
  setSelection,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers";
import {
  createModelFromGrid,
  mockChart,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

test("shows a placeholder message when there are no statistics for the selection", async () => {
  const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
  const { fixture } = await mountSpreadsheet({ model });
  setSelection(model, ["A1:A3"]);
  await simulateClick(".o-data-analysis-button");
  expect(fixture.querySelector(".o-column-global-stats")?.textContent?.trim()).toBe(
    "Statistics for this selection are not yet available"
  );
  expect(".o-data-analysis-row").toHaveCount(0);
});

test("renders one row per unique category plus a unique-count summary row", async () => {
  const model = createModelFromGrid({ A1: "banana", A2: "apple", A3: "banana" });
  await mountSpreadsheet({ model });
  setSelection(model, ["A1:A3"]);
  await simulateClick(".o-data-analysis-button");
  expect(".o-data-analysis-row").toHaveCount(3);
  expect('[data-test-id="Unique categories"]').toHaveText("2");
  expect('[data-test-id="apple"]').toHaveText("1");
  expect('[data-test-id="banana"]').toHaveText("2");
});

describe("drag and drop chart suggestions", () => {
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

  test("data statistics > statistics are updated if the selection changes", async () => {
    const grid = { A1: "apple", A2: "apple", A3: "banana" };
    const model = createModelFromGrid(grid);
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    expect('[data-test-id="Unique categories"]').toHaveText("2");
    setSelection(model, ["A1:A2"]);
    await nextTick();
    expect('[data-test-id="Unique categories"]').toHaveText("1");
  });

  test("dragging a stat row onto the grid creates a scorecard chart using its formula", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const sheetId = model.getters.getActiveSheetId();
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    await clickAndDrag(".o-stat-draggable", { x: 150, y: 100 }, undefined, true);
    const chartIds = model.getters.getChartIds(sheetId);
    expect(chartIds).toHaveLength(1);
    const definition = model.getters.getChartDefinition(chartIds[0]);
    expect(definition).toMatchObject({
      type: "scorecard",
      keyValue: "=COUNTUNIQUE(A1:A3)",
      title: { text: "Unique categories" },
    });
  });

  // test("a non-primary mouse button does not start a chart drag", async () => {
  //   const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
  //   const sheetId = model.getters.getActiveSheetId();
  //   await mountSpreadsheet({ model });
  //   setSelection(model, ["A1:A3"]);
  //   await simulateClick(".o-data-analysis-button");
  //   triggerMouseEvent(".o-stat-draggable", "pointerdown", 10, 10, { button: 2 });
  //   triggerMouseEvent(".o-stat-draggable", "pointermove", 150, 100, { button: 2 });
  //   await nextTick();
  //   expect(".o-chart-drag-preview").toHaveCount(0);
  //   triggerMouseEvent(".o-stat-draggable", "pointerup", 150, 100, { button: 2 });
  //   await nextTick();
  //   expect(model.getters.getChartIds(sheetId)).toHaveLength(0);
  // });
});

describe("context menu", () => {
  test("right-clicking a stat row opens a menu with copy and insert-scorecard actions", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    triggerMouseEvent(".o-stat-draggable", "contextmenu", 10, 10);
    await nextTick();
    expect(".o-menu-item").toHaveCount(2);
    expect('.o-menu-item[data-name="copy_to_clipboard"]').toHaveCount(1);
    expect('.o-menu-item[data-name="insert_scorecard"]').toHaveCount(1);
  });

  test("'Insert scorecard' creates a scorecard chart and closes the menu", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const sheetId = model.getters.getActiveSheetId();
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    triggerMouseEvent(".o-stat-draggable", "contextmenu", 10, 10);
    await nextTick();
    await simulateClick('.o-menu-item[data-name="insert_scorecard"]');
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
    expect(".o-menu-item").toHaveCount(0);
  });

  test("'Copy formula to clipboard' copies the row's evaluated value as text", async () => {
    const model = createModelFromGrid({ A1: "apple", A2: "banana", A3: "apple" });
    const { env } = await mountSpreadsheet({ model });
    setSelection(model, ["A1:A3"]);
    await simulateClick(".o-data-analysis-button");
    triggerMouseEvent(".o-stat-draggable", "contextmenu", 10, 10);
    await nextTick();
    await simulateClick('.o-menu-item[data-name="copy_to_clipboard"]');
    const clipboard = await env.clipboard.read!();
    expect(clipboard.status).toBe("ok");
    if (clipboard.status === "ok") {
      expect(clipboard.content[ClipboardMIMEType.PlainText]).toBe("2");
    }
  });
});
