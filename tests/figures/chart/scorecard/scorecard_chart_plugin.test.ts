import { CommandResult, Model } from "../../../../src";
import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../../src/constants";
import {
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../../src/types/chart/scorecard_chart";
import { getChartDataSource } from "../../../test_helpers";
import {
  GENERAL_CHART_CREATION_CONTEXT,
  toChartRangeDataSource,
} from "../../../test_helpers/chart_helpers";
import {
  addColumns,
  createChartDefinitionFromContext,
  createScorecardChart,
  createSheet,
  deleteFigure,
  deleteSheet,
  duplicateSheet,
  redo,
  setCellContent,
  undo,
  updateChart,
} from "../../../test_helpers/commands_helpers";

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
        dataSets: ["B8"],
        labelRange: "B7",
        type: "scorecard",
        baselineDescr: { text: "Description" },
        title: { text: "Title" },
      },
      "1"
    );
    expect(model.getters.getChartRuntime("1")).toMatchObject({
      keyValue: "",
      baselineDisplay: "",
      baselineDescr: "Description",
      title: { text: "Title" },
      baselineArrow: "neutral",
      baselineColor: undefined,
    });
  });

  test("create empty scorecard chart", () => {
    createScorecardChart(model, { type: "scorecard", dataSets: ["A1"] }, "1");
    expect(model.getters.getChartRuntime("1")).toMatchObject({
      keyValue: "",
      baselineDisplay: "",
      baselineDescr: "",
      title: { text: "" },
      baselineArrow: "neutral",
      baselineColor: undefined,
    });
  });

  test("create scorecard from creation context", () => {
    const definition = createChartDefinitionFromContext(
      "scorecard",
      GENERAL_CHART_CREATION_CONTEXT
    );
    expect(definition).toEqual({
      type: "scorecard",
      background: "#123456",
      title: { text: "hello there" },
      dataSource: toChartRangeDataSource({
        dataSets: ["Sheet1!B1:B4"],
        labelRange: "Sheet1!A1:A4",
        dataSetsHaveTitle: true,
      }),
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      humanize: false,
    });
  });

  test("ranges in scorecard definition change automatically", () => {
    createScorecardChart(model, { dataSets: ["Sheet1!B1:B4"], labelRange: "Sheet1!A2:A4" }, "1");
    addColumns(model, "before", "A", 2);
    expect(getChartDataSource(model, "1")?.dataSets[0].dataRange).toEqual("D1:D4");
    expect(getChartDataSource(model, "1")?.labelRange).toEqual("Sheet1!C2:C4");
  });

  test("can delete an imported scorecard chart", () => {
    createScorecardChart(model, { dataSets: ["B7:B8"], labelRange: "B7", type: "scorecard" }, "1");
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures()).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1")).toBeTruthy();
    deleteFigure(newModel, model.getters.getFigureIdFromChartId("1"));
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(() => newModel.getters.getChartRuntime("1")).toThrow();
  });

  test("update scorecard chart", () => {
    createScorecardChart(model, { dataSets: ["B7:B8"], labelRange: "B7" }, "1");
    updateChart(model, "1", {
      dataSource: toChartRangeDataSource({ dataSets: ["A7"], labelRange: "E3" }),
      baselineMode: "percentage",
      baselineDescr: { text: "description" },
      title: { text: "hello1" },
    });
    expect(model.getters.getChartDefinition("1")).toMatchObject({
      dataSource: toChartRangeDataSource({ dataSets: ["A7"], labelRange: "E3" }),
      baselineMode: "percentage",
      baselineDescr: { text: "description" },
      title: { text: "hello1" },
    });
  });

  test("create scorecard chart with invalid ranges", () => {
    let result = createScorecardChart(model, { dataSets: ["this is invalid"] }, "1");
    expect(result).toBeCancelledBecause(CommandResult.InvalidDataSet);
    result = createScorecardChart(model, { dataSets: ["A1"], labelRange: "this is invalid" }, "1");
    expect(result).toBeCancelledBecause(CommandResult.InvalidLabelRange);
  });

  test("Scorecard Chart is deleted on sheet deletion", () => {
    createSheet(model, { sheetId: "2", position: 1 });
    createScorecardChart(model, { dataSets: ["Sheet1!B1:B4"] }, "1", "2");
    expect(model.getters.getChartRuntime("1")).not.toBeUndefined();
    deleteSheet(model, "2");
    expect(() => model.getters.getChartRuntime("1")).toThrow();
  });

  test("Scorecard chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createScorecardChart(
      model,
      { title: { text: "test" }, dataSets: ["B1:B4"], labelRange: "A1" },
      firstSheetId
    );
    const figure = model.getters.getFigures(firstSheetId)[0]!;
    duplicateSheet(model, firstSheetId, secondSheetId);

    expect(model.getters.getFigures(secondSheetId)).toHaveLength(1);
    const duplicatedFigure = model.getters.getFigures(secondSheetId)[0];
    const duplicatedChartId = model.getters.getChartIds(secondSheetId)[0];

    const newChart = model.getters
      .getChart(duplicatedChartId)
      ?.getDefinition() as ScorecardChartDefinition;
    expect(newChart.title.text).toEqual("test");
    expect(getChartDataSource(model, duplicatedChartId)?.dataSets[0].dataRange).toEqual("B1:B4");
    expect(getChartDataSource(model, duplicatedChartId)?.labelRange).toEqual("A1");

    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);
    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
  });

  test("percentage with key value smaller than baseline", () => {
    setCellContent(model, "A1", "40");
    setCellContent(model, "A2", "100");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "down",
      baselineColor: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baselineDisplay: "60.0%",
      keyValue: "40",
    });
  });

  test("percentage with key value greater than baseline", () => {
    setCellContent(model, "A1", "140");
    setCellContent(model, "A2", "100");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "up",
      baselineColor: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineDisplay: "40.0%",
      keyValue: "140",
    });
  });

  test("percentage with key value equal to baseline", () => {
    setCellContent(model, "A1", "140");
    setCellContent(model, "A2", "140");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "neutral",
      baselineColor: undefined,
      baselineDisplay: "0.0%",
      keyValue: "140",
    });
  });

  test("percentage with key value not defined", () => {
    setCellContent(model, "A2", "140");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "neutral",
      baselineColor: undefined,
      baselineDisplay: "140",
      keyValue: "",
    });
  });

  test("percentage with baseline value not defined", () => {
    setCellContent(model, "A1", "140");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "neutral",
      baselineColor: undefined,
      baselineDisplay: "",
      keyValue: "140",
    });
  });

  test("percentage with key value not defined and baseline value not defined", () => {
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "neutral",
      baselineColor: undefined,
      baselineDisplay: "",
      keyValue: "",
    });
  });

  test("percentage with baseline value being 0", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "0");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "up",
      baselineColor: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineDisplay: "∞%",
    });
  });

  test("percentage with key value and baseline value being 0", () => {
    setCellContent(model, "A1", "0");
    setCellContent(model, "A2", "0");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineArrow: "neutral",
      baselineColor: undefined,
      baselineDisplay: "0.0%",
    });
  });

  test("progress bar with positive baseline/key ratio", () => {
    setCellContent(model, "A1", "40");
    setCellContent(model, "A2", "100");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "progress" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineColor: undefined,
      baselineDisplay: "40.0%",
      keyValue: "40",
      progressBar: {
        color: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
        value: 0.4,
      },
    });
  });

  test("progress bar with negative baseline/key ratio", () => {
    setCellContent(model, "A1", "-40");
    setCellContent(model, "A2", "100");
    createScorecardChart(model, { dataSets: ["A1"], labelRange: "A2", baselineMode: "progress" });
    const [scorecardId] = model.getters.getChartIds(model.getters.getActiveSheetId());
    expect(model.getters.getChartRuntime(scorecardId)).toMatchObject({
      baselineColor: undefined,
      baselineDisplay: "-40.0%",
      keyValue: "-40",
      progressBar: {
        color: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
        value: -0.4,
      },
    });
  });
});

describe("multiple sheets", () => {
  test("create a scorecard chart with data from another sheet", () => {
    model = new Model();
    createSheet(model, { sheetId: "42", activate: true });
    createScorecardChart(model, { dataSets: ["Sheet1!B1"], labelRange: "Sheet1!C1" }, "28");
    expect(getChartDataSource(model, "28")?.dataSets[0].dataRange).toEqual("Sheet1!B1");
    expect(getChartDataSource(model, "28")?.labelRange).toEqual("Sheet1!C1");
  });
});

describe("undo/redo", () => {
  test("undo/redo scorecard chart creation", () => {
    const before = model.exportData();
    createScorecardChart(model, { dataSets: ["Sheet1!B1:B4"] });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });

  test("undo/redo scorecard chart data rebuild the chart runtime", () => {
    createScorecardChart(model, { dataSets: ["Sheet1!A2"] }, "27");
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
  createScorecardChart(model, { dataSets: ["Sheet1!A2"], background: "#000000" }, "1");
  expect((model.getters.getChartRuntime("1") as ScorecardChartRuntime).fontColor).toEqual(
    "#FFFFFF"
  );
});

test("Scorecard with formula cell", () => {
  setCellContent(model, "A2", "=MULTIPLY(1, 2)");
  setCellContent(model, "A1", "=SUM(1, 3)");
  createScorecardChart(
    model,
    { dataSets: ["A1"], labelRange: "A2", baselineMode: "percentage" },
    "1"
  );
  const runtime = model.getters.getChartRuntime("1") as ScorecardChartRuntime;
  expect(runtime.keyValue).toEqual("4");
  expect(runtime.baselineDisplay).toEqual("100.0%");
});
