import { Model } from "../../../src";
import { Color, UID } from "../../../src/types";
import {
  activateSheet,
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  setCellContent,
} from "../../test_helpers/commands_helpers";
import { createEqualCF, target, toRangesData } from "../../test_helpers/helpers";
import { BACKGROUND_CHART_COLOR } from "./../../../src/constants";

describe("Single cell chart background color", () => {
  let model: Model;
  let sheetId: UID;
  let chartId = "thisIsAnId";

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");
  });

  function addCfToA1(color: Color) {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: color }, "cfId"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
  }

  function addFillToA1(color: Color) {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: { fillColor: color },
    });
  }

  function createTestChart(chartType: string, mainCell: string, background?: Color) {
    if (chartType === "scorecard") {
      createScorecardChart(model, { background, keyValue: mainCell }, chartId);
    } else if (chartType === "gauge") {
      createGaugeChart(model, { background, dataRange: mainCell }, chartId);
    }
  }

  test.each(["scorecard", "gauge"])(
    "chart %s background color change with main cell CF background color",
    (chartType: string) => {
      createTestChart(chartType, "A1");
      expect(model.getters.getChartRuntime(chartId).background).toEqual(BACKGROUND_CHART_COLOR);
      addCfToA1("#FF0000");
      expect(model.getters.getChartRuntime(chartId).background).toEqual("#FF0000");
      setCellContent(model, "A1", "random value not in CF");
      expect(model.getters.getChartRuntime(chartId).background).toEqual(BACKGROUND_CHART_COLOR);
    }
  );

  test.each(["scorecard", "gauge"])(
    "chart %s background color change with main cell background color",
    (chartType: string) => {
      createTestChart(chartType, "A1");
      expect(model.getters.getChartRuntime(chartId).background).toEqual(BACKGROUND_CHART_COLOR);
      addFillToA1("#00FF00");
      expect(model.getters.getChartRuntime(chartId).background).toEqual("#00FF00");
    }
  );

  test.each(["scorecard", "gauge"])(
    "CF color have priority over cell background color",
    (chartType: string) => {
      addCfToA1("#FF0000");
      addFillToA1("#00FF00");
      createTestChart(chartType, "A1");
      expect(model.getters.getChartRuntime(chartId).background).toEqual("#FF0000");
    }
  );

  test.each(["scorecard", "gauge"])(
    "chart background color have priority over CF color",
    (chartType: string) => {
      addCfToA1("#FF0000");
      createTestChart(chartType, "A1", "#0000FF");
      expect(model.getters.getChartRuntime(chartId).background).toEqual("#0000FF");
    }
  );

  test.each(["scorecard", "gauge"])(
    "Chart style change based on CF of another sheet",
    (chartType: string) => {
      createSheet(model, { sheetId: "sheet2" });
      activateSheet(model, "sheet2");
      setCellContent(model, "A1", "1", sheetId);
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("1", { fillColor: "#000FFF" }, "cfId"),
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
      const sheet1Name = model.getters.getSheetName(sheetId);
      createTestChart(chartType, `${sheet1Name}!A1`);
      expect(model.getters.getChartRuntime(chartId).background).toEqual("#000FFF");
    }
  );

  test("Duplicating a sheet preserves the figure dimensions", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createChart(model, { type: "bar" });
    const firstSheetFigures = model.getters.getFigures(firstSheetId);
    expect(firstSheetFigures.length).toBe(1);
    model.dispatch("UPDATE_FIGURE", {
      sheetId,
      id: firstSheetFigures[0].id,
      x: 0,
      y: 0,
      width: 123,
      height: 321,
    });
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: secondSheetId,
      sheetId: firstSheetId,
    });
    const secondSheetFigures = model.getters.getFigures(secondSheetId);
    expect(secondSheetFigures.length).toBe(1);
    expect(firstSheetFigures[0]).toMatchObject({
      ...secondSheetFigures[0],
      id: expect.any(String),
    });
  });
});
