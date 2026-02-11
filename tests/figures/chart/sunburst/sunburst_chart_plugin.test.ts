import { Model, UID } from "../../../../src";
import { COLOR_TRANSPARENT } from "../../../../src/constants";
import { ColorGenerator } from "../../../../src/helpers";
import { GHOST_SUNBURST_VALUE } from "../../../../src/helpers/figures/charts/runtime";
import { SunburstChart } from "../../../../src/helpers/figures/charts/sunburst_chart";
import {
  ChartCreationContext,
  SunburstChartJSDataset,
  SunburstChartRawData,
  SunburstChartRuntime,
} from "../../../../src/types/chart";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";
import {
  createSunburstChart,
  createTreeMapChart,
  setCellContent,
  setFormat,
} from "../../../test_helpers/commands_helpers";
import { setGrid } from "../../../test_helpers/helpers";

let model: Model;

function getSunburstRuntime(chartId: UID): SunburstChartRuntime {
  return model.getters.getChartRuntime(chartId) as SunburstChartRuntime;
}

function toChartJSCtx(data: SunburstChartRawData) {
  return { type: "data", raw: data };
}

// prettier-ignore
const SUNBURST_DATASET = {
  A2:  "Q1", B2: "January",  C2: "",    D2: "10",
  A3:  "Q1", B3: "February", C3: "",    D3: "20",
  A4:  "Q1", B4: "March",    C4: "W1",  D4: "30",
  A5:  "Q1", B5: "March",    C5: "W2",  D5: "40",
  A6:  "Q1", B6: "March",    C6: "W3",  D6: "50",
  A7:  "Q2", B7: "April",    C7: "",    D7: "60",
  A8:  "Q2", B8: "May",      C8: "",    D8: "70",
  A9:  "Q2", B9: "June",     C9: "",    D9: "80",
  A10: "Q3", B10: "",        C10: "",   D10: "200",
};

describe("Sunburst chart chart", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Can create a sunburst chart from a creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      showLabels: true,
      showValues: true,
      valuesDesign: { italic: true },
      groupColors: ["#123456", "#654321"],
    };
    expect(SunburstChart.getDefinitionFromContextCreation(context)).toEqual({
      type: "sunburst",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!A1:A4" }],
      labelRange: "Sheet1!B1:B4",
      legendPosition: "bottom",
      dataSetsHaveTitle: true,
      showValues: true,
      showLabels: true,
      valuesDesign: { italic: true },
      groupColors: ["#123456", "#654321"],
    });
  });

  test("Labels and datasets are swapped from the creation context", () => {
    // In SunburstChart, the labels are the values (numbers) and the datasets are the categories (strings). This is the inverse
    // of the usual chart structure.
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
      auxiliaryRange: "Sheet1!A1:A4",
    };
    const definition = SunburstChart.getDefinitionFromContextCreation(context);
    expect(definition).toMatchObject({
      dataSets: [{ dataRange: "Sheet1!A1:A4" }],
      labelRange: "Sheet1!B1:B4",
    });
    const chart = new SunburstChart(definition, "Sheet1", model.getters);
    expect(chart.getContextCreation()).toMatchObject({
      range: [{ dataRange: "Sheet1!B1:B4" }],
      auxiliaryRange: "A1:A4",
    });
  });

  test("Labels and datasets are not swapped from a TreeMap chart creation context", () => {
    const model = new Model();
    const chartId = createTreeMapChart(model, {
      dataSets: [{ dataRange: "A1:A4" }],
      labelRange: "B1:B4",
    });
    const context = model.getters.getChart(chartId)!.getContextCreation();
    const definition = SunburstChart.getDefinitionFromContextCreation(context);
    expect(definition).toMatchObject({
      dataSets: [{ dataRange: "A1:A4" }],
      labelRange: "B1:B4",
    });
  });

  test("Simple single-level sunburst", () => {
    // prettier-ignore
    setGrid(model, {
      A2: "Group1",   B2: "10",
      A3: "Group1",   B3: "40",
      A4: "Group2",   B4: "30",
    })
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A4" }],
      labelRange: "B1:B4",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;

    expect(config).toMatchObject({
      type: "doughnut",
      options: { cutout: "25%" },
    });
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0].parsing).toEqual({ key: "value" }); // read value from "value" key in data objects
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 50, label: "Group1", groups: ["Group1"] },
      { value: 30, label: "Group2", groups: ["Group2"] },
    ]);
  });

  test("Sunburst chart display dataset labels in formatted form", () => {
    // prettier-ignore
    setGrid(model, {
      A2: "2/3/2010",   B2: "10",
      A3: "5/8/2015",   B3: "40",
    })
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A3" }],
      labelRange: "B1:B3",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 40, label: "5/8/2015", groups: ["5/8/2015"] },
      { value: 10, label: "2/3/2010", groups: ["2/3/2010"] },
    ]);
  });

  test("Sunburst data is sorted", () => {
    // prettier-ignore
    setGrid(model, {
      A2: "Group1",   B2: "10",
      A3: "Group2",   B3: "30",
    });

    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A3" }],
      labelRange: "B1:B3",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 30, label: "Group2", groups: ["Group2"] },
      { value: 10, label: "Group1", groups: ["Group1"] },
    ]);
  });

  test("Multi-level sunburst", () => {
    setGrid(model, SUNBURST_DATASET);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:C10" }],
      labelRange: "D1:D10",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(3);
    expect(config.data.datasets[2].data).toMatchObject([
      { value: 210, label: "Q2", groups: ["Q2"] },
      { value: 200, label: "Q3", groups: ["Q3"] },
      { value: 150, label: "Q1", groups: ["Q1"] },
    ]);
    expect(config.data.datasets[1].data).toMatchObject([
      { value: 80, label: "June", groups: ["Q2", "June"] },
      { value: 70, label: "May", groups: ["Q2", "May"] },
      { value: 60, label: "April", groups: ["Q2", "April"] },
      { value: 200, label: GHOST_SUNBURST_VALUE }, // Q3 placeholder
      { value: 120, label: "March", groups: ["Q1", "March"] },
      { value: 20, label: "February", groups: ["Q1", "February"] },
      { value: 10, label: "January", groups: ["Q1", "January"] },
    ]);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 80, label: GHOST_SUNBURST_VALUE }, // June placeholder
      { value: 70, label: GHOST_SUNBURST_VALUE }, // May placeholder
      { value: 60, label: GHOST_SUNBURST_VALUE }, // April placeholder
      { value: 200, label: GHOST_SUNBURST_VALUE }, // Q3 placeholder
      { value: 50, label: "W3", groups: ["Q1", "March", "W3"] },
      { value: 40, label: "W2", groups: ["Q1", "March", "W2"] },
      { value: 30, label: "W1", groups: ["Q1", "March", "W1"] },
      { value: 20, label: GHOST_SUNBURST_VALUE }, // February placeholder
      { value: 10, label: GHOST_SUNBURST_VALUE }, // January placeholder
    ]);
  });

  test("Can define groups in a tree-like structure", () => {
    // prettier-ignore
    const grid = {
      A2:  "Q1", B2: "January",  C2: "W1",  D2: "10",
      A5:  "",   B5: "",         C5: "W2",  D5: "20",
      A6:  "",   B6: "February", C6: "W1",  D6: "30",
      A7:  "",   B7: "",         C7: "W2",  D7: "40",
      A8:  "Q2", B8: "April",    C8: "W1",  D8: "50",
      A9:  "",   B9: "",         C9: "W2",  D9: "60",
    };
    setGrid(model, grid);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:C10" }],
      labelRange: "D1:D10",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(3);
    expect(config.data.datasets[2].data).toMatchObject([
      { value: 110, label: "Q2", groups: ["Q2"] },
      { value: 100, label: "Q1", groups: ["Q1"] },
    ]);
    expect(config.data.datasets[1].data).toMatchObject([
      { value: 110, label: "April", groups: ["Q2", "April"] },
      { value: 70, label: "February", groups: ["Q1", "February"] },
      { value: 30, label: "January", groups: ["Q1", "January"] },
    ]);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 60, label: "W2", groups: ["Q2", "April", "W2"] },
      { value: 50, label: "W1", groups: ["Q2", "April", "W1"] },
      { value: 40, label: "W2", groups: ["Q1", "February", "W2"] },
      { value: 30, label: "W1", groups: ["Q1", "February", "W1"] },
      { value: 20, label: "W2", groups: ["Q1", "January", "W2"] },
      { value: 10, label: "W1", groups: ["Q1", "January", "W1"] },
    ]);
  });

  test("Invalid points are ignored", () => {
    // prettier-ignore
    const grid = {
      A1: "",    B1: "RandomMonth", C1: "W1", D1: "10", // No root group
      A2:  "Q1", B2: "January",     C2: "W1",  D2: "NotANumber", // Invalid value
      A5:  "Q2", B5: "",            C5: "W2",  D5: "20", // Week is defined but bit the month
      A6:  "Q3",   B6: "September", C6: "W1",  D6: "30", // Valid
    };
    setGrid(model, grid);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:C10" }],
      labelRange: "D1:D10",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(3);
    expect(config.data.datasets[2].data).toMatchObject([
      { value: 30, label: "Q3", groups: ["Q3"] },
    ]);
    expect(config.data.datasets[1].data).toMatchObject([
      { value: 30, label: "September", groups: ["Q3", "September"] },
    ]);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 30, label: "W1", groups: ["Q3", "September", "W1"] },
    ]);
  });

  test("Cannot mix positive and negative values", () => {
    // prettier-ignore
    const grid = {
        A2: "G1",    B2: "20",
        A3: "G2",    B3: "-10",
    };
    setGrid(model, grid);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A3" }],
      labelRange: "B1:B3",
    });

    let config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets[0].data).toHaveLength(1);
    expect(config.data.datasets[0].data).toMatchObject([{ value: 20, label: "G1" }]);

    setCellContent(model, "B2", "-20");
    config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets[0].data).toHaveLength(2);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: -10, label: "G2" },
      { value: -20, label: "G1" },
    ]);
  });

  test("Empty hierarchical levels are dropped", () => {
    setGrid(model, { B2: "Group1", B3: "Group2", D2: "10", D3: "25" });
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }, { dataRange: "C1:C3" }],
      labelRange: "D1:D3",
    });
    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0].data).toMatchObject([
      { value: 25, label: "Group2", groups: ["Group2"] },
      { value: 10, label: "Group1", groups: ["Group1"] },
    ]);
  });

  test("Sunburst items background color", () => {
    setGrid(model, SUNBURST_DATASET);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:C10" }],
      labelRange: "D1:D10",
      dataSetsHaveTitle: false,
      groupColors: ["#FF0000", undefined, "#0000FF"],
    });
    const config = getSunburstRuntime(chartId).chartJsConfig;

    const colorGenerator = new ColorGenerator(3);
    colorGenerator.next();
    const secondColor = colorGenerator.next();

    const datasets = config.data.datasets as SunburstChartJSDataset[];
    expect(datasets.length).toBe(3);

    const getBackgroundColor = (dataset: any, groups: string[]) =>
      dataset.backgroundColor?.(
        toChartJSCtx({ value: 10, label: groups[groups.length - 1], groups })
      );

    for (const dataset of datasets) {
      expect(dataset.groupColors).toEqual([
        { color: "#FF0000", label: "Q2" },
        { color: secondColor, label: "Q3" },
        { color: "#0000FF", label: "Q1" },
      ]);
      expect(getBackgroundColor(dataset, ["Q3"])).toBe(secondColor);
      expect(getBackgroundColor(dataset, ["Q2", "May"])).toBe("#FF0000");
      expect(getBackgroundColor(dataset, ["Q1", "March", "W2"])).toBe("#0000FF");
    }
  });

  test("Sunburst ghost items do not have a background/border", () => {
    setGrid(model, { B2: "Group1", C2: "SubGroup1", D2: "10" });
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "B1:C2" }],
      labelRange: "D1:D2",
    });

    const datasets = getSunburstRuntime(chartId).chartJsConfig.data.datasets as any;

    const label = GHOST_SUNBURST_VALUE;
    const rootData: SunburstChartRawData = { value: 10, label, groups: ["Group1"] };
    expect(datasets[1].backgroundColor(toChartJSCtx(rootData))).toBeSameColorAs(COLOR_TRANSPARENT);
    expect(datasets[1].borderColor(toChartJSCtx(rootData))).toBeSameColorAs(COLOR_TRANSPARENT);

    const subData: SunburstChartRawData = { value: 10, label, groups: ["Group1", "SubGroup1"] };
    expect(datasets[0].backgroundColor(toChartJSCtx(subData))).toBeSameColorAs(COLOR_TRANSPARENT);
    expect(datasets[0].borderColor(toChartJSCtx(subData))).toBeSameColorAs(COLOR_TRANSPARENT);
  });

  test("Sunburst chart tooltip", () => {
    setGrid(model, { A2: "Group1", B2: "10" });
    setFormat(model, "B2", "0.0$");
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A2" }],
      labelRange: "B1:B2",
    });

    const tooltip = getSunburstRuntime(chartId).chartJsConfig.options?.plugins?.tooltip as any;
    expect(tooltip).toMatchObject({ enabled: false, external: expect.any(Function) });

    const data: SunburstChartRawData = { value: 10, label: "Group1", groups: ["Group1"] };
    expect(tooltip?.callbacks?.title?.([toChartJSCtx(data)])).toBe("");
    expect(tooltip?.callbacks?.beforeLabel?.(toChartJSCtx(data))).toBe("Group1");
    expect(tooltip?.callbacks?.label?.(toChartJSCtx(data))).toBe("10.0$");

    const groupData: SunburstChartRawData = { value: 10, label: "W1", groups: ["Q1", "May", "W2"] };
    expect(tooltip?.callbacks?.title?.([toChartJSCtx(groupData)])).toBe("");
    expect(tooltip?.callbacks?.beforeLabel?.(toChartJSCtx(groupData))).toBe("Q1 / May / W2");
    expect(tooltip?.callbacks?.label?.(toChartJSCtx(groupData))).toBe("10.0$");
  });

  test("Ghost sunburst values do not have a tooltip", () => {
    setGrid(model, { A2: "Group1", B2: "10" });
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A2" }],
      labelRange: "B1:B2",
    });

    const tooltip = getSunburstRuntime(chartId).chartJsConfig.options?.plugins?.tooltip as any;
    const ghostData: SunburstChartRawData = { value: 10, label: GHOST_SUNBURST_VALUE, groups: [] };
    const data: SunburstChartRawData = { value: 10, label: "Group1", groups: ["Group1"] };

    expect(tooltip?.filter?.(toChartJSCtx(ghostData))).toBe(false);
    expect(tooltip?.filter?.(toChartJSCtx(data))).toBe(true);
  });

  test("Sunburst chart legend", () => {
    setGrid(model, SUNBURST_DATASET);
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:C10" }],
      labelRange: "D1:D10",
      groupColors: ["#FF0000", "#00FF00", "#0000FF"],
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    const legend = config.options?.plugins?.legend;
    expect(legend).toMatchObject({
      display: true,
      labels: {
        usePointStyle: true,
        generateLabels: expect.any(Function),
      },
    });

    expect(legend?.labels?.generateLabels?.(config as any)).toMatchObject([
      { text: "Q2", fillStyle: "#FF0000", strokeStyle: "#FF0000" },
      { text: "Q3", fillStyle: "#00FF00", strokeStyle: "#00FF00" },
      { text: "Q1", fillStyle: "#0000FF", strokeStyle: "#0000FF" },
    ]);
  });

  test("Legend labels are truncated", () => {
    setGrid(model, { A2: "GroupWithAVeryVeryVeryVeryLongLabel", B2: "10" });
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A2" }],
      labelRange: "B1:B2",
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.options?.plugins?.legend?.labels?.generateLabels?.(config as any)).toMatchObject([
      { text: "GroupWithAVeryVeryVe…" },
    ]);
  });

  test("Sunburst show value plugin arguments", () => {
    setGrid(model, { A2: "Group1", B2: "10" });
    setFormat(model, "B2", '0 "( •⩊• )"');
    const chartId = createSunburstChart(model, {
      dataSets: [{ dataRange: "A1:A2" }],
      labelRange: "B1:B2",
      showLabels: true,
      showValues: true,
      valuesDesign: { fontSize: 12, bold: true, italic: true, color: "#FF0000" },
    });

    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.options?.plugins?.sunburstLabelsPlugin).toMatchObject({
      showLabels: true,
      showValues: true,
      style: { fontSize: 12, bold: true, italic: true, textColor: "#FF0000" },
    });
    expect(config.options?.plugins?.sunburstLabelsPlugin?.callback?.(10, "y")).toBe("10 ( •⩊• )");
  });

  test("Sunburst hover plugin is enabled", () => {
    const chartId = createSunburstChart(model);
    const config = getSunburstRuntime(chartId).chartJsConfig;
    expect(config.options?.plugins?.sunburstHoverPlugin).toMatchObject({
      enabled: true,
    });
  });
});
