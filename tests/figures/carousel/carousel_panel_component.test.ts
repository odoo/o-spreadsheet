import { Model, SpreadsheetChildEnv, UID } from "../../../src";
import { SidePanels } from "../../../src/components/side_panel/side_panels/side_panels";
import { addNewChartToCarousel, createCarousel } from "../../test_helpers/commands_helpers";
import { click, clickAndDrag, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mockChart, mountComponent, nextTick } from "../../test_helpers/helpers";
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
  ({ fixture, env } = await mountComponent(SidePanels, { model }));
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

    await click(fixture, ".o-carousel-preview .o-edit-button");
    expect(".o-sidePanel .o-chart").toHaveCount(1);
  });

  test("Can remove a carousel item", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    model = new Model(model.exportData());
    await mountCarouselPanel(model, "carouselId");
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);

    await click(fixture, ".o-carousel-preview .o-delete-button");
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(0);
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
});
