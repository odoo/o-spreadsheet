import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { ClipboardMIMEType, UID } from "../../src/types";
import { BarChartDefinition } from "../../src/types/chart";
import {
  activateSheet,
  copy,
  createChart,
  createImage,
  createSheet,
  cut,
  paste,
  setCellContent,
  setSelection,
  updateChart,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { getFigureDefinition, getFigureIds, nextTick } from "../test_helpers/helpers";

describe.each(["chart", "image"])("Clipboard for %s figures", (type: string) => {
  let model: Model;
  let sheetId: UID;
  let figureId: UID;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    figureId = model.uuidGenerator.uuidv4();
    if (type === "chart") {
      createChart(model, { type: "bar" }, figureId);
    } else if (type === "image") {
      createImage(model, { figureId });
    }
    await nextTick();
  });

  function getCopiedFigureId(sheet?: UID) {
    const ids = getFigureIds(model, sheet || sheetId, type);
    return ids.find((id) => id !== figureId)!;
  }

  test(`Can copy and paste ${type}`, () => {
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    paste(model, "A1");
    const figureIds = getFigureIds(model, sheetId);
    expect(figureIds).toHaveLength(2);
    expect(getFigureDefinition(model, figureId, type)).toEqual(
      getFigureDefinition(model, getCopiedFigureId(), type)
    );
  });

  test("Can cut and paste figure", () => {
    model.dispatch("SELECT_FIGURE", { id: figureId });
    const figureDef = getFigureDefinition(model, figureId, type);
    cut(model);
    paste(model, "A1");
    const figureIds = getFigureIds(model, sheetId, type);
    expect(figureIds).toHaveLength(1);
    expect(getFigureDefinition(model, getCopiedFigureId(), type)).toEqual(figureDef);
  });

  test("Clipboard will copy figure instead of cells if a figure is selected", () => {
    setCellContent(model, "A1", "1");
    setSelection(model, ["A1"]);
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toEqual("");
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
  });

  test("Can copy and paste figure to another sheet", () => {
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    expect(getFigureIds(model, sheetId, type)).toHaveLength(1);
    expect(getFigureIds(model, "42", type)).toHaveLength(1);
    expect(getFigureDefinition(model, figureId, type)).toEqual(
      getFigureDefinition(model, getCopiedFigureId("42"), type)
    );
  });

  test("Figure position is at the first cell of the target", () => {
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    paste(model, "C3:C10, B8");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId());
    expect(copiedFigure?.x).toEqual(2 * DEFAULT_CELL_WIDTH);
    expect(copiedFigure?.y).toEqual(2 * DEFAULT_CELL_HEIGHT);
  });

  test("Figure size is copied", () => {
    model.dispatch("UPDATE_FIGURE", {
      sheetId,
      id: figureId,
      height: 256,
      width: 257,
    });
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    paste(model, "A1");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId());
    expect(copiedFigure?.height).toEqual(256);
    expect(copiedFigure?.width).toEqual(257);
  });

  test("Can paste deleted %s", () => {
    const figureDef = getFigureDefinition(model, figureId, type);
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    model.dispatch("DELETE_FIGURE", { sheetId, id: figureId });
    paste(model, "A1");
    expect(getFigureDefinition(model, getCopiedFigureId(), type)).toEqual(figureDef);
  });

  test("Can cut paste %s on another sheet", () => {
    const figureDef = getFigureDefinition(model, figureId, type);
    model.dispatch("SELECT_FIGURE", { id: figureId });
    cut(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newFigureId = model.getters.getFigures("42")[0].id;
    expect(getFigureDefinition(model, newFigureId, type)).toEqual(figureDef);
    expect(model.getters.getFigures(sheetId)).toHaveLength(0);
  });

  test("Figure is copied to edge of the sheet", () => {
    model.dispatch("UPDATE_FIGURE", {
      sheetId,
      id: figureId,
      height: 256,
      width: 257,
    });
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    paste(model, "Z100");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId())!;
    const maxX = model.getters.getColDimensions(
      sheetId,
      model.getters.getNumberCols(sheetId) - 1
    ).end;
    const maxY = model.getters.getRowDimensions(
      sheetId,
      model.getters.getNumberRows(sheetId) - 1
    ).end;
    expect(copiedFigure.x).toBe(maxX - copiedFigure.width);
    expect(copiedFigure.y).toBe(maxY - copiedFigure.height);
  });

  test("Can paste a chart with ranges that were deleted between the copy and the paste", () => {
    const model = new Model();
    const chartId = "thisIsAnId";
    createSheet(model, { sheetId: "sheet2Id", name: "Sheet2" });
    createChart(
      model,
      {
        type: "bar",
        dataSets: [{ dataRange: "Sheet1!A1:A5" }, { dataRange: "Sheet2!B1:B5" }],
        labelRange: "B1",
      },
      chartId
    );
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    model.dispatch("DELETE_SHEET", { sheetId: "Sheet1" });
    paste(model, "A1");
    expect(model.getters.getFigures("sheet2Id")).toHaveLength(1);
    const newChartId = model.getters.getFigures("sheet2Id")[0].id;
    expect(model.getters.getChartDefinition(newChartId)).toMatchObject({
      dataSets: [{ dataRange: "B1:B5" }],
      labelRange: undefined,
    });
  });

  test("Chart clipboard content is not serialized at copy", () => {
    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    const clipboardSpreadsheetContent = JSON.parse(
      model.getters.getClipboardContent()[ClipboardMIMEType.OSpreadsheet]!
    );
    expect(clipboardSpreadsheetContent.figureId).toBe(undefined);
    expect(clipboardSpreadsheetContent.copiedFigure).toBe(undefined);
    expect(clipboardSpreadsheetContent.copiedChart).toBe(undefined);
  });

  describe("Paste command result", () => {
    test("Cannot paste with empty target", () => {
      model.dispatch("SELECT_FIGURE", { id: figureId });
      copy(model);
      const result = model.dispatch("PASTE", { target: [] });
      expect(result).toBeCancelledBecause(CommandResult.EmptyTarget);
    });

    test("Cannot paste with clipboard options when pasting a figure", () => {
      model.dispatch("SELECT_FIGURE", { id: figureId });
      copy(model);
      const result = paste(model, "A1", "onlyFormat");
      expect(result).toBeCancelledBecause(CommandResult.WrongFigurePasteOption);
    });
  });
});

describe("chart specific Clipboard test", () => {
  test("Can copy paste chart on another sheet", () => {
    const model = new Model();
    const chartId = "thisIsAnId";
    createChart(model, { type: "bar" }, chartId);
    updateChart(model, chartId, { dataSets: [{ dataRange: "A1:A5" }], labelRange: "B1" });
    const chartDef = model.getters.getChartDefinition(chartId) as BarChartDefinition;
    model.dispatch("SELECT_FIGURE", { id: chartId });
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newChartId = model.getters.getFigures("42")[0].id;
    expect(model.getters.getChartDefinition(newChartId)).toEqual({
      ...chartDef,
      dataSets: [{ dataRange: "Sheet1!A1:A5" }],
      labelRange: "Sheet1!B1",
    });
  });
});
