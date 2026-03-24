import { GeoChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { Model } from "../../../../src";
import {
  createChart,
  createGeoChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../../test_helpers";
import { getChartTooltipValues } from "../../../test_helpers/chart_helpers";
import {
  createModel,
  mockChart,
  mockGeoJsonService,
  nextTick,
} from "../../../test_helpers/helpers";

mockChart();
let model: Model;

beforeEach(async () => {
  model = await createModel({}, { external: { geoJsonService: mockGeoJsonService } });
  // Wait for the geoJsonService to resolve the promise and cache the geoJson features
  model.getters.getGeoChartAvailableRegions();
  model.getters.getGeoJsonFeatures("world");
  for (const country of ["France", "Germany", "Spain"]) {
    model.getters.geoFeatureNameToId("world", country);
  }
  await nextTick();
});

/**
 * Get the data points of the chart that have a value.
 * It's useful because the chart dataset always contains a point for ALL the features, even if they have no value
 */
function getGeoChartNonEmptyData(runtime: GeoChartRuntime) {
  const dataPoints: { value: number; feature: any }[] = [];
  for (let i = 0; i < runtime.chartJsConfig.data.datasets[0].data.length; i++) {
    const data = runtime.chartJsConfig.data.datasets[0].data[i] as any;
    if (data.value !== undefined) {
      dataPoints.push(data);
    }
  }
  return dataPoints;
}

describe("Geo charts plugin tests", () => {
  test("Basic geo chart runtime", async () => {
    await setCellContent(model, "A2", "France");
    await setCellContent(model, "A3", "Germany");
    await setCellContent(model, "B2", "10");
    await setCellContent(model, "B3", "20");
    await createGeoChart(model, { dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" });

    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 10, feature: { properties: { name: "France" } } },
      { value: 20, feature: { properties: { name: "Germany" } } },
    ]);
  });

  test("Points with empty/wrong labels are not kept in the runtime", async () => {
    await setCellContent(model, "A2", "");
    await setCellContent(model, "A3", "NotARealCountry");
    await setCellContent(model, "B2", "10");
    await setCellContent(model, "B3", "20");

    await createGeoChart(
      model,
      { dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toEqual([]);
  });

  test("Data with the same label is aggregated", async () => {
    await setCellContent(model, "A2", "France");
    await setCellContent(model, "A3", "France");
    await setCellContent(model, "B2", "10");
    await setCellContent(model, "B3", "20");

    await createGeoChart(
      model,
      { dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 30, feature: { properties: { name: "France" } } },
    ]);
  });

  test("Only the first dataset is kept", async () => {
    await setCellContent(model, "A2", "France");
    await setCellContent(model, "B2", "10");
    await setCellContent(model, "C3", "20");

    await createGeoChart(model, {
      dataSets: [{ dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
      labelRange: "A1:A3",
    });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    const dataPoints = getGeoChartNonEmptyData(runtime);
    expect(dataPoints).toHaveLength(1);
    expect(dataPoints).toMatchObject([{ value: 10, feature: { properties: { name: "France" } } }]);
  });

  test("Ticks values have the same format as the data", async () => {
    await setCellContent(model, "A2", "France");
    await setCellContent(model, "B2", "20");
    await setFormat(model, "B2", "$0");

    await createGeoChart(model, { dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["ticks"]?.callback?.(20)).toBe("$20");
  });

  test("Geo charts use custom tooltip", async () => {
    await createGeoChart(model, {});
    const runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.options?.plugins?.tooltip).toMatchObject({
      enabled: false,
      external: expect.any(Function),
    });
  });

  test("Tooltip values have the same format as the data", async () => {
    await setCellContent(model, "A2", "France");
    await setCellContent(model, "B2", "20");
    await setFormat(model, "B2", "$0");

    await createGeoChart(model, { dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" });
    const runtime = model.getters.getChartRuntime("chartId") as any;
    const tooltipItem = { raw: { value: 20, feature: { properties: { name: "France" } } } };
    const tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "France", label: "$20" });
  });

  test("The projection used depends on the region selected", async () => {
    await createGeoChart(model, { region: "world" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("mercator");

    await updateChart(model, "chartId", { region: "usa" });
    const runtime2 = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime2.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("albersUsa");
  });

  test("Can define colors of countries not in the dataset", async () => {
    await createGeoChart(model, { missingValueColor: "#ff0000" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["missing"]).toBe("#ff0000");

    // The countries that have no data should still be in the runtime, otherwise the missing color won't be applied
    expect(runtime.chartJsConfig.data.datasets[0].data.length).toBe(3);
  });

  describe("UPDATE_CHART_REGION", () => {
    test("dispatching UPDATE_CHART_REGION changes the chart region", async () => {
      await createGeoChart(model, { region: "world" });
      expect(model.getters.getChartDefinition("chartId")).toMatchObject({ region: "world" });

      model.dispatch("UPDATE_CHART_REGION", { chartId: "chartId", region: "usa" });
      expect(model.getters.getChartDefinition("chartId")).toMatchObject({ region: "usa" });
    });

    test("getAvailableChartRegions returns alternatives for a world chart", async () => {
      await createGeoChart(model, { region: "world" });
      const regions = model.getters.getAvailableChartRegions("chartId");
      expect(regions.map((r) => r.id)).toEqual(["world"]);
      expect(regions.find((r) => r.id === "usa")).toBeUndefined();
    });

    test("getAvailableChartRegions returns empty array for a usa chart", async () => {
      await createGeoChart(model, { region: "usa" });
      expect(model.getters.getAvailableChartRegions("chartId")).toEqual([]);
    });

    test("getAvailableChartRegions still uses the initial region after switching", async () => {
      await createGeoChart(model, { region: "world" });
      model.dispatch("UPDATE_CHART_REGION", { chartId: "chartId", region: "world" });
      // After switching, the initial region ("world") still allows alternatives
      const regions = model.getters.getAvailableChartRegions("chartId");
      expect(regions.length).toBeGreaterThan(0);
      expect(regions.find((r) => r.id === "usa")).toBeUndefined();
    });

    test("UPDATE_CHART_REGION is allowed in readonly mode", async () => {
      await createGeoChart(model, { region: "world" });
      const readonlyModel = await createModel(model.exportData(), {
        mode: "readonly",
        external: { geoJsonService: mockGeoJsonService },
      });
      const result = readonlyModel.dispatch("UPDATE_CHART_REGION", {
        chartId: "chartId",
        region: "world",
      });
      expect(result.isSuccessful).toBe(true);
    });

    test("UPDATE_CHART_REGION is allowed in dashboard mode", async () => {
      await createGeoChart(model, { region: "world" });
      const dashboardModel = await createModel(model.exportData(), {
        mode: "dashboard",
        external: { geoJsonService: mockGeoJsonService },
      });
      const result = dashboardModel.dispatch("UPDATE_CHART_REGION", {
        chartId: "chartId",
        region: "world",
      });
      expect(result.isSuccessful).toBe(true);
    });

    test("getAvailableChartRegions returns empty array for non-geo chart", async () => {
      await createChart(model, { type: "bar" }, "barChartId");
      expect(model.getters.getAvailableChartRegions("barChartId")).toEqual([]);
    });
  });
});
