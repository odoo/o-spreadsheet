import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { UID } from "../../src/types";
import {
  activateSheet,
  copy,
  createChart,
  createSheet,
  cut,
  paste,
  setCellContent,
  setSelection,
  updateChart,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { BarChartDefinition } from "./../../src/types/chart/bar_chart";

describe("Clipboard for figures", () => {
  let model: Model;
  let chartId: UID;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    chartId = "thisIsAnId";
    createChart(model, {}, chartId);
    sheetId = model.getters.getActiveSheetId();
  });

  function getCopiedFigureId(sheet?: UID) {
    const ids = model.getters.getChartIds(sheet || sheetId);
    return ids.find((id) => id !== chartId)!;
  }

  test("Can copy and paste chart", () => {
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    paste(model, "A1");
    const chartIds = model.getters.getChartIds(sheetId);
    expect(chartIds).toHaveLength(2);
    expect(model.getters.getChartDefinition(chartId)).toEqual(
      model.getters.getChartDefinition(getCopiedFigureId())
    );
  });

  test("Can cut and paste figure", () => {
    model.dispatch("SELECT_FIGURE", { id: chartId });
    const chartDef = model.getters.getChartDefinition(chartId);
    cut(model);
    paste(model, "A1");
    const chartIds = model.getters.getChartIds(sheetId);
    expect(chartIds).toHaveLength(1);
    expect(model.getters.getChartDefinition(getCopiedFigureId())).toEqual(chartDef);
  });

  test("Clipboard will copy figure instead of cells if a figure is selected", () => {
    setCellContent(model, "A1", "1");
    setSelection(model, ["A1"]);
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toEqual("");
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
  });

  test("Can copy and paste figure to another sheet", () => {
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
    expect(model.getters.getChartIds("42")).toHaveLength(1);
    expect(model.getters.getChartDefinition(chartId)).toEqual(
      model.getters.getChartDefinition(getCopiedFigureId("42"))
    );
  });

  test("Figure position is at the first cell of the target", () => {
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    paste(model, "C3:C10, B8");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId());
    expect(copiedFigure?.x).toEqual(2 * DEFAULT_CELL_WIDTH);
    expect(copiedFigure?.y).toEqual(2 * DEFAULT_CELL_HEIGHT);
  });

  test("Figure size is copied", () => {
    model.dispatch("UPDATE_FIGURE", {
      sheetId,
      id: chartId,
      height: 256,
      width: 257,
    });
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    paste(model, "A1");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId());
    expect(copiedFigure?.height).toEqual(256);
    expect(copiedFigure?.width).toEqual(257);
  });

  test("Can paste deleted chart", () => {
    const chartDef = model.getters.getChartDefinition(chartId);
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    model.dispatch("DELETE_FIGURE", { sheetId, id: chartId });
    paste(model, "A1");
    expect(model.getters.getChartDefinition(getCopiedFigureId())).toEqual(chartDef);
  });

  test("Can copy paste chart on another sheet", () => {
    updateChart(model, chartId, { dataSets: ["A1:A5"], labelRange: "B1" });
    const chartDef = model.getters.getChartDefinition(chartId) as BarChartDefinition;
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newChartId = model.getters.getFigures("42")[0].id;
    expect(model.getters.getChartDefinition(newChartId)).toEqual({
      ...chartDef,
      dataSets: ["Sheet1!A1:A5"],
      labelRange: "Sheet1!B1",
    });
  });

  test("Can cut paste chart on another sheet", () => {
    const chartDef = model.getters.getChartDefinition(chartId) as BarChartDefinition;
    model.dispatch("SELECT_FIGURE", { id: chartId });
    cut(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newChartId = model.getters.getFigures("42")[0].id;
    expect(model.getters.getChartDefinition(newChartId)).toEqual(chartDef);
    expect(model.getters.getFigures(sheetId)).toHaveLength(0);
  });

  test("Can paste a chart with ranges that were deleted between the copy and the paste", () => {
    createSheet(model, { sheetId: "sheet2Id", name: "Sheet2" });
    updateChart(model, chartId, { dataSets: ["Sheet1!A1:A5", "Sheet2!B1:B5"], labelRange: "B1" });
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    model.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    paste(model, "A1");
    expect(model.getters.getFigures("sheet2Id")).toHaveLength(1);
    const newChartId = model.getters.getFigures("sheet2Id")[0].id;
    expect(model.getters.getChartDefinition(newChartId)).toMatchObject({
      dataSets: ["B1:B5"],
      labelRange: undefined,
    });
  });

  describe("Paste command result", () => {
    test("Cannot paste with empty target", () => {
      model.dispatch("SELECT_FIGURE", { id: chartId });
      copy(model);
      const result = model.dispatch("PASTE", { target: [] });
      expect(result).toBeCancelledBecause(CommandResult.EmptyTarget);
    });

    test("Cannot paste with clipboard options when pasting a figure", () => {
      model.dispatch("SELECT_FIGURE", { id: chartId });
      copy(model);
      const result = paste(model, "A1", "onlyFormat");
      expect(result).toBeCancelledBecause(CommandResult.WrongFigurePasteOption);
    });
  });
});
