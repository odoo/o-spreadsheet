import { Model, SpreadsheetChildEnv, UID } from "../../../src";
import { SidePanels } from "../../../src/components/side_panel/side_panels/side_panels";
import {
  addNewChartToCarousel,
  createCarousel,
  selectCarouselItem,
} from "../../test_helpers/commands_helpers";
import { click, clickAndDrag, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mockChart, mountComponentWithPortalTarget, nextTick } from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

mockChart();

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

extendMockGetBoundingClientRect({
  "o-carousel-preview-list": () => ({ height: 400, width: 450, top: 0, left: 0 }),
  "o-carousel-preview": (el: HTMLElement) => {
    const parentEl = el.parentElement!;
    const indexInParent = Array.from(parentEl.children).indexOf(el);
    return { width: 450, height: 200, top: indexInParent * 200, left: 0 };
  },
});

beforeEach(() => {
  model = new Model();
});

async function mountCarouselPanel(modelArg: Model, figureId: UID) {
  ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  env.openSidePanel("CarouselPanel", { figureId });
  await nextTick();
}

describe("Carousel panel component", () => {
  test("Can add a chart to the carousel", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    await mountCarouselPanel(model, "carouselId");

    await click(fixture, ".o-carousel-add-chart");
    expect(model.getters.getCarousel("carouselId")).toMatchObject({
      items: [{ type: "chart", chartId: expect.any(String) }],
    });
  });

  test("Can add a data view to the carousel", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    await mountCarouselPanel(model, "carouselId");

    await click(fixture, ".o-carousel-add-data-view");
    expect(model.getters.getCarousel("carouselId")).toMatchObject({
      items: [{ type: "carouselDataView" }],
    });
  });

  test("Can edit a carousel item name", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    await mountCarouselPanel(model, "carouselId");

    await setInputValueAndTrigger(".o-carousel-preview .os-input", "New Chart Name");
    expect(".o-carousel-preview .os-input").toHaveValue("New Chart Name");
    expect(model.getters.getCarousel("carouselId").items[0].title).toBe("New Chart Name");
  });

  test("Can edit a chart linked to the carousel", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    await mountCarouselPanel(model, "carouselId");

    await click(fixture, ".o-carousel-preview .os-cog-wheel-menu-icon");
    await click(fixture, '.o-menu-item[title="Edit chart"]');
    expect(".o-sidePanel .o-chart").toHaveCount(1);
  });

  test("Can remove a carousel item", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    model = new Model(model.exportData());

    await mountCarouselPanel(model, "carouselId");
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);

    await click(fixture, ".o-carousel-preview .os-cog-wheel-menu-icon");
    await click(fixture, '.o-menu-item[title="Delete item"]');
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(0);
    expect(model.getters.getChartIds(model.getters.getActiveSheetId())).toHaveLength(0);
  });

  test("Can pop a carousel item out", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    model = new Model(model.exportData());

    await mountCarouselPanel(model, "carouselId");
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);

    await click(fixture, ".o-carousel-preview .os-cog-wheel-menu-icon");
    await click(fixture, '.o-menu-item[title="Pop out chart"]');
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(0);
    expect(model.getters.getFigures(model.getters.getActiveSheetId())).toHaveLength(2);
    expect(model.getters.getChartIds(model.getters.getActiveSheetId())).toHaveLength(1);
  });

  test("Can duplicate a carousel chart", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });

    await mountCarouselPanel(model, "carouselId");
    await click(fixture, ".o-carousel-preview .os-cog-wheel-menu-icon");
    await click(fixture, '.o-menu-item[title="Duplicate chart"]');

    const items = model.getters.getCarousel("carouselId").items;
    expect(items).toHaveLength(2);

    expect(model.getters.getChartDefinition(items[0]["chartId"])).toMatchObject({ type: "radar" });
    expect(items[1]["chartId"]).not.toEqual(items[0]["chartId"]);
    expect(model.getters.getChartDefinition(items[1]["chartId"])).toMatchObject({ type: "radar" });
  });

  test("Can drag & drop carousel items to re-order them", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    const radarId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    const barId = addNewChartToCarousel(model, "carouselId", { type: "bar" });
    await mountCarouselPanel(model, "carouselId");
    expect(model.getters.getCarousel("carouselId").items).toMatchObject([
      { chartId: radarId },
      { chartId: barId },
    ]);

    await clickAndDrag(".o-carousel-preview .o-drag-handle", { x: 0, y: 300 }, undefined, true);
    expect(model.getters.getCarousel("carouselId").items).toMatchObject([
      { chartId: barId },
      { chartId: radarId },
    ]);
  });

  test("Can edit the carousel title", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    await mountCarouselPanel(model, "carouselId");

    await setInputValueAndTrigger(".o-carousel-title .os-input", "Carousel Title");
    expect(".o-carousel-title .os-input").toHaveValue("Carousel Title");
    expect(model.getters.getCarousel("carouselId").title).toEqual({
      text: "Carousel Title",
    });

    await click(fixture, ".o-carousel-title [title='Bold']");
    expect(model.getters.getCarousel("carouselId").title).toEqual({
      text: "Carousel Title",
      bold: true,
    });
  });

  test("Selected carousel item is highlighted", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    const radarId = addNewChartToCarousel(model, "carouselId", { type: "radar" });
    await mountCarouselPanel(model, "carouselId");

    await setInputValueAndTrigger(".o-carousel-preview .os-input", "New Chart Name");

    const previews = fixture.querySelectorAll(".o-carousel-preview");
    expect(previews[0]).toHaveClass("o-selected");
    expect(previews[1]).not.toHaveClass("o-selected");

    selectCarouselItem(model, "carouselId", { type: "chart", chartId: radarId });
    await nextTick();
    expect(previews[0]).not.toHaveClass("o-selected");
    expect(previews[1]).toHaveClass("o-selected");
  });
});
