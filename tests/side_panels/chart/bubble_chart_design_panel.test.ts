import { DispatchResult, UID } from "../../../src/types";
import { mountComponent } from "../../test_helpers/helpers";

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/general_design/general_design_editor",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class GeneralDesignEditor extends Component {
      static template = xml/* xml */ `
        <div class="general-design-editor">
          <t t-slot="general-extension" t-props="props"/>
        </div>
      `;
      static props = { "*": Object };
    }
    return { GeneralDesignEditor };
  }
);

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/series_design/series_with_axis_design_editor",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class SeriesWithAxisDesignEditor extends Component {
      static template = xml/* xml */ `<div class="series-with-axis-editor"/>`;
      static props = { "*": Object };
    }
    return { SeriesWithAxisDesignEditor };
  }
);

jest.mock("../../../src/components/side_panel/chart/building_blocks/legend/legend", () => {
  const { Component, xml } = require("@odoo/owl");
  class ChartLegend extends Component {
    static template = xml/* xml */ `<div class="chart-legend"/>`;
    static props = { "*": Object };
  }
  return { ChartLegend };
});

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/show_values/show_values",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class ChartShowValues extends Component {
      static template = xml/* xml */ `<div class="chart-show-values"/>`;
      static props = { "*": Object };
    }
    return { ChartShowValues };
  }
);

jest.mock(
  "../../../src/components/side_panel/components/round_color_picker/round_color_picker",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class RoundColorPicker extends Component {
      static template = xml/* xml */ `<div class="round-color-picker"/>`;
      static props = { "*": Object };
    }
    return { RoundColorPicker };
  }
);

jest.mock(
  "../../../src/components/side_panel/chart/building_blocks/chart_title/chart_title",
  () => {
    const { Component, xml } = require("@odoo/owl");
    class ChartTitle extends Component {
      static template = xml/* xml */ `<div class="chart-title"/>`;
      static props = { "*": Object };
    }
    return { ChartTitle };
  }
);

import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { BubbleChartDesignPanel } from "../../../src/components/side_panel/chart/bubble_chart/bubble_chart_design_panel";

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
    colorMode: "single",
    ...overrides,
  } as BubbleChartDefinition;
}

describe("BubbleChartDesignPanel", () => {
  test("renders the color mode selector with the current value", async () => {
    const definition = makeDefinition({ colorMode: "multiple" });
    const { fixture } = await mountComponent(BubbleChartDesignPanel, {
      props: {
        chartId: CHART_ID,
        definition,
        canUpdateChart: () => DispatchResult.Success,
        updateChart: () => DispatchResult.Success,
      },
    });

    const multipleColorOption = fixture.querySelector(
      "input[value='multiple']"
    ) as HTMLInputElement;
    const singleColorOption = fixture.querySelector("input[value='single']") as HTMLInputElement;

    expect(multipleColorOption).not.toBeNull();
    expect(singleColorOption).not.toBeNull();
    expect(multipleColorOption.checked).toBe(true);
    expect(singleColorOption.checked).toBe(false);
  });

  test("updates the color mode when the selection changes", async () => {
    const updateChart = jest.fn().mockReturnValue(DispatchResult.Success);
    const { fixture, parent } = await mountComponent(BubbleChartDesignPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition({ colorMode: "multiple" }),
        canUpdateChart: () => DispatchResult.Success,
        updateChart,
      },
    });

    const singleColorOption = fixture.querySelector("input[value='single']") as HTMLInputElement;
    expect(singleColorOption).not.toBeNull();

    const panel = parent as unknown as BubbleChartDesignPanel;
    panel.onColorModeChange("single");

    expect(updateChart).toHaveBeenCalledWith(CHART_ID, { colorMode: "single" });
  });

  test("defaults to single color mode when undefined", async () => {
    const { parent } = await mountComponent(BubbleChartDesignPanel, {
      props: {
        chartId: CHART_ID,
        definition: makeDefinition({ colorMode: undefined }),
        canUpdateChart: () => DispatchResult.Success,
        updateChart: () => DispatchResult.Success,
      },
    });

    const panel = parent as unknown as BubbleChartDesignPanel;
    expect(panel.colorMode).toBe("single");
  });
});
