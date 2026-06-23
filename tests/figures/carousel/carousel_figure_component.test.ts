import { ChartConfiguration } from "chart.js";
import { Model, UID } from "../../../src";
import { getCarouselMenuActions } from "../../../src/actions/figure_menu_actions";
import { ChartAnimationStore } from "../../../src/components/figures/chart/chartJs/chartjs_animation_store";
import { downloadFile } from "../../../src/components/helpers/dom_helpers";
import { SpreadsheetChildEnv } from "../../../src/types/spreadsheet_env";
import { xmlEscape } from "../../../src/xlsx/helpers/xml_helpers";
import {
  addNewChartToCarousel,
  createCarousel,
  createChart,
  paste,
  selectCarouselItem,
  selectFigure,
  undo,
  updateCarousel,
} from "../../test_helpers/commands_helpers";
import {
  click,
  clickAndDrag,
  doubleClick,
  getElStyle,
  triggerMouseEvent,
} from "../../test_helpers/dom_helper";
import { makeTestEnv, mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

jest.mock("../../../src/components/helpers/dom_helpers", () => {
  return {
    ...jest.requireActual("../../../src/components/helpers/dom_helpers"),
    downloadFile: jest.fn(),
  };
});

let model: Model;
let sheetId: UID;
let mockChartData: ChartConfiguration;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
  mockChartData = mockChart();
});

describe("Carousel figure component", () => {
  test("Can display an empty carousel", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    await mountSpreadsheet({ model });
    expect(".o-carousel .o-carousel-empty").toHaveCount(1);
  });

  test("Can click on a carousel tab to change the displayed content", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const radarId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    const barId = addNewChartToCarousel(model, "carouselId", { type: "bar" });
    const { fixture } = await mountSpreadsheet({ model });

    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({ chartId: radarId });
    expect(model.getters.getChartIdFromFigureId("carouselId")).toBe(radarId);

    expect(".o-carousel-tab").toHaveCount(2);
    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({ chartId: barId });
    expect(model.getters.getChartIdFromFigureId("carouselId")).toBe(barId);

    await click(fixture, ".o-carousel-tab:nth-child(1)");
    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({ chartId: radarId });
    expect(model.getters.getChartIdFromFigureId("carouselId")).toBe(radarId);
  });

  test("Carousel data view make the figure un-clickable", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });

    const { fixture } = await mountSpreadsheet({ model });
    expect(".o-carousel-header").toHaveClass("pe-auto");
    expect(getElStyle(".o-figure-wrapper", "pointer-events")).toBe("none");

    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(getElStyle(".o-figure-wrapper", "pointer-events")).toBe("auto");
  });

  test("Carousel tabs have the correct name", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    const { fixture } = await mountSpreadsheet({ model });

    const tabs = fixture.querySelectorAll(".o-carousel-tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveText("Data");
    expect(tabs[1]).toHaveText("Radar");
  });

  test("Can drag & drop a chart on a carousel to combine them", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId", undefined, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "carouselId",
    });
    createChart(model, { type: "bar" }, "chartId", undefined, {
      col: 0,
      row: 0,
      offset: { x: 300, y: 300 },
      size: { width: 200, height: 200 },
      figureId: "chartFigureId",
    });
    await mountSpreadsheet({ model });

    await clickAndDrag(
      ".o-figure[data-id=chartFigureId]",
      { x: -200, y: -200 },
      { x: 300, y: 300 },
      false
    );
    expect(".o-figure[data-id=carouselId]").toHaveClass("o-add-to-carousel");
    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({
      type: "carouselDataView",
    });

    triggerMouseEvent(".o-figure[data-id=chartFigureId]", "pointerup");
    expect(model.getters.getCarousel("carouselId")).toMatchObject({
      items: [{ type: "carouselDataView" }, { type: "chart", chartId: "chartId" }],
    });
    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({
      type: "chart",
      chartId: "chartId",
    });
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
  });

  test("When drag & dropping a chart, the chart merges with the closest carousel rather than the first one", async () => {
    createCarousel(model, { items: [] }, "carouselId1", undefined, {
      col: 0,
      row: 0,
      size: { width: 200, height: 200 },
      figureId: "carouselId1",
    });
    createCarousel(model, { items: [] }, "carouselId2", undefined, {
      col: 0,
      row: 0,
      offset: { x: 0, y: 200 },
      size: { width: 200, height: 200 },
      figureId: "carouselId2",
    });
    createChart(model, { type: "bar" }, "chartId", undefined, {
      col: 0,
      row: 0,
      offset: { x: 0, y: 0 },
      size: { width: 300, height: 300 },
      figureId: "chartFigureId",
    });
    await mountSpreadsheet({ model });

    // Move the chart down a bit, so it still overlaps the first carousel but is closer to the second one.
    await clickAndDrag(".o-figure[data-id=chartFigureId]", { x: 0, y: 80 }, { x: 0, y: 0 }, true);
    expect(model.getters.getCarousel("carouselId1").items).toHaveLength(0);
    expect(model.getters.getCarousel("carouselId2").items).toHaveLength(1);
  });

  describe("Drag & drop chart onto chart to create a carousel", () => {
    test("Creates a carousel with both charts when dragging a chart onto another", async () => {
      createChart(model, { type: "bar" }, "chartId1", undefined, {
        col: 0,
        row: 0,
        offset: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId1",
      });
      createChart(model, { type: "line" }, "chartId2", undefined, {
        col: 0,
        row: 0,
        offset: { x: 300, y: 300 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId2",
      });
      const targetFigure = model.getters.getFigure(sheetId, "chartFigureId1")!;
      await mountSpreadsheet({ model });

      // Move chartFigureId2 by (-250, -250) so its center (150,150) is within 100px of
      // chartFigureId1's center (100,100) — triggers chart-to-chart carousel creation
      await clickAndDrag(
        ".o-figure[data-id=chartFigureId2]",
        { x: -250, y: -250 },
        { x: 300, y: 300 },
        true
      );

      expect(model.getters.getFigures(sheetId)).toHaveLength(1);
      const [carouselFigure] = model.getters.getFigures(sheetId);
      expect(carouselFigure.tag).toBe("carousel");
      const carousel = model.getters.getCarousel(carouselFigure.id);
      const chartIds = new Set(
        carousel.items.map((item) => (item.type === "chart" ? item.chartId : undefined))
      );
      expect(carouselFigure.col).toBe(targetFigure.col);
      expect(carouselFigure.row).toBe(targetFigure.row);
      expect(carouselFigure.offset).toEqual(targetFigure.offset);
      expect(chartIds).toEqual(new Set(["chartId1", "chartId2"]));
    });

    test("Multiple selected charts dragged onto a chart are all merged into the new carousel", async () => {
      createChart(model, { type: "bar" }, "chartId1", undefined, {
        col: 0,
        row: 0,
        offset: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId1",
      });
      createChart(model, { type: "line" }, "chartId2", undefined, {
        col: 0,
        row: 0,
        offset: { x: 300, y: 300 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId2",
      });
      createChart(model, { type: "pie" }, "chartId3", undefined, {
        col: 0,
        row: 0,
        offset: { x: 310, y: 310 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId3",
      });
      selectFigure(model, "chartFigureId2");
      selectFigure(model, "chartFigureId3", true);
      await mountSpreadsheet({ model });

      // Primary dragged figure (chartFigureId2) overlaps chartFigureId1 after the move
      await clickAndDrag(
        ".o-figure[data-id=chartFigureId2]",
        { x: -250, y: -250 },
        { x: 300, y: 300 },
        true
      );

      expect(model.getters.getFigures(sheetId)).toHaveLength(1);
      const [carouselFigure] = model.getters.getFigures(sheetId);
      const carousel = model.getters.getCarousel(carouselFigure.id);
      expect(carousel.items).toHaveLength(3);
      const chartIds = new Set(
        carousel.items.map((item) => (item.type === "chart" ? item.chartId : undefined))
      );
      expect(chartIds).toEqual(new Set(["chartId1", "chartId2", "chartId3"]));
    });

    test("Undo restores the two independent charts", async () => {
      createChart(model, { type: "bar" }, "chartId1", undefined, {
        col: 0,
        row: 0,
        offset: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId1",
      });
      createChart(model, { type: "line" }, "chartId2", undefined, {
        col: 0,
        row: 0,
        offset: { x: 300, y: 300 },
        size: { width: 200, height: 200 },
        figureId: "chartFigureId2",
      });
      await mountSpreadsheet({ model });

      await clickAndDrag(
        ".o-figure[data-id=chartFigureId2]",
        { x: -250, y: -250 },
        { x: 300, y: 300 },
        true
      );
      expect(model.getters.getFigures(sheetId)).toHaveLength(1);
      expect(model.getters.getFigures(sheetId)[0].tag).toBe("carousel");

      undo(model);

      const figures = model.getters.getFigures(sheetId);
      expect(figures).toHaveLength(2);
      expect(figures.every((f) => f.tag === "chart")).toBe(true);
    });
  });

  test("Can define a carousel title", async () => {
    createCarousel(
      model,
      {
        items: [],
        title: {
          text: "Title1",
          fontSize: 20,
          bold: true,
        },
      },
      "carouselId"
    );
    updateCarousel(model, "carouselId", {
      items: [{ type: "carouselDataView" }],
    });
    await mountSpreadsheet({ model });

    expect(".o-figure .o-carousel-title").toHaveText("Title1");
    expect(getElStyle(".o-figure .o-carousel-title", "font-size")).toBe("20px");
    expect(getElStyle(".o-figure .o-carousel-title", "font-weight")).toBe("bold");
  });

  test("Carousel header has the correct background color", async () => {
    createCarousel(model, { items: [], title: { text: "Title" } }, "carouselId");
    await mountSpreadsheet({ model });

    // Empty carousel
    expect(".o-carousel-header").toHaveStyle({ "background-color": "#FFFFFF" });

    // Carousel with data view
    updateCarousel(model, "carouselId", { items: [{ type: "carouselDataView" }] });
    await nextTick();
    expect(".o-carousel-header").toHaveStyle({ "background-color": "#FFFFFF" });

    // Carousel with chart
    const chartId = addNewChartToCarousel(model, "carouselId", { background: "#123456" });
    selectCarouselItem(model, "carouselId", { type: "chart", chartId });
    await nextTick();
    expect(".o-carousel-header").toHaveStyle({ "background-color": "#123456" });
  });

  test("display chart menu", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "bar" });
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });
    expect(".o-chart-dashboard-item").toHaveCount(0); // nothing for the data view
    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(".o-chart-dashboard-item").toHaveCount(1); // ellipsis, no full screen
  });

  test("Chart animation is played at each carousel tab change", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const radarId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    const barId = addNewChartToCarousel(model, "carouselId", { type: "bar" });
    model.updateMode("dashboard");

    const { fixture, env } = await mountSpreadsheet({ model });
    const chartAnimationStore = env.getStore(ChartAnimationStore);
    const enableAnimationSpy = jest.spyOn(chartAnimationStore, "enableAnimationForChart");

    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(enableAnimationSpy).toHaveBeenLastCalledWith(barId);
    await click(fixture, ".o-carousel-tab:nth-child(1)");
    expect(enableAnimationSpy).toHaveBeenLastCalledWith(radarId);
    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(enableAnimationSpy).toHaveBeenLastCalledWith(barId);
  });

  test("Having too many tabs will put some of them inside a dropdown", async () => {
    extendMockGetBoundingClientRect({
      "o-carousel-tabs": () => ({ width: 200 }),
      "o-carousel-tab": () => ({ width: 100 }),
    });

    const getCarouselTabs = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".o-carousel-tab")).map((tab) => ({
        label: tab.textContent,
        isHidden: tab.style.display === "none",
      }));

    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "pie" });
    const { fixture } = await mountSpreadsheet({ model });

    expect(getCarouselTabs()).toEqual([
      { label: "Data", isHidden: false },
      { label: "Pie", isHidden: false },
    ]);
    expect(".o-carousel-tabs-dropdown").toHaveStyle({ display: "none" });

    const radarChartId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    addNewChartToCarousel(model, "carouselId", { type: "line" });
    await nextTick();

    expect(getCarouselTabs()).toEqual([
      { label: "Data", isHidden: false },
      { label: "Pie", isHidden: false },
      { label: "Radar", isHidden: true },
      { label: "Line", isHidden: true },
    ]);
    expect(".o-carousel-tabs-dropdown").toHaveStyle({ display: "block" });

    await click(fixture, ".o-carousel-tabs-dropdown");
    expect(".o-menu-item").toHaveCount(2);
    expect(".o-menu-item:nth-child(1)").toHaveText("Radar");
    expect(".o-menu-item:nth-child(2)").toHaveText("Line");

    await click(fixture, ".o-menu-item:nth-child(1)");
    expect(model.getters.getSelectedCarouselItem("carouselId")).toMatchObject({
      chartId: radarChartId,
    });
  });

  test("Can select multiple figure and create a carousel", async () => {
    createChart(model, { type: "bar" }, "baseChartId1", undefined, {
      col: 1,
      row: 1,
      offset: { x: 1, y: 1 },
      size: { width: 100, height: 100 },
      figureId: "baseChartFigureId",
    });
    createChart(model, { type: "bar" }, "additionalChartId1", undefined, {
      col: 5,
      row: 0,
      offset: { x: 2, y: 2 },
      size: { width: 200, height: 200 },
      figureId: "additionalChartFigureId1",
    });
    createChart(model, { type: "bar" }, "additionalChartId2", undefined, {
      col: 0,
      row: 5,
      offset: { x: 3, y: 3 },
      size: { width: 300, height: 300 },
      figureId: "additionalChartFigureId2",
    });

    selectFigure(model, "baseChartFigureId", true);
    selectFigure(model, "additionalChartFigureId1", true);
    selectFigure(model, "additionalChartFigureId2", true);

    const { fixture } = await mountSpreadsheet({ model });

    triggerMouseEvent(".o-figure[data-id=baseChartFigureId]", "contextmenu");
    await nextTick();

    const createCarouselItem = fixture
      .querySelectorAll(".o-menu-item")
      .values()
      .find((item) => item.textContent?.includes("Create carousel"))!;
    await click(createCarouselItem);

    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    const carouselFigure = model.getters.getFigures(sheetId)[0];
    const carousel = model.getters.getCarousel(carouselFigure.id);
    expect(carousel.items).toHaveLength(3);
    expect(
      new Set(carousel.items.map((item) => (item.type === "chart" ? item.chartId : undefined)))
    ).toEqual(new Set(["baseChartId1", "additionalChartId1", "additionalChartId2"]));
  });

  test("Can open carousel context menu with both right click and the menu icon", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const { fixture } = await mountSpreadsheet({ model });

    triggerMouseEvent(".o-figure", "contextmenu");
    await nextTick();
    expect(".o-popover .o-menu").toHaveCount(1);

    await click(fixture, ".o-grid"); // close the menu
    expect(".o-popover .o-menu").toHaveCount(0);

    await click(fixture, ".o-figure .o-carousel-menu-button");
    expect(".o-popover .o-menu").toHaveCount(1);
  });

  test("Double Click opens either the carousel or the chart side panel", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const chartId = addNewChartToCarousel(model, "carouselId", { type: "radar" });

    const { fixture, env } = await mountSpreadsheet({ model }, {});
    const openSidePanel = jest.spyOn(env, "openSidePanel");

    await doubleClick(fixture, ".o-chart-container");
    expect(openSidePanel).toHaveBeenLastCalledWith("ChartPanel", { chartId });

    await doubleClick(fixture, ".o-carousel-header");
    expect(openSidePanel).toHaveBeenLastCalledWith("CarouselPanel", { figureId: "carouselId" });
  });

  describe("Carousel menu items", () => {
    let env: SpreadsheetChildEnv;
    let openSidePanel: jest.Mock;

    function getCarouselMenuItem(figureId: UID, actionId: string) {
      return getCarouselMenuActions(figureId, env).find((action) => action.id === actionId);
    }

    beforeEach(() => {
      openSidePanel = jest.fn();
      env = makeTestEnv({ model, openSidePanel });
    });

    test("Can edit the carousel", () => {
      createCarousel(model, { items: [] }, "carouselId");

      const action = getCarouselMenuItem("carouselId", "edit_carousel");
      action?.execute?.(env);
      expect(openSidePanel).toHaveBeenCalledWith("CarouselPanel", { figureId: "carouselId" });
    });

    test("Can edit a carousel chart", () => {
      createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
      addNewChartToCarousel(model, "carouselId", { type: "radar" });

      const action = getCarouselMenuItem("carouselId", "edit_chart");
      action?.execute?.(env);
      expect(openSidePanel).toHaveBeenCalledWith("ChartPanel", {});
    });

    test("Can delete the figure", () => {
      createCarousel(model, { items: [] }, "carouselId");

      const action = getCarouselMenuItem("carouselId", "delete");
      action?.execute?.(env);
      expect(model.getters.getFigures(sheetId)).toHaveLength(0);
    });

    test("Can delete a carousel item", () => {
      createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");

      const action = getCarouselMenuItem("carouselId", "delete_carousel_item");
      expect(action?.isVisible(env)).toBe(true);
      action?.execute?.(env);

      expect(model.getters.getCarousel("carouselId").items).toHaveLength(0);
      expect(action?.isVisible(env)).toBe(false);
    });

    test("Can copy the carousel", () => {
      createCarousel(model, { items: [] }, "carouselId");
      const action = getCarouselMenuItem("carouselId", "copy");
      action?.execute?.(env);

      paste(model, "A1");
      expect(model.getters.getFigures(sheetId)).toHaveLength(2);
    });

    test("Can cut the carousel", () => {
      createCarousel(model, { items: [] }, "carouselId");
      const action = getCarouselMenuItem("carouselId", "cut");
      action?.execute?.(env);

      paste(model, "A1");
      expect(model.getters.getFigures(sheetId)).toHaveLength(1);
      expect(model.getters.getFigure(sheetId, "carouselId")).toBeUndefined();
    });

    test("Can copy the carousel chart as image", async () => {
      createCarousel(model, { items: [] }, "carouselId");
      addNewChartToCarousel(model, "carouselId", { type: "radar" });
      const action = getCarouselMenuItem("carouselId", "copy_as_image");
      action?.execute?.(env);
      await nextTick();

      const clipboard = await env.clipboard.read!();
      if (clipboard.status !== "ok") {
        throw new Error("Clipboard read failed");
      }
      const clipboardContent = clipboard.content;

      const imgData = new window.Chart("test", mockChartData as any).toBase64Image();

      expect(clipboardContent).toMatchObject({
        "text/html": `<img src="${xmlEscape(imgData)}" />`,
        "image/png": expect.any(Blob),
      });
    });

    test("Can download the carousel chart as image", async () => {
      createCarousel(model, { items: [] }, "carouselId");
      addNewChartToCarousel(model, "carouselId", { type: "radar" });

      const action = getCarouselMenuItem("carouselId", "download");
      action?.execute?.(env);
      await nextTick();
      expect(downloadFile).toHaveBeenCalled();
    });

    test("Chart menu items are not visible when the carousel selected item is not a chart", () => {
      createCarousel(model, { items: [] }, "carouselId");

      expect(getCarouselMenuItem("carouselId", "edit_chart")?.isVisible(env)).toBe(false);
      expect(getCarouselMenuItem("carouselId", "copy_as_image")?.isVisible(env)).toBe(false);
      expect(getCarouselMenuItem("carouselId", "download")?.isVisible(env)).toBe(false);

      addNewChartToCarousel(model, "carouselId", { type: "radar" });
      expect(getCarouselMenuItem("carouselId", "edit_chart")?.isVisible(env)).toBe(true);
      expect(getCarouselMenuItem("carouselId", "copy_as_image")?.isVisible(env)).toBe(true);
      expect(getCarouselMenuItem("carouselId", "download")?.isVisible(env)).toBe(true);
    });
  });
});
