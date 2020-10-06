import { Model } from "../../../src";
import { Viewport, CancelledReason } from "../../../src/types";
import "../../canvas.mock";
import { testUndoRedo } from "../../helpers";

let model: Model;
const viewport: Viewport = {
  bottom: 1000,
  right: 1000,
  left: 0,
  top: 0,
  height: 1000,
  width: 1000,
  offsetX: 0,
  offsetY: 0,
};

beforeEach(() => {
  model = new Model({
    sheets: [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10,
        rows: {},
        cells: {
          B1: { content: "first column dataset" },
          C1: { content: "second column dataset" },
          B2: { content: "10" },
          B3: { content: "11" },
          B4: { content: "12" },
          C2: { content: "20" },
          C3: { content: "19" },
          C4: { content: "18" },
          A2: { content: "P1" },
          A3: { content: "P2" },
          A4: { content: "P3" },

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
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        { dataRange: "B2:B4", labelCell: "B1" },
        { dataRange: "C2:C4", labelCell: "C1" },
      ],
      labelRange: "Sheet1!A2:A4",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with rectangle dataset", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        { dataRange: "B2:B4", labelCell: "B1" },
        { dataRange: "C2:C4", labelCell: "C1" },
      ],
      labelRange: "Sheet1!A2:A4",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
  });

  test("create chart with column datasets without series title", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B2:B4", "Sheet1!C2:C4"],
        seriesHasTitle: false,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        { dataRange: "B2:B4", labelCell: undefined },
        { dataRange: "C2:C4", labelCell: undefined },
      ],
      labelRange: "Sheet1!A2:A4",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
    const datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets[0].label!.toString()).toEqual("Series");
    expect(datasets[1].label!.toString()).toEqual("Series");
  });

  test("create chart with row datasets", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!A8:D8", "Sheet1!A9:D9"],
        seriesHasTitle: true,
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        { dataRange: "B8:D8", labelCell: "A8" },
        { dataRange: "B9:D9", labelCell: "A9" },
      ],
      labelRange: "Sheet1!B7:D7",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
  });

  test("create chart with row datasets without series title", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B8:D8", "Sheet1!B9:D9"],
        seriesHasTitle: false,
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        { dataRange: "B8:D8", labelCell: undefined },
        { dataRange: "B9:D9", labelCell: undefined },
      ],
      labelRange: "Sheet1!B7:D7",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
  });

  test("create chart with only the dataset title (no data)", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B8"],
        seriesHasTitle: true,
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [],
      labelRange: "Sheet1!B7:D7",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")!.data!.datasets!).toHaveLength(0);
  });

  test("create chart with a dataset of one cell (no title)", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["B8"],
        seriesHasTitle: false,
        labelRange: "B7",
        type: "line",
      },
    });
    expect(model.getters.getFigures(viewport)[0].data).toEqual({
      dataSets: [
        {
          dataRange: "B8",
        },
      ],
      labelRange: "B7",
      sheetId: model.getters.getActiveSheetId(),
      title: "test 1",
      type: "line",
    });
    const datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("Series");
  });

  test("create chart with async as label", () => {
    model.dispatch("SET_VALUE", { xc: "B7", text: "=WAIT(1000)" });
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["B7:B8"],
        seriesHasTitle: true,
        labelRange: "B7",
        type: "line",
      },
    });
    const datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("Series");
  });

  test.skip("delete a data source column", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    model.dispatch("REMOVE_COLUMNS", { columns: [1], sheetId: model.getters.getActiveSheetId() });
    expect(model.getters.getChartRuntime("1")!.data!.datasets).toHaveLength(1);
    expect(model.getters.getChartRuntime("1")!.data!.datasets![0].data).toEqual([20, 19, 18]);
  });

  test.skip("delete a data set labels column", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    model.dispatch("REMOVE_COLUMNS", { columns: [0], sheetId: model.getters.getActiveSheetId() });
    // dataset in col B becomes labels in col A
    expect(model.getters.getChartRuntime("1")!.data!.labels).toBeUndefined();
  });

  test("update dataset cell updates chart runtime", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.data!.datasets![0].label).toEqual("first column dataset");
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 1,
      sheetId: sheetId,
      content: "99",
    });
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 0,
      sheetId: sheetId,
      content: "new dataset label",
    });
    chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
    expect(chart.data!.datasets![0].label).toEqual("new dataset label");
  });

  test("create chart with invalid dataset", () => {
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "This is invalid"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.InvalidChartDefinition });
  });

  test("create chart with invalid labels", () => {
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        seriesHasTitle: true,
        labelRange: "This is invalid",
        type: "line",
      },
    });
    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.InvalidChartDefinition });
  });
  test("update chart with invalid dataset", () => {
    const result = model.dispatch("UPDATE_CHART", {
      id: "1",
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "This is invalid"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.InvalidChartDefinition });
  });

  test("update chart with invalid labels", () => {
    const result = model.dispatch("UPDATE_CHART", {
      id: "1",
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        seriesHasTitle: true,
        labelRange: "This is invalid",
        type: "line",
      },
    });
    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.InvalidChartDefinition });
  });
  test.skip("extend data source to new values manually", () => {});
  test.skip("extend data set labels to new values manually", () => {});
});

describe.skip("title", function () {
  test("delete a title column", () => {});
  test("change title manually", () => {});
  test("change title reference cell", () => {});
  test("change content of title reference cell", () => {});
});

describe.skip("multiple sheets", function () {
  test("create a chart on a sheet with data from another sheet", () => {});
  test("create a chart on a sheet with dataset label from another sheet", () => {});
  test("create a chart on a sheet with title from another sheet", () => {});

  test("change source data then activate the chart sheet (it should be up-to-date)", () => {});
  test("change dataset label then activate the chart sheet (it should be up-to-date)", () => {});
  test("change title then activate the chart sheet (it should be up-to-date)", () => {});
});

test.skip("select a graph, it should have the  resize handles", () => {});
describe.skip("size and position", function () {
  test("resize columns before a graph, it should move", () => {});
  test("resize columns before within graph, it should resize and rerender at the correct size", () => {});
  test("delete a column before a graph, it should move", () => {});
  test("delete a columns within graph, it should resize and rerender at the size-sizeOfRemovedColumn", () => {});
  test("delete all columns that a graph is defined on, it should remove the graph", () => {});
});

describe("undo/redo", () => {
  test("undo/redo chart creation", () => {
    testUndoRedo(model, expect, "CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        seriesHasTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
  });
});
