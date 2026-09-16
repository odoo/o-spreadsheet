import { Model } from "../../../../src";
import { geoProjectionPlugin } from "../../../../src/components/figures/chart/chartJs/chartjs_geo_projection_plugin";
import { deepCopy } from "../../../../src/helpers/misc";
import { GeoChartRuntime } from "../../../../src/types/chart/geo_chart";
import {
  createChart,
  createGeoChart,
  setCellContent,
  setFormat,
  updateChart,
} from "../../../test_helpers";
import { getChartTooltipValues, toChartDataSource } from "../../../test_helpers/chart_helpers";
import { mockChart, mockGeoJsonService, nextTick } from "../../../test_helpers/helpers";

mockChart();
let model: Model;

describe("Geo charts plugin tests", () => {
  beforeEach(async () => {
    model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
    // Wait for the geoJsonService to resolve the promise and cache the geoJson features
    model.getters.getGeoChartAvailableRegions();
    model.getters.getGeoJsonFeatures("world");
    for (const country of ["France", "Germany", "Spain"]) {
      model.getters.geoFeatureNameToId("world", country);
    }
    await nextTick();
  });

  test("Basic geo chart runtime", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "A3", "Germany");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");
    createGeoChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" }),
    });

    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].labelsAndValues).toMatchObject({
      FR: { value: 10, label: "France" },
      DE: { value: 20, label: "Germany" },
    });
  });

  test("Points with empty/wrong labels are not kept in the runtime", () => {
    setCellContent(model, "A2", "");
    setCellContent(model, "A3", "NotARealCountry");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");

    createGeoChart(
      model,
      { ...toChartDataSource({ dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" }) },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].labelsAndValues).toEqual({});
  });

  test("Data with the same label is aggregated", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "A3", "France");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");

    createGeoChart(
      model,
      { ...toChartDataSource({ dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" }) },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].labelsAndValues).toEqual({
      FR: { value: 30, label: "France" },
    });
  });

  test("Only the first dataset is kept", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "10");
    setCellContent(model, "C3", "20");

    createGeoChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
        labelRange: "A1:A3",
      }),
    });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].labelsAndValues).toEqual({
      FR: { value: 10, label: "France" },
    });
  });

  test("Ticks values have the same format as the data", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "20");
    setFormat(model, "B2", "$0");

    createGeoChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" }),
    });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["ticks"]?.callback?.(20)).toBe("$20");
  });

  test("Geo charts use custom tooltip", () => {
    createGeoChart(model, {});
    const runtime = model.getters.getChartRuntime("chartId") as any;
    expect(runtime.chartJsConfig.options?.plugins?.tooltip).toMatchObject({
      enabled: false,
      external: expect.any(Function),
    });
  });

  test("Tooltip values have the same format as the data", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "20");
    setFormat(model, "B2", "$0");

    createGeoChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" }),
    });
    const runtime = model.getters.getChartRuntime("chartId") as any;
    const tooltipItem = { raw: { value: 20, feature: { properties: { name: "France" } } } };
    const tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "France", label: "$20" });
  });

  test("The projection used depends on the region selected", () => {
    createGeoChart(model, { region: "world" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("mercator");

    updateChart(model, "chartId", { region: "usa" });
    const runtime2 = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime2.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("albersUsa");

    updateChart(model, "chartId", { region: "northAmerica" });
    const runtime3 = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime3.chartJsConfig.options?.scales?.projection?.["projection"]).toBe(
      "conicConformal"
    );
  });

  test("Can define colors of countries not in the dataset", () => {
    createGeoChart(model, { missingValueColor: "#ff0000" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["missing"]).toBe("#ff0000");
  });

  describe("chartGeoPlugin", () => {
    function createMockChart(runtime: GeoChartRuntime): any {
      return deepCopy({
        config: runtime.chartJsConfig,
        data: runtime.chartJsConfig.data,
        options: runtime.chartJsConfig.options,
        scales: runtime.chartJsConfig.options?.scales || {},
      });
    }

    function applyChartGeoPlugin(mockChart: any, runtime: GeoChartRuntime) {
      (geoProjectionPlugin.beforeUpdate as Function)(
        mockChart,
        undefined,
        runtime.chartJsConfig.options?.plugins?.chartGeoPlugin
      );
    }

    test("applies rotation for conicConformal projection", () => {
      createGeoChart(model, { region: "northAmerica" });
      const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
      expect(runtime.chartJsConfig.options?.scales?.projection?.["projection"]).toBe(
        "conicConformal"
      );

      const rotateFn = jest.fn();
      const mockChart = createMockChart(runtime);
      mockChart.scales.projection.projection = { rotate: rotateFn };
      applyChartGeoPlugin(mockChart, runtime);
      expect(rotateFn).toHaveBeenCalledWith([100, 0]);
    });

    test("applies rotation for conicConformal projection", () => {
      createGeoChart(model, { region: "world" });
      const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
      expect(runtime.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("mercator");

      const rotateFn = jest.fn();
      const mockChart = createMockChart(runtime);
      mockChart.scales.projection.projection = { rotate: rotateFn };
      applyChartGeoPlugin(mockChart, runtime);
      expect(rotateFn).not.toHaveBeenCalled();
    });

    test("labelsWithValues is transformed to the dataset expected by geo chart controller", () => {
      setCellContent(model, "A2", "France");
      setCellContent(model, "A3", "Germany");
      setCellContent(model, "B2", "10");
      setCellContent(model, "B3", "20");
      createGeoChart(model, {
        ...toChartDataSource({ dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" }),
      });

      const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
      const mockChart = createMockChart(runtime);
      applyChartGeoPlugin(mockChart, runtime);

      expect(mockChart.data.datasets[0].data).toMatchObject([
        {
          feature: {
            type: "Feature",
            id: "FR",
            properties: { name: "France" },
          },
          value: 10,
        },
        {
          feature: {
            type: "Feature",
            id: "DE",
            properties: { name: "Germany" },
          },
          value: 20,
        },
        {
          feature: {
            type: "Feature",
            id: "ES",
            properties: { name: undefined },
          },
          // The countries that have no data should still be in the runtime, otherwise the missing color won't be applied
          value: undefined,
        },
      ]);
    });
  });

  describe("UPDATE_CHART_REGION", () => {
    test("dispatching UPDATE_CHART_REGION changes the chart region", () => {
      createGeoChart(model, { region: "world" });
      expect(model.getters.getChartDefinition("chartId")).toMatchObject({ region: "world" });

      model.dispatch("UPDATE_CHART_REGION", { chartId: "chartId", region: "usa" });
      expect(model.getters.getChartDefinition("chartId")).toMatchObject({ region: "usa" });
    });

    test("getAvailableChartRegions returns alternatives for a world chart", () => {
      createGeoChart(model, { region: "world" });
      const regions = model.getters.getAvailableChartRegions("chartId");
      expect(regions.map((r) => r.id)).toEqual(["world", "northAmerica"]);
      expect(regions.find((r) => r.id === "usa")).toBeUndefined();
    });

    test("getAvailableChartRegions returns empty array for a usa chart", () => {
      createGeoChart(model, { region: "usa" });
      expect(model.getters.getAvailableChartRegions("chartId")).toEqual([]);
    });

    test("getAvailableChartRegions still uses the initial region after switching", () => {
      createGeoChart(model, { region: "world" });
      model.dispatch("UPDATE_CHART_REGION", { chartId: "chartId", region: "world" });
      // After switching, the initial region ("world") still allows alternatives
      const regions = model.getters.getAvailableChartRegions("chartId");
      expect(regions.length).toBeGreaterThan(0);
      expect(regions.find((r) => r.id === "usa")).toBeUndefined();
    });

    test("UPDATE_CHART_REGION is allowed in readonly mode", () => {
      createGeoChart(model, { region: "world" });
      const readonlyModel = new Model(model.exportData(), {
        mode: "readonly",
        external: { geoJsonService: mockGeoJsonService },
      });
      const result = readonlyModel.dispatch("UPDATE_CHART_REGION", {
        chartId: "chartId",
        region: "world",
      });
      expect(result.isSuccessful).toBe(true);
    });

    test("UPDATE_CHART_REGION is allowed in dashboard mode", () => {
      createGeoChart(model, { region: "world" });
      const dashboardModel = new Model(model.exportData(), {
        mode: "dashboard",
        external: { geoJsonService: mockGeoJsonService },
      });
      const result = dashboardModel.dispatch("UPDATE_CHART_REGION", {
        chartId: "chartId",
        region: "world",
      });
      expect(result.isSuccessful).toBe(true);
    });

    test("getAvailableChartRegions returns empty array for non-geo chart", () => {
      createChart(model, { type: "bar" }, "barChartId");
      expect(model.getters.getAvailableChartRegions("barChartId")).toEqual([]);
    });
  });
});

test("Loading the geo json features triggers a render", async () => {
  const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
  const onUpdate = jest.fn();
  model.on("update", null, onUpdate);

  expect(model.getters.getGeoJsonFeatures("world")).toBeUndefined();
  expect(onUpdate).not.toHaveBeenCalled();

  await nextTick();
  expect(onUpdate).toHaveBeenCalled();
  expect(model.getters.getGeoJsonFeatures("world")).not.toBeUndefined();
});

test("Excel export loads all the used geo json", async () => {
  const spy = jest.spyOn(mockGeoJsonService, "getTopoJson");
  const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
  createGeoChart(model, { region: undefined }, "chart1"); // Defaults to world (first available region)
  createGeoChart(model, { region: "usa" }, "chart2");

  await model.exportXLSX();
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith("world");
  expect(spy).toHaveBeenCalledWith("usa");
});
