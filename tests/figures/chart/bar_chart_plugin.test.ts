import { ChartConfiguration } from "chart.js";
import { ChartCreationContext, Model } from "../../../src";
import { BarChartRuntime } from "../../../src/types/chart/bar_chart";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  getChartConfiguration,
  getChartLegendLabels,
  getChartTooltipValues,
  isChartAxisStacked,
  toChartDataSource,
} from "../../test_helpers/chart_helpers";
import {
  createChart,
  createChartDefinitionFromContext,
  hideColumns,
  setCellContent,
  setFormat,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

let model: Model;
describe("bar chart", () => {
  test("create bar chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A1:A4",
      }),
    };
    const definition = createChartDefinitionFromContext("bar", context);
    expect(definition).toEqual({
      type: "bar",
      background: "#123456",
      title: { text: "hello there" },
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      legendPosition: "bottom",
      aggregated: true,
      stacked: true,
      axesDesign: {},
      showValues: false,
      showTotalLine: false,
      horizontal: false,
      zoomable: true,
      humanize: false,
    });
  });

  test("Stacked bar", () => {
    const model = new Model();
    createChart(model, { type: "bar", stacked: false }, "chartId");
    expect(isChartAxisStacked(model, "chartId", "x")).toBeFalsy();
    expect(isChartAxisStacked(model, "chartId", "y")).toBeFalsy();

    updateChart(model, "chartId", { stacked: true });
    expect(isChartAxisStacked(model, "chartId", "x")).toBe(true);
    expect(isChartAxisStacked(model, "chartId", "y")).toBe(true);
  });

  describe("Horizontal bar chart", () => {
    beforeEach(() => {
      model = new Model();
    });

    test("Chart is set as horizontal in chartJS runtime", () => {
      createChart(model, { horizontal: true, type: "bar" }, "id");
      const runtime = model.getters.getChartRuntime("id") as BarChartRuntime;
      expect(runtime.chartJsConfig.options?.indexAxis).toBe("y");
    });

    test("Axis and tooltips are correctly setup for horizontal chart", () => {
      setCellContent(model, "A1", "5");
      setFormat(model, "A1", "#,##0[$€]");

      createChart(
        model,
        {
          horizontal: true,
          type: "bar",
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1", yAxisId: "y" }],
            dataSetsHaveTitle: false,
          }),
          axesDesign: { x: { title: { text: "xAxis" } }, y: { title: { text: "yAxis" } } },
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as BarChartRuntime;
      const options = runtime.chartJsConfig.options as any;
      expect(options.scales.x.title.text).toBe("xAxis");
      expect(options.scales.x.ticks.callback(5)).toBe("5€");
      expect(options.scales.y.title.text).toBe("yAxis");

      const tooltipTestItem = {
        parsed: { x: 5, y: "label" },
        label: "dataSetLabel",
        dataset: { xAxisID: "x" },
      };
      const tooltipValues = getChartTooltipValues(runtime, tooltipTestItem);
      expect(tooltipValues).toEqual({ beforeLabel: "dataSetLabel", label: "5€" });
    });

    test("Horizontal bar chart cannot have datasets on the right", () => {
      const model = new Model({
        sheets: [
          {
            name: "Sheet1",
            colNumber: 10,
            rowNumber: 10,
            rows: {},
            cells: {
              B1: "first column dataset",
              B2: "10",
              B3: "11",
              B4: "12",
            },
          },
        ],
      });
      // Note: this is a chartJS limitation, it bugs when trying to display an horizontal bar chart with datasets with
      // axis on both right and left sides
      createChart(
        model,
        {
          horizontal: true,
          type: "bar",
          ...toChartDataSource({
            dataSets: [{ dataRange: "B1:B4", yAxisId: "y1" }],
          }),
          axesDesign: { x: { title: { text: "xAxis" } }, y1: { title: { text: "yAxis" } } },
        },
        "id"
      );
      const runtime = model.getters.getChartRuntime("id") as any;
      expect(runtime.chartJsConfig.options?.scales?.y1).toBe(undefined);
      expect(runtime.chartJsConfig.data.datasets[0].yAxisID).toBe("y");
    });
  });

  test("Bar chart legend", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "4",
    });
    createChart(
      model,
      {
        ...toChartDataSource({
          dataSets: [
            { dataRange: "Sheet1!A1:A2", backgroundColor: "#f00", label: "serie_1" },
            { dataRange: "Sheet1!A3:A4", backgroundColor: "#00f", label: "serie_2" },
          ],
          labelRange: "Sheet1!A2:A4",
        }),
        type: "bar",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toEqual([
      {
        fontColor: "#000000",
        text: "serie_1",
        fillStyle: "#f00",
        hidden: false,
        lineWidth: 3,
        pointStyle: "rect",
        strokeStyle: "#FFFFFF",
        datasetIndex: 0,
      },
      {
        fontColor: "#000000",
        text: "serie_2",
        fillStyle: "#00f",
        hidden: false,
        lineWidth: 3,
        pointStyle: "rect",
        strokeStyle: "#FFFFFF",
        datasetIndex: 1,
      },
    ]);
  });

  test("Empty legend items are filtered out", () => {
    // prettier-ignore
    const model = createModelFromGrid({
      A1: "", B1: "", C1: "Dataset 2",
      A2: "P1", B2: "2", C2: "4",
    });
    createChart(
      model,
      {
        ...toChartDataSource({
          dataSets: [{ dataRange: "B1:C2" }],
          labelRange: "A1:A2",
          dataSetsHaveTitle: true,
        }),
        type: "bar",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toHaveLength(1);
    expect(getChartLegendLabels(model, "1")[0].text).toEqual("Dataset 2");
  });

  test("Bar chart border are only shown for stacked chart", () => {
    const model = createModelFromGrid({
      A1: "first column dataset",
      A2: "0",
      A3: "1",
      B1: "second column dataset",
      B2: "10",
      B3: "11",
    });
    createChart(
      model,
      {
        type: "bar",
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:B3" }, { dataRange: "B1:B3" }],
        }),
      },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].borderWidth).toBe(0);

    updateChart(model, "chartId", { stacked: true });
    runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].borderWidth).toBe(1);
  });

  test("Stacked Bar chart border are drawn with the chart background color", () => {
    const model = createModelFromGrid({
      A1: "first column dataset",
      A2: "0",
      A3: "1",
      B1: "second column dataset",
      B2: "10",
      B3: "11",
    });
    createChart(
      model,
      {
        type: "bar",
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:B3" }, { dataRange: "B1:B3" }],
        }),
      },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].borderColor).toBe("#FFFFFF");

    updateChart(model, "chartId", { background: "#f00" });
    runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[0].borderColor).toBe("#f00");
  });

  test("Bar chart trend line legend", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2" });
    createChart(
      model,
      {
        ...toChartDataSource({
          dataSets: [
            {
              dataRange: "Sheet1!A1:A2",
              backgroundColor: "#f00",
              label: "serie_1",
              trend: { type: "polynomial", order: 1, color: "#f0f", display: true },
            },
          ],
          dataSetsHaveTitle: false,
        }),
        type: "bar",
      },
      "1"
    );
    expect(getChartLegendLabels(model, "1")).toMatchObject([
      { text: "serie_1", fillStyle: "#f00", pointStyle: "rect" },
      { text: "Trend line for serie…", strokeStyle: "#f0f", pointStyle: "line" },
    ]);
  });

  test("Bar spacing is adapted to the number of datasets", () => {
    const model = createModelFromGrid({ A2: "2", B2: "3" });
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "A1:A3" }] }) },
      "chartId"
    );

    let runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    let config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    expect(config.data.datasets[0].barPercentage).toEqual(0.9);
    expect(config.data.datasets[0].categoryPercentage).toEqual(1);

    updateChart(model, "chartId", {
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }] }),
    });
    runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
    config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    expect(config.data.datasets.map((ds) => ds.barPercentage)).toEqual([0.9, 0.9]);
    expect(config.data.datasets.map((ds) => ds.categoryPercentage)).toEqual([0.8, 0.8]);
  });

  test("bar chart runtime reflects axis bounds and grids", () => {
    const model = createModelFromGrid({
      A1: "Month",
      A2: "Jan",
      B1: "Series A",
      B2: "5",
    });

    createChart(
      model,
      {
        type: "bar",
        ...toChartDataSource({
          labelRange: "A2",
          dataSets: [{ dataRange: "B2" }],
        }),
      },
      "1"
    );

    updateChart(model, "1", {
      axesDesign: {
        x: { min: 0, max: 2 },
        y: { min: 0, max: 30, gridLines: "minor" },
      },
    });

    const scales = getChartConfiguration(model, "1").options?.scales;
    expect(scales.x?.min).toBe(0);
    expect(scales.x?.max).toBe(2);
    expect(scales.y?.min).toBe(0);
    expect(scales.y?.max).toBe(30);
    expect(scales.y?.grid?.display).toBe(false);
    expect(scales.y?.grid?.minor?.display).toBe(true);
  });

  describe("Total line", () => {
    test("creates a total line dataset for stacked bar charts", () => {
      const model = createModelFromGrid({ A1: "13", B1: "10" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      const datasets = getChartConfiguration(model, "chartId").data.datasets;
      expect(datasets).toHaveLength(3);
      expect(datasets[2]).toMatchObject({
        type: "line",
        label: "Sum",
        data: [23],
        order: -1,
        tension: 0,
        fill: false,
        pointRadius: 3,
        borderWidth: 2,
        backgroundColor: "#343a40",
        borderColor: "#343a40",
        pointBackgroundColor: "#343a40",
        xAxisID: "x",
        yAxisID: "y",
      });
    });

    test("does not create a total line unless showTotalLine is enabled on a stacked chart", () => {
      const model = createModelFromGrid({ A1: "13", B1: "10" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: false,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      let datasets = getChartConfiguration(model, "chartId").data.datasets;
      expect(datasets).toHaveLength(2);
      expect(datasets.map((dataset) => dataset.label)).not.toContain("Sum");

      updateChart(model, "chartId", { showTotalLine: true, stacked: false });

      datasets = getChartConfiguration(model, "chartId").data.datasets;
      expect(datasets).toHaveLength(2);
      expect(datasets.map((dataset) => dataset.label)).not.toContain("Sum");
    });

    test("does not create a total line when there is a single visible dataset", () => {
      const model = createModelFromGrid({ A1: "13" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      const datasets = getChartConfiguration(model, "chartId").data.datasets;
      expect(datasets).toHaveLength(1);
      expect(datasets.map((dataset) => dataset.label)).not.toContain("Sum");
    });

    test("sums numeric values only", () => {
      const model = createModelFromGrid({ A1: "13", B1: "text", C1: "27" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }, { dataRange: "C1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      const totalLineData = getChartConfiguration(model, "chartId").data.datasets[3].data;
      expect(totalLineData).toEqual([40]);
    });

    test("ignores hidden source datasets", () => {
      const model = createModelFromGrid({ A1: "13", B1: "10", C1: "27" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }, { dataRange: "C1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      hideColumns(model, ["B"]);
      const datasets = getChartConfiguration(model, "chartId").data.datasets;
      expect(datasets.at(-1)).toMatchObject({ label: "Sum", data: [40] });
    });

    test("uses a line legend marker", () => {
      const model = createModelFromGrid({ A1: "13", B1: "10" });
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      expect(getChartLegendLabels(model, "chartId")).toMatchObject([
        { text: "Series 1", pointStyle: "rect" },
        { text: "Series 2", pointStyle: "rect" },
        { text: "Sum", pointStyle: "line" },
      ]);
    });

    test("formats the total line tooltip with the value axis format", () => {
      const model = createModelFromGrid({ A1: "13", B1: "10" });
      setFormat(model, "A1:B1", "#,##0[$€]");
      createChart(
        model,
        {
          type: "bar",
          stacked: true,
          showTotalLine: true,
          ...toChartDataSource({
            dataSets: [{ dataRange: "A1" }, { dataRange: "B1" }],
            dataSetsHaveTitle: false,
          }),
        },
        "chartId"
      );

      const runtime = model.getters.getChartRuntime("chartId") as BarChartRuntime;
      const totalLineDataset = runtime.chartJsConfig.data.datasets[2];
      const tooltipValues = getChartTooltipValues(runtime, {
        parsed: { y: 23 },
        dataset: totalLineDataset,
      });

      expect(tooltipValues).toEqual({ beforeLabel: "Sum", label: "23€" });
    });
  });
});
