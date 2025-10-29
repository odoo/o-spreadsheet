import { Model } from "@odoo/o-spreadsheet-engine";
import { ORIGINAL_BLUE } from "@odoo/o-spreadsheet-engine/helpers/color";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { createBubbleChart } from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";
import { mockChart, mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

mockChart();
const chartId = "chartId";

describe("Bubble chart config side panel", () => {
  test("Click on Edit button will prefill sidepanel", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createBubbleChart(model, TEST_CHART_DATA.bubble, chartId, undefined, {});
    await openChartConfigSidePanel(model, env, chartId);

    expect(fixture.querySelector(".o-chart")).toBeTruthy();
    const labels = fixture.querySelectorAll(".o-data-labels");
    expect((labels[0].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.dataSets[0].dataRange
    );
    expect((labels[1].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.xRange
    );
    expect((labels[2].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.labelRange
    );
    expect((labels[3].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.sizeRange
    );
  });
});

describe("Bubble chart design side panel", () => {
  test("Can change color mode", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createBubbleChart(model, TEST_CHART_DATA.bubble, chartId, undefined, {});
    await openChartDesignSidePanel(model, env, fixture, chartId);
    const choices = Array.from(fixture.querySelectorAll("[name='bubble-color-mode']"));
    const multipleChoice = choices.find(
      (el) => (el as HTMLInputElement).value === "multiple"
    ) as HTMLInputElement;
    expect(multipleChoice.checked).toBe(true);
    const singleChoice = choices.find(
      (el) => (el as HTMLInputElement).value === "single"
    ) as HTMLInputElement;
    expect(singleChoice.checked).toBe(false);
    singleChoice.click();
    expect(singleChoice.checked).toBe(true);
    expect((model.getters.getChartDefinition(chartId) as any).bubbleColor.color).toBe(
      ORIGINAL_BLUE
    );
  });
});
