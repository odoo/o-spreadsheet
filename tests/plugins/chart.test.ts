import { Model } from "../../src";
import { chartTerms } from "../../src/components/side_panel/translations_terms";
import { FIGURE_ID_SPLITTER } from "../../src/constants";
import { toZone } from "../../src/helpers/zones";
import { ChartUIDefinition, CommandResult } from "../../src/types";
import {
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
  undo,
  updateChart,
} from "../test_helpers/commands_helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

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
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B1:B4"),
          },
          labelCell: {
            invalidSheetName: undefined,
            prefixSheet: false,
            sheetId,
            zone: toZone("B1"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("C1:C4"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("C1"),
          },
        },
      ],
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("A2:A4"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with rectangle dataset", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B1:B4"),
          },
          labelCell: {
            invalidSheetName: undefined,
            prefixSheet: false,
            sheetId,
            zone: toZone("B1"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("C1:C4"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("C1"),
          },
        },
      ],
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("A2:A4"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with column datasets without series title", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B2:B4"),
          },
          labelCell: undefined,
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("C2:C4"),
          },
          labelCell: undefined,
        },
      ],
      labelRange: {
        prefixSheet: false,
        sheetId,
        zone: toZone("A2:A4"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A8:D8"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A8"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A9:D9"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A9"),
          },
        },
      ],
      labelRange: {
        prefixSheet: false,
        sheetId,
        zone: toZone("B7:D7"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets without series title", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B8:D8"),
          },
          labelCell: undefined,
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B9:D9"),
          },
          labelCell: undefined,
        },
      ],
      labelRange: {
        prefixSheet: false,
        sheetId,
        zone: toZone("B7:D7"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with only the dataset title (no data)", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("B7:D7"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with a dataset of one cell (no title)", () => {
    const sheetId = model.getters.getActiveSheetId();
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
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B8"),
          },
          labelCell: undefined,
        },
      ],
      labelRange: {
        prefixSheet: false,
        sheetId,
        zone: toZone("B7"),
      },
      sheetId,
      title: "test",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
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
    const chart = model.getters.getChartDefinition("1")!;
    expect(chart.dataSets[0].dataRange.zone).toStrictEqual(toZone("D1:D4"));
    expect(chart.dataSets[0].labelCell!.zone).toStrictEqual(toZone("D1:D1"));
    expect(chart.dataSets[1].dataRange.zone).toStrictEqual(toZone("E1:E4"));
    expect(chart.dataSets[1].labelCell!.zone).toStrictEqual(toZone("E1:E1"));
    expect(chart.labelRange!.zone).toStrictEqual(toZone("C2:C4"));
  });

  test("pie chart tooltip title display the correct dataset", () => {
    createChart(
      model,
      { dataSets: ["B7:B8"], dataSetsHaveTitle: true, labelRange: "B7", type: "pie" },
      "1"
    );
    const title = model.getters.getChartRuntime("1")!.options!.tooltips!.callbacks!.title!;
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
    const title = model.getters.getChartRuntime("1")?.options?.tooltips?.callbacks?.title;
    expect(title).toBeUndefined();
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
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },
            B1: { content: "first column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
            C1: { content: "" },
            C2: { content: "" },
            C3: { content: "" },
            C4: { content: "" },
            C5: { content: "" },
          },
        },
      ],
    });
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
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets?.length).toEqual(1);
  });

  test("can delete an imported chart", () => {
    const sheetId = model.getters.getActiveSheetId();
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
    expect(newModel.getters.getVisibleFigures(sheetId)).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1")).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", { sheetId: model.getters.getActiveSheetId(), id: "1" });
    expect(newModel.getters.getVisibleFigures(sheetId)).toHaveLength(0);
    expect(newModel.getters.getChartRuntime("1")).toBeUndefined();
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
    let chart = newModel.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(newModel, "B2", "99");
    chart = newModel.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });

  test("update existing chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.type).toEqual("line");
    updateChart(model, "1", {
      dataSets: ["Sheet1!A8:D8", "Sheet1!A9:D9"],
      labelRange: "Sheet1!C7:D7",
      dataSetsHaveTitle: true,
      type: "bar",
      title: "hello1",
    });
    chart = model.getters.getChartRuntime("1")!;
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A8:D8"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A8"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A9:D9"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("A9"),
          },
        },
      ],
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("C7:D7"),
      },
      sheetId,
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
    updateChart(model, "1", { labelRange: null });
    expect(model.getters.getChartDefinition("1")?.labelRange).toBeUndefined();
  });

  test("deleting a random sheet does not affect a chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    createChart(
      model,
      {
        dataSets: ["Sheet1!A8:D8"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinitionUI(sheetId, "1");
    createSheet(model, { sheetId: "42" });
    deleteSheet(model, "42");
    const chartDefinitionAfter = model.getters.getChartDefinitionUI(sheetId, "1");
    expect(chartDefinitionBefore).toEqual(chartDefinitionAfter);
  });

  test("deleting a col on another sheet does not affect a chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    createChart(
      model,
      {
        dataSets: ["Sheet1!A8:D8"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinitionUI(sheetId, "1");
    createSheet(model, { sheetId: "42" });
    deleteColumns(model, ["A"], "42");
    const chartDefinitionAfter = model.getters.getChartDefinitionUI(sheetId, "1");
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
    const chart = model.getters.getChartRuntime("1")!;
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
    expect(model.getters.getChartRuntime("1")!.data!.labels).toEqual(["0", "1", "2"]);
    const chart = model.getters.getChartRuntime("1")!;
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
    const chart = model.getters.getChartRuntime("1")!;
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
    const chart = model.getters.getChartRuntime("1")!;
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
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, undefined, 11, 12, 13]);
    expect(chart.data!.datasets![1].data).toEqual([20, undefined, 19, 18, 17]);
    expect(chart.data!.labels).toEqual(["P1", "", "P2", "P3", "P4"]);
  });

  test("Add a row on another sheet does not affect a chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    createChart(
      model,
      {
        dataSets: ["Sheet1!A8:D8"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const chartDefinitionBefore = model.getters.getChartDefinitionUI(sheetId, "1");
    createSheet(model, { sheetId: "42" });
    addRows(model, "before", 0, 1, "42");
    const chartDefinitionAfter = model.getters.getChartDefinitionUI(sheetId, "1");
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
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets?.length).toEqual(0);
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
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![0].label).toEqual("first column dataset");
    setCellContent(model, "B2", "99");
    setCellContent(model, "B1", "new dataset label");
    chart = model.getters.getChartRuntime("1")!;
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

  test("cannot duplicate chart ids", () => {
    const model = new Model();
    const cmd1 = createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    expect(cmd1).toBeSuccessfullyDispatched();

    const cmd2 = createChart(
      model,
      {
        dataSets: ["Sheet1!C1:C4"],
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
        dataSets: ["Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
      "1",
      "42"
    );
    expect(cmd3).toBeCancelledBecause(CommandResult.DuplicatedChartId);
  });

  test("reject updates that target a chart on the wrong sheet", () => {
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "this is invalid"],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const result = updateChart(model, "1", { legendPosition: "left" });
    expect(result).toBeCancelledBecause(CommandResult.ChartDoesNotExist);
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
    const sheetId = model.getters.getActiveSheetId();
    createChart(
      model,
      {
        dataSets: ["Coucou!B1:B4", "Sheet1!B1:B4"],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    const chart = model.getters.getChartRuntime("1")!;
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B1:B4"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId,
            zone: toZone("B1"),
          },
        },
      ],
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("A2:A4"),
      },
      sheetId,
      title: "test",
      type: "bar",
    });
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.type).toEqual("bar");
  });

  test("create chart with empty dataset", () => {
    const result = createChart(
      model,
      {
        dataSets: [],
        labelRange: "Sheet1!A2:A4",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.EmptyDataSet);
    expect(result).not.toBeCancelledBecause(CommandResult.InvalidDataSet);
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
  test("update chart with invalid dataset", () => {
    expect(
      updateChart(model, "1", {
        dataSets: ["Sheet1!B1:B4", "This is invalid"],
      })
    ).toBeCancelledBecause(CommandResult.InvalidDataSet);
  });

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
    expect(model.getters.getVisibleFigures("SheetNoFigure")).toEqual([]);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "2",
      sheetIdTo: "SheetWithFigure",
    });
    const { x, y, height, width, tag } = model.getters.getVisibleFigures("2")[0];
    expect(model.getters.getVisibleFigures("SheetWithFigure")).toMatchObject([
      { x, y, height, width, tag },
    ]);
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
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18, 17]);
  });
  test("extend data set labels to new values manually", () => {
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
    });
    const chart = model.getters.getChartRuntime("1")!;
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
    expect(model.getters.getChartRuntime("1")).toBeUndefined();
  });

  test("Chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createChart(
      model,
      {
        dataSets: ["B1:B4", "C1:C4"],
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
    const duplicatedChartDefinition = model.getters.getChartDefinition(duplicatedFigure.id);
    const expectedDuplicatedChartDefinition = {
      dataSets: [
        {
          dataRange: model.getters.getRangeFromSheetXC(secondSheetId, "B1:B4"),
          labelCell: model.getters.getRangeFromSheetXC(secondSheetId, "B1"),
        },
        {
          dataRange: model.getters.getRangeFromSheetXC(secondSheetId, "C1:C4"),
          labelCell: model.getters.getRangeFromSheetXC(secondSheetId, "C1"),
        },
      ],
      labelRange: model.getters.getRangeFromSheetXC(secondSheetId, "A2:A4"),
      sheetId: secondSheetId,
      title: "test",
    };
    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);
    expect(duplicatedChartDefinition).toMatchObject(expectedDuplicatedChartDefinition);
    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheets()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
    expect(model.getters.getChartDefinition(duplicatedFigure.id)).toMatchObject(
      expectedDuplicatedChartDefinition
    );
  });

  test("Duplicate sheet > export > import > duplicate sheet contains 2 distinct charts", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    const thirdSheetId = "third";
    createChart(
      model,
      {
        dataSets: ["B1:B4", "C1:C4"],
        labelRange: "A2:A4",
      },
      "myChart",
      firstSheetId
    );
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });

    const newModel = new Model(model.exportData());
    newModel.dispatch("DUPLICATE_SHEET", {
      sheetId: secondSheetId,
      sheetIdTo: thirdSheetId,
    });

    const figuresSh1 = newModel.getters.getFigures(firstSheetId);
    const figuresSh2 = newModel.getters.getFigures(secondSheetId);
    const figuresSh3 = newModel.getters.getFigures(thirdSheetId);

    expect(figuresSh1.length).toEqual(1);
    expect(figuresSh2.length).toEqual(1);
    expect(figuresSh3.length).toEqual(1);

    expect(newModel.getters.getChartsIdBySheet(firstSheetId).length).toEqual(1);
    expect(newModel.getters.getChartsIdBySheet(secondSheetId).length).toEqual(1);
    expect(newModel.getters.getChartsIdBySheet(thirdSheetId).length).toEqual(1);

    expect(figuresSh1[0].id).toEqual("myChart");
    expect(figuresSh2[0].id).toEqual(secondSheetId + FIGURE_ID_SPLITTER + "myChart");
    expect(figuresSh3[0].id).toEqual(thirdSheetId + FIGURE_ID_SPLITTER + "myChart");

    const chartSh1 = newModel.getters.getChartDefinition(figuresSh1[0].id);
    const chartSh2 = newModel.getters.getChartDefinition(figuresSh2[0].id);
    const chartSh3 = newModel.getters.getChartDefinition(figuresSh3[0].id);

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
      dataSets: [
        {
          dataRange: model.getters.getRangeFromSheetXC(secondSheetId, `C1:C4`),
          labelCell: model.getters.getRangeFromSheetXC(secondSheetId, `C1`),
        },
      ],
      labelRange: model.getters.getRangeFromSheetXC(secondSheetId, `${secondSheetName}!A2:A4`),
      sheetId: thirdSheetId,
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
    const sheetId = model.getters.getActiveSheetId();
    const def = model.getters.getChartDefinitionUI(sheetId, "1")!;
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
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.options!.title!.text).toEqual("title");

    updateChart(model, "1", { title: "newTitle" });
    chart = model.getters.getChartRuntime("1")!;
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
    expect(model.getters.getChartRuntime("1")?.options?.title?.display).toBe(true);
    updateChart(model, "1", { title: "" });
    expect(model.getters.getChartRuntime("1")?.options?.title?.display).toBe(false);
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
    const chart = model.getters.getChartRuntime("1")!;
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("B1:B4"),
          },
          labelCell: {
            invalidSheetName: undefined,
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("B1"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("C1:C4"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("C1"),
          },
        },
      ],
      sheetId: "42",
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
    const chart = model.getters.getChartRuntime("1")!;
    const chartDefinition = model.getters.getChartDefinition("1");
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3"]);
    expect(chartDefinition).toMatchObject({
      labelRange: {
        prefixSheet: true,
        sheetId: "Sheet1",
        zone: toZone("A2:A4"),
      },
      sheetId: "42",
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
    const chart = model.getters.getChartRuntime("28")!;
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
    const chart = model.getters.getChartRuntime("28")!;
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
    const chart = model.getters.getChartRuntime("28")!;
    const chartDefinition = model.getters.getChartDefinition("28");
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
    expect(chartDefinition).toMatchObject({
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("B1:B4"),
          },
          labelCell: {
            invalidSheetName: undefined,
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("B1"),
          },
        },
        {
          dataRange: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("C1:C4"),
          },
          labelCell: {
            prefixSheet: false,
            sheetId: "Sheet1",
            zone: toZone("C1"),
          },
        },
      ],
      sheetId: "42",
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
      const chart = model.getters.getChartRuntime("1")!;
      expect(chart.data!.datasets![0].data).toEqual([2, 4]);
    });
    test("refresh chart to update it with new data", () => {
      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet2",
        col: 0,
        row: 0,
        content: "=Sheet1!B1*3",
      });
      let chart = model.getters.getChartRuntime("1")!;
      expect(chart.data!.datasets![0].data).toEqual(["Loading...", 4]); // data has not been updated :(

      model.dispatch("REFRESH_CHART", { id: "1" });
      chart = model.getters.getChartRuntime("1")!;
      expect(chart.data!.datasets![0].data).toEqual([3, 4]);

      model.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 1,
        row: 1,
        content: "5",
      });
      chart = model.getters.getChartRuntime("1")!;
      expect(chart.data!.datasets![0].data).toEqual([3, 4]); // data has not been updated :(

      model.dispatch("REFRESH_CHART", { id: "1" });
      chart = model.getters.getChartRuntime("1")!;
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
    let chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(model, "B2", "99");
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
    undo(model);
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    redo(model);
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });
});

describe("Chart without labels", () => {
  const defaultChart: ChartUIDefinition = {
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
    expect(model.getters.getChartRuntime("42")?.options?.legend?.display).toBe(false);

    createChart(model, { ...defaultChart, dataSets: ["A1:A2", "A3:A4"] }, "43");
    expect(model.getters.getChartRuntime("43")?.options?.legend?.display).toBeUndefined();

    createChart(model, { ...defaultChart, labelRange: "B1:B2" }, "44");
    expect(model.getters.getChartRuntime("44")?.options?.legend?.display).toBeUndefined();
  });

  test("Labels are empty if there is only one dataSet and no label", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "4");
    createChart(model, defaultChart, "42");
    expect(model.getters.getChartRuntime("42")?.data?.labels).toEqual(["", ""]);

    createChart(model, { ...defaultChart, dataSets: ["A1:A2", "A3:A4"] }, "43");
    expect(model.getters.getChartRuntime("43")?.data?.datasets![0].label).toEqual(
      `${chartTerms.Series.toString()} 1`
    );
    expect(model.getters.getChartRuntime("43")?.data?.datasets![1].label).toEqual(
      `${chartTerms.Series.toString()} 2`
    );

    setCellContent(model, "B1", "B1");
    setCellContent(model, "B2", "B2");
    createChart(model, { ...defaultChart, labelRange: "B1:B2" }, "44");
    expect(model.getters.getChartRuntime("44")?.data?.labels).toEqual(["B1", "B2"]);
  });
});

describe("Chart design configuration", () => {
  const defaultChart: ChartUIDefinition = {
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
    expect(model.getters.getChartRuntime("42")?.options?.legend?.position).toBe("top");

    updateChart(model, "42", { legendPosition: "left" });
    expect(model.getters.getChartRuntime("42")?.options?.legend?.position).toBe("left");

    updateChart(model, "42", { legendPosition: "right" });
    expect(model.getters.getChartRuntime("42")?.options?.legend?.position).toBe("right");

    updateChart(model, "42", { legendPosition: "bottom" });
    expect(model.getters.getChartRuntime("42")?.options?.legend?.position).toBe("bottom");
  });

  test("Background is correctly updated", () => {
    createChart(model, defaultChart, "42");
    expect(
      model.getters.getChartDefinitionUI(model.getters.getActiveSheetId(), "42")!.background
    ).toBe("#FFFFFF");

    updateChart(model, "42", { background: "#000000" });
    expect(
      model.getters.getChartDefinitionUI(model.getters.getActiveSheetId(), "42")!.background
    ).toBe("#000000");
  });

  test("Stacked bar", () => {
    createChart(model, defaultChart, "42");
    expect(model.getters.getChartRuntime("42")?.options?.scales?.xAxes![0].stacked).toBeUndefined();
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].stacked).toBeUndefined();

    updateChart(model, "42", { stackedBar: true });
    expect(model.getters.getChartRuntime("42")?.options?.scales?.xAxes![0].stacked).toBe(true);
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].stacked).toBe(true);

    updateChart(model, "42", { type: "line" });
    expect(model.getters.getChartRuntime("42")?.options?.scales?.xAxes![0].stacked).toBeUndefined();
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].stacked).toBeUndefined();

    updateChart(model, "42", { type: "bar" });
    expect(model.getters.getChartRuntime("42")?.options?.scales?.xAxes![0].stacked).toBe(true);
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].stacked).toBe(true);

    updateChart(model, "42", { stackedBar: false });
    expect(model.getters.getChartRuntime("42")?.options?.scales?.xAxes![0].stacked).toBeUndefined();
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].stacked).toBeUndefined();
  });

  test("Vertical axis position", () => {
    createChart(model, defaultChart, "42");
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].position).toBe("left");

    updateChart(model, "42", { verticalAxisPosition: "right" });
    expect(model.getters.getChartRuntime("42")?.options?.scales?.yAxes![0].position).toBe("right");
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
    expect(model.getters.getChartRuntime("1")!.data!.datasets?.length).toBe(0);
    setCellContent(model, "C3", "1");
    expect(model.getters.getChartRuntime("1")!.data!.datasets![0]!.data![0]).toBe(1);
    deleteColumns(model, ["C"]);
    expect(model.getters.getChartRuntime("1")!.data!.datasets?.length).toBe(0);
  });
});
