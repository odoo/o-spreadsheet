import { Model } from "../../../src";
import { ZoomableChartStore } from "../../../src/components/figures/chart/chartJs/zoomable_chart/zoomable_chart_store";
import { ChartPanel } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { CreateFigureCommand, SpreadsheetChildEnv, UID } from "../../../src/types";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import { openChartConfigSidePanel } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../../test_helpers/constants";
import { simulateClick, triggerMouseEvent } from "../../test_helpers/dom_helper";
import {
  mockChart,
  mountComponentWithPortalTarget,
  mountSpreadsheet as mountSpreadsheetHelper,
  nextTick,
} from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

extendMockGetBoundingClientRect({
  "o-popover": () => ({ height: 0, width: 0 }),
  "o-figure-menu-item": () => ({ top: 500, left: 500 }),
  "o-figure-zoom-icons": () => ({ top: 500, left: 400 }),
  "o-zoom-slicer": () => ({ top: 0, left: 0, width: 100, height: 50 }),
});

function createTestChart(
  newChartId: UID = chartId,
  partialFigure: Partial<CreateFigureCommand> = {},
  partialDefinition: Partial<LineChartDefinition> = {}
) {
  createChart(
    model,
    {
      ...TEST_CHART_DATA.basicChart,
      labelRange: "C2:C4",
      dataSets: [{ dataRange: "B2:B4" }],
      ...partialDefinition,
    },
    newChartId,
    undefined,
    partialFigure
  );
}

async function mountChartSidePanel(figureId = chartId) {
  const props = { figureId, onCloseSidePanel: () => {} };
  ({ fixture, env } = await mountComponentWithPortalTarget(ChartPanel, { props, model }));
}

async function mountSpreadsheet(partialEnv?: Partial<SpreadsheetChildEnv>) {
  ({ env, model, fixture } = await mountSpreadsheetHelper({ model }, partialEnv));
}

let fixture: HTMLElement;
let model: Model;
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
const chartId = "someuuid";
const sheetId = "Sheet1";

let env: SpreadsheetChildEnv;

describe("zoom", () => {
  beforeEach(async () => {
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          //prettier-ignore
          cells: {
            B1: "first column dataset",
            C1: "second column dataset",
            A2: "P1", B2: "10", C2: "20",
            A3: "P2", B3: "11", C3: "19",
            A4: "P3", B4: "12", C4: "18",
            A5: "P4", B5: "13",
          },
        },
      ],
    };
    model = new Model(data);
  });

  test("chart with zoom enabled have zoom icons", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoom: { enabled: true } });
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    expect(fixture.querySelector(".o-figure-zoom-icons")).not.toBeNull();
  });

  test("charts don't have zoom icons in dashboard mode", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoom: { enabled: true } });
    model.updateMode("dashboard");
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    expect(fixture.querySelector(".o-figure-zoom-icons")).toBeNull();
  });

  test("Clicking on zoom icon update definition", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoom: { enabled: true } });
    await nextTick();
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.sliceable
    ).toBeFalsy();
    expect(fixture.querySelector(".o-chart-zoomable-slicer")).toBeNull();
    await simulateClick(".o-toggle-slider");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.sliceable
    ).toBeTruthy();
    expect(fixture.querySelector(".o-chart-zoomable-slicer")).not.toBeNull();
  });

  test("allowZoom checkbox check/uncheck update the definition", async () => {
    createTestChart(chartId);
    await mountChartSidePanel();

    expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom).toBeUndefined();

    await simulateClick("input[name='zoom']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.enabled
    ).toBeTruthy();

    await simulateClick("input[name='zoom']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.enabled
    ).toBeFalsy();
  });

  test("Allowing zoom set sliceable to true and show the slicer", async () => {
    await mountSpreadsheet();
    createTestChart(chartId);
    await openChartConfigSidePanel(model, env, chartId);

    expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom).toBeUndefined();

    await simulateClick("input[name='zoom']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.sliceable
    ).toBeTruthy();
    expect(fixture.querySelector(".o-chart-zoomable-slicer")).not.toBeNull();
  });

  test("Disabling zoom removes the slicer", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoom: { enabled: true, sliceable: true } });
    await openChartConfigSidePanel(model, env, chartId);

    expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom).toBeDefined();

    await simulateClick("input[name='zoom']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoom?.enabled
    ).toBeFalsy();
    expect(fixture.querySelector(".o-chart-zoomable-slicer")).toBeNull();
  });

  test("Zoom reset icon is not shown when the chartis not zoomed", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoom: { enabled: true, sliceable: true } });
    await nextTick();
    expect(fixture.querySelector(".o-reset-zoom")).toBeNull();
    const store = env.getStore(ZoomableChartStore);
    store.updateAxisLimits(chartId, { min: 1, max: 2 });
    model.dispatch("EVALUATE_CHARTS");
    await nextTick();
    expect(fixture.querySelector(".o-reset-zoom")).not.toBeNull();
    await simulateClick(".o-reset-zoom");
    expect(fixture.querySelector(".o-reset-zoom")).toBeNull();
  });

  describe("line chart", () => {
    beforeEach(async () => {
      await mountSpreadsheet();
      createTestChart(chartId, {}, { type: "line", zoom: { enabled: true, sliceable: true } });
      await nextTick();
    });

    test("Can select on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 3 - 5;
      const startY = top + height / 2;
      const offsetX = width / 3 + 10;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(1);
      expect(newMax).toEqual(2);
    });

    test("Can select from the left bound on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left;
      const startY = top + height / 2;
      const offsetX = width / 2;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(2);
      expect(newMax).toEqual(3);
    });

    test("Can select from the right bound on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width;
      const startY = top + height / 2;
      const offsetX = -width / 2;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(0);
      expect(newMax).toEqual(1);
    });

    test("Can move the slicer", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(chartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      const offsetX = width / 3;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(2);
      expect(newMax).toEqual(3);
    });

    test("Boundaries are rounded for categorical axis", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 6;
      const startY = top + height / 2;
      const offsetX = (2 * width) / 3;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(1);
      expect(newMax).toEqual(2);
    });
  });

  describe("Bar chart", () => {
    beforeEach(async () => {
      await mountSpreadsheet();
      createTestChart(chartId, {}, { zoom: { enabled: true, sliceable: true } });
      await nextTick();
    });

    test("Can select on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 4 - 5;
      const startY = top + height / 2;
      const offsetX = width / 4 + 10;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(0.5);
      expect(newMax).toEqual(1.5);
    });

    test("Can select from the left bound on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left;
      const startY = top + height / 2;
      const offsetX = width / 2;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(1.5);
      expect(newMax).toEqual(3.5);
    });

    test("Can select from the right bound on the slicer", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width;
      const startY = top + height / 2;
      const offsetX = -width / 2;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(-0.5);
      expect(newMax).toEqual(1.5);
    });

    test("Can move the slicer", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(chartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      const offsetX = width / 4;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(1.5);
      expect(newMax).toEqual(3.5);
    });

    test("Boundaries are half-rounded for categorical axis", async () => {
      const element = fixture.querySelector(".o-zoom-slicer") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + (3 * width) / 8 - 5;
      const startY = top + height / 2;
      const offsetX = width / 2;
      triggerMouseEvent(element, "pointerdown", startX, startY);
      triggerMouseEvent(element, "pointermove", startX + offsetX, startY);
      triggerMouseEvent(element, "pointerup", startX + offsetX, startY);
      await nextTick();
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxisLimits[chartId];
      expect(newMin).toEqual(0.5);
      expect(newMax).toEqual(2.5);
    });
  });
});
