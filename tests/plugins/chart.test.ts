import { Model } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { CancelledReason, Viewport } from "../../src/types";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { mockUuidV4To, testUndoRedo, waitForRecompute } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

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
  mockUuidV4To(1);

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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with rectangle dataset", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:C4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with column datasets without series title", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["B2:B4", "C2:C4"],
        dataSetsHaveTitle: false,
        labelRange: "A2:A4",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["A8:D8", "A9:D9"],
        dataSetsHaveTitle: true,
        labelRange: "B7:D7",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with row datasets without series title", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B8:D8", "Sheet1!B9:D9"],
        dataSetsHaveTitle: false,
        labelRange: "B7:D7",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with only the dataset title (no data)", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B8"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!B7:D7",
        type: "line",
      },
    });
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSets: [],
      labelRange: {
        prefixSheet: true,
        sheetId,
        zone: toZone("B7:D7"),
      },
      sheetId,
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with a dataset of one cell (no title)", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["B8"],
        dataSetsHaveTitle: false,
        labelRange: "B7",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(model.getters.getChartRuntime("1")).toMatchSnapshot();
  });

  test("create chart with async as label", async () => {
    setCellContent(model, "B7", "=WAIT(1000)");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["B7:B8"],
        dataSetsHaveTitle: true,
        labelRange: "B7",
        type: "line",
      },
    });
    let datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("Loading...");
    await waitForRecompute();
    datasets = model.getters.getChartRuntime("1")!.data!.datasets!;
    expect(datasets).toHaveLength(1);
    expect(datasets[0].label!.toString()).toEqual("1000");
  });

  test("can delete an imported chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["B7:B8"],
        dataSetsHaveTitle: true,
        labelRange: "B7",
        type: "line",
      },
    });
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures(sheetId, viewport)).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1")).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", { sheetId: model.getters.getActiveSheetId(), id: "1" });
    expect(newModel.getters.getVisibleFigures(sheetId, viewport)).toHaveLength(0);
    expect(newModel.getters.getChartRuntime("1")).toBeUndefined();
  });

  test("update dataset of imported chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    const newModel = new Model(model.exportData());
    let chart = newModel.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    setCellContent(newModel, "B2", "99");
    chart = newModel.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toEqual([99, 11, 12]);
  });

  test("update existing chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });

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

  test.skip("delete a data source column", () => {
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        dataSetsHaveTitle: true,
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
        dataSetsHaveTitle: true,
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
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
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
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4", "This is invalid"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(result).toBeCancelled(CancelledReason.InvalidDataSet);
  });

  test("chart is focused after creation and update", () => {
    model.dispatch("CREATE_CHART", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      definition: {
        dataSets: ["B1:B4"],
        labelRange: "A2:A4",
        dataSetsHaveTitle: true,
        title: "hello",
        type: "bar",
      },
    });
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
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "This is invalid",
        type: "line",
      },
    });
    expect(result).toBeCancelled(CancelledReason.InvalidLabelRange);
  });

  test("create chart with invalid SheetName in dataset will ignore invalid data", () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId,
      definition: {
        title: "test 1",
        dataSets: ["Coucou!B1:B4", "Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
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
      title: "test 1",
      type: "line",
    });
    expect(chart.data!.datasets![0].data).toEqual([10, 11, 12]);
    expect(chart.type).toEqual("line");
  });

  test("create chart with empty dataset", () => {
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: [],
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
    expect(result).toBeCancelled(CancelledReason.EmptyDataSet);
  });

  test("create chart with empty labels", () => {
    const result = model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["Sheet1!B1:B4"],
        dataSetsHaveTitle: true,
        labelRange: "",
        type: "line",
      },
    });
    expect(result).toBeCancelled(CancelledReason.EmptyLabelRange);
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
    expect(result).toBeCancelled(CancelledReason.InvalidDataSet);
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
    expect(result).toBeCancelled(CancelledReason.InvalidLabelRange);
  });
  test.skip("extend data source to new values manually", () => {});
  test.skip("extend data set labels to new values manually", () => {});

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
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: "2",
      definition: {
        title: "test 1",
        dataSets: ["B1:B2"],
        dataSetsHaveTitle: true,
        labelRange: "A1:A2",
        type: "line",
      },
    });
    model.dispatch("DUPLICATE_SHEET", {
      name: "SheetNoFigure",
      sheetIdFrom: "1",
      sheetIdTo: "SheetNoFigure",
    });
    expect(model.getters.getVisibleFigures("SheetNoFigure", viewport)).toEqual([]);
    model.dispatch("DUPLICATE_SHEET", {
      name: "SheetWithFigure",
      sheetIdFrom: "2",
      sheetIdTo: "SheetWithFigure",
    });
    const { x, y, height, width, tag } = model.getters.getVisibleFigures("2", viewport)[0];
    expect(model.getters.getVisibleFigures("SheetWithFigure", viewport)).toMatchObject([
      { x, y, height, width, tag },
    ]);
  });
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
  test("resize columns within graph, it should resize and rerender at the correct size", () => {});
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
        dataSetsHaveTitle: true,
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
    });
  });
  test("undo/redo chart dataset rebuild the chart runtime", () => {});
});
