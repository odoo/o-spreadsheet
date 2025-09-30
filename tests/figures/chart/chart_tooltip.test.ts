import { Color } from "@odoo/o-spreadsheet-engine";
import { ChartJSRuntime, Model } from "../../../src";
import { createChart, updateChart } from "../../test_helpers/commands_helpers";

interface TooltipArgs {
  tooltipItem: any;
  backgroundColor?: Color;
  title?: string;
}

function makeTestFixture() {
  if (document.querySelector("#fixture")) {
    return {
      fixture: document.querySelector("#fixture") as HTMLElement,
      canvas: document.querySelector("canvas") as HTMLCanvasElement,
    };
  }
  const fixture = document.createElement("div");
  fixture.id = "fixture";
  document.body.appendChild(fixture);

  const chartContainer = document.createElement("div");
  chartContainer.id = "chart-container";
  fixture.appendChild(chartContainer);

  const mockedChartCanvas = document.createElement("canvas");
  chartContainer.appendChild(mockedChartCanvas);

  return { fixture, canvas: mockedChartCanvas };
}

function openTooltip(chartConfig: ChartJSRuntime, args: TooltipArgs) {
  const tooltip = chartConfig.chartJsConfig.options?.plugins?.tooltip as any;

  const { fixture, canvas } = makeTestFixture();
  const mockChart = {
    canvas: canvas,
    config: chartConfig.chartJsConfig,
    chartArea: { left: 0, top: 0, right: 100, bottom: 100 },
  };
  const mockTooltipModel = {
    opacity: 1,
    title: [args.title || ""], // We cannot use callback.title because we rely on chartJS default behavior
    body: [
      {
        before: [tooltip.callbacks.beforeLabel(args.tooltipItem)],
        lines: [tooltip.callbacks.label(args.tooltipItem)],
      },
    ],
    caretX: 50,
    caretY: 50,
    dataPoints: [args.tooltipItem],
    labelColors: [{ backgroundColor: args.backgroundColor || "#FF00FF" }],
  };
  tooltip!.external!({ chart: mockChart, tooltip: mockTooltipModel });

  return fixture;
}

describe("Chart tooltip", () => {
  test("Basic chart tooltip", () => {
    const model = new Model();
    createChart(model, { type: "bar" }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;
    const tooltipItem = { parsed: { y: 20 }, dataset: { yAxisID: "y", label: "Ds 1" } };

    const fixture = openTooltip(runtime, {
      tooltipItem,
      backgroundColor: "#FFF000",
      title: "Marc",
    });

    expect(".o-tooltip-title").toHaveText("Marc");
    expect(".o-tooltip-label").toHaveText("Ds 1");
    expect(".o-tooltip-value").toHaveText("20");

    const colorBadge = fixture.querySelector(".badge") as HTMLElement;
    expect(colorBadge.style.backgroundColor).toBeSameColorAs("#FFF000");
  });

  test("Opening a new tooltip closes the previous one", () => {
    const model = new Model();
    createChart(model, { type: "bar" }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;
    const tooltipItem = { parsed: { y: 20 }, dataset: { yAxisID: "y", label: "Ds 1" } };

    openTooltip(runtime, { tooltipItem, title: "Marc" });
    expect(".o-chart-custom-tooltip").toHaveCount(1);
    expect(".o-tooltip-title").toHaveText("Marc");

    openTooltip(runtime, { tooltipItem, title: "Jean" });
    expect(".o-chart-custom-tooltip").toHaveCount(1);
    expect(".o-tooltip-title").toHaveText("Jean");
  });

  test("Title div isn't displayed if there is no title", () => {
    const model = new Model();
    createChart(model, { type: "bar" }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;
    const tooltipItem = { parsed: { y: 20 }, dataset: { yAxisID: "y", label: "Ds 1" } };

    openTooltip(runtime, { tooltipItem, title: "" });
    expect(".o-tooltip-title").toHaveCount(0);
  });

  test("Can handle label with colons", () => {
    const model = new Model();
    createChart(model, { type: "bar" }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;
    const tooltipItem = {
      parsed: { y: 20 },
      dataset: { yAxisID: "y", label: "Avengers: Endgame" },
    };

    openTooltip(runtime, { tooltipItem });
    expect(".o-tooltip-label").toHaveText("Avengers: Endgame");
    expect(".o-tooltip-value").toHaveText("20");
  });

  test("Chart tooltip can be humanized", () => {
    const model = new Model();
    createChart(model, { type: "bar", humanize: false }, "chartId");
    let runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;
    const tooltipItem = { parsed: { y: 1000000 }, dataset: { yAxisID: "y", label: "Ds 1" } };

    openTooltip(runtime, {
      tooltipItem,
      backgroundColor: "#FFF000",
      title: "Marc",
    });

    expect(".o-tooltip-value").toHaveText("1,000,000");

    updateChart(model, "chartId", {
      humanize: true,
    });

    runtime = model.getters.getChartRuntime("chartId") as ChartJSRuntime;

    openTooltip(runtime, {
      tooltipItem,
      backgroundColor: "#FFF000",
      title: "Marc",
    });

    expect(".o-tooltip-value").toHaveText("1,000k");
  });
});
