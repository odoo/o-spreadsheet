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

  test("export uses Chart.js type from runtime config, not the UI chart type", async () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();

    createChart(model, TEST_CHART_DATA.basicChart, chartId, undefined, { figureId });
    const figure = model.getters.getFigure(sheetId, figureId)!;
    const runtime = model.getters.getChartRuntime(chartId) as any;
    expect(runtime.chartJsConfig.type).toBe("bar");

    const registrySpy = jest.spyOn(globalThis.Chart!.registry.controllers, "get");

    const imageUrl = await chartToImageUrl(runtime, figure, "odoo_bar" as any);
    expect(imageUrl).toBe("data:image/png;base64,");
    expect(registrySpy).toHaveBeenCalledWith("bar");
    expect(registrySpy).not.toHaveBeenCalledWith("odoo_bar");

    const imageFile = await chartToImageFile(runtime, figure, "odoo_bar" as any);
    expect(imageFile).toBeInstanceOf(Blob);
    expect(registrySpy).toHaveBeenCalledWith("bar");
    expect(registrySpy).not.toHaveBeenCalledWith("odoo_bar");
  });

  test("cannot export if the chart runtime config type is not supported", async () => {
    globalThis.Chart!.registry.controllers.get = (type: string) => {
      return type === "bar" ? {} : (undefined as any);
    };
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createChart(model, TEST_CHART_DATA.basicChart, chartId, undefined, { figureId });
    const figure = model.getters.getFigure(sheetId, figureId)!;
    const originalRuntime = model.getters.getChartRuntime(chartId) as any;
    const runtime = {
      ...originalRuntime,
      chartJsConfig: {
        ...originalRuntime.chartJsConfig,
        type: "odoo_bar",
      },
    };

    const imageUrl = await chartToImageUrl(runtime, figure, "bar");
    expect(imageUrl).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      'Chart of type "odoo_bar" is not registered in Chart.js library.'
    );

    const imageFile = await chartToImageFile(runtime, figure, "bar");
    expect(imageFile).toBeNull();
    expect(logSpy).toHaveBeenCalledWith(
      'Chart of type "odoo_bar" is not registered in Chart.js library.'
    );
  });
});
