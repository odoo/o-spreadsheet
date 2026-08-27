import { DataAnalysisStore } from "../../../src/components/side_panel/data_analysis/data_analysis_store";
import {
  clickAndDrag,
  createCarousel,
  createChart,
  extendMockGetBoundingClientRect,
  selectCell,
  setCellContent,
  simulateClick,
  triggerMouseEvent,
  undo,
} from "../../test_helpers";
import {
  createModelFromGrid,
  mockChart,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
} from "../../test_helpers/helpers";

test("suggestions are updated if the selection changes", async () => {
  const { model, env } = await mountSpreadsheet();
  const store = env.getStore(DataAnalysisStore);
  selectCell(model, "A1");
  await simulateClick(".o-data-analysis-button");
  expect(store.ranges).toEqual(["A1"]);
  selectCell(model, "A2");
  expect(store.ranges).toEqual(["A2"]);
});

test("clicking the data analysis button again closes the panel", async () => {
  await mountSpreadsheet();
  await simulateClick(".o-data-analysis-button");
  expect(".o-data-analysis-panel").toHaveCount(1);
  await simulateClick(".o-data-analysis-button");
  expect(".o-data-analysis-panel").toHaveCount(0);
});

test("shows a prompt to select data when the selection is empty", async () => {
  const { model, fixture } = await mountSpreadsheet();
  selectCell(model, "A1");
  await simulateClick(".o-data-analysis-button");
  expect(fixture.querySelector(".o-data-analysis-empty")?.textContent?.trim()).toBe(
    "Select cells containing data to see chart suggestions. Note that the order of selected columns can impact chart suggestions."
  );
});

test("shows a message when the selection has data but no chart can be suggested", async () => {
  const model = createModelFromGrid({ A1: "=1/0" });
  const { fixture } = await mountSpreadsheet({ model });
  selectCell(model, "A1");
  await simulateClick(".o-data-analysis-button");
  expect(fixture.querySelector(".o-data-analysis-empty")?.textContent?.trim()).toBe(
    "No chart suggestions available for the selected data. Note that the order of selected columns can impact chart suggestions."
  );
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

  test("drag and drop a chart suggestion creates a chart", async () => {
    const { model, fixture } = await mountSpreadsheet();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    expect(fixture.querySelector(".o-suggestion-canvas-wrap")).toBeTruthy();
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: 100 }, undefined, true);
    expect(model.getters.getChartIds(sheetId).length).toBe(1);
  });

  test("dropping the chart suggestion above the grid (e.g. on the headers) clamps it to the top-left cell", async () => {
    const { model, fixture } = await mountSpreadsheet();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    expect(fixture.querySelector(".o-suggestion-canvas-wrap")).toBeTruthy();
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: -50 }, undefined, true);
    expect(model.getters.getChartIds(sheetId).length).toBe(1);
    const figure = model.getters.getFigures(sheetId)[0];
    expect(figure.col).toBe(0);
    expect(figure.row).toBe(0);
  });

  test("drag a chart suggestion and drop it on a carousel merges the chart into the carousel", async () => {
    const model = createModelFromGrid({ A1: "1" });
    const sheetId = model.getters.getActiveSheetId();
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId", undefined, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "carouselId",
    });
    const { fixture } = await mountSpreadsheet({ model });
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    expect(fixture.querySelector(".o-suggestion-canvas-wrap")).toBeTruthy();
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: 100 }, undefined, false);
    expect(".o-figure[data-id=carouselId]").toHaveClass("o-add-to-carousel");
    expect(model.getters.getSelectedCarouselItem("carouselId")?.type).toEqual("carouselDataView");
    triggerMouseEvent(".o-suggestion-canvas-wrap", "pointerup", 150, 100);
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(2);
    expect(model.getters.getCarousel("carouselId").items[1].type).toEqual("chart");
    expect(model.getters.getSelectedCarouselItem("carouselId")?.type).toEqual("chart");
    undo(model);
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);
  });

  test("drag a chart suggestion and drop it on a carousel dispatches the ADD_NEW_CHART_TO_CAROUSEL command ", async () => {
    const model = createModelFromGrid({ A1: "1" });
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId", undefined, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "carouselId",
    });
    const { parent } = await mountSpreadsheet({ model });
    const dispatch = spyDispatch(parent);
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: 100 }, undefined, true);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("ADD_NEW_CHART_TO_CAROUSEL", expect.anything());
  });

  test("drag a chart suggestion and drop it on a chart merges the charts into a new carousel", async () => {
    const model = createModelFromGrid({ A1: "1" });
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, { type: "bar" }, "chartId", sheetId, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "chartFigureId",
    });
    const { fixture } = await mountSpreadsheet({ model });
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    expect(fixture.querySelector(".o-suggestion-canvas-wrap")).toBeTruthy();
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: 100 }, undefined, false);
    expect(".o-figure[data-id=chartFigureId]").toHaveClass("o-add-to-carousel");
    triggerMouseEvent(".o-suggestion-canvas-wrap", "pointerup", 150, 100);
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    const figure = model.getters.getFigures(sheetId)[0];
    expect(figure.tag).toEqual("carousel");
    expect(model.getters.getCarousel(figure.id).items).toHaveLength(2);
    expect(model.getters.getSelectedCarouselItem(figure.id)?.type).toEqual("chart");
    undo(model);
    const figuresAfterUndo = model.getters.getFigures(sheetId);
    expect(figuresAfterUndo).toHaveLength(1);
    expect(figuresAfterUndo[0]).toMatchObject({ tag: "chart", id: "chartFigureId" });
  });

  test("drag a chart suggestion and drop it on a chart dispatches the CREATE_CHART_AND_MERGE_INTO_CAROUSEL command ", async () => {
    const model = createModelFromGrid({ A1: "1" });
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, { type: "bar" }, "chartId", sheetId, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "chartFigureId",
    });
    const { parent } = await mountSpreadsheet({ model });
    const dispatch = spyDispatch(parent);
    selectCell(model, "A1");
    await simulateClick(".o-data-analysis-button");
    await clickAndDrag(".o-suggestion-canvas-wrap", { x: 150, y: 100 }, undefined, true);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith(
      "CREATE_CHART_AND_MERGE_INTO_CAROUSEL",
      expect.anything()
    );
  });
});
