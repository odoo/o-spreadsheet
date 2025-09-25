import { Chart } from "chart.js";
import { Model, readonlyAllowedCommands } from "../../../src";
import { ChartAnimationStore } from "../../../src/components/figures/chart/chartJs/chartjs_animation_store";
import { createChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";
import { click } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart();

let mockedChart: any;
beforeEach(() => {
  jest
    .spyOn((window as any).Chart.prototype, "constructorMock")
    .mockImplementation(function (this: Chart) {
      mockedChart = this;
    });
});

describe("Chart animations in dashboard", () => {
  test("Charts are animated only at first render", async () => {
    const model = new Model();
    createChart(model, { type: "bar" });
    model.updateMode("dashboard");

    await mountSpreadsheet({ model });
    expect(".o-figure").toHaveCount(1);
    expect(mockedChart.config.options.animation.animateRotate).toBe(true);

    // Scroll the figure out of the viewport and back in
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 500 });
    await nextTick();
    expect(".o-figure").toHaveCount(0);

    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 0 });
    await nextTick();
    expect(".o-figure").toHaveCount(1);
    expect(mockedChart.config.options.animation).toBe(false);
  });

  test("Animations are replayed only when chart data changes", async () => {
    readonlyAllowedCommands.add("UPDATE_CELL");

    const model = new Model();
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1:A6" }] });
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    expect(mockedChart.config.options.animation).toEqual({ animateRotate: true });

    // Dispatch a command that doesn't change the chart data
    setCellContent(model, "A50", "6");
    await nextTick();
    expect(mockedChart.config.options.animation).toBe(false);

    // Change the chart data
    setCellContent(model, "A2", "6");
    await nextTick();
    expect(mockedChart.config.options.animation).toEqual({ animateRotate: true });

    readonlyAllowedCommands.delete("UPDATE_CELL");
  });

  test("Charts are animated when chart type changes", async () => {
    const model = new Model();
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1:A6" }] }, "chartId");
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    model.dispatch("EVALUATE_CELLS");
    await nextTick();
    expect(mockedChart.config.options.animation).toBe(false);

    updateChart(model, "chartId", { type: "pie" });
    await nextTick();
    expect(mockedChart.config.options.animation.animateRotate).toBe(true);
  });

  test("Non-zoomable full screen charts are animated separately from their counterparts", async () => {
    const model = new Model();
    createChart(model, { type: "pie", dataSets: [{ dataRange: "A1:A6" }] }, "chartId");
    model.updateMode("dashboard");
    const { env, fixture } = await mountSpreadsheet({ model });
    const store = env.getStore(ChartAnimationStore);

    expect(store.animationPlayed["chartId"]).toBe("pie");
    expect(store.animationPlayed["chartId-fullscreen"]).toBe(undefined);

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(store.animationPlayed["chartId-fullscreen"]).toBe("pie");
  });

  test("Non-zoomable full screen charts will be animated each time we open them", async () => {
    const model = new Model();
    createChart(model, { type: "pie", dataSets: [{ dataRange: "A1:A6" }] }, "chartId");
    model.updateMode("dashboard");
    const { env, fixture } = await mountSpreadsheet({ model });
    const store = env.getStore(ChartAnimationStore) as ChartAnimationStore;
    const enableAnimationSpy = jest.spyOn(store, "enableAnimationForChart");

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(enableAnimationSpy).toHaveBeenCalledWith("chartId-fullscreen");
  });

  test("Zoomable full screen charts are not animated separately from their counterparts", async () => {
    const model = new Model();
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1:A6" }] }, "chartId");
    model.updateMode("dashboard");
    const { env, fixture } = await mountSpreadsheet({ model });
    const store = env.getStore(ChartAnimationStore);

    expect(store.animationPlayed["chartId"]).toBe("bar");
    expect(store.animationPlayed["chartId-fullscreen"]).toBe(undefined);

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(store.animationPlayed["chartId-fullscreen"]).toBe(undefined);
  });
});
