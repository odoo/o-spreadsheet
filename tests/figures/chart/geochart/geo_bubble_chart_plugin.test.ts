import { Model } from "../../../../src";
import { GeoBubbleChartRuntime } from "../../../../src/types/chart/geo_bubble_chart";
import { createGeoBubbleChart, setFormat, updateChart } from "../../../test_helpers";
import { getChartTooltipValues, toChartDataSource } from "../../../test_helpers/chart_helpers";
import {
  cityCoordinates,
  mockGeoJsonService,
  nextTick,
  setGrid,
} from "../../../test_helpers/helpers";

let model: Model;

beforeEach(async () => {
  model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
  // Wait for the geoJsonService to resolve the promise and cache the geoJson features
  model.getters.getGeoChartAvailableRegions();
  model.getters.getGeoJsonFeatures("world");
  for (const city of Object.keys(cityCoordinates)) {
    model.getters.getCityCoordinates(city);
  }
  await nextTick();
});

// /**
//  * Get the data points of the chart that have a value.
//  * It's useful because the chart dataset always contains a point for ALL the features, even if they have no value
//  */
// function getGeoChartNonEmptyData(runtime: GeoChartRuntime) {
//   const dataPoints: { value: number; feature: any }[] = [];
//   for (let i = 0; i < runtime.chartJsConfig.data.datasets[0].data.length; i++) {
//     const data = runtime.chartJsConfig.data.datasets[0].data[i] as any;
//     if (data.value !== undefined) {
//       dataPoints.push(data);
//     }
//   }
//   return dataPoints;
// }

function getChartConfig(chartId: string) {
  return (model.getters.getChartRuntime(chartId) as GeoBubbleChartRuntime).chartJsConfig;
}

// ADRM TODO
jest.setTimeout(100000);

describe("Geo charts plugin tests", () => {
  test("Basic geo bubble chart runtime", () => {
    setGrid(model, { A2: "Paris", A3: "Berlin", B2: "10", B3: "20" });
    createGeoBubbleChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" }),
    });

    const config = getChartConfig("chartId");
    expect(config.data.labels).toEqual(["Paris", "Berlin"]);
    expect(config.data.datasets[0].data).toEqual([
      { value: 10, ...cityCoordinates.paris },
      { value: 20, ...cityCoordinates.berlin },
    ]);
  });

  test("Points with empty/wrong values are not in the runtime", () => {
    setGrid(model, { A2: "Paris", B2: "10", A3: "NotACity", B3: "20", A4: "Berlin", B4: "NaN" });

    createGeoBubbleChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" }),
    });
    const config = getChartConfig("chartId");
    expect(config.data.labels).toEqual(["Paris"]);
    expect(config.data.datasets[0].data).toEqual([{ value: 10, ...cityCoordinates.paris }]);
  });

  test("Data with the same label is aggregated", () => {
    setGrid(model, { A2: "Paris", B2: "10", A3: "Paris", B3: "20", A4: "Berlin", B4: "5" });

    createGeoBubbleChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B4" }], labelRange: "A1:A4" }),
    });
    const config = getChartConfig("chartId");
    expect(config.data.labels).toEqual(["Paris", "Berlin"]);
    expect(config.data.datasets[0].data).toEqual([
      { value: 30, ...cityCoordinates.paris },
      { value: 5, ...cityCoordinates.berlin },
    ]);
  });

  test("Only the first dataset is kept", () => {
    setGrid(model, { A2: "Paris", A3: "Berlin", B2: "10", B3: "20", C2: "100", C3: "200" });

    createGeoBubbleChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B3" }, { dataRange: "C1:C3" }],
        labelRange: "A1:A3",
      }),
    });
    const config = getChartConfig("chartId");
    expect(config.data.labels).toEqual(["Paris", "Berlin"]);
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0].data).toEqual([
      { value: 10, ...cityCoordinates.paris },
      { value: 20, ...cityCoordinates.berlin },
    ]);
  });

  test("Geo bubble charts use custom tooltip", () => {
    createGeoBubbleChart(model, {});
    const config = getChartConfig("chartId");
    expect(config.options?.plugins?.tooltip).toMatchObject({
      enabled: false,
      external: expect.any(Function),
    });
  });

  test("Tooltip values have the same format as the data", () => {
    setGrid(model, { A2: "Paris", B2: "20" });
    setFormat(model, "B2", "$0");

    createGeoBubbleChart(model, {
      ...toChartDataSource({ dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" }),
    });
    const runtime = model.getters.getChartRuntime("chartId") as GeoBubbleChartRuntime;
    const parsed = { x: cityCoordinates.paris.latitude, y: cityCoordinates.paris.latitude, r: 20 };
    const tooltipItem = { datasetIndex: 0, dataIndex: 0, parsed };
    const tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Paris", label: "$20" });
  });

  test("The projection used depends on the region selected", () => {
    createGeoBubbleChart(model, { region: "world" });
    let config = getChartConfig("chartId");
    expect(config.options?.scales?.projection?.["projection"]).toBe("mercator");

    updateChart(model, "chartId", { region: "usa" });
    config = getChartConfig("chartId");
    expect(config.options?.scales?.projection?.["projection"]).toBe("albersUsa");
  });
});
