import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { HeatmapChartDefinition } from "../../../../src/types/chart/heatmap_chart";
import {
  click,
  createHeatmapChart,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
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
    const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-data-labels .o-selection input");
    expect(inputs[0]).toHaveValue(TEST_CHART_DATA.heatmap.xRange);
    expect(inputs[1]).toHaveValue(TEST_CHART_DATA.heatmap.yRange);
    expect(inputs[2]).toHaveValue(TEST_CHART_DATA.heatmap.sizeRange);
  });

  test("dataSetsHaveTitle checkbox uses the same wording as other chart config panels", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createHeatmapChart(model, TEST_CHART_DATA.heatmap, chartId, undefined, {});
    await openChartConfigSidePanel(model, env, chartId);

    // sizeRange is "C2:C5": a vertical (multi-row) range -> header is the first row, row 2
    expect(fixture.querySelector(".o-checkbox span")).toHaveText("Use row 2 as headers");
  });

  test.each([
    ["xRange", 0, "B3:B6"],
    ["yRange", 1, "A3:A6"],
    ["sizeRange", 2, "C3:C6"],
  ] as const)("can edit the %s", async (key, inputIndex, newRange) => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createHeatmapChart(model, TEST_CHART_DATA.heatmap, chartId, undefined, {});
    await openChartConfigSidePanel(model, env, chartId);

    const input = fixture.querySelectorAll<HTMLInputElement>(".o-data-labels .o-selection input")[
      inputIndex
    ];
    await setInputValueAndTrigger(input, newRange);
    await simulateClick(".o-data-labels .o-selection-ok");
    const definition = model.getters.getChartDefinition(chartId) as HeatmapChartDefinition<string>;
    expect(definition[key]).toBe(newRange);
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

    let definition = model.getters.getChartDefinition(chartId) as HeatmapChartDefinition<string>;
    expect(definition.missingValueColor).toBeUndefined();

    await click(colorPickerButton!);
    await click(fixture, '.o-popover [data-color="#0000FF"]');
    definition = model.getters.getChartDefinition(chartId) as HeatmapChartDefinition<string>;
    expect(definition.missingValueColor).toBe("#0000FF");
  });
});
