import { Model } from "../../../src";
import { createScorecardChart, createWaterfallChart } from "../../test_helpers/commands_helpers";
import { click, keyDown } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart();

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

    expect(".o-fullscreen-chart").toHaveCount(0);
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(1);
  });

  test("Cannot make scorecard chart fullscreen ", async () => {
    createScorecardChart(model, {});
    model.updateMode("dashboard");
    await nextTick();

    expect(".o-fullscreen-chart").toHaveCount(0);
    expect(".o-figure [data-id='fullScreenChart']").toHaveCount(0);
  });

  test("Can exit fullscreen mode", async () => {
    createWaterfallChart(model);
    model.updateMode("dashboard");
    await nextTick();

    // Click fullscreen menu item
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(1);
    await click(fixture, ".o-fullscreen-chart [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(0);

    // Click outside of the chart in the full screen overlay
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(1);
    await click(fixture, ".o-fullscreen-chart-overlay");
    expect(".o-fullscreen-chart").toHaveCount(0);

    // Click the exit button in the full screen overlay
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(1);
    await click(fixture, ".o-fullscreen-chart-overlay button.o-exit");
    expect(".o-fullscreen-chart").toHaveCount(0);

    // Press escape key
    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(".o-fullscreen-chart").toHaveCount(1);
    await keyDown({ key: "Escape" });
    expect(".o-fullscreen-chart").toHaveCount(0);
  });
});
