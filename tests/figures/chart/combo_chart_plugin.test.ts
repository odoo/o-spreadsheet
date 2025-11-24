import { BarChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ComboChartDataSet,
  ComboChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { ChartConfiguration } from "chart.js";
import { ChartCreationContext, Model } from "../../../src";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartLegendLabels,
  getChartTooltipValues,
} from "../../test_helpers/chart_helpers";
import {
  createChart,
  setCellContent,
  setCellFormat,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";
import { ComboChart } from "./../../../src/helpers/figures/charts/combo_chart";

describe("combo chart", () => {
  test("create combo chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
    };
    const definition = ComboChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "combo",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1", type: "bar" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      aggregated: true,
      axesDesign: {},
      showValues: false,
      hideDataMarkers: false,
      zoomable: false,
      humanize: false,
    });
  });

  test("both axis and tooltips formats are based on their data set", () => {
    const model = new Model();
    setCellContent(model, "B1", "1000");
    setCellContent(model, "C1", "2000");
    setCellFormat(model, "B1", "0.00%"); // first data set
    setCellFormat(model, "C1", "0.00[$$]"); // second data set

    createChart(
      model,
      {
        type: "combo",
        labelRange: "A1:A2",
        dataSets: [
          { dataRange: "B1:B2", yAxisId: "y" },
          { dataRange: "C1:C2", yAxisId: "y1" },
        ],
        dataSetsHaveTitle: false,
        humanize: false,
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as ComboChartRuntime;
    const scales = runtime.chartJsConfig.options?.scales as any;
    expect(scales?.y?.ticks?.callback?.apply(null, [1])).toBe("100.00%");
    expect(scales?.y1?.ticks?.callback?.apply(null, [1])).toBe("1.00$");

    let tooltipItem = { parsed: { y: 20 }, dataIndex: 0, dataset: { yAxisID: "y", label: "Ds 1" } };
    let tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Ds 1", label: "2000.00%" });

    tooltipItem = { parsed: { y: 20 }, dataIndex: 1, dataset: { yAxisID: "y1", label: "Ds 2" } };
    tooltipValues = getChartTooltipValues(runtime, tooltipItem);
    expect(tooltipValues).toEqual({ beforeLabel: "Ds 2", label: "20.00$" });
  });

  test("Can edit the type of the series", () => {
    const model = new Model();

    setCellContent(model, "A1", "Alice");
    setCellContent(model, "A2", "Bob");
    setCellContent(model, "B1", "1");
    setCellContent(model, "B2", "2");
    setCellContent(model, "C1", "10");
    setCellContent(model, "C2", "20");

    createChart(
      model,
      {
        type: "combo",
        labelRange: "A1:A2",
        dataSets: [{ dataRange: "B1:B2" }, { dataRange: "C1:C2" }],
        dataSetsHaveTitle: false,
      },
      "1"
    );
    let runtime = model.getters.getChartRuntime("1") as ComboChartRuntime;
    expect(runtime.chartJsConfig.data?.datasets?.[1].type).toBe("line");
    updateChart(model, "1", {
      dataSets: [{ dataRange: "B1:B2" }, { dataRange: "C1:C2", type: "bar" }],
    });
    runtime = model.getters.getChartRuntime("1") as ComboChartRuntime;
    expect(runtime.chartJsConfig.data?.datasets?.[1].type).toBe("bar");
  });

  test("Combo chart legend", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "4",
    });
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "Sheet1!A1:A2", backgroundColor: "#f00", label: "serie_1" },
          { dataRange: "Sheet1!A3:A4", backgroundColor: "#00f", label: "serie_2" },
        ],
        labelRange: "Sheet1!A2:A4",
        type: "combo",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        fontColor: "#000000",
        text: "serie_1",
        hidden: false,
        lineWidth: 3,
        pointStyle: "rect",
        strokeStyle: "#f00",
        fillStyle: "#f00",
        datasetIndex: 0,
      },
      {
        fontColor: "#000000",
        text: "serie_2",
        hidden: false,
        lineWidth: 3,
        pointStyle: "line",
        strokeStyle: "#00f",
        fillStyle: "#00f",
        datasetIndex: 1,
      },
    ]);
  });

  test("Bar spacing is adapted to the number of bar datasets", () => {
    const model = createModelFromGrid({ A2: "2", B2: "3", C2: "4" });

    let dataSets: ComboChartDataSet[] = [
      { dataRange: "A1:A3", type: "bar" },
      { dataRange: "B1:B3", type: "line" },
    ];
    createChart(model, { type: "combo", dataSets }, "chartId");

    let runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    let config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    expect(config.data.datasets[0].barPercentage).toEqual(0.9);
    expect(config.data.datasets[0].categoryPercentage).toEqual(1);

    dataSets = [...dataSets, { dataRange: "C1:C3", type: "bar" }];
    updateChart(model, "chartId", { dataSets });
    runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    expect(config.data.datasets.map((ds) => ds.barPercentage)).toEqual([0.9, undefined, 0.9]); // undefined for line dataset
    expect(config.data.datasets.map((ds) => ds.categoryPercentage)).toEqual([0.8, undefined, 0.8]);
  });
});
