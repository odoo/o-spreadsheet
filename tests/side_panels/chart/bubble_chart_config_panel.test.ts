jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/label_range/label_range",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class ChartLabelRange extends Component {
      static template = xml/* xml */ `<div class="chart-label-range"/>`;
      static props = { "*": Object };
    }
    return { ChartLabelRange };
  }
);

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/data_series/data_series",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class ChartDataSeries extends Component {
      static template = xml/* xml */ `<div class="chart-data-series"/>`;
      static props = { "*": Object };
    }
    return { ChartDataSeries };
  }
);

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/error_section/error_section",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class ChartErrorSection extends Component {
      static template = xml/* xml */ `<div class="chart-error-section"/>`;
      static props = { "*": Object };
    }
    return { ChartErrorSection };
  }
);

import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { BubbleChartConfigPanel } from "../../../src/components/side_panel/chart/bubble_chart/bubble_chart_config_panel";
import { CommandResult, DispatchResult, UID } from "../../../src/types";
import { mountComponent } from "../../test_helpers/helpers";

const CHART_ID = "chart-id" as UID;

function makeDefinition(overrides: Partial<BubbleChartDefinition> = {}): BubbleChartDefinition {
  return {
    type: "bubble",
    title: { text: "Bubble chart" },
    dataSets: [
      {
        dataRange: "A1:A5",
      },
    ],
    dataSetsHaveTitle: false,
    labelRange: "B1:B5",
    legendPosition: "top",
    labelsAsText: true,
    zoomable: false,
    ...overrides,
  } as BubbleChartDefinition;
}

describe("BubbleChartConfigPanel", () => {
  test("renders sections for axis, labels, and bubble sizes", async () => {
    const { fixture } = await mountComponent(BubbleChartConfigPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition(),
        canUpdateChart: () => DispatchResult.Success,
        updateChart: () => DispatchResult.Success,
      },
    });

    expect(fixture.querySelectorAll(".chart-data-series").length).toBe(1);
    expect(fixture.querySelectorAll(".chart-label-range").length).toBe(3);
  });

  test("updates the x-axis range when changed", async () => {
    const canUpdateChart = jest.fn().mockReturnValue(DispatchResult.Success);
    const { parent } = await mountComponent(BubbleChartConfigPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition(),
        canUpdateChart,
        updateChart: () => DispatchResult.Success,
      },
    });

    const newRange = "Sheet1!C1:C5";
    const panel = parent as unknown as BubbleChartConfigPanel;
    panel.onXAxisRangeChanged([newRange]);

    expect(canUpdateChart).toHaveBeenCalledWith(CHART_ID, { xRange: newRange });
    expect(panel.getXAxisRange()).toBe(newRange);
  });

  test("confirms the bubble size range", async () => {
    const updateChart = jest.fn().mockReturnValue(DispatchResult.Success);
    const { parent } = await mountComponent(BubbleChartConfigPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition(),
        canUpdateChart: () => DispatchResult.Success,
        updateChart,
      },
    });

    const sizeRange = "Sheet1!D1:D5";
    const panel = parent as unknown as BubbleChartConfigPanel;
    panel.onBubbleSizeRangeChanged([sizeRange]);
    panel.onBubbleSizeRangeConfirmed();

    expect(updateChart).toHaveBeenCalledWith(CHART_ID, { sizeRange });
    expect(panel.getBubbleSizeRange()).toBe(sizeRange);
  });

  test("marks the bubble size range as invalid when validation fails", async () => {
    const invalidResult = new DispatchResult(CommandResult.InvalidLabelRange);
    const canUpdateChart = jest.fn().mockReturnValue(invalidResult);
    const { parent } = await mountComponent(BubbleChartConfigPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition(),
        canUpdateChart,
        updateChart: () => DispatchResult.Success,
      },
    });

    const panel = parent as unknown as BubbleChartConfigPanel;
    panel.onBubbleSizeRangeChanged(["Sheet1!D1:D5"]);

    expect(panel.isBubbleSizeRangeInvalid).toBe(true);
    expect(panel.errorMessages.some((message) => message.toString() === "Labels are invalid")).toBe(
      true
    );
  });
});
