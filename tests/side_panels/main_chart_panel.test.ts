import { Model, SpreadsheetChildEnv } from "../../src";
import { ChartPanel } from "../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { openChartDesignSidePanel } from "../test_helpers/chart_helpers";
import { createChart } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

async function mountChartSidePanel(figureId) {
  const props = { figureId, onCloseSidePanel: () => {} };
  ({ fixture, env } = await mountComponentWithPortalTarget(ChartPanel, { props, model }));
}

describe("ChartPanel", () => {
  test("restores scroll position when switching tabs", async () => {
    model = new Model();
    createChart(model, { type: "bar" }, "chartId");

    await mountChartSidePanel("chartId");
    await openChartDesignSidePanel(model, env, fixture, "chartId");

    const chartPanel = fixture.querySelector(".o-panel-content")!;
    chartPanel.scrollTop = 100;

    const configTab = fixture.querySelector(".o-panel-element.inactive")!;
    await click(configTab);
    expect(chartPanel.scrollTop).toBe(0);

    const designTab = fixture.querySelector(".o-panel-element.inactive")!;
    await click(designTab);
    expect(chartPanel.scrollTop).toBe(100);
  });
});
