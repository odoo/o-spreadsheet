import { Chart } from "chart.js";
import { Model, readonlyAllowedCommands } from "../../../src";
import { ChartAnimationStore } from "../../../src/components/figures/chart/chartJs/chartjs_animation_store";
import { toChartDataSource } from "../../test_helpers/chart_helpers";
import { createChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";
import { click, clickAndDrag } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

extendMockGetBoundingClientRect({
  "o-master-chart-canvas": () => ({ top: 0, left: 0, width: 100, height: 50 }),
});

mockChart({
  scales: {
    x: {
      type: "categorical",
      min: 0,
      max: 3,
      getPixelForValue: (value: number) => value * 100,
      getValueForPixel: (pixel: number) => pixel / 100,
    },
  },
});

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
    createChart(model, {
      type: "bar",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }),
    });
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

  test("Treemap animation are not replayed when data does not change but runtime is re-created", async () => {
    readonlyAllowedCommands.add("UPDATE_CELL");

    const model = new Model();
    createChart(model, {
      type: "treemap",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }),
    });
    setCellContent(model, "A2", "1");
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    expect(mockedChart.config.options.animation).toEqual({ animateRotate: true });

    setCellContent(model, "B1", "6");
    await nextTick();
    expect(mockedChart.config.options.animation).toBe(false);

    readonlyAllowedCommands.delete("UPDATE_CELL");
  });

  test("Charts are animated when chart type changes", async () => {
    const model = new Model();
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }) },
      "chartId"
    );
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
    createChart(
      model,
      { type: "pie", ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }) },
      "chartId"
    );
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
    createChart(
      model,
      { type: "pie", ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }) },
      "chartId"
    );
    model.updateMode("dashboard");
    const { env, fixture } = await mountSpreadsheet({ model });
    const store = env.getStore(ChartAnimationStore) as ChartAnimationStore;
    const enableAnimationSpy = jest.spyOn(store, "enableAnimationForChart");

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(enableAnimationSpy).toHaveBeenCalledWith("chartId-fullscreen");
  });

  test("Zoomable chart isn't animated when moving the slicer in full screen", async () => {
    const model = new Model();
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "A1:A6" }] }), zoomable: true },
      "chartId"
    );
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });
    const { env, fixture } = await mountSpreadsheet({ model });
    const store = env.getStore(ChartAnimationStore) as ChartAnimationStore;
    const enableAnimationSpy = jest.spyOn(store, "enableAnimationForChart");

    await click(fixture, ".o-figure [data-id='fullScreenChart']");
    expect(enableAnimationSpy).toHaveBeenCalledWith("chartId-fullscreen");
    expect(mockedChart.config.options.animation).toBe(false);

    const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
    const { left, top, width, height } = element.getBoundingClientRect();
    const startX = left + width;
    const startY = top + height / 2;
    const offsetX = -width / 2;
    await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY }, true);
    expect(mockedChart.config.options.animation).toBe(false);
  });
});
