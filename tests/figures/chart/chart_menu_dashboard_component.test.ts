import { CHART_PADDING_TOP } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "../../../src";
import { createChart, updateChart } from "../../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

mockChart();

let model: Model;
const chartId = "someuuid";

describe("chart menu for dashboard", () => {
  beforeEach(async () => {
    model = new Model();
  });

  test.each(["bar", "line", "pie"] as const)(
    "%s charts have more top padding in dashboard mode if there is no title/legend",
    (chartType) => {
      createChart(model, { type: chartType, legendPosition: "none", title: { text: "" } }, chartId);
      model.updateMode("dashboard");

      let runtime = model.getters.getChartRuntime(chartId) as any;
      expect(runtime.chartJsConfig.options?.layout?.padding?.top).toBe(30);

      updateChart(model, chartId, { title: { text: "some title" } });
      runtime = model.getters.getChartRuntime(chartId) as any;
      expect(runtime.chartJsConfig.options?.layout?.padding?.top).toBe(CHART_PADDING_TOP);

      updateChart(model, chartId, { legendPosition: "top", title: { text: "" } });
      runtime = model.getters.getChartRuntime(chartId) as any;
      expect(runtime.chartJsConfig.options?.layout?.padding?.top).toBe(CHART_PADDING_TOP);
    }
  );

  test("Can open menu to copy/download chart in dashboard mode", async () => {
    createChart(model, { type: "bar" }, chartId);
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    triggerMouseEvent(".o-figure", "contextmenu");
    await nextTick();
    expect(".o-menu-item").toHaveCount(0);

    await click(fixture, ".o-figure .fa-ellipsis-v");
    const menuItems = [...document.querySelectorAll<HTMLElement>(".o-menu-item")].map(
      (item) => item.dataset.name
    );

    expect(menuItems).toEqual(["copy_as_image", "download"]);
  });
});
