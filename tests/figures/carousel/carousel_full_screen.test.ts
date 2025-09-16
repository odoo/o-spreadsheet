import { Model } from "../../../src";
import { addNewChartToCarousel, createCarousel } from "../../test_helpers/commands_helpers";
import { click } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart();

let model: Model;
let fixture: HTMLElement;

describe("full screen carousel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture } = await mountSpreadsheet({ model }));
  });

  test("Can make a carousel fullscreen in dashboard", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId");
    await nextTick();
    expect(".o-figure .o-carousel-full-screen-button").toHaveCount(0);

    model.updateMode("dashboard");
    await nextTick();
    expect(".o-figure .o-carousel-full-screen-button").toHaveCount(1);

    expect(".o-fullscreen-figure").toHaveCount(0);
    await click(fixture, ".o-figure .o-carousel-full-screen-button");
    expect(".o-fullscreen-figure").toHaveCount(1);
  });

  test("Can exit fullscreen mode", async () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId");
    model.updateMode("dashboard");
    await nextTick();
    expect(".o-carousel-full-screen-button").toHaveClass("fa-expand");

    await click(fixture, ".o-figure .o-carousel-full-screen-button");
    expect(".o-fullscreen-figure").toHaveCount(1);
    expect(".o-fullscreen-figure .o-carousel-full-screen-button").toHaveClass("fa-compress");

    await click(fixture, ".o-fullscreen-figure .o-carousel-full-screen-button");
    expect(".o-fullscreen-figure").toHaveCount(0);
  });

  test("Cannot use the data view in full screen", async () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", { type: "radar" });
    model.updateMode("dashboard");
    await nextTick();
    expect(".o-figure .o-carousel-full-screen-button").toHaveClass("invisible");

    await click(fixture, ".o-figure .o-carousel-tab:nth-child(2)");
    expect(".o-figure .o-carousel-full-screen-button").not.toHaveClass("invisible");

    await click(fixture, ".o-figure .o-carousel-full-screen-button");
    expect(".o-fullscreen-figure .o-carousel-tab").toHaveCount(1);
    expect(".o-fullscreen-figure .o-carousel-tab").toHaveText("Radar");
  });
});
