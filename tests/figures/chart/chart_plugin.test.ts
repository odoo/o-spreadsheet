import { Point } from "chart.js";
import { CommandResult, Model } from "../../../src";
import { ChartDefinition } from "../../../src/types";
import {
  BarChartDefinition,
  BarChartRuntime,
  ChartWithAxisDefinition,
  ChartWithDataSetDefinition,
  LineChartDefinition,
  LineChartRuntime,
  PieChartRuntime,
  ScatterChartDefinition,
} from "../../../src/types/chart";
import {
  activateSheet,
  addColumns,
  addRows,
  createChart,
  createComboChart,
  createFigure,
  createSheet,
  createSheetWithName,
  createTableWithFilter,
  deleteColumns,
  deleteRows,
  deleteSheet,
  foldHeaderGroup,
  groupHeaders,
  hideColumns,
  hideRows,
  redo,
  selectCell,
  setCellContent,
  setCellFormat,
  setFormat,
  undo,
  unfoldHeaderGroup,
  unhideColumns,
  unhideRows,
  updateChart,
  updateFilter,
  updateLocale,
} from "../../test_helpers/commands_helpers";
import {
  createModelFromGrid,
  getPlugin,
  mockChart,
  setGrid,
  target,
} from "../../test_helpers/helpers";

import { ChartTerms } from "../../../src/components/translations_terms";
import {
  CHART_PADDING,
  CHART_PADDING_BOTTOM,
  CHART_PADDING_TOP,
  FIGURE_ID_SPLITTER,
} from "../../../src/constants";
import { toNumber } from "../../../src/functions/helpers";
import { zoneToXc } from "../../../src/helpers";
import { BarChart } from "../../../src/helpers/figures/charts";
import { ChartPlugin, FigurePlugin } from "../../../src/plugins/core";
import { ScatterChartRuntime } from "../../../src/types/chart/scatter_chart";
import {
  getCategoryAxisTickLabels,
  getChartConfiguration,
  getChartLegendLabels,
  getChartTooltipItemFromDataset,
  getChartTooltipValues,
} from "../../test_helpers/chart_helpers";
import { FR_LOCALE } from "../../test_helpers/constants";

let model: Model;

beforeEach(() => {
  model = new Model({
    sheets: [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10,
        rows: {},
        cells: {
          A2: "P1",
          A3: "P2",
          A4: "P3",
          A5: "P4",
          B1: "first column dataset",
          B2: "10",
          B3: "11",
          B4: "12",
          B5: "13",
          C1: "second column dataset",
          C2: "20",
          C3: "19",
          C4: "18",
          C5: "17",

          A8: "first row dataset",
          A9: "second row dataset",
          B7: "P4",
          C7: "P5",
          D7: "P6",
          B8: "30",
          C8: "31",
          D8: "32",
          B9: "40",
          C9: "41",
          D9: "42",
        },
      },
    ],
  });
});

describe("datasource tests", function () {
  test("create chart with column datasets", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
      labelRange: "Sheet1!A2:A4",
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with rectangle dataset", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
      labelRange: "Sheet1!A2:A4",
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with column datasets without series title", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B2:B4" }, { dataRange: "Sheet1!C2:C4" }],
        labelRange: "A2:A4",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B2:B4" }, { dataRange: "C2:C4" }],
      labelRange: "A2:A4",
      dataSetsHaveTitle: false,
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with column datasets with category title", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "A1:A4",
        type: "line",
      },
      "1"
    );
    expect(getChartConfiguration(model, "1")["data"].labels).toEqual(["P1", "P2", "P3"]);
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "A8:D8" }, { dataRange: "A9:D9" }],
        labelRange: "B7:D7",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "A8:D8" }, { dataRange: "A9:D9" }],
      labelRange: "B7:D7",
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with full rows/columns datasets", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "8:8" }, { dataRange: "A:B" }],
        type: "line",
      },
      "1"
    );
    expect((model.getters.getChartDefinition("1") as LineChartDefinition)?.dataSets).toMatchObject([
      { dataRange: "8:8" },
      { dataRange: "A:A" },
      { dataRange: "B:B" },
    ]);
  });

  test("create chart with row datasets without series title", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B8:D8" }, { dataRange: "Sheet1!B9:D9" }],
        labelRange: "B7:D7",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B8:D8" }, { dataRange: "B9:D9" }],
      labelRange: "B7:D7",
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets with category title", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!A8:D8" }, { dataRange: "Sheet1!A9:D9" }],
        labelRange: "A7:D7",
        type: "line",
      },
      "1"
    );
    expect(getChartConfiguration(model, "1").data?.labels).toEqual(["P4", "P5", "P6"]);
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with only the dataset title (no data)", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B8" }],
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B8" }],
      labelRange: "Sheet1!B7:D7",
      title: { text: "test" },
      type: "line",
    });
    expect(data.datasets.length).toEqual(1);
    expect(data.datasets[0].hidden).toBeTruthy();
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with a dataset of one cell (no title)", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B8" }],
        dataSetsHaveTitle: false,
        labelRange: "B7",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B8" }],
      dataSetsHaveTitle: false,
      labelRange: "B7",
      title: { text: "test" },
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart dataset of one cell referencing an empty cell", () => {
    setCellContent(model, "A1", "");
    setCellContent(model, "B1", "=A1");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1" }],
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B1" }],
      type: "line",
    });
    const config = getChartConfiguration(model, "1");
    expect(config?.data?.datasets?.[0].data).toEqual([0]);
  });

  test("empty datasets are filtered", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A2: "P1",
            A3: "P2",
            A4: "P3",
            B1: "first column dataset",
            B2: "10",
            B3: "11",
            B4: "12",
            C1: "",
            C2: "",
            C3: "",
            C4: "",
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
    expect(chart.chartJsConfig.data!.datasets?.length).toEqual(2);
    expect(chart.chartJsConfig.data!.datasets?.[0].hidden).toBeFalsy();
    expect(chart.chartJsConfig.data!.datasets?.[1].hidden).toBeTruthy();
  });

  test.each(["line", "bar"] as const)(
    "%s chart filter out points with no label and an invalid value",
    (chartType) => {
      setCellContent(model, "G1", "not a number");
      setCellContent(model, "F2", "label");
      setCellContent(model, "G2", "neither is this, but this have a label");
      setCellContent(model, "G3", "12");

      createChart(
        model,
        {
          dataSets: [{ dataRange: "G1:G3" }],
          labelRange: "F1:F3",
          dataSetsHaveTitle: false,
          type: chartType,
        },
        "43"
      );

      const config = getChartConfiguration(model, "43");
      // In line/bars charts we want to keep invalid data that have a label to have a discontinuous line/empty space between bars
      expect(config.data?.datasets![0].data).toEqual([null, 12]);
    }
  );

  test("empty datasets are filtered in different locales", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A2: "P1",
            A3: "P2",
            A4: "P3",
            B1: "first column dataset",
            B2: "10.1",
            C1: "second dataset",
            C2: "",
          },
        },
      ],
      settings: {
        locale: FR_LOCALE,
      },
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B2" }, { dataRange: "Sheet1!C1:C2" }],
        labelRange: "Sheet1!A2",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
    expect(chart.chartJsConfig.data!.datasets?.length).toEqual(2);
    expect(chart.chartJsConfig.data!.datasets?.[0].hidden).toBeFalsy();
    expect(chart.chartJsConfig.data!.datasets?.[1].hidden).toBeTruthy();
  });

  test("create a chart with stacked bar", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B7:B8" }],
        labelRange: "B7",
        type: "bar",
        stacked: true,
      },
      "1"
    );
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("ranges in definition change automatically", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    addColumns(model, "before", "A", 2);
    const chart = model.getters.getChartDefinition("1") as LineChartDefinition;
    expect(chart.dataSets[0].dataRange).toStrictEqual("D1:D4");
    expect(chart.dataSets[1].dataRange).toStrictEqual("E1:E4");
    expect(chart.labelRange).toStrictEqual("Sheet1!C2:C4");
  });

  test("pie chart tooltip title display the correct dataset", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B7:B8" }],
        dataSetsHaveTitle: true,
        labelRange: "B7",
        type: "pie",
      },
      "1"
    );
    const title = getChartConfiguration(model, "1").options?.plugins?.tooltip?.callbacks?.title;
    // @ts-ignore `title` should be binded to the TooltipModel
    expect(title([{ dataset: { label: "dataset 1" } }])).toBe("dataset 1");
    // @ts-ignore `title` should be binded to the TooltipModel
    expect(title([{ dataset: { label: "dataset 2" } }])).toBe("dataset 2");
  });

  test.each(["bar", "line"] as const)("chart %s tooltip title is not dynamic", (chartType) => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B7:B8" }],
        dataSetsHaveTitle: true,
        labelRange: "B7",
        type: chartType,
      },
      "1"
    );
    const title = getChartConfiguration(model, "1").options?.plugins?.tooltip?.callbacks?.title;
    expect(title?.([{ dataset: { axisId: "y" } }])).toBeUndefined();
  });

  test("can delete an imported chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B7:B8" }],
        labelRange: "B7",
        type: "line",
      },
      "1"
    );
    const figureId = model.getters.getFigureIdFromChartId("1")!;
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures()).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1")).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId,
    });
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(() => newModel.getters.getChartRuntime("1")).toThrow();
  });

  test("update dataset of imported chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const newModel = new Model(model.exportData());
    let data = getChartConfiguration(newModel, "1").data;
    expect(data.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(newModel, "B2", "99");
    data = getChartConfiguration(newModel, "1").data;
    expect(data.datasets![0].data).toEqual([99, 11, 12]);
  });

  test("update existing chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    let config = getChartConfiguration(model, "1");
    expect(config.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(config.type).toEqual("line");
    updateChart(model, "1", {
      type: "bar",
      dataSets: [{ dataRange: "Sheet1!A8:D8" }, { dataRange: "Sheet1!A9:D9" }],
      labelRange: "Sheet1!C7:D7",
      dataSetsHaveTitle: true,
      title: { text: "hello1" },
    });
    config = getChartConfiguration(model, "1");
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "A8:D8" }, { dataRange: "A9:D9" }],
      labelRange: "Sheet1!C7:D7",
      title: { text: "hello1" },
      type: "bar",
    });
    expect(config.data!.datasets![0].data).toEqual([30, 31, 32]);
    expect(config.data!.datasets![1].data).toEqual([40, 41, 42]);
    expect(config.type).toEqual("bar");
  });

  test("remove labels from existing chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!A8:D8" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    updateChart(model, "1", { labelRange: undefined });
    expect(
      (model.getters.getChartDefinition("1") as LineChartDefinition).labelRange
    ).toBeUndefined();
  });

  test("deleting a random sheet does not affect a chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!A8:D8" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinition("1");
    createSheet(model, { sheetId: "42" });
    deleteSheet(model, "42");
    const chartDefinitionAfter = model.getters.getChartDefinition("1");
    expect(chartDefinitionBefore).toEqual(chartDefinitionAfter);
  });

  test("deleting a col on another sheet does not affect a chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!A8:D8" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinition("1");
    createSheet(model, { sheetId: "42" });
    deleteColumns(model, ["A"], "42");
    const chartDefinitionAfter = model.getters.getChartDefinition("1");
    expect(chartDefinitionBefore).toEqual(chartDefinitionAfter);
  });

  test("delete a data source column", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["B"]);
    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets![0].data).toEqual([20, 19, 18]);
    expect(data.datasets![1]).toBe(undefined);
    expect(data.labels).toEqual(["P1", "P2", "P3"]);
  });

  test("delete a data set labels column", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["A"]);
    // dataset in col B becomes labels in col A
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual(["0", "1", "2"]);
    expect(data.datasets![0].data).toEqual([10, 11, 12]);
    expect(data.datasets![1].data).toEqual([20, 19, 18]);
  });

  test("delete last row of dataset", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteRows(model, [4]);
    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets![0].data).toEqual([10, 11, 12]);
    expect(data.datasets![1].data).toEqual([20, 19, 18]);
    expect(data.labels).toEqual(["P1", "P2", "P3"]);
  });

  test("delete last col of dataset", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["C"]);
    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(data.datasets![1]).toBeUndefined();
    expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("add row in dataset", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    addRows(model, "before", 2, 1);
    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(data.datasets![1].data).toEqual([20, 19, 18, 17]);
    expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Add a row on another sheet does not affect a chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!A8:D8" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinition("1");
    createSheet(model, { sheetId: "42" });
    addRows(model, "before", 0, 1, "42");
    const chartDefinitionAfter = model.getters.getChartDefinition("1");
    expect(chartDefinitionBefore).toEqual(chartDefinitionAfter);
  });

  test("delete all the dataset except for the title", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteRows(model, [1, 2, 3, 4]);
    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets).toHaveLength(2);
    expect(data.datasets[0].hidden).toBeTruthy();
    expect(data.datasets[1].hidden).toBeTruthy();
    expect(data.labels).toEqual([]);
  });

  test("update dataset cell updates chart runtime", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    let dataSets = getChartConfiguration(model, "1").data.datasets;
    expect(dataSets[0].data).toEqual([10, 11, 12]);
    expect(dataSets[0].label).toEqual("first column dataset");
    setCellContent(model, "B2", "99");
    setCellContent(model, "B1", "new dataset label");
    dataSets = getChartConfiguration(model, "1").data.datasets;
    expect(dataSets![0].data).toEqual([99, 11, 12]);
    expect(dataSets![0].label).toEqual("new dataset label");
  });

  test("create chart with invalid dataset", () => {
    const result = createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "this is invalid" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidDataSet);
  });

  test("cannot duplicate chart ids", () => {
    const model = new Model();
    const cmd1 = createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(cmd1).toBeSuccessfullyDispatched();

    const cmd2 = createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
      "1"
    );
    expect(cmd2).toBeCancelledBecause(CommandResult.DuplicatedChartId);
    createSheet(model, { sheetId: "42" });
    const cmd3 = createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
      "1",
      "42"
    );
    expect(cmd3).toBeCancelledBecause(CommandResult.DuplicatedChartId);
  });

  test("reject updates that target a inexistent chart", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    createSheet(model, { sheetId: "42" });
    const result = model.dispatch("UPDATE_CHART", {
      definition: model.getters.getChartDefinition("1"),
      sheetId: model.getters.getActiveSheetId(),
      figureId: "2",
      chartId: "2",
    });

    updateChart(model, "1", { legendPosition: "left" });
    expect(result).toBeCancelledBecause(CommandResult.ChartDoesNotExist);
  });

  test("reject updates that target a figure that is not a chart", () => {
    createFigure(model, { figureId: "2", tag: "not a chart" });

    const result = model.dispatch("UPDATE_CHART", {
      definition: {
        dataSets: [],
        dataSetsHaveTitle: false,
        stacked: false,
        legendPosition: "bottom",
        title: { text: "test" },
        type: "bar",
      },
      sheetId: model.getters.getActiveSheetId(),
      figureId: "2",
      chartId: "2",
    });
    expect(result).toBeCancelledBecause(CommandResult.ChartDoesNotExist);
  });

  test("reject update that does not change the chart", () => {
    createChart(model, { type: "line" }, "1");
    const result = updateChart(model, "1", {});
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("chart is not selected after creation and update", () => {
    const chartId = "1234";
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "B1:B4" }],
        labelRange: "A2:A4",
      },
      chartId
    );
    expect(model.getters.getSelectedFigureId()).toBeNull();
    model.dispatch("SELECT_FIGURE", { figureId: chartId });
    expect(model.getters.getSelectedFigureId()).toBe(chartId);
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBeNull();
    updateChart(model, chartId, {
      dataSets: [{ dataRange: "B1:B4" }],
      labelRange: "A2:A4",
      title: { text: "updated chart" },
    });
    expect(model.getters.getSelectedFigureId()).toBeNull();
  });

  test("create chart with invalid labels", () => {
    const result = createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Miaouss oui la guerre",
        type: "line",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidLabelRange);
  });

  test("create chart with invalid SheetName in dataset will ignore invalid data", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Coucou!B1:B4" }, { dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const config = getChartConfiguration(model, "1");
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [{ dataRange: "B1:B4" }],
      labelRange: "Sheet1!A2:A4",
      title: { text: "test" },
      type: "bar",
    });
    expect(config.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(config.type).toEqual("bar");
  });

  test("create chart with empty labels", () => {
    const result = createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!B1:B4" }],
        labelRange: "",
      },
      "1"
    );
    expect(result).toBeSuccessfullyDispatched();
  });
  test.each([[["Sheet1!B1:B4", "This is invalid"]], [["1:4"]]])(
    "update chart with invalid dataset",
    (invalidDataset: string[]) => {
      createChart(
        model,
        {
          type: "bar",
          dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!B1:B4" }],
          labelRange: "",
        },
        "1"
      );
      expect(
        updateChart(model, "1", {
          dataSets: invalidDataset.map((ds) => ({ dataRange: ds })),
        })
      ).toBeCancelledBecause(CommandResult.InvalidDataSet);
    }
  );

  test("update chart with invalid labels", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:A2" }],
        labelRange: "A1",
      },
      "1"
    );
    expect(
      updateChart(model, "1", {
        labelRange: "This is invalid",
      })
    ).toBeCancelledBecause(CommandResult.InvalidLabelRange);
  });
  test("duplicate a sheet with and without a chart", () => {
    const model = new Model({
      sheets: [
        {
          id: "1",
          colNumber: 2,
          rowNumber: 2,
        },
        {
          id: "2",
          colNumber: 2,
          rowNumber: 2,
          cells: { B1: "0", B2: "1" },
        },
      ],
    });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
      },
      "1",
      "2"
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "1",
      sheetIdTo: "SheetNoFigure",
      sheetNameTo: "Copy of Sheet1",
    });
    activateSheet(model, "SheetNoFigure");
    expect(model.getters.getVisibleFigures()).toEqual([]);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "2",
      sheetIdTo: "SheetWithFigure",
      sheetNameTo: "Copy of Sheet1",
    });
    activateSheet(model, "2");
    const { x, y, width, height, tag } = model.getters.getVisibleFigures()[0];
    activateSheet(model, "SheetWithFigure");
    expect(model.getters.getVisibleFigures()).toMatchObject([{ x, y, height, width, tag }]);
  });
  test("extend data source to new values manually", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:A2" }],
        labelRange: "A1",
      },
      "1"
    );
    updateChart(model, "1", {
      dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
      labelRange: "Sheet1!A2:A5",
      dataSetsHaveTitle: true,
    });
    const dataSets = getChartConfiguration(model, "1").data.datasets;
    expect(dataSets![0].data).toEqual([10, 11, 12, 13]);
    expect(dataSets![1].data).toEqual([20, 19, 18, 17]);
  });
  test("extend data set labels to new values manually", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:A2" }],
        labelRange: "A1",
        dataSetsHaveTitle: true,
      },
      "1"
    );
    updateChart(model, "1", {
      dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
      labelRange: "Sheet1!A2:A5",
      dataSetsHaveTitle: true,
    });
    const config = getChartConfiguration(model, "1");
    expect(config.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Chart is deleted on sheet deletion", () => {
    createSheet(model, { sheetId: "2", position: 1 });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1",
      "2"
    );
    expect(model.getters.getChartRuntime("1")).not.toBeUndefined();
    deleteSheet(model, "2");
    expect(() => model.getters.getChartRuntime("1")).toThrow();
  });

  test("Chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    const dataSets = [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }];

    createChart(
      model,
      {
        type: "bar",
        dataSets,
        labelRange: "A2:A4",
      },
      firstSheetId
    );
    const figure = model.getters.getFigures(firstSheetId)[0]!;
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: secondSheetId,
      sheetId: firstSheetId,
      sheetNameTo: "Copy of Sheet1",
    });

    expect(model.getters.getFigures(secondSheetId)).toHaveLength(1);
    const duplicatedFigure = model.getters.getFigures(secondSheetId)[0];
    const duplicatedChartId = model.getters.getChartIds(secondSheetId)[0];
    const newChart = model.getters.getChart(duplicatedChartId) as BarChart;

    expect(newChart.labelRange?.sheetId).toEqual(secondSheetId);
    expect(zoneToXc(newChart.labelRange!.zone)).toEqual("A2:A4");

    newChart.dataSets?.map((ds, index) => {
      expect(ds.dataRange.sheetId).toEqual(secondSheetId);
      expect(zoneToXc(ds.dataRange.zone)).toEqual(dataSets[index].dataRange);
    });

    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);

    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
  });

  test("Duplicate sheet > export > import > duplicate sheet contains 2 distinct charts", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    const thirdSheetId = "third";
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
        labelRange: "A2:A4",
      },
      "myChart",
      firstSheetId
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
      sheetNameTo: "Copy of Sheet1",
    });

    const newModel = new Model(model.exportData());
    newModel.dispatch("DUPLICATE_SHEET", {
      sheetId: secondSheetId,
      sheetIdTo: thirdSheetId,
      sheetNameTo: "Copy of Sheet1 2",
    });

    const figuresSh1 = newModel.getters.getFigures(firstSheetId);
    const figuresSh2 = newModel.getters.getFigures(secondSheetId);
    const figuresSh3 = newModel.getters.getFigures(thirdSheetId);

    expect(figuresSh1.length).toEqual(1);
    expect(figuresSh2.length).toEqual(1);
    expect(figuresSh3.length).toEqual(1);

    expect(newModel.getters.getChartIds(firstSheetId).length).toEqual(1);
    expect(newModel.getters.getChartIds(secondSheetId).length).toEqual(1);
    expect(newModel.getters.getChartIds(thirdSheetId).length).toEqual(1);

    expect(figuresSh2[0].id).toEqual(secondSheetId + FIGURE_ID_SPLITTER + figuresSh1[0].id);
    expect(figuresSh3[0].id).toEqual(thirdSheetId + FIGURE_ID_SPLITTER + figuresSh1[0].id);

    const chartSh1 = newModel.getters.getChartFromFigureId(figuresSh1[0].id);
    const chartSh2 = newModel.getters.getChartFromFigureId(figuresSh2[0].id);
    const chartSh3 = newModel.getters.getChartFromFigureId(figuresSh3[0].id);

    expect(chartSh1?.sheetId).toBe(firstSheetId);
    expect(chartSh2?.sheetId).toBe(secondSheetId);
    expect(chartSh3?.sheetId).toBe(thirdSheetId);

    expect(chartSh1).not.toEqual(chartSh2);
    expect(chartSh2).not.toEqual(chartSh3);
    expect(chartSh3).not.toEqual(chartSh1);
  });

  test("Chart foreign ranges unchanged on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetName = "FixedRef";
    const secondSheetId = "41";
    const thirdSheetId = "42";
    createSheetWithName(model, { sheetId: secondSheetId }, secondSheetName);
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: `${secondSheetName}!C1:C4` }],
        labelRange: `${secondSheetName}!A2:A4`,
      },
      firstSheetId
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: thirdSheetId,
      sheetId: firstSheetId,
      sheetNameTo: "Copy of Sheet1",
    });
    const duplicatedChartId = model.getters.getChartIds(thirdSheetId)[0];
    const duplicatedChartDefinition = model.getters.getChartDefinition(duplicatedChartId);
    expect(duplicatedChartDefinition).toMatchObject({
      dataSets: [{ dataRange: `${secondSheetName}!C1:C4` }],
      labelRange: `${secondSheetName}!A2:A4`,
      title: { text: "test" },
    });
  });

  test("Chart on columns deletion", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["A", "B"]);
    const def = model.getters.getChartDefinition("1") as LineChartDefinition;
    expect(def.dataSets).toHaveLength(1);
    expect(def.dataSets[0].dataRange).toEqual("A1:A4");
    expect(def.labelRange).toBeUndefined();
  });
});

describe("title", function () {
  test("change title manually", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:B1" }],
        labelRange: "A2:B2",
        title: { text: "title" },
      },
      "1"
    );
    let options = getChartConfiguration(model, "1").options;
    expect(options!.plugins!.title!.text).toEqual("title");

    updateChart(model, "1", { title: { text: "newTitle" } });
    options = getChartConfiguration(model, "1").options;
    expect(options!.plugins!.title!.text).toEqual("newTitle");
  });

  test("Title is not displayed if empty", () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "A1:B1" }],
        labelRange: "A2:B2",
        title: {
          text: "title",
        },
      },
      "1"
    );
    expect(getChartConfiguration(model, "1").options?.plugins?.title?.display).toBe(true);
    updateChart(model, "1", { title: { text: "" } });
    expect(getChartConfiguration(model, "1").options?.plugins?.title?.display).toBe(false);
  });

  test.each(["line", "bar", "pyramid", "pie", "combo", "waterfall", "scatter"] as const)(
    "Title alignment is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            text: "title",
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("start");
      updateChart(model, "1", { title: { text: "title", align: "center" } });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("center");
      updateChart(model, "1", { title: { text: "title", align: "right" } });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("end");
      updateChart(model, "1", { title: { text: "title", align: "left" } });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("start");
    }
  );
  test.each(["line", "bar", "pyramid", "pie", "combo", "waterfall", "scatter"] as const)(
    "Title color is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            text: "title",
            color: "#f00",
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.color).toBe("#f00");
    }
  );

  test.each(["line", "bar", "pyramid", "pie", "combo", "waterfall", "scatter"] as const)(
    "Title bold style is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            text: "title",
            bold: true,
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        weight: "bold",
      });
      updateChart(model, "1", { title: { text: "title", bold: false } });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        weight: "normal",
      });
    }
  );

  test.each(["line", "bar", "pyramid", "pie", "combo", "waterfall", "scatter"] as const)(
    "Title italic style is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            text: "title",
            italic: true,
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        style: "italic",
      });
      updateChart(model, "1", { title: { text: "title", italic: false } });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        style: "normal",
      });
    }
  );

  test.each(["line", "bar", "pyramid", "combo", "waterfall", "scatter"] as const)(
    "Axis title alignment is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              title: {
                text: "test",
              },
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("center");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            title: {
              text: "test",
              align: "left",
            },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("start");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            title: {
              text: "test",
              align: "center",
            },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("center");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            title: {
              text: "test",
              align: "right",
            },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("end");
    }
  );

  test.each(["line", "bar", "pyramid", "combo", "waterfall", "scatter"] as const)(
    "Axis title color is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              title: {
                text: "test",
                color: "#f00",
              },
            },
          },
        },
        "1"
      );
      const options = getChartConfiguration(model, "1").options;
      expect(options!.scales!.x!["title"].color).toEqual("#f00");
    }
  );

  test.each(["line", "bar", "pyramid", "combo", "waterfall", "scatter"] as const)(
    "Axis bold style is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              title: {
                text: "test",
              },
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.weight).toEqual("normal");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            title: {
              text: "test",
              bold: true,
            },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales!.x!["title"].font.weight).toEqual("bold");
    }
  );

  test.each(["line", "bar", "pyramid", "combo", "waterfall", "scatter"] as const)(
    "Axis italic style is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              title: {
                text: "test",
              },
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.style).toEqual("normal");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            title: {
              text: "test",
              italic: true,
            },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.style).toEqual("italic");
    }
  );
});

describe("multiple sheets", function () {
  test("create a chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const dataSets = getChartConfiguration(model, "1").data.datasets;
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(dataSets[0].data).toEqual([10, 11, 12]);
    expect(dataSets[1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
    });
  });
  test("create a chart with dataset label from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(getChartConfiguration(model, "1").data.labels).toEqual(["P1", "P2", "P3"]);
    expect(chartDefinition).toMatchObject({
      labelRange: "Sheet1!A2:A4",
    });
  });
  test("change source data then activate the chart sheet (it should be up-to-date)", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "42", sheetIdTo: "Sheet1" });
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 1,
      sheetId: "Sheet1",
      content: "99",
    });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "Sheet1", sheetIdTo: "42" });
    expect(getChartConfiguration(model, "28").data.datasets[0].data).toEqual([99, 11, 12]);
  });
  test("change dataset label then activate the chart sheet (it should be up-to-date)", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "42", sheetIdTo: "Sheet1" });
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 2,
      sheetId: "Sheet1",
      content: "miam",
    });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "Sheet1", sheetIdTo: "42" });
    expect(getChartConfiguration(model, "28").data.labels).toEqual(["P1", "miam", "P3"]);
  });
  test("create a chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    const dataSets = getChartConfiguration(model, "28").data.datasets;
    const chartDefinition = model.getters.getChartDefinition("28");
    expect(dataSets[0].data).toEqual([10, 11, 12]);
    expect(dataSets[1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
    });
  });
  describe("multiple sheets with formulas", function () {
    beforeEach(() => {
      model = new Model({
        version: "18.4.1",
        sheets: [
          {
            name: "Sheet1",
            cells: {
              A1: "a",
              A2: "b",
              B1: "1",
              B2: "2",
            },
            figures: [
              {
                id: "1",
                tag: "chart",
                width: 400,
                height: 300,
                x: 100,
                y: 100,
                data: {
                  type: "line",
                  title: { text: "demo chart" },
                  labelRange: "Sheet1!A1:A2",
                  dataSets: [{ dataRange: "Sheet2!A1:A2" }],
                  dataSetsHaveTitle: false,
                  background: "#124578",
                },
              },
            ],
          },
          {
            name: "Sheet2",
            cells: {
              A1: "=Sheet1!B1*2",
              A2: "=Sheet1!B2*2",
            },
          },
        ],
      });
    });
    test("new model with chart with formulas from another sheet (not evaluated yet)", () => {
      expect(getChartConfiguration(model, "1").data!.datasets![0].data).toEqual([2, 4]);
    });
    test("chart is updated with new data", () => {
      let dataSets = getChartConfiguration(model, "1").data.datasets;
      expect(dataSets[0].data).toEqual([2, 4]);
      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet2",
        col: 0,
        row: 0,
        content: "=Sheet1!B1*3",
      });
      dataSets = getChartConfiguration(model, "1").data.datasets;
      expect(dataSets[0].data).toEqual([3, 4]);

      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 1,
        row: 1,
        content: "5",
      });
      dataSets = getChartConfiguration(model, "1").data.datasets;
      expect(dataSets[0].data).toEqual([3, 10]);
    });
  });

  test("export with chart data from a sheet that was deleted, than import data does not crash", () => {
    const originSheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    deleteSheet(model, originSheet);
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    const chart = newModel.getters.getChartRuntime("28")!;
    expect(chart).toBeDefined();
  });
});

describe("undo/redo", () => {
  test("undo/redo chart creation", () => {
    const before = model.exportData();
    createChart(model, {
      type: "bar",
      dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
    });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });
  test("undo/redo chart dataset rebuild the chart runtime", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "27"
    );
    expect(getChartConfiguration(model, "27").data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(model, "B2", "99");
    expect(getChartConfiguration(model, "27").data!.datasets![0].data).toEqual([99, 11, 12]);
    undo(model);
    expect(getChartConfiguration(model, "27").data!.datasets![0].data).toEqual([10, 11, 12]);
    redo(model);
    expect(getChartConfiguration(model, "27").data!.datasets![0].data).toEqual([99, 11, 12]);
  });
});

describe("Chart without labels", () => {
  const defaultChart: BarChartDefinition = {
    background: "#FFFFFF",
    dataSets: [{ dataRange: "A1:A2", yAxisId: "y" }],
    dataSetsHaveTitle: false,
    legendPosition: "top",
    title: { text: "My chart" },
    type: "bar",
    stacked: false,
    aggregated: false,
  };

  test("The legend is displayed even when there is only one dataSet or no label", () => {
    createChart(model, defaultChart, "42");
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("top");

    createChart(
      model,
      { ...defaultChart, dataSets: [{ dataRange: "A1:A2" }, { dataRange: "A3:A4" }] },
      "43"
    );
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("top");

    createChart(model, { ...defaultChart, labelRange: "B1:B2" }, "44");
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("top");
  });

  test("Labels are empty if there is only one dataSet and no label", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    createChart(model, defaultChart, "42");
    expect(getChartConfiguration(model, "42").data?.labels).toEqual(["", ""]);

    createChart(
      model,
      { ...defaultChart, dataSets: [{ dataRange: "A1:A2" }, { dataRange: "A3:A4" }] },
      "43"
    );
    const dataSets = getChartConfiguration(model, "43").data.datasets;
    expect(dataSets[0].label).toEqual(`${ChartTerms.Series.toString()} 1`);
    expect(dataSets[1].label).toEqual(`${ChartTerms.Series.toString()} 2`);

    setCellContent(model, "B1", "B1");
    setCellContent(model, "B2", "B2");
    createChart(model, { ...defaultChart, type: "bar", labelRange: "B1:B2" }, "44");
    expect(getChartConfiguration(model, "44").data?.labels).toEqual(["B1", "B2"]);
  });

  test("Combo chart has bar if the type is set to bar and line else", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    setCellContent(model, "A5", "5");
    setCellContent(model, "A6", "6");

    createComboChart(
      model,
      {
        dataSets: [
          { dataRange: "A1:A2", type: "bar" },
          { dataRange: "A3:A4" },
          { dataRange: "A5:A6" },
        ],
      },
      "43"
    );
    const dataSets = getChartConfiguration(model, "43").data.datasets;
    expect(dataSets[0].type).toEqual("bar");
    expect(dataSets[1].type).toEqual("line");
    expect(dataSets[2].type).toEqual("line");
  });
});

describe("Chart design configuration", () => {
  const defaultChart: ChartDefinition = {
    background: "#FFFFFF",
    dataSets: [{ dataRange: "A1:A2", yAxisId: "y" }],
    dataSetsHaveTitle: true,
    legendPosition: "top",
    title: { text: "My chart" },
    type: "bar",
    labelRange: "A3",
    stacked: false,
    aggregated: false,
    humanize: false,
  };

  test("Legend position", () => {
    createChart(model, defaultChart, "42");
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("top");

    updateChart(model, "42", { legendPosition: "left" });
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("left");

    updateChart(model, "42", { legendPosition: "right" });
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("right");

    updateChart(model, "42", { legendPosition: "bottom" });
    expect(getChartConfiguration(model, "42").options?.plugins?.legend?.position).toBe("bottom");
  });

  test("Background is correctly updated", () => {
    createChart(model, defaultChart, "42");
    expect(model.getters.getChartDefinition("42")!.background).toBe("#FFFFFF");

    updateChart(model, "42", { background: "#000000" });
    expect(model.getters.getChartDefinition("42")!.background).toBe("#000000");
  });

  test("empty data points are not displayed in the chart", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          // prettier-ignore
          cells: {
            // data point 1: first empty
            A2: "", B2: "", C2: "",
            // data point 2: only label
            A3: "P1", B3: "", C3: "",
            // data point 3: only first value
            A4: "", B4: "10", C4: "",
            // data point 4: empty in the middle of data points
            A5: "", B5: "", C5: "",
            // data point 5: only second value
            A6: "", B6: "", C6: "20",
          },
        },
      ],
    });

    createChart(
      model,
      {
        type: "bar",
        labelRange: "A2:A6",
        dataSets: [{ dataRange: "B1:B15" }, { dataRange: "C1:C15" }],
      },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual(["P1", "", ""]);
    expect(data.datasets![0].data).toEqual([null, 10, null]);
    expect(data.datasets![1].data).toEqual([null, null, 20]);
  });

  test("value without matching index in the label set", () => {
    const model = new Model();
    // corresponding label would be A8, but it's not part of the label range
    setCellContent(model, "B8", "30");
    createChart(
      model,
      { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B15" }] },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual([""]);
    expect(data.datasets![0].data).toEqual([30]);
  });

  test("label without matching index in the data set", () => {
    const model = new Model();
    // corresponding value would be B8, but it's not part of the data range
    setCellContent(model, "A8", "P1");
    createChart(
      model,
      { type: "bar", labelRange: "A2:A15", dataSets: [{ dataRange: "B1:B3" }] },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual(["P1"]);
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].hidden).toBeTruthy();
  });

  test("no data points at all", () => {
    const model = new Model();
    createChart(
      model,
      { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B3" }] },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual([]);
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].hidden).toBeTruthy();
  });

  test.each([{ format: "0.00%" }, { style: { textColor: "#FFF" } }])(
    "no data points but style on a label",
    (formatting) => {
      const model = new Model();
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: target("A2:A3"),
        ...formatting,
      });
      createChart(
        model,
        { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B3" }] },
        "1"
      );
      const data = getChartConfiguration(model, "1").data;
      expect(data.labels).toEqual([]);
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].hidden).toBeTruthy();
    }
  );

  test.each([{ format: "0.00%" }, { style: { textColor: "#FFF" } }])(
    "no data points but style on a value",
    (formatting) => {
      const model = new Model();
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: target("B1:B3"),
        ...formatting,
      });
      createChart(
        model,
        { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B3" }] },
        "1"
      );
      const data = getChartConfiguration(model, "1").data;
      expect(data.labels).toEqual([]);
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].hidden).toBeTruthy();
    }
  );

  test("data point with only a zero value", () => {
    const model = new Model();
    setCellContent(model, "B2", "0");
    createChart(
      model,
      { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B3" }] },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual([""]);
    expect(data.datasets![0].data).toEqual([0]);
  });

  test("data point with only a zero label", () => {
    const model = new Model();
    setCellContent(model, "A2", "0");
    createChart(
      model,
      { type: "bar", labelRange: "A2:A3", dataSets: [{ dataRange: "B1:B3" }] },
      "1"
    );
    const data = getChartConfiguration(model, "1").data;
    expect(data.labels).toEqual(["0"]);
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].hidden).toBeTruthy();
  });

  test("Changing the format of a cell reevaluates a chart runtime", () => {
    const model = new Model();
    setCellContent(model, "A2", "2022/03/01");
    setCellContent(model, "A3", "2022/03/02");
    createChart(
      model,
      {
        type: "bar",
        labelRange: "A2:A3",
        dataSets: [{ dataRange: "B2:B3" }],
        dataSetsHaveTitle: false,
      },
      "1"
    );
    expect(getChartConfiguration(model, "1").data!.labels).toEqual(["2022/03/01", "2022/03/02"]);
    setCellFormat(model, "A2", "m/d/yyyy");
    expect(getChartConfiguration(model, "1").data!.labels).toEqual(["3/1/2022", "2022/03/02"]);
  });

  describe("Format of Y values at Runtime", () => {
    test.each(["bar", "line", "scatter", "waterfall"])(
      "Bar/Line chart Y axis, cell without format: thousand separator",
      (chartType) => {
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" }, "42");
        const options = getChartConfiguration(model, "42").options;
        //@ts-ignore
        expect(options.scales.y?.ticks.callback!(60000000)).toEqual("60,000,000");
        //@ts-ignore
        expect(options.scales.y?.ticks.callback!(-60000000)).toEqual("-60,000,000");
      }
    );

    test.each(["bar", "line", "scatter", "waterfall"])(
      "Bar/Line chart Y axis, cell without format: thousand separator is locale dependant",
      (chartType) => {
        updateLocale(model, FR_LOCALE);
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" }, "42");
        const options = getChartConfiguration(model, "42").options;
        //@ts-ignore
        expect(options.scales.y?.ticks.callback!(60000000)).toEqual("60 000 000");
        // @ts-ignore
        expect(options.scales.y?.ticks.callback!(-60000000)).toEqual("-60 000 000");
      }
    );

    test.each(["bar", "line", "scatter", "waterfall"])(
      "Bar/Line chart Y axis, cell with format",
      (chartType) => {
        setCellFormat(model, "A2", "[$$]#,##0.00");
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" }, "42");
        expect(
          getChartConfiguration(model, "42").options.scales.y?.ticks.callback!(60000000)
        ).toEqual("$60,000,000.00");

        setCellFormat(model, "A2", "[$$]*A#,##"); // We should ignore repeated characters in format
        expect(
          getChartConfiguration(model, "42").options.scales.y?.ticks.callback!(60000000)
        ).toEqual("$60,000,000");
      }
    );

    test.each<ChartWithDataSetDefinition["type"]>(["bar", "line", "scatter", "combo"])(
      "%s chart: both Y axis can have different formats, which are applied to the ticks and tooltips",
      (chartType) => {
        createChart(
          model,
          {
            ...defaultChart,
            type: chartType,
            dataSets: [
              { dataRange: "A1:A2", yAxisId: "y" },
              { dataRange: "B1:B2", yAxisId: "y1" },
            ],
          },
          "42"
        );
        setCellFormat(model, "A2", "[$$]#,#");
        setCellFormat(model, "B1", "0%");

        const config = model.getters.getChartRuntime("42") as any;
        const scales = config.chartJsConfig?.options?.scales;
        expect(scales.y?.ticks.callback!(60000000)).toEqual("$60,000,000");
        expect(scales.y1?.ticks.callback!(0.5)).toEqual("50%");

        let tooltipItem = { parsed: { y: 20 }, dataset: { yAxisID: "y", label: "Ds 1" } };
        let labelValues = getChartTooltipValues(config, tooltipItem);
        expect(labelValues).toEqual({ label: "$20", beforeLabel: "Ds 1" });

        tooltipItem = { parsed: { y: 20 }, dataset: { yAxisID: "y1", label: "Ds 2" } };
        labelValues = getChartTooltipValues(config, tooltipItem);
        expect(labelValues).toEqual({ label: "2000%", beforeLabel: "Ds 2" });
      }
    );

    test.each(["bar", "line", "scatter", "waterfall"] as const)(
      "Bar/Line chart Y axis, date format is ignored",
      (chartType) => {
        setCellFormat(model, "A2", "m/d/yyyy");
        createChart(model, { ...defaultChart, type: chartType }, "42");
        //@ts-ignore
        expect(getChartConfiguration(model, "42").options.scales.y?.ticks.callback!(600)).toEqual(
          "600"
        );
      }
    );

    test.each(["bar", "line"])(
      "Basic chart tooltip label, cell without format: thousand separator for positive values",
      (chartType) => {
        setCellContent(model, "A2", "60000000");
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" | "pie" }, "42");
        const runtime = model.getters.getChartRuntime("42") as BarChartRuntime;
        const tooltipItem = getChartTooltipItemFromDataset(runtime, 0, 0);
        const labelValues = getChartTooltipValues(runtime, tooltipItem);
        expect(labelValues).toEqual({ label: "60,000,000", beforeLabel: "" });
      }
    );

    test.each(["bar", "line"])(
      "Basic chart tooltip label, cell without format: thousand separator for negative values",
      (chartType) => {
        setCellContent(model, "A2", "-60000000");
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" | "pie" }, "42");
        const runtime = model.getters.getChartRuntime("42") as BarChartRuntime;
        const tooltipItem = getChartTooltipItemFromDataset(runtime, 0, 0);
        const labelValues = getChartTooltipValues(runtime, tooltipItem);
        expect(labelValues).toEqual({ label: "-60,000,000", beforeLabel: "" });
      }
    );

    test.each(["bar", "line"])("Basic chart tooltip label, date format is ignored", (chartType) => {
      setCellContent(model, "A2", "6000");
      setCellFormat(model, "A2", "m/d/yyyy");
      createChart(model, { ...defaultChart, type: chartType as "bar" | "line" | "pie" }, "42");
      const runtime = model.getters.getChartRuntime("42") as BarChartRuntime;
      const tooltipItem = getChartTooltipItemFromDataset(runtime, 0, 0);
      const labelValues = getChartTooltipValues(runtime, tooltipItem);
      expect(labelValues).toEqual({ label: "6,000", beforeLabel: "" });
    });

    test.each(["line", "scatter", "combo", "bar"] as const)(
      "%s chart with no title and no legend have the correct padding",
      (chartType) => {
        createChart(
          model,
          {
            type: chartType,
            legendPosition: "none",
            title: { text: "" },
          },
          "1"
        );
        const config = getChartConfiguration(model, "1");
        expect(config.options.layout.padding).toEqual({
          top: CHART_PADDING_TOP,
          bottom: CHART_PADDING_BOTTOM,
          left: CHART_PADDING,
          right: CHART_PADDING,
        });
      }
    );

    test.each(["bar", "line"])(
      "Basic chart tooltip label, zero-values are properly displayed",
      (chartType) => {
        setCellContent(model, "A2", "0");
        createChart(model, { ...defaultChart, type: chartType as "bar" | "line" }, "42");
        const runtime = model.getters.getChartRuntime("42") as BarChartRuntime;
        const tooltipItem = getChartTooltipItemFromDataset(runtime, 0, 0);
        const labelValues = getChartTooltipValues(runtime, tooltipItem);
        expect(labelValues).toEqual({ label: "0", beforeLabel: "" });
      }
    );

    test.each(["line", "scatter", "combo", "bar"] as const)(
      "%s chart with no title but a legend have the correct padding",
      (chartType) => {
        createChart(
          model,
          {
            type: chartType,
            legendPosition: "bottom",
            title: { text: "" },
          },
          "1"
        );
        let config = getChartConfiguration(model, "1");
        expect(config.options.layout.padding).toEqual({
          top: CHART_PADDING_TOP,
          bottom: CHART_PADDING_BOTTOM,
          left: CHART_PADDING,
          right: CHART_PADDING,
        });
        expect(config.options.plugins.title.padding).toEqual({
          bottom: CHART_PADDING,
        });

        updateChart(model, "1", { legendPosition: "top" });
        config = getChartConfiguration(model, "1");
        expect(config.options.plugins.title.padding).toEqual({ bottom: 0 });
      }
    );
  });

  describe("Pie Chart tooltip", () => {
    test("pie chart tooltip label to include percentage", () => {
      setCellContent(model, "A1", "P1");
      setCellContent(model, "A2", "100");
      setCellContent(model, "A3", "150");
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "A1",
          type: "pie",
        },
        "1"
      );
      const chart = model.getters.getChartRuntime("1") as PieChartRuntime;
      const tooltipItem = getChartTooltipItemFromDataset(chart, 0, 1);
      const labelValues = getChartTooltipValues(chart, tooltipItem);
      expect(labelValues).toEqual({ beforeLabel: "P1", label: "150 (60.00%)" });
    });

    test("pie chart tooltip label with format", () => {
      setCellContent(model, "A1", "P1");
      setCellContent(model, "A2", "6000");
      setCellFormat(model, "A2", "[$$]#,##0.00");
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:A2" }],
          labelRange: "A1",
          type: "pie",
          humanize: false,
        },
        "1"
      );
      const chart = model.getters.getChartRuntime("1") as PieChartRuntime;
      const tooltipItem = getChartTooltipItemFromDataset(chart, 0, 0);
      const labelValues = getChartTooltipValues(chart, tooltipItem);
      expect(labelValues).toEqual({ beforeLabel: "P1", label: "$6,000.00 (100.00%)" });
    });
  });

  test("scatter chart definition stores per-series point label ranges", () => {
    setGrid(model, {
      A1: "X",
      A2: "1",
      A3: "2",
      B1: "Dataset 1",
      B2: "10",
      B3: "20",
      C1: "Point labels",
      C2: "Alpha",
      C3: "Beta",
    });

    createChart(
      model,
      {
        labelRange: "Sheet1!A2:A3",
        dataSets: [
          {
            dataRange: "Sheet1!B1:B3",
            pointLabelRange: "Sheet1!C2:C3",
          },
        ],
        type: "scatter",
        dataSetsHaveTitle: true,
      },
      "1"
    );

    const definition = model.getters.getChartDefinition("1") as ScatterChartDefinition;
    expect(definition.dataSets).toHaveLength(1);
    expect(definition.dataSets[0].pointLabelRange).toBe("Sheet1!C2:C3");
  });

  test("scatter chart tooltip label", () => {
    setCellContent(model, "A2", "5");
    setCellFormat(model, "A2", "0%");
    setCellContent(model, "B1", "Dataset 1");
    setCellContent(model, "B2", "6000");
    setCellFormat(model, "B2", "[$$]#,##0.00");
    createChart(
      model,
      {
        labelRange: "A2",
        dataSets: [{ dataRange: "B1:B2" }],
        type: "scatter",
        dataSetsHaveTitle: true,
        humanize: false,
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1") as ScatterChartRuntime;
    const tooltipItem = getChartTooltipItemFromDataset(chart, 0, 0);
    const labelValues = getChartTooltipValues(chart, tooltipItem);
    expect(labelValues).toEqual({ beforeLabel: "Dataset 1", label: "(500%, $6,000.00)" });
  });

  test("scatter chart tooltip uses point label ranges", () => {
    setGrid(model, {
      A1: "X",
      A2: "1",
      A3: "2",
      B1: "Dataset 1",
      B2: "10",
      B3: "20",
      C1: "Point labels",
      C2: "Alpha",
      C3: "Beta",
    });

    createChart(
      model,
      {
        labelRange: "Sheet1!A2:A3",
        dataSets: [
          {
            dataRange: "Sheet1!B1:B3",
            pointLabelRange: "Sheet1!C2:C3",
          },
        ],
        type: "scatter",
        dataSetsHaveTitle: true,
        humanize: false,
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1") as ScatterChartRuntime;
    const tooltipItem = getChartTooltipItemFromDataset(chart, 0, 1);
    const labelValues = getChartTooltipValues(chart, tooltipItem);
    expect(labelValues).toEqual({ beforeLabel: "Dataset 1", label: "Beta: (2, 20)" });
  });

  test("scatter chart show values plugin can display point labels", () => {
    setGrid(model, {
      A1: "X",
      A2: "1",
      A3: "2",
      B1: "Dataset 1",
      B2: "10",
      B3: "20",
      C1: "Point labels",
      C2: "Alpha",
      C3: "Beta",
    });

    createChart(
      model,
      {
        labelRange: "Sheet1!A2:A3",
        dataSets: [
          {
            dataRange: "Sheet1!B1:B3",
            pointLabelRange: "Sheet1!C2:C3",
          },
        ],
        type: "scatter",
        dataSetsHaveTitle: true,
        humanize: false,
        showValues: true,
        showValuesMode: "label",
      },
      "1"
    );

    const plugin = getChartConfiguration(model, "1").options?.plugins?.chartShowValuesPlugin;
    const datasetMeta = { index: 0, yAxisID: "y" };
    expect(plugin.showValues).toBe(true);
    expect(plugin.callback(10, datasetMeta, 0)).toBe("Alpha");
    expect(plugin.callback(20, datasetMeta, 1)).toBe("Beta");
  });

  test("scatter chart show values plugin shows nothing for missing point labels", () => {
    setGrid(model, {
      A1: "X",
      A2: "1",
      A3: "2",
      B1: "Dataset 1",
      B2: "10",
      B3: "20",
      C1: "Point labels",
      C2: "Alpha",
      C3: "",
    });

    createChart(
      model,
      {
        labelRange: "Sheet1!A2:A3",
        dataSets: [
          {
            dataRange: "Sheet1!B1:B3",
            pointLabelRange: "Sheet1!C2:C3",
          },
        ],
        type: "scatter",
        dataSetsHaveTitle: true,
        humanize: false,
        showValues: true,
        showValuesMode: "label",
      },
      "1"
    );

    const plugin = getChartConfiguration(model, "1").options?.plugins?.chartShowValuesPlugin;
    const datasetMeta = { index: 0, yAxisID: "y" };
    expect(plugin.callback(20, datasetMeta, 1)).toBe("");
  });

  test("scatter chart trend line tooltip label", () => {
    setGrid(model, { A1: "1", A2: "2", B1: "12", B2: "15" });

    createChart(
      model,
      {
        labelRange: "A1:A2",
        dataSets: [{ dataRange: "B1:B2", trend: { type: "polynomial", order: 1, display: true } }],
        type: "scatter",
        dataSetsHaveTitle: false,
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1") as ScatterChartRuntime;
    const tooltipItem = getChartTooltipItemFromDataset(chart, 1, 0);
    const labelValues = getChartTooltipValues(chart, tooltipItem);
    expect(labelValues).toEqual({ beforeLabel: "Trend line for Series 1", label: "12" });
  });

  test.each(["line", "scatter", "bar", "combo"] as const)(
    "%s chart correctly use right axis if set up in definition, and the grid lines are only displayed once",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "3");
      setCellContent(model, "A4", "4");

      createChart(
        model,
        {
          dataSets: [
            { dataRange: "A1:A2", yAxisId: "y" },
            { dataRange: "A3:A4", yAxisId: "y1" },
          ],
          type: chartType,
        },
        "43"
      );
      //@ts-ignore
      let config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["yAxisID"]).toEqual("y");
      expect(config.data?.datasets![1]["yAxisID"]).toEqual("y1");
      expect(config.options?.scales?.y).toMatchObject({
        position: "left",
        grid: { display: true },
      });
      expect(config.options?.scales?.y1).toMatchObject({
        position: "right",
        grid: { display: false },
      });
      updateChart(model, "43", {
        dataSets: [
          { dataRange: "A1:A2", yAxisId: "y1" },
          { dataRange: "A3:A4", yAxisId: "y1" },
        ],
      });
      config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["yAxisID"]).toEqual("y1");
      expect(config.data?.datasets![1]["yAxisID"]).toEqual("y1");
      expect(config.options?.scales?.y).toBeUndefined();
      expect(config.options?.scales?.y1).toMatchObject({
        position: "right",
        grid: { display: true },
      });
      updateChart(model, "43", {
        dataSets: [
          { dataRange: "A1:A2", yAxisId: "y" },
          { dataRange: "A3:A4", yAxisId: "y" },
        ],
      });
      config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["yAxisID"]).toEqual("y");
      expect(config.data?.datasets![1]["yAxisID"]).toEqual("y");
      expect(config.options?.scales?.y1).toBeUndefined();
      expect(config.options?.scales?.y).toMatchObject({
        position: "left",
        grid: { display: true },
      });
    }
  );

  test.each(["line", "bar", "combo"] as const)(
    "%s chart does not display vertical grid lines",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");

      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:A2", yAxisId: "y" }],
          type: chartType,
        },
        "43"
      );

      const config = getChartConfiguration(model, "43");
      expect(config.options?.scales?.x?.grid?.display).toBe(false);
      expect(config.options?.scales?.y?.grid?.display).toBe(true);
    }
  );

  test("scatter chart displays vertical grid lines", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");

    createChart(
      model,
      {
        dataSets: [{ dataRange: "A1:A2", yAxisId: "y" }],
        type: "scatter",
      },
      "44"
    );

    const config = getChartConfiguration(model, "44");
    expect(config.options?.scales?.x?.grid?.display).toBe(true);
    expect(config.options?.scales?.y?.grid?.display).toBe(true);
  });

  test("horizontal bar chart displays vertical but not horizontal grid lines", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");

    createChart(
      model,
      {
        dataSets: [{ dataRange: "A1:A2", yAxisId: "y" }],
        type: "bar",
        horizontal: true,
      },
      "45"
    );

    const config = getChartConfiguration(model, "45");
    expect(config.options?.scales?.x?.grid?.display).toBe(true);
    expect(config.options?.scales?.y?.grid?.display).toBe(false);
  });

  test.each(["line", "scatter", "combo"] as const)(
    "%s chart correctly use dataset colors set up in definition",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "3");
      setCellContent(model, "A4", "4");

      createChart(
        model,
        {
          dataSets: [
            { dataRange: "A1:A2", backgroundColor: "#FF0000" },
            { dataRange: "A3:A4", backgroundColor: "#0000FF" },
          ],
          type: chartType,
        },
        "43"
      );
      const config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["backgroundColor"]).toEqual("#FF0000");
      expect(config.data?.datasets![0]["borderColor"]).toEqual("#FF0000");
      expect(config.data?.datasets![1]["backgroundColor"]).toEqual("#0000FF");
      expect(config.data?.datasets![1]["borderColor"]).toEqual("#0000FF");
    }
  );

  test.each(["bar", "pyramid"] as const)(
    "%s chart correctly use dataset colors set up in definition",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "3");
      setCellContent(model, "A4", "4");

      createChart(
        model,
        {
          dataSets: [
            { dataRange: "A1:A2", backgroundColor: "#f00" },
            { dataRange: "A3:A4", backgroundColor: "#00f" },
          ],
          type: chartType,
        },
        "43"
      );
      const config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["backgroundColor"]).toEqual("#f00");
      expect(config.data?.datasets![0]["borderColor"]).toEqual("#FFFFFF");
      expect(config.data?.datasets![1]["backgroundColor"]).toEqual("#00f");
      expect(config.data?.datasets![1]["borderColor"]).toEqual("#FFFFFF");
    }
  );

  test.each(["line", "scatter", "combo"] as const)(
    "%s chart take into account dataset colors set up in definition for color generator",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "3");
      setCellContent(model, "A4", "4");

      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:A2" }, { dataRange: "A3:A4" }],
          type: chartType,
        },
        "43"
      );
      let config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["backgroundColor"]).toEqual("#4EA7F2");
      expect(config.data?.datasets![1]["backgroundColor"]).toEqual("#EA6175");

      updateChart(model, "43", {
        dataSets: [{ dataRange: "A1:A2", backgroundColor: "#EA6175" }, { dataRange: "A3:A4" }],
      });

      config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["backgroundColor"]).toEqual("#EA6175");
      expect(config.data?.datasets![1]["backgroundColor"]).toEqual("#43C5B1");
    }
  );

  test.each(["line", "scatter"] as const)(
    "%s chart correctly use dataset colors set up in definition",
    (chartType) => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "3");
      setCellContent(model, "A4", "4");
      setCellContent(model, "A5", "5");
      setCellContent(model, "A6", "6");

      createChart(
        model,
        {
          dataSets: [
            { dataRange: "A1:A2", backgroundColor: "#f00" },
            { dataRange: "A3:A4", backgroundColor: "#00f" },
          ],
          type: chartType,
        },
        "43"
      );
      const config = getChartConfiguration(model, "43");
      expect(config.data?.datasets![0]["borderColor"]).toEqual("#f00");
      expect(config.data?.datasets![1]["borderColor"]).toEqual("#00f");
    }
  );
});

describe("Chart aggregate labels", () => {
  let aggregatedChart: BarChartDefinition;
  let aggregatedModel: Model;

  beforeEach(() => {
    aggregatedChart = {
      background: "#FFFFFF",
      dataSets: [{ dataRange: "B2:B9", yAxisId: "y" }],
      labelRange: "A2:A9",
      dataSetsHaveTitle: false,
      legendPosition: "top",
      title: { text: "My chart" },
      type: "bar",
      stacked: false,
      aggregated: false,
    };
    aggregatedModel = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A2: "P1",
            A3: "P2",
            A4: "P3",
            A5: "P4",
            A6: "P1",
            A7: "P2",
            A8: "P3",
            A9: "P4",
            B1: "first column dataset",
            B2: "10",
            B3: "11",
            B4: "12",
            B5: "13",
            B6: "14",
            B7: "15",
            B8: "16",
            B9: "17",
            C1: "second column dataset",
            C2: "31",
            C3: "32",
            C4: "33",
            C5: "34",
            C6: "21",
            C7: "22",
            C8: "23",
            C9: "24",
          },
        },
      ],
    });
  });

  test.each(["bar", "line", "pie", "scatter"] as const)(
    "One dataset: all data complete",
    (type) => {
      createChart(aggregatedModel, aggregatedChart, "42");
      updateChart(aggregatedModel, "42", { type });
      let data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
      expect(data.labels).toEqual(["P1", "P2", "P3", "P4", "P1", "P2", "P3", "P4"]);

      updateChart(aggregatedModel, "42", { aggregated: true });
      data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([24, 26, 28, 30]);
      expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
    }
  );

  test("Empty cells are ignored when aggregating data", () => {
    createChart(aggregatedModel, aggregatedChart, "42");
    setCellContent(aggregatedModel, "B3", "");
    setCellContent(aggregatedModel, "B6", "");
    updateChart(aggregatedModel, "42", { aggregated: true });
    const data = getChartConfiguration(aggregatedModel, "42").data;
    expect(data.datasets![0].data).toEqual([10, 15, 28, 30]);
    expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Label with no values aggregates to zero", () => {
    createChart(aggregatedModel, aggregatedChart, "42");
    setCellContent(aggregatedModel, "B2", "");
    setCellContent(aggregatedModel, "B6", "");
    updateChart(aggregatedModel, "42", { aggregated: true });
    const data = getChartConfiguration(aggregatedModel, "42").data;
    expect(data.datasets![0].data).toEqual([0, 26, 28, 30]);
    expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Non-number cells are ignored", () => {
    createChart(aggregatedModel, aggregatedChart, "42");
    setCellContent(aggregatedModel, "B3", "I am a string");
    setCellContent(aggregatedModel, "B6", "I am a string too");
    updateChart(aggregatedModel, "42", { aggregated: true });
    const data = getChartConfiguration(aggregatedModel, "42").data;
    expect(data.datasets![0].data).toEqual([10, 15, 28, 30]);
    expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test.each(["bar", "line", "pie", "scatter"] as const)(
    "Multiple datasets: all data complete",
    (type) => {
      aggregatedChart = {
        ...aggregatedChart,
        dataSets: [{ dataRange: "B2:B9" }, { dataRange: "C2:C9" }],
      };
      createChart(aggregatedModel, aggregatedChart, "42");
      updateChart(aggregatedModel, "42", { type });
      let data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
      expect(data.datasets![1].data).toEqual([31, 32, 33, 34, 21, 22, 23, 24]);
      expect(data.labels).toEqual(["P1", "P2", "P3", "P4", "P1", "P2", "P3", "P4"]);

      updateChart(aggregatedModel, "42", { aggregated: true });
      data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([24, 26, 28, 30]);
      expect(data.datasets![1].data).toEqual([52, 54, 56, 58]);
      expect(data.labels).toEqual(["P1", "P2", "P3", "P4"]);
    }
  );

  test.each(["bar", "line", "pie"] as const)(
    "Labels will not be sorted when aggregated in %s chart",
    (type) => {
      createChart(aggregatedModel, aggregatedChart, "42");
      updateChart(aggregatedModel, "42", { type });

      setCellContent(aggregatedModel, "A3", "2023");
      setCellContent(aggregatedModel, "A7", "2024");

      let data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
      expect(data.labels).toEqual(["P1", "2023", "P3", "P4", "P1", "2024", "P3", "P4"]);

      updateChart(aggregatedModel, "42", { aggregated: true });
      data = getChartConfiguration(aggregatedModel, "42").data;
      expect(data.datasets![0].data).toEqual([24, 11, 28, 30, 15]);
      expect(data.labels).toEqual(["P1", "2023", "P3", "P4", "2024"]);
    }
  );
});

describe("Linear/Time charts", () => {
  const chartId = "1";

  beforeEach(() => {
    mockChart(); // mock chart.js with luxon time adapter installed
  });

  test("linear axis for line chart with numbers labels/dataset", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    expect(getChartConfiguration(model, chartId).options?.scales?.x?.type).toEqual("linear");
  });

  test("time axis for line/bar chart with date labels", () => {
    setFormat(model, "C2:C5", "m/d/yyyy");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    const config = getChartConfiguration(model, chartId);
    expect(config.options?.scales?.x?.type).toEqual("time");
  });

  test("time axis for line/bar chart with formulas w/ date format as labels", () => {
    setCellContent(model, "C2", "=DATE(2022,1,1)");
    setCellContent(model, "C3", "=DATE(2022,1,2)");
    setCellContent(model, "C4", "=DATE(2022,1,3)");
    setCellContent(model, "C5", "=DATE(2022,1,4)");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    const chart = model.getters.getChartRuntime(chartId) as LineChartRuntime;
    expect(chart.chartJsConfig.options?.scales?.x?.type).toEqual("time");
  });

  test("time axis: the axis unit are correct", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C3",
        labelsAsText: false,
      },
      chartId
    );
    setFormat(model, "C2:C3", "mm/dd/yyyy");
    setCellContent(model, "C2", "1/1/2022");

    setCellContent(model, "C3", "1/1/2025");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("year");

    setCellContent(model, "C3", "5/1/2022");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("month");

    setCellContent(model, "C3", "1/10/2022");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("day");

    setFormat(model, "C2:C3", "hh:mm:ss");

    setCellContent(model, "C3", "1/1/2022 00:00:15");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("second");

    setCellContent(model, "C3", "1/1/2022 00:15:00");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("minute");

    setCellContent(model, "C3", "1/1/2022 15:00:00");
    expect(getChartConfiguration(model, chartId).options!.scales!.x!.time!.unit).toEqual("hour");
  });

  test("date chart: empty label with a value is replaced by arbitrary label with no value", () => {
    setFormat(model, "C2:C5", "m/d/yyyy");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    setCellContent(model, "C3", "");
    const data = getChartConfiguration(model, chartId).data;
    expect(data.labels![1]).toEqual("1/17/1900");
    expect(data.datasets![0].data![1]).toEqual({ y: undefined, x: "1/17/1900" });
  });

  test("date chart: rows datasets/labels are supported", () => {
    setGrid(model, { A1: "2", B1: "3", A2: "1", B2: "10" });
    setFormat(model, "B1", "mm/dd/yyyy");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "A2:B2" }],
        labelRange: "A1:B1",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );

    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([
      { y: 1, x: "2" },
      { y: 10, x: "01/02/1900" },
    ]);
    expect(chart.options?.scales?.x?.type).toEqual("time");
  });

  test("linear chart: label 0 isn't set to undefined", () => {
    setCellContent(model, "B2", "0");
    setCellContent(model, "B3", "1");
    setCellContent(model, "C2", "0");
    setCellContent(model, "C3", "1");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B3" }],
        labelRange: "C2:C3",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    const data = getChartConfiguration(model, chartId).data;
    expect(data.labels).toEqual(["0", "1"]);
    expect(data.datasets![0].data).toEqual([
      { y: 0, x: "0" },
      { y: 1, x: "1" },
    ]);
  });

  test("linear chart: empty label with a value is set to undefined instead of empty string", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    setCellContent(model, "C3", "");
    const data = getChartConfiguration(model, chartId).data;
    expect(data.labels![1]).toEqual("");
    expect(data.datasets![0].data![1]).toEqual({ y: 11, x: undefined });
  });

  test("can create linear chart with non-number header in the label range", () => {
    setGrid(model, { A1: "x", A2: "1", B1: "y", B2: "10" });
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        labelsAsText: false,
        dataSetsHaveTitle: true,
      },
      chartId
    );
    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.options?.scales?.x?.type).toEqual("linear");
    expect(chart.data!.labels).toEqual(["1"]);
    expect(chart.data!.datasets![0].data).toEqual([{ y: 10, x: "1" }]);
  });

  test("snapshot test of chartJS configuration for linear chart", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    const chart = model.getters.getChartRuntime(chartId)!;
    expect(chart).toMatchSnapshot();
  });

  test("snapshot test of chartJS configuration for date chart", () => {
    setFormat(model, "C2:C5", "m/d/yyyy");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    const chart = model.getters.getChartRuntime(chartId)!;
    expect(chart).toMatchSnapshot();
  });

  test("font color is white with a dark background color", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B2:B5" }],
        labelRange: "C2:C5",
        background: "#010101",
      },
      chartId
    );
    expect(model.getters.getChartRuntime(chartId)).toMatchSnapshot();
  });

  test("Displays date labels correctly when 'Use row X as labels' is checked", () => {
    setCellContent(model, "A2", "2024-01-01");
    setCellContent(model, "B1", "first dataset");
    setCellContent(model, "B2", "10");

    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        labelsAsText: false,
        dataSetsHaveTitle: true,
      },
      chartId
    );

    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["2024-01-01"]);
  });
});

describe("Chart evaluation", () => {
  test("Chart runtime is correctly updated when a value is changed", () => {
    const model = new Model();
    setCellContent(model, "A2", "group");
    setCellContent(model, "B1", "title");
    setCellContent(model, "B2", "=C3");
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "B1:B2" }],
        dataSetsHaveTitle: true,
        labelRange: "A2",
      },
      "1"
    );
    expect(getChartConfiguration(model, "1").data!.datasets![0]!.data![0]).toBe(0);
    setCellContent(model, "C3", "1");
    expect(getChartConfiguration(model, "1").data!.datasets![0]!.data![0]).toBe(1);
    deleteColumns(model, ["C"]);
    expect(getChartConfiguration(model, "1").data!.datasets.length).toBe(1);
    expect(getChartConfiguration(model, "1").data!.datasets[0].hidden).toBeTruthy();
  });

  test("undo/redo invalidates the chart runtime", () => {
    const chartId = "test";
    setCellContent(model, "A1", "oui");
    setCellContent(model, "A2", "non");
    createChart(model, { type: "bar" }, chartId);

    updateChart(model, chartId, { labelRange: "A1:A2" });
    expect(getChartConfiguration(model, chartId).data?.labels).toEqual(["oui", "non"]);
    undo(model);
    expect(getChartConfiguration(model, chartId).data?.labels).toEqual([]);
    redo(model);
    expect(getChartConfiguration(model, chartId).data?.labels).toEqual(["oui", "non"]);
  });

  describe("hidden col/rows", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            name: "Sheet1",
            colNumber: 10,
            rowNumber: 10,
            rows: {},
            cells: {
              A2: "P1",
              A3: "P2",
              A4: "P3",
              A5: "P4",
              B1: "first column dataset",
              B2: "10",
              B3: "11",
              B4: "12",
              B5: "13",
              C1: "second column dataset",
              C2: "15",
              C3: "16",
              C4: "17",
              C5: "18",
            },
          },
        ],
      });
      createChart(
        model,
        {
          dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
          labelRange: "Sheet1!A2:A5",
          dataSetsHaveTitle: true,
          type: "line",
        },
        "1"
      );
    });

    test("hidden columns are filtered", () => {
      let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeFalsy();
      hideColumns(model, ["C"]);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeTruthy();
      expect(chart.chartJsConfig.data.datasets![0].label).toBe("first column dataset");
      unhideColumns(model, ["C"]);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeFalsy();
    });

    test("folded group of columns are filtered", () => {
      let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeFalsy();
      groupHeaders(model, "COL", 2, 2);
      foldHeaderGroup(model, "COL", 2, 2);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeTruthy();
      expect(chart.chartJsConfig.data.datasets![0].label).toBe("first column dataset");
      unfoldHeaderGroup(model, "COL", 2, 2);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets).toHaveLength(2);
      expect(chart.chartJsConfig.data.datasets[1].hidden).toBeFalsy();
    });

    test("hidden rows are filtered", () => {
      let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
      hideRows(model, [2]);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(3);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P3", "P4"]);
      unhideRows(model, [2]);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
    });

    test("folded groups of rows are filtered", () => {
      let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
      groupHeaders(model, "ROW", 2, 2);
      foldHeaderGroup(model, "ROW", 2, 2);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(3);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P3", "P4"]);
      unfoldHeaderGroup(model, "ROW", 2, 2);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
    });

    test("rows with filtered cell are ignored", () => {
      let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
      createTableWithFilter(model, "A1:C5");
      updateFilter(model, "B3", ["11"]);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(3);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P3", "P4"]);
      updateFilter(model, "B3", []);
      chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(chart.chartJsConfig.data.datasets![0].data?.length).toEqual(4);
      expect(chart.chartJsConfig.data.labels).toEqual(["P1", "P2", "P3", "P4"]);
    });

    test("configuration is synchronized between the definition the runtime", () => {
      updateChart(model, "1", {
        dataSets: [
          { dataRange: "B2:B5", label: "first", backgroundColor: "#123456" },
          { dataRange: "C2:C5", label: "second", backgroundColor: "#222222" },
        ],
      });
      const definition = model.getters.getChartDefinition("1") as LineChartDefinition;
      let runtime = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(runtime.chartJsConfig.data.datasets).toHaveLength(2);
      hideColumns(model, ["B"]);
      runtime = model.getters.getChartRuntime("1")! as LineChartRuntime;
      expect(runtime.chartJsConfig.data.datasets).toHaveLength(2);
      expect(runtime.chartJsConfig.data.datasets![0].label).toEqual(definition.dataSets![0].label);
      expect(runtime.chartJsConfig.data.datasets![1].label).toEqual(definition.dataSets![1].label);
      expect(runtime.chartJsConfig.data.datasets![0].backgroundColor).toEqual(
        definition.dataSets![0].backgroundColor
      );
      expect(runtime.chartJsConfig.data.datasets![1].backgroundColor).toEqual(
        definition.dataSets![1].backgroundColor
      );
    });
  });

  test("hidden labels are replaced by numbers", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A2: "P1",
            A3: "P2",
            A4: "P3",
            A5: "P4",
            B1: "first column dataset",
            B2: "10",
            B3: "11",
            B4: "12",
            B5: "13",
            C1: "second column dataset",
            C2: "15",
            C3: "16",
            C4: "17",
            C5: "18",
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B5" }, { dataRange: "Sheet1!C1:C5" }],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    let chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
    expect(chart.chartJsConfig.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
    hideColumns(model, ["A"]);
    chart = model.getters.getChartRuntime("1")! as LineChartRuntime;
    expect(chart.chartJsConfig.data!.labels).toEqual(["0", "1", "2", "3"]);
  });
});

describe("Cumulative Data line chart", () => {
  test("Chart to display cumulative data", () => {
    setCellContent(model, "A7", "random label");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B8" }],
        dataSetsHaveTitle: true,
        labelRange: "A2:A8",
        type: "line",
        cumulative: false,
      },
      "1"
    );

    const chartData = getChartConfiguration(model, "1").data!.datasets![0].data;
    const initialData = [11, 12, 13, null, 30]; // null if for the non-number value with a label
    const expectedCumulativeData = [11, 23, 36, null, 66];

    expect(chartData).toEqual(initialData);

    updateChart(model, "1", { cumulative: true });
    const updatedChartData = getChartConfiguration(model, "1").data!.datasets![0].data;
    expect(updatedChartData).toEqual(expectedCumulativeData);
  });

  test("Cumulative data with linear chart", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "B1", "10");
    setCellContent(model, "B2", "20");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        dataSetsHaveTitle: false,
        labelRange: "A1:A2",
        type: "line",
        cumulative: true,
      },
      "chartId"
    );

    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;
    expect(runtime.chartJsConfig.data!.datasets![0].data).toEqual([
      { x: "1", y: 10 },
      { x: "2", y: 30 },
    ]);
  });
});

describe("Pie chart invalid values", () => {
  test("Pie chart to exclude negative values and labels in single dataset", () => {
    setCellContent(model, "D6", "-23");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "D5:D10" }],
        labelRange: "A2:A6",
        type: "pie",
      },
      "1"
    );
    const expectedData = [32, 42]; // -23 is filtered out from dataset
    const expectedLabels = ["P3", "P4"];

    const data = getChartConfiguration(model, "1").data;

    expect(data.datasets[0].data).toEqual(expectedData);
    expect(data.labels).toEqual(expectedLabels);
  });

  test("Pie chart to replace negative values with 0 in multiple dataset", () => {
    setCellContent(model, "D6", "-23");
    setCellContent(model, "D8", "-3");
    createChart(
      model,
      {
        dataSets: [{ dataRange: "D5:D9" }, { dataRange: "B1:B5" }],
        labelRange: "A2:A6",
        type: "pie",
      },
      "1"
    );
    const expectedData = [null, null, null, 42]; // negative & non-number values are replaced by null
    const expectedLabels = ["P2", "P3", "P4", ""];

    const data = getChartConfiguration(model, "1").data;

    expect(data.datasets[0].data).toEqual(expectedData);
    expect(data.datasets[1].data).toEqual([10, 11, 12, 13]);
    expect(data.labels).toEqual(expectedLabels);
  });

  test("Zeros values are removed from the pie chart", () => {
    setCellContent(model, "F6", "0");
    setCellContent(model, "F8", "3");
    createChart(model, { dataSets: [{ dataRange: "F5:F8" }], type: "pie" }, "1");

    const data = getChartConfiguration(model, "1").data;
    expect(data.datasets[0].data).toEqual([3]);
  });

  test("Non-number values are removed from the pie chart", () => {
    setCellContent(model, "F6", "Not a number");
    setCellContent(model, "F7", "45");
    setCellContent(model, "G8", "Label");
    setCellContent(model, "F8", "Not a number, but has a label");
    createChart(
      model,
      { dataSets: [{ dataRange: "F5:F8" }], labelRange: "G5:G8", type: "pie" },
      "1"
    );

    const data = getChartConfiguration(model, "1").data;
    // In pie charts we want to remove non-number values even if they have a label, because they won't show on the pie
    // but will pollute the legend
    expect(data.datasets[0].data).toEqual([45]);
  });
});

test("Duplicating a sheet dispatches CREATE_CHART for each chart", () => {
  createChart(
    model,
    {
      dataSets: [{ dataRange: "D5:D10" }, { dataRange: "E5:E10" }],
      type: "bar",
    },
    "24"
  );
  createChart(
    model,
    {
      dataSets: [{ dataRange: "D5:D10" }, { dataRange: "E5:E10" }],
      type: "line",
    },
    "25"
  );
  const chartPlugin = getPlugin(model, ChartPlugin);
  // @ts-ignore
  const spyChartDispatch = jest.spyOn(chartPlugin, "dispatch");

  const figurePlugin = getPlugin(model, FigurePlugin);
  // @ts-ignore
  const spyFigureDispatch = jest.spyOn(figurePlugin, "dispatch");

  const sheetId = model.getters.getActiveSheetId();
  model.dispatch("DUPLICATE_SHEET", {
    sheetId,
    sheetIdTo: "copyOf" + sheetId,
    sheetNameTo: "Copy of Sheet1",
  });
  expect(spyChartDispatch).toHaveBeenNthCalledWith(1, "CREATE_CHART", expect.any(Object));
  expect(spyChartDispatch).toHaveBeenNthCalledWith(2, "CREATE_CHART", expect.any(Object));

  expect(spyFigureDispatch).toHaveBeenNthCalledWith(1, "CREATE_FIGURE", expect.any(Object));
  expect(spyFigureDispatch).toHaveBeenNthCalledWith(2, "CREATE_FIGURE", expect.any(Object));
});

test("trend line dataset are put after original dataset in the runtime", async () => {
  createChart(
    model,
    {
      dataSets: [
        {
          dataRange: "B1:B4",
          label: "serie_1",
          trend: {
            type: "polynomial",
            order: 3,
            display: true,
          },
        },
        {
          dataRange: "C1:C4",
          label: "serie_2",
          trend: {
            type: "polynomial",
            order: 3,
            display: true,
          },
        },
      ],
      labelRange: "A1:A4",
      type: "line",
      dataSetsHaveTitle: false,
    },
    "1"
  );
  const datasets = getChartConfiguration(model, "1").data.datasets;
  expect(datasets.length).toEqual(4);
  expect(datasets[0]).toMatchObject({ label: "serie_1" });
  expect(datasets[1]).toMatchObject({ label: "serie_2" });
});

describe("trending line", () => {
  beforeEach(() => {
    setGrid(model, {
      B1: "1",
      C1: "1",
      B2: "4",
      C2: "2",
      B3: "9",
      C3: "3",
      B4: "16",
      C4: "4",
      B5: "36",
      C5: "6",
    });
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B5", trend: { display: true, type: "polynomial", order: 2 } }],
        labelRange: "C1:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      "1"
    );
  });

  test("trend line works with numerical values as labels", () => {
    const step = (6 - 1) / 25;
    const data = getChartConfiguration(model, "1").data.datasets[1].data;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("trend line works with datetime values as labels", () => {
    setFormat(model, "C1:C5", "m/d/yyyy");
    mockChart();
    const step = (6 - 1) / 25;
    const data = getChartConfiguration(model, "1").data.datasets[1].data;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("trend line works with categorical values as labels", () => {
    const step = (6 - 1) / 25;
    const data = getChartConfiguration(model, "1").data.datasets[1].data;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("empty labels are correctly predicted", () => {
    // prettier-ignore
    setGrid(model, {
      B6:  "", C6:  "6",
      B7:  "", C7:  "7",
      B8:  "", C8:  "8",
      B9:  "", C9:  "9",
      B10: "", C10: "10",
    });
    updateChart(model, "1", {
      dataSets: [{ dataRange: "B1:B10", trend: { display: true, type: "polynomial", order: 2 } }],
      labelRange: "C1:C10",
    });
    const step = (10 - 1) / 50;
    const data = getChartConfiguration(model, "1").data.datasets[1].data;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("non-invertible matrix doesn't throw error", () => {
    // prettier-ignore
    setGrid(model, {
      A1: "label",
      A2: "0",
      A3: "1",
    });
    updateChart(model, "1", {
      dataSets: [{ dataRange: "A1:A3", trend: { display: true, type: "polynomial", order: 2 } }],
    });
    const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[1].data.every((x) => isNaN(Number(x)))).toBeTruthy();
  });

  test("trend line works with real date values as labels", () => {
    setGrid(model, {
      B1: "1",
      C1: "1/7/2024",
      B2: "4",
      C2: "1/8/2024",
      B3: "9",
      C3: "1/9/2024",
      B4: "16",
      C4: "1/10/2024",
      B5: "36",
      C5: "1/12/2024",
    });
    const step = (6 - 1) / 25;
    const data = getChartConfiguration(model, "1").data.datasets[1].data;
    const initialValue = toNumber("1/7/2024", model.getters.getLocale()) - 1;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(initialValue + expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("trend line is bypassed without sufficient dataset values", () => {
    const model = new Model();
    setCellContent(model, "A1", "test");
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "A1", trend: { type: "polynomial", order: 1, display: true } }],
        fillArea: true,
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    let runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;
    expect(runtime.chartJsConfig.data.datasets).toHaveLength(1);
    setCellContent(model, "A1", "5");
    runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;
    expect(runtime.chartJsConfig.data.datasets).toHaveLength(1);
  });

  test("trend line ignores invalid input data", () => {
    const grid = {
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "4",
      B1: "1",
      B2: "not a number",
      B3: "9",
      B4: "16",
    };
    const model = createModelFromGrid(grid);
    createChart(
      model,
      {
        type: "line",
        dataSets: [{ dataRange: "B1:B4", trend: { type: "polynomial", order: 2, display: true } }],
        labelRange: "A1:A4",
        fillArea: true,
        dataSetsHaveTitle: false,
      },
      "chartId"
    );
    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;
    const data = runtime.chartJsConfig.data.datasets[1]?.data;
    const step = (4 - 1) / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const value = data[i] as Point;
      const expectedLabel = 1 + i * step;
      const expectedValue = Math.pow(expectedLabel, 2);
      expect(value.x).toEqual(expectedLabel);
      expect(value.y).toBeCloseTo(expectedValue);
    }
  });

  test("Trend line dataset is correctly styled", () => {
    let runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[1]).toMatchObject({
      label: "Trend line for Series 1",
      borderColor: "#A6D4F8",
      pointBackgroundColor: "#A6D4F8",
      fill: false,
      pointRadius: 0,
    });

    updateChart(model, "1", {
      dataSets: [
        {
          dataRange: "B1:B10",
          trend: { display: true, type: "polynomial", order: 2, color: "#FF0000" },
        },
      ],
    });

    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    expect(runtime.chartJsConfig.data.datasets[1]).toMatchObject({
      label: "Trend line for Series 1",
      borderColor: "#FF0000",
      pointBackgroundColor: "#FF0000",
      fill: false,
      pointRadius: 0,
    });
  });
});

test("moving average trend line", () => {
  // prettier-ignore
  setGrid(model, {
      B1: "Label 1", C1: "1",
      B2: "Label 2", C2: "2",
      B3: "Label 3", C3: "3",
      B4: "Label 4", C4: "4",
      B5: "Label 5", C5: "5",
    });
  createChart(
    model,
    {
      type: "line",
      dataSets: [
        { dataRange: "C1:C5", trend: { display: true, type: "trailingMovingAverage", window: 3 } },
      ],
      labelRange: "B1:B5",
      labelsAsText: false,
      dataSetsHaveTitle: false,
    },
    "1"
  );
  let runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
  expect(runtime.chartJsConfig.data.datasets[1].data).toEqual([
    { x: 1, y: NaN },
    { x: 2, y: NaN },
    { x: 3, y: 2 },
    { x: 4, y: 3 },
    { x: 5, y: 4 },
  ]);
  updateChart(model, "1", {
    dataSets: [
      { dataRange: "C1:C5", trend: { display: true, type: "trailingMovingAverage", window: 2 } },
    ],
  });
  runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
  expect(runtime.chartJsConfig.data.datasets[1].data).toEqual([
    { x: 1, y: NaN },
    { x: 2, y: 1.5 },
    { x: 3, y: 2.5 },
    { x: 4, y: 3.5 },
    { x: 5, y: 4.5 },
  ]);
});

describe("Chart labels truncation", () => {
  test.each(["bar", "line", "combo", "radar"] as const)(
    "chart %s labels are not truncated in the data",
    (type) => {
      const model = new Model();
      const longLabel = "This is a very long label name that should not be truncated";
      setCellContent(model, "A2", longLabel);
      setCellContent(model, "B2", "10");

      createChart(
        model,
        { type, dataSets: [{ dataRange: "B1:B2" }], labelRange: "A1:A2" },
        "chartId"
      );

      expect(getChartConfiguration(model, "chartId").data!.labels).toEqual([longLabel]);
    }
  );

  test("Moving average trend line dataset uses the right axis when combined with other datasets", () => {
    mockChart(); // mock chart.js with luxon time adapter installed
    // prettier-ignore
    setGrid(model, {
      A1: "A", B1: "=DATE(2025,1,1)", C1: "1", D1: "4",
      A2: "B", B2: "=DATE(2025,1,2)", C2: "4", D2: "12",
      A3: "C", B3: "=DATE(2025,1,3)", C3: "9", D3: "34",
      A4: "D", B4: "=DATE(2025,1,4)", C4: "16", D4: "45",
      A5: "E", B5: "=DATE(2025,1,5)", C5: "36", D5: "51",
    });
    setFormat(model, "B1:B5", "m/d/yyyy hh:mm:ss a");
    // Line chart with date labels
    createChart(
      model,
      {
        type: "line",
        dataSets: [
          { dataRange: "C1:C5", trend: { display: true, type: "polynomial", order: 1 } },
          {
            dataRange: "D1:D5",
            trend: { display: true, type: "trailingMovingAverage", window: 3 },
          },
        ],
        labelRange: "B1:B5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      "1"
    );
    let runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    let scales = getChartConfiguration(model, "1").options.scales;
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(false);
    expect(scales.xMovingAverage!["type"]).toEqual("category");

    // Line chart with numerical labels
    updateChart(model, "1", {
      labelRange: "C1:C5",
    });
    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(false);
    expect(scales.xMovingAverage!["type"]).toEqual("category");

    // Line chart with categorical labels
    updateChart(model, "1", {
      labelRange: "A1:A5",
    });
    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(false);
    expect(scales.xMovingAverage!["type"]).toEqual("category");

    // Bar chart with date labels
    updateChart(model, "1", {
      type: "bar",
      labelRange: "B1:B5",
    });
    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    scales = getChartConfiguration(model, "1").options.scales;
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(true);

    // Bar chart with numerical labels
    updateChart(model, "1", {
      labelRange: "C1:C5",
    });
    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(true);

    // Bar chart with categorical labels
    updateChart(model, "1", {
      labelRange: "A1:A5",
    });
    runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    // @ts-ignore
    expect(runtime.chartJsConfig.data.datasets[3].xAxisID).toEqual("xMovingAverage");
    expect(scales.xMovingAverage!["display"]).toEqual(false);
    expect(scales.xMovingAverage!["offset"]).toEqual(true);
  });

  test.each(["bar", "line", "combo", "radar"] as const)(
    "long labels are truncated in %s chart legends",
    (type) => {
      const model = new Model();
      setCellContent(model, "B1", "This is a very long dataset name that should be truncated");
      setCellContent(model, "B2", "10");

      createChart(
        model,
        { type, dataSets: [{ dataRange: "B1:B2" }], dataSetsHaveTitle: true },
        "chartId"
      );

      expect(getChartLegendLabels(model, "chartId")).toMatchObject([
        { text: "This is a very long …" },
      ]);
    }
  );

  test.each(["bar", "line", "combo"] as const)(
    "long labels are truncated in %s chart X axis ticks",
    (type) => {
      const model = new Model();
      const longLabel = "This is a very long label name that should not be truncated";
      setCellContent(model, "A2", longLabel);
      setCellContent(model, "B2", "10");
      setCellContent(model, "A3", "shortLabel");
      setCellContent(model, "B3", "20");

      createChart(
        model,
        { type, dataSets: [{ dataRange: "B1:B3" }], labelRange: "A1:A3" },
        "chartId"
      );

      expect(getCategoryAxisTickLabels(model, "chartId")).toMatchObject([
        "This is a very long …",
        "shortLabel",
      ]);
    }
  );
});

test.each(["line", "bar", "pyramid", "pie", "combo", "waterfall", "scatter"] as const)(
  "Chart %s use custom tooltip instead of default ChartJS one",
  (chartType) => {
    createChart(model, { type: chartType }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as LineChartRuntime;
    expect(runtime.chartJsConfig.options!.plugins!.tooltip!.external).toBeDefined();
    expect(runtime.chartJsConfig.options!.plugins!.tooltip!.enabled).toBe(false);
  }
);

test("logarithmic trending line", () => {
  // prettier-ignore
  setGrid(model, {
      B1: "12", C1: "=LN(B1)",
      B2: "16", C2: "=LN(B2)",
      B3: "19", C3: "=LN(B3)",
      B4: "23", C4: "=LN(B4)",
      B5: "29", C5: "=LN(B5)",
      B6: "32", C6: "=LN(B6)",
      B7: "45", C7: "=LN(B7)",
      B8: "64", C8: "=LN(B8)",
    });
  createChart(
    model,
    {
      type: "scatter",
      dataSets: [{ dataRange: "C1:C8", trend: { display: true, type: "logarithmic" } }],
      labelRange: "B1:B8",
      labelsAsText: false,
      dataSetsHaveTitle: false,
    },
    "1"
  );
  function roundToFourDecimals(value) {
    return Math.round(value * 10000) / 10000;
  }
  const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
  // We round up to 4 decimals to avoid floating point errors
  expect(
    // @ts-ignore
    runtime.chartJsConfig.data.datasets[1].data.map((item) => roundToFourDecimals(item.x))
  ).toEqual([
    12, 13.3, 14.6, 15.9, 17.2, 18.5, 19.8, 21.1, 22.4, 23.7, 25, 26.3, 27.6, 28.9, 30.2, 31.5,
    32.8, 34.1, 35.4, 36.7, 38, 39.3, 40.6, 41.9, 43.2, 44.5, 45.8, 47.1, 48.4, 49.7, 51, 52.3,
    53.6, 54.9, 56.2, 57.5, 58.8, 60.1, 61.4, 62.7, 64,
  ]);
});

test("logarithmic trending line with negative values", () => {
  // prettier-ignore
  setGrid(model, {
      B1: "2", C1: "-12",
      B2: "3", C2: "-10",
      B3: "4", C3: "-7",
      B4: "5", C4: "-2",
      B5: "6", C5: "0",
      B6: "7", C6: "17",
      B7: "8", C7: "26",
      B8: "9", C8: "33",
    });
  createChart(
    model,
    {
      type: "scatter",
      dataSets: [{ dataRange: "C1:C8", trend: { display: true, type: "logarithmic" } }],
      labelRange: "B1:B8",
      labelsAsText: false,
      dataSetsHaveTitle: false,
    },
    "1"
  );
  function roundToFourDecimals(value) {
    return Math.round(value * 10000) / 10000;
  }
  const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
  // We round up to 4 decimals to avoid floating point errors
  expect(
    // @ts-ignore
    runtime.chartJsConfig.data.datasets[1].data.map((item) => roundToFourDecimals(item.x))
  ).toEqual([
    2, 2.175, 2.35, 2.525, 2.7, 2.875, 3.05, 3.225, 3.4, 3.575, 3.75, 3.925, 4.1, 4.275, 4.45,
    4.625, 4.8, 4.975, 5.15, 5.325, 5.5, 5.675, 5.85, 6.025, 6.2, 6.375, 6.55, 6.725, 6.9, 7.075,
    7.25, 7.425, 7.6, 7.775, 7.95, 8.125, 8.3, 8.475, 8.65, 8.825, 9,
  ]);
});

test("logarithmic trending line with values between 0 and 1", () => {
  // prettier-ignore
  setGrid(model, {
      B1: "0.25", C1: "=LN(B1)",
      B2: "0.3",  C2: "=LN(B2)",
      B3: "0.35", C3: "=LN(B3)",
      B4: "0.4",  C4: "=LN(B4",
      B5: "0.45", C5: "=LN(B5)",
      B6: "0.5",  C6: "=LN(B6)",
      B7: "0.6",  C7: "=LN(B7)",
      B8: "0.75", C8: "=LN(B8)",
    });
  createChart(
    model,
    {
      type: "scatter",
      dataSets: [{ dataRange: "C1:C8", trend: { display: true, type: "logarithmic" } }],
      labelRange: "B1:B8",
      labelsAsText: false,
      dataSetsHaveTitle: false,
    },
    "1"
  );
  function roundToFourDecimals(value) {
    return Math.round(value * 10000) / 10000;
  }
  const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
  // We round up to 4 decimals to avoid floating point errors
  expect(
    // @ts-ignore
    runtime.chartJsConfig.data.datasets[1].data.map((item) => roundToFourDecimals(item.x))
  ).toEqual([
    0.25, 0.2625, 0.275, 0.2875, 0.3, 0.3125, 0.325, 0.3375, 0.35, 0.3625, 0.375, 0.3875, 0.4,
    0.4125, 0.425, 0.4375, 0.45, 0.4625, 0.475, 0.4875, 0.5, 0.5125, 0.525, 0.5375, 0.55, 0.5625,
    0.575, 0.5875, 0.6, 0.6125, 0.625, 0.6375, 0.65, 0.6625, 0.675, 0.6875, 0.7, 0.7125, 0.725,
    0.7375, 0.75,
  ]);
});

describe("Can make numbers human-readable", () => {
  test.each(["bar", "combo"] as const)(
    "Humanization is taken into account for the axis ticks of a %s chart",
    async (type: "bar" | "combo") => {
      createChart(
        model,
        {
          type,
          labelRange: "A2",
          dataSets: [{ dataRange: "B2" }],
          humanize: false,
        },
        "1"
      );
      let axis = getChartConfiguration(model, "1").options.scales.y;
      const valuesBefore = [1e3, 1e6].map(axis.ticks.callback);
      expect(valuesBefore).toEqual(["1,000", "1,000,000"]);
      updateChart(model, "1", { humanize: true });
      axis = getChartConfiguration(model, "1").options.scales.y;
      const valuesAfter = [1e3, 1e6].map(axis.ticks.callback);
      expect(valuesAfter).toEqual(["1,000", "1,000k"]);
    }
  );

  test.each(["line", "scatter"] as const)(
    "Humanization is taken into account for the axis ticks of a %s chart",
    async (type: "line" | "scatter") => {
      createChart(
        model,
        {
          type,
          labelRange: "A2",
          dataSets: [{ dataRange: "B2" }],
          humanize: false,
        },
        "1"
      );
      let axis = getChartConfiguration(model, "1").options.scales.y;
      const valuesBefore = [1e3, 1e6].map(axis.ticks.callback);
      expect(valuesBefore).toEqual(["1,000", "1,000,000"]);
      updateChart(model, "1", { humanize: true });
      axis = getChartConfiguration(model, "1").options.scales.y;
      const valuesAfter = [1e3, 1e6].map(axis.ticks.callback);
      expect(valuesAfter).toEqual(["1,000", "1,000k"]);
    }
  );

  test.each(["line", "bar", "scatter", "combo"] as const)(
    "%s chart showValues plugin takes humanization into account",
    async (type: ChartWithAxisDefinition["type"]) => {
      createChart(
        model,
        {
          type,
          labelRange: "A2",
          dataSets: [{ dataRange: "B2" }],
          humanize: false,
        },
        "1"
      );
      let plugin = getChartConfiguration(model, "1").options?.plugins?.chartShowValuesPlugin;
      const datasetMeta = { index: 0, xAxisID: "x", yAxisID: "y" };
      const valuesBefore = [1e3, 1e6].map((v, index) => plugin.callback(v, datasetMeta, index));
      expect(valuesBefore).toEqual(["1,000", "1,000,000"]);
      updateChart(model, "1", { humanize: true });
      plugin = getChartConfiguration(model, "1").options?.plugins?.chartShowValuesPlugin;
      const valuesAfter = [1e3, 1e6].map((v, index) => plugin.callback(v, datasetMeta, index));
      expect(valuesAfter).toEqual(["1,000", "1,000k"]);
    }
  );
});
