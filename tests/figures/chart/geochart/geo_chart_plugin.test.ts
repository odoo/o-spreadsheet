import { Model } from "../../../../src";
import { geoProjectionPlugin } from "../../../../src/components/figures/chart/chartJs/chartjs_geo_projection_plugin";
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
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 10, label: "France", feature: { id: "FR" } },
      { value: 20, label: "Germany", feature: { id: "DE" } },
    ]);
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
    expect(getGeoChartNonEmptyData(runtime)).toEqual([]);
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
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 30, label: "France", feature: { id: "FR" } },
    ]);
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
    const dataPoints = getGeoChartNonEmptyData(runtime);
    expect(dataPoints).toHaveLength(1);
    expect(dataPoints).toMatchObject([{ value: 10, label: "France", feature: { id: "FR" } }]);
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
    const tooltipItem = { raw: { value: 20, label: "France", feature: { id: "FR" } } };
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

    // The countries that have no data should still be in the runtime, otherwise the missing color won't be applied
    expect(runtime.chartJsConfig.data.datasets[0].data.length).toBe(3);
  });

  describe("geoProjectionPlugin", () => {
    test("applies rotation for conicConformal projection", () => {
      const rotateFn = jest.fn();
      const chart = {
        options: { scales: { projection: { projection: "conicConformal" } } },
        scales: { projection: { projection: { rotate: rotateFn } } },
      };
      (geoProjectionPlugin.beforeUpdate as Function)(chart);
      expect(rotateFn).toHaveBeenCalledWith([100, 0]);
    });

    test("does not rotate non-conicConformal projections", () => {
      const rotateFn = jest.fn();
      const chart = {
        options: { scales: { projection: { projection: "mercator" } } },
        scales: { projection: { projection: { rotate: rotateFn } } },
      };
      (geoProjectionPlugin.beforeUpdate as Function)(chart);
      expect(rotateFn).not.toHaveBeenCalled();
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

describe("Geo chart rendering performance safeguards", () => {
  function geoModel() {
    const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
    model.getters.getGeoChartAvailableRegions();
    model.getters.getGeoJsonFeatures("world");
    model.getters.geoFeatureNameToId("world", "France");
    return model;
  }

  test("the map outline is not drawn, it is only used to fit the projection", async () => {
    const model = geoModel();
    await nextTick();
    createGeoChart(model, {});

    const dataset = (model.getters.getChartRuntime("chartId") as GeoChartRuntime).chartJsConfig.data
      .datasets[0] as any;
    // every outline feature is already present in `data`, drawing it would
    // project the whole map a second time for nothing
    expect(dataset.showOutline).toBe(false);
    expect(dataset.outline).toHaveLength(dataset.data.length);
  });

  test("features keep the same identity across runtime regenerations", async () => {
    const model = geoModel();
    await nextTick();
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "10");
    createGeoChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" }),
    });

    const features = () =>
      (
        (model.getters.getChartRuntime("chartId") as GeoChartRuntime).chartJsConfig.data.datasets[0]
          .data as any[]
      ).map((point) => point.feature);

    const before = features();
    expect(before.length).toBeGreaterThan(0);
    // chartjs-chart-geo caches each feature's projected path keyed on object
    // identity, so an unrelated change must not produce new feature objects
    updateChart(model, "chartId", { title: { text: "new title" } });
    features().forEach((feature, i) => expect(feature).toBe(before[i]));
  });

  test("data points expose the geometry and the label under separate keys", async () => {
    const model = geoModel();
    await nextTick();
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "10");
    createGeoChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" }),
    });

    const france = () =>
      (
        (model.getters.getChartRuntime("chartId") as GeoChartRuntime).chartJsConfig.data.datasets[0]
          .data as any[]
      ).find((point) => point.feature.id === "FR");

    const before = france();
    expect(before.label).toBe("France");
    expect(before.value).toBe(10);
    // the geometry is the loader's cached object, handed over untouched
    expect(before.feature).toBe(model.getters.getGeoJsonFeatures("world")![0]);

    // only the light data changes; the shared geometry is never rewritten
    setCellContent(model, "A2", "");
    expect(france().label).toBeUndefined();
    expect(france().feature).toBe(before.feature);
  });
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
