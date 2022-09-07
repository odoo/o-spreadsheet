import { Model } from "../../../src";
import { ChartTerms } from "../../../src/components/translations_terms";
import { BarChart } from "../../../src/helpers/charts";
import { toZone, zoneToXc } from "../../../src/helpers/zones";
import { BorderCommand, CommandResult } from "../../../src/types";
import { BarChartDefinition, BarChartRuntime } from "../../../src/types/chart/bar_chart";
import { LineChartDefinition, LineChartRuntime } from "../../../src/types/chart/line_chart";
import { PieChartRuntime } from "../../../src/types/chart/pie_chart";
import {
  activateSheet,
  addColumns,
  addRows,
  createChart,
  createSheet,
  createSheetWithName,
  deleteColumns,
  deleteRows,
  deleteSheet,
  redo,
  selectCell,
  setCellContent,
  setCellFormat,
  undo,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { nextTick, target } from "../../test_helpers/helpers";
jest.mock("../../../src/helpers/uuid", () => require("../../__mocks__/uuid"));

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
          A2: { content: "P1" },
          A3: { content: "P2" },
          A4: { content: "P3" },
          A5: { content: "P4" },
          B1: { content: "first column dataset" },
          B2: { content: "10" },
          B3: { content: "11" },
          B4: { content: "12" },
          B5: { content: "13" },
          C1: { content: "second column dataset" },
          C2: { content: "20" },
          C3: { content: "19" },
          C4: { content: "18" },
          C5: { content: "17" },

          A8: { content: "first row dataset" },
          A9: { content: "second row dataset" },
          B7: { content: "P4" },
          C7: { content: "P5" },
          D7: { content: "P6" },
          B8: { content: "30" },
          C8: { content: "31" },
          D8: { content: "32" },
          B9: { content: "40" },
          C9: { content: "41" },
          D9: { content: "42" },
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
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B1:B4", "C1:C4"],
      labelRange: "Sheet1!A2:A4",
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with rectangle dataset", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B1:B4", "C1:C4"],
      labelRange: "Sheet1!A2:A4",
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with column datasets without series title", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B2:B4", "Sheet1!C2:C4"],
        labelRange: "A2:A4",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B2:B4", "C2:C4"],
      labelRange: "A2:A4",
      dataSetsHaveTitle: false,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets", () => {
    createChart(
      model,
      {
        dataSets: ["A8:D8", "A9:D9"],
        labelRange: "B7:D7",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["A8:D8", "A9:D9"],
      labelRange: "B7:D7",
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with full rows/columns datasets", () => {
    createChart(
      model,
      {
        dataSets: ["8:8", "A:B"],
        type: "line",
      },
      "1"
    );
    expect((model.getters.getChartDefinition("1") as LineChartDefinition)?.dataSets).toMatchObject([
      "8:8",
      "A:A",
      "B:B",
    ]);
  });

  test("create chart with row datasets without series title", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B8:D8", "Sheet1!B9:D9"],
        labelRange: "B7:D7",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B8:D8", "B9:D9"],
      labelRange: "B7:D7",
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with only the dataset title (no data)", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B8"],
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [],
      labelRange: "Sheet1!B7:D7",
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with a dataset of one cell (no title)", () => {
    createChart(
      model,
      {
        dataSets: ["B8"],
        dataSetsHaveTitle: false,
        labelRange: "B7",
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B8"],
      dataSetsHaveTitle: false,
      labelRange: "B7",
      title: "test",
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
        dataSets: ["B1"],
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B1"],
      type: "line",
    });
    const runtime = model.getters.getChartRuntime("1") as LineChartRuntime;
    expect(runtime.chartJsConfig.data?.datasets?.[0].data).toEqual([0]);
  });

  test("create a chart with stacked bar", () => {
    createChart(
      model,
      {
        dataSets: ["B7:B8"],
        labelRange: "B7",
        type: "bar",
        stackedBar: true,
      },
      "1"
    );
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("ranges in definition change automatically", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    addColumns(model, "before", "A", 2);
    const chart = model.getters.getChartDefinition("1") as LineChartDefinition;
    expect(chart.dataSets[0]).toStrictEqual("D1:D4");
    expect(chart.dataSets[1]).toStrictEqual("E1:E4");
    expect(chart.labelRange).toStrictEqual("Sheet1!C2:C4");
  });

  test("pie chart tooltip title display the correct dataset", () => {
    createChart(
      model,
      { dataSets: ["B7:B8"], dataSetsHaveTitle: true, labelRange: "B7", type: "pie" },
      "1"
    );
    const title = (model.getters.getChartRuntime("1") as PieChartRuntime).chartJsConfig!.options!
      .tooltips!.callbacks!.title!;
    const chartData = { datasets: [{ label: "dataset 1" }, { label: "dataset 2" }] };
    expect(title([{ datasetIndex: 0 }], chartData)).toBe("dataset 1");
    expect(title([{ datasetIndex: 1 }], chartData)).toBe("dataset 2");
  });

  test.each(["bar", "line"] as const)("chart %s tooltip title is not dynamic", (chartType) => {
    createChart(
      model,
      { dataSets: ["B7:B8"], dataSetsHaveTitle: true, labelRange: "B7", type: chartType },
      "1"
    );
    const title = (model.getters.getChartRuntime("1") as BarChartRuntime | LineChartRuntime)
      ?.chartJsConfig?.options?.tooltips?.callbacks?.title;
    expect(title).toBeUndefined();
  });

  test("can delete an imported chart", () => {
    createChart(
      model,
      {
        dataSets: ["B7:B8"],
        labelRange: "B7",
        type: "line",
      },
      "1"
    );
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures()).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1")).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", { sheetId: model.getters.getActiveSheetId(), id: "1" });
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(() => newModel.getters.getChartRuntime("1")).toThrow();
  });

  test("update dataset of imported chart", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const newModel = new Model(model.exportData());
    let chart = (newModel.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(newModel, "B2", "99");
    chart = (newModel.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });

  test("update existing chart", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    let chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.type).toEqual("line");
    updateChart(model, "1", {
      type: "bar",
      dataSets: ["Sheet1!A8:D8", "Sheet1!A9:D9"],
      labelRange: "Sheet1!C7:D7",
      dataSetsHaveTitle: true,
      title: "hello1",
    });
    chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["A8:D8", "A9:D9"],
      labelRange: "Sheet1!C7:D7",
      title: "hello1",
      type: "bar",
    });
    expect(chart.data!.datasets![0].data).toEqual([30, 31, 32]);
    expect(chart.data!.datasets![1].data).toEqual([40, 41, 42]);
    expect(chart.type).toEqual("bar");
  });

  test("remove labels from existing chart", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!A8:D8"],
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
        dataSets: ["Sheet1!A8:D8"],
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
        dataSets: ["Sheet1!A8:D8"],
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
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["B"]);
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([20, 19, 18]);
    expect(chart.data!.datasets![1]).toBe(undefined);
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3"]);
  });

  test("delete a data set labels column", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["A"]);
    // dataset in col B becomes labels in col A
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["0", "1", "2"]);
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chart.data!.labels).toEqual(["0", "1", "2"]);
  });

  test("delete last row of dataset", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteRows(model, [4]);
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3"]);
  });

  test("delete last col of dataset", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["C"]);
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(chart.data!.datasets![1]).toBeUndefined();
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("add row in dataset", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    addRows(model, "before", 2, 1);
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18, 17]);
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Add a row on another sheet does not affect a chart", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!A8:D8"],
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
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    deleteRows(model, [1, 2, 3, 4]);
    const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets).toHaveLength(0);
    expect(chart.data!.labels).toEqual([]);
  });

  test("update dataset cell updates chart runtime", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    let chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![0].label).toEqual("first column dataset");
    setCellContent(model, "B2", "99");
    setCellContent(model, "B1", "new dataset label");
    chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
    expect(chart.data!.datasets![0].label).toEqual("new dataset label");
  });

  test("create chart with invalid dataset", () => {
    const result = createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "this is invalid"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidDataSet);
  });

  test("chart is focused after creation and update", () => {
    const chartId = "1234";
    createChart(
      model,
      {
        dataSets: ["B1:B4"],
        labelRange: "A2:A4",
      },
      chartId
    );
    expect(model.getters.getSelectedFigureId()).toBeNull();
    model.dispatch("SELECT_FIGURE", { id: chartId });
    expect(model.getters.getSelectedFigureId()).toBe(chartId);
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBeNull();
    updateChart(model, chartId, {
      dataSets: ["B1:B4"],
      labelRange: "A2:A4",
      title: "updated chart",
    });
    expect(model.getters.getSelectedFigureId()).toBe(chartId);
  });

  test("create chart with invalid labels", () => {
    const result = createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4"],
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
        dataSets: ["Coucou!B1:B4", "Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: ["B1:B4"],
      labelRange: "Sheet1!A2:A4",
      title: "test",
      type: "bar",
    });
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.type).toEqual("bar");
  });

  test("create chart with empty labels", () => {
    const result = createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!B1:B4"],
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
          dataSets: ["Sheet1!B1:B4", "Sheet1!B1:B4"],
          labelRange: "",
        },
        "1"
      );
      expect(
        updateChart(model, "1", {
          dataSets: invalidDataset,
        })
      ).toBeCancelledBecause(CommandResult.InvalidDataSet);
    }
  );

  test("update chart with invalid labels", () => {
    createChart(
      model,
      {
        dataSets: ["A1:A2"],
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
          cells: { B1: 0, B2: 1 },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: ["B1:B2"],
        labelRange: "A1:A2",
      },
      "1",
      "2"
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "1",
      sheetIdTo: "SheetNoFigure",
    });
    activateSheet(model, "SheetNoFigure");
    expect(model.getters.getVisibleFigures()).toEqual([]);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "2",
      sheetIdTo: "SheetWithFigure",
    });
    activateSheet(model, "2");
    const { x, y, height, width, tag } = model.getters.getVisibleFigures()[0];
    activateSheet(model, "SheetWithFigure");
    expect(model.getters.getVisibleFigures()).toMatchObject([{ x, y, height, width, tag }]);
  });
  test("extend data source to new values manually", () => {
    createChart(
      model,
      {
        dataSets: ["A1:A2"],
        labelRange: "A1",
      },
      "1"
    );
    updateChart(model, "1", {
      dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
      labelRange: "Sheet1!A2:A5",
      dataSetsHaveTitle: true,
    });
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18, 17]);
  });
  test("extend data set labels to new values manually", () => {
    createChart(
      model,
      {
        dataSets: ["A1:A2"],
        labelRange: "A1",
        dataSetsHaveTitle: true,
      },
      "1"
    );
    updateChart(model, "1", {
      dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
      labelRange: "Sheet1!A2:A5",
      dataSetsHaveTitle: true,
    });
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });

  test("Chart is deleted on sheet deletion", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "2", position: 1 });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1",
      "2"
    );
    expect(model.getters.getChartRuntime("1")).not.toBeUndefined();
    model.dispatch("DELETE_SHEET", { sheetId: "2" });
    expect(() => model.getters.getChartRuntime("1")).toThrow();
  });

  test("Chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    const dataSets = ["B1:B4", "C1:C4"];

    createChart(
      model,
      {
        dataSets,
        labelRange: "A2:A4",
      },
      firstSheetId
    );
    const figure = model.getters.getFigures(firstSheetId)[0]!;
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: secondSheetId,
      sheetId: firstSheetId,
    });

    expect(model.getters.getFigures(secondSheetId)).toHaveLength(1);
    const duplicatedFigure = model.getters.getFigures(secondSheetId)[0];
    const newChart = model.getters.getChart(duplicatedFigure.id) as BarChart;

    expect(newChart.labelRange?.sheetId).toEqual(secondSheetId);
    expect(zoneToXc(newChart.labelRange!.zone)).toEqual("A2:A4");

    newChart.dataSets?.map((ds, index) => {
      expect(ds.dataRange.sheetId).toEqual(secondSheetId);
      expect(zoneToXc(ds.dataRange.zone)).toEqual(dataSets[index]);
    });

    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);

    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
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
        dataSets: [`${secondSheetName}!C1:C4`],
        labelRange: `${secondSheetName}!A2:A4`,
      },
      firstSheetId
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: thirdSheetId,
      sheetId: firstSheetId,
    });
    const duplicatedFigure = model.getters.getFigures(thirdSheetId)[0];
    const duplicatedChartDefinition = model.getters.getChartDefinition(duplicatedFigure.id);
    expect(duplicatedChartDefinition).toMatchObject({
      dataSets: [`${secondSheetName}!C1:C4`],
      labelRange: `${secondSheetName}!A2:A4`,
      title: "test",
    });
  });

  test("Chart on columns deletion", () => {
    createChart(
      model,
      {
        dataSets: ["B1:B4", "C1:C4"],
        labelRange: "A2:A4",
        type: "line",
      },
      "1"
    );
    deleteColumns(model, ["A", "B"]);
    const def = model.getters.getChartDefinition("1") as LineChartDefinition;
    expect(def.dataSets).toHaveLength(1);
    expect(def.dataSets[0]).toEqual("A1:A4");
    expect(def.labelRange).toBeUndefined();
  });
});

describe("title", function () {
  test("change title manually", () => {
    createChart(
      model,
      {
        dataSets: ["A1:B1"],
        labelRange: "A2:B2",
        title: "title",
      },
      "1"
    );
    let chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.options!.title!.text).toEqual("title");

    updateChart(model, "1", { title: "newTitle" });
    chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.options!.title!.text).toEqual("newTitle");
  });

  test("Title is not displayed if empty", () => {
    createChart(
      model,
      {
        dataSets: ["A1:B1"],
        labelRange: "A2:B2",
        title: "title",
      },
      "1"
    );
    expect(
      (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig.options?.title?.display
    ).toBe(true);
    updateChart(model, "1", { title: "" });
    expect(
      (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig.options?.title?.display
    ).toBe(false);
  });
});

describe("multiple sheets", function () {
  test("create a chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
    });
  });
  test("create a chart with dataset label from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3"]);
    expect(chartDefinition).toMatchObject({
      labelRange: "Sheet1!A2:A4",
    });
  });
  test("change source data then activate the chart sheet (it should be up-to-date)", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
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
    const chart = (model.getters.getChartRuntime("28") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });
  test("change dataset label then activate the chart sheet (it should be up-to-date)", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
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
    const chart = (model.getters.getChartRuntime("28") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["P1", "miam", "P3"]);
  });
  test("create a chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    const chart = (model.getters.getChartRuntime("28") as BarChartRuntime).chartJsConfig;
    const chartDefinition = model.getters.getChartDefinition("28");
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
    });
  });
  describe("multiple sheets with formulas", function () {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            name: "Sheet1",
            cells: {
              A1: { content: "a" },
              A2: { content: "b" },
              B1: { content: "1" },
              B2: { content: "2" },
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
                  title: "demo chart",
                  labelRange: "Sheet1!A1:A2",
                  dataSets: ["Sheet2!A1:A2"],
                  dataSetsHaveTitle: false,
                  background: "#124578",
                },
              },
            ],
          },
          {
            name: "Sheet2",
            cells: {
              A1: { content: "=Sheet1!B1*2" },
              A2: { content: "=Sheet1!B2*2" },
            },
          },
        ],
      });
    });
    test("new model with chart with formulas from another sheet (not evaluated yet)", () => {
      const chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
      expect(chart.data!.datasets![0].data).toEqual([2, 4]);
    });
    test("chart is updated with new data", () => {
      let chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
      expect(chart.data!.datasets![0].data).toEqual([2, 4]);
      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet2",
        col: 0,
        row: 0,
        content: "=Sheet1!B1*3",
      });
      chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
      expect(chart.data!.datasets![0].data).toEqual([3, 4]);

      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 1,
        row: 1,
        content: "5",
      });
      chart = (model.getters.getChartRuntime("1") as LineChartRuntime).chartJsConfig;
      expect(chart.data!.datasets![0].data).toEqual([3, 10]);
    });
  });

  test("export with chart data from a sheet that was deleted, than import data does not crash", () => {
    const originSheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
      },
      "28"
    );
    model.dispatch("DELETE_SHEET", { sheetId: originSheet });
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    const chart = newModel.getters.getChartRuntime("28")!;
    expect(chart).toBeDefined();
  });
});

describe("undo/redo", () => {
  test("undo/redo chart creation", () => {
    const before = model.exportData();
    createChart(model, { dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"] });
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
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "27"
    );
    let chart = (model.getters.getChartRuntime("27") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(model, "B2", "99");
    chart = (model.getters.getChartRuntime("27") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
    undo(model);
    chart = (model.getters.getChartRuntime("27") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    redo(model);
    chart = (model.getters.getChartRuntime("27") as LineChartRuntime).chartJsConfig;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });
});

describe("Chart without labels", () => {
  const defaultChart: BarChartDefinition = {
    background: "#FFFFFF",
    dataSets: ["A1:A2"],
    dataSetsHaveTitle: false,
    legendPosition: "top",
    title: "My chart",
    type: "bar",
    verticalAxisPosition: "left",
    stackedBar: false,
  };

  test("The legend is not displayed when there is only one dataSet and no label", () => {
    createChart(model, defaultChart, "42");
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig?.options?.legend
        ?.display
    ).toBe(false);

    createChart(model, { ...defaultChart, dataSets: ["A1:A2", "A3:A4"] }, "43");
    expect(
      (model.getters.getChartRuntime("43") as BarChartRuntime).chartJsConfig?.options?.legend
        ?.display
    ).toBeUndefined();

    createChart(model, { ...defaultChart, labelRange: "B1:B2" }, "44");
    expect(
      (model.getters.getChartRuntime("44") as BarChartRuntime).chartJsConfig?.options?.legend
        ?.display
    ).toBeUndefined();
  });

  test("Labels are empty if there is only one dataSet and no label", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    createChart(model, defaultChart, "42");
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig?.data?.labels
    ).toEqual(["", ""]);

    createChart(model, { ...defaultChart, dataSets: ["A1:A2", "A3:A4"] }, "43");
    expect(
      (model.getters.getChartRuntime("43") as BarChartRuntime).chartJsConfig?.data?.datasets![0]
        .label
    ).toEqual(`${ChartTerms.Series.toString()} 1`);
    expect(
      (model.getters.getChartRuntime("43") as BarChartRuntime).chartJsConfig?.data?.datasets![1]
        .label
    ).toEqual(`${ChartTerms.Series.toString()} 2`);

    setCellContent(model, "B1", "B1");
    setCellContent(model, "B2", "B2");
    createChart(model, { ...defaultChart, labelRange: "B1:B2" }, "44");
    expect(
      (model.getters.getChartRuntime("44") as BarChartRuntime).chartJsConfig.data?.labels
    ).toEqual(["B1", "B2"]);
  });
});

describe("Chart design configuration", () => {
  const defaultChart: BarChartDefinition = {
    background: "#FFFFFF",
    dataSets: ["A1:A2"],
    dataSetsHaveTitle: true,
    legendPosition: "top",
    title: "My chart",
    type: "bar",
    verticalAxisPosition: "left",
    labelRange: "A1",
    stackedBar: false,
  };

  test("Legend position", () => {
    createChart(model, defaultChart, "42");
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.legend
        ?.position
    ).toBe("top");

    updateChart(model, "42", { legendPosition: "left" });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.legend
        ?.position
    ).toBe("left");

    updateChart(model, "42", { legendPosition: "right" });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.legend
        ?.position
    ).toBe("right");

    updateChart(model, "42", { legendPosition: "bottom" });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.legend
        ?.position
    ).toBe("bottom");
  });

  test("Background is correctly updated", () => {
    createChart(model, defaultChart, "42");
    expect(model.getters.getChartDefinition("42")!.background).toBe("#FFFFFF");

    updateChart(model, "42", { background: "#000000" });
    expect(model.getters.getChartDefinition("42")!.background).toBe("#000000");
  });

  test("Stacked bar", () => {
    createChart(model, defaultChart, "42");
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.xAxes![0].stacked
    ).toBeUndefined();
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.yAxes![0].stacked
    ).toBeUndefined();

    updateChart(model, "42", { stackedBar: true });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.xAxes![0].stacked
    ).toBe(true);
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.yAxes![0].stacked
    ).toBe(true);

    updateChart(model, "42", { type: "line" });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.xAxes![0].stacked
    ).toBeUndefined();
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.yAxes![0].stacked
    ).toBeUndefined();
  });

  test("Vertical axis position", () => {
    createChart(model, defaultChart, "42");
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.yAxes![0].position
    ).toBe("left");

    updateChart(model, "42", { verticalAxisPosition: "right" });
    expect(
      (model.getters.getChartRuntime("42") as BarChartRuntime).chartJsConfig.options?.scales
        ?.yAxes![0].position
    ).toBe("right");
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
            A2: { content: "" },    B2: { content: "" },    C2: { content: "" },
            // data point 2: only label
            A3: { content: "P1" },  B3: { content: "" },    C3: { content: "" },
            // data point 3: only first value
            A4: { content: "" },    B4: { content: "10" },  C4: { content: "" },
            // data point 4: empty in the middle of data points
            A5: { content: "" },    B5: { content: "" },    C5: { content: "" },
            // data point 5: only second value
            A6: { content: "" },    B6: { content: "" },    C6: { content: "20" },
          },
        },
      ],
    });

    createChart(model, { labelRange: "A2:A6", dataSets: ["B1:B15", "C1:C15"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["P1", "", ""]);
    expect(chart.data!.datasets![0].data).toEqual([undefined, 10, undefined]);
    expect(chart.data!.datasets![1].data).toEqual([undefined, undefined, 20]);
  });

  test("value without matching index in the label set", () => {
    const model = new Model();
    // corresponding label would be A8, but it's not part of the label range
    setCellContent(model, "B8", "30");
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B15"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual([""]);
    expect(chart.data!.datasets![0].data).toEqual([30]);
  });

  test("label without matching index in the data set", () => {
    const model = new Model();
    // corresponding value would be B8, but it's not part of the data range
    setCellContent(model, "A8", "P1");
    createChart(model, { labelRange: "A2:A15", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["P1"]);
    expect(chart.data!.datasets![0].data).toEqual([undefined]);
  });

  test("no data points at all", () => {
    const model = new Model();
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual([]);
    expect(chart.data!.datasets![0].data).toEqual([]);
  });

  test.each([
    { format: "0.00%" },
    { style: { textColor: "#FFF" } },
    { border: "bottom" as BorderCommand },
  ])("no data points but style on a label", (formatting) => {
    const model = new Model();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A2:A3"),
      ...formatting,
    });
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual([]);
    expect(chart.data!.datasets![0].data).toEqual([]);
  });

  test.each([
    { format: "0.00%" },
    { style: { textColor: "#FFF" } },
    { border: "bottom" as BorderCommand },
  ])("no data points but style on a value", (formatting) => {
    const model = new Model();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("B1:B3"),
      ...formatting,
    });
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual([]);
    expect(chart.data!.datasets![0].data).toEqual([]);
  });

  test("data point with only a zero value", () => {
    const model = new Model();
    setCellContent(model, "B2", "0");
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual([""]);
    expect(chart.data!.datasets![0].data).toEqual([0]);
  });

  test("data point with only a zero label", () => {
    const model = new Model();
    setCellContent(model, "A2", "0");
    createChart(model, { labelRange: "A2:A3", dataSets: ["B1:B3"] }, "1");
    const chart = (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["0"]);
    expect(chart.data!.datasets![0].data).toEqual([undefined]);
  });

  test("Changing the format of a cell reevaluates a chart runtime", () => {
    const model = new Model();
    let chart: BarChartRuntime;
    setCellContent(model, "A2", "2022/03/01");
    setCellContent(model, "A3", "2022/03/02");
    createChart(model, { labelRange: "A2:A3", dataSets: ["B2:B3"] }, "1");
    chart = model.getters.getChartRuntime("1") as BarChartRuntime;
    expect(chart.chartJsConfig.data!.labels).toEqual(["2022/03/01", "2022/03/02"]);
    setCellFormat(model, "A2", "m/d/yyyy");
    chart = model.getters.getChartRuntime("1") as BarChartRuntime;
    expect(chart.chartJsConfig.data!.labels).toEqual(["3/1/2022", "2022/03/02"]);
  });
});

describe("Linear/Time charts", () => {
  const chartId = "1";

  test("linear axis for line chart with numbers labels/dataset", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.options!.scales!.xAxes![0].type).toEqual("linear");
  });

  test("time axis for line/bar chart with date labels", () => {
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("C2:C5")],
      format: "m/d/yyyy",
    });
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    let chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.options!.scales!.xAxes![0].type).toEqual("time");

    updateChart(model, chartId, { type: "bar" });
    model.getters.getChartRuntime(chartId)!;
    expect(chart.options!.scales!.xAxes![0].type).toEqual("time");
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
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        labelsAsText: false,
      },
      chartId
    );
    let chart = model.getters.getChartRuntime(chartId) as LineChartRuntime;
    expect(chart.chartJsConfig.options!.scales!.xAxes![0].type).toEqual("time");

    updateChart(model, chartId, { type: "bar" });
    model.getters.getChartRuntime(chartId)!;
    expect(chart.chartJsConfig.options!.scales!.xAxes![0].type).toEqual("time");
  });

  test("date chart: empty label with a value is replaced by arbitrary label with no value", () => {
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("C2:C5")],
      format: "m/d/yyyy",
    });
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    setCellContent(model, "C3", "");
    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.data!.labels![1]).toEqual("1/17/1900");
    expect(chart.data!.datasets![0].data![1]).toEqual({ y: undefined, x: "1/17/1900" });
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
        dataSets: ["B2:B3"],
        labelRange: "C2:C3",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    const chart = (model.getters.getChartRuntime(chartId)! as LineChartRuntime).chartJsConfig;
    expect(chart.data!.labels).toEqual(["0", "1"]);
    expect(chart.data!.datasets![0].data).toEqual([
      { y: 0, x: "0" },
      { y: 1, x: "1" },
    ]);
  });

  test("linear chart: empty label with a value is set to undefined instead of empty string", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        labelsAsText: false,
        dataSetsHaveTitle: false,
      },
      chartId
    );
    setCellContent(model, "C3", "");
    const chart = (model.getters.getChartRuntime(chartId) as LineChartRuntime).chartJsConfig;
    expect(chart.data!.labels![1]).toEqual("");
    expect(chart.data!.datasets![0].data![1]).toEqual({ y: 11, x: undefined });
  });

  test("snapshot test of chartJS configuration for linear chart", () => {
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
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
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("C2:C5")],
      format: "m/d/yyyy",
    });
    createChart(
      model,
      {
        type: "line",
        dataSets: ["B2:B5"],
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
        dataSets: ["B2:B5"],
        labelRange: "C2:C5",
        background: "#010101",
      },
      chartId
    );
    expect(model.getters.getChartRuntime(chartId)).toMatchSnapshot();
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
        dataSets: ["B1:B2"],
        dataSetsHaveTitle: true,
        labelRange: "A2",
      },
      "1"
    );
    expect(
      (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig.data!.datasets![0]!
        .data![0]
    ).toBe(0);
    setCellContent(model, "C3", "1");
    expect(
      (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig.data!.datasets![0]!
        .data![0]
    ).toBe(1);
    deleteColumns(model, ["C"]);
    expect(
      (model.getters.getChartRuntime("1") as BarChartRuntime).chartJsConfig.data!.datasets![0]!
        .data![0]
    ).toBe("#REF");
  });
});
test("creating chart with single dataset should have legend position set as none, followed by changing it to top", async () => {
  createChart(
    model,
    {
      dataSets: ["D5:D10", "E5:E10"],
      type: "bar",
    },
    "24"
  );
  await nextTick();
  expect(
    (model.getters.getChartRuntime("24") as BarChartRuntime).chartJsConfig.options?.legend?.display
  ).toBeFalsy();
  updateChart(model, "24", { legendPosition: "top" });
  await nextTick();
  expect(
    (model.getters.getChartRuntime("24") as BarChartRuntime).chartJsConfig.options?.legend?.position
  ).toBe("top");
});
