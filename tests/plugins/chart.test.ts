import { Model } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { CommandResult } from "../../src/types";
import {
  addColumns,
  createChart,
  createSheet,
  deleteColumns,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { mockUuidV4To, testUndoRedo, waitForRecompute } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

beforeEach(() => {
  mockUuidV4To(1);

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

  test("create chart with async as label", async () => {
    setCellContent(model, "B7", "=WAIT(1000)");
    createChart(
      model,
      {
        dataSets: ["B7:B8"],
        labelRange: "B7",
        type: "line",
      },
      "1"
    );
    let datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("Loading...");
    await waitForRecompute();
    datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("1000");
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
    model.dispatch("UPDATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "hello1",
        dataSets: ["Sheet1!A8:D8", "Sheet1!A9:D9"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!C7:D7",
        type: "bar",
      },
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
    expect(model.getters.getChartRuntime("1")!.data!.labels).toEqual([]);
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18]);
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
    expect(result).toBe(CommandResult.InvalidDataSet);
  });

  test("chart is focused after creation and update", () => {
    createChart(
      model,
      {
        dataSets: ["B1:B4"],
        labelRange: "A2:A4",
      },
      "someuuid"
    );
    expect(model.getters.getSelectedFigureId()).toBeNull();
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBeNull();
    model.dispatch("UPDATE_CHART", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      definition: {
        dataSets: ["B1:B4"],
        labelRange: "A2:A4",
        dataSetsHaveTitle: true,
        title: "updated chart",
        type: "bar",
      },
    });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
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
    expect(result).toBe(CommandResult.InvalidLabelRange);
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
    expect(result).toBe(CommandResult.EmptyDataSet);
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
    expect(result).toBe(CommandResult.EmptyLabelRange);
  });
  test("update chart with invalid dataset", () => {
    const result = model.dispatch("UPDATE_CHART", {
      sheetId: model.getters.getActiveSheetId(),
      id: "1",
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "This is invalid"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(result).toBe(CommandResult.InvalidDataSet);
  });

  test("update chart with invalid labels", () => {
    const result = model.dispatch("UPDATE_CHART", {
      sheetId: model.getters.getActiveSheetId(),
      id: "1",
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "This is invalid",
        type: "line",
      },
    });
    expect(result).toBe(CommandResult.InvalidLabelRange);
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
      name: "SheetNoFigure",
      sheetId: "1",
      sheetIdTo: "SheetNoFigure",
    });
    expect(model.getters.getVisibleFigures("SheetNoFigure")).toEqual([]);
    model.dispatch("DUPLICATE_SHEET", {
      name: "SheetWithFigure",
      sheetId: "2",
      sheetIdTo: "SheetWithFigure",
    });
    const { x, y, height, width, tag } = model.getters.getVisibleFigures("2")[0];
    expect(model.getters.getVisibleFigures("SheetWithFigure")).toMatchObject([
      { x, y, height, width, tag },
    ]);
  });
  test("extend data source to new values manually", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "hello1",
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A5",
        type: "bar",
      },
    });
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12, 13]);
    expect(chart.data!.datasets![1].data).toEqual([20, 19, 18, 17]);
  });
  test("extend data set labels to new values manually", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "hello1",
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A5",
        type: "bar",
      },
    });
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
  });
});

describe("title", function () {
  test("change title manually", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "newTitle",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
    });
    const chart = model.getters.getChartRuntime("1")!;
    expect(chart.options!.title!.text).toEqual("newTitle");
  });
});

describe("multiple sheets", function () {
  test("create a chart with data from another sheet", () => {
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
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
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
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
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
    createChart(model, {
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
      labelRange: "Sheet1!A2:A4",
    });
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
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
    createChart(model, {
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
      labelRange: "Sheet1!A2:A4",
    });
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
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
    createChart(model, {
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
      labelRange: "Sheet1!A2:A4",
    });
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
  test("export with chart data from a sheet that was deleted, than import data does not crash", () => {
    const originSheet = model.getters.getActiveSheetId();
    createSheet(model, { name: "hello", sheetId: "42", activate: true });
    createChart(model, {
      dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
      labelRange: "Sheet1!A2:A4",
    });
    model.dispatch("DELETE_SHEET", { sheetId: originSheet });
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    const chart = newModel.getters.getChartRuntime("28")!;
    expect(chart).toBeDefined();
  });
});

describe("undo/redo", () => {
  test("undo/redo chart creation", () => {
    testUndoRedo(model, expect, "CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
  });
  test("undo/redo chart dataset rebuild the chart runtime", () => {
    createChart(model, {
      dataSets: ["Sheet1!B1:B4"],
      labelRange: "Sheet1!A2:A4",
      type: "line",
    });
    let chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(model, "B2", "99");
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
    model.dispatch("UNDO");
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    model.dispatch("REDO");
    chart = model.getters.getChartRuntime("27")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });
});
