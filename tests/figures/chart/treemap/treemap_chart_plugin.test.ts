import { ChartCreationContext, Model, UID } from "../../../../src";
import { TreeMapChart } from "../../../../src/helpers/figures/charts/tree_map_chart";
import { createTreeMapChart, setCellContent, updateChart } from "../../../test_helpers";
import { TEST_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";
import { setGrid } from "../../../test_helpers/helpers";

let model: Model;

function getTreeMapDatasetConfig(chartId: UID) {
  return (model.getters.getChartRuntime(chartId) as any).chartJsConfig.data.datasets[0];
}
// _data.children[0][0]
function getTreeMapContext(args: {
  value?: number;
  group?: string;
  depth?: number;
  parentGroup?: string;
}) {
  return {
    type: "data",
    raw: {
      v: args.value || 0,
      g: args.group || "",
      l: args.depth || 0,
      _data: { children: [[args.parentGroup]] },
    },
  };
}

describe("TreeMap chart", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("create TreeMap chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...TEST_CREATION_CONTEXT,
      background: "#123456",
      title: { text: "hello there" },
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      auxiliaryRange: "Sheet1!A1:A4",
      dataSetsHaveTitle: true,
      aggregated: true,
      showValues: false,
      headerDesign: { bold: false },
      showHeaders: true,
      showLabels: false,
      valuesDesign: { italic: true },
      coloringOptions: { type: "solidColor", colors: [], hasGradient: true },
    };
    const definition = TreeMapChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "treemap",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      labelRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      axesDesign: {},
      showValues: false,
      headerDesign: { bold: false },
      showHeaders: true,
      showLabels: false,
      valuesDesign: { italic: true },
      coloringOptions: { type: "solidColor", colors: [], hasGradient: true },
    });
  });

  test("TreeMap dataset", () => {
    // prettier-ignore
    const grid = {
      A1: "Year", B1: "Quarter", C1: "Sales",
      A2: "2024", B2: "Q1",      C2: "100",
      A3: "2024", B3: "Q2",      C3: "200",
    };
    setGrid(model, grid);

    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
      labelRange: "C1:C3",
      dataSetsHaveTitle: true,
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig).toMatchObject({
      tree: [
        { 0: "2024", 1: "Q1", value: 100 },
        { 0: "2024", 1: "Q2", value: 200 },
      ],
      groups: ["0", "1"],
      key: "value",
    });
  });

  test("TreeMap background", () => {
    setCellContent(model, "A1", "45");
    const chartId = createTreeMapChart(model, {
      background: "#123456",
      dataSets: [{ dataRange: "A1" }],
    });
    expect(model.getters.getChartRuntime(chartId)?.background).toEqual("#123456");
    expect(getTreeMapDatasetConfig(chartId).borderColor).toEqual("#123456");
  });

  test("TreeMap color scale", () => {
    // prettier-ignore
    const grid = {
          A1: "Year", B1: "Quarter", C1: "Sales",
          A2: "2024", B2: "Q1",      C2: "0",
          A3: "2024", B3: "Q2",      C3: "100",
          A4: "2025", B4: "Q2",      C4: "200",
    };
    setGrid(model, grid);
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A4" }, { dataRange: "B1:B4" }],
      labelRange: "C1:C4",
      coloringOptions: { type: "colorScale", minColor: "#123", midColor: "#456", maxColor: "#789" },
    });
    const getColor = getTreeMapDatasetConfig(chartId).backgroundColor;
    expect(getColor(getTreeMapContext({ value: 0, depth: 1 }))).toEqual("#112233");
    expect(getColor(getTreeMapContext({ value: 100, depth: 1 }))).toEqual("#445566");
    expect(getColor(getTreeMapContext({ value: 200, depth: 1 }))).toEqual("#778899");
  });

  test("TreeMap header style", () => {
    setCellContent(model, "A1", "45");
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1" }],
      headerDesign: { bold: false, italic: true, align: "right", fillColor: "#123456" },
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig.captions).toMatchObject({
      display: true,
      align: "right",
      font: { weight: "normal" },
    });
    expect(datasetConfig.backgroundColor(getTreeMapContext({ depth: 0 }))).toEqual("#123456");
  });

  test("TreeMap value style", () => {
    // prettier-ignore
    const grid = {
      A1: "Year", B1: "Quarter", C1: "Sales",
      A2: "2024", B2: "Q1",      C2: "100",
      A3: "2024", B3: "Q2",      C3: "200",
    };
    setGrid(model, grid);
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A2" }, { dataRange: "B1:B2" }],
      labelRange: "C1:C2",
      valuesDesign: { bold: true, italic: true, align: "right", color: "#123456" },
    });
    let labelConfig = getTreeMapDatasetConfig(chartId).labels as any;
    expect(labelConfig).toMatchObject({
      display: true,
      align: "right",
      color: "#123456",
      font: { weight: "bold" },
    });
    expect(labelConfig?.formatter?.(getTreeMapContext({ value: 45, group: "Parent" }))).toEqual([
      "Parent",
      "45",
    ]);

    updateChart(model, chartId, { showLabels: false });
    labelConfig = getTreeMapDatasetConfig(chartId).labels as any;
    expect(labelConfig?.formatter?.(getTreeMapContext({ value: 45, group: "Parent" }))).toEqual([
      "45",
    ]);

    updateChart(model, chartId, { showValues: false });
    labelConfig = getTreeMapDatasetConfig(chartId).labels as any;
    expect(labelConfig?.display).toEqual(false);
  });
});
