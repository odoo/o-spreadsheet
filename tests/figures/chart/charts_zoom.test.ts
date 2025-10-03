import { Model } from "../../../src";
import { ZoomableChartStore } from "../../../src/components/figures/chart/chartJs/zoomable_chart/zoomable_chart_store";
import { ChartPanel } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { CreateFigureCommand, SpreadsheetChildEnv, UID } from "../../../src/types";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import { openChartDesignSidePanel } from "../../test_helpers/chart_helpers";
import { createChart, setCellContent, updateChart } from "../../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../../test_helpers/constants";
import { clickAndDrag, simulateClick, triggerMouseEvent } from "../../test_helpers/dom_helper";
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
  "o-master-chart-canvas": () => ({ top: 0, left: 0, width: 100, height: 50 }),
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
      dataSetsHaveTitle: false,
      ...partialDefinition,
    },
    newChartId,
    undefined,
    partialFigure
  );
}

async function mountChartSidePanel(id = chartId) {
  const props = { chartId: id, onCloseSidePanel: () => {} };
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
const lineChartId = "line-" + chartId;
const barChartId = "bar-" + chartId;
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

  test("allowZoom checkbox check/uncheck updates the definition", async () => {
    createTestChart(chartId);
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable
    ).toBeUndefined();

    await simulateClick("input[name='zoomable']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable
    ).toBeTruthy();

    await simulateClick("input[name='zoomable']");
    expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable).toBeFalsy();
  });

  test("Allowing zoom changes the definition and shows the master chart", async () => {
    await mountSpreadsheet();
    createTestChart(chartId);
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable
    ).toBeUndefined();

    await simulateClick("input[name='zoomable']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable
    ).toBeTruthy();
    expect(fixture.querySelector(".o-master-chart-container")).not.toBeNull();
  });

  test("Disabling zoom removes the master chart", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoomable: true });
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable
    ).toBeDefined();

    await simulateClick("input[name='zoomable']");
    expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).zoomable).toBeFalsy();
    expect(fixture.querySelector(".o-master-chart-container")).toBeNull();
  });

  describe("line chart", () => {
    beforeEach(async () => {
      await mountSpreadsheet();
      createTestChart(chartId, {}, { type: "line", zoomable: true });
      await nextTick();
    });

    test("Can select on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 4;
      const startY = top + height / 2;
      const offsetX = width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(0.75);
      expect(newMax).toEqual(2.25);
    });

    test("Can select from the left bound on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left;
      const startY = top + height / 2;
      const offsetX = width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(1.5);
      expect(newMax).toEqual(3);
    });

    test("Can select from the right bound on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width;
      const startY = top + height / 2;
      const offsetX = -width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(0);
      expect(newMax).toEqual(1.5);
    });

    test("Can move the slicer on the master chart", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(lineChartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      const offsetX = width / 3 + 10;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(2);
      expect(newMax).toEqual(3);
    });

    test("Can double click on the left limit on the master chart to reset the lower bound", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(lineChartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 3;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(0);
      expect(newMax).toEqual(2);
    });

    test("Can double click on the right limit on the master chart to reset the upper bound", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(lineChartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + (2 * width) / 3;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(1);
      expect(newMax).toEqual(3);
    });

    test("Can double click in the selected area on the master chart to reset the zoom", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(lineChartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(0);
      expect(newMax).toEqual(3);
    });

    test("Double clicking outside of the slicer does nothing", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(lineChartId, { min: 1, max: 2 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 6;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[lineChartId]?.x ?? {};
      expect(newMin).toEqual(1);
      expect(newMax).toEqual(2);
    });
  });

  describe("Bar chart", () => {
    beforeEach(async () => {
      await mountSpreadsheet();
      createTestChart(chartId, {}, { zoomable: true });
      await nextTick();
    });

    test("allowZoom checkbox is hidden for horizontal bar chart", async () => {
      createTestChart(chartId);
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(fixture.querySelector("input[name='zoomable']")).not.toBeNull();

      updateChart(model, chartId, { horizontal: true });
      await nextTick();

      expect(fixture.querySelector("input[name='zoomable']")).toBeNull();
    });

    test("Can select on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 4;
      const startY = top + height / 2;
      const offsetX = width / 4;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(0.5);
      expect(newMax).toEqual(1.5);
    });

    test("Can select from the left bound on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left;
      const startY = top + height / 2;
      const offsetX = width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(1.5);
      expect(newMax).toEqual(3.5);
    });

    test("Can select from the right bound on the master chart", async () => {
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width;
      const startY = top + height / 2;
      const offsetX = -width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const store = env.getStore(ZoomableChartStore);
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(-0.5);
      expect(newMax).toEqual(1.5);
    });

    test("Can move the slicer on the master chart", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      const offsetX = width / 2;
      await clickAndDrag(element, { x: offsetX, y: 0 }, { x: startX, y: startY });
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(1.5);
      expect(newMax).toEqual(3.5);
    });

    test("Can double click on the left limit on the master chart to reset the lower bound", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 4;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(-0.5);
      expect(newMax).toEqual(2.5);
    });

    test("Can double click on the right limit on the master chart to reset the upper bound", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + (3 * width) / 4;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(0.5);
      expect(newMax).toEqual(3.5);
    });

    test("Can double click in the selected area on the master chart to reset the zoom", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 2;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(-0.5);
      expect(newMax).toEqual(3.5);
    });

    test("Double clicking outside of the slicer does nothing", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const element = fixture.querySelector(".o-master-chart-canvas") as HTMLCanvasElement;
      const { left, top, width, height } = element.getBoundingClientRect();
      const startX = left + width / 8;
      const startY = top + height / 2;
      triggerMouseEvent(element, "dblclick", startX, startY);
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toEqual(0.5);
      expect(newMax).toEqual(2.5);
    });

    test("Changing dataset boundaries clear the zoom", async () => {
      const store = env.getStore(ZoomableChartStore);
      store.updateAxisLimits(barChartId, { min: 0.5, max: 2.5 });
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      setCellContent(model, "B2", "");
      setCellContent(model, "C2", "");
      model.dispatch("EVALUATE_CHARTS");
      await nextTick();
      const { min: newMin, max: newMax } = store.currentAxesLimits[barChartId]?.x ?? {};
      expect(newMin).toBeUndefined();
      expect(newMax).toBeUndefined();
    });
  });

  test("Chart with one point shows timeline as disabled", async () => {
    await mountSpreadsheet();
    createTestChart(chartId, {}, { zoomable: true });
    await openChartDesignSidePanel(model, env, fixture, chartId);
    let container = fixture.querySelector(".o-master-chart-container");
    let style = container?.getAttribute("style");
    expect(style).toEqual("");

    updateChart(model, chartId, { dataSets: [{ dataRange: "B2:B2" }], labelRange: "C2:C2" });
    await nextTick();
    container = fixture.querySelector(".o-master-chart-container");
    style = container?.getAttribute("style");
    expect(style).toContain("opacity: 0.3");
  });
});
