import { Chart } from "chart.js";
import { ChartCreationContext, Color, Model, UID } from "../../../../src";
import { treeMapColorsPlugin } from "../../../../src/components/figures/chart/chartJs/tree_map_colors_plugin";
import { ColorGenerator, lightenColor } from "../../../../src/helpers";
import { TreeMapChart } from "../../../../src/helpers/figures/charts/tree_map_chart";
import {
  TreeMapChartDefinition,
  TreeMapChartRuntime,
} from "../../../../src/types/chart/tree_map_chart";
import { createTreeMapChart, setCellContent, setFormat, updateChart } from "../../../test_helpers";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";
import { setGrid } from "../../../test_helpers/helpers";

interface TreeMapElementCtx {
  type: "data";
  raw: {
    v: number; // value
    g: string; // group
    l: number; // depth
    _data: { children: (string | undefined)[][]; path: string };
  };
}

let model: Model;

function getTreeMapDatasetConfig(chartId: UID) {
  return (model.getters.getChartRuntime(chartId) as any).chartJsConfig.data.datasets[0];
}

function getTreeMapConfig(chartId: UID) {
  return (model.getters.getChartRuntime(chartId) as any).chartJsConfig;
}

function getTreeMapElement(args: {
  value?: number;
  group?: string;
  depth?: number;
  parentGroup?: string;
  path?: string;
}): TreeMapElementCtx {
  return {
    type: "data",
    raw: {
      v: args.value || 0,
      g: args.group || "",
      l: args.depth || 0,
      _data: {
        children: [[args.parentGroup]],
        path: args.path || [args.parentGroup, args.group].join("."),
      },
    },
  };
}

describe("TreeMap chart", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Labels and datasets are swapped from the creation context", () => {
    // In TreeMap, the labels are the values (numbers) and the datasets are the categories (strings). This is the inverse
    // of the usual chart structure.
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
      auxiliaryRange: "Sheet1!A1:A4",
    };
    const definition = TreeMapChart.getDefinitionFromContextCreation(context);
    expect(definition).toMatchObject({
      dataSets: [{ dataRange: "Sheet1!A1:A4" }],
      labelRange: "Sheet1!B1:B4",
    });
    const chart = new TreeMapChart(definition, "Sheet1", model.getters);
    expect(chart.getContextCreation()).toMatchObject({
      range: [{ dataRange: "Sheet1!B1:B4" }],
      auxiliaryRange: "A1:A4",
    });
  });

  test("create TreeMap chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
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
      coloringOptions: { type: "categoryColor", colors: [], highlightBigValues: true },
    };
    const definition = TreeMapChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "treemap",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!A1:A4", yAxisId: "y1" }],
      labelRange: "Sheet1!B1:B4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      showValues: false,
      headerDesign: { bold: false },
      showHeaders: true,
      showLabels: false,
      valuesDesign: { italic: true },
      coloringOptions: { type: "categoryColor", colors: [], highlightBigValues: true },
    });
  });

  test("TreeMap dataset", () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Year", B1: "Quarter", C1: "Sales",
      A2: "2024", B2: "Q1",      C2: "100",
      A3: "2024", B3: "Q2",      C3: "200",
    });

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

  test("Can have a hierarchical dataset with some categories more detailed that others", () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Year", B1: "Quarter", C1: "Sales",
      A2: "2024", B2: "Q1",      C2: "100",
      A3: "2024", B3: "Q2",      C3: "200",
      A4: "2024", B4: "Q3",      C4: "300",
      A5: "2025", B5: "",        C5: "600",
    });

    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A5" }, { dataRange: "B1:B5" }],
      labelRange: "C1:C5",
      dataSetsHaveTitle: true,
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig).toMatchObject({
      tree: [
        { 0: "2024", 1: "Q1", value: 100 },
        { 0: "2024", 1: "Q2", value: 200 },
        { 0: "2024", 1: "Q3", value: 300 },
        { 0: "2025", 1: "2025", value: 600 },
      ],
      groups: ["0", "1"],
      key: "value",
    });
  });

  test("Can define TreeMap dataset in a tree-like manner", () => {
    // prettier-ignore
    const grid = {
      A1: "Year", B1: "Quarter", C1: "Week", D1: "Sales",
      A2: "2024", B2: "Q1",      C2: "W1",   D2: "100",
                                 C3: "W2",   D3: "200",
                  B4: "Q2",      C4: "W1",   D4: "300",
                                 C5: "W2",   D5: "400",
      A6: "2025", B6: "Q1",      C6: "W1",   D6: "500",
                                 C7: "W2",   D7: "600",
    };
    setGrid(model, grid);

    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A7" }, { dataRange: "B1:B7" }, { dataRange: "C1:C7" }],
      labelRange: "D1:D7",
      dataSetsHaveTitle: true,
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig).toMatchObject({
      tree: [
        { 0: "2024", 1: "Q1", 2: "W1", value: 100 },
        { 0: "2024", 1: "Q1", 2: "W2", value: 200 },
        { 0: "2024", 1: "Q2", 2: "W1", value: 300 },
        { 0: "2024", 1: "Q2", 2: "W2", value: 400 },
        { 0: "2025", 1: "Q1", 2: "W1", value: 500 },
        { 0: "2025", 1: "Q1", 2: "W2", value: 600 },
      ],
    });
  });

  test("Invalid values are filtered out", () => {
    // prettier-ignore
    const grid = {
      A1: "",     B1: "Q1",      C1: "",     D1: "50",         // No root group value
      A2: "2024", B2: "Q1",      C2: "W1",   D2: "100",
                  B4: "Q2",      C4: "W1",   D4: "notANumber", // Invalid value
                                 C5: "W2",   D5: "400",
      A7: "2025", B7: "Q1",      C7: "W1",   D7: "",           // No data value
    };
    setGrid(model, grid);

    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A7" }, { dataRange: "B1:B7" }, { dataRange: "C1:C7" }],
      labelRange: "D1:D7",
      dataSetsHaveTitle: false,
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig.tree).toEqual([
      { 0: "2024", 1: "Q1", 2: "W1", value: 100 },
      { 0: "2024", 1: "Q2", 2: "W2", value: 400 },
    ]);
  });

  test("TreeMap background", () => {
    setCellContent(model, "A1", "45");
    const chartId = createTreeMapChart(model, {
      background: "#123456",
      dataSets: [{ dataRange: "A1" }],
    });
    expect(model.getters.getChartRuntime(chartId)?.background).toEqual("#123456");
  });

  test("TreeMap header style", () => {
    setCellContent(model, "A1", "45");
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1" }],
      headerDesign: { bold: false, italic: true, align: "right" },
    });
    const datasetConfig = getTreeMapDatasetConfig(chartId);
    expect(datasetConfig.captions).toMatchObject({
      display: true,
      align: "right",
      font: { weight: "normal" },
    });
  });

  test("TreeMap tooltip value", () => {
    // prettier-ignore
    const grid = {
      A1: "Year", B1: "Quarter", C1: "Week", D1: "Sales",
      A2: "2024", B2: "Q1",      C2: "W1",   D2: "100",
      A3: "2024", B3: "Q2",      C3: "W2",   D3: "200",
    };
    setGrid(model, grid);
    setFormat(model, "D1:D3", "#,##0[$€]");
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }, { dataRange: "C1:C3" }],
      labelRange: "D1:D3",
    });
    const config = getTreeMapConfig(chartId);

    const tooltipLabel = config.options?.plugins?.tooltip?.callbacks?.label;
    const tooltipTitle = config.options?.plugins?.tooltip?.callbacks?.title;

    const leafItem = getTreeMapElement({ value: 25, depth: 2, path: "2025.Q2.W1", group: "W1" });
    expect(tooltipTitle([leafItem])).toBe("2025 / Q2");
    expect(tooltipLabel(leafItem)).toBe("W1: 25€");

    const parentItem = getTreeMapElement({ value: 100, depth: 1, group: "Q2", path: "2024.Q2" });
    expect(tooltipTitle([parentItem])).toBe("2024 / Q2");
    expect(tooltipLabel(parentItem)).toBe("Total: 100€");
  });

  test("TreeMap label & value style", () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Year", B1: "Quarter", C1: "Sales",
      A2: "2024", B2: "Q1",      C2: "100",
      A3: "2024", B3: "Q2",      C3: "200",
    });

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
    expect(labelConfig?.formatter?.(getTreeMapElement({ value: 45, group: "Parent" }))).toEqual([
      "Parent",
      "45",
    ]);

    updateChart(model, chartId, { showLabels: false });
    labelConfig = getTreeMapDatasetConfig(chartId).labels as any;
    expect(labelConfig?.formatter?.(getTreeMapElement({ value: 45, group: "Parent" }))).toEqual([
      "45",
    ]);

    updateChart(model, chartId, { showValues: false });
    labelConfig = getTreeMapDatasetConfig(chartId).labels as any;
    expect(labelConfig?.display).toEqual(false);
  });

  describe("TreeMap background colors", () => {
    function mockChartCtx(chartId: UID, data: any[]) {
      const runtime = model.getters.getChartRuntime(chartId) as TreeMapChartRuntime;
      runtime.chartJsConfig.data.datasets[0].data = data;
      return { config: runtime.chartJsConfig } as Chart<"treemap">;
    }

    function getBackgroundColorCallback(chartId: UID, mockedChartCtx: Chart<"treemap">) {
      const definition = model.getters.getChartDefinition(chartId) as TreeMapChartDefinition;
      treeMapColorsPlugin.beforeUpdate?.(
        mockedChartCtx,
        { mode: "active", cancelable: true },
        { definition }
      );

      return mockedChartCtx.config.data.datasets[0].backgroundColor as (
        ctx: TreeMapElementCtx
      ) => Color;
    }

    test("treeMapColorsPlugin is enabled", () => {
      const chartId = createTreeMapChart(model, {});
      const runtime = model.getters.getChartRuntime(chartId) as TreeMapChartRuntime;
      expect(runtime.chartJsConfig.options?.plugins?.["treeMapColorsPlugin"]).toBeDefined();
    });

    test("TreeMap category colors without highlight", () => {
      // prettier-ignore
      const grid = {
            A1: "Year", B1: "Quarter", C1: "Sales",
            A2: "2023", B2: "Q1",      C2: "0",
            A3: "2024", B3: "Q2",      C3: "100",
            A4: "2025", B4: "Q2",      C4: "200",
      };
      setGrid(model, grid);
      const chartId = createTreeMapChart(model, {
        dataSets: [{ dataRange: "A1:A4" }, { dataRange: "B1:B4" }],
        labelRange: "C1:C4",
        coloringOptions: {
          type: "categoryColor",
          highlightBigValues: false,
          colors: [
            { group: "2023", color: "#112233" },
            { group: "2025", color: "#778899" },
          ],
        },
      });
      const data = [
        // Mocked groupBys that are supposed to be generated by the chart
        getTreeMapElement({ depth: 0, group: "2023" }),
        getTreeMapElement({ depth: 0, group: "2024" }),
        getTreeMapElement({ depth: 0, group: "2025" }),
        getTreeMapElement({ depth: 1, group: "Q1", parentGroup: "2023", value: 0 }),
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2024", value: 100 }),
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2025", value: 200 }),
      ];
      const mockedChartCtx = mockChartCtx(chartId, data);
      const getColor = getBackgroundColorCallback(chartId, mockedChartCtx);

      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2023" }))).toEqual("#112233");
      const colorGenerator = new ColorGenerator(3);
      colorGenerator.next();
      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2024" }))).toEqual(
        colorGenerator.next()
      );
      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2025" }))).toEqual("#778899");
    });

    test("TreeMap category colors with highlight of bigger values", () => {
      // prettier-ignore
      const grid = {
            A1: "Year", B1: "Quarter", C1: "Sales",
            A2: "2023", B2: "Q1",      C2: "0",
            A3: "2023", B3: "Q2",      C3: "100",
            A4: "2023", B4: "Q2",      C4: "200",
      };
      setGrid(model, grid);
      const chartId = createTreeMapChart(model, {
        dataSets: [{ dataRange: "A1:A4" }, { dataRange: "B1:B4" }],
        labelRange: "C1:C4",
        coloringOptions: {
          type: "categoryColor",
          highlightBigValues: true,
          colors: [{ group: "2023", color: "#112233" }],
        },
      });
      const data = [
        // Mocked groupBys that are supposed to be generated by the chart
        getTreeMapElement({ depth: 0, group: "2023" }).raw,
        getTreeMapElement({ depth: 0, group: "2023" }).raw,
        getTreeMapElement({ depth: 0, group: "2023" }).raw,
        getTreeMapElement({ depth: 1, group: "Q1", parentGroup: "2023", value: 0 }).raw,
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2023", value: 100 }).raw,
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2023", value: 200 }).raw,
      ];
      const mockedChartCtx = mockChartCtx(chartId, data);
      const getColor = getBackgroundColorCallback(chartId, mockedChartCtx);

      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2023", value: 200 }))).toEqual(
        "#112233"
      );
      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2023", value: 100 }))).toEqual(
        lightenColor("#112233", 0.25)
      );
      expect(getColor(getTreeMapElement({ depth: 1, parentGroup: "2023", value: 0 }))).toEqual(
        lightenColor("#112233", 0.5)
      );
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
        coloringOptions: {
          type: "colorScale",
          minColor: "#123",
          midColor: "#456",
          maxColor: "#789",
        },
      });
      const data = [
        // Mocked groupBys that are supposed to be generated by the chart
        getTreeMapElement({ depth: 0, group: "2024" }).raw,
        getTreeMapElement({ depth: 0, group: "2024" }).raw,
        getTreeMapElement({ depth: 0, group: "2025" }).raw,
        getTreeMapElement({ depth: 1, group: "Q1", parentGroup: "2023", value: 0 }).raw,
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2024", value: 100 }).raw,
        getTreeMapElement({ depth: 1, group: "Q2", parentGroup: "2025", value: 200 }).raw,
      ];
      const mockedChartCtx = mockChartCtx(chartId, data);
      const getColor = getBackgroundColorCallback(chartId, mockedChartCtx);

      expect(getColor(getTreeMapElement({ value: 0, depth: 1 }))).toEqual("#112233");
      expect(getColor(getTreeMapElement({ value: 100, depth: 1 }))).toEqual("#445566");
      expect(getColor(getTreeMapElement({ value: 200, depth: 1 }))).toEqual("#778899");
    });
  });
});
