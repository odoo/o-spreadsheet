import { Model, UID } from "../../../../src";
import { ChartJsComponent } from "../../../../src/components/figures/chart/chartJs/chartjs";
import { DevicePixelRatioPlugin } from "../../../../src/owl_plugins/device_pixel_ratio_owl_plugin";
import { createGeoChart } from "../../../test_helpers";
import { mockChart, mockGeoJsonService, mountComponent } from "../../../test_helpers/helpers";

mockChart();

async function mountGeoChart(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId);
  return await mountComponent(ChartJsComponent, {
    model,
    props: { chartId, runtime },
    providedPlugins: [DevicePixelRatioPlugin],
  });
}

test("Geo chart is drawn on a canvas when the region is available", async () => {
  const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
  createGeoChart(model, { region: "world" }, "chartId");
  const { fixture } = await mountGeoChart(model, "chartId");
  expect(".o-figure-canvas").toHaveCount(1);
  expect(fixture.textContent).not.toContain("Region World not available");
});

test("Geo chart displays an error message instead of the canvas when the region is not available", async () => {
  const geoJsonService = { ...mockGeoJsonService, isRegionAvailable: () => false };
  const model = new Model({}, { external: { geoJsonService } });
  createGeoChart(model, { region: "world" }, "chartId");
  const { fixture } = await mountGeoChart(model, "chartId");
  expect(".o-figure-canvas").toHaveCount(0);
  expect(fixture.querySelector(".o-figure-error")).toMatchSnapshot();
});

test("Geo chart displays an error message when no region is available", async () => {
  const geoJsonService = { ...mockGeoJsonService, getAvailableRegions: () => [] };
  const model = new Model({}, { external: { geoJsonService } });
  createGeoChart(model, {}, "chartId");
  const { fixture } = await mountGeoChart(model, "chartId");
  expect(".o-figure-canvas").toHaveCount(0);
  expect(fixture.querySelector(".o-figure-error")).toMatchSnapshot();
});
