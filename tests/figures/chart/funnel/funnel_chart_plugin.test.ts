import { FunnelChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/funnel_chart";
import { ChartCreationContext, Model, UID } from "../../../../src";
import { ColorGenerator } from "../../../../src/helpers";
import { FunnelChart } from "../../../../src/helpers/figures/charts/funnel_chart";
import { createFunnelChart, setCellContent, setFormat } from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import { setGrid } from "../../../test_helpers/helpers";

let model: Model;

function getFunnelRuntime(chartId: UID): FunnelChartRuntime {
  return model.getters.getChartRuntime(chartId) as FunnelChartRuntime;
}

describe("Funnel chart", () => {
  test("create funnel chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      funnelColors: ["#ff0000", "#00ff00"],
    };
    const definition = FunnelChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "funnel",
      background: "#123456",
      title: { text: "hello there" },
      ...toChartDataSource({
        dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      legendPosition: "none",
      aggregated: true,
      axesDesign: {},
      showValues: false,
      horizontal: true,
      funnelColors: ["#ff0000", "#00ff00"],
      cumulative: true,
      humanize: false,
    });
  });

  beforeEach(() => {
    model = new Model();
  });

  test("Funnel runtime with simple dataset", () => {
    setCellContent(model, "A1", "Opportunities");
    setCellContent(model, "A2", "Won");
    setCellContent(model, "B1", "100");
    setCellContent(model, "B2", "25");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        dataSetsHaveTitle: false,
      }),
    });
    const config = getFunnelRuntime(chartId).chartJsConfig;
    expect(config.data.datasets[0].data).toEqual([
      [-100, 100],
      [-25, 25],
    ]);
    expect(config.data.labels).toEqual(["Opportunities", "Won"]);
    expect(config.options?.plugins?.legend?.display).toEqual(false);
  });

  test("Only the first dataset is kept", () => {
    setCellContent(model, "B1", "10");
    setCellContent(model, "C1", "30");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1" }, { dataRange: "C1" }],
        dataSetsHaveTitle: false,
      }),
    });
    expect(getFunnelRuntime(chartId).chartJsConfig.data.datasets).toHaveLength(1);
    expect(getFunnelRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([[-10, 10]]);
  });

  test("Negative values are set to zero ", () => {
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    setCellContent(model, "B3", "0");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
    });
    expect(getFunnelRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [-10, 10],
      [0, 0],
      [0, 0],
    ]);
  });

  test("Scales are correctly configures", () => {
    setCellContent(model, "A1", "label1");
    setCellContent(model, "A2", "label2");
    setCellContent(model, "B1", "50");
    setCellContent(model, "B2", "30");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A2",
        dataSets: [{ dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
      }),
    });
    const scales = getFunnelRuntime(chartId).chartJsConfig.options?.scales as any;

    expect(scales.x?.display).toEqual(false);
    expect(scales.y).toMatchObject({
      grid: { offset: false },
      border: { display: false },
    });

    expect(scales.percentages).toMatchObject({
      grid: { display: false },
      border: { display: false },
    });
    expect(scales.percentages?.ticks?.callback(0, 0)).toEqual("100%");
    expect(scales.percentages?.ticks?.callback(1, 1)).toEqual("60%");
  });

  test("Funnel runtime with aggregate", () => {
    setCellContent(model, "A1", "label1");
    setCellContent(model, "A2", "label2");
    setCellContent(model, "A3", "label1");
    setCellContent(model, "A4", "label2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "-20");
    setCellContent(model, "B3", "60");
    setCellContent(model, "B4", "50");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A4",
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
      }),
      aggregated: true,
    });
    expect(getFunnelRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [-70, 70], // 10 + 60
      [-30, 30], // -20 + 50
    ]);
  });

  test("Funnel runtime with cumulative", () => {
    setGrid(model, { B1: "10", B2: "20", B3: "invalid", B4: "30" });
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "B1:B4" }],
        dataSetsHaveTitle: false,
      }),
      cumulative: true,
    });
    expect(getFunnelRuntime(chartId).chartJsConfig.data.datasets[0].data).toEqual([
      [-60, 60],
      [-50, 50],
      [-30, 30],
    ]);
  });

  test("Funnel chart tooltip", () => {
    setCellContent(model, "A2", "30");
    setFormat(model, "A2", "0[$€]");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A2" }],
        dataSetsHaveTitle: true,
      }),
    });
    const runtime = getFunnelRuntime(chartId);

    const tooltipItem = { parsed: { x: 40 }, label: "myLabel", dataset: { xAxisID: "x" } };
    const tooltipCallbacks = runtime.chartJsConfig.options?.plugins?.tooltip?.callbacks as any;
    expect(tooltipCallbacks?.beforeLabel?.(tooltipItem)).toEqual("myLabel");
    expect(tooltipCallbacks?.label?.(tooltipItem)).toEqual("40€");
  });

  test("Funnel chart colors", () => {
    setCellContent(model, "A1", "label1");
    setCellContent(model, "A3", "label2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "20");
    setCellContent(model, "B3", "30");
    const chartId = createFunnelChart(model, {
      ...toChartDataSource({
        labelRange: "A1:A3",
        dataSets: [{ dataRange: "B1:B3" }],
        dataSetsHaveTitle: false,
      }),
      funnelColors: ["#ff0000", undefined, "#00ff00"],
    });
    const runtime = getFunnelRuntime(chartId);
    const colorGenerator = new ColorGenerator(3);
    colorGenerator.next();
    const secondColor = colorGenerator.next();
    expect(runtime.chartJsConfig.data.datasets[0].backgroundColor).toEqual([
      "#ff0000",
      secondColor,
      "#00ff00",
    ]);
  });
});
