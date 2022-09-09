import { CommandResult, Model } from "../../../src";
import { zoneToXc } from "../../../src/helpers";
import { ScorecardChart } from "../../../src/helpers/charts";
import {
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../src/types/chart/scorecard_chart";
import {
  addColumns,
  createScorecardChart,
  createSheet,
  deleteSheet,
  redo,
  setCellContent,
  undo,
  updateChart,
} from "../../test_helpers/commands_helpers";

let model: Model;

beforeEach(() => {
  model = new Model({
    sheets: [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10,
        rows: {},
        cells: {},
      },
    ],
  });
});

describe("datasource tests", function () {
  test("create a scorecard chart", () => {
    createScorecardChart(
      model,
      {
        keyValue: "B8",
        baseline: "B7",
        type: "scorecard",
        baselineDescr: "Description",
        title: "Title",
      },
      "1"
    );
    expect(model.getters.getChartRuntime("1")).toMatchObject({
      keyValue: "",
      baselineDisplay: "",
      baselineDescr: "Description",
      title: "Title",
      baselineArrow: "neutral",
      baselineColor: undefined,
    });
  });

  test("create empty scorecard chart", () => {
    createScorecardChart(
      model,
      {
        type: "scorecard",
        keyValue: "A1",
      },
      "1"
    );
    expect(model.getters.getChartRuntime("1")).toMatchObject({
      keyValue: "",
      baselineDisplay: "",
      baselineDescr: "",
      title: "",
      baselineArrow: "neutral",
      baselineColor: undefined,
    });
  });

  test("ranges in scorecard definition change automatically", () => {
    createScorecardChart(
      model,
      {
        keyValue: "Sheet1!B1:B4",
        baseline: "Sheet1!A2:A4",
      },
      "1"
    );
    addColumns(model, "before", "A", 2);
    const chart = model.getters.getChartDefinition("1") as ScorecardChartDefinition;
    expect(chart.keyValue!).toStrictEqual("Sheet1!D1:D4");
    expect(chart.baseline!).toStrictEqual("Sheet1!C2:C4");
  });

  test("can delete an imported scorecard chart", () => {
    createScorecardChart(
      model,
      {
        keyValue: "B7:B8",
        baseline: "B7",
        type: "scorecard",
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

  test("update scorecard chart", () => {
    createScorecardChart(
      model,
      {
        keyValue: "B7:B8",
        baseline: "B7",
      },
      "1"
    );
    updateChart(model, "1", {
      keyValue: "A7",
      baseline: "E3",
      baselineMode: "percentage",
      baselineDescr: "description",
      title: "hello1",
    });
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      keyValue: "A7",
      baseline: "E3",
      baselineMode: "percentage",
      baselineDescr: "description",
      title: "hello1",
    });
  });

  test("create scorecard chart with invalid ranges", () => {
    let result = createScorecardChart(
      model,
      {
        keyValue: "this is invalid",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidScorecardKeyValue);
    result = createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "this is invalid",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidScorecardBaseline);
  });

  test("Scorecard Chart is deleted on sheet deletion", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "2", position: 1 });
    createScorecardChart(
      model,
      {
        keyValue: "Sheet1!B1:B4",
      },
      "1",
      "2"
    );
    expect(model.getters.getChartRuntime("1")).not.toBeUndefined();
    model.dispatch("DELETE_SHEET", { sheetId: "2" });
    expect(() => model.getters.getChartRuntime("1")).toThrow();
  });

  test("Scorecard chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createScorecardChart(
      model,
      {
        title: "test",
        keyValue: "B1:B4",
        baseline: "A1",
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

    const newChart = model.getters.getChart(duplicatedFigure.id) as ScorecardChart;
    expect(newChart.title).toEqual("test");
    expect(newChart.keyValue?.sheetId).toEqual(secondSheetId);
    expect(zoneToXc(newChart.keyValue!.zone)).toEqual("B1:B4");
    expect(newChart.baseline?.sheetId).toEqual(secondSheetId);
    expect(zoneToXc(newChart.baseline!.zone)).toEqual("A1");

    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);
    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
  });
});

describe("multiple sheets", () => {
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          cells: {
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
                type: "scorecard",
                title: "demo chart",
                keyValue: "Sheet2!A1",
                baselineMode: "difference",
                baselineColorDown: "#DC6965",
                baselineColorUp: "#00A04A",
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

  test("create a scorecard chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createScorecardChart(
      model,
      {
        keyValue: "Sheet1!B1",
        baseline: "Sheet1!C1",
      },
      "28"
    );
    const chart = model.getters.getChartDefinition("28") as ScorecardChartDefinition;
    expect(chart.keyValue).toEqual("Sheet1!B1");
    expect(chart.baseline).toEqual("Sheet1!C1");
  });
});

describe("undo/redo", () => {
  test("undo/redo scorecard chart creation", () => {
    const before = model.exportData();
    createScorecardChart(model, { keyValue: "Sheet1!B1:B4" });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });

  test("undo/redo scorecard chart data rebuild the chart runtime", () => {
    createScorecardChart(
      model,
      {
        keyValue: "Sheet1!A2",
      },
      "27"
    );
    let chart = model.getters.getChartRuntime("27") as ScorecardChartRuntime;
    setCellContent(model, "A2", "99");
    chart = model.getters.getChartRuntime("27") as ScorecardChartRuntime;
    expect(chart.keyValue).toEqual("99");
    setCellContent(model, "A2", "12");
    chart = model.getters.getChartRuntime("27") as ScorecardChartRuntime;
    expect(chart.keyValue).toEqual("12");
    undo(model);
    chart = model.getters.getChartRuntime("27") as ScorecardChartRuntime;
    expect(chart.keyValue).toEqual("99");
    redo(model);
    chart = model.getters.getChartRuntime("27") as ScorecardChartRuntime;
    expect(chart.keyValue).toEqual("12");
  });
});

test("font color is white with a dark background color", () => {
  createScorecardChart(
    model,
    {
      keyValue: "Sheet1!A2",
      background: "#000000",
    },
    "1"
  );
  expect((model.getters.getChartRuntime("1") as ScorecardChartRuntime).fontColor).toEqual(
    "#FFFFFF"
  );
});

test("Scorecard with formula cell", () => {
  setCellContent(model, "A2", "=MULTIPLY(1, 2)");
  setCellContent(model, "A1", "=SUM(1, 3)");
  createScorecardChart(
    model,
    {
      keyValue: "A1",
      baseline: "A2",
      baselineMode: "percentage",
    },
    "1"
  );
  const runtime = model.getters.getChartRuntime("1") as ScorecardChartRuntime;
  expect(runtime.keyValue).toEqual("4");
  expect(runtime.baselineDisplay).toEqual("100%");
});
