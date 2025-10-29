import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { FIRST_CHART_COLOR } from "../../../../src/helpers";
import { BubbleChartDefinition } from "../../../../src/types/chart/bubble_chart";
import { click, createBubbleChart, simulateClick } from "../../../test_helpers";
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

    expect((fixture.querySelector(".o-data-series input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.dataSets?.[0].dataRange
    );

    const labels = fixture.querySelectorAll(".o-data-labels");
    expect((labels[0].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.xRange
    );
    expect((labels[1].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
      TEST_CHART_DATA.bubble.labelRange
    );
    expect((labels[2].querySelector(".o-selection input") as HTMLInputElement).value).toBe(
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

    const multipleChoice = fixture.querySelector(
      ".o-radio > input[value='multiple']"
    ) as HTMLInputElement;
    expect(multipleChoice.checked).toBe(true);

    const singleChoice = fixture.querySelector(
      ".o-radio > input[value='single']"
    ) as HTMLInputElement;
    expect(singleChoice.checked).toBe(false);

    await simulateClick(singleChoice);
    expect(singleChoice.checked).toBe(true);
    const definition = model.getters.getChartDefinition(chartId) as BubbleChartDefinition;
    expect(definition.bubbleColor.color).toBe(FIRST_CHART_COLOR);
  });

  test("Can change single color", async () => {
    const model = new Model({});
    const { fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model });
    createBubbleChart(
      model,
      {
        ...TEST_CHART_DATA.bubble,
        bubbleColor: { color: "#0000FF" },
      },
      chartId,
      undefined,
      {}
    );

    await openChartDesignSidePanel(model, env, fixture, chartId);

    const color_menu = fixture.querySelectorAll(".o-round-color-picker-button")[1];
    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#FF0000'");

    const definition = model.getters.getChartDefinition(chartId) as BubbleChartDefinition;
    expect(definition.bubbleColor.color).toBe("#FF0000");
  });
});
