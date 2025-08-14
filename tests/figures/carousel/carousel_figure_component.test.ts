import { Model } from "../../../src";
import {
  addNewChartToCarousel,
  createCarousel,
  createChart,
  updateCarousel,
} from "../../test_helpers/commands_helpers";
import {
  click,
  clickAndDrag,
  getElStyle,
  simulateClick,
  triggerMouseEvent,
} from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart();

let model: Model;

beforeEach(() => {
  model = new Model();
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
    expect(model.getters.getFigures(model.getters.getActiveSheetId())).toHaveLength(1);
  });

  test("Can define a carousel title in a carousel item", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const radarId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    updateCarousel(model, "carouselId", {
      items: [
        { type: "chart", chartId: radarId, carouselTitle: { text: "Title1", fontSize: 20 } },
        { type: "carouselDataView", carouselTitle: { text: "Title2", bold: true } },
      ],
    });
    const { fixture } = await mountSpreadsheet({ model });

    expect(".o-figure .o-carousel-title").toHaveText("Title1");
    expect(getElStyle(".o-figure .o-carousel-title", "font-size")).toBe("20px");

    await click(fixture, ".o-carousel-tab:nth-child(2)");
    expect(".o-figure .o-carousel-title").toHaveText("Title2");
    expect(getElStyle(".o-figure .o-carousel-title", "font-weight")).toBe("bold");
  });

  describe("Carousel menu items", () => {
    test("Can edit the carousel", async () => {
      createCarousel(model, { items: [] }, "carouselId");
      await mountSpreadsheet({ model });

      triggerMouseEvent(".o-figure", "contextmenu");
      await nextTick();

      await simulateClick(".o-menu .o-menu-item[data-name='edit_carousel']");
      expect(".o-sidePanel .o-carousel-panel").toHaveCount(1);
    });

    test("Can edit a carousel chart", async () => {
      createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
      addNewChartToCarousel(model, "carouselId", { type: "radar" });
      await mountSpreadsheet({ model });

      triggerMouseEvent(".o-figure", "contextmenu");
      await nextTick();
      expect(".o-menu .o-menu-item[data-name='edit_chart']").toHaveCount(0); // Item not visible when no chart is selected

      await simulateClick(".o-carousel-tab:nth-child(2)");
      triggerMouseEvent(".o-figure", "contextmenu");
      await nextTick();
      await simulateClick(".o-menu .o-menu-item[data-name='edit_chart']");
      expect(".o-sidePanel .o-chart").toHaveCount(1);
    });

    test("Can delete the figure", async () => {
      createCarousel(model, { items: [] }, "carouselId");
      await mountSpreadsheet({ model });

      triggerMouseEvent(".o-figure", "contextmenu");
      await nextTick();

      await simulateClick(".o-menu .o-menu-item[data-name='delete']");
      expect(model.getters.getFigures(model.getters.getActiveSheetId())).toHaveLength(0);
    });
  });
});
