import { Model } from "../../../../src";
import { GeoChartRuntime } from "../../../../src/types/chart/geo_chart";
import { createGeoChart, setCellContent, setFormat, updateChart } from "../../../test_helpers";
import { mockChart, mockGeoJsonService, nextTick } from "../../../test_helpers/helpers";

mockChart();
let model: Model;

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
  test("Basic geo chart runtime", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "A3", "Germany");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");
    createGeoChart(model, { dataSets: [{ dataRange: "B1:B3" }], labelRange: ["A1:A3"] });

    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 10, feature: { properties: { name: "France" } } },
      { value: 20, feature: { properties: { name: "Germany" } } },
    ]);
  });

  test("Points with empty/wrong labels are not kept in the runtime", () => {
    setCellContent(model, "A2", "");
    setCellContent(model, "A3", "NotARealCountry");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");

    createGeoChart(model, { dataSets: [{ dataRange: "B1:B4" }], labelRange: ["A1:A4"] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toEqual([]);
  });

  test("Data with the same label is aggregated", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "A3", "France");
    setCellContent(model, "B2", "10");
    setCellContent(model, "B3", "20");

    createGeoChart(model, { dataSets: [{ dataRange: "B1:B4" }], labelRange: ["A1:A4"] }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(getGeoChartNonEmptyData(runtime)).toMatchObject([
      { value: 30, feature: { properties: { name: "France" } } },
    ]);
  });

  test("Only the first dataset is kept", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "10");
    setCellContent(model, "C3", "20");

    createGeoChart(model, {
      dataSets: [{ dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
      labelRange: ["A1:A3"],
    });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    const dataPoints = getGeoChartNonEmptyData(runtime);
    expect(dataPoints).toHaveLength(1);
    expect(dataPoints).toMatchObject([{ value: 10, feature: { properties: { name: "France" } } }]);
  });

  test("Ticks values have the same format as the data", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "20");
    setFormat(model, "B2", "$0");

    createGeoChart(model, { dataSets: [{ dataRange: "B1:B2" }], labelRange: ["A1:A2"] });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["ticks"]?.callback?.(20)).toBe("$20");
  });

  test("Tooltip values have the same format as the data", () => {
    setCellContent(model, "A2", "France");
    setCellContent(model, "B2", "20");
    setFormat(model, "B2", "$0");

    createGeoChart(model, { dataSets: [{ dataRange: "B1:B2" }], labelRange: ["A1:A2"] });
    const runtime = model.getters.getChartRuntime("chartId") as any;
    expect(
      runtime.chartJsConfig.options?.plugins?.tooltip?.callbacks?.label?.({
        raw: {
          value: 20,
          feature: { properties: { name: "France" } },
        },
      })
    ).toBe("France: $20");
  });

  test("The projection used depends on the region selected", () => {
    createGeoChart(model, { region: "world" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("mercator");

    updateChart(model, "chartId", { region: "usa" });
    const runtime2 = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime2.chartJsConfig.options?.scales?.projection?.["projection"]).toBe("albersUsa");
  });

  test("Can define colors of countries not in the dataset", () => {
    createGeoChart(model, { missingValueColor: "#ff0000" });
    const runtime = model.getters.getChartRuntime("chartId") as GeoChartRuntime;
    expect(runtime.chartJsConfig.options?.scales?.color?.["missing"]).toBe("#ff0000");

    // The countries that have no data should still be in the runtime, otherwise the missing color won't be applied
    expect(runtime.chartJsConfig.data.datasets[0].data.length).toBe(3);
  });
});
