import {
  BarChartDefinition,
  BarChartRuntime,
  FunnelChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
} from "../../../src/types/chart";
import { ComboChartDefinition } from "../../../src/types/chart/combo_chart";
import { drawChartOnNodeCanvas, toChartDataSource } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

describe("Chart show value", () => {
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

describe("Show values with axis min/max", () => {
  test("Values are centered in the visible part of the bars of a column chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "80", A3: "150" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
      axesDesign: { y: { min: 50, max: 100 } },
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are centered in the visible part of the bars of an horizontal bar chart", () => {
    const model = createModelFromGrid({ A1: "30", A2: "80", A3: "150" });
    const definition: Partial<BarChartDefinition<string>> & { type: "bar" } = {
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      horizontal: true,
      title: { text: "" },
      legendPosition: "none",
      axesDesign: { x: { min: 50, max: 100 } },
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });

  test("Values are centered in the visible part of the bars of a combo chart", () => {
    const model = createModelFromGrid({
      A1: "30",
      A2: "80",
      A3: "150",
      B1: "60",
      B2: "90",
      B3: "95",
    });
    const definition: Partial<ComboChartDefinition<string>> & { type: "combo" } = {
      type: "combo",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      showValues: true,
      title: { text: "" },
      legendPosition: "none",
      axesDesign: { y: { min: 50, max: 100 } },
    };
    createChart(model, definition, "chartId");

    const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(drawChartOnNodeCanvas(runtime)).toMatchImageSnapshot();
  });
});
