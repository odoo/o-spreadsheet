import { BarChartDefinition, BarChartRuntime } from "../../../src/types/chart/bar_chart";
import { BubbleChartDefinition } from "../../../src/types/chart/bubble_chart";
import { CalendarChartDefinition } from "../../../src/types/chart/calendar_chart";
import { ComboChartDefinition } from "../../../src/types/chart/combo_chart";
import { FunnelChartDefinition } from "../../../src/types/chart/funnel_chart";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import { PieChartDefinition } from "../../../src/types/chart/pie_chart";
import { RadarChartDefinition } from "../../../src/types/chart/radar_chart";
import { ScatterChartDefinition } from "../../../src/types/chart/scatter_chart";
import { drawChartOnNodeCanvas, toChartDataSource } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("Bar chart show value", () => {
  test("Can show value on a bar chart", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Outline color is the same as the background color", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      background: "#000000",
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are offset so they are not displayed on top of another", () => {
    const model = createModelFromGrid({ A1: "1", B1: "1", C1: "1", A2: "100", B2: "1", C2: "1" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      stacked: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values close to 0 are not displayed over the x axis", () => {
    const model = createModelFromGrid({ A1: "20", A2: "0.1", B2: "-0.1", A3: "0.1", B3: "0.1" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      stacked: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Can show values on a stacked bar chart with total line", () => {
    const model = createModelFromGrid({ A1: "42", B1: "8", A2: "26", B2: "4" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      showTotalLine: true,
      stacked: true,
      title: { text: "" },
      legendPosition: "none",
    };

    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are not shown when hovering a legend item of another dataset", () => {
    const model = createModelFromGrid({ A1: "42", B1: "8", A2: "26", B2: "4" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "top",
    };
    createChart(model, definition, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as any;
    const legend = {
      chart: { ...runtime.chartJsConfig, update: jest.fn() },
    };

    runtime.chartJsConfig.options.plugins.legend.onHover({}, { datasetIndex: 0 }, legend);
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Pie chart show value", () => {
  test("Can show values on a pie chart", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3", B1: "1", B2: "2", B3: "3" });
    const definition: Partial<PieChartDefinition<string>> & { type: "pie" } = {
      type: "pie",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Zero and very small slices do not show their values in a pie chart", () => {
    const model = createModelFromGrid({ A1: "a", A2: "b", A3: "c", B1: "0", B2: "2", B3: "300" });
    const definition: Partial<PieChartDefinition<string>> & { type: "pie" } = {
      type: "pie",
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B3" }],
        labelRange: "A1:A3",
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Line chart show value", () => {
  test("Can show values on a line chart", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "9", A4: "4", A5: "5" });
    const definition: Partial<LineChartDefinition<string>> & { type: "line" } = {
      type: "line",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Scatter chart show value", () => {
  test("Can show values on a scatter chart", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "9", A4: "4", A5: "5" });
    const definition: Partial<ScatterChartDefinition<string>> & { type: "scatter" } = {
      type: "scatter",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Funnel chart show value", () => {
  test("Can show values on a funnel chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "20", A3: "15", A4: "7", A5: "2" });
    const definition: Partial<FunnelChartDefinition<string>> & { type: "funnel" } = {
      type: "funnel",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are centered on very small funnel bars", () => {
    const model = createModelFromGrid({ A1: "2000", A2: "152", A3: "100", A4: "99", A5: "98" });
    const definition: Partial<FunnelChartDefinition<string>> & { type: "funnel" } = {
      type: "funnel",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("radar chart show value", () => {
  test("Can show values on a radar chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "20", A3: "15", A4: "7", A5: "2" });
    const definition: Partial<RadarChartDefinition<string>> & { type: "radar" } = {
      type: "radar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Can show values on a filled radar chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "20", A3: "15", A4: "7", A5: "2" });
    const definition: Partial<RadarChartDefinition<string>> & { type: "radar" } = {
      type: "radar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A5" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      fillArea: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Horizontal bar chart show value", () => {
  test("Can show values on an horizontal bar chart", () => {
    const model = createModelFromGrid({ A1: "10", B1: "12", C1: "8", A2: "100", B2: "1", C2: "1" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      stacked: true,
      horizontal: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Can show values on an horizontal stacked bar chart with total line", () => {
    const model = createModelFromGrid({ A1: "42", B1: "8", A2: "26", B2: "4" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      showTotalLine: true,
      stacked: true,
      horizontal: true,
      title: { text: "" },
      legendPosition: "none",
    };

    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values close to 0 are not displayed over the y axis", () => {
    const model = createModelFromGrid({ A1: "20", A2: "0.1", B2: "-0.1", A3: "0.1", B3: "0.1" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      horizontal: true,
      showValues: true,
      stacked: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("calendar chart show value", () => {
  test("Can show values on a calendar chart", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "01/01/2024", B1: "1",
      A2: "01/02/2024", B2: "2",
      A3: "02/05/2024", B3: "3",
      A4: "02/06/2024", B4: "4",
    });
    const definition: Partial<CalendarChartDefinition<string>> & { type: "calendar" } = {
      type: "calendar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
        labelRange: "A1:A4",
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
      verticalGroupBy: "day_of_week",
      horizontalGroupBy: "month_number",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are not shown if the chart is too small", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "01/01/2024", B1: "1",
      A2: "01/02/2024", B2: "2",
      A3: "02/05/2024", B3: "3",
      A4: "02/06/2024", B4: "4",
    });
    const definition: Partial<CalendarChartDefinition<string>> & { type: "calendar" } = {
      type: "calendar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
        labelRange: "A1:A4",
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
      verticalGroupBy: "day_of_week",
      horizontalGroupBy: "month_number",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime, { width: 300, height: 80 })).toMatchImageSnapshot();
  });
});

describe("bubble chart show value", () => {
  test("Can show values on a bubble chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "20", A3: "15", A4: "7", A5: "2" });
    const definition: Partial<BubbleChartDefinition<string>> & { type: "bubble" } = {
      yRanges: ["A1:A5"],
      xRange: "A1:A5",
      sizeRange: "A1:A5",
      bubbleColor: { color: "multiple" },
      type: "bubble",
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Can show values on a bubble chart without bubble size", () => {
    const model = createModelFromGrid({ A1: "30", A2: "20", A3: "15", A4: "7", A5: "2" });
    const definition: Partial<BubbleChartDefinition<string>> & { type: "bubble" } = {
      yRanges: ["A1:A5"],
      xRange: "A1:A5",
      sizeRange: undefined,
      bubbleColor: { color: "multiple" },
      type: "bubble",
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});

describe("Combo chart show value", () => {
  test("Can show value on a combo chart", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3", B1: "0", B2: "1", B3: "2.5" });
    const definition: Partial<ComboChartDefinition<string>> & { type: "combo" } = {
      type: "combo",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});
