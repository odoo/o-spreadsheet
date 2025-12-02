import { Model } from "../../../src";
import { createScorecardChart, createWaterfallChart } from "../../test_helpers/commands_helpers";
import {
  click,
  keyDown,
  pointerDown,
  pointerUp,
  triggerMouseEvent,
} from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart({
  scales: {
    x: {
      type: "categorical",
    },
  },
});

let model: Model;
let fixture: HTMLElement;

describe("chart menu for dashboard", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture } = await mountSpreadsheet({ model }));
  });

  test("Can make a chart fullscreen in dashboard", async () => {
    createWaterfallChart(model);
    model.updateMode("dashboard");
    await nextTick();

    expect(".o-fullscreen-figure").toHaveCount(0);
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);
  });

  test("Expand icon changes to collapse in full screen", async () => {
    createWaterfallChart(model);
    model.updateMode("dashboard");
    await nextTick();

    expect(".o-figure .fa-expand").toHaveCount(1);
    expect(".o-fullscreen-figure").toHaveCount(0);

    await click(fixture, ".o-figure .fa-expand");
    expect(".o-fullscreen-figure").toHaveCount(1);
    expect(".o-figure .fa-compress").toHaveCount(2); // One in the original chart, one in the full screen overlay
  });

  test("Cannot make scorecard chart fullscreen ", async () => {
    createScorecardChart(model, {});
    model.updateMode("dashboard");
    await nextTick();

    expect(".o-fullscreen-figure").toHaveCount(0);
    expect(".o-figure [data-id='fullScreenChart']").toHaveCount(0);
  });

  test("Can exit fullscreen mode", async () => {
    createWaterfallChart(model);
    model.updateMode("dashboard");
    await nextTick();

    // Click fullscreen menu item
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);
    await click(fixture, ".o-fullscreen-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(0);

    // Click outside of the chart in the full screen overlay
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);
    await click(fixture, ".o-fullscreen-figure-overlay > div:first-child");
    expect(".o-fullscreen-figure").toHaveCount(0);

    // Click the exit button in the full screen overlay
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);
    await click(fixture, ".o-fullscreen-figure-overlay button.o-exit");
    expect(".o-fullscreen-figure").toHaveCount(0);

    // Press escape key
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);
    await keyDown({ key: "Escape" });
    expect(".o-fullscreen-figure").toHaveCount(0);
  });

  test("Keeps fullscreen open when pointerdown is inside and pointerup is outside", async () => {
    createWaterfallChart(model);
    model.updateMode("dashboard");
    await nextTick();

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-figure").toHaveCount(1);

    const chart = fixture.querySelector(".o-fullscreen-figure")!;
    const overlay = fixture.querySelector(".o-fullscreen-figure-overlay")!;
    expect(chart).not.toBeNull();
    expect(overlay).not.toBeNull();

    await pointerDown(chart);
    await pointerUp(overlay);

    triggerMouseEvent(overlay, "click");
    await nextTick();

    expect(".o-fullscreen-figure").toHaveCount(1);
  });
});
