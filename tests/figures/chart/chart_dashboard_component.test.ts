import { Model } from "../../../src";
import { CHART_PADDING_TOP } from "../../../src/constants";
import { LineChartDefinition } from "../../../src/types/chart";
import { createChart, updateChart } from "../../test_helpers/commands_helpers";
import { click } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet } from "../../test_helpers/helpers";

mockChart();

let model: Model;
const chartId = "someuuid";

describe("combo charts", () => {
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

  test("Can change chart type in dashboard", async () => {
    createChart(model, { type: "bar" }, chartId);
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    await click(fixture, ".o-figure [data-id='line']");
    expect(model.getters.getChart(chartId)?.type).toBe("line");
  });

  test("Can only change type of line/pie/bar charts", async () => {
    createChart(model, { type: "radar" }, chartId);
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });
    expect(".o-figure-menu-item").toHaveCount(0);
  });

  test("Original chart configuration is kept when switching back and forth", async () => {
    createChart(model, { type: "line", stacked: true, fillArea: true }, chartId);
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    await click(fixture, ".o-figure [data-id='pie']");
    await click(fixture, ".o-figure [data-id='line']");
    const chartDefinition = model.getters.getChartDefinition(chartId) as LineChartDefinition;
    expect(chartDefinition.type).toBe("line");
    expect(chartDefinition.stacked).toBe(true);
    expect(chartDefinition.fillArea).toBe(true);
  });
});
