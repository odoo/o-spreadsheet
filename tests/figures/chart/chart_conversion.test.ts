import { Model } from "@odoo/o-spreadsheet-engine";
import {
  chartToImageFile,
  chartToImageUrl,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createChart } from "../../test_helpers";
import { TEST_CHART_DATA } from "../../test_helpers/constants";
import { mockChart } from "../../test_helpers/helpers";

jest.mock("@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common", () => {
  return {
    ...jest.requireActual("@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common"),
  };
});

mockChart();

const figureId = "fig1";
const chartId = "chartId";
describe("chart conversion", () => {
  afterEach(() => {
    mockChart();
  });

  test("convert chart to image", async () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, TEST_CHART_DATA.basicChart, chartId, undefined, { figureId });
    const figure = model.getters.getFigure(sheetId, figureId)!;
    const runtime = model.getters.getChartRuntime(chartId);
    const imageUrl = await chartToImageUrl(runtime, figure, "bar");
    // canvas is not drawn at all
    expect(imageUrl).toBe("data:image/png;base64,");

    const imageFile = await chartToImageFile(runtime, figure, "bar");
    expect(imageFile).toBeInstanceOf(Blob);
  });

  test("cannot export Chart.js chart when lib is not loaded", async () => {
    globalThis.Chart = undefined;
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, TEST_CHART_DATA.basicChart, chartId, undefined, { figureId });
    const figure = model.getters.getFigure(sheetId, figureId)!;
    const runtime = model.getters.getChartRuntime(chartId);

    const imageUrl = await chartToImageUrl(runtime, figure, "bar");
    expect(imageUrl).toBeUndefined();
    expect(spy).toHaveBeenCalledWith("Chart.js library is not loaded");

    const imageFile = await chartToImageFile(runtime, figure, "bar");
    expect(imageFile).toBeNull();
    expect(spy).toHaveBeenCalledWith("Chart.js library is not loaded");
  });

  test("cannot export if the chart type is not supported", async () => {
    globalThis.Chart!.registry.controllers.get = (controllerName: string) => undefined;
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, TEST_CHART_DATA.basicChart, chartId, undefined, { figureId });
    const figure = model.getters.getFigure(sheetId, figureId)!;
    const runtime = model.getters.getChartRuntime(chartId);

    const imageUrl = await chartToImageUrl(runtime, figure, "bar");
    expect(imageUrl).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Chart of type "bar" is not registered in Chart.js library.');

    const imageFile = await chartToImageFile(runtime, figure, "bar");
    expect(imageFile).toBeNull();
    expect(spy).toHaveBeenCalledWith('Chart of type "bar" is not registered in Chart.js library.');
  });
});
