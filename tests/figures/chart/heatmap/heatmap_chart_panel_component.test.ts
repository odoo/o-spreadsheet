import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { HeatmapChartDefinition } from "../../../../src/types/chart/heatmap_chart";
import { createHeatmapChart } from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";
import { mockChart, mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

mockChart();
const chartId = "chartId";

describe("Heatmap chart config side panel", () => {
  test("Click on Edit button will prefill sidepanel", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createHeatmapChart(model, TEST_CHART_DATA.heatmap, chartId, undefined, {});
    await openChartConfigSidePanel(model, env, chartId);

    expect(fixture.querySelector(".o-chart")).toBeTruthy();

    const labels = fixture.querySelectorAll(".o-data-labels");
    expect((labels[0].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.heatmap.rowRange
    );
    expect((labels[1].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.heatmap.columnRange
    );
    expect((labels[2].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.heatmap.dataRange
    );
  });

  test("dataSetsHaveTitle checkbox uses the same wording as other chart config panels", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createHeatmapChart(model, TEST_CHART_DATA.heatmap, chartId, undefined, {});
    await openChartConfigSidePanel(model, env, chartId);

    // dataRange is "C2:C5": a vertical (multi-row) range -> header is the first row, row 2
    expect(fixture.querySelector(".o-checkbox span")?.textContent).toBe("Use row 2 as headers");
  });
});

describe("Heatmap chart design side panel", () => {
  test("Can change the missing value color", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createHeatmapChart(model, TEST_CHART_DATA.heatmap, chartId, undefined, {});
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const colorPickerButton = fixture.querySelector(
      ".o-missing-value .o-round-color-picker-button"
    );
    expect(colorPickerButton).toBeTruthy();

    const definition = model.getters.getChartDefinition(chartId) as HeatmapChartDefinition;
    expect(definition.missingValueColor).toBeUndefined();
  });
});
