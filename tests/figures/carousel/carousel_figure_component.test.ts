import { ChartConfiguration } from "chart.js";
import { Model, SpreadsheetChildEnv, UID } from "../../../src";
import { getCarouselMenuActions } from "../../../src/actions/figure_menu_actions";
import { ChartAnimationStore } from "../../../src/components/figures/chart/chartJs/chartjs_animation_store";
import { downloadFile } from "../../../src/components/helpers/dom_helpers";
import { xmlEscape } from "../../../src/xlsx/helpers/xml_helpers";
import {
  addNewChartToCarousel,
  createCarousel,
  createChart,
  paste,
  updateCarousel,
} from "../../test_helpers/commands_helpers";
import { click, clickAndDrag, getElStyle, triggerMouseEvent } from "../../test_helpers/dom_helper";
import { makeTestEnv, mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

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
    createCarousel(model, { items: [] }, "carouselId", undefined, {
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

    triggerMouseEvent(".o-figure[data-id=chartFigureId]", "pointerup");
    expect(model.getters.getCarousel("carouselId")).toMatchObject({
      items: [{ type: "chart", chartId: "chartId" }],
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

  test("display chart menu", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "bar" });
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });
    expect(".o-chart-dashboard-item").toHaveCount(0); // nothing for the data view
    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(".o-chart-dashboard-item").toHaveCount(2); // ellipsis and fullscreen
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

  describe("Carousel menu items", () => {
    let env: SpreadsheetChildEnv;
    let openSidePanel: jest.Mock;

    function getCarouselMenuItem(
      figureId: UID,
      actionId: string,
      onFigureDeleted: () => void = () => {}
    ) {
      return getCarouselMenuActions(figureId, onFigureDeleted, env).find(
        (action) => action.id === actionId
      );
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

      const onFigureDeleted = jest.fn();
      const action = getCarouselMenuItem("carouselId", "delete", onFigureDeleted);
      action?.execute?.(env);
      expect(model.getters.getFigures(sheetId)).toHaveLength(0);
      expect(onFigureDeleted).toHaveBeenCalled();
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

      const imgData = new window.Chart("test", mockChartData).toBase64Image();

      expect(clipboardContent).toMatchObject({
        "text/html": `<img src="${xmlEscape(imgData)}" />`,
        "image/png": expect.any(Blob),
      });
    });

    test("Can download the carousel chart as image", () => {
      createCarousel(model, { items: [] }, "carouselId");
      addNewChartToCarousel(model, "carouselId", { type: "radar" });

      const action = getCarouselMenuItem("carouselId", "download");
      action?.execute?.(env);

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
